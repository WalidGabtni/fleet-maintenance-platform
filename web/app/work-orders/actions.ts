"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/profile";
import { polishWorkOrderText, transcribeAudio, cleanupVoiceTranscript } from "@/lib/gemini";
import { canManageParts } from "@/lib/permissions";
import { getEnabledFeatures } from "@/lib/features";
import { logActivity } from "@/lib/activityLog";
import { friendlyError } from "@/lib/errors";
import { statusLabels } from "./StatusBadge";
import type { WorkOrderStatus } from "@/lib/types";

function toNumberOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function toPositiveInt(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export async function createWorkOrder(formData: FormData) {
  const supabase = await getSupabaseClient();
  const vehicleId = String(formData.get("vehicle_id") ?? "").trim();
  const reportedIssue = String(formData.get("reported_issue") ?? "").trim();
  if (!vehicleId) redirect(`/work-orders/new?error=${encodeURIComponent("Le véhicule est requis.")}`);
  if (!reportedIssue) redirect(`/work-orders/new?error=${encodeURIComponent("Le problème signalé est requis.")}`);

  const technicianId = String(formData.get("technician_id") ?? "").trim();

  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      vehicle_id: vehicleId,
      technician_id: technicianId || null,
      status: (String(formData.get("status") ?? "open") as WorkOrderStatus),
      reported_issue: reportedIssue,
      diagnosis: String(formData.get("diagnosis") ?? "").trim() || null,
      work_performed: String(formData.get("work_performed") ?? "").trim() || null,
      mileage_at_service: toNumberOrNull(formData.get("mileage_at_service")) as number | null,
      labor_hours: toNumberOrNull(formData.get("labor_hours")),
    })
    .select("id")
    .single();
  if (error) redirect(`/work-orders/new?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/work-orders");
  redirect(`/work-orders/${data.id}`);
}

export async function updateWorkOrder(id: string, formData: FormData) {
  const supabase = await getSupabaseClient();
  const vehicleId = String(formData.get("vehicle_id") ?? "").trim();
  const reportedIssue = String(formData.get("reported_issue") ?? "").trim();
  if (!vehicleId) redirect(`/work-orders/${id}?error=${encodeURIComponent("Le véhicule est requis.")}`);
  if (!reportedIssue) {
    redirect(`/work-orders/${id}?error=${encodeURIComponent("Le problème signalé est requis.")}`);
  }

  const technicianId = String(formData.get("technician_id") ?? "").trim();
  const status = String(formData.get("status") ?? "open") as WorkOrderStatus;

  const { data: existing } = await supabase.from("work_orders").select("status").eq("id", id).maybeSingle();

  const { error } = await supabase
    .from("work_orders")
    .update({
      vehicle_id: vehicleId,
      technician_id: technicianId || null,
      status,
      reported_issue: reportedIssue,
      diagnosis: String(formData.get("diagnosis") ?? "").trim() || null,
      work_performed: String(formData.get("work_performed") ?? "").trim() || null,
      mileage_at_service: toNumberOrNull(formData.get("mileage_at_service")) as number | null,
      labor_hours: toNumberOrNull(formData.get("labor_hours")),
    })
    .eq("id", id);
  if (error) redirect(`/work-orders/${id}?error=${encodeURIComponent(friendlyError(error))}`);

  if (existing && existing.status !== status) {
    await logActivity({
      action: "status_changed",
      entityType: "work_order",
      entityId: id,
      description: `Statut du bon de travail changé de « ${statusLabels[existing.status]} » à « ${statusLabels[status]} »`,
      metadata: { from: existing.status, to: status },
    });
  }

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  redirect(`/work-orders/${id}`);
}

export async function deleteWorkOrder(id: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("work_orders").delete().eq("id", id);
  if (error) redirect(`/work-orders?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath("/work-orders");
  redirect("/work-orders");
}

export async function addWorkOrderNote(workOrderId: string, formData: FormData) {
  const supabase = await getSupabaseClient();
  const note = String(formData.get("note") ?? "").trim();
  if (!note) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent("Le texte de la note est requis.")}`);

  const technicianId = String(formData.get("technician_id") ?? "").trim();

  const { error } = await supabase.from("work_order_notes").insert({
    work_order_id: workOrderId,
    technician_id: technicianId || null,
    note,
  });
  if (error) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath(`/work-orders/${workOrderId}`);
}

export async function addWorkOrderPart(workOrderId: string, formData: FormData) {
  const supabase = await getSupabaseClient();
  const partId = String(formData.get("part_id") ?? "").trim();
  const quantityUsed = toPositiveInt(formData.get("quantity_used"));
  if (!partId) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent("La pièce est requise.")}`);
  if (quantityUsed <= 0) {
    redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent("La quantité doit être supérieure à zéro.")}`);
  }

  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("unit_cost")
    .eq("id", partId)
    .maybeSingle();
  if (partError) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(partError))}`);
  if (!part) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent("Pièce introuvable.")}`);

  const { error } = await supabase.from("work_order_parts").insert({
    work_order_id: workOrderId,
    part_id: partId,
    quantity_used: quantityUsed,
    unit_price_at_time: part.unit_cost,
  });
  if (error) {
    const message = error.code === "23514" ? "Stock insuffisant pour cette pièce." : friendlyError(error);
    redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/work-orders/${workOrderId}`);
}

