"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AuthHeroPanel } from "../components/AuthHeroPanel";
import { AuthCard } from "../components/AuthCard";
import { authInputClass, authLabelClass, buttonClass } from "@/lib/ui";
import { requestPasswordReset, verifyResetCode } from "../login/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(requestPasswordReset, undefined);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyResetCode, undefined);

  const step = requestState?.success ? "code" : "email";

  return (
    <AuthHeroPanel>
      <AuthCard>
        {step === "code" ? (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-brand-fg">Vérifiez vos e-mails</h1>
              <p className="mt-1 text-sm text-brand-fg-muted">
                Si un compte existe avec {email || "cette adresse"}, un code à 6 chiffres vient d&apos;être
                envoyé. Saisissez-le ci-dessous.
              </p>
            </div>

            <form action={verifyAction} className="flex flex-col gap-4">
              <input type="hidden" name="email" value={email} />
              <div className="flex flex-col gap-1">
                <label className={authLabelClass} htmlFor="code">
                  Code de vérification
                </label>
                <input
                  className={`${authInputClass} text-center text-2xl tracking-[0.5em]`}
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              {verifyState?.error && (
                <p className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{verifyState.error}</p>
              )}

              <button type="submit" disabled={verifyPending} className={`${buttonClass} disabled:opacity-60`}>
                {verifyPending ? "Vérification…" : "Vérifier le code"}
              </button>

              <Link href="/login" className="text-center text-sm text-brand-fg-muted hover:underline">
                ← Retour à la connexion
              </Link>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-brand-fg">Mot de passe oublié</h1>
              <p className="mt-1 text-sm text-brand-fg-muted">
                Entrez votre adresse e-mail pour recevoir un code de vérification
              </p>
            </div>

            <form
              action={(formData) => {
                setEmail(String(formData.get("email") ?? ""));
                return requestAction(formData);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <label className={authLabelClass} htmlFor="email">
                  E-mail
                </label>
                <input className={authInputClass} id="email" name="email" type="email" autoComplete="email" required />
              </div>

              {requestState?.error && (
                <p className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{requestState.error}</p>
              )}

              <button type="submit" disabled={requestPending} className={`${buttonClass} disabled:opacity-60`}>
                {requestPending ? "Envoi en cours…" : "Envoyer le code"}
              </button>

              <Link href="/login" className="text-center text-sm text-brand-fg-muted hover:underline">
                ← Retour à la connexion
              </Link>
            </form>
          </>
        )}
      </AuthCard>
    </AuthHeroPanel>
  );
}
