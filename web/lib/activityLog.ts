import "server-only";
import { getSupabaseClient } from "./supabase";
import { getSupabaseAdminClient } from "./supabase-admin";
import type { Json } from "./database.types";

// The full set currently in use across the app — not a DB constraint (see
// the activity_logs migration), just the compile-time-checked vocabulary
// every call site should draw from. Extend this when adding a new logged
// action rather than inventing an ad hoc string at the call site.
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "login_success"
  | "login_failed"
  | "role_changed"
  | "activated"
  | "deactivated"
  | "feature_toggled";

export type ActivityEntityType =
  | "work_order"
  | "invoice"
  | "part"
  | "profile"
  | "vehicle"
  | "vehicle_maintenance_schedule"
  | "tenant_feature";

export type LogActivityParams = {
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
};

// Best-effort by design: a logging failure is caught and reported to the
// server console rather than thrown, so an audit-trail hiccup can never
// block the real action it's describing from completing.
function reportLogFailure(context: string, error: unknown) {
  console.error(`[activityLog] failed to write ${context}:`, error);
}

// Writes one activity_logs row as the current authenticated user, into
// their own tenant — tenant_id is left for the DB trigger to auto-stamp
// from current_tenant_id(). This is the call every instrumented action in
// the app should use, unless it specifically needs the cross-tenant path
// below.
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("activity_logs").insert({
      user_id: user?.id ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      description: params.description,
      metadata: (params.metadata ?? null) as Json,
    });
    if (error) throw error;
  } catch (error) {
    reportLogFailure("activity log entry", error);
  }
}

// For a platform admin acting on a *different* tenant than their own (e.g.
// toggling that tenant's feature flags from /platform-admin) — the entry
// belongs in the affected tenant's log, not the admin's own. Authorized by
// the "Platform admins can log activity for any tenant" RLS policy, which
// requires is_platform_admin() and self-attribution (user_id = auth.uid()).
export async function logActivityForTenant(tenantId: string, params: LogActivityParams): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("activity_logs").insert({
      tenant_id: tenantId,
      user_id: user?.id ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      description: params.description,
      metadata: (params.metadata ?? null) as Json,
    });
    if (error) throw error;
  } catch (error) {
    reportLogFailure("cross-tenant activity log entry", error);
  }
}

// Login attempts can't go through logActivity(): a failed attempt has no
// session at all (auth.uid() is null), and even a successful one happens
// before the app has any other reason to touch the database. Both are
// resolved here by looking the attempted email up via the service-role
// client instead of relying on a session. An email that matches no account
// is skipped — there's no tenant to attribute the attempt to, so it can't
// be written into any tenant's (tenant-scoped, RLS-gated) log.
export async function logAuthActivity(params: {
  email: string;
  action: "login_success" | "login_failed";
  description: string;
}): Promise<void> {
  try {
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, tenant_id")
      .eq("email", params.email)
      .maybeSingle();
    if (!profile) return;

    const { error } = await admin.from("activity_logs").insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      action: params.action,
      entity_type: "profile",
      entity_id: profile.id,
      description: params.description,
      metadata: null,
    });
    if (error) throw error;
  } catch (error) {
    reportLogFailure("auth activity log entry", error);
  }
}
