"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blobToWav } from "./audioToWav";
import { transcribeVoiceNote, addWorkOrderNote } from "./actions";
import { buttonClass, secondaryButtonClass, inputClass, labelClass, cardClass } from "@/lib/ui";

type State =
  | { kind: "idle" }
  | { kind: "recording"; seconds: number }
  | { kind: "processing" }
  | {
      kind: "review";
      transcript: string;
      suggestedLaborHours: number | null;
      suggestedParts: string[];
    }
  | { kind: "error"; message: string };

const MAX_RECORDING_SECONDS = 120;

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceNote({
  workOrderId,
  technicianId,
}: {
  workOrderId: string;
  technicianId: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [editedText, setEditedText] = useState("");
  const [saving, startSaving] = useTransition();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }

  async function handleRecordingStopped() {
    setState({ kind: "processing" });
    const rawBlob = new Blob(chunksRef.current, {
      type: mediaRecorderRef.current?.mimeType || "audio/webm",
    });

    try {
      const wavBlob = await blobToWav(rawBlob);
      const formData = new FormData();
      formData.append("audio", wavBlob, "note.wav");
      const result = await transcribeVoiceNote(formData);

      if ("error" in result) {
        setState({ kind: "error", message: result.error });
        return;
      }

      setEditedText(result.cleanedText);
      setState({
        kind: "review",
        transcript: result.transcript,
        suggestedLaborHours: result.suggestedLaborHours,
        suggestedParts: result.suggestedParts,
      });
    } catch {
      setState({
        kind: "error",
        message: "Échec du traitement de l'enregistrement. Réessayez ou saisissez le texte manuellement.",
      });
    }
  }

  async function startRecording() {
    setState({ kind: "recording", seconds: 0 });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const candidateTypes = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = candidateTypes.find((t) => MediaRecorder.isTypeSupported?.(t));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopStream();
        void handleRecordingStopped();
      };
      recorder.start();

      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setState((prev) => (prev.kind === "recording" ? { kind: "recording", seconds: elapsed } : prev));
        if (elapsed >= MAX_RECORDING_SECONDS) stopRecording();
      }, 1000);
    } catch {
      setState({
        kind: "error",
        message: "Micro non disponible ou accès refusé. Utilisez le champ de texte ci-dessous.",
      });
    }
  }

  function cancel() {
    stopStream();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState({ kind: "idle" });
  }

  function save() {
    if (!editedText.trim()) return;
    startSaving(async () => {
      const formData = new FormData();
      formData.append("note", editedText.trim());
      formData.append("technician_id", technicianId ?? "");
      await addWorkOrderNote(workOrderId, formData);
      router.refresh();
      setState({ kind: "idle" });
      setEditedText("");
    });
  }

  if (state.kind === "idle") {
    return (
      <div className={`flex items-center justify-between p-4 ${cardClass}`}>
        <p className="text-sm text-app-fg-muted dark:text-brand-fg-muted">
          Dictez une note au lieu de la taper — elle sera transcrite et nettoyée automatiquement.
        </p>
        <button type="button" onClick={startRecording} className={secondaryButtonClass}>
          🎙️ Note vocale
        </button>
      </div>
    );
  }

  if (state.kind === "recording") {
    return (
      <div className={`flex items-center justify-between p-4 ${cardClass}`}>
        <span className="flex items-center gap-2 text-sm text-app-fg dark:text-brand-fg-muted">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden />
          Enregistrement… {formatDuration(state.seconds)}
        </span>
        <button type="button" onClick={stopRecording} className={buttonClass}>
          Arrêter
        </button>
      </div>
    );
  }

  if (state.kind === "processing") {
    return (
      <div className={`flex items-center gap-2 p-4 text-sm text-app-fg-muted dark:text-brand-fg-muted ${cardClass}`}>
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-app-border border-t-accent-500 dark:border-brand-border"
          aria-hidden
        />
        Transcription et nettoyage en cours…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className={`flex flex-col gap-2 p-4 ${cardClass}`}>
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
        <button type="button" onClick={cancel} className={`${secondaryButtonClass} w-fit`}>
          Fermer
        </button>
      </div>
    );
  }

  // state.kind === "review"
  const hasSuggestions = state.suggestedLaborHours !== null || state.suggestedParts.length > 0;
  return (
    <div className={`flex flex-col gap-3 p-4 ${cardClass}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-app-fg-muted dark:text-brand-fg-muted">
          Transcription brute
        </p>
        <p className="mt-1 text-xs text-app-fg-muted dark:text-brand-fg-faint">{state.transcript}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass} htmlFor="voice_note_text">Note (modifiable)</label>
        <textarea
          id="voice_note_text"
          className={inputClass}
          rows={3}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
        />
      </div>

      {hasSuggestions && (
        <p className="rounded-md bg-accent-50 px-3 py-2 text-xs text-accent-800 dark:bg-accent-500/15 dark:text-accent-300">
          Suggestions détectées (non appliquées) —{" "}
          {state.suggestedLaborHours !== null && <>heures de main-d&apos;œuvre : {state.suggestedLaborHours} h</>}
          {state.suggestedLaborHours !== null && state.suggestedParts.length > 0 && " · "}
          {state.suggestedParts.length > 0 && <>pièces mentionnées : {state.suggestedParts.join(", ")}</>}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !editedText.trim()}
          className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {saving ? "Enregistrement…" : "Enregistrer la note"}
        </button>
        <button type="button" onClick={cancel} disabled={saving} className={secondaryButtonClass}>
          Annuler
        </button>
      </div>
    </div>
  );
}
