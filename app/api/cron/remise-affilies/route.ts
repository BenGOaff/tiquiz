// app/api/cron/remise-affilies/route.ts
//
// APPLIQUE SUR LES ABONNEMENTS LA REMISE QUE LES AFFILIÉS ONT GAGNÉE.
//
// Béné, 25 août 2026 : "il a 10 affiliés abonnés, son abonnement baisse
// de 10 %, il en a 20 il gagne 20 %, il en a 100 ben il paye plus rien."
//
// Auth : Bearer CRON_SECRET ou ?secret= (pattern habituel).
// À passer UNE FOIS PAR MOIS, après le recalcul côté Tipote :
//
//   5 3 2 * * cd /home/tipote/tiquiz-app && ( set -a; . .env; set +a; curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://quiz.tipote.com/api/cron/remise-affilies ) >> /tmp/remise-affilies.log 2>&1
//
// -- POURQUOI UNE FOIS PAR MOIS ET PAS PLUS ----------------------------
//
// Parce que la remise DESCEND aussi. Un affilié qui perd des filleuls
// voit son abonnement remonter, et une hausse de prix ne se fait pas
// n'importe quand : le rythme mensuel est ce qui permet d'annoncer avant
// d'appliquer. Repasser plus souvent ne rendrait pas le calcul plus
// juste, ça rendrait la facture imprévisible.
//
// -- CE QU'ON NE FAIT PAS ----------------------------------------------
//
// On ne DÉCIDE rien ici : le décompte et le choix vivent chez Tipote,
// avec le registre des affiliés. Cette tâche pose ce qui a été décidé,
// et rien de plus. Si Tipote ne répond pas, ON NE TOUCHE À RIEN : une
// liste vide et une liste illisible ne veulent pas dire la même chose,
// et les confondre retirerait la remise de tout le monde.

import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { listerAbonnementsOwner } from "@/lib/checkout/subscriptionCancel";
import { tipoteBaseUrl } from "@/lib/checkout/codeReduction";
import {
  actionRemise,
  couponFidelite,
  lireRemisePosee,
  type RemiseGagnee,
} from "@/lib/checkout/remiseAbonnement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STRIPE_API = "https://api.stripe.com";
const INTERNAL_KEY = process.env.CRON_SECRET ?? "";

