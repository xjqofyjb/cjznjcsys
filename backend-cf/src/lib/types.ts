export type AppEnv = {
  APP_ENV: string;
  PUBLIC_APP_URL: string;
  ADMIN_EMAIL_DOMAIN: string;
  SESSION_TTL_HOURS?: string;
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  ASSET_EVENTS: Queue;
};

export type UserRole = "admin" | "uploader" | "viewer";
export type UserStatus = "pending" | "active" | "disabled";

export type SessionState = "created" | "uploading" | "completing" | "completed" | "aborted" | "failed";

export type AssetStatus = "draft" | "uploading" | "uploaded" | "processing" | "ready" | "archived" | "deleted" | "failed";
export type AssetVisibility = "private" | "lab" | "public";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
};

export type UserRow = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: UserRole;
  status: UserStatus;
  password_hash: string | null;
  password_salt: string | null;
  password_iterations: number;
  password_updated_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UploadSessionRow = {
  id: string;
  asset_id: string;
  multipart_upload_id: string;
  object_key: string;
  uploader_user_id: string;
  state: SessionState;
  total_bytes: number;
  uploaded_bytes: number;
  part_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type AssetRow = {
  id: string;
  object_key: string;
  title: string;
  description: string | null;
  dataset_kind: string;
  owner_user_id: string;
  lab_key: string | null;
  content_type: string | null;
  file_name: string;
  file_size: number;
  version_label: string;
  visibility: AssetVisibility;
  status: AssetStatus;
  checksum_sha256: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};
