import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { addWorkOrderNote, addWorkOrderPart, deleteWorkOrder, removeWorkOrderPart, updateWorkOrder } from "../actions";
import { generateInvoice } from "../../invoices/actions";
import { WORK_ORDER_STATUSES } from "@/lib/types";
import { statusLabels } from "../StatusBadge";
import { ConfirmSubmitButton } from "../../components/ConfirmSubmitButton";
import { SubmitButton } from "../../components/SubmitButton";
import { AIAssistField } from "../AIAssistField";
import { WorkOrderCloseoutForm } from "../WorkOrderCloseoutForm";
import { VoiceNote } from "../VoiceNote";
import { TrashIcon } from "../../components/icons";
import { EntityThumbnail } from "../../components/EntityThumbnail";
import { signPartPhotoUrls } from "@/lib/partPhotos";
import { isAdminTier, canManageFleetOps } from "@/lib/permissions";
import { getEnabledFeatures } from "@/lib/features";
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  cardClass,
  dangerButtonClass,
  iconButtonDangerClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowCardFooterClass,
  rowTableEmptyClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseClient();

  const [{ data: workOrder }, { data: vehicles }, { data: technicians }, profile, enabledFeatures] =
    await Promise.all([
      supabase.from("work_orders").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("vehicles")
        .select("id, unit_number, make, model, customers(name)")
        .order("created_at", { ascending: false }),
      supabase.from("technicians").select("id, full_name").order("full_name"),
      getCurrentProfile(),
      getEnabledFeatures(),
    ]);

  if (!workOrder) notFound();

  const isBackOffice = isAdminTier(profile?.role);
  // Superviseur has full read/write on work_orders itself (reassignment,
  // status, diagnosis, delete) but — unlike admin/directeur_service — no
  // access to invoices, and no work_order_parts grant, so it's tracked
  // separately from isBackOffice below.
  const isFleetManager = canManageFleetOps(profile?.role);
  const isAssignedTech =
    profile?.role === "technicien" && profile?.technicianId != null && profile.technicianId === workOrder.technician_id;
  const isCommisPieces = profile?.role === "commis_pieces";
  const canEdit = isFleetManager || isAssignedTech || isCommisPieces;
  const canSeeNotes = canEdit;
  // Only admin/directeur_service/superviseur can transition a work order to
  // "completed" — enforced server-side by a DB trigger, this just keeps the
  // option out of reach in the UI for everyone else.
  const canMarkCompleted = isFleetManager;
  // Commis pièces has full work_order_parts access but read-only work_orders
  // — they can manage parts on any job without editing the job itself.
  // Superviseur has neither, so isn't included here.
  const canSeeParts = isBackOffice || profile?.role === "commis_pieces" || isAssignedTech;
  const canRemovePart = isBackOffice || profile?.role === "commis_pieces";
  // Invoices stay admin-tier only, except the existing (unchanged) technicien
  // carve-out for read access to invoices on their own assigned work order.
  const canSeeInvoice = isBackOffice || isAssignedTech;

  const [{ data: notes }, { data: parts }, { data: workOrderParts }, { data: invoice }] = await Promise.all([
    canSeeNotes
      ? supabase
          .from("work_order_notes")
          .select("*, technicians(full_name)")
          .eq("work_order_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canSeeParts
      ? supabase.from("parts").select("id, name, part_number, unit_cost, quantity_on_hand").order("name")
      : Promise.resolve({ data: [] }),
    canSeeParts
      ? supabase
          .from("work_order_parts")
          .select("*, parts(name, part_number, photo_url)")
          .eq("work_order_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canSeeInvoice
      ? supabase.from("invoices").select("id, invoice_number").eq("work_order_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const partsSubtotal = (workOrderParts ?? []).reduce(
    (sum, wop) => sum + wop.quantity_used * wop.unit_price_at_time,
    0,
  );

  const partPhotoUrls = await signPartPhotoUrls(
    supabase,
    (workOrderParts ?? []).map((wop) => (wop.parts as { photo_url: string | null } | null)?.photo_url),
  );

  const vehicle = vehicles?.find((v) => v.id === workOrder.vehicle_id);
  const technician = technicians?.find((t) => t.id === workOrder.technician_id);
  const vehicleLabel = vehicle
    ? [vehicle.unit_number, [vehicle.make, vehicle.model].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(" – ")
    : "—";

  const updateWithId = updateWorkOrder.bind(null, id);
  const addNoteWithId = addWorkOrderNote.bind(null, id);
  const addPartWithId = addWorkOrderPart.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/work-orders" className="text-sm text-app-fg-muted hover:underline dark:text-brand-fg-muted">
          ← Retour aux bons de travail
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-semibold">{canEdit ? "Modifier le bon de travail" : "Bon de travail"}</h1>

          {!canEdit && (
            <p className="rounded-md bg-app-surface-sunk px-4 py-3 text-sm text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-muted">
              Ce bon de travail ne vous est pas assigné, il est donc en lecture seule.
            </p>
          )}

          <WorkOrderCloseoutForm
            workOrderId={id}
            originalStatus={workOrder.status}
            action={canEdit ? updateWithId : undefined}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="vehicle_id">Véhicule</label>
              {isFleetManager ? (
                <select className={inputClass} id="vehicle_id" name="vehicle_id" defaultValue={workOrder.vehicle_id} required>
                  {vehicles?.map((v) => {
                    const customer = v.customers as { name: string } | null;
                    const label = [v.unit_number, [v.make, v.model].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(" – ");
                    return (
                      <option key={v.id} value={v.id}>
                        {label || v.id} {customer ? `(${customer.name})` : ""}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <>
                  <p className={`${inputClass} bg-app-surface-sunk text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-faint`}>{vehicleLabel}</p>
                  <input type="hidden" name="vehicle_id" value={workOrder.vehicle_id} />
                </>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="technician_id">Technicien</label>
              {isFleetManager ? (
                <select className={inputClass} id="technician_id" name="technician_id" defaultValue={workOrder.technician_id ?? ""}>
                  <option value="">Non assigné</option>
                  {technicians?.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              ) : (
                <>
                  <p className={`${inputClass} bg-app-surface-sunk text-app-fg-muted`}>{technician?.full_name ?? "Non assigné"}</p>
                  <input type="hidden" name="technician_id" value={workOrder.technician_id ?? ""} />
                </>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="status">Statut</label>
              <select
                className={inputClass}
                id="status"
                name="status"
                defaultValue={workOrder.status}
                disabled={!canEdit}
              >
                {WORK_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === "completed" && !canMarkCompleted}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            <AIAssistField
              id="reported_issue"
              name="reported_issue"
              label="Problème signalé"
              rows={3}
              defaultValue={workOrder.reported_issue}
              disabled={!isFleetManager}
              showAssist={isFleetManager}
              required
            />
            <AIAssistField
              id="diagnosis"
              name="diagnosis"
              label="Diagnostic"
              rows={2}
              defaultValue={workOrder.diagnosis ?? ""}
              disabled={!canEdit}
              showAssist={canEdit}
            />
            <AIAssistField
              id="work_performed"
              name="work_performed"
              label="Travaux effectués"
              rows={2}
              defaultValue={workOrder.work_performed ?? ""}
              disabled={!canEdit}
              showAssist={canEdit}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass} htmlFor="mileage_at_service">Kilométrage au service</label>
                <input className={inputClass} id="mileage_at_service" name="mileage_at_service" type="number" defaultValue={workOrder.mileage_at_service ?? ""} disabled={!canEdit} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass} htmlFor="labor_hours">Heures de main-d&apos;œuvre</label>
                <input className={inputClass} id="labor_hours" name="labor_hours" type="number" step="0.25" defaultValue={workOrder.labor_hours ?? ""} disabled={!canEdit} />
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-3">
                <SubmitButton>Enregistrer les modifications</SubmitButton>
                <Link href="/work-orders" className={secondaryButtonClass}>Annuler</Link>
              </div>
            )}
          </WorkOrderCloseoutForm>
          {canSeeInvoice && (
            <div>
              {invoice ? (
                <Link href={`/invoices/${invoice.id}`} className={secondaryButtonClass}>
                  Voir la facture ({invoice.invoice_number})
                </Link>
              ) : (
                isBackOffice &&
                workOrder.status === "completed" && (
                  <form action={generateInvoice.bind(null, id)}>
                    <SubmitButton pendingLabel="Génération…">Générer la facture</SubmitButton>
                  </form>
                )
              )}
            </div>
          )}
          {isFleetManager && (
            <form action={deleteWorkOrder.bind(null, id)}>
              <ConfirmSubmitButton
                confirmMessage={`Supprimer le bon de travail « ${workOrder.reported_issue} » ? Cette action est irréversible.`}
                className={`${dangerButtonClass} flex items-center gap-2`}
                pendingLabel={
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                }
              >
                <TrashIcon className="h-4 w-4" />
                Supprimer le bon de travail
              </ConfirmSubmitButton>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Notes / Chronologie</h2>

          {!canSeeNotes ? (
            <p className="rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-fg-muted dark:border-brand-border dark:text-brand-fg-muted">
              Les notes sont visibles uniquement par le technicien assigné et les administrateurs.
            </p>
          ) : (
            <>
              {enabledFeatures.has("voice_notes") && (
                <VoiceNote workOrderId={id} technicianId={profile?.technicianId ?? null} />
              )}
              <form action={addNoteWithId} className={`flex flex-col gap-3 p-4 ${cardClass}`}>
                <div className="flex flex-col gap-1">
                  <label className={labelClass} htmlFor="note">Ajouter une note</label>
                  <textarea className={inputClass} id="note" name="note" rows={2} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass} htmlFor="note_technician_id">Par</label>
                  <select
                    className={inputClass}
                    id="note_technician_id"
                    name="technician_id"
                    defaultValue={profile?.technicianId ?? ""}
                  >
                    <option value="">Non précisé</option>
                    {technicians?.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <SubmitButton>Ajouter la note</SubmitButton>
              </form>

              <ul className="flex flex-col gap-3">
                {notes?.map((note) => {
                  const noteTechnician = note.technicians as { full_name: string } | null;
                  return (
                    <li key={note.id} className={`p-4 ${cardClass}`}>
                      <p className="text-sm text-app-fg dark:text-brand-fg">{note.note}</p>
                      <p className="mt-2 text-xs text-app-fg-muted dark:text-brand-fg-muted">
                        {noteTechnician?.full_name ?? "Non précisé"} · {new Date(note.created_at).toLocaleString()}
                      </p>
                    </li>
                  );
                })}
                {notes?.length === 0 && (
                  <li className="rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-fg-muted dark:border-brand-border dark:text-brand-fg-muted">
                    Aucune note pour le moment.
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>

      {canSeeParts && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Pièces utilisées</h2>

          {parts?.length === 0 ? (
            <p className="rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-fg-muted dark:border-brand-border dark:text-brand-fg-muted">
              Aucune pièce disponible dans le catalogue.
            </p>
          ) : (
            <form action={addPartWithId} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-end ${cardClass}`}>
              <div className="flex flex-1 flex-col gap-1">
                <label className={labelClass} htmlFor="part_id">Pièce</label>
                <select className={inputClass} id="part_id" name="part_id" required defaultValue="">
                  <option value="" disabled>Sélectionner une pièce…</option>
                  {parts?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.part_number ? `(${p.part_number})` : ""} — {p.quantity_on_hand} en stock
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:w-32">
                <label className={labelClass} htmlFor="quantity_used">Quantité</label>
                <input className={inputClass} id="quantity_used" name="quantity_used" type="number" min="1" step="1" defaultValue="1" required />
              </div>
              <SubmitButton>Ajouter</SubmitButton>
            </form>
          )}

          {(() => {
            const gridCols = canRemovePart
              ? "minmax(180px,2fr) 110px 130px 110px 40px"
              : "minmax(180px,2fr) 110px 130px 110px";
            const gridStyle = { gridTemplateColumns: gridCols };
            const footerValueSpan = canRemovePart ? "4 / span 2" : "4 / span 1";
            return (
              <div role="table" aria-label="Pièces utilisées" className={rowTableWrapperClass}>
                <div role="rowgroup">
                  <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
                    <div role="columnheader" className={rowTableHeaderCellClass}>Pièce</div>
                    <div role="columnheader" className={rowTableHeaderCellClass}>Quantité</div>
                    <div role="columnheader" className={rowTableHeaderCellClass}>Prix unitaire</div>
                    <div role="columnheader" className={rowTableHeaderCellClass}>Coût</div>
                    {canRemovePart && <div role="columnheader" className={rowTableHeaderCellClass} />}
                  </div>
                </div>
                <div role="rowgroup" className={rowTableBodyClass}>
                  {workOrderParts?.map((wop) => {
                    const wopPart = wop.parts as { name: string; part_number: string | null; photo_url: string | null } | null;
                    const photoUrl = wopPart?.photo_url ? partPhotoUrls.get(wopPart.photo_url) : undefined;
                    const lineCost = wop.quantity_used * wop.unit_price_at_time;
                    return (
                      <div key={wop.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
                        <div role="cell">
                          <EntityThumbnail photoUrl={photoUrl} title={wopPart?.name ?? "—"} subtitle={wopPart?.part_number} size="sm" />
                        </div>
                        <div role="cell" className={rowCardCellClass}>{wop.quantity_used}</div>
                        <div role="cell" className={rowCardCellClass}>{wop.unit_price_at_time.toFixed(2)}</div>
                        <div role="cell" className={rowCardCellClass}>{lineCost.toFixed(2)}</div>
                        {canRemovePart && (
                          <div role="cell" className="justify-self-end">
                            <form action={removeWorkOrderPart.bind(null, wop.id, id)}>
                              <ConfirmSubmitButton
                                confirmMessage={`Retirer « ${wopPart?.name ?? "cette pièce"} » de ce bon de travail ? Le stock sera remis à jour.`}
                                className={iconButtonDangerClass}
                                ariaLabel={`Retirer ${wopPart?.name ?? "cette pièce"}`}
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
                    );
                  })}
                </div>
                {workOrderParts && workOrderParts.length > 0 && (
                  <div role="rowgroup">
                    <div role="row" style={gridStyle} className={rowCardFooterClass}>
                      <div role="cell" style={{ gridColumn: "1 / span 3" }}>Sous-total pièces</div>
                      <div role="cell" style={{ gridColumn: footerValueSpan }}>{partsSubtotal.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {workOrderParts?.length === 0 && <p className={rowTableEmptyClass}>Aucune pièce ajoutée.</p>}
        </div>
      )}
    </div>
  );
}
