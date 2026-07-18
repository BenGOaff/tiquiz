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

export const TIQUIZ_AUTHORIZE_URL = `${TIQUIZ_BASE}/connect/quizing`;

export interface TiquizConnection {
  user_id: string;
  tiquiz_user_id: string | null;
  tiquiz_email: string | null;
  token: string;
  connected_at: string;
  last_synced_at: string | null;
  metrics: TiquizMetrics | null;
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
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/quiz-audit`, {
      headers: { "x-partner-secret": SHARED, Authorization: `Bearer ${conn.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok) return null;
    return (json.quizzes ?? []) as import("@/lib/quizDoctor").QuizStruct[];
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

async function fetchMetrics(token: string): Promise<TiquizMetrics | null> {
  try {
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/metrics`, {
      headers: { "x-partner-secret": SHARED, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok) return null;
    return json.metrics as TiquizMetrics;
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

  const metrics = await fetchMetrics(conn.token);
  if (!metrics) return { metrics: conn.metrics, newBadges: [] };

  await supabaseAdmin
    .from("tiquiz_connections")
    .update({ metrics, last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);

  const newBadges = await awardMetricBadges(userId, metrics);
  return { metrics, newBadges };
}
