// lib/email/connexionAlerte.ts
//
// PRÉVENIR LA CRÉATRICE QU'UNE CONNEXION CRM EST COUPÉE.
//
// Le contenu vit dans `lib/integrations/alerteContenu.ts` (pur, sept
// langues) ; ici, seulement l'envoi. Ne jette jamais : une alerte qui
// échoue ne doit pas faire échouer la capture qui l'a déclenchée.

import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveAppUrl } from "@/lib/authLinks";
import { contenuAlerteConnexion } from "@/lib/integrations/alerteContenu";
import { renderTiquizMessage } from "./tiquizShell";
import { sendTiquizEmail } from "./tiquizSend";

export async function alerterConnexionCoupee(args: {
  userId: string;
  outil: string;
  nomConnexion: string;
}): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("email, ui_locale")
      .eq("user_id", args.userId)
      .maybeSingle();
    const p = data as { email?: string | null; ui_locale?: string | null } | null;
    let email = String(p?.email ?? "").trim();
    if (!email) {
      // `profiles.email` est nullable et rien ne la remplit toujours
      // (leçon de la newsletter, 31 août) : auth.users est la seule table
      // où une adresse est garantie.
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(args.userId);
      email = String(u?.user?.email ?? "").trim();
    }
    if (!email) return false;

    const lien = `${resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL)}/settings?tab=connections`;
    const copy = contenuAlerteConnexion({ locale: p?.ui_locale, outil: args.outil, nom: args.nomConnexion, lien });
    const { html, text } = renderTiquizMessage(copy);
    return await sendTiquizEmail({
      email,
      subject: copy.subject,
      html,
      text,
      refId: `connexion-coupee-${args.userId}`,
      journal: "connexionAlerte",
    });
  } catch (e) {
    console.error("[connexionAlerte]", e instanceof Error ? e.message : e);
    return false;
  }
}
