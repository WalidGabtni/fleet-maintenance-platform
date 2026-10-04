import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { inviteUser, updateUserRole, toggleUserActive } from "./actions";
import { ConfirmSubmitButton } from "../components/ConfirmSubmitButton";
import { SubmitButton } from "../components/SubmitButton";
import { ALL_ROLES, ROLE_LABELS, isAdminTier } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import type { Role } from "@/lib/types";
import {
  inputClass,
  labelClass,
  cardClass,
  pageSubtextClass,
  requiredMarkClass,
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

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) redirect("/");
  await requireFeature("manage_users");

  const supabase = await getSupabaseClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("tenant_id", profile!.tenantId)
    .order("created_at");

  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Équipe</h1>
        <p className={pageSubtextClass}>
          Invitez des personnes, gérez les rôles et désactivez l&apos;accès si nécessaire
        </p>
      </div>

      <div className={`${cardClass} p-4`}>
        <h2 className="mb-3 text-sm font-semibold text-app-fg dark:text-brand-fg-muted">Inviter une nouvelle personne</h2>
        <form action={inviteUser} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label className={labelClass} htmlFor="email">
              E-mail<span className={requiredMarkClass} aria-hidden="true"> *</span>
            </label>
            <input className={inputClass} id="email" name="email" type="email" placeholder="nom@exemple.com" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="role">Rôle</label>
            <select className={inputClass} id="role" name="role" defaultValue="technicien">
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <SubmitButton pendingLabel="Envoi…">Envoyer l&apos;invitation</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-app-fg-muted dark:text-brand-fg-muted">
          Les techniciens créés ici ne sont pas automatiquement liés à une fiche technicien pour l&apos;attribution
          des bons de travail — faites-le depuis Techniciens → modifier → E-mail de connexion lié.
        </p>
      </div>

      {(() => {
        const gridCols =
          "minmax(120px,1.2fr) minmax(160px,1.8fr) minmax(120px,1fr) 90px 110px minmax(140px,1.3fr)";
        const gridStyle = { gridTemplateColumns: gridCols };
        return (
          <div role="table" aria-label="Équipe" className={rowTableWrapperClass}>
            <div role="rowgroup">
              <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
                <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>E-mail</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Rôle</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Statut</div>
                <div role="columnheader" className={rowTableHeaderCellClass}>Inscrit le</div>
                <div role="columnheader" className={rowTableHeaderCellClass} />
              </div>
            </div>
            <div role="rowgroup" className={rowTableBodyClass}>
              {profiles?.map((p) => {
                const updateRoleWithId = updateUserRole.bind(null, p.id);
                const toggleActiveWithId = toggleUserActive.bind(null, p.id);
                const isSelf = p.id === profile?.id;

                return (
                  <div key={p.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
                    <div role="cell" className={rowCardCellClass}>{p.full_name ?? "—"}</div>
                    <div role="cell" className="text-app-fg dark:text-brand-fg">
                      {p.email ?? "—"}
                      {isSelf && <span className="ml-1 text-xs text-app-fg-faint dark:text-brand-fg-faint">(vous)</span>}
                    </div>
                    <div role="cell" className={rowCardCellClass}>{ROLE_LABELS[p.role as Role] ?? p.role}</div>
                    <div role="cell">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.active
                            ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                            : "bg-app-border-soft text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted"
                        }`}
                      >
                        {p.active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div role="cell" className={rowCardCellClass}>{new Date(p.created_at).toLocaleDateString()}</div>
                    <div role="cell">
                      <div className="flex flex-col items-end gap-2">
                        <form action={updateRoleWithId} className="inline-flex items-center justify-end gap-2">
                          <select
                            name="role"
                            defaultValue={p.role}
                            className="rounded-md border border-app-border px-2 py-1 text-xs dark:border-brand-border dark:bg-brand-bg-raised dark:text-brand-fg-muted"
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <ConfirmSubmitButton
                            confirmMessage={`Modifier le rôle de ${p.email ?? "cette personne"} ? Cela change son niveau d'accès dans l'application.`}
                            className="text-xs text-app-fg-muted hover:underline dark:text-brand-fg-muted"
                          >
                            Enregistrer
                          </ConfirmSubmitButton>
                        </form>
                        <form action={toggleActiveWithId}>
                          <ConfirmSubmitButton
                            confirmMessage={
                              p.active
                                ? `Désactiver l'accès de ${p.email ?? "cette personne"} ? Cette personne ne pourra plus se connecter.`
                                : `Réactiver l'accès de ${p.email ?? "cette personne"} ?`
                            }
                            className={`text-xs hover:underline ${
                              p.active
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-700 dark:text-green-400"
                            }`}
                          >
                            {p.active ? "Désactiver" : "Réactiver"}
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {profiles?.length === 0 && <p className={rowTableEmptyClass}>Personne pour le moment.</p>}
    </div>
  );
}
