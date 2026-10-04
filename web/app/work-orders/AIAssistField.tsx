"use client";

import { useState, useTransition } from "react";
import { polishNotes } from "./actions";
import { inputClass, labelClass } from "@/lib/ui";

export function AIAssistField({
  id,
  name,
  label,
  rows,
  defaultValue,
  disabled,
  showAssist,
  required,
}: {
  id: string;
  name: string;
  label: string;
  rows: number;
  defaultValue: string;
  disabled: boolean;
  showAssist: boolean;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAssist() {
    setError(null);
    startTransition(async () => {
      const result = await polishNotes(label, value);
      if (result.error) {
        setError(result.error);
      } else if (result.text) {
        setValue(result.text);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className={labelClass} htmlFor={id}>{label}</label>
        {showAssist && (
          <button
            type="button"
            onClick={handleAssist}
            disabled={pending || !value.trim()}
            className="shrink-0 text-xs font-medium text-accent-600 transition-colors duration-150 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-accent-500 dark:hover:text-accent-400"
          >
            {pending ? "Amélioration…" : "✨ Améliorer avec l'IA"}
          </button>
        )}
      </div>
      <textarea
        className={`${inputClass} ${disabled ? "bg-app-surface-sunk text-app-fg-muted dark:bg-brand-bg-raised dark:text-brand-fg-faint" : ""}`}
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        required={required && !disabled}
      />
      {disabled && <input type="hidden" name={name} value={value} />}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
