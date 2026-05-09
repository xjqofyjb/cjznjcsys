import { all, first } from "../lib/db";
import type { AppEnv, AuthUser } from "../lib/types";
import { jsonId, nowIso } from "../lib/utils";

export type LearningResourceStatus = "pending" | "approved" | "rejected" | "archived";

type LearningResourceRow = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string | null;
  citation: string | null;
  tags_json: string | null;
  submitter_user_id: string;
  submitter_email: string;
  submitter_name: string;
  status: LearningResourceStatus;
  review_note: string | null;
  reviewed_by_user_id: string | null;
  reviewer_email: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseTags(tagsJson: string | null) {
  if (!tagsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function normalizeRow(row: LearningResourceRow) {
  return {
    ...row,
    tags: parseTags(row.tags_json),
  };
}

function normalizeTags(tags?: string[]) {
  return (tags || [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function listApprovedLearningResources(env: AppEnv) {
  const rows = await all<LearningResourceRow>(
    env.DB.prepare(
      `SELECT
        r.*,
        u.email as submitter_email,
        u.display_name as submitter_name,
        reviewer.email as reviewer_email
      FROM learning_resources r
      JOIN users u ON u.id = r.submitter_user_id
      LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by_user_id
      WHERE r.status = 'approved'
      ORDER BY r.updated_at DESC
      LIMIT 200`,
    ),
  );

  return rows.map(normalizeRow);
}

export async function submitLearningResource(
  env: AppEnv,
  user: AuthUser,
  input: {
    title: string;
    description?: string;
    resourceType: string;
    resourceUrl?: string;
    citation?: string;
    tags?: string[];
  },
) {
  const now = nowIso();
  const id = jsonId("learn");

  await env.DB.prepare(
    `INSERT INTO learning_resources (
      id, title, description, resource_type, resource_url, citation, tags_json,
      submitter_user_id, status, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', ?9, ?9)`,
  ).bind(
    id,
    input.title.trim(),
    input.description?.trim() || null,
    input.resourceType.trim(),
    input.resourceUrl?.trim() || null,
    input.citation?.trim() || null,
    JSON.stringify(normalizeTags(input.tags)),
    user.id,
    now,
  ).run();

  return getLearningResource(env, id);
}

export async function getLearningResource(env: AppEnv, id: string) {
  const row = await first<LearningResourceRow>(
    env.DB.prepare(
      `SELECT
        r.*,
        u.email as submitter_email,
        u.display_name as submitter_name,
        reviewer.email as reviewer_email
      FROM learning_resources r
      JOIN users u ON u.id = r.submitter_user_id
      LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by_user_id
      WHERE r.id = ?1
      LIMIT 1`,
    ).bind(id),
  );

  return row ? normalizeRow(row) : null;
}

export async function listLearningResourcesForAdmin(env: AppEnv) {
  const rows = await all<LearningResourceRow>(
    env.DB.prepare(
      `SELECT
        r.*,
        u.email as submitter_email,
        u.display_name as submitter_name,
        reviewer.email as reviewer_email
      FROM learning_resources r
      JOIN users u ON u.id = r.submitter_user_id
      LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by_user_id
      ORDER BY
        CASE r.status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'rejected' THEN 2
          ELSE 3
        END,
        r.created_at DESC
      LIMIT 200`,
    ),
  );

  return rows.map(normalizeRow);
}

export async function reviewLearningResource(
  env: AppEnv,
  admin: AuthUser,
  id: string,
  input: {
    status: LearningResourceStatus;
    reviewNote?: string;
  },
) {
  const existing = await getLearningResource(env, id);
  if (!existing) {
    return null;
  }

  const now = nowIso();
  await env.DB.prepare(
    `UPDATE learning_resources
     SET status = ?2,
         review_note = ?3,
         reviewed_by_user_id = ?4,
         reviewed_at = ?5,
         updated_at = ?5
     WHERE id = ?1`,
  ).bind(id, input.status, input.reviewNote?.trim() || null, admin.id, now).run();

  return getLearningResource(env, id);
}
