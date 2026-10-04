"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { checkWorkOrderCloseout, logCloseoutOverride, type CloseoutCheckResult } from "./actions";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";

export function WorkOrderCloseoutForm({
  workOrderId,
  originalStatus,
  action,
  className,
  children,
}: {
  workOrderId: string;
  originalStatus: string;
  action?: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const [result, setResult] = useState<CloseoutCheckResult | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<FormData | null>(null);
  const [checking, startChecking] = useTransition();
  const [closing, startClosing] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!action) return;

    const form = event.currentTarget;
    const status = (form.elements.namedItem("status") as HTMLSelectElement | null)?.value;
    if (status !== "completed" || originalStatus === "completed") return;

    event.preventDefault();
    const formData = new FormData(form);
    startChecking(async () => {
      const checkResult = await checkWorkOrderCloseout(workOrderId);
      if (checkResult.warnings.length === 0) {
        action(formData);
      } else {
        setResult(checkResult);
        setPendingSubmit(formData);
      }
    });
  }

  function goBack() {
    setResult(null);
    setPendingSubmit(null);
  }

  function closeAnyway() {
    if (!result || !pendingSubmit || !action) return;
    startClosing(async () => {
      await logCloseoutOverride(workOrderId, result.warnings);
      action(pendingSubmit);
      setResult(null);
      setPendingSubmit(null);
    });
  }

  return (
    <>
      <form action={action} onSubmit={handleSubmit} className={className}>
        {children}
        {checking && (
          <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">Vérification avant clôture…</p>
        )}
      </form>

      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-app-surface p-5 dark:bg-brand-bg-raised">
            <div>
              <h2 className="text-lg font-semibold text-app-fg dark:text-brand-fg">
                Vérifier avant de clôturer
              </h2>
              <p className="mt-1 text-sm text-app-fg-muted dark:text-brand-fg-muted">
                Ce bon de travail passe à « Terminé », mais quelques points méritent d&apos;être vérifiés avant de continuer.
              </p>
            </div>

            <ul className="flex flex-col gap-2">
              {result.warnings.map((warning) => (
                <li
                  key={warning}
                  className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span aria-hidden>⚠️</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-app-border p-3 text-sm dark:border-brand-border-soft">
              <dt className="text-app-fg-muted dark:text-brand-fg-muted">Heures de main-d&apos;œuvre</dt>
              <dd className="text-app-fg dark:text-brand-fg">{result.laborHours ?? "0"}</dd>
              <dt className="text-app-fg-muted dark:text-brand-fg-muted">Pièces enregistrées</dt>
              <dd className="text-app-fg dark:text-brand-fg">{result.partsCount}</dd>
              <dt className="col-span-2 text-app-fg-muted dark:text-brand-fg-muted">Travaux effectués</dt>
              <dd className="col-span-2 text-app-fg dark:text-brand-fg">
                {result.workPerformed || "—"}
              </dd>
            </dl>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={goBack} className={secondaryButtonClass}>
                Revenir corriger
              </button>
              <button
                type="button"
                onClick={closeAnyway}
                disabled={closing}
                className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {closing ? "Clôture…" : "Clôturer quand même"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
