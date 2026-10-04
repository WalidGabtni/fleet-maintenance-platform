import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { PlusIcon } from "../../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import {
  buttonClass,
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

export default async function InspectionCategoriesPage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/maintenance");
  await requireFeature("maintenance_scheduling");

  const supabase = await getSupabaseClient();
  const { data: categories, error } = await supabase
    .from("inspection_categories")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catégories d&apos;inspection</h1>
          <p className={pageSubtextClass}>
            Intervalles d&apos;inspection réglementaires — chaque véhicule est assigné à une catégorie
          </p>
        </div>
        <Link href="/maintenance/inspection-categories/new" className={`${buttonClass} flex items-center gap-2`}>
          <PlusIcon className="h-4 w-4" />
          Nouvelle catégorie
        </Link>
      </div>

      <div role="table" aria-label="Catégories d'inspection" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div
            role="row"
            style={{ gridTemplateColumns: "minmax(160px,2fr) 140px 130px 110px 90px" }}
            className={rowTableHeaderRowClass}
          >
            <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Intervalle (jours)</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Intervalle (km)</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Statut</div>
            <div role="columnheader" className={rowTableHeaderCellClass} />
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {categories?.map((c) => (
            <div
              key={c.id}
              role="row"
              style={{ gridTemplateColumns: "minmax(160px,2fr) 140px 130px 110px 90px" }}
              className={`${rowCardClass} ${rowCardBgClass}`}
            >
              <div role="cell">
                <Link
                  href={`/maintenance/inspection-categories/${c.id}`}
                  className="font-medium text-app-fg hover:underline dark:text-brand-fg"
                >
                  {c.name}
                </Link>
              </div>
              <div role="cell" className={rowCardCellClass}>{c.interval_days}</div>
              <div role="cell" className={rowCardCellClass}>{c.interval_km ?? "—"}</div>
              <div role="cell">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.active
                      ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                      : "bg-app-border-soft text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted"
                  }`}
                >
                  {c.active ? "Active" : "Désactivée"}
                </span>
              </div>
              <div role="cell" className="justify-self-end">
                <Link
                  href={`/maintenance/inspection-categories/${c.id}`}
                  className="text-sm text-app-fg-muted hover:underline dark:text-brand-fg-muted"
                >
                  Modifier
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      {categories?.length === 0 && (
        <p className={rowTableEmptyClass}>
          Aucune catégorie d&apos;inspection pour le moment.{" "}
          <Link href="/maintenance/inspection-categories/new" className="text-accent-600 underline dark:text-accent-400">
            Ajoutez votre première catégorie.
          </Link>
        </p>
      )}
    </div>
  );
}
