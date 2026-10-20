-- Destructive ONLY to the newly introduced media module. Back up these tables and uploads first.
-- Run manually after reverting application code. Never invoked by normal startup/migration.
BEGIN;
DROP TABLE IF EXISTS media_views,media_subscriptions,media_inquiries,media_redirects,media_topic_posts,media_topics,media_posts,media_assets,media_tags,media_categories,media_authors,media_staff;
DELETE FROM schema_migrations WHERE version='005_media.sql';
DELETE FROM site_settings WHERE key='media_seed_v1';
COMMIT;
