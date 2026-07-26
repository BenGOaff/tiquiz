// lib/adminEmails.ts
// Emails autorisés à accéder au dashboard admin Tiquiz.

export const ADMIN_EMAILS: readonly string[] = [
  "blagardette@gmail.com",
  "hello@ethilife.fr",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === email.trim().toLowerCase());
}
