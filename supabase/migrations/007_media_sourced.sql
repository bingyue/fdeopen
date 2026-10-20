-- Public-source digests must not be presented as independently verified reporting.
ALTER TABLE media_posts DROP CONSTRAINT media_posts_authenticity_check;
ALTER TABLE media_posts ADD CONSTRAINT media_posts_authenticity_check
CHECK (authenticity IN ('example','editorial','sourced','verified','anonymous'));
