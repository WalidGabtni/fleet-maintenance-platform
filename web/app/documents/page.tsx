import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { isAdminTier } from "@/lib/permissions";
import { uploadDocument, deleteDocument } from "./actions";
import { ConfirmSubmitButton } from "../components/ConfirmSubmitButton";
import { SubmitButton } from "../components/SubmitButton";
import { FileTextIcon, TrashIcon } from "../components/icons";
import {
  inputClass,
  labelClass,
  cardClass,
  pageSubtextClass,
  iconButtonDangerClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowCardCellPrimaryClass,
  rowTableEmptyClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const profile = await getCurrentProfile();
  const canManage = isAdminTier(profile?.role);

  const supabase = await getSupabaseClient();
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const filePaths = (documents ?? []).map((d) => d.file_path);
  const { data: signedUrls } = filePaths.length
    ? await supabase.storage.from("documents").createSignedUrls(filePaths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] | null };
  const urlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className={pageSubtextClass}>Guides et fichiers de référence pour l&apos;atelier</p>
      </div>

      {canManage && (
        <form action={uploadDocument} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-end ${cardClass}`}>
          <div className="flex flex-1 flex-col gap-1">
            <label className={labelClass} htmlFor="name">Nom du document</label>
            <input className={inputClass} id="name" name="name" required />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className={labelClass} htmlFor="file">Fichier</label>
            <input className={inputClass} id="file" name="file" type="file" required />
          </div>
          <SubmitButton pendingLabel="Téléversement…">Téléverser</SubmitButton>
        </form>
      )}

      <div role="table" aria-label="Documents" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={{ gridTemplateColumns: "minmax(200px,3fr) 140px 40px" }} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Nom</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Ajouté le</div>
            <div role="columnheader" className={rowTableHeaderCellClass} />
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {documents?.map((doc) => {
            const url = urlByPath.get(doc.file_path);
            return (
              <div
                key={doc.id}
                role="row"
                style={{ gridTemplateColumns: "minmax(200px,3fr) 140px 40px" }}
                className={`${rowCardClass} ${rowCardBgClass}`}
              >
                <div role="cell" className={rowCardCellPrimaryClass}>
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4 shrink-0 text-app-fg-muted dark:text-brand-fg-muted" />
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
                        {doc.name}
                      </a>
                    ) : (
                      doc.name
                    )}
                  </div>
                </div>
                <div role="cell" className={rowCardCellClass}>{new Date(doc.created_at).toLocaleDateString()}</div>
                <div role="cell" className="justify-self-end">
                  {canManage && (
                    <form action={deleteDocument.bind(null, doc.id, doc.file_path)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Supprimer le document « ${doc.name} » ? Cette action est irréversible.`}
                        className={iconButtonDangerClass}
                        ariaLabel={`Supprimer ${doc.name}`}
                        pendingLabel={
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        }
                      >
                        <TrashIcon className="h-4 w-4" />
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {documents?.length === 0 && <p className={rowTableEmptyClass}>Aucun document pour le moment.</p>}
    </div>
  );
}
