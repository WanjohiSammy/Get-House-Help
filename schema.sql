-- MtaaCare database (Cloudflare D1 / SQLite). Run once on a new database: npm run db:init

CREATE TABLE IF NOT EXISTS helps (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  area          TEXT NOT NULL,
  lat           REAL,                       -- approximate home point (3 decimals ≈ 100 m). Staff only.
  lng           REAL,
  kinds         TEXT NOT NULL DEFAULT '',   -- comma list: live-in,live-out,day
  tasks         TEXT NOT NULL DEFAULT '',   -- comma list: cleaning,cooking,...
  years         INTEGER NOT NULL DEFAULT 0,
  languages     TEXT NOT NULL DEFAULT '',
  salary        INTEGER,                    -- expected KES per month
  about         TEXT NOT NULL DEFAULT '',
  ref1_name     TEXT, ref1_phone TEXT,
  ref2_name     TEXT, ref2_phone TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | unavailable
  -- Badges. Set automatically from vetting_events, never edited by hand.
  id_verified   INTEGER NOT NULL DEFAULT 0,
  good_conduct  INTEGER NOT NULL DEFAULT 0,
  refs_called   INTEGER NOT NULL DEFAULT 0,
  interviewed   INTEGER NOT NULL DEFAULT 0,
  certified     INTEGER NOT NULL DEFAULT 0,
  admin_notes   TEXT NOT NULL DEFAULT '',
  added_by      TEXT NOT NULL DEFAULT 'self', -- 'self' (join form) or the staff member's name
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS helps_phone ON helps(phone);
CREATE INDEX IF NOT EXISTS helps_status ON helps(status);

-- Every vetting step anyone records, kept forever as an audit trail.
CREATE TABLE IF NOT EXISTS vetting_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  help_id       TEXT NOT NULL,
  step          TEXT NOT NULL,              -- id_check | good_conduct | reference | interview | training | note
  slot          INTEGER NOT NULL DEFAULT 0, -- reference 1 or 2
  result        TEXT NOT NULL,              -- pass | fail | pending | no_answer
  notes         TEXT NOT NULL DEFAULT '',
  data          TEXT NOT NULL DEFAULT '{}', -- step details (JSON)
  by_name       TEXT NOT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vetting_help ON vetting_events(help_id, created_at);

CREATE TABLE IF NOT EXISTS requests (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  tasks         TEXT NOT NULL DEFAULT '',
  area          TEXT NOT NULL,
  lat           REAL,
  lng           REAL,
  start         TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  shortlist     TEXT NOT NULL DEFAULT '[]', -- JSON array of help ids, frozen at creation
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'open', -- open | awaiting_payment | pending_review | paid | hired | closed
  mpesa_code    TEXT,
  checkout_id   TEXT,
  receipt       TEXT,
  amount        INTEGER,
  hired_help_id TEXT,
  created_at    TEXT NOT NULL,
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS requests_checkout ON requests(checkout_id);
