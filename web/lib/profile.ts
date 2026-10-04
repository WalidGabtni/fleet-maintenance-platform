import { getSupabaseClient } from "./supabase";
import type { Role } from "./types";

export type CurrentProfile = {
  id: string;
  role: Role;
  tenantId: string;
  tenantName: string | null;
  technicianId: string | null;
  fullName: string | null;
  email: string | null;
  isPlatformAdmin: boolean;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: technician }] = await Promise.all([
    supabase
      .from("profiles")
      // tenants(name) is a to-one embed, so PostgREST returns an object here,
      // not an array. Readable by every role via the "Users can read their own
      // tenant" policy.
      .select("role, tenant_id, full_name, email, is_platform_admin, tenants(name)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("technicians").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const tenant = profile?.tenants as { name: string | null } | null | undefined;

  return {
    id: user.id,
    role: (profile?.role as Role | undefined) ?? "technicien",
    tenantId: profile?.tenant_id ?? "",
    tenantName: tenant?.name ?? null,
    technicianId: technician?.id ?? null,
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? user.email ?? null,
    isPlatformAdmin: profile?.is_platform_admin ?? false,
  };
}
