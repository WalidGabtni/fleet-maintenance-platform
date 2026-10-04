import { getSupabaseClient } from "./supabase";

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseClient>>;

export type AlertCounts = {
  lowStock: number;
  maintenanceOverdue: number;
  maintenanceDueSoon: number;
  overdueInvoices: number;
};

// ---- Parts ----

export function isPartLowStock(part: { quantity_on_hand: number; low_stock_threshold: number }): boolean {
  return part.quantity_on_hand <= part.low_stock_threshold;
}

export async function getLowStockCount(supabase: SupabaseServerClient, tenantId: string): Promise<number> {
  const { data } = await supabase
    .from("parts")
    .select("quantity_on_hand, low_stock_threshold")
    .eq("tenant_id", tenantId);
  return (data ?? []).filter(isPartLowStock).length;
}

// ---- Maintenance ----
// vehicle_maintenance_status has no tenant_id column of its own (it's a
// security_invoker view over vehicle_maintenance_schedules and friends), so
// tenant scoping goes through the one table in its join graph that does have
// one, rather than trusting the view's own RLS inheritance alone.

export type MaintenanceStatusRow = { schedule_id: string; is_due: boolean; is_due_soon: boolean };

export async function getTenantMaintenanceStatus(
  supabase: SupabaseServerClient,
  tenantId: string,
): Promise<{ rows: MaintenanceStatusRow[]; totalActiveScheduleCount: number }> {
  const [{ data: scheduleRows }, { data: statusRows }] = await Promise.all([
    supabase.from("vehicle_maintenance_schedules").select("id").eq("tenant_id", tenantId).eq("active", true),
    supabase.from("vehicle_maintenance_status").select("schedule_id, is_due, is_due_soon"),
  ]);
  const scheduleIds = new Set((scheduleRows ?? []).map((r) => r.id));
  const rows = (statusRows ?? [])
    .filter((r) => r.schedule_id != null && scheduleIds.has(r.schedule_id))
    .map((r) => ({ schedule_id: r.schedule_id as string, is_due: !!r.is_due, is_due_soon: !!r.is_due_soon }));
  return { rows, totalActiveScheduleCount: scheduleIds.size };
}

export async function getMaintenanceDueCounts(
  supabase: SupabaseServerClient,
  tenantId: string,
): Promise<{ overdue: number; dueSoon: number }> {
  const { rows } = await getTenantMaintenanceStatus(supabase, tenantId);
  return {
    overdue: rows.filter((r) => r.is_due).length,
    dueSoon: rows.filter((r) => !r.is_due && r.is_due_soon).length,
  };
}

// ---- Invoices ----

export function isInvoiceOverdue(invoice: { status: string; due_at: string | null }): boolean {
  return invoice.status === "sent" && invoice.due_at != null && new Date(invoice.due_at).getTime() < Date.now();
}

export async function getOverdueInvoiceCount(supabase: SupabaseServerClient, tenantId: string): Promise<number> {
  const { data } = await supabase.from("invoices").select("status, due_at").eq("tenant_id", tenantId);
  return (data ?? []).filter(isInvoiceOverdue).length;
}
