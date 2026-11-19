CREATE TABLE marketing_metrics (
 day date NOT NULL DEFAULT CURRENT_DATE,
 event text NOT NULL,
 path text NOT NULL,
 content_type text NOT NULL,
 article_id text NOT NULL DEFAULT '',
 placement text NOT NULL,
 utm_source text NOT NULL DEFAULT '',
 device text NOT NULL CHECK (device IN ('mobile','desktop')),
 count bigint NOT NULL DEFAULT 1 CHECK (count > 0),
 PRIMARY KEY(day,event,path,content_type,article_id,placement,utm_source,device)
);
CREATE INDEX marketing_metrics_day ON marketing_metrics(day DESC);
ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;
