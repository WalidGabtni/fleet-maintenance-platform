import Link from "next/link";
import { redirect } from "next/navigation";
import { createTechnician } from "../actions";
import { getCurrentProfile } from "@/lib/profile";
import { SubmitButton } from "../../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { inputClass, labelClass, secondaryButtonClass, requiredMarkClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewTechnicianPage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/technicians");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouveau technicien</h1>
        <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
      </div>
      <form action={createTechnician} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="full_name">
            Nom complet<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <input className={inputClass} id="full_name" name="full_name" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="email">E-mail</label>
          <input className={inputClass} id="email" name="email" type="email" placeholder="nom@exemple.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="phone">Téléphone</label>
          <input className={inputClass} id="phone" name="phone" placeholder="(514) 555-1234" />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="grant_access" className="mt-0.5" />
          <span>
            Donner un accès de connexion à cette personne
            <span className="block text-xs text-app-fg-muted dark:text-brand-fg-muted">
              Elle pourra se connecter avec l&apos;adresse e-mail ci-dessus et gérer ses propres bons de travail. Si
              elle n&apos;a pas encore de compte, une invitation lui sera envoyée automatiquement à cette adresse.
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked />
          Actif
        </label>
        <div className="flex gap-3">
          <SubmitButton>Créer le technicien</SubmitButton>
          <Link href="/technicians" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
