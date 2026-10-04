import { getSupabaseClient } from "./supabase";
import { escapeIlikeTerm } from "./searchUtils";
import { StatusBadge, statusLabels } from "../app/work-orders/StatusBadge";
import { InvoiceStatusBadge, invoiceStatusLabels } from "../app/invoices/InvoiceStatusBadge";
import { WORK_ORDER_STATUSES } from "./types";
import type { WorkOrderStatus, InvoiceStatus } from "./types";

const PAGE_SIZE = 25;

// Narrowed to the tables this browser actually offers — all seven carry a
// tenant_id column, which the fetch function below always filters on.
type ExplorerTable =
  | "customers"
  | "vehicles"
  | "work_orders"
  | "parts"
  | "invoices"
  | "technicians"
  | "vehicle_maintenance_schedules";

export type EntityFilter =
  | { key: string; label: string; kind: "enum"; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: "boolean" }
  | { key: string; label: string; kind: "date" };

export type EntityColumn = {
  label: string;
  align?: "right";
  // Present only when this column maps directly to a column in sortColumns —
  // drives the clickable sort link in the table header.
  sortKey?: string;
  render: (row: Record<string, unknown>) => React.ReactNode;
};

export type EntityDef = {
  key: string;
  label: string;
  table: ExplorerTable;
  select: string;
  searchColumns: string[];
  sortColumns: { key: string; label: string }[];
  defaultSort: { key: string; direction: "asc" | "desc" };
  filters: EntityFilter[];
  columns: EntityColumn[];
};

function fmtDate(value: unknown): string {
  return typeof value === "string" && value ? new Date(value).toLocaleDateString() : "—";
}

