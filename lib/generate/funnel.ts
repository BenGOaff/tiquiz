// lib/generate/funnel.ts
// Chantier B : genere le funnel "done-for-you" (sequences email + kit de
// lancement) a partir du carnet + persona de l'eleve, via l'IA. Server-only.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCarnet } from "@/lib/carnet";
import { resolveAnthropicModel } from "@/lib/anthropicModel";
import { buildClaudeMessageBody } from "@/lib/claudeRequest";
import { sanitizeAiText } from "@/lib/aiTextSanitizer";
import { resolvePersona, personaLabel, PERSONA_VOCAB } from "@/lib/personas";
import { fetchQuizProfiles } from "@/lib/integrations/tiquiz";
import {
  sanitizeIntentionMap,
  intentionGuidance,
  type IntentionMap,
} from "@/lib/funnelIntentions";
import type { QuizResultProfile } from "@/lib/quizDoctor";
import { labelOf, MATURITY_OPTIONS, MONETIZATION_OPTIONS } from "@/lib/businessProfile";
import type { FunnelAssets, FunnelEmail, FunnelResultEmail } from "@/lib/types";

const SYSTEM = `Tu es le meilleur copywriter de funnels pour quiz lead-magnet, au service de L'Atelier du Quiz (Béné). Tu écris la séquence email et le kit de lancement qui transforment un quiz en machine à leads qualifiés qui ACHÈTENT.

Tu t'appuies sur des principes solides, appliqués (jamais théoriques) :
- Blair Warren : encourager le rêve, justifier l'échec passé, apaiser la peur, confirmer un soupçon, désigner l'ennemi commun (jamais le lecteur).
- La méthode Ask : récolter et renvoyer les mots exacts de la cible, parler à chaque profil (bucket) séparément.
- Cialdini : micro-engagement, cohérence, preuve sociale, rareté honnête.

Règles d'écriture STRICTES :
- Tutoiement, ton chaleureux et direct, comme Béné.
- Français impeccable, accents partout. JAMAIS de tiret long (ni cadratin ni demi-cadratin) : virgule, deux-points, parenthèses ou nouvelle phrase.
- Jamais de promesse chiffrée de résultat. On promet un système, pas un million.
- Emails courts, concrets, une seule idée et un seul appel à l'action par email.
- Tu utilises le contexte réel de l'élève (sa niche, ses profils de résultats, ses mots). Tu ne mets PAS de [crochets] à remplir sauf si une info manque vraiment.
- Pour chaque email par profil : respecte l'intention indiquée pour ce profil. Si un CTA est fourni (texte + URL), c'est le SEUL appel à l'action de l'email, reprends son texte et son URL tels quels : tu n'inventes jamais d'URL et tu n'en ajoutes pas d'autre.

Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "welcome": [{"subject": "...", "body": "..."}],
  "byResult": [{"result": "nom du profil", "subject": "...", "body": "..."}],
  "sales": [{"subject": "...", "body": "..."}],
  "launch": {"posts": ["...", "..."], "dm": "...", "partnerEmail": "..."}
}
Quantités : welcome = 3 emails, byResult = un email pour CHACUN des profils de résultat fournis (n'en oublie aucun, n'en invente aucun), sales = 3 emails, launch.posts = 4 posts, launch.dm = 1 script, launch.partnerEmail = 1 email.`;

interface ProfileRow {
  full_name: string | null;
  niche: string | null;
  activity_type: string | null;
  maturity: string | null;
  monetization: string | null;
}

