"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { isAdminTier } from "@/lib/permissions";
import { friendlyDeleteError, friendlyError } from "@/lib/errors";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminTier(profile.role)) {
    throw new Error("Seuls les administrateurs peuvent gérer les documents.");
  }
  return profile;
}

export async function uploadDocument(formData: FormData) {
  const profile = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file");
  if (!name) redirect(`/documents?error=${encodeURIComponent("Le nom du document est requis.")}`);
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/documents?error=${encodeURIComponent("Un fichier est requis.")}`);
  }

  const supabase = await getSupabaseClient();
  const path = `${profile.tenantId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) redirect(`/documents?error=${encodeURIComponent("Échec du téléversement. Réessayez.")}`);

  const { error } = await supabase.from("documents").insert({ name, file_path: path });
  if (error) redirect(`/documents?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/documents");
}

export async function deleteDocument(id: string, filePath: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();

  const { error: storageError } = await supabase.storage.from("documents").remove([filePath]);
  if (storageError) redirect(`/documents?error=${encodeURIComponent("Échec de la suppression du fichier. Réessayez.")}`);

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) redirect(`/documents?error=${encodeURIComponent(friendlyDeleteError(error))}`);

  revalidatePath("/documents");
}
