import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteMaintenanceTemplate, updateMaintenanceTemplate } from "../actions";
import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { SubmitButton } from "../../../components/SubmitButton";
import { TrashIcon } from "../../../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, secondaryButtonClass, dangerButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditMaintenanceTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/maintenance/templates");
  await requireFeature("maintenance_scheduling");

  const supabase = await getSupabaseClient();
  const { data: template } = await supabase.from("maintenance_templates").select("*").eq("id", id).maybeSingle();
  if (!template) notFound();

  const updateWithId = updateMaintenanceTemplate.bind(null, id);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Modifier le modèle</h1>
      <form action={updateWithId} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">Nom</label>
          <input className={inputClass} id="name" name="name" defaultValue={template.name} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="description">Description</label>
          <textarea className={inputClass} id="description" name="description" rows={2} defaultValue={template.description ?? ""} />
        </div>
        <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">Indiquez au moins un des deux intervalles ci-dessous.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="interval_mileage">Intervalle (km)</label>
            <input
              className={inputClass}
              id="interval_mileage"
              name="interval_mileage"
              type="number"
              min="1"
              step="1"
              defaultValue={template.interval_mileage ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="interval_days">Intervalle (jours)</label>
            <input
              className={inputClass}
              id="interval_days"
              name="interval_days"
              type="number"
              min="1"
              step="1"
              defaultValue={template.interval_days ?? ""}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <SubmitButton>Enregistrer les modifications</SubmitButton>
          <Link href="/maintenance/templates" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
      <form action={deleteMaintenanceTemplate.bind(null, id)}>
        <ConfirmSubmitButton
          confirmMessage={`Supprimer le modèle « ${template.name} » ? Cette action est irréversible.`}
          className={`${dangerButtonClass} flex items-center gap-2`}
          pendingLabel={
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          }
        >
          <TrashIcon className="h-4 w-4" />
          Supprimer le modèle
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