function buildUserPrompt(
  profile: ProfileRow,
  carnetText: string,
  quizProfiles: QuizResultProfile[],
  intentions: IntentionMap,
): string {
  const persona = resolvePersona(profile.activity_type);
  const vocab = PERSONA_VOCAB[persona];
  const firstName = profile.full_name?.split(" ")[0] ?? "";

  // Source de verite pour byResult : les profils REELS du quiz Tiquiz s'ils
  // sont disponibles ; sinon repli sur le carnet (inference). Pour chaque
  // profil : intention choisie par l'eleve (prioritaire) + CTA reel du
  // resultat (destination : promo, formation, rdv, lead magnet...).
  const hasReal = quizProfiles.length > 0;
  const profilesBlock = hasReal
    ? [
        `Profils de résultat RÉELS de son quiz (source de vérité, un email pour CHACUN). Respecte l'intention et intègre le CTA fourni comme unique appel à l'action :`,
        ...quizProfiles.map((p, i) => {
          const desc = p.description
            ? ` : ${p.description.replace(/\s+/g, " ").trim().slice(0, 300)}`
            : "";
          const chosen = intentions[p.title.trim()];
          const cta =
            p.ctaText || p.ctaUrl
              ? `\n   CTA à intégrer (unique appel à l'action) : "${(p.ctaText || "Découvrir").trim()}"${p.ctaUrl ? ` -> ${p.ctaUrl.trim()}` : ""}`
              : "";
          const intentionLine =
            chosen && chosen !== "auto"
              ? `\n   Intention imposée : ${intentionGuidance(chosen)}`
              : p.ctaUrl
                ? `\n   Intention : orienter naturellement vers ce CTA.`
                : `\n   Intention : apporter de la valeur et inviter à répondre (pas de CTA défini).`;
          return `${i + 1}. ${p.title}${desc}${intentionLine}${cta}`;
        }),
      ].join("\n")
    : `Profils de résultat : non récupérés depuis son quiz. Déduis 3 ou 4 profils plausibles à partir de son carnet et de sa niche, et écris un email pour chacun (objectif : apporter de la valeur puis inviter à répondre).`;

  return [
    `Contexte de l'élève :`,
    firstName ? `- Prénom : ${firstName}` : null,
    profile.niche ? `- Niche : ${profile.niche}` : null,
    `- Métier (persona) : ${personaLabel(persona)}`,
    profile.maturity ? `- Maturité : ${labelOf(MATURITY_OPTIONS, profile.maturity)}` : null,
    profile.monetization
      ? `- Monétisation : ${labelOf(MONETIZATION_OPTIONS, profile.monetization)}`
      : null,
    `- Vocabulaire à employer : offre = "${vocab.offre}", client = "${vocab.client}", audience = "${vocab.audience}", expertise = "${vocab.expertise}".`,
    ``,
    profilesBlock,
    ``,
    `Son carnet de bord (ses réponses au parcours, pour ses mots, son objectif, son contexte) :`,
    carnetText || "(carnet encore vide)",
    ``,
    `Écris-lui sa campagne complète au format JSON demandé.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function carnetToText(
  carnet: Awaited<ReturnType<typeof getCarnet>>,
): string {
  return carnet
    .map((d) => {
      const lines = d.entries.map((e) => `  Q: ${e.prompt}\n  R: ${e.answer}`).join("\n");
      return `Jour ${d.dayNumber} - ${d.title}\n${lines}`;
    })
    .join("\n\n");
}

function extractJson(text: string): unknown | null {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function clean(s: unknown): string {
  return sanitizeAiText(typeof s === "string" ? s : "").trim();
}

function normalizeAssets(parsed: unknown, rawText: string): FunnelAssets {
  const o = (parsed ?? {}) as Record<string, unknown>;
  const welcome: FunnelEmail[] = Array.isArray(o.welcome)
    ? (o.welcome as Record<string, unknown>[]).map((x) => ({
        subject: clean(x.subject),
        body: clean(x.body),
      }))
    : [];
  const byResult: FunnelResultEmail[] = Array.isArray(o.byResult)
    ? (o.byResult as Record<string, unknown>[]).map((x) => ({
        result: clean(x.result),
        subject: clean(x.subject),
        body: clean(x.body),
      }))
    : [];
  const sales: FunnelEmail[] = Array.isArray(o.sales)
    ? (o.sales as Record<string, unknown>[]).map((x) => ({
        subject: clean(x.subject),
        body: clean(x.body),
      }))
    : [];
  const launchRaw = (o.launch ?? {}) as Record<string, unknown>;
  const launch = {
    posts: Array.isArray(launchRaw.posts) ? launchRaw.posts.map(clean).filter(Boolean) : [],
    dm: clean(launchRaw.dm),
    partnerEmail: clean(launchRaw.partnerEmail),
  };

  const empty = welcome.length === 0 && byResult.length === 0 && sales.length === 0;
  return empty
    ? { welcome, byResult, sales, launch, raw: sanitizeAiText(rawText).trim() }
    : { welcome, byResult, sales, launch };
}

/** Genere la campagne et la persiste. Renvoie les assets, ou null si echec IA. */
export async function generateFunnel(userId: string): Promise<FunnelAssets | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, niche, activity_type, maturity, monetization")
    .eq("id", userId)
    .maybeSingle();

  const [carnet, quizProfiles, intentions] = await Promise.all([
    getCarnet(userId),
    // Profils REELS du quiz de l'eleve (best-effort : [] si non connecte).
    fetchQuizProfiles(userId),
    getFunnelIntentions(userId),
  ]);
  const userPrompt = buildUserPrompt(
    (profile ?? {}) as ProfileRow,
    carnetToText(carnet),
    quizProfiles,
    intentions,
  );

  const model = resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet");
  const body = buildClaudeMessageBody({
    model,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  let text: string;
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
    text = Array.isArray(data?.content)
      ? data.content
          .filter((b: { type?: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text)
          .join("")
      : "";
  } catch {
    return null;
  }

  const assets = normalizeAssets(extractJson(text), text);

  await supabaseAdmin.from("funnel_assets").upsert(
    { user_id: userId, assets, generated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  return assets;
}

/** Lit la map d'intentions par profil de l'eleve (server-internal, admin). */
export async function getFunnelIntentions(userId: string): Promise<IntentionMap> {
  const { data } = await supabaseAdmin
    .from("funnel_intentions")
    .select("intentions")
    .eq("user_id", userId)
    .maybeSingle();
  return sanitizeIntentionMap(data?.intentions);
}

export async function getFunnelAssets(userId: string): Promise<{
  assets: FunnelAssets | null;
  generatedAt: string | null;
}> {
  const { data } = await supabaseAdmin
    .from("funnel_assets")
    .select("assets, generated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !data.assets || Object.keys(data.assets).length === 0) {
    return { assets: null, generatedAt: null };
  }
  return { assets: data.assets as FunnelAssets, generatedAt: data.generated_at as string };
}
