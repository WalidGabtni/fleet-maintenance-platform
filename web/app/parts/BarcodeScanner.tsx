"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { secondaryButtonClass } from "@/lib/ui";

export function BarcodeScanner({ targetInputId }: { targetInputId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Only start the camera once `open` is true and React has actually mounted
  // the <video> element below — starting it eagerly from the click handler
  // races React's render/commit and hands ZXing a null ref, which it silently
  // replaces with a detached <video> element (camera runs, nothing visible).
  useEffect(() => {
    if (!open) return;

    let stopped = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, _err, controls) => {
        controlsRef.current = controls;
        if (result && !stopped) {
          stopped = true;
          const input = document.getElementById(targetInputId) as HTMLInputElement | null;
          if (input) {
            input.value = result.getText();
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
          controls.stop();
          setOpen(false);
        }
      })
      .catch(() => {
        setError("Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.");
      });

    return () => {
      stopped = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, targetInputId]);

  function start() {
    setError(null);
    setOpen(true);
  }

  function stop() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="shrink-0 text-xs font-medium text-accent-600 transition-colors duration-150 hover:text-accent-700 dark:text-accent-500 dark:hover:text-accent-400"
      >
        📷 Scanner un code-barres
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-app-surface p-4 dark:bg-brand-bg-raised">
            <p className="text-sm font-medium text-app-fg dark:text-brand-fg">Scanner un code-barres</p>
            <video ref={videoRef} className="w-full rounded-md bg-black" muted playsInline autoPlay />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="button" onClick={stop} className={secondaryButtonClass}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
}
