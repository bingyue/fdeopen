CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, github_id text UNIQUE, role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','maintainer','moderator','admin')),
  disabled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, handle text NOT NULL UNIQUE,
  name text NOT NULL, bio text NOT NULL DEFAULT '', tags jsonb NOT NULL DEFAULT '[]', github_url text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '', contact_public boolean NOT NULL DEFAULT false, public boolean NOT NULL DEFAULT false,
  availability text NOT NULL DEFAULT '', portfolio jsonb NOT NULL DEFAULT '[]', is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS project_categories (slug text PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('project','skill','scenario','demo','task','article')),
  title text NOT NULL, summary text NOT NULL, category text NOT NULL, tags jsonb NOT NULL DEFAULT '[]',
  body text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}',
  source_url text NOT NULL DEFAULT '', source_author text NOT NULL DEFAULT '', license text NOT NULL DEFAULT '',
  provenance text NOT NULL DEFAULT 'editorial' CHECK(provenance IN ('external','editorial','demo','community')),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  featured boolean NOT NULL DEFAULT false, owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resource_listing ON resources(kind,status,category,featured);
CREATE INDEX IF NOT EXISTS resource_tags ON resources USING gin(tags);
CREATE INDEX IF NOT EXISTS resource_search ON resources USING gin(to_tsvector('simple',title || ' ' || summary || ' ' || body));
CREATE TABLE IF NOT EXISTS scenario_relations (
  source_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE, target_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY(source_id,target_id), CHECK(source_id<>target_id)
);
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, title text NOT NULL, summary text NOT NULL, theme text NOT NULL DEFAULT 'blue',
  published boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE, resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY(collection_id,resource_id)
);
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL CHECK(kind IN ('project','skill','scenario','requirement')),
  title text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  review_note text NOT NULL DEFAULT '', reviewed_by uuid REFERENCES users(id), resource_id uuid REFERENCES resources(id),
  created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS submission_queue ON submissions(status,created_at);
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE, resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,resource_id)
);
CREATE TABLE IF NOT EXISTS likes (user_id uuid REFERENCES users(id) ON DELETE CASCADE, resource_id uuid REFERENCES resources(id) ON DELETE CASCADE, PRIMARY KEY(user_id,resource_id));
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  body text NOT NULL CHECK(length(body) BETWEEN 2 AND 2000), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS task_applications (
  id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES resources(id), user_id uuid NOT NULL REFERENCES users(id),
  message text NOT NULL, pr_url text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','submitted','completed')),
  review_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(task_id,user_id)
);
CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), resource_id uuid NOT NULL REFERENCES resources(id),
  application_id uuid UNIQUE REFERENCES task_applications(id), title text NOT NULL, pr_url text NOT NULL, confirmed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), message text NOT NULL, href text NOT NULL DEFAULT '/dashboard',
  read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id), action text NOT NULL, target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), resource_id uuid NOT NULL REFERENCES resources(id),
  reason text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS site_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY, event text NOT NULL CHECK(event IN ('view','github_click','bookmark','submission','demo_click','task_apply','requirement')),
  resource_id uuid REFERENCES resources(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_time ON analytics_events(created_at,event);
CREATE TABLE IF NOT EXISTS github_cache (repo text PRIMARY KEY, data jsonb NOT NULL, etag text NOT NULL DEFAULT '', checked_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS webhook_deliveries (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL DEFAULT 1, reset_at timestamptz NOT NULL);
CREATE OR REPLACE VIEW projects WITH (security_invoker=true) AS SELECT * FROM resources WHERE kind='project';
CREATE OR REPLACE VIEW skills WITH (security_invoker=true) AS SELECT * FROM resources WHERE kind='skill';
CREATE OR REPLACE VIEW scenarios WITH (security_invoker=true) AS SELECT * FROM resources WHERE kind='scenario';
CREATE OR REPLACE VIEW demos WITH (security_invoker=true) AS SELECT * FROM resources WHERE kind='demo';
CREATE OR REPLACE VIEW community_tasks WITH (security_invoker=true) AS SELECT * FROM resources WHERE kind='task';
CREATE OR REPLACE VIEW articles WITH (security_invoker=true) AS SELECT * FROM resources WHERE kind='article';
