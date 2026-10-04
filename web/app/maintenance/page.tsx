import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { createWorkOrderFromSchedule } from "./actions";
import { MaintenanceStatusBadge, maintenanceStatusFrom } from "./MaintenanceStatusBadge";
import { SubmitButton } from "../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import {
  secondaryButtonClass,
  pageSubtextClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowTableEmptyClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  await requireFeature("maintenance_scheduling");
  const profile = await getCurrentProfile();
  const isAdmin = canManageFleetOps(profile?.role);

  const supabase = await getSupabaseClient();
  const { data: statusRows, error } = await supabase.from("vehicle_maintenance_status").select("*");
  if (error) throw new Error(error.message);

  const dueRows = (statusRows ?? []).filter((r) => r.is_due || r.is_due_soon);
  const vehicleIds = [...new Set(dueRows.map((r) => r.vehicle_id).filter((v): v is string => !!v))];

  const { data: vehicles } =
    vehicleIds.length > 0
      ? await supabase
          .from("vehicles")
          .select("id, unit_number, make, model, customers(name)")
          .in("id", vehicleIds)
      : { data: [] };

  const vehiclesById = new Map((vehicles ?? []).map((v) => [v.id, v]));

  const now = Date.now();
  const rows = dueRows
    .map((r) => {
      const mileageUrgency =
        r.current_mileage != null && r.next_due_mileage != null
          ? (r.current_mileage - r.next_due_mileage) / 500
          : -Infinity;
      const dateUrgency =
        r.next_due_date != null ? (now - new Date(r.next_due_date).getTime()) / (1000 * 60 * 60 * 24 * 14) : -Infinity;
      const urgency = Math.max(mileageUrgency, dateUrgency);
      const vehicle = r.vehicle_id ? vehiclesById.get(r.vehicle_id) : undefined;
      return { ...r, urgency, vehicle };
    })
    .sort((a, b) => b.urgency - a.urgency);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Entretien à venir</h1>
          <p className={pageSubtextClass}>Entretiens dus ou bientôt dus sur l&apos;ensemble du parc</p>
        </div>
        <div className="flex gap-3">
          <Link href="/maintenance/calendar" className={secondaryButtonClass}>Calendrier d&apos;inspection</Link>
          {isAdmin && (
            <>
              <Link href="/maintenance/templates" className={secondaryButtonClass}>Modèles d&apos;entretien</Link>
              <Link href="/maintenance/inspection-categories" className={secondaryButtonClass}>Catégories d&apos;inspection</Link>
            </>
          )}
        </div>
      </div>

      {(() => {
        const gridCols = isAdmin
          ? "minmax(120px,1.2fr) minmax(120px,1.2fr) minmax(140px,1.5fr) minmax(140px,1.3fr) 140px 190px"
          : "minmax(120px,1.2fr) minmax(120px,1.2fr) minmax(140px,1.5fr) minmax(140px,1.3fr) 140px";
        const gridStyle = { gridTemplateColumns: gridCols };
        return (
          <div role="table" aria-label="Entretien à venir" className={rowTableWrapperClass}>
            <div role="rowgroup">
              <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
                <div role="columnheader" className={rowTableHeaderCellClass}>Véhicule</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Client</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Modèle d&apos;entretien</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Prochain entretien</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Statut</div>
                {isAdmin && <div role="columnheader" className={rowTableHeaderCellClass} />}
              </div>
            </div>
            <div role="rowgroup" className={rowTableBodyClass}>
              {rows.map((row) => {
                const status = maintenanceStatusFrom(row.is_due ?? false, row.is_due_soon ?? false);
                const vehicleLabel = row.vehicle
                  ? row.vehicle.unit_number ?? ([row.vehicle.make, row.vehicle.model].filter(Boolean).join(" ") || "—")
                  : "—";
                const customerName = (row.vehicle?.customers as { name: string } | null)?.name ?? "—";

                return (
                  <div key={row.schedule_id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
                    <div role="cell">
                      {row.vehicle_id ? (
                        <Link href={`/vehicles/${row.vehicle_id}`} className="font-medium text-app-fg hover:underline dark:text-brand-fg">
                          {vehicleLabel}
                        </Link>
                      ) : (
                        vehicleLabel
                      )}
                    </div>
                    <div role="cell" className={rowCardCellClass}>{customerName}</div>
                    <div role="cell" className={rowCardCellClass}>
                      {row.template_name}
                      {row.inspection_category_id && (
                        <span className="ml-2 inline-block rounded-full bg-app-border-soft px-2 py-0.5 text-xs font-medium text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted">
                          Inspection
                        </span>
                      )}
                    </div>
                    <div role="cell" className={rowCardCellClass}>
                      {row.next_due_mileage != null ? `${row.next_due_mileage} km` : "—"}
                      {row.next_due_date ? ` · ${new Date(row.next_due_date).toLocaleDateString()}` : ""}
                    </div>
                    <div role="cell">
                      <MaintenanceStatusBadge status={status} />
                    </div>
                    {isAdmin && (
                      <div role="cell" className="justify-self-end">
                        {row.schedule_id && (
                          <form action={createWorkOrderFromSchedule.bind(null, row.schedule_id)}>
                            <SubmitButton>Créer un bon de travail</SubmitButton>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {rows.length === 0 && <p className={rowTableEmptyClass}>Aucun entretien dû ou bientôt dû. Tout est à jour.</p>}
    </div>
  );
}
