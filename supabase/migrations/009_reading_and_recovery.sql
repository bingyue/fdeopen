ALTER TABLE account_credentials ADD COLUMN recovery_hash text;
ALTER TABLE profiles ADD COLUMN onboarding_at timestamptz;
ALTER TABLE profiles ADD COLUMN reading_history_enabled boolean NOT NULL DEFAULT true;
CREATE TABLE media_bookmarks (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 post_id uuid NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,post_id)
);
CREATE TABLE reading_history (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
 post_id uuid REFERENCES media_posts(id) ON DELETE CASCADE,
 seen_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((resource_id IS NULL) <> (post_id IS NULL)),
 UNIQUE(user_id,resource_id), UNIQUE(user_id,post_id)
);
CREATE INDEX reading_history_user_time ON reading_history(user_id,seen_at DESC);
CREATE INDEX media_bookmarks_user_time ON media_bookmarks(user_id,created_at DESC);
ALTER TABLE media_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
