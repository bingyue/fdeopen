-- Additive media model. Existing community tables, roles and content are untouched.
CREATE TABLE IF NOT EXISTS media_staff (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('author','editor'))
);
CREATE TABLE IF NOT EXISTS media_authors (
 id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL,
 bio text NOT NULL DEFAULT '', title text NOT NULL DEFAULT '',
 user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 is_example boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS media_categories (
 slug text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS media_tags (
 slug text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS media_assets (
 id uuid PRIMARY KEY, owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
 filename text NOT NULL, mime text NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp','application/pdf')),
 size integer NOT NULL CHECK(size>0 AND size<=10485760), storage_key text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_posts (
 id uuid PRIMARY KEY, slug text NOT NULL UNIQUE,
 channel text NOT NULL CHECK(channel IN ('insights','features','cases','research','people','events')),
 title text NOT NULL, subtitle text NOT NULL DEFAULT '', summary text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '',
 category text REFERENCES media_categories(slug), tags jsonb NOT NULL DEFAULT '[]',
 author_id uuid REFERENCES media_authors(id), owner_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','published','scheduled','archived')),
 authenticity text NOT NULL DEFAULT 'example' CHECK(authenticity IN ('example','editorial','verified','anonymous')),
 source_name text NOT NULL DEFAULT '', source_url text NOT NULL DEFAULT '', verification_note text NOT NULL DEFAULT '',
 sponsored boolean NOT NULL DEFAULT false,
 cover_id uuid REFERENCES media_assets(id), cover_alt text NOT NULL DEFAULT '', cover_caption text NOT NULL DEFAULT '',
 cover_style text NOT NULL DEFAULT 'grid' CHECK(cover_style IN ('grid','layers','circuit','field','report','portrait')),
 seo_title text NOT NULL DEFAULT '', seo_description text NOT NULL DEFAULT '',
 details jsonb NOT NULL DEFAULT '{}', report_id uuid REFERENCES media_assets(id),
 download_access text NOT NULL DEFAULT 'none' CHECK(download_access IN ('none','public','request')),
 home_rank integer NOT NULL DEFAULT 0 CHECK(home_rank BETWEEN 0 AND 100),
 featured boolean NOT NULL DEFAULT false, breaking boolean NOT NULL DEFAULT false,
 published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz, revision integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS media_published ON media_posts(channel,published_at DESC) WHERE deleted_at IS NULL AND status IN ('published','scheduled');
CREATE INDEX IF NOT EXISTS media_home ON media_posts(home_rank,published_at DESC) WHERE deleted_at IS NULL AND home_rank>0;
CREATE INDEX IF NOT EXISTS media_owner ON media_posts(owner_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS media_filter_details ON media_posts USING gin(details);
CREATE INDEX IF NOT EXISTS media_filter_tags ON media_posts USING gin(tags);
CREATE TABLE IF NOT EXISTS media_topics (
 slug text PRIMARY KEY, title text NOT NULL, description text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS media_topic_posts (
 topic_slug text REFERENCES media_topics(slug) ON DELETE CASCADE, post_id uuid REFERENCES media_posts(id) ON DELETE CASCADE,
 PRIMARY KEY(topic_slug,post_id)
);
CREATE TABLE IF NOT EXISTS media_redirects (
 old_path text PRIMARY KEY, post_id uuid NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS media_inquiries (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('enterprise','expert','cooperation','report','event')),
 post_id uuid REFERENCES media_posts(id) ON DELETE SET NULL, user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 name text NOT NULL, contact text NOT NULL, organization text NOT NULL DEFAULT '',
 payload jsonb NOT NULL, consent_version text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','completed','rejected')),
 note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_inquiry_queue ON media_inquiries(kind,status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS media_inquiry_pending_unique ON media_inquiries(kind,lower(contact),(COALESCE(post_id,'00000000-0000-0000-0000-000000000000'::uuid))) WHERE status IN ('new','contacted');
CREATE TABLE IF NOT EXISTS media_subscriptions (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true,
 unsubscribe_hash text NOT NULL UNIQUE, consent_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_views (
 post_id uuid REFERENCES media_posts(id) ON DELETE CASCADE, day date NOT NULL DEFAULT current_date,
 visitor_hash text NOT NULL, PRIMARY KEY(post_id,day,visitor_hash)
);
CREATE INDEX IF NOT EXISTS media_view_day ON media_views(day,post_id);
-- Every new table is private to the server connection, including verification notes and PII.
-- No browser-role grants or policies: Supabase Auth is used only to verify identity.
ALTER TABLE media_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_topic_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_views ENABLE ROW LEVEL SECURITY;
