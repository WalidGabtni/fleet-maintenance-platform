import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deletePart, updatePart } from "../actions";
import { ConfirmSubmitButton } from "../../components/ConfirmSubmitButton";
import { BarcodeScanner } from "../BarcodeScanner";
import { PhotoCapture } from "../PhotoCapture";
import { SubmitButton } from "../../components/SubmitButton";
import { TrashIcon } from "../../components/icons";
import { canManageParts } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, secondaryButtonClass, requiredMarkClass, pageSubtextClass, dangerButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditPartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!canManageParts(profile?.role)) redirect("/parts");
  await requireFeature("parts_inventory");

  const supabase = await getSupabaseClient();
  const { data: part } = await supabase.from("parts").select("*").eq("id", id).maybeSingle();

  if (!part) notFound();

  const existingPhotoUrl = part.photo_url
    ? (await supabase.storage.from("part-photos").createSignedUrl(part.photo_url, 3600)).data?.signedUrl ?? null
    : null;

  const updateWithId = updatePart.bind(null, id);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifier la pièce</h1>
        <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
      </div>
      <form action={updateWithId} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">
            Nom<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <input className={inputClass} id="name" name="name" defaultValue={part.name} required />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className={labelClass} htmlFor="part_number">Numéro de pièce</label>
            <BarcodeScanner targetInputId="part_number" />
          </div>
          <input className={inputClass} id="part_number" name="part_number" defaultValue={part.part_number ?? ""} placeholder="REF-4521" />
        </div>
        <PhotoCapture existingPhotoUrl={existingPhotoUrl} />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="unit_cost">Coût unitaire</label>
            <input className={inputClass} id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" defaultValue={part.unit_cost} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="quantity_on_hand">Quantité en stock</label>
            <input className={inputClass} id="quantity_on_hand" name="quantity_on_hand" type="number" step="1" min="0" defaultValue={part.quantity_on_hand} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="low_stock_threshold">Seuil de stock bas</label>
          <input className={inputClass} id="low_stock_threshold" name="low_stock_threshold" type="number" step="1" min="0" defaultValue={part.low_stock_threshold} />
        </div>
        <div className="flex gap-3">
          <SubmitButton>Enregistrer les modifications</SubmitButton>
          <Link href="/parts" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
      <form action={deletePart.bind(null, id)}>
        <ConfirmSubmitButton
          confirmMessage={`Supprimer la pièce « ${part.name} » ? Cette action est irréversible.`}
          className={`${dangerButtonClass} flex items-center gap-2`}
          pendingLabel={
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          }
        >
          <TrashIcon className="h-4 w-4" />
          Supprimer la pièce
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
