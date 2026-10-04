"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, LogOutIcon, ShieldIcon, UserIcon } from "./icons";
import { signOut } from "../login/actions";
import { ThemeToggle } from "./ThemeToggle";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/lib/types";

function initialsFrom(fullName: string | null, email: string | null): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase() || "?";
  }
  if (email) return email[0]!.toUpperCase();
  return "?";
}

export function AccountMenu({
  fullName,
  email,
  isPlatformAdmin,
  role,
  tenantName,
}: {
  fullName: string | null;
  email: string | null;
  isPlatformAdmin?: boolean;
  role?: Role | null;
  tenantName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initials = initialsFrom(fullName, email);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Compte"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-app-surface-sunk dark:hover:bg-brand-bg-raised"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-semibold text-white">
          {initials}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-app-fg-faint transition-transform duration-200 dark:text-brand-fg-faint ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-app-border bg-app-surface shadow-lg dark:border-brand-border-soft dark:bg-brand-bg-raised">
          {(fullName || email || tenantName || role) && (
            <div className="flex flex-col gap-1.5 border-b border-app-border-soft px-4 py-3 dark:border-brand-border-soft">
              <div>
                {fullName && <p className="truncate text-sm font-medium text-app-fg dark:text-brand-fg">{fullName}</p>}
                {email && <p className="truncate text-xs text-app-fg-muted dark:text-brand-fg-muted">{email}</p>}
              </div>
              {role && (
                <span className="w-fit rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
                  {ROLE_LABELS[role] ?? role}
                </span>
              )}
              {tenantName && (
                <p className="truncate text-xs text-app-fg-faint dark:text-brand-fg-faint" title={tenantName}>
                  Connecté à <span className="font-medium">{tenantName}</span>
                </p>
              )}
            </div>
          )}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-app-fg-muted transition-colors duration-150 hover:bg-app-surface-sunk dark:text-brand-fg-muted dark:hover:bg-brand-bg-inset"
          >
            <UserIcon className="h-4 w-4" />
            Paramètres du compte
          </Link>
          {isPlatformAdmin && (
            <Link
              href="/platform-admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-app-fg-muted transition-colors duration-150 hover:bg-app-surface-sunk dark:text-brand-fg-muted dark:hover:bg-brand-bg-inset"
            >
              <ShieldIcon className="h-4 w-4" />
              Administration plateforme
            </Link>
          )}
          <div className="border-t border-app-border-soft dark:border-brand-border-soft">
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-app-fg-muted transition-colors duration-150 hover:bg-app-surface-sunk dark:text-brand-fg-muted dark:hover:bg-brand-bg-inset"
            >
              <LogOutIcon className="h-4 w-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
