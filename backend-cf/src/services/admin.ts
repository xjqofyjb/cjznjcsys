import type { AppEnv, AssetRow, AssetStatus, AssetVisibility, AuthUser } from "../lib/types";
import { all, first } from "../lib/db";
import { jsonId, nowIso } from "../lib/utils";

export async function recordAdminAction(env: AppEnv, admin: AuthUser, targetType: string, targetId: string, action: string, detail?: unknown) {
  await env.DB.prepare(
    "INSERT INTO admin_actions (id, admin_user_id, target_type, target_id, action, detail_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
  ).bind(
    jsonId("act"),
    admin.id,
    targetType,
    targetId,
    action,
    detail ? JSON.stringify(detail) : null,
    nowIso(),
  ).run();
}

export async function getDashboard(env: AppEnv) {
  const [assetCounts] = await all<{ total_assets: number; processing_assets: number; ready_assets: number; archived_assets: number }>(
    env.DB.prepare(
      `SELECT
        COUNT(*) as total_assets,
        SUM(CASE WHEN status IN ('processing', 'uploaded', 'uploading') THEN 1 ELSE 0 END) as processing_assets,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_assets,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_assets
      FROM assets`,
    ),
  );

  const [sessionCounts] = await all<{ active_sessions: number; failed_sessions: number }>(
    env.DB.prepare(
      `SELECT
        SUM(CASE WHEN state IN ('created', 'uploading', 'completing') THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) as failed_sessions
      FROM upload_sessions`,
    ),
  );

  const recentUploads = await all<{
    session_id: string;
    state: string;
    uploaded_bytes: number;
    total_bytes: number;
    created_at: string;
    title: string;
    uploader_email: string;
  }>(
    env.DB.prepare(
      `SELECT
        s.id as session_id,
        s.state,
        s.uploaded_bytes,
        s.total_bytes,
        s.created_at,
        a.title,
        u.email as uploader_email
      FROM upload_sessions s
      JOIN assets a ON a.id = s.asset_id
      JOIN users u ON u.id = s.uploader_user_id
      ORDER BY s.created_at DESC
      LIMIT 8`,
    ),
  );

  return {
    metrics: {
      totalAssets: assetCounts?.total_assets ?? 0,
      processingAssets: assetCounts?.processing_assets ?? 0,
      readyAssets: assetCounts?.ready_assets ?? 0,
      archivedAssets: assetCounts?.archived_assets ?? 0,
      activeSessions: sessionCounts?.active_sessions ?? 0,
      failedSessions: sessionCounts?.failed_sessions ?? 0,
    },
    recentUploads,
  };
}

