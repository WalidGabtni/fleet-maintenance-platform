import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteVehicle } from "./actions";
import { ConfirmSubmitButton } from "../components/ConfirmSubmitButton";
import { PlusIcon, TrashIcon } from "../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import {
  buttonClass,
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

export default async function VehiclesPage() {
  const supabase = await getSupabaseClient();
  const [{ data: vehicles, error }, profile] = await Promise.all([
    supabase.from("vehicles").select("*, customers(name)").order("created_at", { ascending: false }),
    getCurrentProfile(),
  ]);
  const isAdmin = canManageFleetOps(profile?.role);

  if (error) throw new Error(error.message);

  const gridCols = isAdmin
    ? "minmax(100px,1fr) minmax(140px,1.5fr) 80px minmax(120px,1.2fr) 100px 70px 40px"
    : "minmax(100px,1fr) minmax(140px,1.5fr) 80px minmax(120px,1.2fr) 100px 70px";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Véhicules</h1>
        {isAdmin && (
          <Link href="/vehicles/new" className={`${buttonClass} flex items-center gap-2`}>
            <PlusIcon className="h-4 w-4" />
            Nouveau véhicule
          </Link>
        )}
      </div>

      <div role="table" aria-label="Véhicules" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Unité</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Marque / Modèle</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Année</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Client</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Plaque</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Actif</div>
            {isAdmin && <div role="columnheader" className={rowTableHeaderCellClass} />}
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {vehicles?.map((vehicle) => (
            <div key={vehicle.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
              <div role="cell">
                {isAdmin ? (
                  <Link
                    href={`/vehicles/${vehicle.id}`}
                    className="font-medium text-app-fg hover:underline dark:text-brand-fg"
                  >
                    {vehicle.unit_number ?? "—"}
                  </Link>
                ) : (
                  <span className="font-medium text-app-fg dark:text-brand-fg">{vehicle.unit_number ?? "—"}</span>
                )}
              </div>
              <div role="cell" className={rowCardCellClass}>
                {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
              </div>
              <div role="cell" className={rowCardCellClass}>{vehicle.year ?? "—"}</div>
              <div role="cell" className={rowCardCellClass}>
                {(vehicle.customers as { name: string } | null)?.name ?? "—"}
              </div>
              <div role="cell" className={rowCardCellClass}>{vehicle.license_plate ?? "—"}</div>
              <div role="cell" className={rowCardCellClass}>{vehicle.active ? "Oui" : "Non"}</div>
              {isAdmin && (
                <div role="cell" className="justify-self-end">
                  <form action={deleteVehicle.bind(null, vehicle.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Supprimer le véhicule « ${vehicle.unit_number ?? ([vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.id)} » ? Cette action est irréversible.`}
                      className={iconButtonDangerClass}
                      ariaLabel={`Supprimer ${vehicle.unit_number ?? "le véhicule"}`}
                      pendingLabel={
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                    </ConfirmSubmitButton>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {vehicles?.length === 0 && (
        <p className={rowTableEmptyClass}>
          Aucun véhicule pour le moment.{" "}
          {isAdmin && (
            <Link href="/vehicles/new" className="text-accent-600 underline dark:text-accent-400">
              Ajoutez votre premier véhicule.
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
