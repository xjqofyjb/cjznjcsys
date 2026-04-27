PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'uploader', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  dataset_kind TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  lab_key TEXT,
  content_type TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  version_label TEXT NOT NULL DEFAULT 'v1',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'lab', 'public')),
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('draft', 'uploading', 'uploaded', 'processing', 'ready', 'archived', 'deleted', 'failed')),
  checksum_sha256 TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_assets_owner_status ON assets(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_lab_status ON assets(lab_key, status);
CREATE INDEX IF NOT EXISTS idx_assets_kind_status ON assets(dataset_kind, status);

CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  multipart_upload_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  uploader_user_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'created' CHECK (state IN ('created', 'uploading', 'completing', 'completed', 'aborted', 'failed')),
  total_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_bytes INTEGER NOT NULL DEFAULT 0,
  part_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (uploader_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_state_created ON upload_sessions(state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_uploader_created ON upload_sessions(uploader_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS upload_parts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  part_number INTEGER NOT NULL,
  etag TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL,
  UNIQUE (session_id, part_number),
  FOREIGN KEY (session_id) REFERENCES upload_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  payload_json TEXT,
  result_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

INSERT OR IGNORE INTO users (id, email, display_name, role, status, created_at, updated_at)
VALUES
  ('user-admin-seed', 'admin@example.com', 'Platform Admin', 'admin', 'active', datetime('now'), datetime('now')),
  ('user-uploader-seed', 'uploader@example.com', 'Seed Uploader', 'uploader', 'active', datetime('now'), datetime('now'));
