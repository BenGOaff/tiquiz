// app/api/embed/quiz/generate/route.ts
// PUBLIC quiz generation for the sales-page embed (systeme.io & co).
//
// Differences vs the authenticated /api/quiz/generate:
//   - No Supabase auth required.
//   - Email is captured up-front (the price of the magic).
//   - Rate-limited by email + IP (DB-backed, see lib/embed/rateLimit).
//   - Inputs are deliberately minimal (sujet / audience / objectif).
//     We map them onto the existing prompt builder so the prompt
//     library stays single-source-of-truth.
//   - Returns the generated quiz AND a session_token the embed reuses
//     for /save and /claim. We never expose the DB row id.
//   - Stream is SSE so the embed can show a "live writing" effect.
//
// LE QUIZ S'AFFICHE PENDANT QU'IL S'ÉCRIT (chantier 3, 10 septembre 2026).
//
// Jusqu'ici l'appel à Anthropic n'était PAS streamé (`stream: true`
// absent) : la route attendait la réponse entière puis rendait tout
// d'un coup, et le "live writing" du commentaire ci dessus n'était
// qu'un spinner d'une minute. La route consomme maintenant le flux du
// modèle, et envoie au navigateur le titre, puis CHAQUE question dès
// que son objet est fermé, puis chaque profil (événements `titre`,
// `question`, `resultat`). Les décisions vivent dans
// `lib/embed/fluxGeneration.ts`, pur et testé.
//
// LE SERVEUR REND UNE RAISON, JAMAIS UNE PHRASE (tâche #55, même jour).
//
// Dix sorties d'erreur portaient une phrase FRANÇAISE, et le client
// l'affichait telle quelle : sur `/en/generateur-de-quiz`, un visiteur
// anglophone lisait "L'IA a mis trop de temps. Réessaie." C'est la
// règle du 3 septembre (`lib/ia/echecIa.ts`), qui n'avait jamais été
// reprise sur ce chemin. Chaque sortie porte `reason`, l'écran traduit
// (`lib/embed/echecGenerateur.ts` + `components/embed/embed-i18n.ts`).

import { NextRequest } from "next/server";
import { buildQuizGenerationPrompt, QUIZ_GENERATION_MAX_TOKENS } from "@/lib/prompts/quiz/system";
import { sanitizeAiQuizPayload } from "@/lib/aiTextSanitizer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { corsHeaders, preflight } from "@/lib/embed/cors";
import { checkRateLimit, clientIp, hashIp } from "@/lib/embed/rateLimit";
import { FENETRE_HEURES, LIMITE_PAR_EMAIL, LIMITE_PAR_IP } from "@/lib/embed/limites";
import { modeleGenerationQuiz } from "@/lib/quiz/modeleGeneration";
import { fetchAnthropic } from "@/lib/aiRetry";
import { cleAnthropic } from "@/lib/ai/cleAnthropic";
import { classifyThrown, classifyUpstream } from "@/lib/aiFailure";
import type { RaisonIa } from "@/lib/ia/echecIa";
import {
  LecteurSseAnthropic,
  PROGRESSION_VIDE,
  nouveautes,
  progressionDuFlux,
  type Progression,
} from "@/lib/embed/fluxGeneration";
import type { RaisonGenerateur } from "@/lib/embed/echecGenerateur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

// LE BUDGET DE TEMPS COUVRE TOUT LE FLUX, pas seulement les en-têtes.
//
// Avant le streaming, le minuteur de 120 s ne bornait que l'attente des
// en-têtes : `res.json()` venait APRÈS `clearTimeout`, donc la lecture
// du corps n'était bornée par rien. Ici le même signal borne la lecture
// du flux (un `reader.read()` sur un corps abandonné lève `AbortError`).
// 180 s et pas 120 : un quiz long (8 questions, 5 profils) approche les
// 100 s d'écriture, et pendant tout ce temps le visiteur VOIT les
// questions arriver, donc l'attente n'a plus le même prix.
const BUDGET_FLUX_MS = 180_000;

