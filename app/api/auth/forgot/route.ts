// app/api/auth/forgot/route.ts
// Demande de reinitialisation de mot de passe. Genere un lien de
// recuperation cote serveur (service role) et envoie NOTRE email brande
// via Resend. On repond toujours { ok: true } pour ne pas reveler si un
// email a un compte ou non (anti enumeration).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/resend";
import { resetPasswordEmail } from "@/lib/email/templates";

// Runtime (APP_URL) plutôt que NEXT_PUBLIC_* (inliné au build) : voir
// grantAccess.ts (drame localhost:3002 dans les liens, 18 juin 2026).
const APP_URL = (
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://quizing.tipote.com"
).trim().replace(/\/$/, "");
const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    // Email invalide : on reste discret cote reponse.
    return NextResponse.json({ ok: true });
  }
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${APP_URL}/nouveau-mot-de-passe` },
    });
    const actionUrl = data?.properties?.action_link ?? null;
    // error attendu si l'email n'a pas de compte : on ignore silencieusement.
    if (!error && actionUrl) {
      const { subject, html } = resetPasswordEmail({ actionUrl });
      await sendEmail({ to: email, subject, html });
    }
  } catch {
    // On n'expose rien.
  }

  return NextResponse.json({ ok: true });
}
