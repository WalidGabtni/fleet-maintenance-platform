import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { deleteCustomer } from "./actions";
import { ConfirmSubmitButton } from "../components/ConfirmSubmitButton";
import { PlusIcon, TrashIcon } from "../components/icons";
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

export default async function CustomersPage() {
  const supabase = await getSupabaseClient();
  const [{ data: customers, error }, profile] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    getCurrentProfile(),
  ]);
  const isAdmin = canManageFleetOps(profile?.role);

  if (error) throw new Error(error.message);

  const gridCols = isAdmin
    ? "minmax(160px,2fr) minmax(120px,1fr) minmax(160px,1.5fr) 40px"
    : "minmax(160px,2fr) minmax(120px,1fr) minmax(160px,1.5fr)";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        {isAdmin && (
          <Link href="/customers/new" className={`${buttonClass} flex items-center gap-2`}>
            <PlusIcon className="h-4 w-4" />
            Nouveau client
          </Link>
        )}
      </div>

      <div role="table" aria-label="Clients" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Téléphone</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>E-mail</div>
            {isAdmin && <div role="columnheader" className={rowTableHeaderCellClass} />}
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {customers?.map((customer) => (
            <div key={customer.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
              <div role="cell">
                {isAdmin ? (
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-app-fg hover:underline dark:text-brand-fg"
                  >
                    {customer.name}
                  </Link>
                ) : (
                  <span className="font-medium text-app-fg dark:text-brand-fg">{customer.name}</span>
                )}
              </div>
              <div role="cell" className={rowCardCellClass}>{customer.phone ?? "—"}</div>
              <div role="cell" className={rowCardCellClass}>{customer.email ?? "—"}</div>
              {isAdmin && (
                <div role="cell" className="justify-self-end">
                  <form action={deleteCustomer.bind(null, customer.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Supprimer le client « ${customer.name} » ? Cette action est irréversible.`}
                      className={iconButtonDangerClass}
                      ariaLabel={`Supprimer ${customer.name}`}
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
      {customers?.length === 0 && (
        <p className={rowTableEmptyClass}>
          Aucun client pour le moment.{" "}
          {isAdmin && (
            <Link href="/customers/new" className="text-accent-600 underline dark:text-accent-400">
              Ajoutez votre premier client.
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
