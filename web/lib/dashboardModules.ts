import { getSupabaseClient } from "./supabase";
import type { CurrentProfile } from "./profile";
import { isAdminTier } from "./permissions";
import { getTenantMaintenanceStatus, isInvoiceOverdue, isPartLowStock } from "./alerts";

export type ModuleUrgency = "good" | "neutral" | "waiting" | "urgent";

export type ModuleStat = {
  label: string;
  value: number;
  urgency: ModuleUrgency;
};

// Server Components can't hand a plain function (a component reference like
// TruckIcon) to a Client Component as a prop — RSC can't serialize it. So
// modules carry only a string key here; ModuleCard.tsx resolves the actual
// icon component from that key on the client side.
export type ModuleCardData = {
  key: string;
  label: string;
  href: string;
  stats: ModuleStat[];
};

const NO_TECHNICIAN = "00000000-0000-0000-0000-000000000000";

function sevenDaysAgoIso() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export async function getDashboardModules(
  profile: CurrentProfile,
  enabledFeatures: Set<string>,
): Promise<ModuleCardData[]> {
  const supabase = await getSupabaseClient();
  const isAdmin = isAdminTier(profile.role);
  // Only the technicien role gets a personal-scoped work-orders card — every
  // other role (including superviseur/commis_pieces, who aren't linked to a
  // technicians row at all) sees the shop-wide counts. A technicien with no
  // linked technician record sees zero counts on "their" work orders rather
  // than the whole shop's — scope to an id nothing can match.
  const technicianScopeId = profile.role === "technicien" ? (profile.technicianId ?? NO_TECHNICIAN) : null;

  const [
    vehiclesModule,
    workOrdersModule,
    partsModule,
    maintenanceModule,
    customersModule,
    techniciansModule,
    invoicingModule,
    teamModule,
    dataExplorerModule,
    activityLogModule,
    documentsModule,
    reportsModule,
    settingsModule,
  ] = await Promise.all([
    getVehiclesModule(supabase),
    enabledFeatures.has("work_orders") ? getWorkOrdersModule(supabase, technicianScopeId) : null,
    enabledFeatures.has("parts_inventory") ? getPartsModule(supabase, profile.tenantId) : null,
    enabledFeatures.has("maintenance_scheduling") ? getMaintenanceModule(supabase, profile.tenantId) : null,
    getCustomersModule(supabase),
    getTechniciansModule(supabase),
    isAdmin && enabledFeatures.has("invoicing") ? getInvoicingModule(supabase, profile.tenantId) : null,
    isAdmin && enabledFeatures.has("manage_users") ? getTeamModule(supabase, profile.tenantId) : null,
    // Not gated behind a tenant_features flag, same as their nav entries —
    // both are internal admin tooling (data browser, audit trail), not
    // billable modules.
    isAdmin ? getDataExplorerModule(supabase, profile.tenantId) : null,
    isAdmin ? getActivityLogModule(supabase, profile.tenantId) : null,
    // Documents has no role/feature restriction in the nav either — every
    // authenticated tenant member sees it there, so the card follows suit.
    getDocumentsModule(supabase, profile.tenantId),
    isAdmin && enabledFeatures.has("reporting") ? getReportsModule(supabase) : null,
    isAdmin && enabledFeatures.has("invoicing") ? getSettingsModule(supabase, profile.tenantId) : null,
  ]);

  return [
    vehiclesModule,
    workOrdersModule,
    partsModule,
    maintenanceModule,
    customersModule,
    techniciansModule,
    invoicingModule,
    teamModule,
    dataExplorerModule,
    activityLogModule,
    documentsModule,
    reportsModule,
    settingsModule,
  ].filter((m): m is ModuleCardData => m !== null);
}

async function getVehiclesModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
): Promise<ModuleCardData> {
  const [{ data: vehicles }, { data: statusRows }] = await Promise.all([
    supabase.from("vehicles").select("active"),
    supabase.from("vehicle_maintenance_status").select("vehicle_id, is_due, is_due_soon"),
  ]);

  const active = (vehicles ?? []).filter((v) => v.active).length;
  const inactive = (vehicles ?? []).filter((v) => !v.active).length;
  const dueVehicleIds = new Set(
    (statusRows ?? [])
      .filter((r) => (r.is_due || r.is_due_soon) && r.vehicle_id)
      .map((r) => r.vehicle_id as string),
  );

  return {
    key: "vehicles",
    label: "Véhicules",
    href: "/vehicles",
    stats: [
      { label: "Actifs", value: active, urgency: "good" },
      { label: "Inactifs", value: inactive, urgency: "neutral" },
      { label: "Entretien prévu", value: dueVehicleIds.size, urgency: "waiting" },
    ],
  };
}

