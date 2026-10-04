"use server";

import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { generateReportsSummary } from "@/lib/gemini";
import { isAdminTier } from "@/lib/permissions";

export async function generateReportsSummaryAction(
  startDate: string,
  endDate: string,
): Promise<{ text?: string; error?: string }> {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) {
    return { error: "Seuls les administrateurs peuvent générer ce résumé." };
  }

  const supabase = await getSupabaseClient();
  const [
    { data: revenue, error: revenueError },
    { data: technicians, error: techError },
    { data: vehicles, error: vehicleError },
    { data: parts, error: partsError },
  ] = await Promise.all([
    supabase.rpc("report_revenue_overview", { start_date: startDate, end_date: endDate }),
    supabase.rpc("report_technician_productivity", { start_date: startDate, end_date: endDate }),
    supabase.rpc("report_vehicle_cost_history", { start_date: startDate, end_date: endDate }),
    supabase.rpc("report_parts_usage", { start_date: startDate, end_date: endDate }),
  ]);

  const firstError = revenueError || techError || vehicleError || partsError;
  if (firstError) return { error: firstError.message };

  const rev = revenue?.[0] ?? { total_invoiced: 0, total_paid: 0, total_outstanding: 0 };

  try {
    const summary = await generateReportsSummary({
      startDate,
      endDate,
      totalInvoiced: rev.total_invoiced,
      totalPaid: rev.total_paid,
      totalOutstanding: rev.total_outstanding,
      technicians: (technicians ?? []).map((t) => ({
        technician_name: t.technician_name,
        completed_count: t.completed_count,
      })),
      vehicles: (vehicles ?? []).map((v) => ({
        unit_number: v.unit_number,
        customer_name: v.customer_name,
        total_cost: v.total_cost,
      })),
      parts: (parts ?? []).map((p) => ({
        part_name: p.part_name,
        total_quantity: p.total_quantity,
        total_spend: p.total_spend,
      })),
    });
    return { text: summary };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Une erreur est survenue." };
  }
}
