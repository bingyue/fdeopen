-- Merge editorial channels without changing article IDs, slugs, or canonical URLs.
UPDATE media_posts SET channel='insights', revision=revision+1, updated_at=now() WHERE channel='features';

-- Retire people and events, including private applications and aggregated metrics.
DELETE FROM media_inquiries WHERE kind='event' OR post_id IN (SELECT id FROM media_posts WHERE channel IN ('people','events'));
DELETE FROM marketing_metrics WHERE content_type IN ('people','events') OR path ~ '^/(people|events)(/|$)' OR article_id IN (SELECT id::text FROM media_posts WHERE channel IN ('people','events'));
-- Foreign keys cascade to topic membership, redirects, views, bookmarks, and reading history.
DELETE FROM media_posts WHERE channel IN ('people','events');

ALTER TABLE media_posts DROP CONSTRAINT media_posts_channel_check;
ALTER TABLE media_posts ADD CONSTRAINT media_posts_channel_check CHECK(channel IN ('insights','cases','research'));
ALTER TABLE media_inquiries DROP CONSTRAINT media_inquiries_kind_check;
ALTER TABLE media_inquiries ADD CONSTRAINT media_inquiries_kind_check CHECK(kind IN ('enterprise','expert','cooperation','report'));

-- Strip obsolete structured fields from surviving content without touching its body.
UPDATE media_posts SET details=details - ARRAY['person_name','person_title','event_start','event_end','location','event_state','capacity'];

-- Merge historical aggregates safely if both channel labels already exist for a key.
INSERT INTO marketing_metrics(day,event,path,content_type,article_id,placement,utm_source,device,count)
SELECT day,event,path,'insights',article_id,placement,utm_source,device,count FROM marketing_metrics WHERE content_type='features'
ON CONFLICT(day,event,path,content_type,article_id,placement,utm_source,device)
DO UPDATE SET count=marketing_metrics.count+excluded.count;
DELETE FROM marketing_metrics WHERE content_type='features';
