// app/blog/page.tsx
//
// L'ACCUEIL DU BLOG, DANS LA LANGUE SANS PREFIXE.
//
// Cette route ne porte QUE ce qui lui est propre : sa langue. Le corps
// (`components/site/SommaireBlog`) et les metadonnees
// (`lib/blog/metaSommaire`) sont partages avec `/en/blog`.
//
// L'anglais a son PROPRE segment, et ce n'est pas un choix de confort :
// la page est `force-static`, donc prerendue au BUILD, donc sans requete
// et sans en-tete de langue a lire. Voir `CHEMINS_HORS_REECRITURE` dans
// `lib/site/langues.ts`.

import type { Metadata } from "next";

import { metadonneesSommaire } from "@/lib/blog/metaSommaire";
import { LANGUE_SANS_PREFIXE } from "@/lib/site/langues";
import SommaireBlog from "@/components/site/SommaireBlog";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = metadonneesSommaire(LANGUE_SANS_PREFIXE);

export default function BlogIndex() {
  return <SommaireBlog langue={LANGUE_SANS_PREFIXE} />;
}
