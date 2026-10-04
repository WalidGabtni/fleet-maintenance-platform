"use client";

import { useState } from "react";
import { ImageIcon, XIcon } from "../components/icons";
import { labelClass } from "@/lib/ui";

export function PhotoCapture({ existingPhotoUrl }: { existingPhotoUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  const thumbnail = preview ?? existingPhotoUrl;

  return (
    <div className="flex flex-col gap-1">
      <label className={labelClass} htmlFor="photo">Photo de la pièce</label>
      <div className="flex items-center gap-3">
        {thumbnail ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="shrink-0 rounded-md transition-opacity duration-150 hover:opacity-80"
            aria-label="Agrandir la photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt="Aperçu de la pièce"
              className="h-16 w-16 rounded-md border border-app-border object-cover dark:border-brand-border"
            />
          </button>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-app-border text-app-fg-faint dark:border-brand-border dark:text-brand-fg-faint">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="text-sm text-app-fg-muted file:mr-3 file:rounded-md file:border-0 file:bg-app-surface-sunk file:px-3 file:py-2 file:text-sm file:font-medium file:text-app-fg hover:file:bg-app-border-soft dark:text-brand-fg-muted dark:file:bg-brand-bg-raised dark:file:text-brand-fg-muted dark:hover:file:bg-brand-bg-inset"
        />
      </div>
      <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">
        Facultatif — prenez une photo ou choisissez-en une depuis votre appareil.
        {thumbnail && " Cliquez sur la miniature pour l'agrandir."}
      </p>

      {lightboxOpen && thumbnail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Fermer"
            className="absolute right-4 top-4 rounded-md p-2 text-white/80 transition-colors duration-150 hover:text-white"
          >
            <XIcon className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt="Photo de la pièce agrandie"
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