function fmtMoney(value: unknown): string {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

function orDash(value: unknown): React.ReactNode {
  return value != null && value !== "" ? String(value) : "—";
}

function boolLabel(value: unknown): string {
  return value ? "Oui" : "Non";
}

type Embed = { name: string | null } | null;

function vehicleLabel(row: Record<string, unknown>, key = "vehicles"): string {
  const v = row[key] as { unit_number: string | null; make: string | null; model: string | null } | null;
  if (!v) return "—";
  return v.unit_number || [v.make, v.model].filter(Boolean).join(" ") || "—";
}

const createdAtFilter: EntityFilter = { key: "created_at", label: "Créé le", kind: "date" };

export const ENTITIES: EntityDef[] = [
  {
    key: "customers",
    label: "Clients",
    table: "customers",
    select: "id, name, email, phone, notes, created_at",
    searchColumns: ["name", "email", "phone"],
    sortColumns: [
      { key: "name", label: "Nom" },
      { key: "created_at", label: "Créé le" },
    ],
    defaultSort: { key: "name", direction: "asc" },
    filters: [createdAtFilter],
    columns: [
      { label: "Nom", sortKey: "name", render: (r) => orDash(r.name) },
      { label: "Courriel", render: (r) => orDash(r.email) },
      { label: "Téléphone", render: (r) => orDash(r.phone) },
      { label: "Notes", render: (r) => orDash(r.notes) },
      { label: "Créé le", sortKey: "created_at", render: (r) => fmtDate(r.created_at) },
    ],
  },
  {
    key: "vehicles",
    label: "Véhicules",
    table: "vehicles",
    select: "id, unit_number, make, model, year, vin, license_plate, mileage, active, created_at, customers(name)",
    searchColumns: ["unit_number", "make", "model", "vin", "license_plate"],
    sortColumns: [
      { key: "unit_number", label: "Unité" },
      { key: "make", label: "Marque" },
      { key: "year", label: "Année" },
      { key: "mileage", label: "Kilométrage" },
      { key: "created_at", label: "Créé le" },
    ],
    defaultSort: { key: "unit_number", direction: "asc" },
    filters: [{ key: "active", label: "Actif", kind: "boolean" }, createdAtFilter],
    columns: [
      { label: "Unité", sortKey: "unit_number", render: (r) => orDash(r.unit_number) },
      { label: "Marque / Modèle", sortKey: "make", render: (r) => orDash([r.make, r.model].filter(Boolean).join(" ") || null) },
      { label: "Année", sortKey: "year", render: (r) => orDash(r.year) },
      { label: "VIN", render: (r) => orDash(r.vin) },
      { label: "Plaque", render: (r) => orDash(r.license_plate) },
      { label: "Kilométrage", sortKey: "mileage", render: (r) => orDash(r.mileage), align: "right" },
      { label: "Client", render: (r) => orDash((r.customers as Embed)?.name ?? null) },
      { label: "Actif", render: (r) => boolLabel(r.active) },
      { label: "Créé le", sortKey: "created_at", render: (r) => fmtDate(r.created_at) },
    ],
  },
  {
    key: "work_orders",
    label: "Bons de travail",
    table: "work_orders",
    select:
      "id, status, reported_issue, diagnosis, work_performed, opened_at, closed_at, mileage_at_service, labor_hours, created_at, vehicles(unit_number, make, model), technicians(full_name)",
    searchColumns: ["reported_issue", "diagnosis", "work_performed"],
    sortColumns: [
      { key: "opened_at", label: "Ouvert le" },
      { key: "closed_at", label: "Fermé le" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Créé le" },
    ],
    defaultSort: { key: "opened_at", direction: "desc" },
    filters: [
      {
        key: "status",
        label: "Statut",
        kind: "enum",
        options: WORK_ORDER_STATUSES.map((s) => ({ value: s, label: statusLabels[s as WorkOrderStatus] })),
      },
      createdAtFilter,
    ],
    columns: [
      { label: "Véhicule", render: (r) => vehicleLabel(r) },
      { label: "Statut", sortKey: "status", render: (r) => <StatusBadge status={r.status as WorkOrderStatus} /> },
      { label: "Problème signalé", render: (r) => orDash(r.reported_issue) },
      { label: "Technicien", render: (r) => orDash((r.technicians as { full_name: string } | null)?.full_name ?? null) },
      { label: "Ouvert le", sortKey: "opened_at", render: (r) => fmtDate(r.opened_at) },
      { label: "Fermé le", sortKey: "closed_at", render: (r) => fmtDate(r.closed_at) },
      { label: "Km au service", render: (r) => orDash(r.mileage_at_service), align: "right" },
      { label: "Heures", render: (r) => orDash(r.labor_hours), align: "right" },
    ],
  },
  {
    key: "parts",
    label: "Pièces",
    table: "parts",
    select: "id, name, part_number, quantity_on_hand, low_stock_threshold, unit_cost, updated_at, created_at",
    searchColumns: ["name", "part_number"],
    sortColumns: [
      { key: "name", label: "Nom" },
      { key: "quantity_on_hand", label: "Qté en stock" },
      { key: "unit_cost", label: "Coût unitaire" },
      { key: "updated_at", label: "Mis à jour" },
      { key: "created_at", label: "Créé le" },
    ],
    defaultSort: { key: "name", direction: "asc" },
    filters: [createdAtFilter],
    columns: [
      { label: "Nom", sortKey: "name", render: (r) => orDash(r.name) },
      { label: "N° pièce", render: (r) => orDash(r.part_number) },
      { label: "Qté en stock", sortKey: "quantity_on_hand", render: (r) => orDash(r.quantity_on_hand), align: "right" },
      { label: "Seuil bas", render: (r) => orDash(r.low_stock_threshold), align: "right" },
      { label: "Coût unitaire", sortKey: "unit_cost", render: (r) => fmtMoney(r.unit_cost as number), align: "right" },
      { label: "Mis à jour", sortKey: "updated_at", render: (r) => fmtDate(r.updated_at) },
    ],
  },
  {
    key: "invoices",
    label: "Factures",
    table: "invoices",
    select: "id, invoice_number, status, grand_total, issued_at, due_at, paid_at, created_at",
    searchColumns: ["invoice_number"],
    sortColumns: [
      { key: "invoice_number", label: "N° facture" },
      { key: "status", label: "Statut" },
      { key: "grand_total", label: "Total" },
      { key: "due_at", label: "Échéance" },
      { key: "created_at", label: "Créé le" },
    ],
    defaultSort: { key: "created_at", direction: "desc" },
    filters: [
      {
        key: "status",
        label: "Statut",
        kind: "enum",
        options: (["draft", "sent", "paid", "overdue"] as InvoiceStatus[]).map((s) => ({
          value: s,
          label: invoiceStatusLabels[s],
        })),
      },
      createdAtFilter,
    ],
    columns: [
      { label: "N° facture", sortKey: "invoice_number", render: (r) => orDash(r.invoice_number) },
      { label: "Statut", sortKey: "status", render: (r) => <InvoiceStatusBadge status={r.status as InvoiceStatus} /> },
      { label: "Total", sortKey: "grand_total", render: (r) => fmtMoney(r.grand_total as number), align: "right" },
      { label: "Émise le", render: (r) => fmtDate(r.issued_at) },
      { label: "Échéance", sortKey: "due_at", render: (r) => fmtDate(r.due_at) },
      { label: "Payée le", render: (r) => fmtDate(r.paid_at) },
    ],
  },
  {
    key: "technicians",
    label: "Techniciens",
    table: "technicians",
    select: "id, full_name, email, phone, active, created_at",
    searchColumns: ["full_name", "email", "phone"],
    sortColumns: [
      { key: "full_name", label: "Nom" },
      { key: "created_at", label: "Créé le" },
    ],
    defaultSort: { key: "full_name", direction: "asc" },
    filters: [{ key: "active", label: "Actif", kind: "boolean" }, createdAtFilter],
    columns: [
      { label: "Nom", sortKey: "full_name", render: (r) => orDash(r.full_name) },
      { label: "Courriel", render: (r) => orDash(r.email) },
      { label: "Téléphone", render: (r) => orDash(r.phone) },
      { label: "Actif", render: (r) => boolLabel(r.active) },
      { label: "Créé le", sortKey: "created_at", render: (r) => fmtDate(r.created_at) },
    ],
  },
  {
    key: "vehicle_maintenance_schedules",
    label: "Entretiens planifiés",
    table: "vehicle_maintenance_schedules",
    select:
      "id, active, last_done_at, last_done_mileage, next_due_override, created_at, vehicles(unit_number, make, model), maintenance_templates(name), inspection_categories(name)",
    searchColumns: [],
    sortColumns: [
      { key: "last_done_at", label: "Dernier fait le" },
      { key: "created_at", label: "Créé le" },
    ],
    defaultSort: { key: "created_at", direction: "desc" },
    filters: [{ key: "active", label: "Actif", kind: "boolean" }, createdAtFilter],
    columns: [
      { label: "Véhicule", render: (r) => vehicleLabel(r) },
      {
        label: "Source",
        render: (r) =>
          orDash(
            (r.maintenance_templates as Embed)?.name ?? (r.inspection_categories as Embed)?.name ?? null,
          ),
      },
      { label: "Dernier fait le", sortKey: "last_done_at", render: (r) => fmtDate(r.last_done_at) },
      { label: "Dernier km", render: (r) => orDash(r.last_done_mileage), align: "right" },
      { label: "Échéance forcée", render: (r) => fmtDate(r.next_due_override) },
      { label: "Actif", render: (r) => boolLabel(r.active) },
    ],
  },
];

export type FetchOptions = {
  page: number;
  sort: string;
  dir: "asc" | "desc";
  q: string;
  filters: Record<string, string>;
};

export async function fetchEntityRows(entity: EntityDef, tenantId: string, opts: FetchOptions) {
  const supabase = await getSupabaseClient();
  const from = (opts.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from(entity.table).select(entity.select, { count: "exact" }).eq("tenant_id", tenantId);

  const safeQ = escapeIlikeTerm(opts.q);
  if (safeQ && entity.searchColumns.length > 0) {
    query = query.or(entity.searchColumns.map((c) => `${c}.ilike.%${safeQ}%`).join(","));
  }

  for (const filter of entity.filters) {
    if (filter.kind === "date") {
      const from_ = opts.filters[`${filter.key}_from`];
      const to_ = opts.filters[`${filter.key}_to`];
      if (from_) query = query.gte(filter.key, from_);
      if (to_) query = query.lte(filter.key, to_);
    } else {
      const raw = opts.filters[filter.key];
      if (raw) {
        query = filter.kind === "boolean" ? query.eq(filter.key, raw === "true") : query.eq(filter.key, raw);
      }
    }
  }

  const sortKey = entity.sortColumns.some((s) => s.key === opts.sort) ? opts.sort : entity.defaultSort.key;
  query = query.order(sortKey, { ascending: opts.dir === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as Record<string, unknown>[], count: count ?? 0, pageSize: PAGE_SIZE };
}
