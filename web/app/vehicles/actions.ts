"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { friendlyDeleteError, friendlyError } from "@/lib/errors";

function toIntOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function createVehicle(formData: FormData) {
  const supabase = await getSupabaseClient();
  const customerId = String(formData.get("customer_id") ?? "").trim();
  if (!customerId) redirect(`/vehicles/new?error=${encodeURIComponent("Le client est requis.")}`);

  const { error } = await supabase.from("vehicles").insert({
    customer_id: customerId,
    unit_number: String(formData.get("unit_number") ?? "").trim() || null,
    vin: String(formData.get("vin") ?? "").trim() || null,
    make: String(formData.get("make") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    year: toIntOrNull(formData.get("year")),
    license_plate: String(formData.get("license_plate") ?? "").trim() || null,
    mileage: toIntOrNull(formData.get("mileage")),
    active: formData.get("active") === "on",
    inspection_category_id: String(formData.get("inspection_category_id") ?? "").trim() || null,
  });
  if (error) redirect(`/vehicles/new?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function updateVehicle(id: string, formData: FormData) {
  const supabase = await getSupabaseClient();
  const customerId = String(formData.get("customer_id") ?? "").trim();
  if (!customerId) redirect(`/vehicles/${id}?error=${encodeURIComponent("Le client est requis.")}`);

  const { error } = await supabase
    .from("vehicles")
    .update({
      customer_id: customerId,
      unit_number: String(formData.get("unit_number") ?? "").trim() || null,
      vin: String(formData.get("vin") ?? "").trim() || null,
      make: String(formData.get("make") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      year: toIntOrNull(formData.get("year")),
      license_plate: String(formData.get("license_plate") ?? "").trim() || null,
      mileage: toIntOrNull(formData.get("mileage")),
      active: formData.get("active") === "on",
      inspection_category_id: String(formData.get("inspection_category_id") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) redirect(`/vehicles/${id}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function deleteVehicle(id: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) {
    redirect(`/vehicles?error=${encodeURIComponent(friendlyDeleteError(error))}`);
  }

  revalidatePath("/vehicles");
  redirect("/vehicles");
}
