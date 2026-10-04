import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { canManageFleetOps } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { InspectionCalendar } from "./InspectionCalendar";
import { pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function InspectionCalendarPage() {
  await requireFeature("maintenance_scheduling");
  const profile = await getCurrentProfile();
  const canEdit = canManageFleetOps(profile?.role);

  const supabase = await getSupabaseClient();
  const { data: statusRows, error } = await supabase
    .from("vehicle_maintenance_status")
    .select("*")
    .not("inspection_category_id", "is", null)
    .not("next_due_date", "is", null);
  if (error) throw new Error(error.message);

  const vehicleIds = [...new Set((statusRows ?? []).map((r) => r.vehicle_id).filter((v): v is string => !!v))];
  const { data: vehicles } =
    vehicleIds.length > 0
      ? await supabase.from("vehicles").select("id, unit_number, make, model").in("id", vehicleIds)
      : { data: [] };
  const vehiclesById = new Map((vehicles ?? []).map((v) => [v.id, v]));

  const events = (statusRows ?? [])
    .filter((r) => r.schedule_id && r.vehicle_id && r.next_due_date)
    .map((r) => {
      const vehicle = vehiclesById.get(r.vehicle_id!);
      const vehicleLabel = vehicle
        ? (vehicle.unit_number ?? [vehicle.make, vehicle.model].filter(Boolean).join(" ")) || "—"
        : "—";
      return {
        scheduleId: r.schedule_id!,
        vehicleId: r.vehicle_id!,
        vehicleLabel,
        categoryName: r.template_name ?? "Inspection",
        dueDate: r.next_due_date!,
        isOverride: r.next_due_override != null,
        isDue: r.is_due ?? false,
        isDueSoon: r.is_due_soon ?? false,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendrier d&apos;inspection</h1>
        <p className={pageSubtextClass}>Prochaines échéances d&apos;inspection réglementaire, par véhicule</p>
      </div>
      <InspectionCalendar events={events} canEdit={canEdit} />
    </div>
  );
}
