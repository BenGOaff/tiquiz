// lib/plusTrial/grant.ts
// Orchestration de l'opération "les 20 premiers inscrits reçoivent 1 mois
// Tiquiz Plus offert". Server-only.
//
// Deux tunnels Systeme.io (le tien = "bene", l'affilié = "affiliate"),
// 20 places chacun. Le flux, déclenché depuis le webhook Atelier après un
// achat confirmé :
//   1. Détecter le tunnel (présence d'une attribution affiliée => affiliate).
//   2. Idempotence : un claim déjà "granted"/"already_premium" ne rejoue pas.
//   3. Réserver une place de façon ATOMIQUE (compare-and-swap sur le
//      compteur) AVANT d'appeler Tiquiz -> jamais de survente.
//   4. Appeler Tiquiz /api/partner/grant-plus-trial (secret partagé).
//      - déjà premium (lifetime/beta/plus) : on LIBÈRE la place (pas
//        consommée) et on journalise.
//      - octroyé : on garde la place.
//      - erreur : on libère la place et on journalise "error" (rejouable).
//   5. Journaliser le claim (audit + support transfert de compte).
//
// Best-effort de bout en bout : ce module ne throw jamais vers l'appelant
// (le webhook), pour ne JAMAIS bloquer l'octroi d'accès à l'Atelier.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractFunnelUrl, extractSaFromPayload } from "@/lib/affiliateTracking";

const TIQUIZ_BASE = (process.env.TIQUIZ_BASE_URL ?? "https://quiz.tipote.com").trim().replace(/\/$/, "");
const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();
const TRIAL_DAYS = 30;

export type PlusTrialFunnel = string;

/**
 * Détecte le tunnel d'origine. Une attribution affiliée (code `sa`) => tunnel
 * affilié. Sinon tunnel propre de Béné. Surcharge possible via
 * PLUS_TRIAL_AFFILIATE_FUNNEL_SLUGS (slugs d'URL de tunnel, séparés par des
 * virgules) pour les cas où l'affiliation n'est pas dans le payload.
 */
export function detectPlusTrialFunnel(body: unknown): PlusTrialFunnel {
  const slugs = (process.env.PLUS_TRIAL_AFFILIATE_FUNNEL_SLUGS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const funnelUrl = (extractFunnelUrl(body) ?? "").toLowerCase();
  if (slugs.length > 0 && funnelUrl && slugs.some((s) => funnelUrl.includes(s))) {
    return "affiliate";
  }
  const sa = extractSaFromPayload(body);
  if (sa && String(sa).trim()) return "affiliate";
  return "bene";
}

interface CounterRow {
  funnel: string;
  granted: number;
  cap: number;
}

/** Assure l'existence de la ligne compteur (cap 20 par défaut). */
async function ensureCounter(funnel: string): Promise<void> {
  await supabaseAdmin
    .from("plus_trial_counters")
    .upsert({ funnel, granted: 0, cap: 20 }, { onConflict: "funnel", ignoreDuplicates: true });
}

/**
 * Réserve atomiquement une place via compare-and-swap. Retourne le numéro
 * de place (1-based) si réservée, ou null si plus de place (compteur plein).
 */
async function reservePlace(funnel: string): Promise<number | null> {
  await ensureCounter(funnel);
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabaseAdmin
      .from("plus_trial_counters")
      .select("funnel, granted, cap")
      .eq("funnel", funnel)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as CounterRow;
    if (row.granted >= row.cap) return null; // plein

    // CAS : n'incrémente QUE si `granted` n'a pas bougé entre le read et le
    // write. Si 0 ligne modifiée -> contention, on relit et on retente.
    const { data: updated } = await supabaseAdmin
      .from("plus_trial_counters")
      .update({ granted: row.granted + 1, updated_at: new Date().toISOString() })
      .eq("funnel", funnel)
      .eq("granted", row.granted)
      .select("granted")
      .maybeSingle();
    if (updated) return row.granted + 1;
  }
  return null; // trop de contention (ne devrait jamais arriver à cette échelle)
}

