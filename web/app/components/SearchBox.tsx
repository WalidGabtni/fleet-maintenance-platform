"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { globalSearch, type GlobalSearchResults } from "../search-actions";
import { SearchIcon } from "./icons";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

const SECTION_LABELS: Record<keyof GlobalSearchResults, string> = {
  customers: "Clients",
  vehicles: "Véhicules",
  workOrders: "Bons de travail",
  parts: "Pièces",
  invoices: "Factures",
  technicians: "Techniciens",
};

export function SearchBox({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(() => {
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setResults(null);
        return;
      }
      startTransition(async () => {
        const response = await globalSearch(trimmed);
        if ("error" in response) {
          setError(response.error);
          setResults(null);
        } else {
          setError(null);
          setResults(response.results);
          setOpen(true);
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

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

  const hasAnyResults = results ? Object.values(results).some((rows) => rows.length > 0) : false;
  const showPanel = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-fg-faint dark:text-brand-fg-faint" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= MIN_QUERY_LENGTH && setOpen(true)}
          placeholder="Rechercher clients, véhicules, bons de travail…"
          aria-label="Recherche globale"
          className="w-full rounded-md border border-app-border bg-app-surface py-2 pl-9 pr-3 text-sm text-app-fg transition-colors duration-150 focus:border-accent-500 focus:outline-none dark:border-brand-border dark:bg-brand-bg-raised dark:text-brand-fg"
        />
      </div>
      {showPanel && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-96 w-full min-w-[20rem] overflow-y-auto rounded-md border border-app-border bg-app-surface shadow-lg dark:border-brand-border-soft dark:bg-brand-bg-raised">
          {pending && <p className="px-4 py-3 text-sm text-app-fg-muted dark:text-brand-fg-muted">Recherche…</p>}
          {!pending && error && <p className="px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!pending && !error && results && !hasAnyResults && (
            <p className="px-4 py-3 text-sm text-app-fg-muted dark:text-brand-fg-muted">Aucun résultat.</p>
          )}
          {!pending &&
            !error &&
            results &&
            hasAnyResults &&
            (Object.keys(SECTION_LABELS) as (keyof GlobalSearchResults)[])
              .filter((key) => results[key].length > 0)
              .map((key) => (
                <div key={key} className="border-b border-app-border-soft last:border-b-0 dark:border-brand-border-soft">
                  <p className="px-4 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-app-fg-faint dark:text-brand-fg-faint">
                    {SECTION_LABELS[key]}
                  </p>
                  {results[key].map((row) => (
                    <Link
                      key={row.id}
                      href={row.href}
                      onClick={() => {
                        setOpen(false);
                        onNavigate?.();
                      }}
                      className="block px-4 py-2 text-sm transition-colors duration-150 hover:bg-app-surface-sunk dark:hover:bg-brand-bg-inset"
                    >
                      <span className="font-medium text-app-fg dark:text-brand-fg">{row.primary}</span>
                      {row.secondary && (
                        <span className="ml-2 text-xs text-app-fg-muted dark:text-brand-fg-muted">{row.secondary}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
