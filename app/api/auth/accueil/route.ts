// app/api/auth/accueil/route.ts
//
//   POST {}  (session Supabase requise)
//     -> { ok: true, accueilli: boolean }
//
// CE QU'UNE INSCRIPTION DOIT FAIRE, QUEL QUE SOIT LE CHEMIN D'ENTRÉE.
//
// Jusqu'ici les trois effets de bord d'une inscription vivaient DANS
// `/api/auth/signup`, donc dans le formulaire. Un bouton Google les
// aurait tous les trois court-circuités, en silence :
//
//   - l'affiliée qui a amené la personne n'aurait JAMAIS été rattachée,
//     donc jamais payée sur la vente qui suit ;
//   - aucun contact chez Systeme.io, donc aucune campagne : la personne
//     s'inscrit et ne reçoit rien ;
//   - le quiz fabriqué sur la page de vente serait resté orphelin.
//
// Aucun des trois ne produit d'erreur visible. C'est exactement la forme
// de panne que ce dépôt paie le plus cher, et c'est pour ça que cette
// route existe AVANT que le bouton n'existe.
//
// -- ELLE NE TOURNE QU'UNE FOIS ---------------------------------------
//
// Le marqueur vit dans `app_metadata` (Supabase), pas dans une colonne :
// aucune migration, et c'est le bon endroit pour un fait que le serveur
// écrit sur un compte et que la personne ne peut pas modifier.
//
// -- ET ELLE NE POSE JAMAIS `free` SUR UN COMPTE QUI PAIE -------------
//
// Le marqueur n'existait pas avant ce chantier : un compte DÉJÀ inscrit
// qui se connecte par Google passera donc ici une fois. Reposer
// `tiquiz-free` sur une abonnée la sortirait du seul segment qui compte
// pour les relances, et ça ne se verrait sur aucun écran.
// `tagPlanPourAccueil` rend `null` dès que le plan n'est pas gratuit.

import { NextRequest, NextResponse } from "next/server";

import { rattacherInscrit } from "@/lib/affiliate/rattacherInscrit";
import { REF_COOKIE } from "@/lib/affiliate/refLien";
import { SA_COOKIE } from "@/lib/affiliate/sa";
import { COOKIE_REPRISE, ligneCookieRepriseEffacee, tagPlanPourAccueil } from "@/lib/auth/google";
import { lireJetonReprise } from "@/lib/embed/reprise";
import { lireSessionReclamable, rattacherQuizAnonyme } from "@/lib/embed/rattacherQuiz";
import { poserTagPlan } from "@/lib/sio/appliquerTag";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La clé du marqueur, écrite une fois. */
const MARQUEUR = "tiquiz_accueil";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const https = req.nextUrl.protocol === "https:";
  const efface = ligneCookieRepriseEffacee(https);

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    // Pas de session : il n'y a rien à accueillir. Ce n'est pas une
    // panne, c'est un appel qui arrive trop tôt ou en double.
    return NextResponse.json({ ok: false, reason: "pas_de_session" });
  }

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (meta[MARQUEUR]) {
    return NextResponse.json({ ok: true, accueilli: false });
  }

  const email = user.email.toLowerCase();

  // ── LE MARQUEUR EN PREMIER ──
  //
  // Deux onglets, ou un rechargement pendant que les appels réseau
  // tournent, feraient sinon deux accueils. Poser le marqueur avant
  // coûte, dans le pire des cas, un accueil manqué sur une panne ; ne
  // pas le poser coûte une double pose de tag et un deuxième
  // rattachement, sur un chemin qui décide QUI est payé.
  try {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...meta, [MARQUEUR]: new Date().toISOString() },
    });
  } catch (e) {
    console.error(`[accueil] marqueur impossible pour ${email} :`, e);
    // On continue quand même : mieux vaut un accueil qui pourrait se
    // rejouer qu'une affiliée jamais rattachée.
  }

  // ── 1. L'AFFILIÉE, À VIE ──
  //
  // Les cookies `tq_ref` / `tq_sa` sont POSÉS PAR LE MIDDLEWARE, en
  // première partie et pour un an : ils survivent à l'aller-retour par
  // Google sans qu'on ait rien à transporter. Ne jette jamais.
  await rattacherInscrit({
    email,
    ref: req.cookies.get(REF_COOKIE)?.value,
    sa: req.cookies.get(SA_COOKIE)?.value,
    pageUrl: req.headers.get("referer"),
  });

  // ── 2. LE CONTACT CHEZ SYSTEME.IO ──
  const { data: profil } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const plan = tagPlanPourAccueil(profil?.plan);
  if (plan) {
    const pose = await poserTagPlan(email, plan, {});
    if (!pose) {
      // Best-effort, JAMAIS bloquant : un tag qui échoue ne doit pas
      // priver quelqu'un de son compte. Mais ça ne se tait pas : sans
      // ce tag, la personne n'entre dans aucune séquence.
      console.error(`[accueil] tag ${plan} NON posé pour ${email} : aucune campagne ne partira.`);
    }
  }

  // ── 3. LE QUIZ DE LA PAGE DE VENTE ──
  //
  // Il voyage dans un cookie première partie posé AVANT le départ chez
  // Google. Mesuré dans Chromium : un cookie `SameSite=Lax` est bien
  // renvoyé sur la navigation de PREMIER NIVEAU qui ramène de chez le
  // fournisseur, et il reste refusé sur une requête tierce en arrière
  // plan, ce qui est tout l'intérêt de `Lax`.
  const jeton = lireJetonReprise(req.cookies.get(COOKIE_REPRISE)?.value);
  if (jeton) {
    const lue = await lireSessionReclamable({ jeton });
    if (lue.ok) {
      const r = await rattacherQuizAnonyme({ sessionId: lue.session.id, userId: user.id });
      if (!r.ok) console.error(`[accueil] quiz non rattaché à ${email} : ${r.raison}`);
    } else {
      console.error(`[accueil] session ${jeton} non réclamable pour ${email} : ${lue.raison}`);
    }
  }

  const res = NextResponse.json({ ok: true, accueilli: true });
  // Le cookie a fait son travail : on le retire tout de suite plutôt que
  // de le laisser traîner une demi-heure sur le poste de la personne.
  res.headers.append("set-cookie", efface);
  return res;
}