/** Libère une place réservée (compensation quand l'octroi n'a pas eu lieu). */
async function releasePlace(funnel: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data } = await supabaseAdmin
      .from("plus_trial_counters")
      .select("granted")
      .eq("funnel", funnel)
      .maybeSingle();
    if (!data) return;
    const g = (data as { granted: number }).granted;
    if (g <= 0) return;
    const { data: updated } = await supabaseAdmin
      .from("plus_trial_counters")
      .update({ granted: g - 1, updated_at: new Date().toISOString() })
      .eq("funnel", funnel)
      .eq("granted", g)
      .select("granted")
      .maybeSingle();
    if (updated) return;
  }
}

interface ClaimRow {
  id: string;
  status: string;
  consumed_place: boolean;
}

interface TiquizGrantResponse {
  ok?: boolean;
  granted?: boolean;
  reason?: string;
  granted_plan?: string;
  pre_plan?: string;
  expires_at?: string;
  created?: boolean;
  current_plan?: string;
}

async function callTiquizGrant(
  email: string,
  funnel: string,
): Promise<{ httpOk: boolean; body: TiquizGrantResponse | null }> {
  if (!SHARED) return { httpOk: false, body: null };
  try {
    const res = await fetch(`${TIQUIZ_BASE}/api/partner/grant-plus-trial`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-partner-secret": SHARED },
      body: JSON.stringify({ email, days: TRIAL_DAYS, source: "atelier_plus_trial", funnel }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as TiquizGrantResponse | null;
    return { httpOk: res.ok, body };
  } catch (e) {
    console.error("[plusTrial] tiquiz call error:", (e as Error).message);
    return { httpOk: false, body: null };
  }
}

export interface MaybeGrantArgs {
  sioEmail: string;
  funnel: PlusTrialFunnel;
  orderId?: string | null;
  origin?: string;
  /** Email du compte Tiquiz à cibler s'il diffère de l'email SIO. */
  tiquizEmail?: string | null;
}

export interface MaybeGrantResult {
  ok: boolean;
  status: "granted" | "already_premium" | "full" | "error" | "skipped";
  reason?: string;
}

/**
 * Point d'entrée principal, appelé par le webhook. Idempotent, best-effort,
 * ne throw jamais.
 */
export async function maybeGrantPlusTrial(args: MaybeGrantArgs): Promise<MaybeGrantResult> {
  const sioEmail = args.sioEmail.trim().toLowerCase();
  const targetEmail = (args.tiquizEmail ?? sioEmail).trim().toLowerCase();
  const funnel = args.funnel;

  if (!sioEmail || !sioEmail.includes("@")) {
    return { ok: false, status: "skipped", reason: "no_email" };
  }
  if (!SHARED) {
    console.warn("[plusTrial] PARTNER_SHARED_SECRET manquant, octroi ignoré.");
    return { ok: false, status: "skipped", reason: "no_secret" };
  }

  try {
    // ── 1a. Idempotence GLOBALE (tous tunnels) : un même acheteur ne peut
    // recevoir qu'UNE seule fois le mois offert, même s'il déclenche les
    // deux tunnels. On regarde tout claim final sur cet email. ──
    const { data: anyFinal } = await supabaseAdmin
      .from("plus_trial_claims")
      .select("status")
      .ilike("sio_email", sioEmail)
      .in("status", ["granted", "already_premium"])
      .limit(1)
      .maybeSingle();
    if (anyFinal) {
      const st = (anyFinal as { status: string }).status;
      return { ok: true, status: st as MaybeGrantResult["status"], reason: "idempotent_global" };
    }

    // ── 1b. Claim (ce tunnel) déjà final ? (double sécurité) ──
    const { data: existing } = await supabaseAdmin
      .from("plus_trial_claims")
      .select("id, status, consumed_place")
      .eq("funnel", funnel)
      .ilike("sio_email", sioEmail)
      .maybeSingle();
    const claim = existing as ClaimRow | null;
    if (claim && (claim.status === "granted" || claim.status === "already_premium")) {
      return { ok: true, status: claim.status as MaybeGrantResult["status"], reason: "idempotent" };
    }

    // ── 2. Réserver une place AVANT l'appel (anti-survente) ──
    const placeNumber = await reservePlace(funnel);
    if (placeNumber == null) {
      await upsertClaim(claim?.id, {
        funnel,
        sio_email: sioEmail,
        sio_order_id: args.orderId ?? null,
        status: "full",
        consumed_place: false,
        origin: args.origin ?? "systeme_io",
      });
      return { ok: true, status: "full", reason: "no_place_left" };
    }

    // ── 3. Appeler Tiquiz ──
    const { httpOk, body } = await callTiquizGrant(targetEmail, funnel);

    // 3a. Erreur dure : on libère la place, claim rejouable.
    if (!httpOk || !body || body.ok === false) {
      await releasePlace(funnel);
      await upsertClaim(claim?.id, {
        funnel,
        sio_email: sioEmail,
        sio_order_id: args.orderId ?? null,
        tiquiz_email: targetEmail,
        status: "error",
        consumed_place: false,
        last_error: body?.reason ?? "tiquiz_unreachable",
        origin: args.origin ?? "systeme_io",
      });
      return { ok: false, status: "error", reason: body?.reason ?? "tiquiz_unreachable" };
    }

    // 3b. Déjà premium : pas de place consommée, on libère.
    if (body.granted === false) {
      await releasePlace(funnel);
      await upsertClaim(claim?.id, {
        funnel,
        sio_email: sioEmail,
        sio_order_id: args.orderId ?? null,
        tiquiz_email: targetEmail,
        status: "already_premium",
        consumed_place: false,
        pre_plan: body.current_plan ?? null,
        origin: args.origin ?? "systeme_io",
      });
      return { ok: true, status: "already_premium", reason: body.reason };
    }

    // 3c. Octroyé : on garde la place.
    await upsertClaim(claim?.id, {
      funnel,
      sio_email: sioEmail,
      sio_order_id: args.orderId ?? null,
      tiquiz_email: targetEmail,
      status: "granted",
      consumed_place: true,
      place_number: placeNumber,
      granted_plan: body.granted_plan ?? null,
      pre_plan: body.pre_plan ?? null,
      expires_at: body.expires_at ?? null,
      origin: args.origin ?? "systeme_io",
    });
    return { ok: true, status: "granted", reason: body.reason };
  } catch (e) {
    console.error("[plusTrial] maybeGrantPlusTrial error:", (e as Error).message);
    return { ok: false, status: "error", reason: "exception" };
  }
}

type ClaimFields = {
  funnel: string;
  sio_email: string;
  sio_order_id?: string | null;
  tiquiz_email?: string | null;
  tiquiz_user_id?: string | null;
  status: string;
  granted_plan?: string | null;
  pre_plan?: string | null;
  expires_at?: string | null;
  consumed_place: boolean;
  place_number?: number | null;
  origin?: string | null;
  last_error?: string | null;
};

/** Crée ou met à jour le claim (par id si connu). */
async function upsertClaim(id: string | undefined, fields: ClaimFields): Promise<void> {
  const now = new Date().toISOString();
  if (id) {
    await supabaseAdmin
      .from("plus_trial_claims")
      .update({ ...fields, updated_at: now })
      .eq("id", id);
  } else {
    await supabaseAdmin.from("plus_trial_claims").insert({ ...fields, updated_at: now });
  }
}

export interface PlusTrialStatus {
  funnel: string;
  cap: number;
  granted: number;
  remaining: number;
}

/** Décompte public pour le widget (best-effort, jamais throw). */
export async function getPlusTrialStatus(funnel: string): Promise<PlusTrialStatus> {
  const f = funnel.trim() || "bene";
  try {
    await ensureCounter(f);
    const { data } = await supabaseAdmin
      .from("plus_trial_counters")
      .select("granted, cap")
      .eq("funnel", f)
      .maybeSingle();
    const granted = (data as { granted?: number } | null)?.granted ?? 0;
    const cap = (data as { cap?: number } | null)?.cap ?? 20;
    return { funnel: f, cap, granted, remaining: Math.max(0, cap - granted) };
  } catch {
    return { funnel: f, cap: 20, granted: 0, remaining: 20 };
  }
}
