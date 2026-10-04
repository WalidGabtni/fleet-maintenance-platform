"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { canManageFleetOps } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";

async function requireFleetManager() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) {
    throw new Error("Seuls les administrateurs, directeurs de service et superviseurs peuvent modifier une échéance.");
  }
}

function scheduleLabel(schedule: {
  vehicles: { unit_number: string | null; make: string | null; model: string | null } | null;
  maintenance_templates: { name: string } | null;
  inspection_categories: { name: string } | null;
}) {
  const vehicle = schedule.vehicles;
  const vehicleLabel = vehicle?.unit_number || [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "—";
  const categoryName = schedule.maintenance_templates?.name ?? schedule.inspection_categories?.name ?? "Inspection";
  return `${vehicleLabel} — ${categoryName}`;
}

// Sets an explicit override on the schedule's due date. Stored separately
// from last_done_at/interval_days so editing a category's interval later
// can never silently recalculate this back — the override wins until it's
// cleared here or a new inspection is actually recorded.
export async function updateInspectionDueDate(scheduleId: string, formData: FormData) {
  await requireFleetManager();
  const supabase = await getSupabaseClient();

  const isReset = formData.get("reset") != null;
  const newDate = isReset ? null : String(formData.get("next_due_override") ?? "").trim() || null;

  const { data: schedule } = await supabase
    .from("vehicle_maintenance_schedules")
    .select("next_due_override, vehicles(unit_number, make, model), maintenance_templates(name), inspection_categories(name)")
    .eq("id", scheduleId)
    .maybeSingle();

  const { error } = await supabase
    .from("vehicle_maintenance_schedules")
    .update({ next_due_override: newDate })
    .eq("id", scheduleId);
  if (error) throw new Error(error.message);

  if (schedule) {
    const label = scheduleLabel(schedule);
    await logActivity({
      action: "updated",
      entityType: "vehicle_maintenance_schedule",
      entityId: scheduleId,
      description: isReset
        ? `Échéance d'inspection réinitialisée pour ${label}`
        : `Échéance d'inspection modifiée manuellement pour ${label} (${schedule.next_due_override ?? "calculée"} → ${newDate})`,
      metadata: { from: schedule.next_due_override, to: newDate },
    });
  }

  revalidatePath("/maintenance/calendar");
  revalidatePath("/maintenance");
  revalidatePath("/vehicles");
}
