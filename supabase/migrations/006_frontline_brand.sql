-- Rename the site's editorial attribution without changing other contributors.
UPDATE resources
SET source_author = 'FDE前线 编辑组'
WHERE source_author = 'FDEOpen 编辑组';

-- Update only the stock editorial notice in previously seeded article bodies.
UPDATE resources
SET body = replace(body, '本文由 FDEOpen 编辑组整理', '本文由 FDE前线 编辑组整理')
WHERE body LIKE '%本文由 FDEOpen 编辑组整理%';
