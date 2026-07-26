// app/api/auth/magic-link/route.ts
// Lien de connexion "magique" par email, SANS mot de passe. Généré côté
// serveur (service role) en flux IMPLICITE (jetons dans le hash), pas en
// PKCE : c'est ce qui le rend fiable CROSS-DEVICE (demande sur ordi, ouverture
// sur téléphone). Le PKCE de signInWithOtp échouait dans ce cas car le
// code_verifier reste dans le navigateur d'origine (drame Gwenn 20 juil 2026).
//
// On envoie NOTRE email brandé via Resend. Le lien retombe sur /bienvenue qui
// consomme les jetons du hash et ouvre la session. Anti-énumération : on
// répond toujours { ok: true }.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";

const APP_URL = (
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://quizing.tipote.com"
).trim().replace(/\/$/, "");

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${APP_URL}/bienvenue` },
    });
    const actionUrl = data?.properties?.action_link ?? null;
    // error attendu si l'email n'a pas de compte : on ignore silencieusement
    // (anti-énumération, on ne crée pas de compte sur une simple connexion).
    if (!error && actionUrl) {
      const { subject, html } = welcomeEmail({ actionUrl, isNewAccount: false });
      await sendEmail({ to: email, subject, html });
    }
  } catch {
    // On n'expose rien.
  }

  return NextResponse.json({ ok: true });
}
