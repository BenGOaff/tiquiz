// app/admin/clients/[email]/page.tsx
//
// LA FICHE D'UNE PERSONNE A DÉMÉNAGÉ DANS LA CONSOLE (18 septembre 2026).
//
// C'est le MÊME composant des deux côtés depuis le début
// (`ClientFiche`) : il n'y a jamais eu deux fiches, seulement deux
// adresses pour la même. Il n'en reste qu'une.
//
// L'ancienne adresse redirige au lieu de disparaître : elle est citée
// dans chaque email d'alerte de vente déjà envoyé, et ces emails ne se
// réécrivent pas.
//
// LE SEGMENT N'EST PAS DÉCODÉ PAR NEXT, et on ne le décode pas non plus
// ici : on le repasse TEL QUEL à la nouvelle adresse. Le décoder pour le
// ré-encoder ferait perdre un `+` dans une adresse comme
// `bene+test@gmail.com`, et la fiche s'ouvrirait sur personne (drame du
// 31 août, par l'autre bout).

import { permanentRedirect } from "next/navigation";

export default async function AncienneFichePage({
  params,
}: {
  params: Promise<{ email: string }>;
}): Promise<never> {
  const { email } = await params;
  permanentRedirect(`/pilotage/clients/${email}`);
}
