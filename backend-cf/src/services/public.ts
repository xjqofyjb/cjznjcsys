import { all } from "../lib/db";
import type { AppEnv } from "../lib/types";

type PublicAssetRow = {
  id: string;
  title: string;
  description: string | null;
  dataset_kind: string;
  lab_key: string | null;
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
        a.title,
        a.description,
        a.dataset_kind,
        a.lab_key,
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
