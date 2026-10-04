import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { createWorkOrder } from "../actions";
import { WORK_ORDER_STATUSES } from "@/lib/types";
import { statusLabels } from "../StatusBadge";
import { SubmitButton } from "../../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/work-orders");

  const supabase = await getSupabaseClient();
  const [{ data: vehicles }, { data: technicians }] = await Promise.all([
    supabase.from("vehicles").select("id, unit_number, make, model, customers(name)").order("created_at", { ascending: false }),
    supabase.from("technicians").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nouveau bon de travail</h1>
      {vehicles?.length === 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Vous devez avoir au moins un véhicule avant de créer un bon de travail.{" "}
          <Link href="/vehicles/new" className="underline">Créez-en un d&apos;abord</Link>.
        </p>
      )}
      <form action={createWorkOrder} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="vehicle_id">Véhicule</label>
          <select className={inputClass} id="vehicle_id" name="vehicle_id" required>
            <option value="">Sélectionner un véhicule…</option>
            {vehicles?.map((v) => {
              const customer = v.customers as { name: string } | null;
              const label = [v.unit_number, [v.make, v.model].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(" – ");
              return (
                <option key={v.id} value={v.id}>
                  {label || v.id} {customer ? `(${customer.name})` : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="technician_id">Technicien</label>
          <select className={inputClass} id="technician_id" name="technician_id">
            <option value="">Non assigné</option>
            {technicians?.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="status">Statut</label>
          <select className={inputClass} id="status" name="status" defaultValue="open">
            {WORK_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="reported_issue">Problème signalé</label>
          <textarea className={inputClass} id="reported_issue" name="reported_issue" rows={3} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="diagnosis">Diagnostic</label>
          <textarea className={inputClass} id="diagnosis" name="diagnosis" rows={2} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="work_performed">Travaux effectués</label>
          <textarea className={inputClass} id="work_performed" name="work_performed" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="mileage_at_service">Kilométrage au service</label>
            <input className={inputClass} id="mileage_at_service" name="mileage_at_service" type="number" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="labor_hours">Heures de main-d&apos;œuvre</label>
            <input className={inputClass} id="labor_hours" name="labor_hours" type="number" step="0.25" />
          </div>
        </div>
        <div className="flex gap-3">
          <SubmitButton>Créer le bon de travail</SubmitButton>
          <Link href="/work-orders" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
