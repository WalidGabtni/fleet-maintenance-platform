"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthHeroPanel } from "../components/AuthHeroPanel";
import { AuthCard } from "../components/AuthCard";
import { PasswordInput } from "../components/PasswordInput";
import { authInputClass, authLabelClass, buttonClass } from "@/lib/ui";
import { login } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");
  const errorMessage = state?.error ?? linkError;
  const isExpiredLinkError = linkError === "Lien invalide ou expiré" && !state?.error;

  return (
    <AuthHeroPanel>
      <AuthCard>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={authLabelClass} htmlFor="email">
              E-mail
            </label>
            <input className={authInputClass} id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className={authLabelClass} htmlFor="password">
              Mot de passe
            </label>
            <PasswordInput id="password" name="password" autoComplete="current-password" required auth />
          </div>

          {errorMessage && (
            <div className="flex flex-col gap-2 rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">
              <p>{errorMessage}</p>
              {isExpiredLinkError && (
                <p>
                  Ce lien est souvent déjà utilisé au moment où vous cliquez (par ex. un antivirus ou un filtre
                  de sécurité qui l&apos;ouvre automatiquement).{" "}
                  <Link href="/forgot-password" className="font-medium underline hover:no-underline">
                    Demandez un nouveau lien
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          <button type="submit" disabled={pending} className={`${buttonClass} mt-2 disabled:opacity-60`}>
            {pending ? "Connexion en cours…" : "Se connecter"}
          </button>
          <Link href="/forgot-password" className="text-center text-sm text-brand-fg-muted hover:underline">
            Mot de passe oublié ?
          </Link>
        </form>
      </AuthCard>
    </AuthHeroPanel>
  );
}
