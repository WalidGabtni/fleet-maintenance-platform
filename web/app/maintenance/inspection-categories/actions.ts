"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { canManageFleetOps } from "@/lib/permissions";
import { friendlyError } from "@/lib/errors";

function toIntOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) {
    throw new Error("Seuls les administrateurs peuvent gérer les catégories d'inspection.");
  }
}

export async function createInspectionCategory(formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/maintenance/inspection-categories/new?error=${encodeURIComponent("Le nom est requis.")}`);

  const intervalDays = toIntOrNull(formData.get("interval_days"));
  if (intervalDays === null || intervalDays <= 0) {
    redirect(
      `/maintenance/inspection-categories/new?error=${encodeURIComponent("L'intervalle en jours est requis et doit être positif.")}`,
    );
  }

  const { error } = await supabase.from("inspection_categories").insert({
    name,
    interval_days: intervalDays,
    interval_km: toIntOrNull(formData.get("interval_km")),
  });
  if (error) redirect(`/maintenance/inspection-categories/new?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/maintenance/inspection-categories");
  redirect("/maintenance/inspection-categories");
}

export async function updateInspectionCategory(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/maintenance/inspection-categories/${id}?error=${encodeURIComponent("Le nom est requis.")}`);

  const intervalDays = toIntOrNull(formData.get("interval_days"));
  if (intervalDays === null || intervalDays <= 0) {
    redirect(
      `/maintenance/inspection-categories/${id}?error=${encodeURIComponent("L'intervalle en jours est requis et doit être positif.")}`,
    );
  }

  const { error } = await supabase
    .from("inspection_categories")
    .update({
      name,
      interval_days: intervalDays,
      interval_km: toIntOrNull(formData.get("interval_km")),
      active: formData.get("active") === "on",
    })
    .eq("id", id);
  if (error) {
    redirect(`/maintenance/inspection-categories/${id}?error=${encodeURIComponent(friendlyError(error))}`);
  }

  revalidatePath("/maintenance/inspection-categories");
  revalidatePath("/vehicles");
  redirect("/maintenance/inspection-categories");
}
