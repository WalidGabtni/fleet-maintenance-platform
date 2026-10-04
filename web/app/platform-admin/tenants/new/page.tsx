import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/platformAdmin";
import { createTenant } from "./actions";
import { SubmitButton } from "../../../components/SubmitButton";
import { inputClass, labelClass, cardClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewTenantPage() {
  await requirePlatformAdminPage();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouveau tenant</h1>
        <p className={pageSubtextClass}>
          Crée une nouvelle entreprise cliente. Aucune fonctionnalité n&apos;est activée par défaut.
        </p>
      </div>

      <form action={createTenant} className={`flex flex-col gap-4 p-4 ${cardClass}`}>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">Nom de l&apos;entreprise</label>
          <input className={inputClass} id="name" name="name" required autoFocus />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="admin_email">
            E-mail du premier administrateur <span className="font-normal">(optionnel)</span>
          </label>
          <input className={inputClass} id="admin_email" name="admin_email" type="email" />
          <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">
            Laisser vide pour configurer plus tard depuis la fiche du tenant.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Création…">Créer le tenant</SubmitButton>
          <Link href="/platform-admin" className="text-sm text-app-fg-muted hover:underline dark:text-brand-fg-muted">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
