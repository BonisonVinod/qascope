-- Migration 022: Super admin flag + platform-level visibility
-- Adds is_super_admin to public.users.
-- Super admins can see ALL clients, their usage, and MRR.
-- Only the QAScope owner (you) should have this flag.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Super admin can read ALL clients (bypasses tenant_isolation_clients policy)
-- We do this by adding a separate permissive policy.
-- RLS evaluates policies with OR logic — any passing policy grants access.
CREATE POLICY "super_admin_read_all_clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Super admin can read ALL users (for support purposes)
CREATE POLICY "super_admin_read_all_users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.id = auth.uid() AND u2.is_super_admin = true
    )
  );

-- Super admin can read ALL subscriptions
CREATE POLICY "super_admin_read_all_subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Super admin can UPDATE clients (to change plan manually)
CREATE POLICY "super_admin_update_clients"
  ON public.clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Super admin can read ALL conversations (for usage metrics)
CREATE POLICY "super_admin_read_all_conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Super admin can read ALL openai_usage
CREATE POLICY "super_admin_read_all_openai_usage"
  ON public.openai_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- -------------------------------------------------------
-- HOW TO GRANT YOURSELF SUPER ADMIN:
-- Run this once in Supabase SQL Editor, replacing the email:
--
--   UPDATE public.users
--   SET is_super_admin = true
--   WHERE email = 'your@email.com';
-- -------------------------------------------------------
