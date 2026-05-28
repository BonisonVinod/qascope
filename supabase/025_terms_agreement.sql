-- Migration 025: Track User Agreement to Terms & Conditions
-- Adds agreed_to_terms_at and terms_version_agreed to public.users table.
-- Existing users are set to version 1 by default so they aren't immediately blocked.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS agreed_to_terms_at timestamptz DEFAULT now();

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_version_agreed int NOT NULL DEFAULT 1;
