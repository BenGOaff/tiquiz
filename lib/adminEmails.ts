// lib/adminEmails.ts
// Emails autorisés à accéder au back-office admin L'Atelier du Quiz.
// Le rôle admin est aussi vérifié côté serveur (jamais déduit du seul
// front) : voir middleware.ts et les routes /api/admin.

export const ADMIN_EMAILS: readonly string[] = [
  "blagardette@gmail.com",
  "hello@ethilife.fr",
];

// Destinataires des ALERTES d'escalade du coach. Volontairement distinct de
// ADMIN_EMAILS : les deux adresses admin arrivent dans la meme boite, donc
// alerter les deux = Bene recevait 2 emails pour une seule demande. On
// n'alerte donc que l'adresse principale. Pour notifier aussi
// hello@ethilife.fr (si c'est une personne differente a prevenir), ajoute-la
// ici : l'email est envoye en UN SEUL envoi groupe (cf. app/api/coach/route).
export const ESCALATION_ALERT_EMAILS: readonly string[] = [
  "blagardette@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === email.trim().toLowerCase());
}