export async function polishNotes(
  fieldLabel: string,
  text: string,
): Promise<{ text?: string; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Vous devez être connecté." };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { error: "Rien à améliorer — le champ est vide." };
  }

  try {
    const polished = await polishWorkOrderText(fieldLabel, trimmed);
    return { text: polished };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Une erreur est survenue." };
  }
}

// Simple keyword heuristic for v1 — French stems for "replaced/changed/installed/new/swapped",
// since technician notes in this app are always written in French. Upgrade to an AI call later
// if this proves too noisy or misses too much.
const PART_REPLACEMENT_KEYWORDS = [
  "remplac",
  "chang",
  "install",
  "neuf",
  "neuve",
  "nouveau",
  "nouvelle",
  "pose",
  "posee",
  "monte",
  "montee",
];

// Built from numeric char codes (rather than a literal escape range) so the
// combining-marks range can't accidentally get mangled into literal Unicode
// characters in the source file.
const COMBINING_MARKS_PATTERN = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  "g",
);

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(COMBINING_MARKS_PATTERN, "");
}

function mentionsPartReplacement(text: string) {
  const normalized = stripDiacritics(text.toLowerCase());
  return PART_REPLACEMENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export type CloseoutCheckResult = {
  warnings: string[];
  laborHours: number | null;
  workPerformed: string | null;
  partsCount: number;
};

export async function checkWorkOrderCloseout(workOrderId: string): Promise<CloseoutCheckResult> {
  const supabase = await getSupabaseClient();

  const [{ data: workOrder }, { count: partsCount }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("diagnosis, work_performed, labor_hours")
      .eq("id", workOrderId)
      .maybeSingle(),
    supabase
      .from("work_order_parts")
      .select("id", { count: "exact", head: true })
      .eq("work_order_id", workOrderId),
  ]);

  const laborHours = workOrder?.labor_hours ?? null;
  const workPerformed = workOrder?.work_performed ?? null;
  const count = partsCount ?? 0;

  const warnings: string[] = [];

  if (laborHours === null || laborHours === 0) {
    warnings.push("Aucune heure de main-d'œuvre n'a été enregistrée.");
  }

  const combinedNotes = `${workOrder?.diagnosis ?? ""} ${workPerformed ?? ""}`;
  if (count === 0 && mentionsPartReplacement(combinedNotes)) {
    warnings.push("Les notes mentionnent une pièce remplacée, mais aucune pièce n'est enregistrée sur ce bon.");
  }

  if (!workPerformed || !workPerformed.trim()) {
    warnings.push("Aucune note de travaux effectués n'a été enregistrée.");
  }

  return { warnings, laborHours, workPerformed, partsCount: count };
}

export async function logCloseoutOverride(workOrderId: string, warnings: string[]) {
  const supabase = await getSupabaseClient();
  const note = `Clôturé avec des avertissements non résolus : ${warnings.join(" ; ")}`;

  const { error } = await supabase.from("work_order_notes").insert({
    work_order_id: workOrderId,
    technician_id: null,
    note,
  });
  if (error) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath(`/work-orders/${workOrderId}`);
}

export type VoiceNoteResult =
  | {
      transcript: string;
      cleanedText: string;
      suggestedLaborHours: number | null;
      suggestedParts: string[];
    }
  | { error: string };

export async function transcribeVoiceNote(formData: FormData): Promise<VoiceNoteResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Vous devez être connecté." };
  }

  const enabledFeatures = await getEnabledFeatures();
  if (!enabledFeatures.has("voice_notes")) {
    return { error: "Les notes vocales ne sont pas activées pour ce compte." };
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return { error: "Aucun enregistrement reçu." };
  }

  try {
    const arrayBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audio.type || "audio/wav";

    const transcript = await transcribeAudio(base64Audio, mimeType);
    if (!transcript.trim()) {
      return {
        error: "Aucune parole détectée dans l'enregistrement. Réessayez ou saisissez le texte manuellement.",
      };
    }

    const cleanup = await cleanupVoiceTranscript(transcript);
    return {
      transcript,
      cleanedText: cleanup.cleanedText,
      suggestedLaborHours: cleanup.suggestedLaborHours,
      suggestedParts: cleanup.suggestedParts,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Une erreur est survenue." };
  }
}

export async function removeWorkOrderPart(id: string, workOrderId: string) {
  const profile = await getCurrentProfile();
  if (!canManageParts(profile?.role)) {
    throw new Error("Seuls les administrateurs et commis aux pièces peuvent retirer une pièce.");
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("work_order_parts").delete().eq("id", id);
  if (error) redirect(`/work-orders/${workOrderId}?error=${encodeURIComponent(friendlyError(error))}`);

  revalidatePath(`/work-orders/${workOrderId}`);
}
