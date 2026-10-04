"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { requirePlatformAdmin } from "@/lib/platformAdmin";
import { logActivityForTenant } from "@/lib/activityLog";
import { friendlyError } from "@/lib/errors";

export async function updateTenantName(tenantId: string, formData: FormData) {
  await requirePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/platform-admin/tenants/${tenantId}?error=${encodeURIComponent("Le nom est requis.")}`);

  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("tenants").update({ name }).eq("id", tenantId);
  if (error) redirect(`/platform-admin/tenants/${tenantId}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath(`/platform-admin/tenants/${tenantId}`);
  revalidatePath("/platform-admin");
}

export async function toggleTenantActive(tenantId: string) {
  await requirePlatformAdmin();

  const supabase = await getSupabaseClient();
  const { data: tenant, error: fetchError } = await supabase
    .from("tenants")
    .select("active")
    .eq("id", tenantId)
    .maybeSingle();
  if (fetchError) {
    redirect(`/platform-admin/tenants/${tenantId}?error=${encodeURIComponent(friendlyError(fetchError))}`);
  }
  if (!tenant) redirect(`/platform-admin/tenants/${tenantId}?error=${encodeURIComponent("Entreprise introuvable.")}`);

  const { error } = await supabase.from("tenants").update({ active: !tenant.active }).eq("id", tenantId);
  if (error) redirect(`/platform-admin/tenants/${tenantId}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath(`/platform-admin/tenants/${tenantId}`);
  revalidatePath("/platform-admin");
}

export async function toggleTenantFeature(tenantId: string, featureKey: string, enabled: boolean) {
  await requirePlatformAdmin();

  const supabase = await getSupabaseClient();

  const { data: existing } = await supabase
    .from("tenant_features")
    .select("enabled")
    .eq("tenant_id", tenantId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  const { error } = await supabase
    .from("tenant_features")
    .upsert({ tenant_id: tenantId, feature_key: featureKey, enabled }, { onConflict: "tenant_id,feature_key" });
  if (error) throw new Error(friendlyError(error));

  if (!existing || existing.enabled !== enabled) {
    await logActivityForTenant(tenantId, {
      action: "feature_toggled",
      entityType: "tenant_feature",
      description: `Fonctionnalité « ${featureKey} » ${enabled ? "activée" : "désactivée"} par un administrateur de la plateforme`,
      metadata: { feature_key: featureKey, enabled },
    });
  }

  revalidatePath(`/platform-admin/tenants/${tenantId}`);
}
