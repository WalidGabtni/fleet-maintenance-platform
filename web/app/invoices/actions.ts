"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { isAdminTier } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { friendlyError } from "@/lib/errors";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) {
    throw new Error("Seuls les administrateurs peuvent gérer les factures.");
  }
}

export async function generateInvoice(workOrderId: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("work_order_id", workOrderId)
    .maybeSingle();
  if (existing) {
    redirect(`/invoices/${existing.id}`);
  }

  const { data: workOrder, error: woError } = await supabase
    .from("work_orders")
    .select("status, labor_hours")
    .eq("id", workOrderId)
    .maybeSingle();
  if (woError) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(woError))}`);
  if (!workOrder) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent("Bon de travail introuvable.")}`);
  if (workOrder.status !== "completed") {
    redirect(
      `/work-orders/${workOrderId}?error=${encodeURIComponent("Seul un bon de travail terminé peut être facturé.")}`,
    );
  }

  const { data: settings, error: settingsError } = await supabase
    .from("shop_settings")
    .select("hourly_labor_rate, tax_rate")
    .single();
  if (settingsError) {
    redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(settingsError))}`);
  }

  const { data: woParts, error: partsError } = await supabase
    .from("work_order_parts")
    .select("quantity_used, unit_price_at_time")
    .eq("work_order_id", workOrderId);
  if (partsError) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(partsError))}`);

  const laborHours = workOrder.labor_hours ?? 0;
  const laborRate = settings.hourly_labor_rate;
  const laborTotal = round2(laborHours * laborRate);
  const partsTotal = round2(
    (woParts ?? []).reduce((sum, p) => sum + p.quantity_used * p.unit_price_at_time, 0),
  );
  const taxRate = settings.tax_rate;
  const taxTotal = round2((laborTotal + partsTotal) * taxRate);
  const grandTotal = round2(laborTotal + partsTotal + taxTotal);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      work_order_id: workOrderId,
      labor_hours: laborHours,
      labor_rate: laborRate,
      labor_total: laborTotal,
      parts_total: partsTotal,
      tax_rate: taxRate,
      tax_total: taxTotal,
      grand_total: grandTotal,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: existingRetry } = await supabase
        .from("invoices")
        .select("id")
        .eq("work_order_id", workOrderId)
        .maybeSingle();
      if (existingRetry) redirect(`/invoices/${existingRetry.id}`);
    }
    redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(error))}`);
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function markInvoiceSent(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();

  const dueAtInput = String(formData.get("due_at") ?? "").trim();

  const { data: existing } = await supabase.from("invoices").select("invoice_number, status").eq("id", id).maybeSingle();

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      due_at: dueAtInput ? new Date(dueAtInput).toISOString() : null,
    })
    .eq("id", id);
  if (error) redirect(`/invoices/${id}?error=${encodeURIComponent(friendlyError(error))}`);

  if (existing && existing.status !== "sent") {
    await logActivity({
      action: "status_changed",
      entityType: "invoice",
      entityId: id,
      description: `Facture ${existing.invoice_number} marquée comme envoyée`,
      metadata: { from: existing.status, to: "sent" },
    });
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function markInvoicePaid(id: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();

  const { data: existing } = await supabase.from("invoices").select("invoice_number, status").eq("id", id).maybeSingle();

  const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
  if (error) redirect(`/invoices/${id}?error=${encodeURIComponent(friendlyError(error))}`);

  if (existing && existing.status !== "paid") {
    await logActivity({
      action: "status_changed",
      entityType: "invoice",
      entityId: id,
      description: `Facture ${existing.invoice_number} marquée comme payée`,
      metadata: { from: existing.status, to: "paid" },
    });
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

// Display-only conversion for the invoice detail page — never touches the
// stored invoice, which stays recorded in the shop's real currency. Free,
// no-key ECB-backed rates; cached for an hour so we're not hitting the
// external API on every page view.
export async function fetchExchangeRates(
  base: CurrencyCode,
): Promise<{ rates: Record<CurrencyCode, number> } | { error: string }> {
  try {
    const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== base).join(",");
    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols}`,
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data = (await response.json()) as { rates: Record<string, number> };
    return { rates: { ...data.rates, [base]: 1 } as Record<CurrencyCode, number> };
  } catch {
    return { error: "Impossible de récupérer le taux de change. Réessayez plus tard." };
  }
}
