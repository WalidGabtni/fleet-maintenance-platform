"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { ADMIN_ROLES, isAdminTier } from "@/lib/permissions";
import {
  ActivityIcon,
  BoxIcon,
  CalendarIcon,
  ChartIcon,
  ClipboardIcon,
  DashboardIcon,
  DatabaseIcon,
  FileTextIcon,
  MenuIcon,
  ReceiptIcon,
  SettingsIcon,
  ShieldIcon,
  TruckIcon,
  UsersIcon,
  WrenchIcon,
  XIcon,
} from "./icons";
import { AccountMenu } from "./AccountMenu";
import { NavRailItem, type NavSubsection } from "./NavRailItem";
import { SearchBox } from "./SearchBox";
import { alertRowsFrom } from "./NotificationBell";
import type { AlertCounts } from "@/lib/alerts";

type NavLink = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  exact?: boolean;
  // Omit to show this item to every role. Otherwise only these roles see it.
  roles?: Role[];
  // Omit for core sections that aren't feature-gated (dashboard, vehicles,
  // customers, technicians). Otherwise the tenant needs this feature enabled.
  feature?: string;
};

type NavGroup = {
  label: string;
  links: NavLink[];
  highlight?: boolean;
};

const operationsGroup: NavGroup = {
  label: "Opérations",
  links: [
    { href: "/", label: "Tableau de bord", icon: DashboardIcon, exact: true },
    { href: "/work-orders", label: "Bons de travail", icon: ClipboardIcon, feature: "work_orders" },
    {
      href: "/invoices",
      label: "Factures",
      icon: ReceiptIcon,
      roles: [...ADMIN_ROLES, "technicien"],
      feature: "invoicing",
    },
    { href: "/maintenance", label: "Entretien", icon: CalendarIcon, feature: "maintenance_scheduling" },
  ],
};

const clientsFleetGroup: NavGroup = {
  label: "Clients & flotte",
  links: [
    { href: "/vehicles", label: "Véhicules", icon: TruckIcon },
    { href: "/customers", label: "Clients", icon: UsersIcon, roles: [...ADMIN_ROLES, "superviseur", "technicien"] },
    { href: "/technicians", label: "Techniciens", icon: WrenchIcon },
    { href: "/documents", label: "Documents", icon: FileTextIcon },
  ],
};

const adminGroup: NavGroup = {
  label: "Administration",
  highlight: true,
  links: [
    { href: "/parts", label: "Pièces", icon: BoxIcon, roles: [...ADMIN_ROLES, "commis_pieces"], feature: "parts_inventory" },
    { href: "/reports", label: "Rapports", icon: ChartIcon, roles: ADMIN_ROLES, feature: "reporting" },
    { href: "/team", label: "Équipe", icon: ShieldIcon, roles: ADMIN_ROLES, feature: "manage_users" },
    { href: "/settings", label: "Paramètres de facturation", icon: SettingsIcon, roles: ADMIN_ROLES, feature: "invoicing" },
    { href: "/data-explorer", label: "Vue complète des données", icon: DatabaseIcon, roles: ADMIN_ROLES },
    { href: "/activity-log", label: "Journal d'activité", icon: ActivityIcon, roles: ADMIN_ROLES },
  ],
};

function groupsFor(role: Role | null, enabledFeatures: Set<string>): NavGroup[] {
  const groups = [operationsGroup, clientsFleetGroup];
  // The whole "Administration" group is worth showing if any of its items
  // would be visible — currently that means admin-tier or commis_pieces.
  if (isAdminTier(role) || role === "commis_pieces") groups.push(adminGroup);

  return groups
    .map((group) => ({
      ...group,
      links: group.links.filter(
        (link) =>
          (!link.roles || (role != null && link.roles.includes(role))) &&
          (!link.feature || enabledFeatures.has(link.feature)),
      ),
    }))
    .filter((group) => group.links.length > 0);
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-500">
        <TruckIcon className="h-5 w-5 text-brand-bg" />
      </span>
      <span className="text-sm font-semibold text-brand-fg">Fleet Data</span>
    </div>
  );
}

function subsectionsFor(link: NavLink): NavSubsection[] {
  const subsections: NavSubsection[] = [{ label: "Vue générale", href: link.href }];
  if (link.href === "/work-orders") {
    subsections.push({ label: "Bon de travail extérieur", comingSoon: true });
  }
  return subsections;
}

