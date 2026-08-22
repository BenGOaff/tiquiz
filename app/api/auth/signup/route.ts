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
import { sendSignupEmail } from "@/lib/email/signupEmail";
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
      return NextResponse.json({ ok: false, reason: "signup_failed" }, { status: 502 });
    }

    const hashedToken = data?.properties?.hashed_token;
    if (!hashedToken) {
      console.error(`[signup] aucun jeton rendu pour ${email} : email NON envoye.`);
      return NextResponse.json({ ok: false, reason: "signup_failed" }, { status: 502 });
    }
    actionLink = buildAuthCallbackUrl(appUrl, { tokenHash: hashedToken, type: "signup" });
  } catch (e) {
    console.error(`[signup] ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ ok: false, reason: "signup_failed" }, { status: 502 });
  }

  const parti = await sendSignupEmail({ email, actionLink, locale });
  if (!parti) {
    // Le compte EXISTE et elle n'a pas son lien. Silence interdit : elle
    // resterait devant sa boite sans comprendre, et un deuxieme essai
    // repondrait "adresse deja inscrite".
    console.error(
      `[signup] compte cree pour ${email} mais email NON parti : elle ne peut pas entrer.`,
    );
    return NextResponse.json({ ok: false, reason: "email_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
