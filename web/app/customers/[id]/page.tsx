import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteCustomer, updateCustomer } from "../actions";
import { ConfirmSubmitButton } from "../../components/ConfirmSubmitButton";
import { SubmitButton } from "../../components/SubmitButton";
import { TrashIcon } from "../../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import { inputClass, labelClass, secondaryButtonClass, requiredMarkClass, pageSubtextClass, dangerButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/customers");

  const supabase = await getSupabaseClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const updateWithId = updateCustomer.bind(null, id);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifier le client</h1>
        <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
      </div>
      <form action={updateWithId} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="name">
            Nom<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <input className={inputClass} id="name" name="name" defaultValue={customer.name} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="phone">Téléphone</label>
          <input className={inputClass} id="phone" name="phone" defaultValue={customer.phone ?? ""} placeholder="(514) 555-1234" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="email">E-mail</label>
          <input className={inputClass} id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="notes">Notes</label>
          <textarea className={inputClass} id="notes" name="notes" rows={3} defaultValue={customer.notes ?? ""} />
        </div>
        <div className="flex gap-3">
          <SubmitButton>Enregistrer les modifications</SubmitButton>
          <Link href="/customers" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
      <form action={deleteCustomer.bind(null, id)}>
        <ConfirmSubmitButton
          confirmMessage={`Supprimer le client « ${customer.name} » ? Cette action est irréversible.`}
          className={`${dangerButtonClass} flex items-center gap-2`}
          pendingLabel={
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          }
        >
          <TrashIcon className="h-4 w-4" />
          Supprimer le client
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
