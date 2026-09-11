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

// QUI ON PRÉVIENT, ET C'EST UNE AUTRE QUESTION QUE "QUI A LE DROIT".
//
// `ADMIN_EMAILS` dit qui peut ENTRER dans l'admin. Ça ne dit rien de qui
// doit être PRÉVENU : les deux adresses ci-dessus arrivent dans la même
// boîte, donc alerter les deux, c'est deux emails pour un seul évènement.
//
// Béné, 25 août 2026, côté Atelier, capture à l'appui : "je reçois
// toujours ce genre de mails en double c'est normal ?" Non. L'Atelier a
// séparé les deux listes ce jour là ; Tiquiz envoyait encore ses trois
// alertes (vente refusée, ticket, commentaire) aux deux adresses. Un
// garde-fou qui ne protège qu'un des jumeaux ne protège personne.
//
// `alerterAdmins()` (lib/email/alerteAdmin.ts) est le SEUL chemin : il
// fait UN envoi, à cette liste. Pour prévenir une autre personne, ajoute
// son adresse ici : elle recevra le même et unique message.
export const ADMIN_ALERT_EMAILS: readonly string[] = [
  "blagardette@gmail.com",
];
