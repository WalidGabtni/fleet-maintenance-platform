"use client";

import { useEffect } from "react";
import Link from "next/link";
import { cardClass, buttonClass } from "@/lib/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className={`flex max-w-md flex-col items-center gap-4 p-8 text-center ${cardClass}`}>
        <h1 className="text-xl font-semibold text-app-fg dark:text-brand-fg">Une erreur est survenue</h1>
        <p className="text-sm text-app-fg-muted dark:text-brand-fg-muted">
          Quelque chose s&apos;est mal passé. Réessayez, ou revenez au tableau de bord.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => reset()} className={buttonClass}>
            Réessayer
          </button>
          <Link href="/" className="text-sm text-app-fg-muted hover:underline dark:text-brand-fg-muted">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
