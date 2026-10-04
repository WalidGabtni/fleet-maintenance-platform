import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { requireFeature } from "@/lib/features";
import type { InvoiceStatus } from "@/lib/types";
import {
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardBgDangerClass,
  rowCardCellClass,
  rowTableEmptyClass,
  pageSubtextClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "draft", label: "Brouillons" },
  { value: "sent", label: "Envoyées" },
  { value: "paid", label: "Payées" },
  { value: "overdue", label: "En retard" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireFeature("invoicing");

  const { status: statusFilter } = await searchParams;
  const supabase = await getSupabaseClient();

  let query = supabase
    .from("invoices")
    .select("*, work_orders(vehicles(unit_number, make, model, customers(name)))")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "overdue") {
    query = query.eq("status", statusFilter as InvoiceStatus);
  }

  const { data: invoicesRaw, error } = await query;
  if (error) throw new Error(error.message);

  const now = Date.now();
  const invoices = (invoicesRaw ?? [])
    .map((inv) => ({
      ...inv,
      isOverdue: inv.status === "sent" && inv.due_at != null && new Date(inv.due_at).getTime() < now,
    }))
    .filter((inv) => (statusFilter === "overdue" ? inv.isOverdue : true));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Factures</h1>
        <p className={pageSubtextClass}>Suivi des factures générées à partir des bons de travail</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/invoices?status=${f.value}` : "/invoices"}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              (statusFilter ?? "") === f.value
                ? "bg-app-fg text-app-bg dark:bg-brand-fg dark:text-brand-bg"
                : "bg-app-surface-sunk text-app-fg-muted hover:bg-app-border-soft dark:bg-brand-bg-raised dark:text-brand-fg-muted dark:hover:bg-brand-bg-inset"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {(() => {
        const gridCols = "130px minmax(120px,1.3fr) minmax(120px,1.3fr) 120px 120px 100px";
        const gridStyle = { gridTemplateColumns: gridCols };
        return (
          <div role="table" aria-label="Factures" className={rowTableWrapperClass}>
            <div role="rowgroup">
              <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
                <div role="columnheader" className={rowTableHeaderCellClass}>N° facture</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Véhicule</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Client</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Statut</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Échéance</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Total</div>
              </div>
            </div>
            <div role="rowgroup" className={rowTableBodyClass}>
              {invoices.map((inv) => {
                const vehicle = inv.work_orders?.vehicles as {
                  unit_number: string | null;
                  make: string | null;
                  model: string | null;
                  customers: { name: string } | null;
                } | null;
                const vehicleLabel =
                  vehicle?.unit_number ?? [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ?? "—";

                return (
                  <div
                    key={inv.id}
                    role="row"
                    style={gridStyle}
                    className={`${rowCardClass} ${inv.isOverdue ? rowCardBgDangerClass : rowCardBgClass}`}
                  >
                    <div role="cell">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-app-fg hover:underline dark:text-brand-fg">
                        {inv.invoice_number}
                      </Link>
                    </div>
                    <div role="cell" className={rowCardCellClass}>{vehicleLabel}</div>
                    <div role="cell" className={rowCardCellClass}>{vehicle?.customers?.name ?? "—"}</div>
                    <div role="cell">
                      <InvoiceStatusBadge status={inv.isOverdue ? "overdue" : inv.status} />
                    </div>
                    <div role="cell" className={rowCardCellClass}>
                      {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "—"}
                    </div>
                    <div role="cell" className={rowCardCellClass}>{inv.grand_total.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {invoices.length === 0 && (
        <p className={rowTableEmptyClass}>
          Aucune facture pour le moment. Les factures sont générées depuis un{" "}
          <Link href="/work-orders" className="text-accent-600 underline dark:text-accent-400">
            bon de travail terminé
          </Link>
          .
        </p>
      )}
    </div>
  );
}
