PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS learning_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  resource_url TEXT,
  citation TEXT,
  tags_json TEXT,
  submitter_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  review_note TEXT,
  reviewed_by_user_id TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (submitter_user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_status_created ON learning_resources(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_resources_submitter_created ON learning_resources(submitter_user_id, created_at DESC);
