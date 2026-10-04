import Link from "next/link";
import { redirect } from "next/navigation";
import { createCustomer } from "../actions";
import { getCurrentProfile } from "@/lib/profile";
import { SubmitButton } from "../../components/SubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import { inputClass, labelClass, secondaryButtonClass, requiredMarkClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/customers");

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouveau client</h1>
        <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
      </div>
      <form action={createCustomer} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">
            Nom<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <input className={inputClass} id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="phone">Téléphone</label>
          <input className={inputClass} id="phone" name="phone" placeholder="(514) 555-1234" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="email">E-mail</label>
          <input className={inputClass} id="email" name="email" type="email" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="notes">Notes</label>
          <textarea className={inputClass} id="notes" name="notes" rows={3} />
        </div>
        <div className="flex gap-3">
          <SubmitButton>Créer le client</SubmitButton>
          <Link href="/customers" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
    </div>
  );
}
