import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createMaintenanceTemplate } from "../actions";
import { SubmitButton } from "../../../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewMaintenanceTemplatePage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/maintenance/templates");
  await requireFeature("maintenance_scheduling");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nouveau modèle d&apos;entretien</h1>
      <form action={createMaintenanceTemplate} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">Nom</label>
          <input className={inputClass} id="name" name="name" required placeholder="Plan standard camion classe 8" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="description">Description</label>
          <textarea className={inputClass} id="description" name="description" rows={2} />
        </div>
        <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">Indiquez au moins un des deux intervalles ci-dessous.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="interval_mileage">Intervalle (km)</label>
            <input className={inputClass} id="interval_mileage" name="interval_mileage" type="number" min="1" step="1" placeholder="5000" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="interval_days">Intervalle (jours)</label>
            <input className={inputClass} id="interval_days" name="interval_days" type="number" min="1" step="1" placeholder="90" />
          </div>
        </div>
        <div className="flex gap-3">
          <SubmitButton>Créer le modèle</SubmitButton>
          <Link href="/maintenance/templates" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
