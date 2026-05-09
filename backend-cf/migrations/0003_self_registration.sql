PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'uploader', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  password_updated_at TEXT,
  last_login_at TEXT
);

INSERT INTO users_new (
  id,
  email,
  username,
  display_name,
  role,
  status,
  created_at,
  updated_at,
  password_hash,
  password_salt,
  password_iterations,
  password_updated_at,
  last_login_at
)
SELECT
  id,
  email,
  id,
  display_name,
  role,
  status,
  created_at,
  updated_at,
  password_hash,
  password_salt,
  password_iterations,
  password_updated_at,
  last_login_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys = ON;
