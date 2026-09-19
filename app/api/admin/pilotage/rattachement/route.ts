// app/api/admin/pilotage/rattachement/route.ts
//
// ATTRIBUER UN CLIENT À UN AFFILIÉ, DEPUIS PILOTAGE (Béné, 18 septembre 2026).
//
// "Je ne veux pas créditer automatiquement un affilié, en revanche s'il
// me prouve que le lien n'a pas fonctionné, je veux pouvoir lui
// attribuer un client manuellement et qu'il devienne son affilié, et
// qu'il touche les commissions. Mais ça doit rester manuel depuis
// pilotage affiliation."
//
//   GET  ?email=...  -> l'état du rattachement, avec sa force de preuve
//   POST             -> le geste, signé, plus le rejeu des commissions
//
// -- DEUX GESTES, ET LE SECOND EST CELUI QU'ON OUBLIE ------------------
//
// Rattacher désigne l'affilié POUR LA SUITE. Ça ne paie rien sur ce qui
// est déjà encaissé : les commissions se créent à l'encaissement, et
// celui là est passé. Sans le rejeu, elle cliquerait, l'écran dirait
// "rattaché", et l'affilié ne toucherait toujours rien sur la vente
// qu'il a prouvée. C'est exactement la déception qu'on veut éviter.
//
// Le rejeu est IDEMPOTENT : Tipote répond `duplicate` sur une clé déjà
// connue, donc il ne paie jamais deux fois.
//
// -- LA SIGNATURE VIENT DE LA SESSION, JAMAIS DU CORPS -----------------
//
// `decidePar` n'est PAS lu dans le corps de la requête : il vient de la
// session admin. Un client qui pourrait écrire qui a décidé ferait de
// la trace une décoration, et cette trace est la PIÈCE d'un geste qui
// vaut 40 % de chaque échéance, pour toujours.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { completerVentes, nomProduitComplete } from "@/lib/ventes/identite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOTE = (() => {
  // Jamais une adresse locale : un `??` ne protège que de la variable
  // absente, jamais de la variable fausse (drame Véronique, 2 août).
  const brut = String(process.env.TIPOTE_BASE_URL ?? "").trim();
  if (/^https:\/\//i.test(brut) && !/localhost|127\.|::1|\.local/i.test(brut)) {
    return brut.replace(/\/+$/, "");
  }
  return "https://app.tipote.com";
})();

async function admin(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? String(user.email ?? "") : null;
}

/** Un appel vers Tipote. Ne jette jamais : rend une réponse lisible. */
async function versTipote(
  chemin: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; statut: number | null; json: Record<string, unknown> }> {
  const secret = String(process.env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) return { ok: false, statut: null, json: { reason: "not_configured" } };
  try {
    const res = await fetch(`${TIPOTE}${chemin}`, {
      ...init,
      headers: { ...(init.headers ?? {}), "x-partner-secret": secret },
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, statut: res.status, json };
  } catch (e) {
    console.error(`[pilotage/rattachement] Tipote injoignable : ${(e as Error).message}`);
    return { ok: false, statut: null, json: { reason: "unreachable" } };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await admin())) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const email = String(req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }

  const etat = await versTipote(
    `/api/partner/affilies/rattachement?email=${encodeURIComponent(email)}`,
  );
  if (!etat.ok) {
    // ON NE DIT PAS "personne" QUAND ON N'A PAS PU REGARDER. C'est la
    // règle du 11 septembre, et ici elle décide d'un geste sur de
    // l'argent : croire "aucun affilié" sur un registre muet ferait
    // rattacher quelqu'un qui appartient déjà à un autre.
    return NextResponse.json({ ok: false, reason: "registre_illisible" }, { status: 503 });
  }

  // SES ENCAISSEMENTS, pour que l'écran dise CE QUI SERA REJOUÉ avant
  // qu'elle clique. Un bouton qui agit sur un nombre qu'on ne voit pas
  // est un bouton qu'on n'ose pas presser.
  const ventes = await sesVentes(email);
  return NextResponse.json({
    ok: true,
    ...etat.json,
    encaissements: ventes.map((v) => ({
      reference: `${v.provider}:${v.ref}`,
      quand: v.paidAt,
      montantCents: v.amountCents,
      produit: nomProduitComplete(v) ?? v.productId ?? null,
    })),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const moi = await admin();
  if (!moi) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  let body: { email?: string; ref?: string; note?: string; remplacer?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const ref = String(body.ref ?? "").trim().toLowerCase();
  if (!email.includes("@") || !ref) {
    return NextResponse.json({ ok: false, reason: "champs_manquants" }, { status: 400 });
  }

  // ── 1. LE RATTACHEMENT, SIGNÉ PAR LA SESSION ──
  const fait = await versTipote("/api/partner/affilies/rattachement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      ref,
      // LA SIGNATURE VIENT D'ICI, pas du navigateur. Voir l'en tête.
      decidePar: moi,
      note: String(body.note ?? "").slice(0, 500),
      remplacer: body.remplacer === true,
    }),
  });

  // Un refus MÉTIER (déjà rattaché à un autre, affilié inconnu) revient
  // tel quel : l'écran sait le dire, et il repose la question.
  if (!fait.ok || fait.json.ok === false) {
    return NextResponse.json({ ok: false, ...fait.json });
  }

  // ── 2. LE REJEU, ET C'EST LUI QUI PAIE ──
  const ventes = await sesVentes(email);
  const rejoues: { reference: string; statut: string; cents: number | null }[] = [];
  for (const v of ventes) {
    const cle = `${v.provider}:${v.ref}`;
    const r = await versTipoteAttribution({
      email,
      cle,
      montantCents: Number(v.amountCents) || 0,
      produit: nomProduitComplete(v) ?? v.productId ?? "Tiquiz",
      quand: v.paidAt,
      code: ref,
    });
    rejoues.push({ reference: cle, statut: r.statut, cents: r.cents });
  }

  console.log(
    `[pilotage/rattachement] ${email} rattache a ${ref} par ${moi}, ` +
      `${rejoues.filter((r) => r.statut === "attributed").length} commission(s) creee(s)`,
  );
  return NextResponse.json({ ok: true, ...fait.json, rejoues });
}

