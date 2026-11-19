CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  is_admin INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS signup_attempts (
  ip TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_usage (
  email TEXT NOT NULL,
  day INTEGER NOT NULL,
  requests INTEGER NOT NULL,
  PRIMARY KEY(email, day)
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_attempts_ip_time ON login_attempts(ip, attempted_at);
CREATE INDEX IF NOT EXISTS idx_signup_ip_time ON signup_attempts(ip, attempted_at);
