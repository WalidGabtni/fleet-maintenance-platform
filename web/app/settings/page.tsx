import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { updateShopSettings } from "./actions";
import { SUPPORTED_CURRENCIES, isCurrencyCode } from "@/lib/currency";
import { SubmitButton } from "../components/SubmitButton";
import { isAdminTier } from "@/lib/permissions";
import { requireFeature } from "@/lib/features";
import { inputClass, labelClass, pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) redirect("/");
  await requireFeature("invoicing");

  const supabase = await getSupabaseClient();
  const { data: settings, error } = await supabase.from("shop_settings").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!settings) {
    return (
      <div className="flex max-w-lg flex-col gap-2">
        <h1 className="text-2xl font-semibold">Paramètres de facturation</h1>
        <p className={pageSubtextClass}>
          Aucun paramètre configuré pour votre entreprise. Contactez un administrateur de la plateforme.
        </p>
      </div>
    );
  }
  const currentCurrency = isCurrencyCode(settings.currency) ? settings.currency : "CAD";

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres de facturation</h1>
        <p className={pageSubtextClass}>Taux et coordonnées utilisés pour générer les factures</p>
      </div>
      <form action={updateShopSettings} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="hourly_labor_rate">Taux horaire de main-d&apos;œuvre</label>
          <input
            className={inputClass}
            id="hourly_labor_rate"
            name="hourly_labor_rate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings.hourly_labor_rate}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="tax_rate_percent">Taux de taxe (%)</label>
          <input
            className={inputClass}
            id="tax_rate_percent"
            name="tax_rate_percent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={(settings.tax_rate * 100).toFixed(2)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="currency">Devise de l&apos;atelier</label>
          <select className={inputClass} id="currency" name="currency" defaultValue={currentCurrency}>
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">
            Devise réelle des factures. Les autres devises ne sont proposées qu&apos;à titre d&apos;affichage indicatif
            sur une facture.
          </p>
        </div>

        <div className="mt-2 border-t border-app-border pt-4 dark:border-brand-border-soft">
          <h2 className="text-sm font-semibold text-app-fg dark:text-brand-fg-muted">En-tête des factures</h2>
          <p className="mt-1 text-xs text-app-fg-muted dark:text-brand-fg-muted">Affiché en haut des factures PDF.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="shop_name">Nom de l&apos;atelier</label>
          <input className={inputClass} id="shop_name" name="shop_name" defaultValue={settings.shop_name ?? ""} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="shop_address">Adresse</label>
          <textarea
            className={inputClass}
            id="shop_address"
            name="shop_address"
            rows={2}
            defaultValue={settings.shop_address ?? ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="shop_phone">Téléphone</label>
            <input className={inputClass} id="shop_phone" name="shop_phone" defaultValue={settings.shop_phone ?? ""} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="shop_email">E-mail</label>
            <input
              className={inputClass}
              id="shop_email"
              name="shop_email"
              type="email"
              defaultValue={settings.shop_email ?? ""}
            />
          </div>
        </div>

        <SubmitButton>Enregistrer</SubmitButton>
      </form>
    </div>
  );
}
