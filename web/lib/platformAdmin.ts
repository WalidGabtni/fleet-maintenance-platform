import { redirect } from "next/navigation";
import { getSupabaseClient } from "./supabase";

// Reads is_platform_admin from the caller's own profile via a
// server-verified session — supabase.auth.getUser() re-validates the JWT
// against Supabase Auth, never trusting a client-supplied value, so this
// can't be spoofed by editing anything in the browser. The real security
// boundary is still RLS (the is_platform_admin() Postgres function used
// across the tenants/tenant_features/profiles policies) — these helpers are
// the app-level UX gate (clean redirect / error message) on top of that.
async function getCurrentPlatformAdminStatus(): Promise<{ userId: string; isPlatformAdmin: boolean } | null> {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, isPlatformAdmin: profile?.is_platform_admin ?? false };
}

// For server actions — throws so the caller gets a clear rejection.
export async function requirePlatformAdmin() {
  const status = await getCurrentPlatformAdminStatus();
  if (!status?.isPlatformAdmin) {
    throw new Error("Accès refusé.");
  }
  return status;
}

// For pages — redirects instead of showing an error boundary.
export async function requirePlatformAdminPage() {
  const status = await getCurrentPlatformAdminStatus();
  if (!status?.isPlatformAdmin) {
    redirect("/");
  }
  return status;
}
