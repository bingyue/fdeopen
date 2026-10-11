-- Match resource counters, reverse links and each member's ordered workspace queries.
CREATE INDEX IF NOT EXISTS bookmarks_resource ON bookmarks(resource_id);
CREATE INDEX IF NOT EXISTS likes_resource ON likes(resource_id);
CREATE INDEX IF NOT EXISTS scenario_relations_target ON scenario_relations(target_id,source_id);
CREATE INDEX IF NOT EXISTS bookmarks_user_time ON bookmarks(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_user_time ON submissions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS applications_user_time ON task_applications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_time ON notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS contributions_user_time ON contributions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS resources_owner ON resources(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_public_resource ON comments(resource_id,created_at DESC) WHERE status='approved';
CREATE INDEX IF NOT EXISTS resources_public_order ON resources(kind,featured DESC,created_at,title,id) WHERE status='published';
