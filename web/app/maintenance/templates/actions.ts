"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { friendlyDeleteError, friendlyError } from "@/lib/errors";
import { canManageFleetOps } from "@/lib/permissions";

function toIntOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) {
    throw new Error("Seuls les administrateurs peuvent gérer les modèles d'entretien.");
  }
}

export async function createMaintenanceTemplate(formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/maintenance/templates/new?error=${encodeURIComponent("Le nom est requis.")}`);

  const intervalMileage = toIntOrNull(formData.get("interval_mileage"));
  const intervalDays = toIntOrNull(formData.get("interval_days"));
  if (intervalMileage === null && intervalDays === null) {
    redirect(
      `/maintenance/templates/new?error=${encodeURIComponent("Indiquez au moins un intervalle (kilométrage ou jours).")}`,
    );
  }

  const { error } = await supabase.from("maintenance_templates").insert({
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    interval_mileage: intervalMileage,
    interval_days: intervalDays,
  });
  if (error) redirect(`/maintenance/templates/new?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/maintenance/templates");
  redirect("/maintenance/templates");
}

export async function updateMaintenanceTemplate(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/maintenance/templates/${id}?error=${encodeURIComponent("Le nom est requis.")}`);

  const intervalMileage = toIntOrNull(formData.get("interval_mileage"));
  const intervalDays = toIntOrNull(formData.get("interval_days"));
  if (intervalMileage === null && intervalDays === null) {
    redirect(
      `/maintenance/templates/${id}?error=${encodeURIComponent("Indiquez au moins un intervalle (kilométrage ou jours).")}`,
    );
  }

  const { error } = await supabase
    .from("maintenance_templates")
    .update({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      interval_mileage: intervalMileage,
      interval_days: intervalDays,
    })
    .eq("id", id);
  if (error) redirect(`/maintenance/templates/${id}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/maintenance/templates");
  redirect("/maintenance/templates");
}

export async function deleteMaintenanceTemplate(id: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("maintenance_templates").delete().eq("id", id);
  if (error) {
    redirect(`/maintenance/templates?error=${encodeURIComponent(friendlyDeleteError(error))}`);
  }

  revalidatePath("/maintenance/templates");
  redirect("/maintenance/templates");
}
