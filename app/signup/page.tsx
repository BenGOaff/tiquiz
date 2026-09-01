// app/signup/page.tsx
//
// L'INSCRIPTION GRATUITE SE FAIT CHEZ NOUS (Béné, 26 août 2026).
//
// "Sur notre page on doit pouvoir s'inscrire sur la page de login : pas
// de compte, crées-en un gratuitement maintenant. Avec le lien affi,
// l'envoi sur systeme io pour être abonné à la campagne etc."
//
// Cette page REDIRIGEAIT vers `tipote.fr/part-tiquiz-gratuit` (décision
// du 14 juillet). Le motif était bon à l'époque : une inscription prise
// chez nous ne créait aucun contact chez eux, donc la personne sortait
// de toutes les séquences email, en silence. Ce motif a disparu le
// 25 août : `POST /api/auth/signup` crée le compte, rattache l'affiliée
// à vie, ET crée le contact chez Systeme.io avec son tag.
//
// -- ET ON NOMME LA PERSONNE QUI ENVOIE (Béné, 27 août 2026) ----------
//
// "Jocelyne te propose de tester Tiquiz gratuitement alors n'hésite pas.
// En plus grâce à son lien tu profiteras d'un mois gratuit à
// l'abonnement de ton choix."
//
// Quelqu'un qui arrive par un lien affilié a déjà entendu parler de
// Tiquiz par quelqu'un en qui il a confiance. Le recevoir sur un
// formulaire nu, c'est jeter cette confiance à la porte.
//
// Le code vient de l'URL, sinon du cookie `tq_ref` posé par le
// middleware (`pickRef` : l'URL gagne, c'est le DERNIER lien qui a
// amené la personne).
//
// -- CE QUI RESTE À FAIRE CHEZ SYSTEME.IO, ET CE N'EST PAS DU CODE ----
//
// Vérifié dans son compte le 27 août : ses 51 règles d'automatisation
// sont TOUTES déclenchées par un formulaire, AUCUNE par un tag.
// Poser `tiquiz-free` ne déclenche donc rien. Il faut une règle
// "tag tiquiz-free ajoutée -> inscrire à la campagne Tiquiz free",
// sinon le contact est créé, taggé, et il ne reçoit rien.

import type { Metadata } from "next";
import { cookies } from "next/headers";

import SignupForm from "@/components/auth/SignupForm";
import { readParrainage, type Parrainage } from "@/lib/affiliate/accueilParrain";
import { pickRef, REF_COOKIE, REF_PARAM } from "@/lib/affiliate/refLien";
import { proprietaireDuLien } from "@/lib/trial/proprietaireDuLien";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // L'inscription n'a rien à faire dans un résultat de recherche : ce
  // sont les pages de vente qui doivent ranker.
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const boite = await cookies();
  const ref = pickRef(sp[REF_PARAM], boite.get(REF_COOKIE)?.value);

  let parrainage: Parrainage = { affiche: false };
  if (ref) {
    // Un aller-retour vers Tipote, et UNIQUEMENT quand il y a un code à
    // résoudre : sans code c'est le cas normal, et le cas normal ne doit
    // rien payer. `proprietaireDuLien` porte déjà son propre délai
    // maximum et rend `connu: false` sur la moindre panne, ce qui fait
    // taire le bandeau au lieu de retarder l'inscription.
    const p = await proprietaireDuLien(ref);
    parrainage = readParrainage({
      ref,
      connu: p.connu,
      existe: p.existe,
      actif: p.actif,
      nomPublic: p.nomPublic,
    });
  }

  return <SignupForm parrainage={parrainage} />;
}
