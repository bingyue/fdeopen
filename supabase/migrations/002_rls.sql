-- Supabase-only. All writes flow through the audited application service (direct Postgres).
-- Authenticated/anonymous browser clients have read access only to explicitly public content.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- Profiles include private contact. They are exposed only through server DTOs, never raw client reads.
CREATE POLICY resources_public_read ON resources FOR SELECT USING (status='published');
CREATE POLICY categories_public_read ON project_categories FOR SELECT USING (true);
CREATE POLICY collections_public_read ON collections FOR SELECT USING (published);
CREATE POLICY relations_public_read ON scenario_relations FOR SELECT USING (
 EXISTS(SELECT 1 FROM resources WHERE id=source_id AND status='published') AND EXISTS(SELECT 1 FROM resources WHERE id=target_id AND status='published')
);
CREATE POLICY collection_items_public_read ON collection_items FOR SELECT USING (
 EXISTS(SELECT 1 FROM collections WHERE id=collection_id AND published) AND EXISTS(SELECT 1 FROM resources WHERE id=resource_id AND status='published')
);
CREATE POLICY bookmarks_own_read ON bookmarks FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY submissions_own_read ON submissions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY notifications_own_read ON notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY applications_own_read ON task_applications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY comments_public_read ON comments FOR SELECT USING(status='approved');
REVOKE ALL ON users,profiles,resources,project_categories,scenario_relations,collections,collection_items,submissions,bookmarks,likes,comments,task_applications,contributions,notifications,audit_logs,reports,site_settings,analytics_events,github_cache,webhook_deliveries,sessions,rate_limits,schema_migrations FROM anon, authenticated;
GRANT SELECT ON resources,projects,skills,scenarios,demos,community_tasks,articles,project_categories,scenario_relations,collections,collection_items,bookmarks,submissions,notifications,task_applications,comments TO anon, authenticated;
