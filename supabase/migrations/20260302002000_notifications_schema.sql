-- Migration: Notification schema for user preferences, devices, and delivery tracking
-- Goal: Support per-user, per-type, per-channel notification preferences and track notification sends.

-- =========================
-- 1) user_notification_preferences
-- =========================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (user_id, type, channel)
);

-- Default user_id to current authenticated user for inserts from client
ALTER TABLE user_notification_preferences
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Keep updated_at fresh on changes
CREATE OR REPLACE FUNCTION set_user_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_notification_preferences_set_updated_at ON user_notification_preferences;
CREATE TRIGGER user_notification_preferences_set_updated_at
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION set_user_notification_preferences_updated_at();

-- =========================
-- 2) notification_devices
-- =========================

CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- e.g. 'web' | 'ios' | 'android'
  token_or_endpoint TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Default user_id to current authenticated user for inserts from client
ALTER TABLE notification_devices
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- One record per unique device token per user/platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_devices_unique
ON notification_devices (user_id, platform, token_or_endpoint);

-- Helpful index for active devices
CREATE INDEX IF NOT EXISTS idx_notification_devices_active
ON notification_devices (user_id, is_active, last_seen_at DESC);

-- =========================
-- 3) notifications (delivery log)
-- =========================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- e.g. 'pending' | 'sent' | 'error' | 'skipped'
  error TEXT,
  source_type TEXT, -- e.g. 'task' | 'reminder' | 'habit_reminder'
  source_id UUID,
  dedupe_key TEXT, -- optional key to avoid duplicate sends per logical event
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Default user_id to current authenticated user for inserts from client (functions will use service role)
ALTER TABLE notifications
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Keep updated_at fresh on changes
CREATE OR REPLACE FUNCTION set_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notifications_set_updated_at ON notifications;
CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION set_notifications_updated_at();

-- Indexes to speed up querying by user/time/dedupe
CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled
ON notifications (user_id, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_channel
ON notifications (user_id, type, channel);

CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key
ON notifications (user_id, dedupe_key)
WHERE dedupe_key IS NOT NULL;

-- =========================
-- 4) Row Level Security
-- =========================

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- user_notification_preferences: owner-only access
CREATE POLICY "user_notification_preferences_select_own"
ON user_notification_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_notification_preferences_insert_own"
ON user_notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notification_preferences_update_own"
ON user_notification_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notification_preferences_delete_own"
ON user_notification_preferences
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- notification_devices: owner-only access
CREATE POLICY "notification_devices_select_own"
ON notification_devices
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notification_devices_insert_own"
ON notification_devices
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_devices_update_own"
ON notification_devices
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_devices_delete_own"
ON notification_devices
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- notifications: owner-only access for reading; inserts/updates typically via service role
CREATE POLICY "notifications_select_own"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

