-- ============================
-- SECURITY FIX: the pre-existing "Users can update own profile" policy
-- (not tracked in any prior migration file — applied out-of-band at some
-- point) allowed an authenticated user to update ANY column on their own
-- profiles row, including `role` and `active`. Since Postgres RLS policies
-- for the same command are OR'd together, this silently made the new
-- column-restricted "Users can update their own name" policy pointless —
-- any technician could self-promote to admin via a direct API call.
-- Dropping the permissive policy closes that hole; the restrictive policy
-- added in the prior migration already covers the legitimate self-update
-- use case (full_name).
-- ============================

drop policy if exists "Users can update own profile" on profiles;
