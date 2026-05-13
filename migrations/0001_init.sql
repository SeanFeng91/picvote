CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  default_vote_quota INTEGER NOT NULL DEFAULT 5,
  allow_self_vote INTEGER NOT NULL DEFAULT 1,
  show_public_votes INTEGER NOT NULL DEFAULT 1,
  upload_ends_at TEXT,
  vote_ends_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  employee_no TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  can_upload INTEGER NOT NULL DEFAULT 1,
  can_vote INTEGER NOT NULL DEFAULT 1,
  vote_quota INTEGER,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  owner_employee_no TEXT NOT NULL,
  owner_display_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_url TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL,
  vote_count_cache INTEGER NOT NULL DEFAULT 0,
  share_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  voter_user_id TEXT NOT NULL,
  voter_employee_no TEXT NOT NULL,
  work_id TEXT NOT NULL,
  work_code TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
