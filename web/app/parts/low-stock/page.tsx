import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import {
  secondaryButtonClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgWarnClass,
  rowCardCellClass,
  rowTableEmptyClass,
} from "@/lib/ui";
import { canManageParts } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function LowStockPartsPage() {
  const profile = await getCurrentProfile();
  if (!canManageParts(profile?.role)) redirect("/");
  await requireFeature("parts_inventory");

  const supabase = await getSupabaseClient();
  const { data: parts, error } = await supabase.from("parts").select("*").order("name");
  if (error) throw new Error(error.message);

  const lowStockParts = (parts ?? [])
    .filter((p) => p.quantity_on_hand <= p.low_stock_threshold)
    .sort(
      (a, b) =>
        b.low_stock_threshold - b.quantity_on_hand - (a.low_stock_threshold - a.quantity_on_hand),
    );

  const gridCols = "minmax(160px,2fr) minmax(120px,1.3fr) 150px 140px 100px";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock faible</h1>
          <p className="mt-1 text-sm text-app-fg-muted dark:text-brand-fg-muted">Pièces à commander en priorité, les plus critiques en premier</p>
        </div>
        <Link href="/parts" className={secondaryButtonClass}>Retour aux pièces</Link>
      </div>

      <div role="table" aria-label="Pièces en stock faible" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Numéro de pièce</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Quantité en stock</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Seuil de stock bas</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Manque</div>
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {lowStockParts.map((part) => {
            const shortfall = part.low_stock_threshold - part.quantity_on_hand;
            return (
              <div key={part.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgWarnClass}`}>
                <div role="cell">
                  <Link href={`/parts/${part.id}`} className="font-medium text-app-fg hover:underline dark:text-brand-fg">
                    {part.name}
                  </Link>
                </div>
                <div role="cell" className={rowCardCellClass}>{part.part_number ?? "—"}</div>
                <div role="cell" className="font-medium text-amber-700 dark:text-amber-400">{part.quantity_on_hand}</div>
                <div role="cell" className={rowCardCellClass}>{part.low_stock_threshold}</div>
                <div role="cell" className="font-medium text-red-700 dark:text-red-400">-{shortfall}</div>
              </div>
            );
          })}
        </div>
      </div>
      {lowStockParts.length === 0 && (
        <p className={rowTableEmptyClass}>Aucune pièce en stock faible. Tout est à jour.</p>
      )}
    </div>
  );
}
