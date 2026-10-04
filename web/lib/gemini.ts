import "server-only";

const GEMINI_MODEL = "gemini-flash-latest";

// "low" thinking is a soft hint, not a hard cap — some prompts still burn most of the
// token budget on internal reasoning before writing the actual answer, so the ceiling
// has to be generous enough to absorb that and still leave room for the real output.
const MAX_OUTPUT_TOKENS = 4096;

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function callGeminiParts(parts: GeminiPart[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La clé API Gemini n'est pas configurée.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`L'IA n'a pas pu répondre (${response.status}). ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text as string | undefined;

  if (candidate?.finishReason === "MAX_TOKENS" || !text?.trim()) {
    throw new Error("L'IA n'a pas réussi à générer une réponse complète. Réessayez.");
  }

  return text.trim();
}

async function callGemini(prompt: string): Promise<string> {
  return callGeminiParts([{ text: prompt }]);
}

export async function polishWorkOrderText(fieldLabel: string, rawText: string): Promise<string> {
  const prompt =
    `Tu aides dans un atelier de réparation de véhicules. Reformule la note suivante, écrite de façon ` +
    `abrégée par un technicien, en français professionnel et clair, pour le champ « ${fieldLabel} » d'un ` +
    `bon de travail. N'ajoute aucune information qui n'est pas déjà présente dans la note. Reste concis : ` +
    `une à trois phrases. Donne une seule reformulation, jamais plusieurs options ni de liste. Réponds ` +
    `uniquement avec le texte reformulé lui-même, en français, sans guillemets, sans titre, sans commentaire.\n\n` +
    `Note du technicien : ${rawText}`;

  return callGemini(prompt);
}

export async function generateReportsSummary(input: {
  startDate: string;
  endDate: string;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  technicians: { technician_name: string; completed_count: number }[];
  vehicles: { unit_number: string | null; customer_name: string; total_cost: number }[];
  parts: { part_name: string; total_quantity: number; total_spend: number }[];
}): Promise<string> {
  const prompt =
    `Tu rédiges, pour le propriétaire d'un atelier de réparation de véhicules, un court résumé en français ` +
    `de son activité sur une période, à partir des chiffres ci-dessous. Écris deux à quatre phrases, dans ` +
    `un ton simple et direct, qui font ressortir les points les plus utiles à retenir (ex. revenu total, ` +
    `montant en attente de paiement s'il est notable, technicien le plus productif, véhicule ou pièce qui ` +
    `ressort). N'invente aucun chiffre qui n'est pas ci-dessous. Réponds uniquement avec le paragraphe ` +
    `lui-même, en français, sans titre ni commentaire.\n\n` +
    `Période : du ${input.startDate} au ${input.endDate}\n` +
    `Total facturé : ${input.totalInvoiced.toFixed(2)}\n` +
    `Total payé : ${input.totalPaid.toFixed(2)}\n` +
    `Total en attente : ${input.totalOutstanding.toFixed(2)}\n` +
    `Techniciens (bons terminés) : ${
      input.technicians.map((t) => `${t.technician_name} (${t.completed_count})`).join(", ") || "aucun"
    }\n` +
    `Véhicules par coût total : ${
      input.vehicles
        .slice(0, 5)
        .map((v) => `${v.unit_number ?? "?"} / ${v.customer_name} (${v.total_cost.toFixed(2)})`)
        .join(", ") || "aucun"
    }\n` +
    `Pièces les plus utilisées : ${
      input.parts
        .slice(0, 5)
        .map((p) => `${p.part_name} (qté ${p.total_quantity}, ${p.total_spend.toFixed(2)})`)
        .join(", ") || "aucune"
    }`;

  return callGemini(prompt);
}

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  const instruction =
    "Transcris cet enregistrement audio en français québécois, mot pour mot, sans corriger ni reformuler " +
    "et sans traduire. Si l'audio ne contient aucune parole compréhensible, réponds avec une chaîne vide. " +
    "Réponds uniquement avec la transcription elle-même, sans commentaire, sans guillemets, sans horodatage.";

  const text = await callGeminiParts([
    { text: instruction },
    { inlineData: { mimeType, data: base64Audio } },
  ]);

  // The model sometimes still emits a stock "I heard nothing" style reply
  // instead of an empty string despite the instruction — treat that the
  // same as empty so the caller's "no speech detected" path handles it.
  return /^(rien|aucun|\(silence\)|\[silence\])/i.test(text) ? "" : text;
}

export type VoiceNoteCleanup = {
  cleanedText: string;
  suggestedLaborHours: number | null;
  suggestedParts: string[];
};

export async function cleanupVoiceTranscript(transcript: string): Promise<VoiceNoteCleanup> {
  const prompt =
    `Tu aides dans un atelier de réparation de véhicules au Québec. Voici la transcription brute d'une note ` +
    `dictée par un technicien (elle peut contenir des hésitations, répétitions ou erreurs de transcription) :\n\n` +
    `"""${transcript}"""\n\n` +
    `Fais deux choses :\n` +
    `1. Réécris cette note en français professionnel et clair, adapté à un bon de travail. N'ajoute aucune ` +
    `information qui n'est pas mentionnée. Reste concis.\n` +
    `2. Si des heures de main-d'œuvre sont mentionnées, extrais-les en nombre décimal d'heures. Si des ` +
    `pièces remplacées ou utilisées sont mentionnées, liste leurs noms.\n\n` +
    `Réponds UNIQUEMENT avec un objet JSON valide, sans balises markdown, sans texte avant ou après, de cette forme exacte :\n` +
    `{"cleaned_text": "...", "suggested_labor_hours": <nombre ou null>, "suggested_parts": ["...", "..."]}`;

  const raw = await callGemini(prompt);
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(jsonText) as {
      cleaned_text?: unknown;
      suggested_labor_hours?: unknown;
      suggested_parts?: unknown;
    };
    const cleanedText = typeof parsed.cleaned_text === "string" ? parsed.cleaned_text.trim() : transcript;
    const suggestedLaborHours =
      typeof parsed.suggested_labor_hours === "number" && Number.isFinite(parsed.suggested_labor_hours)
        ? parsed.suggested_labor_hours
        : null;
    const suggestedParts = Array.isArray(parsed.suggested_parts)
      ? parsed.suggested_parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : [];
    return { cleanedText: cleanedText || transcript, suggestedLaborHours, suggestedParts };
  } catch {
    // Malformed JSON from the model — degrade gracefully to the raw transcript
    // rather than losing the technician's note entirely.
    return { cleanedText: transcript, suggestedLaborHours: null, suggestedParts: [] };
  }
}
