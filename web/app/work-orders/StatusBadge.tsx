import type { WorkOrderStatus } from "@/lib/types";

const styles: Record<WorkOrderStatus, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  waiting_on_parts: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  cancelled: "bg-app-border-soft text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted",
};

export const statusLabels: Record<WorkOrderStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_on_parts: "En attente de pièces",
  completed: "Terminé",
  cancelled: "Annulé",
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
