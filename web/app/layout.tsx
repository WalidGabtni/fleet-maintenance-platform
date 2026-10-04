import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { BetaBar } from "./components/BetaBar";
import { Toast } from "./components/Toast";
import { InlineScript } from "./components/InlineScript";
import { getCurrentProfile } from "@/lib/profile";
import { getEnabledFeatures } from "@/lib/features";
import { getSupabaseClient } from "@/lib/supabase";
import { getLowStockCount, getMaintenanceDueCounts, getOverdueInvoiceCount, type AlertCounts } from "@/lib/alerts";
import { canManageParts, isAdminTier } from "@/lib/permissions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fleet Data",
  description: "Fleet Data — suivi des bons de travail",
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("theme");var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=s?s==="dark":m;document.documentElement.classList.toggle("dark",dark)}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();
  const enabledFeatures = profile ? await getEnabledFeatures() : new Set<string>();

  // Same gates already shipped for the equivalent dashboard cards — kept
  // identical on purpose so the bell and the dashboard never disagree about
  // who should see what.
  const [lowStockCount, maintenanceDue, overdueInvoiceCount] = profile
    ? await (async () => {
        const supabase = await getSupabaseClient();
        return Promise.all([
          enabledFeatures.has("parts_inventory") && canManageParts(profile.role)
            ? getLowStockCount(supabase, profile.tenantId)
            : Promise.resolve(0),
          enabledFeatures.has("maintenance_scheduling")
            ? getMaintenanceDueCounts(supabase, profile.tenantId)
            : Promise.resolve({ overdue: 0, dueSoon: 0 }),
          isAdminTier(profile.role) && enabledFeatures.has("invoicing")
            ? getOverdueInvoiceCount(supabase, profile.tenantId)
            : Promise.resolve(0),
        ]);
      })()
    : [0, { overdue: 0, dueSoon: 0 }, 0];

  const alertCounts: AlertCounts = {
    lowStock: lowStockCount,
    maintenanceOverdue: maintenanceDue.overdue,
    maintenanceDueSoon: maintenanceDue.dueSoon,
    overdueInvoices: overdueInvoiceCount,
  };

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body className="flex h-full bg-app-surface-sunk text-app-fg dark:bg-brand-bg dark:text-brand-fg">
        <Sidebar
          role={profile?.role ?? null}
          fullName={profile?.fullName ?? null}
          email={profile?.email ?? null}
          enabledFeatures={enabledFeatures}
          isPlatformAdmin={profile?.isPlatformAdmin ?? false}
          tenantName={profile?.tenantName ?? null}
          alertCounts={alertCounts}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            fullName={profile?.fullName ?? null}
            email={profile?.email ?? null}
            isPlatformAdmin={profile?.isPlatformAdmin ?? false}
            role={profile?.role ?? null}
            tenantName={profile?.tenantName ?? null}
            alertCounts={alertCounts}
          />
          <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-16 pt-20 md:px-8 md:pb-16 md:pt-8">
            {/* max-w-5xl keeps most pages (forms, tables) at a readable
                width. The dashboard opts out via data-full-bleed — it's the
                one page meant to use the full available width. */}
            <div className="mx-auto w-full max-w-5xl [&:has(>[data-full-bleed])]:max-w-none">{children}</div>
          </main>
        </div>
        <BetaBar />
        <Suspense fallback={null}>
          <Toast />
        </Suspense>
      </body>
    </html>
  );
}
