import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Bypasses RLS entirely (service_role). Never import this into a Client
 * Component. Every caller MUST check the current user is an admin
 * (getCurrentProfile) before using it — this client has no notion of
 * "who's calling," it's an unconditional master key.
 */
export function getSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
