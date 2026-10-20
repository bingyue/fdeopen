CREATE TABLE IF NOT EXISTS account_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  login_name text NOT NULL UNIQUE CHECK (login_name ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  password_hash text NOT NULL,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE account_credentials ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS session_expiration ON sessions(expires_at);
