INSERT OR IGNORE INTO activities (
  id,
  name,
  status,
  default_vote_quota,
  allow_self_vote,
  show_public_votes,
  upload_ends_at,
  vote_ends_at,
  created_at,
  updated_at
) VALUES (
  'activity-spring-picvote',
  '春季影像投票',
  'voting',
  5,
  1,
  1,
  NULL,
  NULL,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO users (
  id,
  employee_no,
  display_name,
  role,
  can_upload,
  can_vote,
  vote_quota,
  password_hash,
  created_at,
  updated_at
) VALUES
  ('user-admin', '90001', '活动管理员', 'admin', 0, 0, 0, 'admin123', datetime('now'), datetime('now')),
  ('user-10001', '10001', '林岚', 'participant', 1, 1, NULL, 'demo123', datetime('now'), datetime('now')),
  ('user-10002', '10002', '周宁', 'participant', 1, 1, NULL, 'demo123', datetime('now'), datetime('now')),
  ('user-10003', '10003', '沈秋', 'participant', 1, 1, 8, 'demo123', datetime('now'), datetime('now')),
  ('user-10004', '10004', '陈越', 'participant', 1, 1, NULL, 'demo123', datetime('now'), datetime('now')),
  ('user-10005', '10005', '白一', 'special', 1, 1, 10, 'demo123', datetime('now'), datetime('now'));
