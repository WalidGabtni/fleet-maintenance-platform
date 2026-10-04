"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentProfile } from "@/lib/profile";
import { getSiteUrl } from "@/lib/site-url";
import { canManageFleetOps } from "@/lib/permissions";
import { friendlyDeleteError, friendlyError } from "@/lib/errors";

type LinkResult = { userId: string | null; invited: boolean };

async function resolveLinkedUserId(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  linkedEmail: string,
  redirectTo: string,
  tenantId: string,
): Promise<LinkResult> {
  if (!linkedEmail) return { userId: null, invited: false };

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", linkedEmail)
    .maybeSingle();

  if (existingProfile) return { userId: existingProfile.id, invited: false };

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(linkedEmail, {
    redirectTo: `${getSiteUrl()}/auth/finish`,
    data: { tenant_id: tenantId },
  });

  if (error || !data.user) {
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        `Impossible d'inviter ${linkedEmail} : ${error?.message ?? "erreur inconnue"}`,
      )}`,
    );
  }

  return { userId: data.user.id, invited: true };
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !canManageFleetOps(profile.role)) {
    throw new Error("Seuls les administrateurs peuvent gérer les techniciens.");
  }
  return profile;
}

export async function createTechnician(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await getSupabaseClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) redirect(`/technicians/new?error=${encodeURIComponent("Le nom est requis.")}`);

  const email = String(formData.get("email") ?? "").trim();
  const grantAccess = formData.get("grant_access") === "on";

  if (grantAccess && !email) {
    redirect(
      `/technicians/new?error=${encodeURIComponent("Saisissez une adresse e-mail pour donner un accès de connexion.")}`,
    );
  }

  const { userId, invited } = grantAccess
    ? await resolveLinkedUserId(supabase, email, "/technicians/new", profile.tenantId)
    : { userId: null, invited: false };

  const { error } = await supabase.from("technicians").insert({
    full_name: fullName,
    email: email || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    active: formData.get("active") === "on",
    user_id: userId,
  });
  if (error) redirect(`/technicians/new?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/technicians");
  const success = invited ? `Technicien créé — invitation envoyée à ${email}.` : "Technicien créé.";
  redirect(`/technicians?success=${encodeURIComponent(success)}`);
}

export async function updateTechnician(id: string, formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await getSupabaseClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) redirect(`/technicians/${id}?error=${encodeURIComponent("Le nom est requis.")}`);

  const { data: existing } = await supabase.from("technicians").select("user_id").eq("id", id).maybeSingle();
  const currentlyLinked = existing?.user_id != null;

  const email = String(formData.get("email") ?? "").trim();
  const unlinkAccess = formData.get("unlink_access") === "on";
  const grantAccess = formData.get("grant_access") === "on";

  let userId = existing?.user_id ?? null;
  let invited = false;

  if (currentlyLinked && unlinkAccess) {
    userId = null;
  } else if (!currentlyLinked && grantAccess) {
    if (!email) {
      redirect(
        `/technicians/${id}?error=${encodeURIComponent("Saisissez une adresse e-mail pour donner un accès de connexion.")}`,
      );
    }
    const result = await resolveLinkedUserId(supabase, email, `/technicians/${id}`, profile.tenantId);
    userId = result.userId;
    invited = result.invited;
  }

  const { error } = await supabase
    .from("technicians")
    .update({
      full_name: fullName,
      email: email || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      active: formData.get("active") === "on",
      user_id: userId,
    })
    .eq("id", id);
  if (error) redirect(`/technicians/${id}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/technicians");
  const success = invited
    ? `Enregistré — invitation envoyée à ${email}.`
    : unlinkAccess && currentlyLinked
      ? "Enregistré — accès de connexion dissocié."
      : "Enregistré.";
  redirect(`/technicians?success=${encodeURIComponent(success)}`);
}

export async function deleteTechnician(id: string) {
  await requireAdmin();
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("technicians").delete().eq("id", id);
  if (error) redirect(`/technicians?error=${encodeURIComponent(friendlyDeleteError(error))}`);

  revalidatePath("/technicians");
  redirect("/technicians");
}
