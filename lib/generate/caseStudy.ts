// lib/generate/caseStudy.ts
// Chantier E : brouillon d'etude de cas pour mettre un eleve en avant
// (preuve sociale pour L'Atelier du Quiz et Tiquiz). Server-only. C'est un
// BROUILLON a valider par Bene : les citations sont des suggestions a
// confirmer avec l'eleve, jamais des faux temoignages.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCarnet } from "@/lib/carnet";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { resolvePersona, personaLabel } from "@/lib/personas";
import type { TiquizMetrics } from "@/lib/types";

const SYSTEM = `Tu rédiges un BROUILLON d'étude de cas pour mettre en avant un élève de L'Atelier du Quiz (la formation de Béné pour lancer un quiz lead-magnet avec Tiquiz). Objectif : une preuve sociale authentique et concrète, à valider par Béné avant publication.

Règles :
- Français impeccable, accents partout, JAMAIS de tiret long (virgule, deux-points, parenthèses, nouvelle phrase).
- Concret et honnête. Aucune promesse exagérée, aucun chiffre inventé : tu n'utilises que les chiffres réels fournis.
- Les citations de l'élève sont des SUGGESTIONS à confirmer : préfixe-les clairement par "(citation à confirmer avec l'élève)". Tu n'inventes pas de faux témoignage présenté comme réel.
- Markdown simple. Structure : un titre accrocheur, "Avant" (sa situation de départ et sa niche), "Ce qu'il a fait" (son quiz, son angle, tiré de son carnet), "Résultats" (ses chiffres réels), et une accroche de clôture.
- Ton chaleureux, comme Béné. Tutoiement quand on s'adresse au lecteur.`;

interface ProfileRow {
  full_name: string | null;
  niche: string | null;
  activity_type: string | null;
}

function carnetHighlights(carnet: Awaited<ReturnType<typeof getCarnet>>): string {
  return carnet
    .flatMap((d) => d.entries.map((e) => `- ${e.prompt} -> ${e.answer}`))
    .slice(0, 20)
    .join("\n");
}

/** Genere le brouillon d'etude de cas. Renvoie le markdown, ou null si echec. */
export async function generateCaseStudyDraft(
  userId: string,
  metrics: TiquizMetrics,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, niche, activity_type")
    .eq("id", userId)
    .maybeSingle();
  const p = (profile ?? {}) as ProfileRow;
  const persona = resolvePersona(p.activity_type);
  const carnet = await getCarnet(userId);

  const userPrompt = [
    `Élève : ${p.full_name ?? "(prénom inconnu)"}`,
    p.niche ? `Niche : ${p.niche}` : null,
    `Métier : ${personaLabel(persona)}`,
    ``,
    `Chiffres réels (Tiquiz) : ${metrics.leads} leads, ${metrics.views} vues, ${metrics.completes} complétions, ${metrics.shares} partages.`,
    metrics.topQuiz ? `Meilleur quiz : ${metrics.topQuiz.title} (${metrics.topQuiz.leads} leads).` : null,
    ``,
    `Extraits de son carnet (son projet, ses mots) :`,
    carnetHighlights(carnet) || "(carnet peu rempli)",
    ``,
    `Rédige le brouillon d'étude de cas au format demandé.`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet");
  const body = buildClaudeMessageBody({
    model,
    max_tokens: 1800,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: { type?: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text)
          .join("")
      : "";
    const clean = sanitizeAiText(text).trim();
    return clean || null;
  } catch {
    return null;
  }
}
