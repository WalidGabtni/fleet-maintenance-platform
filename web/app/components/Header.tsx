"use client";

import { usePathname } from "next/navigation";
import { AccountMenu } from "./AccountMenu";
import { NotificationBell } from "./NotificationBell";
import { SearchBox } from "./SearchBox";
import type { Role } from "@/lib/types";
import type { AlertCounts } from "@/lib/alerts";

export function Header({
  fullName,
  email,
  isPlatformAdmin,
  role,
  tenantName,
  alertCounts,
}: {
  fullName: string | null;
  email: string | null;
  isPlatformAdmin?: boolean;
  role?: Role | null;
  tenantName?: string | null;
  alertCounts: AlertCounts;
}) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/set-password" || pathname === "/forgot-password") return null;

  return (
    <header className="sticky top-0 z-20 hidden h-16 shrink-0 items-center gap-4 border-b border-app-border bg-app-surface px-8 dark:border-brand-border-soft dark:bg-brand-bg-raised md:flex">
      {/* Which company's data you're looking at — this app is multi-tenant, so
          it should never be ambiguous. */}
      {tenantName ? (
        <span className="shrink-0 truncate text-sm font-medium text-app-fg dark:text-brand-fg" title={tenantName}>
          {tenantName}
        </span>
      ) : (
        <span className="shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 justify-center px-4">
        <SearchBox className="w-full max-w-md" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <NotificationBell counts={alertCounts} />
        <AccountMenu
          fullName={fullName}
          email={email}
          isPlatformAdmin={isPlatformAdmin}
          role={role}
          tenantName={tenantName}
        />
      </div>
    </header>
  );
}
