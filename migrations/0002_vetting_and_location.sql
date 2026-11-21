-- Only for a database created with the first version of schema.sql.
-- Run once: npx wrangler d1 execute mtaacare --remote --file=migrations/0002_vetting_and_location.sql
ALTER TABLE helps ADD COLUMN lat REAL;
ALTER TABLE helps ADD COLUMN lng REAL;
ALTER TABLE helps ADD COLUMN added_by TEXT NOT NULL DEFAULT 'self';
ALTER TABLE requests ADD COLUMN lat REAL;
ALTER TABLE requests ADD COLUMN lng REAL;

CREATE TABLE IF NOT EXISTS vetting_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  help_id       TEXT NOT NULL,
  step          TEXT NOT NULL,
  slot          INTEGER NOT NULL DEFAULT 0,
  result        TEXT NOT NULL,
  notes         TEXT NOT NULL DEFAULT '',
  data          TEXT NOT NULL DEFAULT '{}',
  by_name       TEXT NOT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vetting_help ON vetting_events(help_id, created_at);
