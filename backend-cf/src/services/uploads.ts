import { all, first } from "../lib/db";
import type { AppEnv, AuthUser, UploadSessionRow } from "../lib/types";
import { jsonId, nowIso, sha256Hex } from "../lib/utils";

export async function createUploadSession(
  env: AppEnv,
  user: AuthUser,
  input: {
    title: string;
    description?: string;
    datasetKind: string;
    fileName: string;
    fileSize: number;
    contentType?: string;
    labKey?: string;
    versionLabel?: string;
    visibility?: "private" | "lab" | "public";
    metadata?: Record<string, unknown>;
  },
) {
  const assetId = jsonId("asset");
  const sessionId = jsonId("ups");
  const objectKey = `${input.datasetKind}/${user.id}/${Date.now()}_${crypto.randomUUID()}_${input.fileName}`;
  const now = nowIso();

  const multipart = await env.ASSETS_BUCKET.createMultipartUpload(objectKey, {
    httpMetadata: input.contentType ? { contentType: input.contentType } : undefined,
    customMetadata: {
      assetId,
      uploaderUserId: user.id,
      datasetKind: input.datasetKind,
    },
  });

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO assets (
        id, object_key, title, description, dataset_kind, owner_user_id, lab_key,
        content_type, file_name, file_size, version_label, visibility, status, metadata_json, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'uploading', ?13, ?14, ?14)`,
    ).bind(
      assetId,
      objectKey,
      input.title,
      input.description ?? null,
      input.datasetKind,
      user.id,
      input.labKey ?? null,
      input.contentType ?? null,
      input.fileName,
      input.fileSize,
      input.versionLabel ?? "v1",
      input.visibility ?? "private",
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
    ),
    env.DB.prepare(
      `INSERT INTO upload_sessions (
        id, asset_id, multipart_upload_id, object_key, uploader_user_id, state, total_bytes, uploaded_bytes,
        part_count, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, 'created', ?6, 0, 0, ?7, ?7)`,
    ).bind(
      sessionId,
      assetId,
      multipart.uploadId,
      objectKey,
      user.id,
      input.fileSize,
      now,
    ),
  ]);

  return {
    sessionId,
    assetId,
    objectKey,
    multipartUploadId: multipart.uploadId,
    chunkSize: 8 * 1024 * 1024,
  };
}

export async function getUploadSession(env: AppEnv, sessionId: string, user: AuthUser) {
  return first<UploadSessionRow & { title: string; file_name: string; dataset_kind: string }>(
    env.DB.prepare(
      `SELECT
        s.*,
        a.title,
        a.file_name,
        a.dataset_kind
      FROM upload_sessions s
      JOIN assets a ON a.id = s.asset_id
      WHERE s.id = ?1 AND s.uploader_user_id = ?2
      LIMIT 1`,
    ).bind(sessionId, user.id),
  );
}

export async function listOwnUploadSessions(env: AppEnv, user: AuthUser) {
  return all(
    env.DB.prepare(
      `SELECT
        s.id,
        s.state,
        s.total_bytes,
        s.uploaded_bytes,
        s.part_count,
        s.created_at,
        s.updated_at,
        s.completed_at,
        a.id as asset_id,
        a.title,
        a.file_name,
        a.dataset_kind,
        a.visibility,
        a.status as asset_status
      FROM upload_sessions s
      JOIN assets a ON a.id = s.asset_id
      WHERE s.uploader_user_id = ?1
      ORDER BY s.created_at DESC
      LIMIT 100`,
    ).bind(user.id),
  );
}

export async function listOwnAssets(env: AppEnv, user: AuthUser) {
  return all(
    env.DB.prepare(
      `SELECT
        id,
        title,
        file_name,
        dataset_kind,
        lab_key,
        file_size,
        version_label,
        visibility,
        status,
        created_at,
        updated_at
      FROM assets
      WHERE owner_user_id = ?1
      ORDER BY created_at DESC
      LIMIT 100`,
    ).bind(user.id),
  );
}

export async function uploadPart(env: AppEnv, session: UploadSessionRow, partNumber: number, body: ReadableStream | null) {
  const multipart = env.ASSETS_BUCKET.resumeMultipartUpload(session.object_key, session.multipart_upload_id);
  const arrayBuffer = body ? await new Response(body).arrayBuffer() : new ArrayBuffer(0);
  const part = await multipart.uploadPart(partNumber, arrayBuffer);
  const now = nowIso();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO upload_parts (id, session_id, part_number, etag, size_bytes, uploaded_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(session_id, part_number) DO UPDATE SET etag = excluded.etag, size_bytes = excluded.size_bytes, uploaded_at = excluded.uploaded_at`,
    ).bind(
      jsonId("part"),
      session.id,
      partNumber,
      part.etag,
      arrayBuffer.byteLength,
      now,
    ),
    env.DB.prepare(
      `UPDATE upload_sessions
       SET state = 'uploading',
           uploaded_bytes = COALESCE((SELECT SUM(size_bytes) FROM upload_parts WHERE session_id = ?1), 0),
           part_count = COALESCE((SELECT COUNT(*) FROM upload_parts WHERE session_id = ?1), 0),
           updated_at = ?2
       WHERE id = ?1`,
    ).bind(session.id, now),
  ]);

  return {
    etag: part.etag,
    sizeBytes: arrayBuffer.byteLength,
    checksumSha256: await sha256Hex(arrayBuffer),
  };
}

export async function completeUpload(env: AppEnv, session: UploadSessionRow) {
  const parts = await all<{ part_number: number; etag: string }>(
    env.DB.prepare(
      "SELECT part_number, etag FROM upload_parts WHERE session_id = ?1 ORDER BY part_number ASC",
    ).bind(session.id),
  );

  const multipart = env.ASSETS_BUCKET.resumeMultipartUpload(session.object_key, session.multipart_upload_id);
  await multipart.complete(
    parts.map((part) => ({
      partNumber: part.part_number,
      etag: part.etag,
    })),
  );

  const now = nowIso();

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE upload_sessions SET state = 'completed', completed_at = ?2, updated_at = ?2 WHERE id = ?1",
    ).bind(session.id, now),
    env.DB.prepare(
      "UPDATE assets SET status = 'uploaded', updated_at = ?2 WHERE id = ?1",
    ).bind(session.asset_id, now),
    env.DB.prepare(
      "INSERT INTO jobs (id, asset_id, job_type, status, payload_json, created_at, updated_at) VALUES (?1, ?2, 'asset.postprocess', 'queued', ?3, ?4, ?4)",
    ).bind(jsonId("job"), session.asset_id, JSON.stringify({ sessionId: session.id }), now),
  ]);

  await env.ASSET_EVENTS.send({
    type: "asset.upload.completed",
    sessionId: session.id,
    assetId: session.asset_id,
    objectKey: session.object_key,
    uploadedAt: now,
  });

  return {
    sessionId: session.id,
    assetId: session.asset_id,
    objectKey: session.object_key,
    parts: parts.length,
  };
}
