import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { isAdminTier } from "@/lib/permissions";
import { getSupabaseClient } from "@/lib/supabase";
import type { ActivityAction, ActivityEntityType } from "@/lib/activityLog";
import {
  inputClass,
  labelClass,
  buttonClass,
  pageSubtextClass,
  secondaryButtonClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowTableEmptyClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<ActivityAction, string> = {
  created: "Créé",
  updated: "Modifié",
  deleted: "Supprimé",
  status_changed: "Statut changé",
  login_success: "Connexion réussie",
  login_failed: "Connexion échouée",
  role_changed: "Rôle changé",
  activated: "Compte réactivé",
  deactivated: "Compte désactivé",
  feature_toggled: "Fonctionnalité modifiée",
};

const ENTITY_TYPE_LABELS: Record<ActivityEntityType, string> = {
  work_order: "Bon de travail",
  invoice: "Facture",
  part: "Pièce",
  profile: "Utilisateur",
  vehicle: "Véhicule",
  vehicle_maintenance_schedule: "Entretien planifié",
  tenant_feature: "Fonctionnalité",
};

// Only entity types with an actual per-record page get a link — profile and
// vehicle_maintenance_schedule fall back to their nearest list/section page
// since neither has a dedicated detail route; tenant_feature (platform-admin
// territory, no entity_id) never links anywhere.
function entityLink(entityType: string, entityId: string | null): string | null {
  switch (entityType) {
    case "work_order":
      return entityId ? `/work-orders/${entityId}` : null;
    case "invoice":
      return entityId ? `/invoices/${entityId}` : null;
    case "part":
      return entityId ? `/parts/${entityId}` : null;
    case "vehicle":
      return entityId ? `/vehicles/${entityId}` : null;
    case "profile":
      return "/team";
    case "vehicle_maintenance_schedule":
      return "/maintenance/calendar";
    default:
      return null;
  }
}

type SearchParams = {
  page?: string;
  user?: string;
  action?: string;
  entity_type?: string;
  from?: string;
  to?: string;
};

function buildUrl(current: SearchParams, overrides: Record<string, string | null>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value != null && value !== "") params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/activity-log?${qs}` : "/activity-log";
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .eq("tenant_id", profile!.tenantId)
    .order("created_at", { ascending: false });

  if (params.user) query = query.eq("user_id", params.user);
  if (params.action) query = query.eq("action", params.action);
  if (params.entity_type) query = query.eq("entity_type", params.entity_type);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", `${params.to}T23:59:59`);

  const { data: rows, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("tenant_id", profile!.tenantId)
    .order("full_name");
  const membersById = new Map((members ?? []).map((m) => [m.id, m]));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Journal d&apos;activité</h1>
        <p className={pageSubtextClass}>Historique des actions effectuées dans votre organisation</p>
      </div>

      <form
        action="/activity-log"
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-app-border bg-app-surface p-4 dark:border-brand-border-soft dark:bg-brand-bg-raised"
      >
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="user">Utilisateur</label>
          <select className={inputClass} id="user" name="user" defaultValue={params.user ?? ""}>
            <option value="">Tous</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email || m.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="action">Action</label>
          <select className={inputClass} id="action" name="action" defaultValue={params.action ?? ""}>
            <option value="">Toutes</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="entity_type">Type d&apos;entité</label>
          <select className={inputClass} id="entity_type" name="entity_type" defaultValue={params.entity_type ?? ""}>
            <option value="">Tous</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Date</label>
          <div className="flex items-center gap-2">
            <input className={inputClass} type="date" name="from" defaultValue={params.from ?? ""} />
            <span className="text-app-fg-muted dark:text-brand-fg-muted">à</span>
            <input className={inputClass} type="date" name="to" defaultValue={params.to ?? ""} />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" className={buttonClass}>Filtrer</button>
          <Link href="/activity-log" className={secondaryButtonClass}>Réinitialiser</Link>
        </div>
      </form>

      <p className={pageSubtextClass}>{count ?? 0} résultat{(count ?? 0) === 1 ? "" : "s"}</p>

      <div role="table" aria-label="Journal d'activité" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div
            role="row"
            style={{ gridTemplateColumns: "170px minmax(140px,1.5fr) minmax(200px,3fr) 90px" }}
            className={rowTableHeaderRowClass}
          >
            <div role="columnheader" className={rowTableHeaderCellClass}>Date</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Utilisateur</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Action</div>
            <div role="columnheader" className={rowTableHeaderCellClass} />
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {(rows ?? []).map((row) => {
            const member = row.user_id ? membersById.get(row.user_id) : undefined;
            const userLabel = row.user_id
              ? member
                ? member.full_name || member.email || "—"
                : "Administrateur de la plateforme"
              : "Système";
            const link = entityLink(row.entity_type, row.entity_id);

            return (
              <div
                key={row.id}
                role="row"
                style={{ gridTemplateColumns: "170px minmax(140px,1.5fr) minmax(200px,3fr) 90px" }}
                className={`${rowCardClass} ${rowCardBgClass}`}
              >
                <div role="cell" className={rowCardCellClass}>{new Date(row.created_at).toLocaleString()}</div>
                <div role="cell" className={rowCardCellClass}>{userLabel}</div>
                <div role="cell" className={rowCardCellClass}>{row.description}</div>
                <div role="cell" className="justify-self-end">
                  {link && (
                    <Link href={link} className="text-sm font-medium text-app-fg hover:underline dark:text-brand-fg">
                      Voir →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {(rows ?? []).length === 0 && <p className={rowTableEmptyClass}>Aucune activité pour le moment.</p>}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={pageSubtextClass}>
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={buildUrl(params, { page: String(Math.max(1, page - 1)) })}
              aria-disabled={page <= 1}
              className={`${secondaryButtonClass} ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Précédent
            </Link>
            <Link
              href={buildUrl(params, { page: String(Math.min(totalPages, page + 1)) })}
              aria-disabled={page >= totalPages}
              className={`${secondaryButtonClass} ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            >
              Suivant
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
