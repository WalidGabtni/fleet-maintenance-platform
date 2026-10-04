"use client";

import { useState, useTransition } from "react";
import { generateReportsSummaryAction } from "./actions";
import { cardClass } from "@/lib/ui";

export function AISummary({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateReportsSummaryAction(startDate, endDate);
      if (result.error) {
        setError(result.error);
      } else if (result.text) {
        setSummary(result.text);
      }
    });
  }

  return (
    <div className={`flex flex-col gap-2 p-4 ${cardClass}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-app-fg dark:text-brand-fg-muted">Résumé de la période</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={pending}
          className="shrink-0 text-xs font-medium text-accent-600 transition-colors duration-150 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-accent-500 dark:hover:text-accent-400"
        >
          {pending ? "Génération…" : summary ? "✨ Régénérer" : "✨ Générer avec l'IA"}
        </button>
      </div>
      {summary && <p className="text-sm text-app-fg-muted dark:text-brand-fg-muted">{summary}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
