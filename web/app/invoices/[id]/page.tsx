import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { markInvoicePaid, markInvoiceSent } from "../actions";
import { InvoiceStatusBadge } from "../InvoiceStatusBadge";
import { DownloadInvoiceButton } from "../DownloadInvoiceButton";
import { InvoiceCurrencyTable } from "../InvoiceCurrencyTable";
import type { InvoiceStatus } from "@/lib/types";
import { isCurrencyCode } from "@/lib/currency";
import { SubmitButton } from "../../components/SubmitButton";
import { isAdminTier } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, secondaryButtonClass, cardClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireFeature("invoicing");
  const supabase = await getSupabaseClient();
  const profile = await getCurrentProfile();
  const isAdmin = isAdminTier(profile?.role);

  const [{ data: invoice }, { data: shopSettings }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "*, work_orders(id, reported_issue, vehicles(unit_number, make, model, vin, year, customers(name, phone, email)))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("shop_settings")
      .select("shop_name, shop_address, shop_phone, shop_email, currency")
      .maybeSingle(),
  ]);

  if (!invoice) notFound();

  const { data: workOrderParts } = await supabase
    .from("work_order_parts")
    .select("*, parts(name, part_number)")
    .eq("work_order_id", invoice.work_order_id)
    .order("created_at", { ascending: false });

  const workOrder = invoice.work_orders as {
    id: string;
    reported_issue: string;
    vehicles: {
      unit_number: string | null;
      make: string | null;
      model: string | null;
      vin: string | null;
      year: number | null;
      customers: { name: string; phone: string | null; email: string | null } | null;
    } | null;
  } | null;
  const vehicle = workOrder?.vehicles;
  const vehicleLabel = vehicle
    ? (vehicle.unit_number ?? [vehicle.make, vehicle.model].filter(Boolean).join(" ")) || "—"
    : "—";

  const isOverdue =
    invoice.status === "sent" && invoice.due_at != null && new Date(invoice.due_at).getTime() < Date.now();
  const displayStatus: InvoiceStatus = isOverdue ? "overdue" : invoice.status;
  const rawCurrency = shopSettings?.currency ?? "CAD";
  const homeCurrency = isCurrencyCode(rawCurrency) ? rawCurrency : "CAD";

  const markSentWithId = markInvoiceSent.bind(null, id);
  const markPaidWithId = markInvoicePaid.bind(null, id);

  const pdfParts = (workOrderParts ?? []).map((wop) => {
    const wopPart = wop.parts as { name: string; part_number: string | null } | null;
    return {
      name: wopPart?.name ?? "—",
      part_number: wopPart?.part_number ?? null,
      quantity_used: wop.quantity_used,
      unit_price_at_time: wop.unit_price_at_time,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link href="/invoices" className="text-sm text-app-fg-muted hover:underline dark:text-brand-fg-muted">
          ← Retour aux factures
        </Link>
        <InvoiceStatusBadge status={displayStatus} />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
        <p className="text-sm text-app-fg-muted dark:text-brand-fg-muted">
          {vehicleLabel} — {vehicle?.customers?.name ?? "—"}
          {workOrder && (
            <>
              {" · "}
              <Link href={`/work-orders/${workOrder.id}`} className="hover:underline">
                Voir le bon de travail
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="flex flex-col gap-2 text-sm md:col-span-2">
          <InvoiceCurrencyTable
            homeCurrency={homeCurrency}
            laborHours={invoice.labor_hours}
            laborRate={invoice.labor_rate}
            laborTotal={invoice.labor_total}
            parts={(workOrderParts ?? []).map((wop) => {
              const wopPart = wop.parts as { name: string; part_number: string | null } | null;
              return {
                id: wop.id,
                name: wopPart?.name ?? "—",
                part_number: wopPart?.part_number ?? null,
                quantity: wop.quantity_used,
                unitPrice: wop.unit_price_at_time,
              };
            })}
            partsTotal={invoice.parts_total}
            taxRatePercent={invoice.tax_rate * 100}
            taxTotal={invoice.tax_total}
            grandTotal={invoice.grand_total}
          />
        </div>

        <div className="flex flex-col gap-4">
          <DownloadInvoiceButton
            shop={{
              shop_name: shopSettings?.shop_name ?? null,
              shop_address: shopSettings?.shop_address ?? null,
              shop_phone: shopSettings?.shop_phone ?? null,
              shop_email: shopSettings?.shop_email ?? null,
            }}
            invoice={invoice}
            customer={{
              name: vehicle?.customers?.name ?? "—",
              phone: vehicle?.customers?.phone ?? null,
              email: vehicle?.customers?.email ?? null,
            }}
            vehicle={{
              unit_number: vehicle?.unit_number ?? null,
              vin: vehicle?.vin ?? null,
              make: vehicle?.make ?? null,
              model: vehicle?.model ?? null,
              year: vehicle?.year ?? null,
            }}
            parts={pdfParts}
          />

          <div className={`p-4 text-sm ${cardClass}`}>
            <dl className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <dt className="text-app-fg-muted dark:text-brand-fg-muted">Émise le</dt>
                <dd className="text-app-fg dark:text-brand-fg">
                  {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-app-fg-muted dark:text-brand-fg-muted">Échéance</dt>
                <dd className="text-app-fg dark:text-brand-fg">
                  {invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-app-fg-muted dark:text-brand-fg-muted">Payée le</dt>
                <dd className="text-app-fg dark:text-brand-fg">
                  {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {isAdmin && invoice.status !== "paid" && (
            <div className="flex flex-col gap-3">
              {invoice.status === "draft" && (
                <form
                  action={markSentWithId}
                  className={`flex flex-col gap-2 p-4 ${cardClass}`}
                >
                  <label className={labelClass} htmlFor="due_at">Échéance (optionnel)</label>
                  <input className={inputClass} id="due_at" name="due_at" type="date" />
                  <SubmitButton pendingLabel="Envoi…">Marquer comme envoyée</SubmitButton>
                </form>
              )}
              <form action={markPaidWithId}>
                <SubmitButton className={`${secondaryButtonClass} w-full`} pendingLabel="Mise à jour…">
                  Marquer comme payée
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
