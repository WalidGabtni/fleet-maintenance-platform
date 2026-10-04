import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { requirePlatformAdminPage } from "@/lib/platformAdmin";
import {
  buttonClass,
  pageSubtextClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowCardCellPrimaryClass,
  rowTableEmptyClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  await requirePlatformAdminPage();

  const supabase = await getSupabaseClient();
  const [{ data: tenants, error }, { data: tenantFeatures }, { data: profiles }, { data: allFeatures }] =
    await Promise.all([
      supabase.from("tenants").select("id, name, active, created_at").order("created_at", { ascending: false }),
      supabase.from("tenant_features").select("tenant_id, enabled"),
      supabase.from("profiles").select("tenant_id"),
      supabase.from("features").select("key"),
    ]);
  if (error) throw new Error(error.message);
  const totalFeatureCount = (allFeatures ?? []).length;

  const featureCounts = new Map<string, number>();
  for (const tf of tenantFeatures ?? []) {
    if (tf.enabled) featureCounts.set(tf.tenant_id, (featureCounts.get(tf.tenant_id) ?? 0) + 1);
  }
  const userCounts = new Map<string, number>();
  for (const p of profiles ?? []) {
    userCounts.set(p.tenant_id, (userCounts.get(p.tenant_id) ?? 0) + 1);
  }

  const gridCols = "minmax(160px,2fr) 110px minmax(120px,1fr) minmax(100px,1fr) 130px";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Administration plateforme</h1>
          <p className={pageSubtextClass}>Tenants, fonctionnalités et accès plateforme.</p>
        </div>
        <Link href="/platform-admin/tenants/new" className={`${buttonClass} shrink-0`}>
          Nouveau tenant
        </Link>
      </div>

      <div role="table" aria-label="Tenants" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Tenant</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Statut</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Fonctionnalités</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Utilisateurs</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Créé le</div>
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {(tenants ?? []).map((t) => (
            <div key={t.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
              <div role="cell" className={rowCardCellPrimaryClass}>
                <Link href={`/platform-admin/tenants/${t.id}`} className="hover:underline">
                  {t.name}
                </Link>
              </div>
              <div role="cell">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    t.active
                      ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
                  }`}
                >
                  {t.active ? "Actif" : "Suspendu"}
                </span>
              </div>
              <div role="cell" className={rowCardCellClass}>
                {featureCounts.get(t.id) ?? 0} / {totalFeatureCount}
              </div>
              <div role="cell" className={rowCardCellClass}>{userCounts.get(t.id) ?? 0}</div>
              <div role="cell" className={rowCardCellClass}>{new Date(t.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
      {(tenants ?? []).length === 0 && <p className={rowTableEmptyClass}>Aucun tenant.</p>}
    </div>
  );
}
