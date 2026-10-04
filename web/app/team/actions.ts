"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCurrentProfile } from "@/lib/profile";
import { getSiteUrl } from "@/lib/site-url";
import { logActivity } from "@/lib/activityLog";
import { friendlyError } from "@/lib/errors";
import type { Role } from "@/lib/types";
import { ADMIN_ROLES, ALL_ROLES, ROLE_LABELS, isAdminTier } from "@/lib/permissions";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminTier(profile.role)) {
    throw new Error("Seuls les administrateurs peuvent gérer l'équipe.");
  }
  return profile;
}

// Active admin-tier (admin or directeur_service) headcount — the pool that
// must never hit zero, so the shop is never left with nobody who can manage
// users, billing, or settings.
async function activeAdminTierCount(supabase: Awaited<ReturnType<typeof getSupabaseClient>>) {
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .in("role", ADMIN_ROLES)
    .eq("active", true);
  return count ?? 0;
}

export async function inviteUser(formData: FormData) {
  const profile = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "technicien") as Role;
  if (!email) {
    redirect(`/team?error=${encodeURIComponent("Saisissez une adresse e-mail.")}`);
  }
  if (!ALL_ROLES.includes(role)) {
    redirect(`/team?error=${encodeURIComponent("Rôle invalide.")}`);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/finish`,
    data: { tenant_id: profile.tenantId },
  });

  if (error || !data.user) {
    const detail =
      error?.message || error?.code || (error ? JSON.stringify(error) : "") || "erreur inconnue";
    redirect(`/team?error=${encodeURIComponent(`Impossible d'inviter ${email} : ${detail}`)}`);
  }

  // New profiles default to technicien (set by the DB trigger) — only need
  // a follow-up update when a different role was actually chosen.
  if (role !== "technicien") {
    const supabase = await getSupabaseClient();
    const { error: roleError } = await supabase.from("profiles").update({ role }).eq("id", data.user.id);
    if (roleError) throw new Error(roleError.message);
  }

  revalidatePath("/team");
  redirect(`/team?success=${encodeURIComponent(`Invitation envoyée à ${email}.`)}`);
}

export async function updateUserRole(id: string, formData: FormData) {
  await requireAdmin();

  const role = String(formData.get("role") ?? "") as Role;
  if (!ALL_ROLES.includes(role)) {
    redirect(`/team?error=${encodeURIComponent("Rôle invalide.")}`);
  }

  const supabase = await getSupabaseClient();

  const { data: target } = await supabase.from("profiles").select("role, active, email").eq("id", id).maybeSingle();

  if (!ADMIN_ROLES.includes(role)) {
    const activeAdminTier = await activeAdminTierCount(supabase);
    if (target && ADMIN_ROLES.includes(target.role as Role) && target.active && activeAdminTier <= 1) {
      redirect(
        `/team?error=${encodeURIComponent("Au moins un administrateur ou directeur de service est requis.")}`,
      );
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) redirect(`/team?error=${encodeURIComponent(friendlyError(error))}`);

  if (target && target.role !== role) {
    await logActivity({
      action: "role_changed",
      entityType: "profile",
      entityId: id,
      description: `Rôle de ${target.email ?? id} changé de « ${ROLE_LABELS[target.role as Role]} » à « ${ROLE_LABELS[role]} »`,
      metadata: { from: target.role, to: role },
    });
  }

  revalidatePath("/team");
  redirect(`/team?success=${encodeURIComponent("Rôle mis à jour.")}`);
}

export async function toggleUserActive(id: string) {
  await requireAdmin();

  const supabase = await getSupabaseClient();

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("role, active, email")
    .eq("id", id)
    .maybeSingle();
  if (targetError) redirect(`/team?error=${encodeURIComponent(friendlyError(targetError))}`);
  if (!target) {
    redirect(`/team?error=${encodeURIComponent("Utilisateur introuvable.")}`);
  }

  const nextActive = !target.active;

  if (!nextActive && ADMIN_ROLES.includes(target.role as Role)) {
    const activeAdminTier = await activeAdminTierCount(supabase);
    if (activeAdminTier <= 1) {
      redirect(
        `/team?error=${encodeURIComponent("Au moins un administrateur ou directeur de service est requis.")}`,
      );
    }
  }

  const { error } = await supabase.from("profiles").update({ active: nextActive }).eq("id", id);
  if (error) redirect(`/team?error=${encodeURIComponent(friendlyError(error))}`);

  await logActivity({
    action: nextActive ? "activated" : "deactivated",
    entityType: "profile",
    entityId: id,
    description: nextActive ? `Accès réactivé pour ${target.email}` : `Accès désactivé pour ${target.email}`,
  });

  revalidatePath("/team");
  redirect(
    `/team?success=${encodeURIComponent(nextActive ? `Accès réactivé pour ${target.email}.` : `Accès désactivé pour ${target.email}.`)}`,
  );
}
