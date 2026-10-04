"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { TruckIcon } from "../../components/icons";

export function FinishAuth() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const hashError = hash.get("error_description") ?? hash.get("error");

    if (hashError) {
      window.location.replace(`/login?error=${encodeURIComponent(hashError)}`);
      return;
    }

    if (!accessToken || !refreshToken) {
      window.location.replace("/login?error=Lien+invalide+ou+expir%C3%A9");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: setSessionError }) => {
        if (setSessionError) {
          setError(setSessionError.message);
          return;
        }
        window.location.replace("/set-password");
      });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-500">
          <TruckIcon className="h-6 w-6 text-brand-bg" />
        </span>
        <p className="text-sm text-brand-fg-muted">
          {error ? `Une erreur est survenue : ${error}` : "Connexion en cours…"}
        </p>
        {error && (
          <Link href="/forgot-password" className="text-sm font-medium text-accent-400 hover:underline">
            Demander un nouveau lien
          </Link>
        )}
      </div>
    </div>
  );
}
