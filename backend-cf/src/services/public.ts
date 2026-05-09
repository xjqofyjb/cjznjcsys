import { all } from "../lib/db";
import type { AppEnv } from "../lib/types";

type PublicAssetRow = {
  id: string;
  object_key: string;
  title: string;
  description: string | null;
  dataset_kind: string;
  lab_key: string | null;
  content_type: string | null;
  file_name: string;
  file_size: number;
  version_label: string;
  visibility: string;
  status: string;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
  owner_email: string;
};

export async function listPublicAssets(
  env: AppEnv,
  filters: {
    labKey?: string;
    datasetKind?: string;
    centerKey?: string;
    limit?: number;
  } = {},
) {
  const limit = Math.min(Math.max(Number(filters.limit || 100), 1), 200);

  const rows = await all<PublicAssetRow>(
    env.DB.prepare(
      `SELECT
        a.id,
        a.object_key,
        a.title,
        a.description,
        a.dataset_kind,
        a.lab_key,
        a.content_type,
        a.file_name,
        a.file_size,
        a.version_label,
        a.visibility,
        a.status,
        a.metadata_json,
        a.created_at,
        a.updated_at,
        u.email as owner_email
      FROM assets a
      JOIN users u ON u.id = a.owner_user_id
      WHERE a.visibility = 'public'
        AND a.status IN ('uploaded', 'processing', 'ready')
        AND (?1 IS NULL OR a.lab_key = ?1)
        AND (?2 IS NULL OR a.dataset_kind = ?2)
      ORDER BY a.created_at DESC
      LIMIT ?3`,
    ).bind(filters.labKey ?? null, filters.datasetKind ?? null, limit),
  );

  return rows
    .map((row) => {
      const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : null;
      return {
        ...row,
        metadata,
      };
    })
    .filter((row) => {
      if (!filters.centerKey) {
        return true;
      }

      return row.metadata?.centerKey === filters.centerKey || row.dataset_kind === filters.centerKey;
    });
}

function getPreviewKind(fileName: string, contentType: string | null) {
  const normalizedType = (contentType || "").toLowerCase();
  const lowerName = fileName.toLowerCase();

  if (normalizedType.includes("json") || lowerName.endsWith(".json") || lowerName.endsWith(".geojson")) {
    return "json";
  }

  if (normalizedType.includes("csv") || lowerName.endsWith(".csv")) {
    return "csv";
  }

  if (lowerName.endsWith(".tsv")) {
    return "tsv";
  }

  if (
    normalizedType.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".log") ||
    lowerName.endsWith(".yaml") ||
    lowerName.endsWith(".yml")
  ) {
    return "text";
  }

  return "unsupported";
}

export async function getPublicAssetPreview(env: AppEnv, assetId: string) {
  const row = await env.DB.prepare(
    `SELECT
      a.id,
      a.object_key,
      a.title,
      a.description,
      a.dataset_kind,
      a.lab_key,
      a.content_type,
      a.file_name,
      a.file_size,
      a.version_label,
      a.visibility,
      a.status,
      a.metadata_json,
      a.created_at,
      a.updated_at,
      u.email as owner_email
    FROM assets a
    JOIN users u ON u.id = a.owner_user_id
    WHERE a.id = ?1
      AND a.visibility = 'public'
      AND a.status IN ('uploaded', 'processing', 'ready')
    LIMIT 1`,
  ).bind(assetId).first<PublicAssetRow>();

  if (!row) {
    return null;
  }

  const kind = getPreviewKind(row.file_name, row.content_type);
  const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : null;
  const asset = {
    id: row.id,
    title: row.title,
    description: row.description,
    dataset_kind: row.dataset_kind,
    lab_key: row.lab_key,
    content_type: row.content_type,
    file_name: row.file_name,
    file_size: row.file_size,
    version_label: row.version_label,
    visibility: row.visibility,
    status: row.status,
    metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner_email: row.owner_email,
  };

  if (kind === "unsupported") {
    return {
      asset,
      preview: {
        kind,
        text: "",
        bytesRead: 0,
        truncated: false,
        message: "当前文件类型暂不支持在线预览。系统不会提供下载链接。",
      },
    };
  }

  const maxBytes = Math.min(64 * 1024, Math.max(row.file_size, 1));
  const object = await env.ASSETS_BUCKET.get(row.object_key, {
    range: {
      offset: 0,
      length: maxBytes,
    },
  });

  if (!object) {
    return {
      asset,
      preview: {
        kind: "missing",
        text: "",
        bytesRead: 0,
        truncated: false,
        message: "文件对象不存在或暂时不可读取。",
      },
    };
  }

  const text = await object.text();

  return {
    asset,
    preview: {
      kind,
      contentType: row.content_type,
      text,
      bytesRead: maxBytes,
      truncated: row.file_size > maxBytes,
      message: row.file_size > maxBytes ? "仅展示文件开头部分内容，不提供完整文件下载。" : "",
    },
  };
}