async function getWorkOrdersModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  technicianScopeId: string | null,
): Promise<ModuleCardData> {
  let openQuery = supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("status", "open");
  let waitingQuery = supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "waiting_on_parts");
  let completedQuery = supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("closed_at", sevenDaysAgoIso());

  if (technicianScopeId) {
    openQuery = openQuery.eq("technician_id", technicianScopeId);
    waitingQuery = waitingQuery.eq("technician_id", technicianScopeId);
    completedQuery = completedQuery.eq("technician_id", technicianScopeId);
  }

  const [{ count: openCount }, { count: waitingCount }, { count: completedCount }] = await Promise.all([
    openQuery,
    waitingQuery,
    completedQuery,
  ]);

  return {
    key: "work_orders",
    label: technicianScopeId ? "Mes bons de travail" : "Bons de travail",
    href: "/work-orders",
    stats: [
      { label: "Ouverts", value: openCount ?? 0, urgency: "neutral" },
      { label: "En attente de pièces", value: waitingCount ?? 0, urgency: "waiting" },
      { label: "Terminés (7 j)", value: completedCount ?? 0, urgency: "good" },
    ],
  };
}

async function getPartsModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const [{ data: parts }, { data: usageRows }] = await Promise.all([
    supabase.from("parts").select("quantity_on_hand, low_stock_threshold").eq("tenant_id", tenantId),
    supabase
      .from("work_order_parts")
      .select("quantity_used")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgoIso()),
  ]);

  const belowThreshold = (parts ?? []).filter(isPartLowStock).length;
  const healthy = (parts ?? []).length - belowThreshold;
  const usage7d = (usageRows ?? []).reduce((sum, r) => sum + r.quantity_used, 0);

  return {
    key: "parts",
    label: "Pièces",
    href: "/parts",
    stats: [
      { label: "En stock", value: healthy, urgency: "good" },
      { label: "Sous le seuil", value: belowThreshold, urgency: "urgent" },
      { label: "Utilisées (7 j)", value: usage7d, urgency: "neutral" },
    ],
  };
}

async function getInvoicingModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const { data: invoices } = await supabase.from("invoices").select("status, due_at").eq("tenant_id", tenantId);

  let draft = 0;
  let sent = 0;
  let overdue = 0;
  for (const inv of invoices ?? []) {
    if (isInvoiceOverdue(inv)) overdue++;
    else if (inv.status === "draft") draft++;
    else if (inv.status === "sent") sent++;
  }

  return {
    key: "invoicing",
    label: "Factures",
    href: "/invoices",
    stats: [
      { label: "Brouillons", value: draft, urgency: "neutral" },
      { label: "Envoyées", value: sent, urgency: "waiting" },
      { label: "En retard", value: overdue, urgency: "urgent" },
    ],
  };
}

async function getMaintenanceModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const { rows, totalActiveScheduleCount } = await getTenantMaintenanceStatus(supabase, tenantId);

  const overdue = rows.filter((r) => r.is_due).length;
  const dueSoon = rows.filter((r) => !r.is_due && r.is_due_soon).length;
  const upToDate = totalActiveScheduleCount - overdue - dueSoon;

  return {
    key: "maintenance",
    label: "Entretien",
    href: "/maintenance",
    stats: [
      { label: "À jour", value: upToDate, urgency: "good" },
      { label: "Bientôt dû", value: dueSoon, urgency: "waiting" },
      { label: "En retard", value: overdue, urgency: "urgent" },
    ],
  };
}

async function getCustomersModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
): Promise<ModuleCardData> {
  const [{ data: customers }, { data: vehicles }] = await Promise.all([
    supabase.from("customers").select("id, created_at"),
    supabase.from("vehicles").select("customer_id"),
  ]);

  const customerIdsWithVehicles = new Set((vehicles ?? []).map((v) => v.customer_id));
  const withVehicles = (customers ?? []).filter((c) => customerIdsWithVehicles.has(c.id)).length;
  const withoutVehicles = (customers ?? []).length - withVehicles;
  const recent = (customers ?? []).filter((c) => c.created_at >= sevenDaysAgoIso()).length;

  return {
    key: "customers",
    label: "Clients",
    href: "/customers",
    stats: [
      { label: "Avec véhicule", value: withVehicles, urgency: "good" },
      { label: "Sans véhicule", value: withoutVehicles, urgency: "neutral" },
      { label: "Nouveaux (7 j)", value: recent, urgency: "neutral" },
    ],
  };
}

