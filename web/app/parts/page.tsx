import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deletePart } from "./actions";
import { ConfirmSubmitButton } from "../components/ConfirmSubmitButton";
import { PlusIcon, TrashIcon } from "../components/icons";
import { EntityThumbnail } from "../components/EntityThumbnail";
import { signPartPhotoUrls } from "@/lib/partPhotos";
import { canManageParts } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import {
  buttonClass,
  secondaryButtonClass,
  iconButtonDangerClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardBgWarnClass,
  rowCardCellClass,
  rowTableEmptyClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PartsPage() {
  const profile = await getCurrentProfile();
  if (!canManageParts(profile?.role)) redirect("/");
  await requireFeature("parts_inventory");

  const supabase = await getSupabaseClient();
  const { data: parts, error } = await supabase.from("parts").select("*").order("name");

  if (error) throw new Error(error.message);

  const photoUrls = await signPartPhotoUrls(supabase, (parts ?? []).map((p) => p.photo_url));

  const gridCols = "minmax(200px,2.5fr) 110px minmax(160px,1.3fr) 130px 40px";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pièces</h1>
        <div className="flex items-center gap-3">
          <Link href="/parts/low-stock" className={secondaryButtonClass}>Stock faible</Link>
          <Link href="/parts/new" className={`${buttonClass} flex items-center gap-2`}>
            <PlusIcon className="h-4 w-4" />
            Nouvelle pièce
          </Link>
        </div>
      </div>

      <div role="table" aria-label="Pièces" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Pièce</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Coût unitaire</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Quantité en stock</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Seuil de stock bas</div>
            <div role="columnheader" className={rowTableHeaderCellClass} />
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {parts?.map((part) => {
            const lowStock = part.quantity_on_hand <= part.low_stock_threshold;
            const photoUrl = part.photo_url ? photoUrls.get(part.photo_url) : undefined;
            return (
              <div
                key={part.id}
                role="row"
                style={gridStyle}
                className={`${rowCardClass} ${lowStock ? rowCardBgWarnClass : rowCardBgClass}`}
              >
                <div role="cell">
                  <Link href={`/parts/${part.id}`}>
                    <EntityThumbnail photoUrl={photoUrl} title={part.name} subtitle={part.part_number ?? "—"} />
                  </Link>
                </div>
                <div role="cell" className={rowCardCellClass}>{part.unit_cost.toFixed(2)}</div>
                <div role="cell">
                  <span className={lowStock ? "font-medium text-amber-700 dark:text-amber-400" : "text-app-fg-muted dark:text-brand-fg-muted"}>
                    {part.quantity_on_hand}
                  </span>
                  {lowStock && (
                    <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                      Stock faible
                    </span>
                  )}
                </div>
                <div role="cell" className={rowCardCellClass}>{part.low_stock_threshold}</div>
                <div role="cell" className="justify-self-end">
                  <form action={deletePart.bind(null, part.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Supprimer la pièce « ${part.name} » ? Cette action est irréversible.`}
                      className={iconButtonDangerClass}
                      ariaLabel={`Supprimer ${part.name}`}
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
      {parts?.length === 0 && (
        <p className={rowTableEmptyClass}>
          Aucune pièce pour le moment.{" "}
          <Link href="/parts/new" className="text-accent-600 underline dark:text-accent-400">
            Ajoutez votre première pièce.
          </Link>
        </p>
      )}
    </div>
  );
}