function RailLinks({
  pathname,
  role,
  enabledFeatures,
}: {
  pathname: string;
  role: Role | null;
  enabledFeatures: Set<string>;
}) {
  const groups = groupsFor(role, enabledFeatures);

  return (
    <nav className="flex flex-1 flex-col items-center gap-1 py-2">
      {groups.map((group, groupIndex) => (
        <div
          key={group.label}
          className={`flex flex-col items-center gap-1 ${groupIndex > 0 ? "mt-3 border-t border-brand-bg-raised pt-3" : ""}`}
        >
          {group.links.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <NavRailItem
                key={link.href}
                icon={link.icon}
                label={link.label}
                isActive={isActive}
                subsections={subsectionsFor(link)}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function NavLinks({
  pathname,
  role,
  enabledFeatures,
  onNavigate,
}: {
  pathname: string;
  role: Role | null;
  enabledFeatures: Set<string>;
  onNavigate?: () => void;
}) {
  const groups = groupsFor(role, enabledFeatures);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (activeRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const activeRect = activeRef.current.getBoundingClientRect();
      setIndicator({ top: activeRect.top - containerRect.top, height: activeRect.height });
    } else {
      setIndicator(null);
    }
  }, [pathname, role]);

  return (
    <nav ref={containerRef} className="relative flex flex-1 flex-col overflow-y-auto px-3 py-2">
      {indicator && (
        <div
          aria-hidden
          className="absolute left-3 right-3 rounded-md bg-brand-bg-raised transition-[top,height] duration-300 ease-out"
          style={{ top: indicator.top, height: indicator.height }}
        />
      )}
      {groups.map((group, groupIndex) => (
        <div key={group.label} className={groupIndex > 0 ? "mt-3 border-t border-brand-bg-raised pt-3" : undefined}>
          <p
            className={`px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider ${
              group.highlight ? "text-accent-400/80" : "text-brand-fg-faint"
            }`}
          >
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.links.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  ref={isActive ? activeRef : undefined}
                  href={link.href}
                  onClick={onNavigate}
                  className={`relative z-10 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive ? "text-accent-400" : "text-brand-fg-muted hover:text-brand-fg"
                  }`}
                >
                  <Icon className="h-5 w-5 transition-transform duration-200" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  role,
  fullName,
  email,
  enabledFeatures,
  isPlatformAdmin,
  tenantName,
  alertCounts,
}: {
  role: Role | null;
  fullName: string | null;
  email: string | null;
  enabledFeatures: Set<string>;
  isPlatformAdmin?: boolean;
  tenantName?: string | null;
  alertCounts: AlertCounts;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const alertRows = alertRowsFrom(alertCounts);
  const alertsTotal = alertRows.reduce((sum, r) => sum + r.count, 0);

  if (pathname === "/login" || pathname === "/set-password" || pathname === "/forgot-password") return null;

  return (
    <>
      {/* Desktop sidebar — fixed-width icon rail. Never expands or shifts
          content: hover shows a tooltip, click opens a floating flyout that
          overlays the page instead of pushing it. */}
      <div className="hidden h-full w-[4.5rem] shrink-0 flex-col items-center border-r border-brand-border-soft bg-brand-bg-inset py-5 md:flex">
        <Link
          href="/"
          aria-label="Fleet Data"
          className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-500"
        >
          <TruckIcon className="h-5 w-5 text-brand-bg" />
        </Link>
        <RailLinks pathname={pathname} role={role} enabledFeatures={enabledFeatures} />
      </div>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-brand-border-soft bg-brand-bg-inset px-4 text-brand-fg md:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <AccountMenu
            fullName={fullName}
            email={email}
            isPlatformAdmin={isPlatformAdmin}
            role={role}
            tenantName={tenantName}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="relative rounded-md p-1 text-brand-fg-muted transition-colors duration-200 hover:text-brand-fg active:scale-95"
          >
            <MenuIcon className="h-6 w-6" />
            {alertsTotal > 0 && (
              <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer — always mounted so open/close can transition */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Fermer le menu"
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-64 flex-col border-r border-brand-border-soft bg-brand-bg-inset text-brand-fg-muted shadow-xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col gap-1 px-5 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-md p-1 text-brand-fg-muted transition-colors duration-200 hover:text-brand-fg active:scale-95"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {/* The desktop header shows this in its own bar; on mobile that bar
                doesn't exist, so the drawer is where it belongs. */}
            {tenantName && (
              <p className="truncate text-xs text-brand-fg-faint" title={tenantName}>
                {tenantName}
              </p>
            )}
          </div>
          <div className="px-3">
            {/* The drawer is always dark regardless of the app's light/dark
                toggle (brand tokens, no dark: prefixes anywhere in this
                file) — SearchBox itself follows the toggle via dark: variants,
                so it's wrapped in a literal .dark scope here to force its
                dark styling on, matching the drawer around it. */}
            <div className="dark">
              <SearchBox onNavigate={() => setOpen(false)} />
            </div>
          </div>
          {alertRows.length > 0 && (
            <div className="mt-3 flex flex-col gap-1 border-t border-brand-bg-raised px-3 pt-3">
              {alertRows.map((row) => (
                <Link
                  key={row.key}
                  href={row.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-brand-fg-muted transition-colors duration-200 hover:text-brand-fg"
                >
                  <span>{row.label}</span>
                  <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
                    {row.count}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <NavLinks
            pathname={pathname}
            role={role}
            enabledFeatures={enabledFeatures}
            onNavigate={() => setOpen(false)}
          />
        </aside>
      </div>
    </>
  );
}
