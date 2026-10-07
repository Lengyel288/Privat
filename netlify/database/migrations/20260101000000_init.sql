CREATE TABLE IF NOT EXISTS docs (
  path text PRIMARY KEY,
  parent text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS docs_parent_idx ON docs (parent);
CREATE TABLE IF NOT EXISTS files (
  id text PRIMARY KEY,
  name text,
  content_type text,
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
