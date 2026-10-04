import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteTechnician, updateTechnician } from "../actions";
import { ConfirmSubmitButton } from "../../components/ConfirmSubmitButton";
import { SubmitButton } from "../../components/SubmitButton";
import { TrashIcon } from "../../components/icons";
import { canManageFleetOps } from "@/lib/permissions";
import { inputClass, labelClass, secondaryButtonClass, requiredMarkClass, pageSubtextClass, dangerButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditTechnicianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!canManageFleetOps(profile?.role)) redirect("/technicians");

  const supabase = await getSupabaseClient();
  const { data: tech } = await supabase
    .from("technicians")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!tech) notFound();

  const { data: linkedProfile } = tech.user_id
    ? await supabase.from("profiles").select("email").eq("id", tech.user_id).maybeSingle()
    : { data: null };

  const updateWithId = updateTechnician.bind(null, id);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifier le technicien</h1>
        <p className={pageSubtextClass}>Les champs marqués d&apos;un astérisque (*) sont obligatoires.</p>
      </div>
      <form action={updateWithId} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="full_name">
            Nom complet<span className={requiredMarkClass} aria-hidden="true"> *</span>
          </label>
          <input className={inputClass} id="full_name" name="full_name" defaultValue={tech.full_name} required />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="email">E-mail</label>
          <input className={inputClass} id="email" name="email" type="email" defaultValue={tech.email ?? ""} placeholder="nom@exemple.com" />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="phone">Téléphone</label>
          <input className={inputClass} id="phone" name="phone" defaultValue={tech.phone ?? ""} placeholder="(514) 555-1234" />
        </div>
        {tech.user_id ? (
          <div className="flex flex-col gap-1 rounded-md border border-app-border bg-app-surface-sunk px-3 py-2 dark:border-brand-border-soft dark:bg-brand-bg-inset">
            <p className="text-sm text-app-fg dark:text-brand-fg">
              Accès de connexion actif — <span className="font-medium">{linkedProfile?.email}</span>
            </p>
            <label className="mt-1 flex items-start gap-2 text-xs text-app-fg-muted dark:text-brand-fg-muted">
              <input type="checkbox" name="unlink_access" className="mt-0.5" />
              Dissocier ce compte (la personne ne pourra plus se connecter en tant que ce technicien)
            </label>
          </div>
        ) : (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="grant_access" className="mt-0.5" />
            <span>
              Donner un accès de connexion à cette personne
              <span className="block text-xs text-app-fg-muted dark:text-brand-fg-muted">
                Elle pourra se connecter avec l&apos;adresse e-mail ci-dessus. Si elle n&apos;a pas encore de compte,
                une invitation lui sera envoyée automatiquement à cette adresse lors de l&apos;enregistrement.
              </span>
            </span>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={tech.active} />
          Actif
        </label>
        <div className="flex gap-3">
          <SubmitButton>Enregistrer les modifications</SubmitButton>
          <Link href="/technicians" className={secondaryButtonClass}>Annuler</Link>
        </div>
      </form>
      <form action={deleteTechnician.bind(null, id)}>
        <ConfirmSubmitButton
          confirmMessage={`Supprimer le technicien « ${tech.full_name} » ? Cette action est irréversible.`}
          className={`${dangerButtonClass} flex items-center gap-2`}
          pendingLabel={
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          }
        >
          <TrashIcon className="h-4 w-4" />
          Supprimer le technicien
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
