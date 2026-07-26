// lib/integrations/tiquiz.ts
// Cote consommateur du pont L'Atelier du Quiz <- Tiquiz. Server-only.
// - echange du code de consentement contre un token durable
// - lecture des metriques via le token
// - persistance de la connexion + snapshot
// - attribution des badges de resultat (leads)
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { earnedBadgeCodes, badgeByCode } from "@/lib/gamification";
import { snapshotFromDays, getDaysWithProgress } from "@/lib/parcours";
import type { TiquizMetrics } from "@/lib/types";

const TIQUIZ_BASE = (process.env.TIQUIZ_BASE_URL ?? "https://quiz.tipote.com").trim();
const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

/**
 * Les titres de quiz Tiquiz sont stockés en HTML riche (spans colorés,
 * alignement). Dans l'Atelier on les affiche en TEXTE seul, sinon le user
 * voit le balisage brut (drame Gwenn 19 juil 2026 : "Ton meilleur quiz :
 * <div style=...>"). On nettoie à l'ingestion, une seule fois.
 */
export function stripTiquizHtml(input: string | null | undefined): string {
  return String(input ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&rsquo;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// La page de consentement cote Tiquiz est servie a /connect/formaquiz
// (app/connect/formaquiz). Le rebrand "quizing" du 18 juin a pointe ce
// lien vers /connect/quizing qui n'existe PAS cote Tiquiz -> 404 au clic
// sur "Connecter mon Tiquiz" (retour Yves). On garde le chemin reel.
export const TIQUIZ_AUTHORIZE_URL = `${TIQUIZ_BASE}/connect/formaquiz`;

export interface TiquizConnection {
  user_id: string;
  tiquiz_user_id: string | null;
  tiquiz_email: string | null;
  token: string;
  connected_at: string;
  last_synced_at: string | null;
  metrics: TiquizMetrics | null;
  /** Sélection projet/quiz mémorisée : "" (tout) | "project:<id>" | "quiz:<id>". */
  selected_scope: string | null;
}

/** Traduit la sélection mémorisée en query string pour l'API partenaire. */
export function scopeToQuery(scope: string | null | undefined): string {
  const s = String(scope ?? "").trim();
  if (s.startsWith("quiz:")) return `?quizId=${encodeURIComponent(s.slice(5))}`;
  if (s.startsWith("project:")) return `?projectId=${encodeURIComponent(s.slice(8))}`;
  return "";
}

/**
 * Résout la sélection EFFECTIVE (le quiz que l'Atelier étudie), pour que le
 * coach, le Quiz Doctor, les analyses et les emails par profil parlent TOUS
 * du même quiz. Règle : sélection mémorisée valide -> on la garde ; sinon
 * défaut = quiz le plus récent (hors sondage), qu'on MÉMORISE (auto-init).
 * Ainsi le défaut est identique partout, même avant que l'user ait ouvert
 * la carte "Quiz suivi". Best-effort : renvoie "" si rien d'exploitable.
 */
async function resolveScope(userId: string, conn: TiquizConnection): Promise<string> {
  const stored = String(conn.selected_scope ?? "").trim();
  if (stored.startsWith("quiz:") || stored.startsWith("project:")) return stored;

  const list = await fetchTiquizQuizList(userId);
  const firstQuiz = list?.quizzes.find((q) => q.mode !== "survey");
  if (!firstQuiz) return "";
  const scope = `quiz:${firstQuiz.id}`;
  // Mémorise le défaut (idempotent) : les prochains appels sont directs.
  await supabaseAdmin
    .from("tiquiz_connections")
    .update({ selected_scope: scope })
    .eq("user_id", userId)
    .then(() => {}, () => {});
  return scope;
}

export async function getTiquizConnection(userId: string): Promise<TiquizConnection | null> {
  const { data } = await supabaseAdmin
    .from("tiquiz_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const conn = data as TiquizConnection;
  // metrics jsonb vaut {} tant qu'aucune synchro n'a abouti : on normalise
  // en null pour que l'UI affiche l'etat "connecte, en cours" proprement.
  const m = conn.metrics as TiquizMetrics | Record<string, never> | null;
  conn.metrics = m && typeof (m as TiquizMetrics).leads === "number" ? (m as TiquizMetrics) : null;
  return conn;
}

/** Echange app-a-app du code de consentement contre un token durable. */
export async function exchangeCodeForToken(
  code: string,
): Promise<{ token: string; tiquizUserId: string | null; email: string | null } | null> {
  try {
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-partner-secret": SHARED },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json.token) return null;
    return {
      token: json.token as string,
      tiquizUserId: (json.user_id as string) ?? null,
      email: (json.email as string) ?? null,
    };
  } catch {
    return null;
  }
}

/** Structure des quiz de l'eleve pour le Quiz Doctor (lecture seule). */
export async function fetchQuizAudit(
  userId: string,
): Promise<import("@/lib/quizDoctor").QuizStruct[] | null> {
  const conn = await getTiquizConnection(userId);
  if (!conn?.token) return null;
  try {
    const scope = await resolveScope(userId, conn);
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/quiz-audit${scopeToQuery(scope)}`, {
      headers: { "x-partner-secret": SHARED, Authorization: `Bearer ${conn.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok) return null;
    const quizzes = (json.quizzes ?? []) as import("@/lib/quizDoctor").QuizStruct[];
    // Nettoyage HTML des titres (quiz + profils de résultat) : affichés en
    // texte seul dans le Quiz Doctor et les emails par profil.
    for (const q of quizzes) {
      if (q && typeof q.title === "string") q.title = stripTiquizHtml(q.title);
      if (Array.isArray(q?.resultProfiles)) {
        for (const p of q.resultProfiles) {
          if (p && typeof p.title === "string") p.title = stripTiquizHtml(p.title);
        }
      }
    }
    return quizzes;
  } catch {
    return null;
  }
}

/**
 * Recupere les profils de resultat REELS du quiz de l'eleve (source de
 * verite pour les emails par profil). On choisit le quiz le plus pertinent :
 * priorite au quiz actif/publie qui a des profils, sinon celui qui en a le
 * plus, en departageant par le nombre de vues. Renvoie [] si non connecte,
 * aucun quiz, ou aucun profil.
 */
export async function fetchQuizProfiles(
  userId: string,
): Promise<import("@/lib/quizDoctor").QuizResultProfile[]> {
  const quizzes = await fetchQuizAudit(userId);
  if (!quizzes || quizzes.length === 0) return [];

  const withProfiles = quizzes.filter((q) => (q.resultProfiles?.length ?? 0) > 0);
  if (withProfiles.length === 0) return [];

  const best = withProfiles.sort((a, b) => {
    const aActive = a.status === "active" ? 1 : 0;
    const bActive = b.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aCount = a.resultProfiles?.length ?? 0;
    const bCount = b.resultProfiles?.length ?? 0;
    if (aCount !== bCount) return bCount - aCount;
    return (b.views ?? 0) - (a.views ?? 0);
  })[0];

  return (best.resultProfiles ?? []).filter((p) => p.title.trim().length > 0);
}

export interface TiquizProjectRef { id: string; name: string; is_default: boolean }
export interface TiquizQuizRef { id: string; title: string; project_id: string | null; mode: string | null; status: string | null }

/** Liste des projets + quiz du compte Tiquiz (pour le sélecteur). Titres
 *  nettoyés du HTML. Renvoie null si non connecté / erreur. */
export async function fetchTiquizQuizList(
  userId: string,
): Promise<{ projects: TiquizProjectRef[]; quizzes: TiquizQuizRef[] } | null> {
  const conn = await getTiquizConnection(userId);
  if (!conn?.token) return null;
  try {
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/quizzes`, {
      headers: { "x-partner-secret": SHARED, Authorization: `Bearer ${conn.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok) return null;
    const projects = (json.projects ?? []) as TiquizProjectRef[];
    const quizzes = ((json.quizzes ?? []) as TiquizQuizRef[]).map((q) => ({
      ...q,
      title: stripTiquizHtml(q.title) || "Quiz sans titre",
    }));
    return { projects, quizzes };
  } catch {
    return null;
  }
}

async function fetchMetrics(token: string, scope?: string | null): Promise<TiquizMetrics | null> {
  try {
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/metrics${scopeToQuery(scope)}`, {
      headers: { "x-partner-secret": SHARED, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok) return null;
    const metrics = json.metrics as TiquizMetrics;
    // Titre du meilleur quiz : texte seul (le HTML riche vient de Tiquiz).
    if (metrics?.topQuiz?.title) {
      metrics.topQuiz.title = stripTiquizHtml(metrics.topQuiz.title);
    }
    return metrics;
  } catch {
    return null;
  }
}

export async function saveConnection(
  userId: string,
  token: string,
  tiquizUserId: string | null,
  tiquizEmail: string | null,
): Promise<void> {
  await supabaseAdmin.from("tiquiz_connections").upsert(
    {
      user_id: userId,
      token,
      tiquiz_user_id: tiquizUserId,
      tiquiz_email: tiquizEmail,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  // Une connexion explicite annule un eventuel opt-out d'auto-connexion.
  await supabaseAdmin
    .from("profiles")
    .update({ tiquiz_autolink_optout: false })
    .eq("id", userId);
}

/** Tente l'auto-connexion par email (compte Tiquiz de meme adresse). */
async function autoLink(
  email: string,
): Promise<{ token: string; tiquizUserId: string | null; email: string | null } | null> {
  try {
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/auto-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-partner-secret": SHARED },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json.found || !json.token) return null;
    return {
      token: json.token as string,
      tiquizUserId: (json.user_id as string) ?? null,
      email: (json.email as string) ?? email,
    };
  } catch {
    return null;
  }
}

/**
 * Connecte automatiquement le Tiquiz de l'eleve si :
 *  - aucune connexion existante,
 *  - l'eleve n'a pas opt-out (deconnexion manuelle "mauvais compte"),
 *  - un compte Tiquiz porte la meme adresse email.
 * Renvoie true si une connexion vient d'etre etablie.
 */
export async function ensureAutoConnect(
  userId: string,
  email: string | null,
  optout: boolean,
): Promise<boolean> {
  if (!email || optout) return false;
  const existing = await getTiquizConnection(userId);
  if (existing) return false;

  const linked = await autoLink(email);
  if (!linked) return false;

  await saveConnection(userId, linked.token, linked.tiquizUserId, linked.email);
  await syncMetrics(userId);
  return true;
}

/** Deconnecte le Tiquiz : revoque cote Tiquiz, supprime la connexion et
 *  pose l'opt-out pour ne pas reconnecter automatiquement (mauvais compte). */
export async function disconnect(userId: string): Promise<void> {
  const conn = await getTiquizConnection(userId);
  if (conn?.token) {
    try {
      await fetch(`${TIQUIZ_BASE}/api/partner/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-partner-secret": SHARED },
        body: JSON.stringify({ token: conn.token }),
        cache: "no-store",
      });
    } catch {
      // best-effort : on supprime la connexion locale quoi qu'il arrive.
    }
  }
  await supabaseAdmin.from("tiquiz_connections").delete().eq("user_id", userId);
  await supabaseAdmin
    .from("profiles")
    .update({ tiquiz_autolink_optout: true })
    .eq("id", userId);
}

