// lib/resellerEmail.ts
//
// Email d'accès des clients d'un REVENDEUR (demande Béné 12 juin 2026).
//
// Par défaut, Tiquiz envoie le magic link via le template Supabase
// global (signé Béné, contact hello@tipote.com). Pour les clients d'un
// revendeur, on veut SON nom et SON contact support : on génère donc le
// lien magique côté serveur (generateLink, aucun email Supabase) et on
// envoie nous-mêmes l'email via Resend (pattern lib/email.ts de Tipote,
// fetch direct sans SDK).
//
// Conditions pour l'email personnalisé :
//   1. RESEND_API_KEY configurée dans le .env
//   2. reseller.support_email renseigné dans son panel
// Sinon : fallback automatique sur le flux Supabase standard (OTP),
// rien ne casse jamais.
//
// Le contenu est bilingue FR + EN (on ne connaît pas la locale du
// client au moment de la création), même format que le template actuel
// de Béné. Jamais de tiret long (règle anti-IA).

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim();
const RESEND_URL = "https://api.resend.com/emails";

interface ResellerEmailIdentity {
  name: string;
  support_email?: string | null;
}

/** Fallback : magic link envoyé par Supabase (template global Béné). */
async function sendViaSupabaseTemplate(email: string): Promise<boolean> {
  const { createClient } = await import("@supabase/supabase-js");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${APP_URL}/auth/callback`, shouldCreateUser: false },
  });
  return !error;
}

function buildHtml(args: {
  actionLink: string;
  email: string;
  resellerName: string;
  supportEmail: string;
}): { html: string; text: string; subject: string } {
  const { actionLink, email, resellerName, supportEmail } = args;

  const btn = `display:inline-block;background:#20BBE6;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:9999px;`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hello !</p>
  <p>Voici ton lien de connexion à Tiquiz :</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${actionLink}" style="${btn}">Me connecter à Tiquiz</a>
  </p>
  <p>Pour rappel, ton identifiant est ton email : <strong>${email}</strong></p>
  <p>Pour toute question, contacte ${resellerName} : <a href="mailto:${supportEmail}">${supportEmail}</a></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
  <p>Hello!</p>
  <p>Here is your link to log in to Tiquiz:</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${actionLink}" style="${btn}">Log in to Tiquiz</a>
  </p>
  <p>Your id is your email: <strong>${email}</strong></p>
  <p>For any question, contact ${resellerName}: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
</body>
</html>`;

  const text = [
    "Hello !",
    "",
    "Voici ton lien de connexion à Tiquiz :",
    actionLink,
    "",
    `Pour rappel, ton identifiant est ton email : ${email}`,
    `Pour toute question, contacte ${resellerName} : ${supportEmail}`,
    "",
    "----------------------------------------",
    "",
    "Hello!",
    "",
    "Here is your link to log in to Tiquiz:",
    actionLink,
    "",
    `Your id is your email: ${email}`,
    `For any question, contact ${resellerName}: ${supportEmail}`,
  ].join("\n");

  return { html, text, subject: "Tiquiz : ton lien de connexion / Your login link" };
}

/**
 * Envoie l'email d'accès (magic link) à un client de revendeur.
 * Personnalisé via Resend si possible, sinon fallback Supabase.
 */
export async function sendResellerAccessEmail(args: {
  reseller: ResellerEmailIdentity;
  email: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const supportEmail = args.reseller.support_email?.trim();

  if (!apiKey || !supportEmail) {
    return sendViaSupabaseTemplate(args.email);
  }

  try {
    // Lien magique généré SANS envoi d'email Supabase.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: args.email,
      options: { redirectTo: `${APP_URL}/auth/callback` },
    });
    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      console.warn(
        "[resellerEmail] generateLink failed, fallback Supabase:",
        error?.message,
      );
      return sendViaSupabaseTemplate(args.email);
    }

    const fromEmail =
      process.env.RESELLER_FROM_EMAIL?.trim() ||
      process.env.SUPPORT_FROM_EMAIL?.trim() ||
      "hello@tipote.com";

    const { html, text, subject } = buildHtml({
      actionLink,
      email: args.email,
      resellerName: args.reseller.name,
      supportEmail,
    });

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Tiquiz <${fromEmail}>`,
        to: [args.email],
        subject,
        html,
        text,
        // Le client répond au REVENDEUR, pas à Béné.
        reply_to: supportEmail,
        headers: { "X-Entity-Ref-ID": "reseller-access" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[resellerEmail] Resend failed", res.status, body.slice(0, 200));
      return sendViaSupabaseTemplate(args.email);
    }
    return true;
  } catch (e) {
    console.error("[resellerEmail]", (e as Error).message);
    return sendViaSupabaseTemplate(args.email);
  }
}
