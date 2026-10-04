import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteVehicle, updateVehicle } from "../actions";
import { applyMaintenanceTemplate, deactivateMaintenanceSchedule } from "../../maintenance/actions";
import { MaintenanceStatusBadge, maintenanceStatusFrom } from "../../maintenance/MaintenanceStatusBadge";
import { ConfirmSubmitButton } from "../../components/ConfirmSubmitButton";
import { SubmitButton } from "../../components/SubmitButton";
import { TrashIcon } from "../../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  cardClass,
  pageSubtextClass,
  requiredMarkClass,
  dangerButtonClass,
  iconButtonDangerClass,
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

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/vehicles");

  const supabase = await getSupabaseClient();
  const [{ data: vehicle }, { data: customers }, { data: templates }, { data: statusRows }, { data: inspectionCategories }] =
    await Promise.all([
      supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("maintenance_templates").select("id, name").order("name"),
      supabase.from("vehicle_maintenance_status").select("*").eq("vehicle_id", id),
      // Not filtered to active only — a vehicle already assigned to a
      // since-deactivated category must still show it selected, rather
      // than silently appearing unassigned (which would unassign it on
      // the next save).
      supabase.from("inspection_categories").select("id, name, active").order("name"),
    ]);

  if (!vehicle) notFound();

  const appliedTemplateIds = new Set((statusRows ?? []).map((r) => r.template_id));
  const availableTemplates = (templates ?? []).filter((t) => !appliedTemplateIds.has(t.id));
  const currentMileage = statusRows?.[0]?.current_mileage ?? null;

  const updateWithId = updateVehicle.bind(null, id);
  const applyTemplateWithId = applyMaintenanceTemplate.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-lg flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Modifier le véhicule</h1>
          <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
        </div>
        <form action={updateWithId} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="customer_id">
            Client<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <select className={inputClass} id="customer_id" name="customer_id" defaultValue={vehicle.customer_id} required>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="unit_number">Numéro d&apos;unité</label>
          <input className={inputClass} id="unit_number" name="unit_number" defaultValue={vehicle.unit_number ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="make">Marque</label>
            <input className={inputClass} id="make" name="make" defaultValue={vehicle.make ?? ""} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="model">Modèle</label>
            <input className={inputClass} id="model" name="model" defaultValue={vehicle.model ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="year">Année</label>
            <input className={inputClass} id="year" name="year" type="number" defaultValue={vehicle.year ?? ""} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="mileage">Kilométrage</label>
            <input className={inputClass} id="mileage" name="mileage" type="number" defaultValue={vehicle.mileage ?? ""} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="vin">NIV (numéro d&apos;identification du véhicule)</label>
          <input className={inputClass} id="vin" name="vin" defaultValue={vehicle.vin ?? ""} placeholder="1FDXE4FS0KDC12345" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="license_plate">Plaque d&apos;immatriculation</label>
          <input className={inputClass} id="license_plate" name="license_plate" defaultValue={vehicle.license_plate ?? ""} placeholder="AB12345" />
        </div>
        {inspectionCategories && inspectionCategories.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="inspection_category_id">Catégorie d&apos;inspection</label>
            <select
              className={inputClass}
              id="inspection_category_id"
              name="inspection_category_id"
              defaultValue={vehicle.inspection_category_id ?? ""}
            >
              <option value="">Non assignée</option>
              {inspectionCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (désactivée)"}</option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={vehicle.active} />
          Actif
        </label>
        <div className="flex gap-3">
          <SubmitButton>Enregistrer les modifications</SubmitButton>
          <Link href="/vehicles" className={secondaryButtonClass}>Annuler</Link>
        </div>
        </form>
        <form action={deleteVehicle.bind(null, id)}>
          <ConfirmSubmitButton
            confirmMessage={`Supprimer le véhicule « ${vehicle.unit_number ?? ([vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.id)} » ? Cette action est irréversible.`}
            className={`${dangerButtonClass} flex items-center gap-2`}
            pendingLabel={
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            }
          >
            <TrashIcon className="h-4 w-4" />
            Supprimer le véhicule
          </ConfirmSubmitButton>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Entretien planifié</h2>
          {currentMileage != null && (
            <p className={pageSubtextClass}>Kilométrage actuel connu : {currentMileage} km</p>
          )}
        </div>

        <div role="table" aria-label="Entretien planifié" className={rowTableWrapperClass}>
          <div role="rowgroup">
            <div
              role="row"
              style={{ gridTemplateColumns: "minmax(160px,1.8fr) minmax(140px,1.3fr) minmax(140px,1.3fr) 130px 40px" }}
              className={rowTableHeaderRowClass}
            >
              <div role="columnheader" className={rowTableHeaderCellClass}>Modèle</div>
              <div role="columnheader" className={rowTableHeaderCellClass}>Dernier entretien</div>
              <div role="columnheader" className={rowTableHeaderCellClass}>Prochain entretien</div>
              <div role="columnheader" className={rowTableHeaderCellClass}>Statut</div>
              <div role="columnheader" className={rowTableHeaderCellClass} />
            </div>
          </div>
          <div role="rowgroup" className={rowTableBodyClass}>
            {statusRows?.map((row) => {
              if (!row.schedule_id) return null;
              const status = maintenanceStatusFrom(row.is_due ?? false, row.is_due_soon ?? false);
              return (
                <div
                  key={row.schedule_id}
                  role="row"
                  style={{ gridTemplateColumns: "minmax(160px,1.8fr) minmax(140px,1.3fr) minmax(140px,1.3fr) 130px 40px" }}
                  className={`${rowCardClass} ${rowCardBgClass}`}
                >
                  <div role="cell" className="text-app-fg dark:text-brand-fg">
                    {row.template_name}
                    {row.inspection_category_id && (
                      <span className="ml-2 inline-block rounded-full bg-app-border-soft px-2 py-0.5 text-xs font-medium text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted">
                        Inspection
                      </span>
                    )}
                  </div>
                  <div role="cell" className={rowCardCellClass}>
                    {row.last_done_mileage != null ? `${row.last_done_mileage} km` : "—"}
                    {row.last_done_at ? ` · ${new Date(row.last_done_at).toLocaleDateString()}` : ""}
                  </div>
                  <div role="cell" className={rowCardCellClass}>
                    {row.next_due_mileage != null ? `${row.next_due_mileage} km` : "—"}
                    {row.next_due_date ? ` · ${new Date(row.next_due_date).toLocaleDateString()}` : ""}
                  </div>
                  <div role="cell">
                    <MaintenanceStatusBadge status={status} />
                  </div>
                  <div role="cell" className="justify-self-end">
                    <form action={deactivateMaintenanceSchedule.bind(null, row.schedule_id, id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Désactiver l'entretien « ${row.template_name} » pour ce véhicule ?`}
                        className={iconButtonDangerClass}
                        ariaLabel={`Désactiver l'entretien ${row.template_name}`}
                        pendingLabel={
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        }
                      >
                        <TrashIcon className="h-4 w-4" />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {statusRows?.length === 0 && (
          <p className={rowTableEmptyClass}>Aucun entretien planifié pour ce véhicule.</p>
        )}

        {availableTemplates.length > 0 && (
          <form
            action={applyTemplateWithId}
            className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:flex-wrap ${cardClass}`}
          >
            <div className="flex flex-1 flex-col gap-1 sm:min-w-[200px]">
              <label className={labelClass} htmlFor="template_id">Appliquer un modèle</label>
              <select className={inputClass} id="template_id" name="template_id" required defaultValue="">
                <option value="" disabled>Sélectionner un modèle…</option>
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:w-40">
              <label className={labelClass} htmlFor="last_done_mileage">Dernier entretien (km)</label>
              <input className={inputClass} id="last_done_mileage" name="last_done_mileage" type="number" min="0" step="1" placeholder="Optionnel" />
            </div>
            <div className="flex flex-col gap-1 sm:w-40">
              <label className={labelClass} htmlFor="last_done_at">Dernier entretien (date)</label>
              <input className={inputClass} id="last_done_at" name="last_done_at" type="date" />
            </div>
            <SubmitButton>Appliquer</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