/** Attribue les badges de resultat merites par les metriques. */
async function awardMetricBadges(
  userId: string,
  metrics: TiquizMetrics,
): Promise<{ code: string; label: string }[]> {
  const days = await getDaysWithProgress(userId);
  const earned = earnedBadgeCodes(snapshotFromDays(days), { leads: metrics.leads });

  const { data: existing } = await supabaseAdmin
    .from("badges")
    .select("code")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((b) => b.code as string));

  const toInsert = earned.filter((code) => !have.has(code));
  if (toInsert.length === 0) return [];

  await supabaseAdmin
    .from("badges")
    .upsert(
      toInsert.map((code) => ({ user_id: userId, code })),
      { onConflict: "user_id,code", ignoreDuplicates: true },
    );

  const out: { code: string; label: string }[] = [];
  for (const code of toInsert) {
    const def = badgeByCode(code);
    if (def) out.push({ code, label: def.label });
  }
  return out;
}

/** Rafraichit les metriques Tiquiz + attribue les nouveaux badges. */
export async function syncMetrics(
  userId: string,
): Promise<{ metrics: TiquizMetrics | null; newBadges: { code: string; label: string }[] }> {
  const conn = await getTiquizConnection(userId);
  if (!conn) return { metrics: null, newBadges: [] };

  const scope = await resolveScope(userId, conn);
  const metrics = await fetchMetrics(conn.token, scope);
  if (!metrics) return { metrics: conn.metrics, newBadges: [] };

  await supabaseAdmin
    .from("tiquiz_connections")
    .update({ metrics, last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);

  const newBadges = await awardMetricBadges(userId, metrics);
  return { metrics, newBadges };
}
