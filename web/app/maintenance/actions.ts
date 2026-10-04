"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { canManageFleetOps } from "@/lib/permissions";
import { friendlyError } from "@/lib/errors";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) {
    throw new Error("Seuls les administrateurs peuvent gérer l'entretien planifié.");
  }
}

function toIntOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function applyMaintenanceTemplate(vehicleId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const templateId = String(formData.get("template_id") ?? "").trim();
  if (!templateId) {
    redirect(`/vehicles/${vehicleId}?error=${encodeURIComponent("Sélectionnez un modèle d'entretien.")}`);
  }

  const lastDoneMileage = toIntOrNull(formData.get("last_done_mileage"));
  const lastDoneAtRaw = String(formData.get("last_done_at") ?? "").trim();

  const { error } = await supabase.from("vehicle_maintenance_schedules").insert({
    vehicle_id: vehicleId,
    template_id: templateId,
    last_done_mileage: lastDoneMileage,
    last_done_at: lastDoneAtRaw || null,
  });
  if (error) redirect(`/vehicles/${vehicleId}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function deactivateMaintenanceSchedule(scheduleId: string, vehicleId: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("vehicle_maintenance_schedules")
    .update({ active: false })
    .eq("id", scheduleId);
  if (error) redirect(`/vehicles/${vehicleId}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function createWorkOrderFromSchedule(scheduleId: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();

  const { data: schedule, error: scheduleError } = await supabase
    .from("vehicle_maintenance_schedules")
    .select("vehicle_id, maintenance_templates(name, description)")
    .eq("id", scheduleId)
    .maybeSingle();
  if (scheduleError) redirect(`/maintenance?error=${encodeURIComponent(friendlyError(scheduleError))}`);
  if (!schedule) redirect(`/maintenance?error=${encodeURIComponent("Entretien planifié introuvable.")}`);

  const template = schedule.maintenance_templates as { name: string; description: string | null } | null;
  const reportedIssue = template?.description || template?.name || "Entretien planifié";

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .insert({
      vehicle_id: schedule.vehicle_id,
      reported_issue: reportedIssue,
      maintenance_schedule_id: scheduleId,
    })
    .select("id")
    .single();
  if (error) redirect(`/maintenance?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/maintenance");
  revalidatePath("/work-orders");
  redirect(`/work-orders/${workOrder.id}`);
}
