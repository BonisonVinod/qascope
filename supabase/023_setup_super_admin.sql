-- Migration 023: Setup / Restore Super Admin Access
-- This script is a failsafe to automatically insert or repair your user profile.
-- It:
-- 1. Finds the Supabase Auth ID for the target email address.
-- 2. Checks for an existing client/company workspace (creates one if missing).
-- 3. Restores/sets your public.users profile as 'admin' and 'is_super_admin = true'.
--
-- How to run:
-- Replace the email address below with your login email, copy the entire script, 
-- and click 'Run' in the Supabase SQL Editor.

DO $$
DECLARE
  v_client_id uuid;
  v_user_id uuid;
  v_email text := 'ai.ops.automation@gmail.com'; -- 👈 CHANGE THIS to the email you are currently logged in with!
BEGIN
  -- 1. Get the Auth user ID for this email
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email);
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User email % not found in Supabase Auth. Make sure you have signed up in the app first.', v_email;
  END IF;

  -- 2. Find or create a default client workspace
  SELECT id INTO v_client_id FROM public.clients LIMIT 1;
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (name, active_plan)
    VALUES ('My Company', 'pilot')
    RETURNING id INTO v_client_id;
  END IF;

  -- 3. Upsert the user profile in public.users
  INSERT INTO public.users (id, client_id, name, email, role, is_super_admin)
  VALUES (v_user_id, v_client_id, 'Super Admin', v_email, 'admin', true)
  ON CONFLICT (id) DO UPDATE
  SET client_id = EXCLUDED.client_id,
      role = 'admin',
      is_super_admin = true;

  RAISE NOTICE 'Success! User % has been set as Admin and Super Admin.', v_email;
END $$;
