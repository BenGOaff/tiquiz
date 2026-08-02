// app/api/auth/forgot-password/route.ts
//
// Demande de reset de mot de passe (lien "Mot de passe oublié ?" du login).
// On génère le lien recovery côté serveur (generateLink, aucun email
// Supabase) et on envoie NOTRE email via Resend (template maison, demande
// Béné 31 juillet 2026). Si Resend échoue ou n'est pas configuré, fallback
// automatique sur resetPasswordForEmail (template Supabase standard).
//
// Sécurité :
// - Réponse toujours { ok: true } : on ne révèle jamais si un email a un
//   compte ou pas (anti-énumération).
// - Cooldown 60s par email (mémoire process) pour limiter le spam. Le
//   fallback Supabase a en plus son propre rate limit serveur.
//
// Le lien recovery redirige vers /auth/callback qui détecte type=recovery
// et envoie sur /auth/reset-password (choix du nouveau mot de passe).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPasswordResetEmail } from "@/lib/email/passwordResetEmail";
import { buildAuthCallbackUrl, resolveAppUrl } from "@/lib/authLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOLDOWN_MS = 60_000;

// Cooldown en mémoire process : suffisant pour un déploiement pm2 mono
// instance, et sans conséquence si le process redémarre (le rate limit
// Supabase du fallback reste actif derrière).
const lastRequestAt = new Map<string, number>();

function underCooldown(email: string): boolean {
  const now = Date.now();
  const prev = lastRequestAt.get(email) ?? 0;
  if (now - prev < COOLDOWN_MS) return true;
  // Purge naïve pour borner la mémoire.
  if (lastRequestAt.size > 5000) lastRequestAt.clear();
  lastRequestAt.set(email, now);
  return false;
}

/** Fallback : email de reset envoyé par Supabase (template global).
 *  Ce chemin repasse par la redirection Supabase, donc par la liste
 *  blanche du projet : il ne sert plus qu'en dernier recours. */
async function sendViaSupabaseTemplate(email: string, appUrl: string): Promise<void> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    await anonClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback`,
    });
  } catch (e) {
    console.error("[forgot-password] fallback Supabase failed:", (e as Error).message);
  }
}

export async function POST(req: NextRequest) {
  // Domaine à mettre dans l'email. Si la variable d'environnement est
  // absente ou pointe sur une adresse locale, on prend le domaine par
  // lequel la demande arrive : jamais un lien vers la machine de celui
  // qui reçoit l'email (drame Véronique, 2 août 2026).
  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin);

  let email = "";
  let locale: string | null = null;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    locale = typeof body?.locale === "string" ? body.locale.slice(0, 8) : null;
  } catch {
    // corps invalide : on répond ok quand même (anti-énumération)
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || underCooldown(email)) {
    return NextResponse.json({ ok: true });
  }

  try {
    // generateLink échoue si l'email n'a pas de compte : dans ce cas on ne
    // fait RIEN (pas d'email envoyé) mais on répond ok pareil.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    });

    // On envoie NOTRE lien, pas celui de Supabase. Le lien Supabase passe
    // par /auth/v1/verify puis redirige vers le "Site URL" du projet quand
    // redirect_to n'est pas en liste blanche : c'est ce qui envoyait
    // Véronique sur localhost. Avec le hashed_token, /auth/callback
    // consomme le jeton lui-même et rien ne peut plus s'interposer.
    const hashedToken = data?.properties?.hashed_token;
    const actionLink = hashedToken
      ? buildAuthCallbackUrl(appUrl, { tokenHash: hashedToken, type: "recovery" })
      : data?.properties?.action_link;

    if (error || !actionLink) {
      const msg = (error?.message ?? "").toLowerCase();
      if (!msg.includes("not found") && !msg.includes("not exist")) {
        // Erreur technique (pas un compte inconnu) : fallback Supabase pour
        // que l'utilisateur reçoive quand même quelque chose.
        console.warn("[forgot-password] generateLink failed:", error?.message);
        await sendViaSupabaseTemplate(email, appUrl);
      }
      return NextResponse.json({ ok: true });
    }

    const sent = await sendPasswordResetEmail({ email, actionLink, locale });
    if (!sent) {
      // Le lien generateLink déjà émis reste valable mais n'a pas été
      // délivré : on repasse par Supabase pour un lien + email garantis.
      await sendViaSupabaseTemplate(email, appUrl);
    }
  } catch (e) {
    console.error("[forgot-password]", (e as Error).message);
    await sendViaSupabaseTemplate(email, appUrl);
  }

  return NextResponse.json({ ok: true });
}
