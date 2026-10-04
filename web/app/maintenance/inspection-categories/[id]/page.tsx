import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { updateInspectionCategory } from "../actions";
import { SubmitButton } from "../../../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, secondaryButtonClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditInspectionCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/maintenance/inspection-categories");
  await requireFeature("maintenance_scheduling");

  const supabase = await getSupabaseClient();
  const { data: category } = await supabase.from("inspection_categories").select("*").eq("id", id).maybeSingle();
  if (!category) notFound();

  const updateWithId = updateInspectionCategory.bind(null, id);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifier la catégorie</h1>
        <p className={pageSubtextClass}>
          Modifier l&apos;intervalle recalcule la prochaine échéance des véhicules assignés à partir de leur
          dernière inspection — les échéances déjà passées ne sont pas réécrites, seulement recalculées avec le
          nouvel intervalle.
        </p>
      </div>
      <form action={updateWithId} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">Nom</label>
          <input className={inputClass} id="name" name="name" defaultValue={category.name} required />
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
            required
            defaultValue={category.interval_days}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="interval_km">Intervalle (km) — optionnel</label>
          <input
            className={inputClass}
            id="interval_km"
            name="interval_km"
            type="number"
            min="1"
            step="1"
            defaultValue={category.interval_km ?? ""}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={category.active} />
          Active
        </label>
        <div className="flex gap-3">
          <SubmitButton>Enregistrer les modifications</SubmitButton>
          <Link href="/maintenance/inspection-categories" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
