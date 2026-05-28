-- Migration 024: Fix RLS Infinite Recursion on public.users
-- This creates a security definer helper to check super admin status safely 
-- without triggering recursive RLS query loops.

-- 1. Create helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(is_super_admin, false) 
  FROM public.users 
  WHERE id = auth.uid();
$$;

-- 2. Drop old recursive policies
DROP POLICY IF EXISTS "super_admin_read_all_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_read_all_clients" ON public.clients;
DROP POLICY IF EXISTS "super_admin_read_all_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "super_admin_update_clients" ON public.clients;
DROP POLICY IF EXISTS "super_admin_read_all_conversations" ON public.conversations;

-- 3. Re-create policies using the non-recursive helper function
CREATE POLICY "super_admin_read_all_users"
  ON public.users FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin_read_all_clients"
  ON public.clients FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin_read_all_subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin_update_clients"
  ON public.clients FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_read_all_conversations"
  ON public.conversations FOR SELECT
  USING (public.is_super_admin());

-- 4. Update the conditional openai_usage policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'openai_usage'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "super_admin_read_all_openai_usage" ON public.openai_usage';
    EXECUTE 'CREATE POLICY "super_admin_read_all_openai_usage"
      ON public.openai_usage FOR SELECT
      USING (public.is_super_admin())';
  END IF;
END $$;
