import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { createVehicle } from "../actions";
import { SubmitButton } from "../../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { inputClass, labelClass, secondaryButtonClass, requiredMarkClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/vehicles");

  const supabase = await getSupabaseClient();
  const [{ data: customers }, { data: inspectionCategories }] = await Promise.all([
    supabase.from("customers").select("id, name").order("name"),
    supabase.from("inspection_categories").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouveau véhicule</h1>
        <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
      </div>
      {customers?.length === 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Vous devez avoir au moins un client avant d&apos;ajouter un véhicule.{" "}
          <Link href="/customers/new" className="underline">Créez-en un d&apos;abord</Link>.
        </p>
      )}
      <form action={createVehicle} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="customer_id">
            Client<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <select className={inputClass} id="customer_id" name="customer_id" required>
            <option value="">Sélectionner un client…</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="unit_number">Numéro d&apos;unité</label>
          <input className={inputClass} id="unit_number" name="unit_number" placeholder="T-104" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="make">Marque</label>
            <input className={inputClass} id="make" name="make" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="model">Modèle</label>
            <input className={inputClass} id="model" name="model" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="year">Année</label>
            <input className={inputClass} id="year" name="year" type="number" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="mileage">Kilométrage</label>
            <input className={inputClass} id="mileage" name="mileage" type="number" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="vin">NIV (numéro d&apos;identification du véhicule)</label>
          <input className={inputClass} id="vin" name="vin" placeholder="1FDXE4FS0KDC12345" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="license_plate">Plaque d&apos;immatriculation</label>
          <input className={inputClass} id="license_plate" name="license_plate" placeholder="AB12345" />
        </div>
        {inspectionCategories && inspectionCategories.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="inspection_category_id">Catégorie d&apos;inspection</label>
            <select className={inputClass} id="inspection_category_id" name="inspection_category_id" defaultValue="">
              <option value="">Non assignée</option>
              {inspectionCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked />
          Actif
        </label>
        <div className="flex gap-3">
          <SubmitButton>Créer le véhicule</SubmitButton>
          <Link href="/vehicles" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