function form(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/** La liste décidée par Tipote. `null` = on n'a pas pu la lire. */
async function remisesGagnees(): Promise<RemiseGagnee[] | null> {
  const secret = (process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();
  if (!secret) {
    console.error("[cron/remise-affilies] AFFILIATE_INTERNAL_SECRET absente : rien n'est applique.");
    return null;
  }
  try {
    const res = await fetch(`${tipoteBaseUrl()}/api/affiliate/remises-abonnement`, {
      headers: { "X-Affiliate-Secret": secret },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[cron/remise-affilies] Tipote a repondu HTTP ${res.status} : rien n'est applique.`);
      return null;
    }
    const j = (await res.json()) as { ok?: boolean; remises?: unknown };
    if (!j.ok || !Array.isArray(j.remises)) return null;
    return (j.remises as Record<string, unknown>[])
      .map((r) => ({
        email: String(r.email ?? "").trim().toLowerCase(),
        pct: Number(r.pct ?? 0),
      }))
      .filter((r) => r.email && r.pct > 0);
  } catch (e) {
    console.error(`[cron/remise-affilies] Tipote injoignable : ${(e as Error).message}`);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const secret = new URL(req.url).searchParams.get("secret") ?? "";
  if (!INTERNAL_KEY || (token !== INTERNAL_KEY && secret !== INTERNAL_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const compte = readOwnerStripe(process.env);
  if (!compte) {
    console.error("[cron/remise-affilies] STRIPE_SECRET_KEY_OWNER absente.");
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const gagnees = await remisesGagnees();
  if (gagnees === null) {
    // On ne touche à RIEN. Retirer les remises parce qu'on n'a pas pu
    // lire la liste serait une hausse de prix pour tout le monde, sur
    // une panne réseau.
    return NextResponse.json({ ok: false, reason: "liste_illisible" }, { status: 502 });
  }

  const parEmail = new Map(gagnees.map((r) => [r.email, r.pct]));

  // On repasse sur TOUS ceux qui ont une remise posée ou qui devraient
  // en avoir une : les seconds pour la poser, les premiers pour la
  // corriger ou la retirer. Un affilié qui sort de la liste doit voir sa
  // remise disparaître, sinon elle serait acquise à vie par accident.
  const { data: profils, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email, stripe_customer_id")
    .not("stripe_customer_id", "is", null)
    .limit(10_000);

  if (error) {
    console.error(`[cron/remise-affilies] profils illisibles : ${error.message}`);
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 502 });
  }

  type P = { email: string | null; stripe_customer_id: string | null };
  let poses = 0;
  let retires = 0;
  let inchanges = 0;
  const journal: string[] = [];

  for (const p of (profils ?? []) as P[]) {
    const email = String(p.email ?? "").trim().toLowerCase();
    const customer = String(p.stripe_customer_id ?? "").trim();
    if (!email || !customer) continue;

    const voulu = parEmail.get(email) ?? 0;

    const { ok, abonnements } = await listerAbonnementsOwner(compte.key, customer);
    // "Je n'ai pas pu regarder" ne vaut pas "il n'a pas d'abonnement" :
    // on passe, on ne retire rien.
    if (!ok) continue;
    if (abonnements.length === 0) {
      if (voulu > 0) {
        journal.push(`${email} : ${voulu}% gagnes mais aucun abonnement, rien a remiser`);
      }
      continue;
    }

    for (const abo of abonnements) {
      // On relit l'abonnement complet : la liste ne porte pas forcément
      // la remise déjà posée, et poser un coupon sans savoir ce qui est
      // déjà là en créerait un nouveau chaque mois.
      const relu = await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(abo.id)}`, {
        headers: { Authorization: `Bearer ${compte.key}` },
      })
        .then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : null))
        .catch(() => null);
      if (!relu) continue;

      const posee = lireRemisePosee(relu);
      const quoi = actionRemise({ gagnee: voulu, posee });
      if (quoi.action === "rien") {
        inchanges += 1;
        continue;
      }

      if (quoi.action === "retirer") {
        const r = await fetch(
          `${STRIPE_API}/v1/subscriptions/${encodeURIComponent(abo.id)}/discount`,
          { method: "DELETE", headers: { Authorization: `Bearer ${compte.key}` } },
        );
        if (r.ok) {
          retires += 1;
          // Une remise qui disparaît est une HAUSSE de prix : ça se dit
          // dans le journal, toujours.
          journal.push(`${email} : remise RETIREE (n'a plus de filleuls actifs)`);
        } else {
          console.error(`[cron/remise-affilies] retrait refuse sur ${abo.id} : HTTP ${r.status}`);
        }
        continue;
      }

      const c = await fetch(`${STRIPE_API}/v1/coupons`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${compte.key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form(couponFidelite(quoi.pct)),
      });
      const cj = (await c.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
      if (!c.ok || !cj.id) {
        console.error(
          `[cron/remise-affilies] coupon refuse pour ${email} : ${cj.error?.message ?? `HTTP ${c.status}`}`,
        );
        continue;
      }

      const r = await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(abo.id)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${compte.key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // Poser `discounts` REMPLACE ce qui était là : c'est ce qu'on
        // veut, une seule remise de fidélité à la fois.
        body: form({ "discounts[0][coupon]": cj.id }),
      });
      if (r.ok) {
        poses += 1;
        journal.push(
          `${email} : remise ${posee.pct ?? 0}% -> ${quoi.pct}%${(posee.pct ?? 0) > quoi.pct ? " (BAISSE, son prix remonte)" : ""}`,
        );
      } else {
        console.error(`[cron/remise-affilies] pose refusee sur ${abo.id} : HTTP ${r.status}`);
      }
    }
  }

  if (journal.length > 0) {
    console.log(`[cron/remise-affilies] ${journal.join(" | ")}`);
  }
  return NextResponse.json({ ok: true, poses, retires, inchanges, gagnants: gagnees.length });
}
