// app/api/cron/churn-ask/route.ts
//
// UNE FOIS PAR JOUR : ON DEMANDE À CELLES QUI SONT PARTIES POURQUOI.
//
// Béné, 21 août : "lui envoyer un mail pour lui demander pourquoi et
// consigner ces réponses pour level up l'outil."
//
// À programmer une fois par jour sur le VPS. Ligne à coller
// (`crontab -e` sous l'utilisateur `tipote`) :
//
//   0 10 * * * cd /home/tipote/tiquiz-app && set -a; . .env; set +a; curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://quiz.tipote.com/api/cron/churn-ask >> /tmp/churn-ask.log 2>&1
//
// Vérification : `crontab -l | grep churn-ask`
//
// -- LE POINT LE PLUS IMPORTANT : ON RÉSERVE AVANT D'ENVOYER -----------
//
// Deux exécutions qui se chevauchent (un cron lent, un appel manuel
// pendant qu'il tourne) enverraient le même email deux fois. Un
// `select` puis un `update` ne protège de rien : les deux passages
// lisent la même ligne avant que l'un des deux n'écrive.
//
// La parade est celle qu'on utilise partout pour ça : **c'est la base
// qui tranche.** Un UPDATE CONDITIONNEL
//
//   update ... set asked_at = now() where id = ? and asked_at is null
//
// est atomique. S'il ne renvoie aucune ligne, quelqu'un d'autre l'a
// prise : on passe. Une seule exécution peut gagner.
//
// **On réserve AVANT d'envoyer, et c'est un choix.** Si l'envoi échoue
// derrière, la personne ne recevra jamais l'email. L'inverse (envoyer
// puis marquer) risquerait de lui écrire deux fois si le marquage
// échoue. Entre "elle ne reçoit rien" et "elle reçoit deux fois le même
// email le jour où elle nous quitte", le choix n'est pas difficile. Les
// échecs d'envoi sont journalisés fort.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { buildAskQueue, MAX_PAR_PASSAGE, type ChurnAskRow } from "@/lib/churn/askQueue";
import { readChurnSecret, signChurnToken } from "@/lib/churn/replyToken";
import { sendChurnAskEmail } from "@/lib/email/churnAskEmail";
import { resolveAppUrl } from "@/lib/authLinks";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET?.trim() || "";

function authOk(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const attendu = Buffer.from(CRON_SECRET);
  const compare = (recu: string | null | undefined) => {
    if (!recu) return false;
    const a = Buffer.from(recu);
    if (a.length !== attendu.length) return false;
    return timingSafeEqual(a, attendu);
  };
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return compare(auth.slice(7));
  return compare(req.nextUrl.searchParams.get("secret"));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 401 });
  }

  const secret = readChurnSecret(process.env);
  if (!secret) {
    // L'ABSENCE FERME. Sans jeton signable, la page de reponse n'existe
    // pas : envoyer un email sans lien donnerait l'air de se moquer.
    console.error("[churn-ask] aucun secret utilisable : rien envoye.");
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const maintenant = new Date();
  const base = resolveAppUrl(req.nextUrl.origin);

  let candidats: ChurnAskRow[] = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("subscription_churn")
      .select("id, email, cancelled_at, asked_at, answered_at, reactivated_at, stripe_comment, reason")
      .is("asked_at", null)
      .order("cancelled_at", { ascending: true })
      // On lit large : le tri final et les bornes sont dans la fonction
      // pure, testee. Un filtre SQL de plus serait une deuxieme regle a
      // maintenir, et deux regles finissent par diverger.
      .limit(MAX_PAR_PASSAGE * 5);
    if (error) throw error;
    candidats = (data ?? []) as unknown as ChurnAskRow[];
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[churn-ask] lecture impossible : ${message}. ` +
        `Si la table est absente, appliquer supabase/migrations/20260821_subscription_churn.sql.`,
    );
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }

  const { aEcrire, ecartes } = buildAskQueue(candidats, maintenant);

  let envoyes = 0;
  let rates = 0;
  let dejaPris = 0;

  for (const row of aEcrire) {
    const id = String(row.id ?? "").trim();
    const email = String(row.email ?? "").trim();
    if (!id || !email) continue;

    // ── ON RÉSERVE. C'est la base qui tranche, pas nous. ──
    let reserve = false;
    try {
      const { data, error } = await supabaseAdmin
        .from("subscription_churn")
        .update({ asked_at: maintenant.toISOString(), updated_at: maintenant.toISOString() })
        .eq("id", id)
        .is("asked_at", null)
        // Deuxieme verrou, au cas ou elle serait revenue entre la
        // lecture et maintenant.
        .is("reactivated_at", null)
        .select("id");
      if (error) throw error;
      reserve = (data ?? []).length > 0;
    } catch (e) {
      console.error(
        `[churn-ask] reservation impossible pour ${id} : ${e instanceof Error ? e.message : String(e)}`,
      );
      continue;
    }

    if (!reserve) {
      dejaPris += 1;
      continue;
    }

    const jeton = signChurnToken(id, secret);
    if (!jeton) {
      console.error(`[churn-ask] jeton non signable pour ${id} : email NON envoye.`);
      rates += 1;
      continue;
    }

    const parti = await sendChurnAskEmail({
      email,
      lien: `${base}/depart/${jeton}`,
    });
    if (parti) envoyes += 1;
    else {
      rates += 1;
      // On le dit FORT : la ligne est marquee comme demandee, donc cette
      // personne ne recevra plus rien. C'est le prix assume de ne jamais
      // ecrire deux fois, mais ca ne doit pas passer en silence.
      console.error(
        `[churn-ask] email NON parti pour ${email} (depart ${id}), et la ligne est deja marquee : ` +
          `elle ne sera pas relancee.`,
      );
    }
  }

  console.log(
    `[churn-ask] ${envoyes} envoye(s), ${rates} echec(s), ${dejaPris} deja pris. ` +
      `Ecartes : ${Object.entries(ecartes)
        .filter(([k, v]) => k !== "ask" && v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ") || "aucun"}`,
  );

  return NextResponse.json({ ok: true, envoyes, rates, dejaPris, ecartes });
}
