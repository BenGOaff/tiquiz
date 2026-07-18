// lib/access/grantAccess.ts
// Logique d'octroi / revocation d'acces, partagee entre le webhook
// Systeme.io et l'admin (invitation manuelle). Server-only.
//
// Onboarding : si l'email n'a pas encore de compte, on genere un lien
// d'invitation (sans laisser Supabase envoyer son email par defaut) et on
// envoie NOTRE email d'accueil brande via Resend. Le lien retombe sur
// /bienvenue, qui etablit la session et fait choisir un mot de passe. Si
// le compte existe deja, on (re)active l'enrollment et on envoie un lien
// magique d'entree directe.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";

// URL de base des liens d'action (emails). Lue au RUNTIME via APP_URL :
// NEXT_PUBLIC_* est inliné au build par Next, ce qui avait gravé un
// localhost:3002 de dev dans les liens d'accès en prod (drame 18 juin 2026).
// APP_URL (non public) est lu à l'exécution, donc corrigible sans rebuild.
const APP_URL = (
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://quizing.tipote.com"
).trim().replace(/\/$/, "");

export async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const lower = email.toLowerCase();
  const perPage = 1000;
  let page = 1;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const found = users.find((u) => typeof u.email === "string" && u.email.toLowerCase() === lower);
    if (found) return { id: found.id };
    if (users.length < perPage) return null;
    page += 1;
  }
  return null;
}

export interface GrantResult {
  ok: boolean;
  created: boolean;
  reason?: string;
}

/**
 * Donne acces au L'Atelier du Quiz a un email : cree le compte (invitation) si
 * besoin, puis pose un enrollment actif. Idempotent.
 */
export async function grantAccessByEmail(
  email: string,
  source: string,
  contactId?: string | null,
): Promise<GrantResult> {
  let user = await findUserByEmail(email);
  let created = false;
  // Lien d'action a mettre dans l'email d'accueil (invitation ou magique).
  let actionUrl: string | null = null;

  if (!user) {
    // type "invite" cree le compte ET renvoie le lien, sans envoyer
    // d'email Supabase : c'est nous qui envoyons l'email brande.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${APP_URL}/bienvenue` },
    });
    if (error || !data?.user) {
      return { ok: false, created: false, reason: "invite_failed" };
    }
    user = { id: data.user.id };
    created = true;
    actionUrl = data.properties?.action_link ?? null;
  } else {
    // Compte existant : lien magique pour une entree directe dans l'espace.
    const { data } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${APP_URL}/dashboard` },
    });
    actionUrl = data?.properties?.action_link ?? null;
  }

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, email, updated_at: now }, { onConflict: "id" });
  await supabaseAdmin.from("enrollments").upsert(
    {
      user_id: user.id,
      status: "active",
      source,
      sio_contact_id: contactId ?? null,
      granted_at: now,
      revoked_at: null,
    },
    { onConflict: "user_id" },
  );

  // Email d'accueil best-effort : un echec d'envoi ne doit pas annuler
  // l'octroi d'acces (l'eleve peut toujours passer par /login).
  if (actionUrl) {
    const { subject, html } = welcomeEmail({ actionUrl, isNewAccount: created });
    await sendEmail({ to: email, subject, html });
  }

  return { ok: true, created };
}

/**
 * Revoque l'acces (remboursement / annulation). Ne supprime pas le
 * compte, juste l'enrollment.
 */
export async function revokeAccessByEmail(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) return;
  await supabaseAdmin
    .from("enrollments")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("user_id", user.id);
}
