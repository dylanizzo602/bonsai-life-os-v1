-- Migration: Add secure storage for Google Calendar OAuth refresh tokens
-- Goal: Store refresh tokens server-side only so Edge Functions can fetch Google Calendar events.

-- =========================
-- 1) Table: google_calendar_tokens
-- =========================
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  scope text,
  token_type text,
  provider_user_id text,
  calendar_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Useful for server-side scans/ops (even though rows are user-keyed)
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_updated_at
  ON google_calendar_tokens(updated_at DESC);

-- =========================
-- 2) Row Level Security
-- =========================
-- IMPORTANT: Do not expose refresh tokens to the client.
-- We intentionally do NOT create authenticated SELECT policies.
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Migration: Add secure storage for Google Calendar OAuth refresh tokens
-- Goal: Store refresh tokens server-side only so Edge Functions can fetch Google Calendar events.

-- =========================
-- 1) Table: google_calendar_tokens
-- =========================
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  scope text,
  token_type text,
  provider_user_id text,
  calendar_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Useful for server-side scans/ops (even though rows are user-keyed)
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_updated_at
  ON google_calendar_tokens(updated_at DESC);

-- =========================
-- 2) Row Level Security
-- =========================
-- IMPORTANT: Do not expose refresh tokens to the client.
-- We intentionally do NOT create authenticated SELECT policies.
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

