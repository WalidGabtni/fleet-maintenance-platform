"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircleIcon } from "../components/icons";
import { AuthHeroPanel } from "../components/AuthHeroPanel";
import { AuthCard } from "../components/AuthCard";
import { PasswordInput } from "../components/PasswordInput";
import { authLabelClass, buttonClass } from "@/lib/ui";
import { passwordRules, isPasswordStrong } from "@/lib/password";
import { setPassword } from "./actions";

function PasswordStrengthMeter({ password }: { password: string }) {
  const passed = useMemo(() => passwordRules.filter((rule) => rule.test(password)).length, [password]);
  const percent = (passed / passwordRules.length) * 100;

  const strengthColor =
    passed <= 2 ? "bg-red-500" : passed <= 4 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="flex flex-col gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-bg-inset">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${strengthColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {passwordRules.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
                met ? "text-green-400" : "text-brand-fg-faint"
              }`}
            >
              <CheckCircleIcon
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  met ? "scale-100" : "scale-90 opacity-50"
                }`}
              />
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPassword, undefined);
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const strong = isPasswordStrong(password);
  const matches = password.length > 0 && password === confirmPassword;
  const canSubmit = strong && matches && !pending;

  return (
    <AuthHeroPanel>
      <AuthCard>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-brand-fg">Définissez votre mot de passe</h1>
          <p className="mt-1 text-sm text-brand-fg-muted">
            Choisissez un mot de passe pour terminer la configuration de votre compte
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={authLabelClass} htmlFor="password">
              Nouveau mot de passe
            </label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              auth
            />
            <div className="mt-1">
              <PasswordStrengthMeter password={password} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={authLabelClass} htmlFor="confirm_password">
              Confirmer le mot de passe
            </label>
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              auth
            />
            <p
              className={`text-xs transition-opacity duration-200 ${
                confirmPassword.length > 0 && !matches ? "text-red-400 opacity-100" : "opacity-0"
              }`}
            >
              Les mots de passe ne correspondent pas
            </p>
          </div>

          {state?.error && (
            <p className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`${buttonClass} mt-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100`}
          >
            {pending ? "Enregistrement…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      </AuthCard>
    </AuthHeroPanel>
  );
}
