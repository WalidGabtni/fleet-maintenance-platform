import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { requirePlatformAdminPage } from "@/lib/platformAdmin";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { updateTenantName, toggleTenantActive } from "./actions";
import { FeatureToggleCheckbox } from "./FeatureToggleCheckbox";
import { SubmitButton } from "../../../components/SubmitButton";
import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import {
  inputClass,
  labelClass,
  cardClass,
  pageSubtextClass,
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

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdminPage();
  const { id } = await params;

  const supabase = await getSupabaseClient();
  const [{ data: tenant, error: tenantError }, { data: features }, { data: tenantFeatures }, { data: users }] =
    await Promise.all([
      supabase.from("tenants").select("id, name, active, created_at").eq("id", id).maybeSingle(),
      supabase.from("features").select("key, name").order("name"),
      supabase.from("tenant_features").select("feature_key, enabled").eq("tenant_id", id),
      supabase
        .from("profiles")
        .select("id, email, full_name, role, active")
        .eq("tenant_id", id)
        .order("created_at"),
    ]);
  if (tenantError) throw new Error(tenantError.message);
  if (!tenant) notFound();

  const enabledSet = new Set((tenantFeatures ?? []).filter((tf) => tf.enabled).map((tf) => tf.feature_key));
  const updateNameWithId = updateTenantName.bind(null, tenant.id);
  const toggleActiveWithId = toggleTenantActive.bind(null, tenant.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/platform-admin" className="text-sm text-app-fg-muted hover:underline dark:text-brand-fg-muted">
          ← Retour aux tenants
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              tenant.active
                ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
            }`}
          >
            {tenant.active ? "Actif" : "Suspendu"}
          </span>
        </div>
        <p className={pageSubtextClass}>Créé le {new Date(tenant.created_at).toLocaleDateString()}</p>
      </div>

      <div className={`flex flex-col gap-4 p-4 ${cardClass}`}>
        <h2 className="text-sm font-semibold text-app-fg dark:text-brand-fg-muted">Informations générales</h2>
        <form action={updateNameWithId} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label className={labelClass} htmlFor="name">Nom de l&apos;entreprise</label>
            <input className={inputClass} id="name" name="name" defaultValue={tenant.name} required />
          </div>
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        </form>

        <div className="border-t border-app-border-soft pt-4 dark:border-brand-border-soft">
          <form action={toggleActiveWithId}>
            <ConfirmSubmitButton
              confirmMessage={
                tenant.active
                  ? `Suspendre ${tenant.name} ? Tous les utilisateurs de ce tenant seront immédiatement déconnectés et bloqués jusqu'à réactivation.`
                  : `Réactiver ${tenant.name} ?`
              }
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tenant.active
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-green-600 text-white hover:bg-green-500"
              }`}
            >
              {tenant.active ? "Suspendre ce tenant" : "Réactiver ce tenant"}
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className={`flex flex-col gap-3 p-4 ${cardClass}`}>
        <h2 className="text-sm font-semibold text-app-fg dark:text-brand-fg-muted">Fonctionnalités</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(features ?? []).map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-app-fg dark:text-brand-fg-muted">
              <FeatureToggleCheckbox tenantId={tenant.id} featureKey={f.key} defaultChecked={enabledSet.has(f.key)} />
              {f.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-app-fg dark:text-brand-fg-muted">
          Utilisateurs ({(users ?? []).length})
        </h2>
        <div role="table" aria-label="Utilisateurs" className={rowTableWrapperClass}>
          <div role="rowgroup">
            <div
              role="row"
              style={{ gridTemplateColumns: "minmax(140px,1.5fr) minmax(160px,2fr) minmax(120px,1fr) 100px" }}
              className={rowTableHeaderRowClass}
            >
              <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
              <div role="columnheader" className={rowTableHeaderCellClass}>E-mail</div>
              <div role="columnheader" className={rowTableHeaderCellClass}>Rôle</div>
              <div role="columnheader" className={rowTableHeaderCellClass}>Statut</div>
            </div>
          </div>
          <div role="rowgroup" className={rowTableBodyClass}>
            {(users ?? []).map((u) => (
              <div
                key={u.id}
                role="row"
                style={{ gridTemplateColumns: "minmax(140px,1.5fr) minmax(160px,2fr) minmax(120px,1fr) 100px" }}
                className={`${rowCardClass} ${rowCardBgClass}`}
              >
                <div role="cell" className={rowCardCellClass}>{u.full_name ?? "—"}</div>
                <div role="cell" className={rowCardCellClass}>{u.email ?? "—"}</div>
                <div role="cell" className={rowCardCellClass}>{ROLE_LABELS[u.role as Role] ?? u.role}</div>
                <div role="cell">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.active
                        ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                        : "bg-app-border-soft text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted"
                    }`}
                  >
                    {u.active ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {(users ?? []).length === 0 && <p className={rowTableEmptyClass}>Aucun utilisateur pour le moment.</p>}
      </div>
    </div>
  );
}
