// app/widgets/social-proof/page.tsx
//
// Page autonome rendue dans un <iframe> sur la sales page Systeme.io
// (tipote.fr/tiquiz) pour la preuve sociale.
//
// Pourquoi un iframe au lieu d'un snippet HTML/JS direct ?
// Systeme.io strippe les <script> dans les blocs "Code HTML personnalisé"
// → le snippet rendait les cartes mais le JS du count-up ne s'exécutait
// jamais. L'iframe contourne ça en hébergeant la page côté Tiquiz
// (où on contrôle le JS de bout en bout).
//
// On utilise un Client Component qui fait son propre fetch vers
// /api/public/stats. Pas de revalidate Next : on veut que les chiffres
// soient à jour à chaque load, et l'endpoint stats est déjà cache CDN.

import { SocialProofWidget } from "./SocialProofWidget";

export const metadata = {
  title: "Tiquiz en chiffres",
  robots: { index: false, follow: false },
};

export default function SocialProofPage() {
  return <SocialProofWidget />;
}
