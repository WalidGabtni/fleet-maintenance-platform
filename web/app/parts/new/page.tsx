import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createPart } from "../actions";
import { BarcodeScanner } from "../BarcodeScanner";
import { PhotoCapture } from "../PhotoCapture";
import { SubmitButton } from "../../components/SubmitButton";
import { canManageParts } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, secondaryButtonClass, requiredMarkClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewPartPage() {
  const profile = await getCurrentProfile();
  if (!canManageParts(profile?.role)) redirect("/parts");
  await requireFeature("parts_inventory");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouvelle pièce</h1>
        <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
      </div>
      <form action={createPart} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">
            Nom<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <input className={inputClass} id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className={labelClass} htmlFor="part_number">Numéro de pièce</label>
            <BarcodeScanner targetInputId="part_number" />
          </div>
          <input className={inputClass} id="part_number" name="part_number" placeholder="REF-4521" />
        </div>
        <PhotoCapture />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="unit_cost">Coût unitaire</label>
            <input className={inputClass} id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="quantity_on_hand">Quantité en stock</label>
            <input className={inputClass} id="quantity_on_hand" name="quantity_on_hand" type="number" step="1" min="0" defaultValue="0" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="low_stock_threshold">Seuil de stock bas</label>
          <input className={inputClass} id="low_stock_threshold" name="low_stock_threshold" type="number" step="1" min="0" defaultValue="0" />
        </div>
        <div className="flex gap-3">
          <SubmitButton>Créer la pièce</SubmitButton>
          <Link href="/parts" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
