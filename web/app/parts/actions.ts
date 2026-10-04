"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { friendlyDeleteError, friendlyError } from "@/lib/errors";
import { canManageParts } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";

function toNumberOrZero(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function toIntOrZero(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!canManageParts(profile?.role)) {
    throw new Error("Seuls les administrateurs et commis aux pièces peuvent gérer les pièces.");
  }
}

async function uploadPartPhoto(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  partId: string,
  photo: FormDataEntryValue | null,
) {
  if (!(photo instanceof File) || photo.size === 0) return;

  const path = `${partId}/photo`;
  const { error: uploadError } = await supabase.storage
    .from("part-photos")
    .upload(path, photo, { upsert: true, contentType: photo.type || "image/jpeg" });
  if (uploadError) {
    redirect(`/parts/${partId}?error=${encodeURIComponent("Échec du téléversement de la photo. Réessayez.")}`);
  }

  const { error: updateError } = await supabase.from("parts").update({ photo_url: path }).eq("id", partId);
  if (updateError) redirect(`/parts/${partId}?error=${encodeURIComponent(friendlyError(updateError))}`);
}

export async function createPart(formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/parts/new?error=${encodeURIComponent("Le nom est requis.")}`);

  const { data: part, error } = await supabase
    .from("parts")
    .insert({
      name,
      part_number: String(formData.get("part_number") ?? "").trim() || null,
      unit_cost: toNumberOrZero(formData.get("unit_cost")),
      quantity_on_hand: toIntOrZero(formData.get("quantity_on_hand")),
      low_stock_threshold: toIntOrZero(formData.get("low_stock_threshold")),
    })
    .select("id")
    .single();
  if (error) {
    const message = error.code === "23505" ? "Ce numéro de pièce est déjà utilisé." : friendlyError(error);
    redirect(`/parts/new?error=${encodeURIComponent(message)}`);
  }

  await uploadPartPhoto(supabase, part.id, formData.get("photo"));

  revalidatePath("/parts");
  redirect("/parts");
}

export async function updatePart(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/parts/${id}?error=${encodeURIComponent("Le nom est requis.")}`);

  const { data: existing } = await supabase
    .from("parts")
    .select("unit_cost, quantity_on_hand")
    .eq("id", id)
    .maybeSingle();

  const newUnitCost = toNumberOrZero(formData.get("unit_cost"));
  const newQuantity = toIntOrZero(formData.get("quantity_on_hand"));

  const { error } = await supabase
    .from("parts")
    .update({
      name,
      part_number: String(formData.get("part_number") ?? "").trim() || null,
      unit_cost: newUnitCost,
      quantity_on_hand: newQuantity,
      low_stock_threshold: toIntOrZero(formData.get("low_stock_threshold")),
    })
    .eq("id", id);
  if (error) {
    const message = error.code === "23505" ? "Ce numéro de pièce est déjà utilisé." : friendlyError(error);
    redirect(`/parts/${id}?error=${encodeURIComponent(message)}`);
  }

  if (existing && (existing.unit_cost !== newUnitCost || existing.quantity_on_hand !== newQuantity)) {
    const changes: string[] = [];
    if (existing.unit_cost !== newUnitCost) changes.push(`coût unitaire : ${existing.unit_cost} $ → ${newUnitCost} $`);
    if (existing.quantity_on_hand !== newQuantity) {
      changes.push(`quantité : ${existing.quantity_on_hand} → ${newQuantity}`);
    }
    await logActivity({
      action: "updated",
      entityType: "part",
      entityId: id,
      description: `Pièce « ${name} » modifiée (${changes.join(", ")})`,
      metadata: {
        from: { unit_cost: existing.unit_cost, quantity_on_hand: existing.quantity_on_hand },
        to: { unit_cost: newUnitCost, quantity_on_hand: newQuantity },
      },
    });
  }

  await uploadPartPhoto(supabase, id, formData.get("photo"));

  revalidatePath("/parts");
  redirect("/parts");
}

export async function deletePart(id: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("parts").delete().eq("id", id);
  if (error) {
    redirect(`/parts?error=${encodeURIComponent(friendlyDeleteError(error))}`);
  }

  revalidatePath("/parts");
  redirect("/parts");
}
