import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteTechnician } from "./actions";
import { PlusIcon, TrashIcon } from "../components/icons";
import { ConfirmSubmitButton } from "../components/ConfirmSubmitButton";
import { canManageFleetOps } from "@/lib/permissions";
import {
  buttonClass,
  iconButtonDangerClass,
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

export default async function TechniciansPage() {
  const supabase = await getSupabaseClient();
  const [{ data: technicians, error }, profile] = await Promise.all([
    supabase.from("technicians").select("*").order("full_name"),
    getCurrentProfile(),
  ]);
  const isAdmin = canManageFleetOps(profile?.role);

  if (error) throw new Error(error.message);

  const linkedUserIds = technicians?.map((t) => t.user_id).filter((id): id is string => !!id) ?? [];
  const { data: linkedProfiles } =
    linkedUserIds.length > 0
      ? await supabase.from("profiles").select("id, email").in("id", linkedUserIds)
      : { data: [] };
  const emailByUserId = new Map((linkedProfiles ?? []).map((p) => [p.id, p.email]));

  const gridCols = isAdmin
    ? "minmax(140px,1.5fr) minmax(160px,1.5fr) minmax(120px,1fr) 70px minmax(140px,1.2fr) 40px"
    : "minmax(140px,1.5fr) minmax(160px,1.5fr) minmax(120px,1fr) 70px minmax(140px,1.2fr)";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Techniciens</h1>
        {isAdmin && (
          <Link href="/technicians/new" className={`${buttonClass} flex items-center gap-2`}>
            <PlusIcon className="h-4 w-4" />
            Nouveau technicien
          </Link>
        )}
      </div>

      <div role="table" aria-label="Techniciens" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>E-mail</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Téléphone</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Actif</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Connexion</div>
            {isAdmin && <div role="columnheader" className={rowTableHeaderCellClass} />}
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {technicians?.map((tech) => (
            <div key={tech.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
              <div role="cell">
                {isAdmin ? (
                  <Link
                    href={`/technicians/${tech.id}`}
                    className="font-medium text-app-fg hover:underline dark:text-brand-fg"
                  >
                    {tech.full_name}
                  </Link>
                ) : (
                  <span className="font-medium text-app-fg dark:text-brand-fg">{tech.full_name}</span>
                )}
              </div>
              <div role="cell" className={rowCardCellClass}>{tech.email ?? "—"}</div>
              <div role="cell" className={rowCardCellClass}>{tech.phone ?? "—"}</div>
              <div role="cell" className={rowCardCellClass}>{tech.active ? "Oui" : "Non"}</div>
              <div role="cell" className={rowCardCellClass}>
                {tech.user_id ? (emailByUserId.get(tech.user_id) ?? "Lié") : "Non lié"}
              </div>
              {isAdmin && (
                <div role="cell" className="justify-self-end">
                  <form action={deleteTechnician.bind(null, tech.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Supprimer le technicien « ${tech.full_name} » ? Cette action est irréversible.`}
                      className={iconButtonDangerClass}
                      ariaLabel={`Supprimer ${tech.full_name}`}
                      pendingLabel={
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                    </ConfirmSubmitButton>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {technicians?.length === 0 && (
        <p className={rowTableEmptyClass}>
          Aucun technicien pour le moment.{" "}
          {isAdmin && (
            <Link href="/technicians/new" className="text-accent-600 underline dark:text-accent-400">
              Ajoutez votre premier technicien.
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