export async function listUploads(env: AppEnv) {
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
        a.dataset_kind,
        a.lab_key,
        u.email as uploader_email
      FROM upload_sessions s
      JOIN assets a ON a.id = s.asset_id
      JOIN users u ON u.id = s.uploader_user_id
      ORDER BY s.created_at DESC
      LIMIT 100`,
    ),
  );
}

export async function listAssets(env: AppEnv) {
  return all(
    env.DB.prepare(
      `SELECT
        a.id,
        a.title,
        a.dataset_kind,
        a.lab_key,
        a.file_name,
        a.file_size,
        a.version_label,
        a.visibility,
        a.status,
        a.created_at,
        a.updated_at,
        u.email as owner_email
      FROM assets a
      JOIN users u ON u.id = a.owner_user_id
      ORDER BY a.created_at DESC
      LIMIT 100`,
    ),
  );
}

export async function listUsers(env: AppEnv) {
  return all(
    env.DB.prepare(
      `SELECT
        id,
        email,
        username,
        display_name,
        role,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 100`,
    ),
  );
}

export async function getAssetDetails(env: AppEnv, assetId: string) {
  const asset = await first<
    AssetRow & {
      owner_email: string;
      owner_display_name: string;
    }
  >(
    env.DB.prepare(
      `SELECT
        a.*,
        u.email as owner_email,
        u.display_name as owner_display_name
      FROM assets a
      JOIN users u ON u.id = a.owner_user_id
      WHERE a.id = ?1
      LIMIT 1`,
    ).bind(assetId),
  );

  if (!asset) {
    return null;
  }

  const sessions = await all(
    env.DB.prepare(
      `SELECT
        id,
        state,
        total_bytes,
        uploaded_bytes,
        part_count,
        created_at,
        updated_at,
        completed_at
      FROM upload_sessions
      WHERE asset_id = ?1
      ORDER BY created_at DESC`,
    ).bind(assetId),
  );

  const jobs = await all<{
    id: string;
    job_type: string;
    status: string;
    payload_json: string | null;
    result_json: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
  }>(
    env.DB.prepare(
      `SELECT
        id,
        job_type,
        status,
        payload_json,
        result_json,
        error_message,
        created_at,
        updated_at
      FROM jobs
      WHERE asset_id = ?1
      ORDER BY created_at DESC`,
    ).bind(assetId),
  );

  const actions = await all<{
    id: string;
    action: string;
    detail_json: string | null;
    created_at: string;
    admin_email: string;
  }>(
    env.DB.prepare(
      `SELECT
        a.id,
        a.action,
        a.detail_json,
        a.created_at,
        u.email as admin_email
      FROM admin_actions a
      JOIN users u ON u.id = a.admin_user_id
      WHERE a.target_type = 'asset' AND a.target_id = ?1
      ORDER BY a.created_at DESC`,
    ).bind(assetId),
  );

  return {
    asset: {
      ...asset,
      metadata: asset.metadata_json ? JSON.parse(asset.metadata_json) : null,
    },
    sessions,
    jobs: jobs.map((job) => ({
      ...job,
      payload: job.payload_json ? JSON.parse(job.payload_json) : null,
      result: job.result_json ? JSON.parse(job.result_json) : null,
    })),
    actions: actions.map((action) => ({
      ...action,
      detail: action.detail_json ? JSON.parse(action.detail_json) : null,
    })),
  };
}

export async function listAdminActions(env: AppEnv) {
  return all(
    env.DB.prepare(
      `SELECT
        a.id,
        a.target_type,
        a.target_id,
        a.action,
        a.detail_json,
        a.created_at,
        u.email as admin_email
      FROM admin_actions a
      JOIN users u ON u.id = a.admin_user_id
      ORDER BY a.created_at DESC
      LIMIT 100`,
    ),
  );
}

export async function updateAsset(
  env: AppEnv,
  assetId: string,
  input: {
    title?: string;
    description?: string | null;
    visibility?: AssetVisibility;
    status?: Exclude<AssetStatus, "deleted">;
    labKey?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const asset = await first<AssetRow>(
    env.DB.prepare("SELECT * FROM assets WHERE id = ?1 LIMIT 1").bind(assetId),
  );

  if (!asset) {
    return null;
  }

  const next = {
    title: input.title ?? asset.title,
    description: input.description ?? asset.description,
    visibility: input.visibility ?? asset.visibility,
    status: input.status ?? asset.status,
    labKey: input.labKey ?? asset.lab_key,
    metadata: input.metadata === undefined ? asset.metadata_json : JSON.stringify(input.metadata),
  };

  await env.DB.prepare(
    `UPDATE assets
     SET title = ?2,
         description = ?3,
         visibility = ?4,
         status = ?5,
         lab_key = ?6,
         metadata_json = ?7,
         updated_at = ?8
     WHERE id = ?1`,
  ).bind(
    assetId,
    next.title,
    next.description,
    next.visibility,
    next.status,
    next.labKey,
    next.metadata,
    nowIso(),
  ).run();

  return getAssetDetails(env, assetId);
}

export async function archiveAsset(env: AppEnv, assetId: string) {
  const asset = await first<{ id: string }>(
    env.DB.prepare("SELECT id FROM assets WHERE id = ?1 LIMIT 1").bind(assetId),
  );

  if (!asset) {
    return false;
  }

  await env.DB.prepare(
    "UPDATE assets SET status = 'archived', updated_at = ?2 WHERE id = ?1",
  ).bind(assetId, nowIso()).run();

  return true;
}

export async function deleteAsset(env: AppEnv, assetId: string) {
  const asset = await first<{ id: string }>(
    env.DB.prepare("SELECT id FROM assets WHERE id = ?1 LIMIT 1").bind(assetId),
  );

  if (!asset) {
    return false;
  }

  await env.DB.prepare(
    "UPDATE assets SET status = 'deleted', updated_at = ?2 WHERE id = ?1",
  ).bind(assetId, nowIso()).run();

  return true;
}

export async function restoreAsset(env: AppEnv, assetId: string) {
  const asset = await first<{ id: string }>(
    env.DB.prepare("SELECT id FROM assets WHERE id = ?1 LIMIT 1").bind(assetId),
  );

  if (!asset) {
    return false;
  }

  await env.DB.prepare(
    "UPDATE assets SET status = 'ready', updated_at = ?2 WHERE id = ?1",
  ).bind(assetId, nowIso()).run();

  return true;
}
