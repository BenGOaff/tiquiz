// app/api/auth/signup/route.ts
//
//   POST { email, password, fullName, locale? }
//     -> { ok: true }                       compte créé, email parti
//     -> { ok: false, reason }              la personne doit agir
//
// L'INSCRIPTION, ET SON EMAIL DE CONFIRMATION ÉCRIT PAR NOUS.
//
// Béné, 22 août : "On peut pas l'envoyer nous-même le lien de
// confirmation d'inscription, en mode joli ?"
//
// C'était le DERNIER email confié à Supabase. Tant qu'il l'était, la
// toute première chose qu'une nouvelle inscrite recevait de Tiquiz était
// un email au nom de Tipote, sur le seul message qu'elle est obligée
// d'ouvrir pour entrer.
//
// -- POURQUOI CÔTÉ SERVEUR ---------------------------------------------
//
// `supabase.auth.signUp` depuis le navigateur déclenche l'email de
// Supabase, avec SON gabarit. `generateLink({ type: "signup" })` fait la
// même chose SANS envoyer d'email, et nous rend le jeton : c'est nous
// qui écrivons, et c'est nous qui envoyons.
//
// -- CE QUI EST DIT, ET CE QUI NE L'EST PAS ----------------------------
//
// Une adresse DÉJÀ inscrite ne crée rien et n'envoie rien : on répond
// `already_registered`, et l'écran propose d'aller se connecter. Ce
// n'est pas une fuite : la page de connexion dit déjà la même chose à
// qui essaie un mot de passe.
//
// En revanche, un email qui ne part PAS est une vraie panne : la
// personne vient de créer un compte qu'elle ne peut pas ouvrir. On le
// dit à l'écran ET dans le journal, on ne se tait pas.

import { NextRequest, NextResponse } from "next/server";

import { buildAuthCallbackUrl, resolveAppUrl } from "@/lib/authLinks";
import { rattacherInscrit } from "@/lib/affiliate/rattacherInscrit";
import { REF_COOKIE } from "@/lib/affiliate/refLien";
import { SA_COOKIE } from "@/lib/affiliate/sa";
import { sendSignupEmail } from "@/lib/email/signupEmail";
import { poserTagPlan } from "@/lib/sio/appliquerTag";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Le minimum imposé par Supabase, repris ici pour le dire AVANT. */
const MIN_MOT_DE_PASSE = 6;

const COOLDOWN_MS = 60_000;
const dernierEssai = new Map<string, number>();

function sousCooldown(email: string): boolean {
  const now = Date.now();
  const prev = dernierEssai.get(email) ?? 0;
  if (now - prev < COOLDOWN_MS) return true;
  if (dernierEssai.size > 5000) dernierEssai.clear();
  dernierEssai.set(email, now);
  return false;
}

