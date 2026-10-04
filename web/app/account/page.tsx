import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { updateProfileName, changePassword } from "./actions";
import { PasswordInput } from "../components/PasswordInput";
import { SubmitButton } from "../components/SubmitButton";
import { isAdminTier, ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { buttonClass, inputClass, labelClass, pageSubtextClass, requiredMarkClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, email, role, tenants(name)")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres du compte</h1>
        <p className={pageSubtextClass}>Gérez vos informations personnelles et votre mot de passe</p>
      </div>

      <form action={updateProfileName} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="full_name">
            Nom complet<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <input
            className={inputClass}
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name ?? ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>E-mail</span>
          <p className="rounded-md border border-app-border bg-app-surface-sunk px-3 py-2 text-sm text-app-fg-muted dark:border-brand-border-soft dark:bg-brand-bg-raised dark:text-brand-fg-muted">
            {profile.email ?? user.email}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Entreprise</span>
          <p className="rounded-md border border-app-border bg-app-surface-sunk px-3 py-2 text-sm text-app-fg-muted dark:border-brand-border-soft dark:bg-brand-bg-raised dark:text-brand-fg-muted">
            {profile.tenants?.name ?? "—"}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Rôle</span>
          <span
            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              isAdminTier(profile.role as Role)
                ? "bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-400"
                : "bg-app-surface-sunk text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted"
            }`}
          >
            {ROLE_LABELS[profile.role as Role] ?? profile.role}
          </span>
        </div>
        <SubmitButton className={`${buttonClass} w-fit`}>Enregistrer</SubmitButton>
      </form>

      <div className="flex flex-col gap-4 border-t border-app-border pt-6 dark:border-brand-border-soft">
        <div>
          <h2 className="text-lg font-semibold">Changer le mot de passe</h2>
          <p className={pageSubtextClass}>
            Au moins 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial.
          </p>
        </div>
        <form action={changePassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="current_password">
              Mot de passe actuel<span className={requiredMarkClass} aria-hidden="true"> *</span>
            </label>
            <PasswordInput id="current_password" name="current_password" autoComplete="current-password" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="new_password">
              Nouveau mot de passe<span className={requiredMarkClass} aria-hidden="true"> *</span>
            </label>
            <PasswordInput id="new_password" name="new_password" autoComplete="new-password" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="confirm_new_password">
              Confirmer le nouveau mot de passe<span className={requiredMarkClass} aria-hidden="true"> *</span>
            </label>
            <PasswordInput
              id="confirm_new_password"
              name="confirm_new_password"
              autoComplete="new-password"
              required
            />
          </div>
          <SubmitButton className={`${buttonClass} w-fit`} pendingLabel="Mise à jour…">
            Mettre à jour le mot de passe
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
