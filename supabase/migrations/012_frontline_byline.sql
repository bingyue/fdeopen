-- Keep author IDs, slugs, article associations and third-party credits intact.
UPDATE media_authors SET name='FDE前线' WHERE name='FDE前线编辑部';

-- Match the display name used by bootstrap-account without renaming other accounts.
UPDATE profiles SET name='FDE前线'
WHERE name='FDE前线编辑部' AND user_id IN (SELECT id FROM users WHERE role='admin');

-- Existing imported reading guides contain an inline editorial credit.
-- Update the current text instead of reimporting and overwriting CMS edits.
UPDATE media_posts
SET body=replace(body,'FDE前线编辑部','FDE前线'),
    source_name=CASE WHEN source_name='FDE前线编辑部' THEN 'FDE前线' ELSE source_name END,
    revision=revision+1,
    updated_at=now()
WHERE body LIKE '%FDE前线编辑部%' OR source_name='FDE前线编辑部';
