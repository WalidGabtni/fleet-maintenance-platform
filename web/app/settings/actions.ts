"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { isCurrencyCode } from "@/lib/currency";
import { isAdminTier } from "@/lib/permissions";
import { friendlyError } from "@/lib/errors";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) {
    throw new Error("Seuls les administrateurs peuvent modifier les paramètres.");
  }
}

export async function updateShopSettings(formData: FormData) {
  await requireAdmin();
  const supabase = await getSupabaseClient();

  const hourlyLaborRate = Number(String(formData.get("hourly_labor_rate") ?? "").trim());
  const taxRatePercent = Number(String(formData.get("tax_rate_percent") ?? "").trim());
  if (!Number.isFinite(hourlyLaborRate) || hourlyLaborRate < 0) {
    redirect(`/settings?error=${encodeURIComponent("Le taux horaire doit être un nombre positif.")}`);
  }
  if (!Number.isFinite(taxRatePercent) || taxRatePercent < 0) {
    redirect(`/settings?error=${encodeURIComponent("Le taux de taxe doit être un nombre positif.")}`);
  }

  const currency = String(formData.get("currency") ?? "");
  if (!isCurrencyCode(currency)) {
    redirect(`/settings?error=${encodeURIComponent("Devise invalide.")}`);
  }

  const { error } = await supabase
    .from("shop_settings")
    .update({
      hourly_labor_rate: hourlyLaborRate,
      tax_rate: taxRatePercent / 100,
      currency,
      shop_name: String(formData.get("shop_name") ?? "").trim() || null,
      shop_address: String(formData.get("shop_address") ?? "").trim() || null,
      shop_phone: String(formData.get("shop_phone") ?? "").trim() || null,
      shop_email: String(formData.get("shop_email") ?? "").trim() || null,
    });
  if (error) redirect(`/settings?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/settings");
  redirect("/settings");
}
