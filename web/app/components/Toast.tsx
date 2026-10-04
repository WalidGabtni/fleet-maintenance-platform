"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ToastData = { type: "success" | "error"; message: string };

export function Toast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const paramsKey = searchParams.toString();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [handledKey, setHandledKey] = useState<string | null>(null);

  // Derive the toast from the URL during render (not in an effect) — this is
  // React's documented pattern for adjusting state when a prop changes.
  if (paramsKey !== handledKey && (success || error)) {
    setHandledKey(paramsKey);
    setToast({ type: success ? "success" : "error", message: success ?? error ?? "" });
  }

  useEffect(() => {
    if (!success && !error) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    params.delete("error");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // Only re-run when the URL's params actually change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center md:inset-x-auto md:right-6 md:justify-end">
      <div
        key={handledKey}
        role="status"
        aria-live="polite"
        className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${
          isSuccess
            ? "border-green-200 bg-green-50/95 text-green-800 dark:border-green-900/50 dark:bg-green-950/90 dark:text-green-300"
            : "border-red-200 bg-red-50/95 text-red-800 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-300"
        }`}
        style={{ animation: "toast-in 0.25s ease-out" }}
      >
        <span className="mt-0.5 text-base font-semibold leading-none">{isSuccess ? "✓" : "!"}</span>
        <p className="flex-1 text-sm">{toast.message}</p>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Fermer"
          className="text-lg leading-none opacity-60 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