async function getTechniciansModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
): Promise<ModuleCardData> {
  const { data: technicians } = await supabase.from("technicians").select("active, user_id");

  const active = (technicians ?? []).filter((t) => t.active).length;
  const inactive = (technicians ?? []).filter((t) => !t.active).length;
  const noAccess = (technicians ?? []).filter((t) => t.active && !t.user_id).length;

  return {
    key: "technicians",
    label: "Techniciens",
    href: "/technicians",
    stats: [
      { label: "Actifs", value: active, urgency: "good" },
      { label: "Inactifs", value: inactive, urgency: "neutral" },
      { label: "Sans accès de connexion", value: noAccess, urgency: "urgent" },
    ],
  };
}

async function getTeamModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const { data: profiles } = await supabase.from("profiles").select("role, active").eq("tenant_id", tenantId);

  const activeCount = (profiles ?? []).filter((p) => p.active).length;
  const admins = (profiles ?? []).filter((p) => p.role === "admin").length;
  const deactivated = (profiles ?? []).filter((p) => !p.active).length;

  return {
    key: "team",
    label: "Équipe",
    href: "/team",
    stats: [
      { label: "Comptes actifs", value: activeCount, urgency: "good" },
      { label: "Administrateurs", value: admins, urgency: "neutral" },
      { label: "Désactivés", value: deactivated, urgency: "neutral" },
    ],
  };
}

// The 7 entity tables the data explorer browses — kept as a local list
// rather than importing ENTITIES from lib/dataExplorer.tsx, since that
// module pulls in JSX-producing render functions this server-only stat
// query has no use for.
const DATA_EXPLORER_TABLES = [
  "customers",
  "vehicles",
  "work_orders",
  "parts",
  "invoices",
  "technicians",
  "vehicle_maintenance_schedules",
] as const;

async function getDataExplorerModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const counts = await Promise.all(
    DATA_EXPLORER_TABLES.map((table) =>
      supabase.from(table).select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    ),
  );
  const total = counts.reduce((sum, { count }) => sum + (count ?? 0), 0);

  return {
    key: "data_explorer",
    label: "Vue complète des données",
    href: "/data-explorer",
    stats: [
      { label: "Enregistrements totaux", value: total, urgency: "neutral" },
      { label: "Types de données", value: DATA_EXPLORER_TABLES.length, urgency: "neutral" },
    ],
  };
}

async function getActivityLogModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const [{ count: totalCount }, { count: recentCount }, { count: failedLoginCount }] = await Promise.all([
    supabase.from("activity_logs").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgoIso()),
    supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("action", "login_failed")
      .gte("created_at", sevenDaysAgoIso()),
  ]);

  return {
    key: "activity_log",
    label: "Journal d'activité",
    href: "/activity-log",
    stats: [
      { label: "Entrées (7 j)", value: recentCount ?? 0, urgency: "neutral" },
      { label: "Connexions échouées (7 j)", value: failedLoginCount ?? 0, urgency: "urgent" },
      { label: "Entrées totales", value: totalCount ?? 0, urgency: "neutral" },
    ],
  };
}

async function getDocumentsModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const [{ count: totalCount }, { count: recentCount }] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgoIso()),
  ]);

  return {
    key: "documents",
    label: "Documents",
    href: "/documents",
    stats: [
      { label: "Documents totaux", value: totalCount ?? 0, urgency: "neutral" },
      { label: "Ajoutés (7 j)", value: recentCount ?? 0, urgency: "good" },
    ],
  };
}

function thirtyDaysAgoDate() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

// Matches the 30-day default window on /reports itself — this card is
// meant to preview what that page already shows, not a different range.
async function getReportsModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
): Promise<ModuleCardData> {
  const { data } = await supabase.rpc("report_revenue_overview", {
    start_date: thirtyDaysAgoDate(),
    end_date: todayDate(),
  });
  const row = data?.[0];

  return {
    key: "reports",
    label: "Rapports",
    href: "/reports",
    stats: [
      { label: "Facturé (30 j)", value: Math.round(row?.total_invoiced ?? 0), urgency: "neutral" },
      { label: "Payé (30 j)", value: Math.round(row?.total_paid ?? 0), urgency: "good" },
      { label: "En attente (30 j)", value: Math.round(row?.total_outstanding ?? 0), urgency: "waiting" },
    ],
  };
}

// shop_settings is a single config row per tenant, not a collection — so
// unlike every other card, these "stats" are the currently configured
// values themselves (a glanceable sanity check), not counts.
async function getSettingsModule(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  tenantId: string,
): Promise<ModuleCardData> {
  const { data: settings } = await supabase
    .from("shop_settings")
    .select("hourly_labor_rate, tax_rate")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return {
    key: "settings",
    label: "Paramètres de facturation",
    href: "/settings",
    stats: [
      { label: "Taux horaire ($)", value: settings?.hourly_labor_rate ?? 0, urgency: "neutral" },
      { label: "Taux de taxe (%)", value: Math.round((settings?.tax_rate ?? 0) * 100), urgency: "neutral" },
    ],
  };
}
