"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { buttonClass, secondaryButtonClass, cardClass } from "@/lib/ui";
import { AlertTriangleIcon } from "./icons";

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  pendingLabel,
  ariaLabel,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
  pendingLabel?: React.ReactNode;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={ariaLabel}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
        onClick={() => setOpen(true)}
      >
        {pending ? (pendingLabel ?? "Suppression…") : children}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Fermer"
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <div
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className={`relative flex w-full max-w-sm flex-col gap-4 p-6 ${cardClass}`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <p id={titleId} className="text-sm text-app-fg dark:text-brand-fg">
                  {confirmMessage}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className={buttonClass} onClick={() => setOpen(false)}>
                  Confirmer
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
