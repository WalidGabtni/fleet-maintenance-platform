"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { TruckIcon } from "../components/icons";

// Supabase's recovery/invite email links are supposed to land on /auth/finish,
// but its redirect_to allow-list matching has proven unreliable in production —
// real clicks sometimes land here on /login instead, with the session tokens
// still attached as a URL hash fragment. This catches that case so the token
// isn't silently dropped, instead of requiring the exact /auth/finish path.
function hasRecoveryHash() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.includes("access_token") || hash.includes("error");
}

export function RecoveryHashGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "none" | "processing">(
    hasRecoveryHash() ? "checking" : "none",
  );

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
      setStatus("none");
      return;
    }

    setStatus("processing");
    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          window.location.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        window.location.replace("/set-password");
      });
  }, []);

  if (status === "none") {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-500">
          <TruckIcon className="h-6 w-6 text-brand-bg" />
        </span>
        <p className="text-sm text-brand-fg-muted">Connexion en cours…</p>
      </div>
    </div>
  );
}
