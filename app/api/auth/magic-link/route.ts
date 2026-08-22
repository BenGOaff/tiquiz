// app/api/auth/magic-link/route.ts
//
//   POST { email, locale? }  ->  { ok: true }   TOUJOURS
//
// LE LIEN DE CONNEXION SANS MOT DE PASSE, ENVOYÉ PAR NOUS.
//
// -- POURQUOI CETTE ROUTE EXISTE (22 août 2026) ------------------------
//
// Béné : "je demande un lien magique sur Tiquiz et je reçois les trucs
// Tipote, c'est pas pro du tout."
//
// Le bouton appelait `signInWithOtp` depuis le navigateur. C'est donc
// **Supabase** qui écrivait l'email, avec le gabarit de son tableau de
// bord, resté au nom de Tipote : titre "Connexion Tipote", expéditeur
// "Béné - Tipote", support renvoyé sur tipote.com.
//
// Le mot de passe oublié avait été repris en email maison le 31 juillet.
// Le lien magique était resté derrière. **Une moitié corrigée**, comme
// le partage du résultat (7 août) et le retour de l'Atelier (3 août).
//
// On fait donc ici ce que fait `forgot-password` : on génère le lien
// nous mêmes et on envoie NOTRE email. Plus rien ne dépend d'un gabarit
// configuré ailleurs.
//
// -- ON RÉPOND TOUJOURS `ok` -------------------------------------------
//
// Une réponse différente selon que l'adresse a un compte ou non
// transformerait ce formulaire en outil pour savoir qui est client.
// L'écran dit donc "lien envoyé" dans tous les cas.
//
// **Conséquence assumée** : une adresse sans compte ne reçoit rien. Ce
// bouton sert à SE RECONNECTER, pas à s'inscrire, et l'inscription a sa
// propre page. Avant, `signInWithOtp` créait un compte au passage, ce
// qui fabriquait des comptes vides à chaque faute de frappe.
//
// -- ET LE LIEN EST LE NÔTRE ------------------------------------------
//
// On envoie `${APP_URL}/auth/callback?token_hash=...`, jamais le lien
// Supabase : celui là repasse par `/auth/v1/verify` puis redirige vers
// le "Site URL" du projet quand l'adresse de retour n'est pas en liste
// blanche. C'est ce qui envoyait Véronique sur localhost (2 août).

import { NextRequest, NextResponse } from "next/server";

import { buildAuthCallbackUrl, resolveAppUrl } from "@/lib/authLinks";
import { sendMagicLinkEmail } from "@/lib/email/magicLinkEmail";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOLDOWN_MS = 60_000;

// Cooldown en memoire process, comme forgot-password : suffisant pour un
// deploiement pm2 mono instance, et sans consequence si le process
// redemarre.
const dernierEnvoi = new Map<string, number>();

function sousCooldown(email: string): boolean {
  const now = Date.now();
  const prev = dernierEnvoi.get(email) ?? 0;
  if (now - prev < COOLDOWN_MS) return true;
  if (dernierEnvoi.size > 5000) dernierEnvoi.clear();
  dernierEnvoi.set(email, now);
  return false;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Le domaine du lien. Si la variable est absente ou pointe sur une
  // adresse locale, on prend celui par lequel la demande arrive : jamais
  // un lien vers la machine de celui qui recoit l'email.
  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin);

  let email = "";
  let locale: string | null = null;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    locale = typeof body?.locale === "string" ? body.locale.slice(0, 8) : null;
  } catch {
    // Corps illisible : on repond ok quand meme (anti-enumeration).
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || sousCooldown(email)) {
    return NextResponse.json({ ok: true });
  }

  try {
    // Echoue si l'adresse n'a pas de compte : dans ce cas on n'envoie
    // RIEN, et on repond ok pareil.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    });

    const hashedToken = data?.properties?.hashed_token;
    const actionLink = hashedToken
      ? buildAuthCallbackUrl(appUrl, { tokenHash: hashedToken, type: "magiclink" })
      : null;

    if (error || !actionLink) {
      const msg = (error?.message ?? "").toLowerCase();
      // Un compte inconnu est le cas NORMAL, pas une panne : on se tait.
      // Tout le reste est une vraie erreur, et elle doit se voir dans le
      // journal, sinon on chercherait pourquoi "l'email n'arrive pas".
      if (!msg.includes("not found") && !msg.includes("not exist")) {
        console.error(`[magic-link] generateLink a echoue : ${error?.message ?? "lien absent"}`);
      }
      return NextResponse.json({ ok: true });
    }

    const parti = await sendMagicLinkEmail({ email, actionLink, locale });
    if (!parti) {
      // Le lien est emis mais n'est pas parti : la personne attend
      // devant sa boite. On le crie, on ne le devine pas.
      console.error(`[magic-link] email NON parti pour ${email} : elle n'aura rien.`);
    }
  } catch (e) {
    console.error(`[magic-link] ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({ ok: true });
}
