// app/(site-langues)/integrations/jotform-systeme-io/page.tsx
//
// JOTFORM : LA SEULE PAGE DU HUB OÙ L'INTÉGRATION EXISTE... SUR LE PAPIER.
//
// C'est ce qui rend le cas intéressant, et c'est aussi ce qui le rend
// délicat : dire "Jotform ment" serait faux et indéfendable. Jotform
// propose bien un raccourci qui fait gagner du temps. Ce qu'il ne fait
// pas, c'est retirer l'abonnement Zapier en dessous.
//
// 🚨 TROIS FAITS, ET LES TROIS ONT ÉTÉ MESURÉS, PAS RECOPIÉS :
//
//   1. Le bouton « Use this integration » de jotform.com/integrations/
//      systemeio mène à `jotform.com/build/?integration=Zapier&app=
//      systeme.io&clientID=...` (relevé sur la page en ligne).
//   2. Le schéma de leur PROPRE page fait passer la connexion par une
//      pastille "zapier" entre Jotform et systeme.io (capture).
//   3. L'écran Intégrations du constructeur Jotform ouvre un panneau
//      ZAPIER : "Sync Jotform submissions to 3000+ platforms", un bouton
//      "Se connecter à Zapier", et des "Modèles Zapier" (capture).
//
// La capture 2 est la démonstration la plus solide des trois, parce
// qu'elle vient d'eux et qu'elle se lit sans connaître Zapier.
//
// -- CETTE PAGE NE PORTE AUCUNE PHRASE (8 septembre 2026) -------------
//
// Tout son texte vit dans `lib/site/outils/jotform.ts`, dans les deux
// langues. Écrire le français ici et l'anglais ailleurs, c'est deux
// versions de la même page qui divergent au premier correctif.
//
// Et elle vit dans `(site-langues)` parce que c'est le SEUL groupe qui
// lit l'en-tête de langue posé par le middleware : sans lui, le chrome
// et les liens ne peuvent pas suivre `/en/`. Un groupe de routes
// n'ajoute AUCUN segment d'URL, donc l'adresse ne bouge pas d'un
// caractère (sa contrainte du 8 septembre).

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { faqJsonLd, filDArianeJsonLd } from "@/lib/site/integrations";
import { CHEMIN_JOTFORM, contenuJotform, type TexteJotform } from "@/lib/site/outils/jotform";
import {
  alternatesDeLangue,
  languePubliqueDuTexte,
  type LanguePublique,
} from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const OG = `${HOTE_VENTE}/integrations/jotform-page-integration.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

// LA CANONIQUE VIENT DE L'ADRESSE, LE TEXTE VIENT DE LA LANGUE RÉSOLUE :
// deux questions différentes, qui répondent pareil sur `/en/...` et pas
// sur `/...` visité avec un cookie anglais (règle du 8 septembre).
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuJotform(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_JOTFORM, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_JOTFORM}`;
  return {
    title: t.titre,
    description: t.description,
    ...(alternates ? { alternates } : {}),
    openGraph: {
      type: "article",
      title: t.titre,
      description: t.description,
      url,
      siteName: "Tiquiz",
      locale: canonique === "fr" ? "fr_FR" : "en_US",
      images: [{ url: OG }],
    },
    twitter: { card: "summary_large_image", title: t.titre, description: t.description, images: [OG] },
  };
}

function donneesStructurees(t: TexteJotform, espace: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin: hrefPourLangue("/integrations", espace) },
        { nom: "Jotform", chemin: hrefPourLangue(CHEMIN_JOTFORM, espace) },
      ]),
      faqJsonLd(t.faq),
    ],
  };
}

export default async function JotformSystemeIo({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuJotform(langue);
  // L'ESPACE D'ADRESSE, PAS LA LANGUE DU TEXTE : c'est lui qui décide si
  // un lien porte `/en/`, et il vient du middleware.
  const espace = await langueCanonique();
  const lien = (chemin: string) => hrefPourLangue(chemin, espace);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees(t, espace)) }}
      />

      <section className="tq-large pt-12 sm:pt-16">
        <FilDAriane
          langue={langue}
          etapes={[
            { nom: t.filAccueil, chemin: lien("/") },
            { nom: t.filIntegrations, chemin: lien("/integrations") },
            { nom: "Jotform" },
          ]}
        />
        <p className="tq-etiquette mt-8">{t.etiquette}</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.4rem] sm:text-[3.2rem]">
          {t.h1Avant}
          <span className="tq-surb">{t.h1Surb}</span>
          {t.h1Apres}
        </h1>

        <EnBref langue={langue}>
          {t.enBref.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </EnBref>

        <p className="tq-doux tq-lire mt-10 leading-relaxed">{t.intro}</p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.boutonTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.boutonAvant}</p>
        {/* L'ADRESSE RELEVÉE, TELLE QUELLE : un paramètre d'URL n'est pas
            du texte, il ne se traduit dans aucune langue. */}
        <pre className="tq-lire mt-4 overflow-x-auto rounded-xl border border-[var(--tq-bord)] bg-[var(--tq-panneau)] p-4 text-[0.85rem]">
          <code>jotform.com/build/?integration=Zapier&amp;app=systeme.io&amp;clientID=...</code>
        </pre>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.boutonApres}</p>
        <Capture
          src="/integrations/jotform-page-integration.webp"
          alt={t.capturePage.alt}
          largeur={1400}
          hauteur={711}
          premiere
          legende={t.capturePage.legende}
        />
        <Capture
          src="/integrations/jotform-panneau-zapier.webp"
          alt={t.capturePanneau.alt}
          largeur={1400}
          hauteur={978}
          legende={t.capturePanneau.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.impliqueTitre}</h2>
        <Tableau
          legende={t.tableauLegende}
          entetes={t.tableauEntetes}
          lignes={t.tableauLignes}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          {t.impliqueApresAvant}
          <Link href={lien("/integrations/zapier-systeme-io")}>{t.impliqueApresLien}</Link>.
        </p>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">{t.quizTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.quizPourquoi}</p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.quizTiquiz}</p>
        <Capture
          src="/integrations/tiquiz-profils-tags.webp"
          alt={t.captureProfils.alt}
          largeur={1400}
          hauteur={913}
          legende={t.captureProfils.legende}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">{t.quizFin}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {/* `/signup` est servi par l'APP, qui résout la langue elle même :
              son adresse ne se préfixe JAMAIS, il n'existe aucun
              `/en/signup`. `hrefPourLangue` le sait. */}
          <Link href={lien("/signup")} className="tq-bouton">
            {t.ctaEssayer}
          </Link>
          <Link href={lien("/integrations")} className="tq-bouton tq-bouton-fantome">
            {t.ctaTousLesOutils}
          </Link>
        </div>
      </section>

      <Faq langue={langue} questions={t.faq} />
      <div className="pb-24" />
    </main>
  );
}
