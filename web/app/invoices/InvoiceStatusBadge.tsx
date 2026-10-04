import type { InvoiceStatus } from "@/lib/types";

const styles: Record<InvoiceStatus, string> = {
  draft: "bg-app-border-soft text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {invoiceStatusLabels[status]}
    </span>
  );
}
