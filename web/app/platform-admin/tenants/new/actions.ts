"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getSiteUrl } from "@/lib/site-url";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { friendlyError } from "@/lib/errors";

export async function createTenant(formData: FormData) {
  await requirePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(`/platform-admin/tenants/new?error=${encodeURIComponent("Le nom de l'entreprise est requis.")}`);
  }

  const adminEmail = String(formData.get("admin_email") ?? "").trim();

  const supabase = await getSupabaseClient();
  const { data: tenant, error } = await supabase.from("tenants").insert({ name }).select("id").single();
  if (error) redirect(`/platform-admin/tenants/new?error=${encodeURIComponent(friendlyError(error))}`);

  if (adminEmail) {
    const admin = getSupabaseAdminClient();
    const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(adminEmail, {
      redirectTo: `${getSiteUrl()}/auth/finish`,
      data: { tenant_id: tenant.id },
    });

    if (inviteError || !data.user) {
      revalidatePath("/platform-admin");
      redirect(
        `/platform-admin/tenants/${tenant.id}?error=${encodeURIComponent(
          `Tenant créé, mais l'invitation a échoué : ${inviteError?.message ?? "erreur inconnue"}`,
        )}`,
      );
    }

    // New profiles default to technicien (set by the DB trigger) — promote
    // to admin since this is the new tenant's first user. Platform admins
    // only have read access to other tenants' profiles, so this goes
    // through a dedicated RPC rather than a direct table update.
    const { error: roleError } = await supabase.rpc("promote_new_tenant_admin", {
      target_profile_id: data.user.id,
      target_tenant_id: tenant.id,
    });
    if (roleError) {
      redirect(`/platform-admin/tenants/${tenant.id}?error=${encodeURIComponent(friendlyError(roleError))}`);
    }
  }

  revalidatePath("/platform-admin");
  redirect(`/platform-admin/tenants/${tenant.id}?success=${encodeURIComponent("Tenant créé.")}`);
}
