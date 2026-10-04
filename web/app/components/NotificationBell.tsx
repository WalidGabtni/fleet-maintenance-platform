"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellIcon, CheckCircleIcon } from "./icons";
import type { AlertCounts } from "@/lib/alerts";

export type AlertRow = { key: string; label: string; detail?: string; count: number; href: string };

export function alertRowsFrom(counts: AlertCounts): AlertRow[] {
  const rows: AlertRow[] = [];

  if (counts.lowStock > 0) {
    rows.push({
      key: "parts",
      label: "Pièces sous le seuil de stock bas",
      count: counts.lowStock,
      href: "/parts/low-stock",
    });
  }

  const maintTotal = counts.maintenanceOverdue + counts.maintenanceDueSoon;
  if (maintTotal > 0) {
    rows.push({
      key: "maintenance",
      label: "Entretien à planifier",
      detail:
        counts.maintenanceOverdue > 0 && counts.maintenanceDueSoon > 0
          ? `${counts.maintenanceOverdue} en retard · ${counts.maintenanceDueSoon} bientôt dus`
          : counts.maintenanceOverdue > 0
            ? `${counts.maintenanceOverdue} en retard`
            : `${counts.maintenanceDueSoon} bientôt dus`,
      count: maintTotal,
      href: "/maintenance",
    });
  }

  if (counts.overdueInvoices > 0) {
    rows.push({
      key: "invoices",
      label: "Factures en retard",
      count: counts.overdueInvoices,
      href: "/invoices?status=sent",
    });
  }

  return rows;
}

export function NotificationBell({ counts }: { counts: AlertCounts }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rows = alertRowsFrom(counts);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-app-fg-muted transition-colors duration-150 hover:bg-app-surface-sunk dark:text-brand-fg-muted dark:hover:bg-brand-bg-raised"
      >
        <BellIcon className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-md border border-app-border bg-app-surface shadow-lg dark:border-brand-border-soft dark:bg-brand-bg-raised">
          <p className="border-b border-app-border-soft px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-app-fg-faint dark:border-brand-border-soft dark:text-brand-fg-faint">
            Notifications
          </p>
          {rows.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-app-fg-muted dark:text-brand-fg-muted">
              <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              Tout est à jour.
            </div>
          ) : (
            rows.map((row) => (
              <Link
                key={row.key}
                href={row.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors duration-150 hover:bg-app-surface-sunk dark:hover:bg-brand-bg-inset"
              >
                <span>
                  <span className="block font-medium text-app-fg dark:text-brand-fg">{row.label}</span>
                  {row.detail && (
                    <span className="block text-xs text-app-fg-muted dark:text-brand-fg-muted">{row.detail}</span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  {row.count}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
