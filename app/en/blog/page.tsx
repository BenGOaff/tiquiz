// app/en/blog/page.tsx
//
// L'ACCUEIL DU BLOG, EN ANGLAIS.
//
// -- POURQUOI UN SEGMENT REEL, ET PAS LA REECRITURE `/en/` ------------
//
// Le middleware reecrit `/en/<chemin>` vers `/<chemin>` et pose la
// langue dans un en-tete de REQUETE. Ca ne peut pas marcher ici : la
// page est `force-static`, donc prerendue au BUILD, donc sans requete et
// sans en-tete a lire. `/en/blog` est donc EXCLU de la reecriture
// (`lib/site/langues.ts`, `CHEMINS_HORS_REECRITURE`), et c'est ce
// fichier qui repond.
//
// Il ne porte QUE sa langue : le corps et les metadonnees vivent a un
// seul endroit, partages avec le francais.

import type { Metadata } from "next";

import { metadonneesSommaire } from "@/lib/blog/metaSommaire";
import SommaireBlog from "@/components/site/SommaireBlog";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = metadonneesSommaire("en");

export default function BlogIndexEn() {
  return <SommaireBlog langue="en" />;
}
