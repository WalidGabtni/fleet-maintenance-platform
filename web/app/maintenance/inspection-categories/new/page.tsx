import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createInspectionCategory } from "../actions";
import { SubmitButton } from "../../../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewInspectionCategoryPage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/maintenance/inspection-categories");
  await requireFeature("maintenance_scheduling");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nouvelle catégorie d&apos;inspection</h1>
      <form action={createInspectionCategory} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">Nom</label>
          <input className={inputClass} id="name" name="name" required placeholder="Camion — PNBV 4500kg+" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="interval_days">Intervalle (jours)</label>
          <input className={inputClass} id="interval_days" name="interval_days" type="number" min="1" step="1" required placeholder="365" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="interval_km">Intervalle (km) — optionnel</label>
          <input className={inputClass} id="interval_km" name="interval_km" type="number" min="1" step="1" placeholder="Laisser vide si non applicable" />
        </div>
        <div className="flex gap-3">
          <SubmitButton>Créer la catégorie</SubmitButton>
          <Link href="/maintenance/inspection-categories" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
