"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ModuleCardData } from "@/lib/dashboardModules";
import { hideModule, restoreModule } from "../actions";
import { ModuleCard } from "./ModuleCard";
import { PlusIcon } from "./icons";

export function DashboardGrid({
  modules,
  initialHiddenKeys,
}: {
  modules: ModuleCardData[];
  initialHiddenKeys: string[];
}) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set(initialHiddenKeys));
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function dismiss(key: string) {
    setHiddenKeys((prev) => new Set(prev).add(key));
    startTransition(() => {
      hideModule(key).catch(() => {
        setHiddenKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });
    });
  }

  function restore(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setMenuOpen(false);
    startTransition(() => {
      restoreModule(key).catch(() => {
        setHiddenKeys((prev) => new Set(prev).add(key));
      });
    });
  }

  const visible = modules.filter((m) => !hiddenKeys.has(m.key));
  const hidden = modules.filter((m) => hiddenKeys.has(m.key));

  return (
    <div className="flex flex-col gap-4">
      {hidden.length > 0 && (
        <div ref={menuRef} className="relative self-start">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
          >
            <PlusIcon className="h-4 w-4" />
            Ajouter un module
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
              {hidden.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => restore(m.key)}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visible.map((m) => (
          <ModuleCard key={m.key} module={m} onDismiss={dismiss} />
        ))}
        {visible.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            Tous les modules sont masqués. Utilisez « Ajouter un module » pour les restaurer.
          </p>
        )}
      </div>
    </div>
  );
}