// The embed exposes generator knobs in step 1 (matches /quiz/new).
// Defaults are applied in the request handler when the visitor leaves
// a field at zero. Token cap stays low — even a 10-question quiz with
// 5 profiles fits comfortably.



// Un refus AVANT le flux : JSON, `Content-Type: application/json`, et
// une raison. Le client discrimine sur le Content-Type (`lireEchecIa`),
// pas sur le statut : un 200 avec ce corps est un refus comme un 429.
function refus(
  reason: RaisonGenerateur,
  extra: Record<string, unknown>,
  init: ResponseInit,
): Response {
  return Response.json({ ok: false, reason, ...extra }, init);
}

function getClaudeModel(): string {
  // LE MÊME DÉFAUT QUE L'ÉDITEUR DERRIÈRE CONNEXION, et c'est ce qui
  // répare "JSON IA invalide" et "le résultat est pas ouf" : cette route
  // tournait sur haiku pendant que /api/quiz/generate tournait sur opus,
  // avec le même prompt et le même schéma JSON strict.
  // `ANTHROPIC_EMBED_MODEL` reste la surcharge, pour redescendre d'un
  // cran si la facture du gratuit monte, sans toucher aux clientes.
  return modeleGenerationQuiz("public");
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

// Map the embed's free-text "audience" + "objectif" onto the exact
// shape buildQuizGenerationPrompt expects, without re-deriving the
// 16 strategic objectives here. We just whitelist the values.
const EMBED_OBJECTIVES = new Set([
  "engagement", "eduquer", "qualifier", "sensibiliser",
  "decouvrir", "tester", "diagnostiquer", "orienter",
]);

export async function OPTIONS(req: NextRequest) {
  return preflight(req);
}

export async function POST(req: NextRequest) {
  // LE CHRONO DÉMARRE ICI, PAS AVANT L'APPEL AU MODÈLE.
  //
  // Ce qu'on veut savoir, c'est combien de temps la requête a duré du
  // point de vue du serveur : la lecture du corps, la construction du
  // prompt et la réservation de la session en font partie. Le poser
  // juste avant `fetchAnthropic` mesurerait le modèle et cacherait
  // tout ce qui l'entoure, donc dirait le générateur plus rapide qu'il
  // n'est. Ce qui n'y est PAS : les insertions en base qui suivent, et
  // le rendu chez le visiteur (voir la migration du 9 septembre).
  const debut = Date.now();
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const apiKey = cleAnthropic();
  if (!apiKey) {
    // 200 delibere : Cloudflare remplace le corps d'un 5xx, donc la
    // raison n'arrivait jamais (mesure du 31 aout). Le client discrimine
    // sur le Content-Type, pas sur le statut.
    return refus("not_configured", {}, { headers });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return refus("unreadable", {}, { status: 400, headers });
  }

  // Email is OPTIONAL at this step now: the new funnel asks for it
  // only at the publish step, after the quiz is generated and edited
  // (Tally / Typeform pattern — don't sell before you've delighted).
  // If supplied we still store it; otherwise the row starts with a
  // NULL email and /save fills it in later.
  const rawEmail = String(body.email ?? "").trim().toLowerCase();
  const email = rawEmail && isValidEmail(rawEmail) ? rawEmail : null;
  const topic = String(body.topic ?? "").trim();
  const audience = String(body.audience ?? "").trim();
  const objective = String(body.objective ?? "").trim();
  // "Pourquoi tu crées ce quiz ?" : l'INTENTION BUSINESS du prompt.
  // Avant, c'est le SUJET qui était poussé dans ce champ, donc le
  // modèle lisait "INTENTION BUSINESS : la productivité pour
  // entrepreneurs débordés" et devait faire servir chaque CTA à ça.
  // Les deux sont maintenant à leur place, et le sujet a la sienne.
  const intention = String(body.intention ?? "").trim().slice(0, 400);
  const locale = String(body.locale ?? "fr").trim();
  const source = String(body.source ?? "").trim().slice(0, 200) || null;

  // Generator knobs the embed now exposes in step-1 (matches the
  // authenticated /quiz/new form so the quiz the visitor sees is
  // representative of what they get post-checkout).
  const resultCount = Math.min(5, Math.max(2, Number(body.resultCount) || 3));
  const format = body.format === "long" ? "long" : "short";
  // LE NOMBRE DE QUESTIONS SE DÉDUIT DU FORMAT, exactement comme dans
  // `QuizFormClient` (court -> 4, long -> 8). Deux réglages pour une
  // seule décision, c'est un des deux qui finit par mentir : le format
  // porte le choix éditorial ("conversions rapides" contre "plus de
  // valeur"), un compteur nu ne dit rien.
  const questionCount = format === "long" ? 8 : 4;
  // Le TYPE décide de la mécanique d'attribution du résultat, et il
  // n'est jamais deviné (règle du 1er août). `segmentation` reste lue
  // pour un appelant qui ne connaîtrait pas encore `quizType`.
  const quizType = body.quizType === "scoring" || body.segmentation === "level"
    ? "scoring"
    : "profile";
  const segmentation = quizType === "scoring" ? "level" : "profile";
  const askFirstName = Boolean(body.askFirstName);
  const askGender = Boolean(body.askGender);
  const ALLOWED_TONES = new Set(["inspirant", "fun", "professionnel", "coach", "expert", "bienveillant"]);
  const toneRaw = String(body.tone ?? "inspirant").trim().toLowerCase();
  const tone = ALLOWED_TONES.has(toneRaw) ? toneRaw : "inspirant";
  const addressForm = body.addressForm === "vous" ? "vous" : "tu";

  // Les refus de VALIDATION gardent leur 4xx (ils passent intacts à
  // travers Cloudflare) et portent une raison que l'écran traduit.
  if (topic.length < 3 || topic.length > 200) {
    return refus("sujet", {}, { status: 400, headers });
  }
  if (audience.length < 2 || audience.length > 200) {
    return refus("audience", {}, { status: 400, headers });
  }
  if (!EMBED_OBJECTIVES.has(objective)) {
    return refus("objectif", {}, { status: 400, headers });
  }

  const ipHash = hashIp(clientIp(req));
  const rate = await checkRateLimit({ email, ipHash });
  if (!rate.ok) {
    // Les bornes sont LUES, jamais recopiées : la fenêtre est passée de
    // 1 h à 24 h le 8 septembre, et deux phrases annonçaient encore une
    // heure. L'écran écrit la phrase dans SA langue avec ces nombres.
    return refus(
      "rate_limited",
      {
        limite: rate.reason === "email" ? "email" : "ip",
        parLimite: rate.reason === "email" ? LIMITE_PAR_EMAIL : LIMITE_PAR_IP,
        fenetreHeures: FENETRE_HEURES,
        retryAfterSec: rate.retryAfterSec,
      },
      { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  // Persist the session up-front: even if generation fails we keep
  // the row so the embed can /save edits onto it later. The row's
  // id is the session_token returned to the embed.
  const { data: sessionRow, error: insertErr } = await supabaseAdmin
    .from("embed_quiz_sessions")
    .insert({
      email,
      inputs: { topic, audience, objective, intention, locale, format, quizType, resultCount, tone },
      source,
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (insertErr || !sessionRow) {
    console.error("[embed/generate] failed to create session:", insertErr);
    // Le détail Postgres reste dans le corps (`detail`) pour qu'un
    // problème de déploiement se lise dans la console du navigateur ;
    // l'ÉCRAN, lui, n'affiche que la phrase traduite de `generic`.
    const detail = insertErr?.message
      || insertErr?.hint
      || (typeof insertErr === "string" ? insertErr : "insertion impossible");
    const isMissingTable = /relation .*embed_quiz_sessions.* does not exist/i.test(detail);
    return refus(
      "generic",
      { detail: isMissingTable ? "migration embed_quiz_sessions absente (023 + 024)" : detail },
      { headers },
    );
  }
  const sessionToken = sessionRow.id as string;

  // Build the prompt via the same library the authenticated route
  // uses — single source of truth for tone, structure, JSON schema.
  const prompts = buildQuizGenerationPrompt({
    objective,
    target: audience,
    sujet: topic,
    intention,
    quizType,
    tone,
    questionCount,
    resultCount,
    locale,
    addressForm,
    format,
    segmentation,
    askFirstName,
    askGender,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sse(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      const heartbeat = setInterval(() => {
        try { sse("heartbeat", { t: Date.now() }); } catch { /* closed */ }
      }, 5000);

      try {
        sse("session", { session_token: sessionToken });
        // Une ÉTAPE, pas une phrase : l'écran la dit dans sa langue.
        sse("progress", { step: "writing" });

        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), BUDGET_FLUX_MS);

        // Ce que le flux nous apprend, et qu'on écrit en base à la fin
        // MÊME si le quiz n'aboutit pas : une réponse coupée a coûté
        // exactement les mêmes jetons qu'une réponse complète.
        let brut = "";
        let modele: string | null = null;
        let jetonsEntree: number | null = null;
        let jetonsSortie: number | null = null;
        let stopReason: string | null = null;
        let erreurDuFlux: string | null = null;
        let coupure: RaisonIa | null = null;
        let progression: Progression = PROGRESSION_VIDE;

        try {
          let res: Response;
          try {
            res = await fetchAnthropic(CLAUDE_API_URL, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
              },
              signal: abort.signal,
              body: JSON.stringify({
                model: getClaudeModel(),
                max_tokens: QUIZ_GENERATION_MAX_TOKENS,
                temperature: 0.7,
                stream: true,
                system: prompts.system,
                messages: [{ role: "user", content: prompts.user }],
              }),
            });
          } catch (err) {
            // `too_long` sur notre propre minuteur, `unreachable` sur une
            // panne réseau : les deux appellent une relance, mais pas la
            // même phrase.
            sse("error", { ok: false, reason: classifyThrown(err) });
            return;
          }

          if (!res.ok) {
            const t = await res.text().catch(() => "");
            console.error("[embed/generate] Claude error", res.status, t.slice(0, 300));
            sse("error", { ok: false, reason: classifyUpstream(res.status) });
            return;
          }
          if (!res.body) {
            sse("error", { ok: false, reason: "empty" });
            return;
          }

          // LE FLUX, MORCEAU PAR MORCEAU. Chaque texte reçu est ajouté
          // au brut ; ce qui vient de devenir COMPLET (le titre, une
          // question fermée, un profil fermé) part tout de suite au
          // navigateur, dans l'ordre d'écriture.
          const lecteur = new LecteurSseAnthropic();
          const decodeur = new TextDecoder();
          const reader = res.body.getReader();
          const traiter = (ev: ReturnType<LecteurSseAnthropic["alimenter"]>[number]) => {
            if (ev.type === "debut") {
              modele = ev.modele;
              jetonsEntree = ev.jetonsEntree;
            } else if (ev.type === "texte") {
              brut += ev.texte;
              const apres = progressionDuFlux(brut, locale);
              for (const n of nouveautes(progression, apres)) sse(n.type, n);
              progression = apres;
            } else if (ev.type === "fin") {
              stopReason = ev.stopReason;
              jetonsSortie = ev.jetonsSortie;
            } else if (ev.type === "erreur") {
              erreurDuFlux = ev.genre ?? "error";
              console.error("[embed/generate] erreur dans le flux", ev.genre, ev.message);
            }
          };
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              for (const ev of lecteur.alimenter(decodeur.decode(value, { stream: true }))) traiter(ev);
            }
            for (const ev of lecteur.terminer()) traiter(ev);
          } catch (err) {
            coupure = classifyThrown(err);
            console.error("[embed/generate] flux interrompu", coupure);
          }
        } finally {
          clearTimeout(timer);
        }

        // LA MÊME FORME QU'UNE RÉPONSE NON STREAMÉE, pour `enregistrerUsage`
        // et pour le test de troncature : le modèle, l'usage, la raison
        // d'arrêt et le texte. `usage` n'existe que si le flux l'a dit.
        const json: Record<string, unknown> = {
          model: modele,
          stop_reason: stopReason,
          content: [{ type: "text", text: brut }],
        };
        if (jetonsEntree !== null || jetonsSortie !== null) {
          json.usage = { input_tokens: jetonsEntree, output_tokens: jetonsSortie };
        }

        // CE QUE CETTE GÉNÉRATION A COÛTÉ, ÉCRIT AVANT TOUT LE RESTE.
        //
        // Béné, 8 septembre : "comment le générateur convertit : visites
        // / inscrits gratos / abonnés et le ROI". Les quatre marches se
        // lisaient déjà ; le ROI n'avait AUCUNE entrée, parce que
        // `json.usage` était jeté ici même.
        //
        // C'EST ÉCRIT AVANT LA LECTURE DU JSON, ET C'EST VOULU : une
        // réponse vide, tronquée ou illisible a coûté exactement les
        // mêmes jetons qu'une réponse réussie. Ne compter que les
        // succès ferait croire le générateur moins cher qu'il n'est,
        // c'est à dire le chiffre qui fait dépenser (règle du 22 août).
        //
        // Et ça ne bloque RIEN : si la migration du 8 septembre n'est
        // pas encore passée, PostgREST refuse l'update, on crie dans le
        // journal, et le visiteur repart avec son quiz. On perd la
        // mesure, jamais le livrable.
        await enregistrerUsage(sessionToken, json, Date.now() - debut);

        // Le coût est écrit ; MAINTENANT on peut dire que ça a raté.
        // Une surcharge annoncée DANS le flux (`overloaded_error`) se
        // relance ; toute autre erreur du modèle est un refus.
        if (erreurDuFlux) {
          sse("error", { ok: false, reason: /overloaded|rate_limit/i.test(erreurDuFlux) ? "busy" : "refused" });
          return;
        }
        if (coupure) {
          sse("error", { ok: false, reason: coupure });
          return;
        }

        const parts = Array.isArray(json?.content) ? json.content : [];
        const raw = (parts as Record<string, unknown>[])
          .map((p) => (p?.type === "text" ? String(p?.text ?? "") : ""))
          .join("")
          .trim();

        if (!raw) {
          sse("error", { ok: false, reason: "empty" });
          return;
        }

        // UNE SORTIE TRONQUÉE NE SE LIT PAS "JSON INVALIDE".
        //
        // Le budget de sortie était de 6000 jetons ici et de 8000 dans
        // l'app, alors que l'embed laisse demander jusqu'à 10 questions
        // et 5 profils. Un quiz qui touchait le plafond revenait coupé au
        // milieu, `JSON.parse` échouait, et le visiteur lisait "JSON IA
        // invalide" sur l'écran qui doit lui donner envie.
        //
        // Le budget est désormais partagé (QUIZ_GENERATION_MAX_TOKENS),
        // et le cas restant DIT quoi faire au lieu d'accuser le format.
        if (json?.stop_reason === "max_tokens") {
          sse("error", { ok: false, reason: "too_long" });
          return;
        }

        let quiz: unknown;
        try {
          const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlock) {
            quiz = JSON.parse(codeBlock[1].trim());
          } else {
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");
            quiz = start !== -1 && end > start
              ? JSON.parse(raw.slice(start, end + 1))
              : JSON.parse(raw);
          }
        } catch {
          sse("error", { ok: false, reason: "unreadable" });
          return;
        }

        // Strip residual AI tics (em dashes, decorative emojis…) before
        // materializing the draft. Mirrors the post-process applied in
        // /api/quiz/generate so embed flow keeps parity.
        if (quiz && typeof quiz === "object") {
          quiz = sanitizeAiQuizPayload(quiz as Record<string, unknown>);
        }

        // Materialize the AI draft as a REAL anonymous quiz row
        // (user_id NULL, embed_session_id = sessionToken) so the
        // visitor edits via the same QuizDetailClient + endpoints
        // every Tiquiz user uses. The JSONB blob on the embed
        // session is kept as a safety net — saves through the
        // existing /api/embed/quiz/save still work for legacy clients.
        const draft = quiz as Record<string, unknown>;
        const draftQuestions = Array.isArray(draft.questions) ? draft.questions : [];
        const draftResults = Array.isArray(draft.results) ? draft.results : [];

        const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
        const brandFontRaw = typeof draft.brand_font === "string" ? draft.brand_font : "";
        const brandPrimaryRaw = typeof draft.brand_color_primary === "string" ? draft.brand_color_primary : "";
        const brandBgRaw = typeof draft.brand_color_background === "string" ? draft.brand_color_background : "";

        // The unique partial index on embed_session_id forbids two
        // anonymous quizzes per session. If a previous attempt left
        // one behind (rare — failed insert mid-flight), wipe it
        // first so the visitor isn't stuck on a stale generation.
        const { error: prevDelErr } = await supabaseAdmin
          .from("quizzes")
          .delete()
          .eq("embed_session_id", sessionToken);
        if (prevDelErr) {
          console.error("[embed/generate] stale-quiz delete failed:", prevDelErr.message);
          sse("error", { ok: false, reason: "generic" });
          return;
        }

        const { data: quizRow, error: quizInsertErr } = await supabaseAdmin
          .from("quizzes")
          .insert({
            user_id: null,
            embed_session_id: sessionToken,
            mode: "quiz",
            title: String(draft.title ?? "Mon quiz").slice(0, 200),
            introduction: typeof draft.introduction === "string"
              ? draft.introduction.slice(0, 2000)
              : (typeof draft.description === "string" ? draft.description.slice(0, 2000) : null),
            cta_text: typeof draft.cta_text === "string" ? draft.cta_text : null,
            cta_url: typeof draft.cta_url === "string" ? draft.cta_url : null,
            share_message: typeof draft.share_message === "string" ? draft.share_message : null,
            locale: typeof draft.locale === "string" ? draft.locale : locale,
            address_form: addressForm,
            ask_first_name: askFirstName,
            ask_gender: askGender,
            status: "draft",
            brand_font: brandFontRaw || null,
            brand_color_primary: HEX_RE.test(brandPrimaryRaw) ? brandPrimaryRaw : null,
            brand_color_background: HEX_RE.test(brandBgRaw) ? brandBgRaw : null,
          })
          .select("id")
          .single();

        if (quizInsertErr || !quizRow) {
          console.error("[embed/generate] quiz materialization failed:", quizInsertErr);
          sse("error", { ok: false, reason: "generic" });
          return;
        }

        // Insert questions + results. We use the same field shape the
        // authenticated POST /api/quiz uses so QuizDetailClient reads
        // them back identically — no special embed code path. Both
        // inserts are now error-checked: if either fails we hard-delete
        // the orphan quiz row so the visitor isn't stuck with an empty
        // shell on next /generate attempt (the unique-index sweep above
        // also handles this on retry, but explicit cleanup is cleaner).
        if (draftQuestions.length > 0) {
          const { error: qInsErr } = await supabaseAdmin.from("quiz_questions").insert(
            (draftQuestions as Record<string, unknown>[]).map((q, i) => ({
              quiz_id: quizRow.id,
              question_text: String(q.question_text ?? q.text ?? ""),
              options: Array.isArray(q.options) ? q.options : [],
              sort_order: i,
              question_type: "multiple_choice",
              config: {},
            })),
          );
          if (qInsErr) {
            console.error("[embed/generate] questions insert failed:", qInsErr.message);
            await supabaseAdmin.from("quizzes").delete().eq("id", quizRow.id);
            sse("error", { ok: false, reason: "generic" });
            return;
          }
        }
        if (draftResults.length > 0) {
          const { error: rInsErr } = await supabaseAdmin.from("quiz_results").insert(
            (draftResults as Record<string, unknown>[]).map((r, i) => ({
              quiz_id: quizRow.id,
              title: String(r.title ?? ""),
              description: typeof r.description === "string" ? r.description : null,
              insight: typeof r.insight === "string" ? r.insight : null,
              projection: typeof r.projection === "string" ? r.projection : null,
              cta_text: typeof r.cta_text === "string" ? r.cta_text : null,
              cta_url: typeof r.cta_url === "string" ? r.cta_url : null,
              sort_order: i,
            })),
          );
          if (rInsErr) {
            console.error("[embed/generate] results insert failed:", rInsErr.message);
            // Cascade clears quiz_questions via FK, then drop the quiz row.
            await supabaseAdmin.from("quiz_questions").delete().eq("quiz_id", quizRow.id);
            await supabaseAdmin.from("quizzes").delete().eq("id", quizRow.id);
            sse("error", { ok: false, reason: "generic" });
            return;
          }
        }

        // Mirror the JSON onto the embed session for the legacy /save
        // path. New clients ignore this column — they PATCH the real
        // quiz row directly.
        await supabaseAdmin
          .from("embed_quiz_sessions")
          .update({ quiz })
          .eq("id", sessionToken);

        sse("result", {
          ok: true,
          quiz,
          quiz_id: quizRow.id,
          session_token: sessionToken,
        });
      } catch (e) {
        console.error("[embed/generate] stream error:", e);
        // Une exception n'est jamais la phrase que lit le visiteur : le
        // détail est dans le journal, l'écran dit `generic` dans sa langue.
        sse("error", { ok: false, reason: "generic" });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Range ce que cette génération a coûté, et combien de temps elle a pris.
 *
 * ON STOCKE DES FAITS (le modèle, les jetons, la durée), JAMAIS UN
 * MONTANT. Le prix vit dans `lib/generateur/tarifsIa.ts` avec sa date de
 * relevé : figer un montant dans la base rendrait l'historique
 * impossible à corriger le jour où la table de tarifs est fausse.
 *
 * UNE SEULE ÉCRITURE, ET UN SEUL ENDROIT QUI DÉCIDE. Une fonction
 * soeur pour la durée voudrait dire deux updates sur la même ligne, à
 * deux moments, donc deux occasions de perdre l'un des deux et un
 * doute permanent sur lequel des deux a réussi.
 *
 * LA DURÉE EST ÉCRITE MÊME SANS `usage`. Une réponse dont on ne sait
 * pas lire les compteurs a quand même pris du temps, et c'est
 * précisément le genre de réponse (tronquée, refusée) qui traîne le
 * plus : les exclure ferait une médiane trop flatteuse.
 *
 * Ne lève jamais, ne rend rien : le seul appelant est un flux SSE en
 * train de livrer un quiz.
 */
async function enregistrerUsage(
  sessionToken: string,
  json: Record<string, unknown>,
  dureeMs: number,
): Promise<void> {
  const entier = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const usage = (json?.usage ?? null) as Record<string, unknown> | null;
  const modele = typeof json?.model === "string" ? json.model.slice(0, 120) : null;
  const ligne: Record<string, unknown> = { duree_ms: entier(dureeMs) };
  if (usage) {
    ligne.modele_ia = modele;
    ligne.jetons_entree = entier(usage.input_tokens);
    ligne.jetons_sortie = entier(usage.output_tokens);
  }
  const { error } = await supabaseAdmin
    .from("embed_quiz_sessions")
    .update(ligne)
    .eq("id", sessionToken);
  if (error) {
    console.error(
      `[embed/generate] usage non enregistre (migrations 20260908_generateur_usage et 20260909_generateur_duree passees ?) : ${error.message}`,
    );
  }
}
