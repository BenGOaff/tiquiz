// app/signup/page.tsx
//
// L'INSCRIPTION GRATUITE SE FAIT CHEZ NOUS (Béné, 26 août 2026).
//
// "Sur notre page on doit pouvoir s'inscrire sur la page de login : pas
// de compte, crées-en un gratuitement maintenant. Avec le lien affi,
// l'envoi sur systeme io pour être abonné à la campagne etc."
//
// -- CE QUE CETTE PAGE FAISAIT, ET POURQUOI ÇA A CHANGÉ ---------------
//
// Elle REDIRIGEAIT vers `tipote.fr/part-tiquiz-gratuit`, décision du
// 14 juillet 2026 : "il ne devrait pas pouvoir s'inscrire directement
// sur Tiquiz, mais obligatoirement passer par ma page de capture
// systeme io". Le motif était bon : une inscription prise chez nous ne
// créait aucun contact chez eux, donc la personne sortait de toutes les
// séquences email, en silence.
//
// Ce motif a disparu le 25 août. `POST /api/auth/signup` crée le compte,
// rattache l'affilié à vie (`rattacherInscrit`, cookie `tq_ref` posé par
// le middleware), ET crée le contact chez Systeme.io avec son étiquette
// (`poserTagPlan`). Le formulaire existait depuis, et il n'était branché
// nulle part : cette page redirigeait encore.
//
// -- CE QUI RESTE À FAIRE CHEZ SYSTEME.IO, ET CE N'EST PAS DU CODE ----
//
// Poser l'étiquette ne suffit PAS à abonner quelqu'un à une campagne :
// leur API n'a aucun point d'entrée pour ça, c'est une AUTOMATISATION
// (déclencheur "tag ajouté") qui le fait, et elle se crée dans leur
// tableau de bord. Sans une règle qui écoute `tiquiz-free`, le contact
// est bien créé et étiqueté, et il ne reçoit rien.

import type { Metadata } from "next";

import SignupForm from "@/components/auth/SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // L'inscription n'a rien à faire dans un résultat de recherche : ce
  // sont les pages de vente qui doivent ranker.
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupForm />;
}