/**
 * LES ENCAISSEMENTS DE CETTE PERSONNE, lus avec les MÊMES fonctions que
 * l'écran des ventes.
 *
 * Un deuxième lecteur écrit à la main finirait par dire autre chose que
 * `/pilotage/ventes`, et on ne saurait plus lequel croire.
 *
 * Les remboursés et les zéro euro sont écartés : leur commission est
 * annulée par construction, et rejouer une vente remboursée ferait
 * naître une commission qu'il faudrait annuler dans la foulée.
 */
async function sesVentes(email: string) {
  const { data } = await supabaseAdmin
    .from("webhook_logs")
    .select("source, event_id, event_type, payload, status, created_at:received_at")
    .in("source", ["stripe", "paypal"])
    .order("received_at", { ascending: false })
    .limit(3000);

  const profils = await supabaseAdmin
    .from("profiles")
    .select("email, paypal_subscription_id")
    .not("paypal_subscription_id", "is", null)
    .limit(5000);
  const emailParAbonnement: Record<string, string> = {};
  for (const p of (profils.data ?? []) as { email: string | null; paypal_subscription_id: string | null }[]) {
    const abo = String(p.paypal_subscription_id ?? "").trim();
    const mail = String(p.email ?? "").trim().toLowerCase();
    if (abo && mail) emailParAbonnement[abo] = mail;
  }

  return completerVentes(buildSales((data ?? []) as unknown as EventRow[]), {
    fiches: {},
    emailParAbonnement,
  })
    .filter((v) => (v.email ?? "").toLowerCase() === email)
    .filter((v) => !v.refundedAt && Number(v.amountCents) > 0);
}

/** Une attribution rejouée. Idempotente chez Tipote. */
async function versTipoteAttribution(a: {
  email: string;
  cle: string;
  montantCents: number;
  produit: string;
  quand: string;
  code: string;
}): Promise<{ statut: string; cents: number | null }> {
  const secret = String(process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();
  if (!secret) return { statut: "secret_absent", cents: null };
  try {
    const res = await fetch(`${TIPOTE}/api/affiliate/attribute-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        customer_email: a.email,
        sale_amount_cents: a.montantCents,
        currency: "EUR",
        source_app: "tiquiz",
        sio_order_id: a.cle,
        // TTC, ET C'EST LA VÉRITÉ. La facture est déjà émise, on ne sait
        // plus ventiler la TVA après coup. Mentir en `ht` paierait
        // l'affilié 1,13 EUR de trop par vente mensuelle (26 août).
        base: "ttc",
        regle_par: "nous",
        affiliate_code: a.code,
        affiliate_ref: null,
        product_name: a.produit,
        sale_at: a.quand,
        raw_payload: { source: "rattachement_manuel", reference: a.cle },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      result?: { status?: string; commission_cents?: number };
    };
    return {
      statut: String(json.result?.status ?? (res.ok ? "reponse_illisible" : `http_${res.status}`)),
      cents: Number(json.result?.commission_cents) || null,
    };
  } catch (e) {
    console.error(`[pilotage/rattachement] rejeu ${a.cle} impossible : ${(e as Error).message}`);
    return { statut: "injoignable", cents: null };
  }
}
