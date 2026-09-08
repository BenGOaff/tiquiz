// app/(site-langues)/fonctionnalites/page.tsx
//
// LE HUB DES FONCTIONNALITÉS.
//
// Béné, 5 septembre 2026 : "je veux aussi une page avec le détail de
// chaque fonctionnalité pour creuser le sujet : sur la landing on
// présente pourquoi cette fonctionnalité + les bénéfices + comment ça
// marche en une phrase. Sur la page détail on détaille comment ça
// marche avec des screenshot etc."
//
// Cette page est la porte : une carte par fonctionnalité, son palier,
// et sa phrase. Le détail vit sur `/fonctionnalites/<slug>`.
//
// LE TEXTE VIENT DE `lib/site/fonctionnalites.ts`, ET IL EST LE MÊME
// QUE CELUI DE LA LANDING. Écrire ici une deuxième version des mêmes
// arguments donnerait, dans six mois, une landing qui promet ce que la
// page détaillée ne décrit plus. C'est le défaut le plus cher de ce
// dépôt, sorti sept fois.
//
// -- POURQUOI ELLE VIT DANS `(site-langues)` -------------------------
//
// Béné, 8 septembre 2026 : "toutes les pages et mêmes les articles
// doivent être multilangues". Le chrome doit donc connaître la langue
// de l'ADRESSE pour que ses liens suivent, et cette langue se lit dans
// l'en-tête posé par le middleware. Un groupe de routes n'ajoute AUCUN
// segment d'URL : `/fonctionnalites` reste `/fonctionnalites`.

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { HOTE_VENTE } from "@/lib/publicHost";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { alternatesDeLangue, languePubliqueDuTexte } from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

import { CSS } from "@/components/fonctionnalites/styles";
import {
  CHROME_FONCTIONNALITES,
  fonctionnalites,
  libellePalier,
} from "@/lib/site/fonctionnalites";

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

// LA CANONIQUE VIENT DE L'ADRESSE, LE TEXTE VIENT DE LA LANGUE RÉSOLUE.
// Deux questions différentes : quelqu'un dont le cookie dit "en" et qui
// ouvre `/fonctionnalites` lit l'anglais, et la page reste canonique sur
// `/fonctionnalites`. Sans ça, deux visiteurs annonceraient deux
// canoniques pour la même URL, et c'est celle du robot qui compte.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = CHROME_FONCTIONNALITES[await resoudreLangue(searchParams)];
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, "/fonctionnalites", canonique);
  return {
    title: t.metaTitre,
    description: t.metaDescription,
    ...(alternates ? { alternates } : {}),
    openGraph: {
      type: "website",
      title: t.metaTitre,
      description: t.metaDescription,
      url: alternates?.canonical ?? `${HOTE_VENTE}/fonctionnalites`,
      siteName: "Tiquiz",
      locale: canonique === "fr" ? "fr_FR" : "en_US",
    },
  };
}

export default async function Page({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = CHROME_FONCTIONNALITES[langue];
  const liste = fonctionnalites(langue);

  // LES LIENS SUIVENT L'ADRESSE, PAS LE TEXTE.
  //
  // Depuis `/en/fonctionnalites`, une carte doit mener à
  // `/en/fonctionnalites/<slug>` : sans le préfixe, un clic renvoie le
  // lecteur anglophone dans l'espace français, et l'URL anglaise qu'on
  // vient de construire n'est plus atteinte par aucun lien interne.
  //
  // Et c'est bien la langue CANONIQUE qui décide, jamais celle du
  // texte : quelqu'un dont le cookie dit "en" et qui ouvre
  // `/fonctionnalites` lit l'anglais et reste dans l'espace français.
  // Le préfixer là le sortirait d'une adresse qu'il n'a pas demandée.
  const espace = await langueCanonique();
  const lien = (chemin: string) => hrefPourLangue(chemin, espace);

  return (
    <main className="tqf" lang={langue}>
      <style>{CSS}</style>
      <section className="tqf-tete">
        <div className="tqf-large">
          <h1>{t.titreHub}</h1>
          {/* LE NOMBRE VIENT DE LA LISTE, jamais écrit à la main : il
              a annoncé "quatorze" pendant que la liste en portait huit,
              et personne ne l'aurait vu depuis le code. */}
          <p className="tqf-chapo">{t.chapoHub(liste.length)}</p>
        </div>
      </section>

      <section className="tqf-sec">
        <div className="tqf-large">
          <div className="tqf-grille">
            {liste.map((f) => (
              <Link key={f.slug} href={lien(`/fonctionnalites/${f.slug}`)} className="tqf-carte">
                <span className={`tqf-palier tqf-palier-${f.palier}`}>
                  {libellePalier(f.palier, langue)}
                </span>
                <h2>{f.nom}</h2>
                <p>{f.resume}</p>
                <span className="tqf-lire">{t.lireLeDetail}</span>
              </Link>
            ))}
          </div>

          {/* LE MAILLAGE : le hub mène aux huit enfants ET au tarif. */}
          <div className="tqf-fin">
            <Link href={lien("/tarifs")} className="tqf-cta">
              {t.versTarifs}
            </Link>
            <p className="tqf-rassure">{t.rassureHub}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
