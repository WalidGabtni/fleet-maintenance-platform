import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "./supabase";
import { getCurrentProfile } from "./profile";

// Memoized per request (React's cache()) — every Server Component that asks
// during the same render (layout, page, etc.) shares one query instead of
// re-fetching. Always re-runs on the next request, so a superadmin toggle
// takes effect on the user's very next navigation.
//
// Explicitly scoped to the caller's own tenant rather than leaning on RLS
// alone: platform admins have a broader, unscoped read policy on
// tenant_features (so /platform-admin can show every tenant's flags), and
// for a user who is both a platform admin and a tenant member, RLS ORs that
// policy in alongside the normal tenant-scoped one — meaning an unfiltered
// select would silently union in every other tenant's enabled features too.
export const getEnabledFeatures = cache(async (): Promise<Set<string>> => {
  const profile = await getCurrentProfile();
  if (!profile?.tenantId) return new Set();

  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("tenant_features")
    .select("feature_key")
    .eq("enabled", true)
    .eq("tenant_id", profile.tenantId);
  return new Set((data ?? []).map((r) => r.feature_key));
});

// Nav filtering and RLS both already keep a disabled feature's data out of
// reach, but neither stops someone from *landing* on the page directly (a
// stale client-side cache, browser back/forward, a bookmark) — RLS then
// returns an empty/blocked result, or a gated RPC raises a raw exception
// that surfaces as an unhandled server error. Page components should call
// this up front, the same way they already do for role checks.
export async function requireFeature(key: string) {
  const enabled = await getEnabledFeatures();
  if (!enabled.has(key)) redirect("/");
}
