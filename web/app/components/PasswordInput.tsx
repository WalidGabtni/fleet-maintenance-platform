"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";
import { authInputClass, inputClass } from "@/lib/ui";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "className"> & {
  /** Force the always-brand (dark, cinematic) auth styling, ignoring the app's light/dark toggle. */
  auth?: boolean;
};

export function PasswordInput({ auth, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${auth ? authInputClass : inputClass} pr-10 transition-colors duration-150`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className={
          auth
            ? "absolute inset-y-0 right-0 flex items-center px-3 text-brand-fg-muted transition-colors duration-150 hover:text-brand-fg"
            : "absolute inset-y-0 right-0 flex items-center px-3 text-app-fg-faint transition-colors duration-150 hover:text-app-fg dark:text-brand-fg-muted dark:hover:text-brand-fg"
        }
      >
        <span className="relative block h-4 w-4">
          <EyeIcon
            className={`absolute inset-0 h-4 w-4 transition-all duration-150 ${
              visible ? "scale-75 opacity-0" : "scale-100 opacity-100"
            }`}
          />
          <EyeOffIcon
            className={`absolute inset-0 h-4 w-4 transition-all duration-150 ${
              visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
          />
        </span>
      </button>
    </div>
  );
}
