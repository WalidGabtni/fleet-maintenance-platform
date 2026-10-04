import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { statusLabels } from "../work-orders/StatusBadge";
import { ReportsTables } from "./ReportsTables";
import { AISummary } from "./AISummary";
import { isAdminTier } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, buttonClass, cardClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// The date range comes from the URL, so it can be anything (stale bookmark,
// typo, hand-edited link). Anything that isn't a real YYYY-MM-DD date falls
// back to the default window rather than reaching the RPC and blowing up.
function validDateOrNull(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || formatDate(parsed) !== value ? null : value;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) redirect("/");
  await requireFeature("reporting");

  const { start, end } = await searchParams;
  const today = new Date();
  const defaultEnd = formatDate(today);
  const defaultStart = formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
  const startDate = validDateOrNull(start) ?? defaultStart;
  const endDate = validDateOrNull(end) ?? defaultEnd;

  const supabase = await getSupabaseClient();
  const [
    { data: revenue, error: revenueError },
    { data: technicians, error: techError },
    { data: vehicles, error: vehicleError },
    { data: parts, error: partsError },
    { data: turnaround, error: turnaroundError },
  ] = await Promise.all([
    supabase.rpc("report_revenue_overview", { start_date: startDate, end_date: endDate }),
    supabase.rpc("report_technician_productivity", { start_date: startDate, end_date: endDate }),
    supabase.rpc("report_vehicle_cost_history", { start_date: startDate, end_date: endDate }),
    supabase.rpc("report_parts_usage", { start_date: startDate, end_date: endDate }),
    supabase.rpc("report_turnaround_by_status", { start_date: startDate, end_date: endDate }),
  ]);

  const firstError = revenueError || techError || vehicleError || partsError || turnaroundError;
  if (firstError) throw new Error(firstError.message);

  const rev = revenue?.[0] ?? { total_invoiced: 0, total_paid: 0, total_outstanding: 0 };
  const hasOutstanding = rev.total_outstanding > 0;

  const maxDwellHours = Math.max(0, ...(turnaround ?? []).map((r) => r.avg_dwell_hours ?? 0));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Rapports</h1>
        <p className={pageSubtextClass}>Vue d&apos;ensemble de l&apos;activité de l&apos;atelier</p>
      </div>

      <form method="GET" className={`flex flex-wrap items-end gap-3 p-4 ${cardClass}`}>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="start">Du</label>
          <input className={inputClass} id="start" name="start" type="date" defaultValue={startDate} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="end">Au</label>
          <input className={inputClass} id="end" name="end" type="date" defaultValue={endDate} />
        </div>
        <button type="submit" className={buttonClass}>Filtrer</button>
      </form>

      <AISummary startDate={startDate} endDate={endDate} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Aperçu des revenus</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={`p-4 ${cardClass}`}>
            <p className="text-xs uppercase text-app-fg-muted dark:text-brand-fg-muted">Facturé</p>
            <p className="mt-1 text-2xl font-semibold text-app-fg dark:text-brand-fg">{rev.total_invoiced.toFixed(2)}</p>
          </div>
          <div className={`p-4 ${cardClass}`}>
            <p className="text-xs uppercase text-app-fg-muted dark:text-brand-fg-muted">Payé</p>
            <p className="mt-1 text-2xl font-semibold text-app-fg dark:text-brand-fg">{rev.total_paid.toFixed(2)}</p>
          </div>
          <div
            className={`rounded-lg border p-4 ${
              hasOutstanding
                ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                : "border-app-border bg-app-surface dark:border-brand-border-soft dark:bg-brand-bg-raised"
            }`}
          >
            <p className={`text-xs uppercase ${hasOutstanding ? "text-amber-700 dark:text-amber-400" : "text-app-fg-muted dark:text-brand-fg-muted"}`}>En attente</p>
            <p className={`mt-1 text-2xl font-semibold ${hasOutstanding ? "text-amber-800 dark:text-amber-300" : "text-app-fg dark:text-brand-fg"}`}>
              {rev.total_outstanding.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <ReportsTables technicians={technicians ?? []} vehicles={vehicles ?? []} parts={parts ?? []} />

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Délai par statut</h2>
          <p className="mt-1 text-xs text-app-fg-muted dark:text-brand-fg-muted">
            Temps d&apos;attente actuel des bons de travail toujours dans chaque statut (pas une moyenne historique —
            un vrai suivi historique demanderait un journal des changements de statut, qui n&apos;existe pas encore).
          </p>
        </div>
        <div className={`flex flex-col gap-3 p-4 ${cardClass}`}>
          {turnaround?.map((row) => {
            const avgDays = (row.avg_dwell_hours ?? 0) / 24;
            const widthPercent = maxDwellHours > 0 ? ((row.avg_dwell_hours ?? 0) / maxDwellHours) * 100 : 0;
            return (
              <div key={row.status} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm text-app-fg-muted dark:text-brand-fg-muted">{statusLabels[row.status]}</span>
                <div className="h-4 flex-1 rounded-full bg-app-surface-sunk dark:bg-brand-bg-raised">
                  <div className="h-4 rounded-full bg-accent-500" style={{ width: `${widthPercent}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-sm text-app-fg-muted dark:text-brand-fg-muted">
                  {avgDays.toFixed(1)} j ({row.work_order_count})
                </span>
              </div>
            );
          })}
          {(!turnaround || turnaround.length === 0) && (
            <p className="text-center text-sm text-app-fg-muted dark:text-brand-fg-muted">Aucun bon de travail actuellement en cours.</p>
          )}
        </div>
      </div>
    </div>
  );
}
