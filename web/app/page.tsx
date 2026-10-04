import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { getDashboardModules } from "@/lib/dashboardModules";
import { getEnabledFeatures } from "@/lib/features";
import { DashboardGrid } from "./components/DashboardGrid";
import { pageSubtextClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await getSupabaseClient();
  const [enabledFeatures, { data: hiddenRows }] = await Promise.all([
    getEnabledFeatures(),
    supabase.from("dashboard_hidden_modules").select("module_key").eq("user_id", profile.id),
  ]);
  const modules = await getDashboardModules(profile, enabledFeatures);

  const hiddenKeys = (hiddenRows ?? []).map((r) => r.module_key);

  return (
    <div className="flex flex-col gap-6" data-full-bleed>
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className={pageSubtextClass}>Aperçu du service de la flotte</p>
      </div>
      <DashboardGrid modules={modules} initialHiddenKeys={hiddenKeys} />
    </div>
  );
}
