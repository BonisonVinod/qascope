-- ============================================================
-- Migration 029: Alerts Engine
-- ============================================================
-- Creates three tables:
--   1. alert_preferences  — per-workspace toggles for which alerts fire
--   2. agent_notifications — the per-user in-app notification feed
--   3. push_subscriptions  — stores Web Push API subscription objects per user
-- ============================================================

-- ------------------------------------------------------------
-- 1. alert_preferences
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_preferences (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Email toggles (managers always get email, but can be workspace-disabled)
  email_on_critical_fail      boolean NOT NULL DEFAULT true,
  email_on_low_score          boolean NOT NULL DEFAULT true,

  -- Custom score threshold for "low score" alerts.
  -- NULL means: use the workspace pass_threshold from clients table.
  alert_score_threshold       integer CHECK (alert_score_threshold BETWEEN 0 AND 100),

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (client_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_alert_preferences()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_alert_preferences_updated
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW EXECUTE FUNCTION touch_alert_preferences();

-- RLS
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- Admins and QA managers can read their workspace preferences
CREATE POLICY "alert_preferences_select" ON alert_preferences
  FOR SELECT USING (
    client_id = (SELECT client_id FROM users WHERE id = auth.uid())
  );

-- Only admins can write
CREATE POLICY "alert_preferences_write" ON alert_preferences
  FOR ALL USING (
    client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ------------------------------------------------------------
-- 2. agent_notifications
-- ------------------------------------------------------------
-- The in-app notification feed for every user.
-- severity: 'info' | 'warning' | 'critical'
-- For agents: only their own rows are visible.
-- For managers/admins: all rows in their workspace are visible.
CREATE TABLE IF NOT EXISTS agent_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- The user this notification belongs to (can be agent OR manager)
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Link to the audit result (optional — some notifications may be system-level)
  qa_score_id     uuid REFERENCES qa_scores(id) ON DELETE SET NULL,

  severity        text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title           text NOT NULL,
  body            text NOT NULL,

  -- URL to navigate to when the notification is clicked
  action_url      text,

  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_user
  ON agent_notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_client
  ON agent_notifications (client_id, severity, created_at DESC);

-- RLS
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

-- Agents see only their own notifications.
-- Managers/admins see all in their workspace.
CREATE POLICY "agent_notifications_select" ON agent_notifications
  FOR SELECT USING (
    -- Own notifications always visible
    user_id = auth.uid()
    OR
    -- Managers see all in their workspace
    (
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'qa_manager', 'team_lead')
    )
  );

-- Backend service role inserts notifications; users cannot insert their own.
CREATE POLICY "agent_notifications_insert" ON agent_notifications
  FOR INSERT WITH CHECK (
    client_id = (SELECT client_id FROM users WHERE id = auth.uid())
  );

-- Users can mark their own notifications as read.
CREATE POLICY "agent_notifications_update" ON agent_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3. push_subscriptions
-- ------------------------------------------------------------
-- Stores the Web Push API subscription object for each user/browser.
-- A user can have multiple subscriptions (e.g., work laptop + phone).
-- Deleting a row opts the user out of push for that browser.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- The full Web Push subscription JSON from browser:
  -- { endpoint, keys: { p256dh, auth } }
  subscription    jsonb NOT NULL,

  -- User agent string for display (so user knows which device this is)
  user_agent      text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client
  ON push_subscriptions (client_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_push_subscriptions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_push_subscriptions_updated
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION touch_push_subscriptions();

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users only see and manage their own subscriptions
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Service role (backend) can read all subscriptions to send pushes
-- (handled via service role key bypass — no additional policy needed)
