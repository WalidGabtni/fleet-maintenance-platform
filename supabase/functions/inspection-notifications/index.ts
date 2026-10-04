// Daily cron job (see migration 20260802030000_inspection_notifications_cron.sql)
// notifying each tenant's admins/directeurs of vehicles overdue or due within
// 14 days for a regulatory inspection. One email per tenant, grouped by
// urgency, listing which inspection_categories row triggered each entry.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Edge Function runtime. RESEND_API_KEY and RESEND_FROM_EMAIL are not —
// set them with `supabase secrets set`. Until RESEND_API_KEY is set, this
// function runs as a no-op (logs a warning, sends nothing) instead of
// failing, so the cron schedule can be live before Resend is configured.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Fleet Maintenance <notifications@example.com>";

type StatusRow = {
  schedule_id: string;
  vehicle_id: string;
  template_name: string | null;
  next_due_date: string | null;
  is_due: boolean | null;
  is_due_soon: boolean | null;
};

type VehicleRow = {
  id: string;
  unit_number: string | null;
  make: string | null;
  model: string | null;
  tenant_id: string;
};

type EmailEvent = { label: string; category: string; date: string; days: number };

function vehicleLabel(v: VehicleRow): string {
  return v.unit_number || [v.make, v.model].filter(Boolean).join(" ") || "—";
}

function daysFrom(dateStr: string): number {
  const due = new Date(`${dateStr}T00:00:00Z`).getTime();
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function buildEmailHtml(tenantName: string, overdue: EmailEvent[], dueSoon: EmailEvent[]): string {
  const row = (e: EmailEvent, urgent: boolean) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${e.label}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${e.category}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${new Date(`${e.date}T00:00:00Z`).toLocaleDateString("fr-CA")}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;${urgent ? "font-weight:600;" : ""}">${
        urgent ? `En retard de ${Math.abs(e.days)} j` : `Dans ${e.days} j`
      }</td>
    </tr>`;

  const section = (title: string, rows: EmailEvent[], urgent: boolean) =>
    rows.length === 0
      ? ""
      : `
    <h2 style="font-size:15px;margin:20px 0 8px;">${title} (${rows.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="text-align:left;color:#666;">
          <th style="padding:6px 12px;">Véhicule</th>
          <th style="padding:6px 12px;">Catégorie</th>
          <th style="padding:6px 12px;">Échéance</th>
          <th style="padding:6px 12px;">Statut</th>
        </tr>
      </thead>
      <tbody>${rows.map((r) => row(r, urgent)).join("")}</tbody>
    </table>`;

  return `
  <div style="font-family:system-ui,sans-serif;color:#111;max-width:640px;">
    <p>Bonjour,</p>
    <p>Voici les inspections réglementaires à traiter pour <strong>${tenantName}</strong> :</p>
    ${section("En retard", overdue, true)}
    ${section("Bientôt dues (14 jours)", dueSoon, false)}
    <p style="margin-top:24px;color:#666;font-size:12px;">Notification automatique quotidienne — Fleet Data.</p>
  </div>`;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: statusRows, error: statusError } = await supabase
    .from("vehicle_maintenance_status")
    .select("schedule_id, vehicle_id, template_name, next_due_date, is_due, is_due_soon")
    .not("inspection_category_id", "is", null)
    .not("next_due_date", "is", null);
  if (statusError) {
    return new Response(JSON.stringify({ error: statusError.message }), { status: 500 });
  }

  const dueRows = (statusRows ?? []).filter((r) => r.is_due || r.is_due_soon) as StatusRow[];
  if (dueRows.length === 0) {
    return new Response(JSON.stringify({ tenantsNotified: 0, message: "Nothing due" }), { status: 200 });
  }

  const vehicleIds = [...new Set(dueRows.map((r) => r.vehicle_id))];
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, unit_number, make, model, tenant_id")
    .in("id", vehicleIds);
  if (vehiclesError) {
    return new Response(JSON.stringify({ error: vehiclesError.message }), { status: 500 });
  }
  const vehiclesById = new Map((vehicles ?? []).map((v) => [v.id, v as VehicleRow]));

  const eventsByTenant = new Map<string, { overdue: EmailEvent[]; dueSoon: EmailEvent[] }>();
  for (const row of dueRows) {
    const vehicle = vehiclesById.get(row.vehicle_id);
    if (!vehicle || !row.next_due_date) continue;
    const entry: EmailEvent = {
      label: vehicleLabel(vehicle),
      category: row.template_name ?? "Inspection",
      date: row.next_due_date,
      days: daysFrom(row.next_due_date),
    };
    const bucket = eventsByTenant.get(vehicle.tenant_id) ?? { overdue: [], dueSoon: [] };
    if (row.is_due) bucket.overdue.push(entry);
    else bucket.dueSoon.push(entry);
    eventsByTenant.set(vehicle.tenant_id, bucket);
  }

  const summary = {
    tenantsNotified: 0,
    emailsSent: 0,
    skipped: [] as string[],
    errors: [] as string[],
  };

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        ...summary,
        warning: "RESEND_API_KEY not configured — no emails sent",
        tenantsWithDueItems: eventsByTenant.size,
      }),
      { status: 200 },
    );
  }

  for (const [tenantId, events] of eventsByTenant) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, active")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant || !tenant.active) {
      summary.skipped.push(`${tenantId} (inactive tenant)`);
      continue;
    }

    const { data: feature } = await supabase
      .from("tenant_features")
      .select("enabled")
      .eq("tenant_id", tenantId)
      .eq("feature_key", "maintenance_scheduling")
      .maybeSingle();
    if (!feature?.enabled) {
      summary.skipped.push(`${tenant.name} (feature disabled)`);
      continue;
    }

    const { data: recipients } = await supabase
      .from("profiles")
      .select("email")
      .eq("tenant_id", tenantId)
      .in("role", ["admin", "directeur_service"])
      .eq("active", true)
      .not("email", "is", null);
    const toEmails = (recipients ?? []).map((r) => r.email).filter((e): e is string => !!e);
    if (toEmails.length === 0) {
      summary.skipped.push(`${tenant.name} (no recipients)`);
      continue;
    }

    const totalCount = events.overdue.length + events.dueSoon.length;
    const html = buildEmailHtml(tenant.name, events.overdue, events.dueSoon);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: toEmails,
        subject: `${totalCount} inspection${totalCount > 1 ? "s" : ""} à traiter — ${tenant.name}`,
        html,
      }),
    });

    if (!res.ok) {
      summary.errors.push(`${tenant.name}: ${res.status} ${await res.text()}`);
      continue;
    }
    summary.tenantsNotified += 1;
    summary.emailsSent += 1;
  }

  return new Response(JSON.stringify(summary), { status: 200, headers: { "Content-Type": "application/json" } });
});
