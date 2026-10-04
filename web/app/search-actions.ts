"use server";

import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { canManageParts } from "@/lib/permissions";
import { escapeIlikeTerm } from "@/lib/searchUtils";

const MIN_QUERY_LENGTH = 2;
const RESULTS_PER_ENTITY = 5;

export type GlobalSearchResultRow = { id: string; primary: string; secondary?: string; href: string };

export type GlobalSearchResults = {
  customers: GlobalSearchResultRow[];
  vehicles: GlobalSearchResultRow[];
  workOrders: GlobalSearchResultRow[];
  parts: GlobalSearchResultRow[];
  invoices: GlobalSearchResultRow[];
  technicians: GlobalSearchResultRow[];
};

export type GlobalSearchResponse = { results: GlobalSearchResults } | { error: string };

function emptyResults(): GlobalSearchResults {
  return { customers: [], vehicles: [], workOrders: [], parts: [], invoices: [], technicians: [] };
}

function orClause(columns: string[], term: string) {
  return columns.map((c) => `${c}.ilike.%${term}%`).join(",");
}

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseClient>>;

async function searchCustomers(supabase: SupabaseServerClient, tenantId: string, term: string) {
  const { data } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("tenant_id", tenantId)
    .or(orClause(["name", "email", "phone"], term))
    .limit(RESULTS_PER_ENTITY);
  return (data ?? []).map((c) => ({ id: c.id, primary: c.name, secondary: c.phone ?? undefined, href: `/customers/${c.id}` }));
}

async function searchVehicles(supabase: SupabaseServerClient, tenantId: string, term: string) {
  const { data } = await supabase
    .from("vehicles")
    .select("id, unit_number, make, model")
    .eq("tenant_id", tenantId)
    .or(orClause(["unit_number", "make", "model", "vin", "license_plate"], term))
    .limit(RESULTS_PER_ENTITY);
  return (data ?? []).map((v) => ({
    id: v.id,
    primary: v.unit_number || [v.make, v.model].filter(Boolean).join(" ") || "—",
    href: `/vehicles/${v.id}`,
  }));
}

async function searchWorkOrders(supabase: SupabaseServerClient, tenantId: string, term: string) {
  const { data } = await supabase
    .from("work_orders")
    .select("id, reported_issue")
    .eq("tenant_id", tenantId)
    .or(orClause(["reported_issue", "diagnosis", "work_performed"], term))
    .limit(RESULTS_PER_ENTITY);
  return (data ?? []).map((w) => ({ id: w.id, primary: w.reported_issue || "Bon de travail", href: `/work-orders/${w.id}` }));
}

async function searchParts(supabase: SupabaseServerClient, tenantId: string, term: string) {
  const { data } = await supabase
    .from("parts")
    .select("id, name, part_number")
    .eq("tenant_id", tenantId)
    .or(orClause(["name", "part_number"], term))
    .limit(RESULTS_PER_ENTITY);
  return (data ?? []).map((p) => ({ id: p.id, primary: p.name, secondary: p.part_number ?? undefined, href: `/parts/${p.id}` }));
}

async function searchInvoices(supabase: SupabaseServerClient, tenantId: string, term: string) {
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("tenant_id", tenantId)
    .or(orClause(["invoice_number"], term))
    .limit(RESULTS_PER_ENTITY);
  return (data ?? []).map((i) => ({ id: i.id, primary: i.invoice_number, href: `/invoices/${i.id}` }));
}

async function searchTechnicians(supabase: SupabaseServerClient, tenantId: string, term: string) {
  const { data } = await supabase
    .from("technicians")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .or(orClause(["full_name", "email", "phone"], term))
    .limit(RESULTS_PER_ENTITY);
  return (data ?? []).map((t) => ({ id: t.id, primary: t.full_name, href: `/technicians/${t.id}` }));
}

export async function globalSearch(term: string): Promise<GlobalSearchResponse> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Vous devez être connecté." };

  const trimmed = term.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return { results: emptyResults() };
  const safeTerm = escapeIlikeTerm(trimmed);
  if (!safeTerm) return { results: emptyResults() };

  const supabase = await getSupabaseClient();
  const { tenantId, role } = profile;

  // parts RLS has no role condition (any authenticated tenant member can
  // read the table) — this app-level check is the only thing hiding parts
  // from superviseur/technicien, matching the redirect on /parts itself.
  // Every other entity here has no app-level role gate on its own list page
  // either, so none is added here — RLS (genuinely tight for invoices) is
  // left as the real authority, same as those pages.
  const [customers, vehicles, workOrders, parts, invoices, technicians] = await Promise.all([
    searchCustomers(supabase, tenantId, safeTerm),
    searchVehicles(supabase, tenantId, safeTerm),
    searchWorkOrders(supabase, tenantId, safeTerm),
    canManageParts(role) ? searchParts(supabase, tenantId, safeTerm) : Promise.resolve([]),
    searchInvoices(supabase, tenantId, safeTerm),
    searchTechnicians(supabase, tenantId, safeTerm),
  ]);

  return { results: { customers, vehicles, workOrders, parts, invoices, technicians } };
}