/** Cette erreur Supabase veut-elle dire "cette adresse a déjà un compte" ? */
function dejaInscrite(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("already") || m.includes("exists") || m.includes("registered");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Le domaine du lien : celui où elle est EN TRAIN de s'inscrire, jamais
  // une variable d'environnement qui pourrait nommer une autre app
  // (drame du 22 août : le lien renvoyait sur app.tipote.com).
  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin);

  let email = "";
  let password = "";
  let fullName = "";
  let locale: string | null = null;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    password = String(body?.password ?? "");
    fullName = String(body?.fullName ?? "").trim().slice(0, 120);
    locale = typeof body?.locale === "string" ? body.locale.slice(0, 8) : null;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }
  if (password.length < MIN_MOT_DE_PASSE) {
    return NextResponse.json({ ok: false, reason: "weak_password" }, { status: 400 });
  }
  if (sousCooldown(email)) {
    // Elle vient de le faire : son email est en route. Le redire serait
    // pire que se taire, et deux comptes ne peuvent pas naitre du meme
    // formulaire clique deux fois.
    return NextResponse.json({ ok: true });
  }

  // ── AUCUN 5xx SUR CE CHEMIN, ET C'EST MESURÉ (31 août 2026) ──
  //
  // Béné : "le test d'inscription gratuite avec un ref ne fonctionne
  // pas : /api/auth/signup 502. On attire du trafic et les gens peuvent
  // même pas s'inscrire."
  //
  // Les quatre refus ci dessous répondaient 502, et **Cloudflare
  // REMPLACE le corps d'un 502** par sa propre page (`error code: 502`,
  // text/plain). Le `res.json()` du formulaire échouait donc, `reason`
  // valait `undefined`, et l'écran affichait sa phrase par défaut :
  // "Erreur lors de la création du compte."
  //
  // Or le compte ÉTAIT créé. Vérifié en sondant la production : le
  // contact `tiquiz-free` apparaissait bien dans Systeme.io. L'écran
  // annonçait donc l'inverse de ce qui s'était passé, et un deuxième
  // essai répondait "adresse déjà inscrite". Le pire enchaînement
  // possible sur la page qui doit inspirer confiance.
  //
  // La phrase juste existait déjà (`errEmailFailed` : "ton compte est
  // créé mais l'email n'est pas parti"), elle n'arrivait jamais.
  //
  // C'est exactement la leçon payée le matin même sur le formulaire de
  // la newsletter. Un statut choisi pour bien dire "c'est nous qui
  // sommes en panne" est celui qu'un intermédiaire se permet de
  // réécrire. Ici rien ne dépend du statut : c'est un navigateur, il
  // n'y a aucun réessai automatique à déclencher.
  let actionLink: string | null = null;
  try {
    // `generateLink` CRÉE la personne en attente de confirmation ET rend
    // le jeton, sans envoyer aucun email. C'est exactement ce qu'on veut.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: { full_name: fullName },
        redirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      if (dejaInscrite(error.message ?? "")) {
        return NextResponse.json({ ok: false, reason: "already_registered" }, { status: 409 });
      }
      console.error(`[signup] creation impossible pour ${email} : ${error.message}`);
      return NextResponse.json({ ok: false, reason: "signup_failed" });
    }

    const hashedToken = data?.properties?.hashed_token;
    if (!hashedToken) {
      console.error(`[signup] aucun jeton rendu pour ${email} : email NON envoye.`);
      return NextResponse.json({ ok: false, reason: "signup_failed" });
    }
    actionLink = buildAuthCallbackUrl(appUrl, { tokenHash: hashedToken, type: "signup" });
  } catch (e) {
    console.error(`[signup] ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ ok: false, reason: "signup_failed" });
  }

  // ── LE RATTACHEMENT À VIE ──
  //
  // APRÈS la création du compte, et jamais avant : un rattachement qui
  // échoue ne doit pas priver quelqu'un de son inscription. Et il ne
  // jette jamais : le rattachement compte, l'inscription compte plus.
  await rattacherInscrit({
    email,
    ref: req.cookies.get(REF_COOKIE)?.value,
    sa: req.cookies.get(SA_COOKIE)?.value,
    pageUrl: req.headers.get("referer"),
  });

  // ── LE CONTACT CHEZ SYSTEME.IO ──
  //
  // Bene, 25 aout 2026 : "inscrit gratos chez nous = contact cree chez
  // systeme io et abonne a la campagne tiquiz free !"
  //
  // Les emails restent chez Systeme.io, donc notre systeme doit continuer
  // de leur PARLER. Une inscription prise sur nos pages ne creait aucun
  // contact : la personne sortait de toutes les sequences, en silence, et
  // le probleme grossissait a chaque inscription, c'est a dire a mesure
  // qu'on sort de Systeme.io.
  //
  // `poserTagPlan` cree le contact s'il n'existe pas, puis pose
  // `tiquiz-free`. Best-effort et JAMAIS bloquant : une etiquette qui
  // echoue ne doit pas priver quelqu'un de son inscription. Le journal
  // le dit, l'ecran non.
  //
  // ET LE TAG NE SUFFIT PAS A ABONNER A LA CAMPAGNE. L'API de Systeme.io
  // n'a aucun point d'entree pour inscrire un contact a une campagne :
  // c'est une AUTOMATISATION (declencheur "tag ajoute") qui le fait, et
  // elle se cree dans leur tableau de bord. Verifie le 25 aout 2026 :
  // aucune regle n'ecoute encore `tiquiz-free`. Sans cette regle, le
  // contact est bien cree et etiquete, et il ne recoit rien.
  await poserTagPlan(email, "free", { locale });

  const parti = await sendSignupEmail({ email, actionLink, locale });
  if (!parti) {
    // Le compte EXISTE et elle n'a pas son lien. Silence interdit : elle
    // resterait devant sa boite sans comprendre, et un deuxieme essai
    // repondrait "adresse deja inscrite".
    console.error(
      `[signup] compte cree pour ${email} mais email NON parti : elle ne peut pas entrer.`,
    );
    return NextResponse.json({ ok: false, reason: "email_failed" });
  }

  return NextResponse.json({ ok: true });
}
