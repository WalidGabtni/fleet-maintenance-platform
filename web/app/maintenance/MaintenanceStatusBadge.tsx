export type MaintenanceStatus = "overdue" | "due_soon" | "on_track";

const styles: Record<MaintenanceStatus, string> = {
  overdue: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  due_soon: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  on_track: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
};

const labels: Record<MaintenanceStatus, string> = {
  overdue: "En retard",
  due_soon: "Bientôt dû",
  on_track: "À jour",
};

export function maintenanceStatusFrom(isDue: boolean, isDueSoon: boolean): MaintenanceStatus {
  if (isDue) return "overdue";
  if (isDueSoon) return "due_soon";
  return "on_track";
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
