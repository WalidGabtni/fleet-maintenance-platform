"use client";

import { usePathname } from "next/navigation";

const AUTH_PATHS = ["/login", "/set-password", "/forgot-password"];

/** Auth pages render their own copy inside AuthHeroPanel (always-dark styling,
 * layered above the hero photo) — this one covers the rest of the app. */
export function BetaBar() {
  const pathname = usePathname();
  if (AUTH_PATHS.includes(pathname)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 border-t border-app-border bg-app-surface/95 px-4 py-2 text-center text-xs text-app-fg-muted backdrop-blur-sm dark:border-brand-border/50 dark:bg-brand-bg-inset/90 dark:text-brand-fg-muted md:left-[4.5rem]">
      <span className="rounded-full bg-accent-500/15 px-2 py-0.5 font-semibold text-accent-600 dark:text-accent-400">
        BÊTA
      </span>
      Cette application est en développement actif — des changements peuvent survenir.
    </div>
  );
}
