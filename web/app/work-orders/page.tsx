import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { StatusBadge } from "./StatusBadge";
import { PlusIcon } from "../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import { buttonClass, pageSubtextClass } from "@/lib/ui";
import type { WorkOrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const BOARD_COLUMNS: { status: WorkOrderStatus; label: string; accent: string }[] = [
  { status: "open", label: "Ouvert", accent: "border-t-blue-400" },
  { status: "in_progress", label: "En cours", accent: "border-t-amber-400" },
  { status: "waiting_on_parts", label: "En attente de pièces", accent: "border-t-purple-400" },
  // Closed work used to vanish from this page entirely once completed, leaving
  // no way back to it. This column keeps the most recent ones reachable; the
  // full history lives in Vue complète des données.
  { status: "completed", label: "Terminés (récents)", accent: "border-t-green-400" },
];

const RECENT_COMPLETED_LIMIT = 15;

type BoardVehicle = {
  unit_number: string | null;
  make: string | null;
  model: string | null;
  customers: { name: string } | null;
} | null;

type BoardTechnician = { full_name: string } | null;

export default async function WorkOrdersPage() {
  const supabase = await getSupabaseClient();
  const [{ data: workOrders, error }, profile] = await Promise.all([
    supabase
      .from("work_orders")
      .select("*, vehicles(unit_number, make, model, customers(name)), technicians(full_name)")
      .in("status", BOARD_COLUMNS.map((c) => c.status))
      .order("updated_at", { ascending: false }),
    getCurrentProfile(),
  ]);
  const isAdmin = canManageFleetOps(profile?.role);

  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bons de travail</h1>
          <p className={pageSubtextClass}>Travaux en cours et terminés récemment, regroupés par statut</p>
        </div>
        {isAdmin && (
          <Link href="/work-orders/new" className={`${buttonClass} flex items-center gap-2`}>
            <PlusIcon className="h-4 w-4" />
            Nouveau bon de travail
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
          const matching = workOrders?.filter((wo) => wo.status === column.status) ?? [];
          // Active columns show everything; completed work is capped so the
          // board doesn't grow without bound as jobs pile up over the years.
          const columnOrders =
            column.status === "completed" ? matching.slice(0, RECENT_COMPLETED_LIMIT) : matching;

          return (
            <div
              key={column.status}
              className={`flex flex-col gap-3 rounded-lg border-t-4 bg-app-surface-sunk p-3 dark:bg-brand-bg-inset ${column.accent}`}
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-app-fg-muted dark:text-brand-fg-muted">{column.label}</h2>
                <span className="rounded-full bg-app-surface px-2 py-0.5 text-xs font-medium text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted">
                  {columnOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {columnOrders.map((wo) => {
                  const vehicle = wo.vehicles as BoardVehicle;
                  const technician = wo.technicians as BoardTechnician;
                  const vehicleLabel =
                    vehicle?.unit_number ?? [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ?? "—";

                  return (
                    <Link
                      key={wo.id}
                      href={`/work-orders/${wo.id}`}
                      // Cards use brand-bg-raised, lighter than the brand-bg column they sit
                      // on, so they read as "raised" — deliberately not the usual card rule.
                      className="flex flex-col gap-2 rounded-lg border border-app-border bg-app-surface p-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-app-fg-faint hover:shadow-md active:translate-y-0 active:shadow-sm dark:border-brand-border dark:bg-brand-bg-raised dark:hover:border-brand-fg-faint"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-app-fg dark:text-brand-fg">{vehicleLabel}</span>
                        <StatusBadge status={wo.status} />
                      </div>
                      <p className="text-app-fg-muted dark:text-brand-fg-muted">{vehicle?.customers?.name ?? "—"}</p>
                      <p className="line-clamp-2 text-app-fg-muted dark:text-brand-fg-muted">{wo.reported_issue}</p>
                      <div className="flex items-center justify-between text-xs text-app-fg-faint dark:text-brand-fg-faint">
                        <span>{technician?.full_name ?? "Non assigné"}</span>
                        <span>{new Date(wo.updated_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  );
                })}
                {columnOrders.length === 0 && (
                  <p className="rounded-lg border border-dashed border-app-border p-4 text-center text-xs text-app-fg-faint dark:border-brand-border dark:text-brand-fg-faint">
                    Rien ici
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
