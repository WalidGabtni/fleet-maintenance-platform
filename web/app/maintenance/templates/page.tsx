import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteMaintenanceTemplate } from "./actions";
import { ConfirmSubmitButton } from "../../components/ConfirmSubmitButton";
import { PlusIcon, TrashIcon } from "../../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
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

export default async function MaintenanceTemplatesPage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/");
  await requireFeature("maintenance_scheduling");

  const supabase = await getSupabaseClient();
  const { data: templates, error } = await supabase.from("maintenance_templates").select("*").order("name");
  if (error) throw new Error(error.message);

  const gridCols = "minmax(140px,1.5fr) minmax(160px,2fr) 130px 130px 40px";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modèles d&apos;entretien</h1>
        <Link href="/maintenance/templates/new" className={`${buttonClass} flex items-center gap-2`}>
          <PlusIcon className="h-4 w-4" />
          Nouveau modèle
        </Link>
      </div>

      <div role="table" aria-label="Modèles d'entretien" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Description</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Intervalle (km)</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Intervalle (jours)</div>
            <div role="columnheader" className={rowTableHeaderCellClass} />
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {templates?.map((t) => (
            <div key={t.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
              <div role="cell">
                <Link
                  href={`/maintenance/templates/${t.id}`}
                  className="font-medium text-app-fg hover:underline dark:text-brand-fg"
                >
                  {t.name}
                </Link>
              </div>
              <div role="cell" className={rowCardCellClass}>{t.description ?? "—"}</div>
              <div role="cell" className={rowCardCellClass}>{t.interval_mileage ?? "—"}</div>
              <div role="cell" className={rowCardCellClass}>{t.interval_days ?? "—"}</div>
              <div role="cell" className="justify-self-end">
                <form action={deleteMaintenanceTemplate.bind(null, t.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Supprimer le modèle « ${t.name} » ? Cette action est irréversible.`}
                    className={iconButtonDangerClass}
                    ariaLabel={`Supprimer ${t.name}`}
                    pendingLabel={
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    }
                  >
                    <TrashIcon className="h-4 w-4" />
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
      {templates?.length === 0 && (
        <p className={rowTableEmptyClass}>
          Aucun modèle pour le moment.{" "}
          <Link href="/maintenance/templates/new" className="text-accent-600 underline dark:text-accent-400">
            Ajoutez votre premier modèle.
          </Link>
        </p>
      )}
    </div>
  );
}
