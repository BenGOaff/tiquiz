// app/api/systeme-io/webhook/route.ts
// Webhook Systeme.io pour Tiquiz — crée/upgrade les users après achat.
//
// SIO fires the SAME URL for successful sales, failed payments, cancellations
// and refunds. We only grant access on confirmed-payment events and we must
// be idempotent because SIO retries aggressively on any non-2xx response.
import { NextRequest, NextResponse } from "next/server";

import { readSioAmountCents } from "@/lib/admin/sioSales";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { getSignatureMode, verifySioSignature } from "@/lib/sioWebhookSig";
import { resolveAppUrl } from "@/lib/authLinks";
import {
  cancelSubscription,
  findContactByEmail,
  listSubscriptionsForContact,
} from "@/lib/systemeIoClient";

const WEBHOOK_SECRET = process.env.SYSTEME_IO_WEBHOOK_SECRET;

/**
 * Constant-time secret comparison. The previous `received !== expected`
 * check leaked information about how many leading characters matched, so
 * an attacker firing thousands of guesses could bisect the secret one
 * byte at a time. timingSafeEqual returns in O(n) regardless of where
 * the mismatch happens.
 */
function secretMatches(received: string | null | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
const APP_URL = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

// Logique d'inférence du plan extraite dans lib/sio/webhookInference.ts
// (module pur, testable sans Next.js et réutilisable par le script de
// test + l'endpoint admin dry-run). Source unique de vérité pour le
// mapping URL/offer-id → plan Tiquiz.
import {
  AMOUNT_PATHS,
  FALLBACK_PAID_PLAN,
  inferPlanFromAmount,
  PAID_AMOUNT_PATHS,
  inferPlanFromOfferId as inferPlan,
  inferPlanFromUrl,
  isConfirmedSaleEvent,
  type TiquizPlan,
} from "@/lib/sio/webhookInference";
// Une vente encaissée sans accès ouvert PRÉVIENT Béné (drame Ivan, 7 août).
import { sendSaleRefusedAlert } from "@/lib/email/saleRefusedAlert";
import { LIFETIME_PLANS } from "@/lib/plans/lifetime";

// Plans Tiquiz refuses to downgrade automatically. `beta` is granted manually
// by Ben for lifetime access; `lifetime` is the paid one-time tier. Both must
// survive any webhook event — if Ben needs to revoke one, he does it via the
// admin endpoint, not via SIO. SIO can NEVER bring these accounts back to
// `free`.
//
// NB : monthly_plus / yearly_plus NE SONT PAS dans LIFETIME_PLANS — ce
// sont des abonnements récurrents qui DOIVENT pouvoir être downgrade
// vers free quand SIO envoie CANCEL / REFUND / EXPIR (comme monthly/yearly).
// La liste elle-meme vit desormais dans lib/plans/lifetime.ts : un
// DEUXIEME chemin de retrogradation existe depuis le 20 aout (le
// remboursement d'une vente Stripe encaissee par nous), et une liste de
// protections recopiee a deux endroits finit toujours par diverger.

// Events that confirm the end of a paid subscription — we downgrade the
// affected user's plan back to `free` (UNLESS they're on lifetime/beta).
// SIO documents `SALE_CANCELED`; the rest of the regex is defensive against
// future variants and against partner integrations that re-emit different
// strings (REFUND_*, *_EXPIRED, etc.).
const TERMINAL_EVENT_RE = /CANCEL|REFUND|EXPIR|CHARGEBACK/i;

// Events that signal a transient payment problem (failed retry, declined,
// in dispute). DO NOT downgrade — the next retry might succeed and SIO
// will fire a definitive CANCEL/REFUND later if the situation doesn't
// improve. Treating these as "no-op" prevents flapping users from being
// downgraded mid-retry-cycle.
const TRANSIENT_FAILURE_RE = /FAIL|DECLIN|DISPUT/i;

function deepGet(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function extractStr(body: any, paths: readonly string[]): string | null {
  for (const p of paths) {
    const v = deepGet(body, p);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

// Paginated lookup: SIO already has >1k customers and listUsers caps at
// 1000 per page, so we can't rely on a single call. Walks pages until it
// finds the match or exhausts the list.
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const lower = email.toLowerCase();
  const perPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = ((data as any)?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => typeof u.email === "string" && u.email.toLowerCase() === lower);
    if (found) return { id: found.id };
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) return null; // 50k users hard-stop, well beyond current scale
  }
}

async function logWebhook(row: {
  event_id: string | null;
  event_type: string | null;
  payload: any;
  status: string;
  error?: string | null;
}) {
  try {
    await supabaseAdmin.from("webhook_logs").insert({
      source: "systeme_io",
      event_id: row.event_id,
      event_type: row.event_type,
      payload: row.payload,
      status: row.status,
      error: row.error ?? null,
      received_at: new Date().toISOString(),
    } as any);
  } catch {
    // table may not exist or columns missing on old deploys — don't block the flow
  }
}

export async function GET() {
  return NextResponse.json({ error: "POST only. URL: https://quiz.tipote.com/api/systeme-io/webhook?secret=YOUR_SECRET" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  let rawBody: any = null;
  let eventType: string | null = null;
  let eventId: string | null = null;

  try {
    // Read the raw body FIRST so we can HMAC-verify it before parsing.
    let rawText: string;
    try { rawText = await req.text(); }
    catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    // Auth: HMAC signature when SYSTEME_IO_WEBHOOK_SIGNING_SECRET is set
    // (defense-in-depth — closes URL-secret leak vector). When it's not
    // set we fall back to the legacy ?secret= shape so rotating SIO's
    // webhook config isn't a hard cutover.
    const sigMode = getSignatureMode();
    if (sigMode.mode === "required") {
      const sigHeader = req.headers.get("x-webhook-signature");
      const verdict = verifySioSignature(rawText, sigHeader);
      if (!verdict.ok) {
        console.warn(`[Tiquiz webhook] HMAC verification failed: ${verdict.reason}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      const secret = req.nextUrl.searchParams.get("secret");
      if (!secretMatches(secret, WEBHOOK_SECRET)) {
        return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
      }
    }

    try { rawBody = JSON.parse(rawText); }
    catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    // SIO sends the event type both in the X-Webhook-Event header and inside
    // the body — prefer the header, fall back to body extraction so older
    // payload shapes still work.
    const headerEventType = req.headers.get("x-webhook-event");
    const bodyEventType = extractStr(rawBody, ["type", "event", "event_type", "eventName", "data.type"]);
    eventType = (headerEventType || bodyEventType || "").trim() || null;

    const orderId = extractStr(rawBody, ["order.id", "data.order.id", "order_id", "orderId"]);
    eventId = orderId ? `sio_order_${orderId}` : null;

    // 1. Idempotency FIRST — must run before any branch that mutates state
    //    (downgrade or upgrade). A retried CANCEL must not double-downgrade
    //    a user who in the meantime upgraded again from a different device.
    if (eventId) {
      const { data: dup } = await supabaseAdmin
        .from("webhook_logs")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "processed")
        .limit(1)
        .maybeSingle();
      if (dup) {
        console.log(`[Tiquiz webhook] Duplicate retry event=${eventId} — skipping`);
        return NextResponse.json({ ok: true, duplicate: true, event_id: eventId });
      }
    }

    // 2. Transient failures: log + skip. Don't grant, don't revoke. SIO will
    //    fire the definitive CANCEL/REFUND if the issue doesn't recover.
    if (eventType && TRANSIENT_FAILURE_RE.test(eventType)) {
      console.log(`[Tiquiz webhook] Ignoring transient failure type=${eventType} order=${orderId}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "transient_failure" });
      return NextResponse.json({ ok: true, skipped: "transient_failure", event_type: eventType });
    }

    // 3. Terminal events (CANCEL / REFUND / EXPIR / CHARGEBACK): downgrade
    //    the user's plan to `free` UNLESS they're on a lifetime plan
    //    (lifetime/beta). Lifetime plans are immune by design — Ben's beta
    //    cohort and one-time-fee customers keep access regardless of SIO.
    if (eventType && TERMINAL_EVENT_RE.test(eventType)) {
      const cancelEmail = extractStr(rawBody, [
        "contact.email", "data.contact.email",
        "customer.email", "data.customer.email",
        "email",
      ])?.toLowerCase();
      if (!cancelEmail) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "skipped", error: "cancel_no_email" });
        return NextResponse.json({ ok: false, skipped: "no_email" }, { status: 200 });
      }

      const found = await findUserByEmail(cancelEmail);
      if (!found) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: "cancel_unknown_user" });
        return NextResponse.json({ ok: true, skipped: "unknown_user", email: cancelEmail });
      }

      // select("*") volontaire : reseller_id peut ne pas encore exister
      // en prod (migration resellers). Un select nominatif sur une
      // colonne absente ferait planter TOUT le branch cancel.
      const { data: priorProfile } = await supabaseAdmin
        .from("profiles").select("*").eq("user_id", found.id).maybeSingle();
      const oldPlan = String((priorProfile as { plan?: string | null } | null)?.plan ?? "free").trim().toLowerCase();
      const expectedCancelUntil = (priorProfile as { expected_sio_cancel_until?: string | null } | null)
        ?.expected_sio_cancel_until ?? null;

      // Clients de REVENDEUR : immunisés contre le webhook SIO de Béné,
      // même pattern que l'immunité lifetime ci-dessous. Leur cycle de
      // vie passe par le webhook revendeur (/api/reseller-webhook), pas
      // par les funnels tipote.fr. Sans ce garde-fou, un event SIO sur
      // le même email mélangerait les deux mondes.
      const cancelResellerId =
        (priorProfile as { reseller_id?: string | null } | null)?.reseller_id ?? null;
      if (cancelResellerId) {
        console.warn(`[Tiquiz webhook] REFUSED cancel for reseller client email=${cancelEmail} reseller=${cancelResellerId} event=${eventType}`);
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `refused_reseller_client:${cancelResellerId}` });
        return NextResponse.json({ ok: true, skipped: "reseller_client", email: cancelEmail });
      }

      // Auto-cancel attendu (l'user a upgrade/downgrade vers un autre
      // palier — on a annulé son ancien sub côté SIO). Le SALE_CANCELED
      // qui arrive est l'écho de cette annulation, PAS une vraie volonté
      // de l'user de retomber en free. Ignore si le flag est dans le futur.
      if (expectedCancelUntil && new Date(expectedCancelUntil) > new Date()) {
        console.log(`[Tiquiz webhook] IGNORED expected cancel for ${cancelEmail} (current plan=${oldPlan}, expected_until=${expectedCancelUntil})`);
        await logWebhook({
          event_id: eventId,
          event_type: eventType,
          payload: rawBody,
          status: "processed",
          error: `ignored_expected_cancel:${oldPlan}`,
        });
        return NextResponse.json({
          ok: true,
          skipped: "expected_cancel",
          email: cancelEmail,
          current_plan: oldPlan,
        });
      }

      if (!oldPlan || oldPlan === "free") {
        // Already free — nothing to revoke. Mark processed so retries skip.
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: "already_free" });
        return NextResponse.json({ ok: true, skipped: "already_free", email: cancelEmail });
      }

      if (LIFETIME_PLANS.has(oldPlan)) {
        // Beta + lifetime: never downgrade via webhook — these accounts have
        // been promised lifetime access and the only legitimate revocation
        // path is the admin route. Logged loudly so any unexpected hit is
        // visible in webhook_logs.
        console.warn(`[Tiquiz webhook] REFUSED downgrade for lifetime plan ${oldPlan} email=${cancelEmail} event=${eventType}`);
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `refused_lifetime:${oldPlan}` });
        return NextResponse.json({ ok: true, skipped: "lifetime_plan", plan: oldPlan, email: cancelEmail });
      }

      // monthly / yearly → free
      const { error: downErr } = await supabaseAdmin
        .from("profiles")
        .update({ plan: "free", updated_at: new Date().toISOString() })
        .eq("user_id", found.id);
      if (downErr) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: `downgrade:${downErr.message}` });
        // 500 lets SIO retry — webhook_logs row above is `error`, idempotency
        // won't short-circuit on retry.
        return NextResponse.json({ error: "Downgrade failed" }, { status: 500 });
      }

      try {
        await supabaseAdmin.from("plan_change_log").insert({
          target_user_id: found.id,
          target_email: cancelEmail,
          old_plan: oldPlan,
          new_plan: "free",
          reason: `systeme_io:${eventType}:${orderId ?? "no_order"}`,
        } as any);
      } catch {
        // best-effort audit
      }

      console.log(`[Tiquiz webhook] Downgraded ${cancelEmail} ${oldPlan} → free (${eventType})`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `downgraded_from:${oldPlan}` });
      return NextResponse.json({ ok: true, downgraded: true, email: cancelEmail, old_plan: oldPlan, new_plan: "free", event_type: eventType });
    }

    // 4. From here on we're in the NEW SALE / unknown event flow — grant access.
    const email = extractStr(rawBody, ["customer.email", "data.customer.email", "contact.email", "data.contact.email", "email"])?.toLowerCase();
    if (!email) {
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "skipped", error: "no_email" });
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    const firstName = extractStr(rawBody, ["customer.fields.first_name", "data.customer.fields.first_name", "first_name"]);
    const lastName = extractStr(rawBody, ["customer.fields.surname", "data.customer.fields.surname", "last_name"]);

    const offerId = extractStr(rawBody, [
      "pricePlan.id", "data.pricePlan.id", "data.offer_price_plan.id", "data.offer_price.id", "product_id",
    ]) ?? "";

    // Béné 2 juin 2026 après-midi : tous les nouveaux bons de commande
    // Tipote.fr partagent le même offer-price-id (offerprice-dc9c3e75)
    // → impossible de distinguer monthly+/yearly+ par cet ID. On extrait
    // l'URL du bon de commande depuis le payload SIO et on l'utilise EN
    // PRIORITÉ. Fallback sur l'offer-price-id pour les anciens bons
    // (mensuel 9€ / annuel 90€ / lifetime 57€) dont les IDs sont uniques.
    const sourceUrl = extractStr(rawBody, [
      "funnel.url",
      "data.funnel.url",
      "funnel_step.url",
      "data.funnel_step.url",
      "order.source_url",
      "data.order.source_url",
      "source_url",
      "data.source_url",
      "checkout_url",
      "data.checkout_url",
      "data.order.checkout_url",
      "order.funnel.url",
      "data.order.funnel.url",
      "order.funnel_step.url",
      "data.order.funnel_step.url",
    ]);

    const planFromUrl = inferPlanFromUrl(sourceUrl);
    const planFromOffer = inferPlan(offerId);
    const plan = planFromUrl ?? planFromOffer;
    console.log(
      `[Tiquiz webhook] email=${email} type=${eventType} url=${sourceUrl} planFromUrl=${planFromUrl} offerId=${offerId} planFromOffer=${planFromOffer} → plan=${plan} order=${orderId}`,
    );

    // Create or find user
    let userId: string;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (createErr?.message?.toLowerCase().includes("already been registered")) {
      const found = await findUserByEmail(email);
      if (!found) {
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: "user_exists_but_not_found" });
        return NextResponse.json({ error: "User exists but not found" }, { status: 500 });
      }
      userId = found.id;
    } else {
      throw createErr;
    }

    // Capture the old plan BEFORE upsert so we can audit plan transitions.
    // select("*") volontaire : reseller_id peut ne pas encore exister en
    // prod (migration resellers), un select nominatif planterait ici.
    const { data: priorProfile } = await supabaseAdmin
      .from("profiles").select("*").eq("user_id", userId).maybeSingle();
    const oldPlanRaw = String((priorProfile as { plan?: string | null } | null)?.plan ?? "").trim().toLowerCase();
    const oldPlan = (oldPlanRaw || null) as TiquizPlan | "beta" | null;

    // Clients de REVENDEUR : immunisés contre le webhook SIO de Béné
    // (même pattern que l'immunité lifetime ci-dessous). Si un client
    // d'un revendeur achète par erreur sur un funnel tipote.fr, on ne
    // touche PAS à son plan : Béné voit le log et rembourse/redirige.
    const upgradeResellerId =
      (priorProfile as { reseller_id?: string | null } | null)?.reseller_id ?? null;
    if (upgradeResellerId) {
      console.warn(`[Tiquiz webhook] REFUSED plan change for reseller client email=${email} reseller=${upgradeResellerId} event=${eventType}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `refused_reseller_client:${upgradeResellerId}` });
      return NextResponse.json({ ok: true, skipped: "reseller_client", email });
    }

    // Beta + lifetime are immune to webhook plan changes — they paid (or were
    // granted) lifetime access. If a SIO event somehow lands for one of them
    // (e.g. they buy a separate monthly subscription on the same email), we
    // log the attempt and keep their existing plan. The only way to remove
    // lifetime is the admin endpoint, never an automated webhook.
    if (oldPlan && LIFETIME_PLANS.has(oldPlan)) {
      console.warn(`[Tiquiz webhook] REFUSED upgrade overwrite for lifetime plan ${oldPlan} email=${email} event=${eventType}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed", error: `refused_lifetime_overwrite:${oldPlan}` });
      return NextResponse.json({ ok: true, skipped: "lifetime_plan", plan: oldPlan, email });
    }

    // 3. Resolve plan — NEVER default to lifetime on unknown offers.
    // If we can't map the offer to a known paid plan and the user isn't
    // already paying, refuse to grant access. Log it so you can see the
    // orphan in webhook_logs and fix OFFER_TO_PLAN (or the SIO config).
    let finalPlan: TiquizPlan | null = plan;
    if (!finalPlan) {
      if (oldPlan && oldPlan !== "free") {
        // Already paying — re-sending a webhook without a clear offer shouldn't
        // downgrade them. Keep their current plan.
        finalPlan = oldPlan as TiquizPlan;
        console.warn(`[Tiquiz webhook] Unknown offer ${offerId} — keeping existing paid plan ${oldPlan}`);
      } else if (isConfirmedSaleEvent(eventType)) {
        // ── UNE VENTE ENCAISSÉE OUVRE TOUJOURS UN ACCÈS ──
        //
        // Béné, 7 août 2026 : "pourquoi une vente refusée ? Il a payé le
        // client, il doit recevoir ses accès, point barre."
        //
        // Elle a raison, et l'ancien comportement était indéfendable.
        // Ce qui est ambigu sur une offre inconnue, ce n'est pas QU'IL a
        // payé (l'événement est une vente confirmée) mais QUEL palier il
        // a pris. On répond donc à la vraie question : le montant s'il
        // est reconnaissable, sinon le palier de base.
        //
        // `monthly` en dernier recours n'est pas un pari : il ouvre
        // exactement les mêmes fonctionnalités que `yearly` (seule la
        // facturation diffère, et Systeme.io s'en occupe), et c'est le
        // moins cher, donc on ne donne jamais un PLUS par accident.
        const parMontant = inferPlanFromAmount(extractStr(rawBody, AMOUNT_PATHS));
        finalPlan = parMontant ?? FALLBACK_PAID_PLAN;
        const msg = `unknown_offer:${offerId || "missing"}→granted:${finalPlan}`;
        console.warn(`[Tiquiz webhook] OFFRE INCONNUE, accès ouvert quand même — ${msg} email=${email}`);
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "granted_fallback", error: msg });
        // On prévient Béné : l'accès est ouvert, mais le palier reste à
        // confirmer, et les deux identifiants reçus sont dans l'email.
        await sendSaleRefusedAlert({
          email,
          offerId: offerId ?? null,
          sourceUrl: sourceUrl ?? null,
          eventType,
          grantedPlan: finalPlan,
        }).catch(() => false);
      } else {
        // Pas une vente : une offre inconnue sur un événement qu'on ne
        // sait pas nommer n'ouvre RIEN. Sans ce garde-fou, n'importe quel
        // appel mal configuré donnerait un accès payant.
        const msg = `unknown_offer:${offerId || "missing"}`;
        console.error(`[Tiquiz webhook] REFUSE grant — ${msg} email=${email} type=${eventType}`);
        await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "refused", error: msg });
        // ON PRÉVIENT BÉNÉ (drame Ivan, 7 août 2026). Le refus est le bon
        // comportement ; c'est le silence qui coûte cher. Avant, la seule
        // trace était cette ligne de log, donc elle l'a appris par le
        // client, le lendemain, alors que toutes les ventes au nouveau
        // prix tombaient pareil depuis la veille.
        //
        // Best-effort : un échec d'envoi ne doit pas changer la réponse,
        // sinon Systeme.io rejoue l'événement en boucle.
        await sendSaleRefusedAlert({
          email,
          offerId: offerId ?? null,
          sourceUrl: sourceUrl ?? null,
          eventType,
          grantedPlan: null,
        }).catch(() => false);
        return NextResponse.json({ ok: false, refused: true, reason: "unknown_offer", offer_id: offerId }, { status: 200 });
      }
    }

    // ── Auto-cancel des anciens subs SIO sur upgrade/downgrade ──
    //
    // Si l'user passait d'un plan PAYANT à un AUTRE plan payant
    // (ex: monthly → monthly_plus, ou monthly_plus → yearly), on a
    // MAINTENANT 2 subs actifs côté SIO : l'ancien + le nouveau qui
    // vient d'être payé. On cancel l'ancien EN ARRIÈRE-PLAN pour éviter
    // que l'user soit facturé 2 fois.
    //
    // Le SALE_CANCELED de l'ancien sub va arriver plus tard — il sera
    // ignoré par la logique terminal-event (cf. expected_sio_cancel_until
    // posé ci-dessous).
    //
    // Cas couverts :
    //   - monthly → monthly_plus (upgrade)
    //   - monthly_plus → monthly (downgrade)
    //   - monthly → yearly_plus (cross)
    //   - free → monthly_plus (pas de cancel, juste flag inutile)
    //   - lifetime/beta → monthly_plus : déjà court-circuité plus haut
    //     (refus de upgrade overwrite pour lifetime)
    let didAutoCancel = false;
    const isCrossPaidTransition =
      oldPlan && oldPlan !== "free" && oldPlan !== finalPlan && !LIFETIME_PLANS.has(oldPlan);

    if (isCrossPaidTransition) {
      try {
        const contact = await findContactByEmail(email);
        if (contact?.id) {
          const subs = await listSubscriptionsForContact(contact.id, { limit: 20, order: "desc" });
          // On garde le sub le PLUS RÉCENT (= le nouveau qui vient
          // d'être créé par cet achat) et on cancel tout le reste.
          const activeOrTrialing = subs.filter((s) => {
            const st = String(s.status ?? "").toLowerCase();
            return st === "active" || st === "trialing" || st === "" || !st;
          });
          // Trier par created (ou id par défaut) desc → keep[0] = le plus récent
          const toCancel = activeOrTrialing.slice(1);
          await Promise.all(
            toCancel.map((s) =>
              cancelSubscription({ id: s.id, cancel: "Now" }).catch((e) => {
                console.error(`[Tiquiz webhook] cancel old sub ${s.id} failed`, e);
              }),
            ),
          );
          if (toCancel.length > 0) {
            didAutoCancel = true;
            console.log(`[Tiquiz webhook] Auto-cancelled ${toCancel.length} old sub(s) for ${email} (transition ${oldPlan} → ${finalPlan})`);
          }
        }
      } catch (e) {
        // Fail-open : si l'auto-cancel plante, on ne bloque PAS l'upgrade.
        // L'user a au pire 2 facturations en attendant qu'il cancel à
        // la main. Béné peut traiter ces cas via support.
        console.error("[Tiquiz webhook] auto-cancel old subs failed", e);
      }
    }

    // Upsert profile (+ flag expected_sio_cancel_until si on a auto-cancel,
    // pour que le SALE_CANCELED de l'ancien sub ne flippe pas plan→free).
    const upsertPayload: Record<string, unknown> = {
      user_id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      plan: finalPlan,
      updated_at: new Date().toISOString(),
    };
    if (didAutoCancel) {
      // 24h de fenêtre — SIO peut prendre quelques heures entre le
      // cancel API et le webhook SALE_CANCELED. 24h couvre largement.
      upsertPayload.expected_sio_cancel_until = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();
    }
    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(upsertPayload, { onConflict: "user_id" });
    if (upsertErr) {
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: `upsert:${upsertErr.message}` });
      throw upsertErr;
    }

    // Audit: log plan transition (skip no-op re-sends of the same plan).
    if (finalPlan !== oldPlan) {
      try {
        await supabaseAdmin.from("plan_change_log").insert({
          target_user_id: userId,
          target_email: email,
          old_plan: oldPlan,
          new_plan: finalPlan,
          reason: `systeme_io:${eventType ?? "unknown"}:${offerId || "no_offer"}`,
        } as any);
      } catch {
        // table may not exist on older deploys — audit is best-effort
      }
    }

    // 3.5 Attribution affiliée — fire-and-forget vers l'endpoint Tipote
    // qui centralise les commissions. Best-effort, ne bloque pas le flow
    // d'ouverture d'accès si ça plante.
    try {
      // LA MEME LISTE QUE LE TABLEAU DE BORD (`PAID_AMOUNT_PATHS`).
      // Elles etaient differentes jusqu'au 22 aout, et elles avaient
      // deja diverge : une vente pouvait etre commissionnee au bon
      // montant ici, et affichee a zero la-bas.
      const totalPriceRaw = extractStr(rawBody, PAID_AMOUNT_PATHS);
      // ON NE PARIE PLUS SUR LA FORME DU MONTANT.
      //
      // `parseInt` traite "17.00" comme 17, donc 17 CENTIMES : la
      // commission vaudrait alors 7 centimes au lieu de 5,67 EUR, en
      // silence. Si le montant arrive deja en centimes, `parseInt` est
      // juste. Les deux formes sont plausibles et **je n'ai pas verifie
      // laquelle arrive** : c'est exactement l'erreur du drame Ivan
      // (raisonner sur la forme SUPPOSEE d'un payload au lieu de la
      // regarder).
      //
      // `readSioAmountCents` est testee et traite les deux : euros avec
      // decimales, et entier deja en centimes. Plus de pari a faire.
      // Pour trancher pour de bon, l'ecran /admin liste les appels recus
      // avec leur payload.
      const saleAmountCents = readSioAmountCents(totalPriceRaw) ?? 0;
      const tipoteAffEndpoint =
        process.env.TIPOTE_AFFILIATE_ENDPOINT ??
        "https://app.tipote.com/api/affiliate/attribute-sale";
      const internalSecret = process.env.AFFILIATE_INTERNAL_SECRET;
      if (saleAmountCents > 0 && orderId && email && internalSecret) {
        const productName =
          extractStr(rawBody, [
            "price_plan.name",
            "data.price_plan.name",
            "offer_price_plan.name",
            "data.offer_price_plan.name",
          ]) ?? null;
        const currency =
          extractStr(rawBody, ["price_plan.currency", "data.price_plan.currency"]) ?? "EUR";
        // Pas d'await — on ne fait pas attendre l'user pour ça. En cas
        // d'échec réseau on log juste, le webhook reste OK.
        fetch(tipoteAffEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Affiliate-Secret": internalSecret,
          },
          body: JSON.stringify({
            customer_email: email,
            sale_amount_cents: saleAmountCents,
            currency: currency.toUpperCase(),
            source_app: "tiquiz",
            // `order.total_price` est ce que l'acheteur a PAYE, donc du
            // TTC. Le repli de Tipote vaut deja "ttc", mais le dire
            // retire le pari : c'est la lecon de l'audit du 26 aout.
            base: "ttc",
            // Vente passee par LEUR tunnel : ils la versent. On
            // l'enregistre pour que le tableau de bord de l'affilie soit
            // complet, jamais pour la virer nous memes.
            regle_par: "systeme_io",
            sio_order_id: String(orderId),
            product_name: productName,
            sale_at: new Date().toISOString(),
            raw_payload: rawBody,
          }),
          keepalive: true,
        }).catch((err) => {
          console.error("[Tiquiz webhook] affiliate attribute-sale failed:", err);
        });
      }
    } catch (err) {
      console.error("[Tiquiz webhook] affiliate attribution prep failed:", err);
    }

    // 4. Magic link — await + surface errors instead of swallowing them.
    // If the send fails (SMTP down, rate limit), we record it so you can
    // see the failure in webhook_logs AND return 5xx so SIO retries.
    const { error: otpErr } = await supabaseAnon.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${APP_URL}/auth/callback`, shouldCreateUser: false },
    });

    if (otpErr) {
      console.error(`[Tiquiz webhook] Magic link FAILED email=${email} err=${otpErr.message}`);
      await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "error", error: `magic_link:${otpErr.message}` });
      // Return 500 so SIO retries — profile is already upserted so the
      // retry will hit the idempotency short-circuit only once the magic
      // link actually goes out (we only mark 'processed' below).
      return NextResponse.json({ ok: false, user_id: userId, plan: finalPlan, magic_link_sent: false, error: otpErr.message }, { status: 500 });
    }

    await logWebhook({ event_id: eventId, event_type: eventType, payload: rawBody, status: "processed" });
    return NextResponse.json({ ok: true, email, user_id: userId, plan: finalPlan, magic_link_sent: true, event_id: eventId });
  } catch (err: any) {
    console.error("[Tiquiz webhook] Error:", err);
    await logWebhook({
      event_id: eventId,
      event_type: eventType,
      payload: rawBody,
      status: "error",
      error: err?.message ? String(err.message).slice(0, 500) : "unknown",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
