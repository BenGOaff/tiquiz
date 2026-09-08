// app/(site-langues)/integrations/zapier-systeme-io/page.tsx
//
// ZAPIER ET SYSTEME.IO : CE QUE LE PLAN GRATUIT PERMET.
//
// Cette page dit à quelqu'un de prendre Zapier quand c'est la bonne
// réponse, et elle le dit AVANT de parler de Tiquiz. C'est ce qui la
// rend crédible : une page d'intégration qui n'explique pas
// l'intégration est une page de vente déguisée.
//
// -- ELLE NE PORTE AUCUNE PHRASE ---------------------------------------
//
// Béné, 8 septembre 2026 : "continue la traduction de tout stp." Tout
// son texte vit dans `lib/site/outils/zapier.ts`. Écrire le français
// ici et l'anglais ailleurs, c'est deux versions de la même page qui
// divergent au premier correctif, et c'est le défaut le plus cher de ce
// dépôt.
//
// -- POURQUOI ELLE VIT DANS `(site-langues)` ---------------------------
//
// Le chrome et les liens doivent connaître la langue de l'ADRESSE, qui
// se lit dans l'en-tête posé par le middleware. Un groupe de routes
// n'ajoute AUCUN segment d'URL : `/integrations/zapier-systeme-io` reste
// exactement ce qu'il était, sa canonique ne bouge pas.
//
// 🚨 LES DEUX FAITS À NE JAMAIS INVERSER vivent dans le module, avec
// leur mesure écrite à côté (Systeme.io n'est PAS une application
// Premium ; le prix vient de la capture que la page affiche).

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { faqJsonLd, filDArianeJsonLd } from "@/lib/site/integrations";
import { CHEMIN_ZAPIER, contenuZapier, type TexteZapier } from "@/lib/site/outils/zapier";
import {
  alternatesDeLangue,
  languePubliqueDuTexte,
  type LanguePublique,
} from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const OG = `${HOTE_VENTE}/integrations/zapier-actions-systeme-io.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

// LA CANONIQUE VIENT DE L'ADRESSE, LE TEXTE VIENT DE LA LANGUE RÉSOLUE.
// Les deux répondent la même chose sur `/en/...`, et PAS sur le chemin
// nu visité avec un cookie anglais (règle du 8 septembre).
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuZapier(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_ZAPIER, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_ZAPIER}`;
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

function donneesStructurees(t: TexteZapier, espace: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin: hrefPourLangue("/integrations", espace) },
        { nom: "Zapier", chemin: hrefPourLangue(CHEMIN_ZAPIER, espace) },
      ]),
      faqJsonLd(t.faq),
    ],
  };
}

export default async function ZapierSystemeIo({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuZapier(langue);

  // `/signup` est servi par l'APP et n'a AUCUNE version préfixée :
  // `hrefPourLangue` le laisse donc nu. Un `/en/` posé à la main y
  // fabriquerait un 404 au bout du seul bouton de la page.
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
            { nom: "Zapier" },
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
        <h2 className="text-[2rem]">{t.exposeTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <strong>{t.declencheursFort}</strong>
          {t.declencheurs}
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <strong>{t.actionsFort}</strong>
          {t.actions}
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.actionUtile}</p>
        <Capture
          src="/integrations/zapier-actions-systeme-io.webp"
          alt={t.captureActions.alt}
          largeur={1400}
          hauteur={910}
          premiere
          legende={t.captureActions.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.limitesTitre}</h2>
        <Tableau
          legende={t.tableauLegende}
          entetes={[...t.tableauEntetes]}
          lignes={t.tableauLignes.map((l) => [...l])}
        />
        {/* UN `<strong>` AU MILIEU D'UNE PHRASE : le module rend
            [avant, gras, apres] plutôt qu'une balise dans une chaîne,
            qui obligerait à l'injecter en `innerHTML`. */}
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          {t.limitesApres[0]}
          <strong>{t.limitesApres[1]}</strong>
          {t.limitesApres[2]}
        </p>
        <Capture
          src="/integrations/zapier-tarifs.webp"
          alt={t.captureTarifs.alt}
          largeur={1400}
          hauteur={1223}
          legende={t.captureTarifs.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.momentTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.momentIntro}</p>
        <ol className="tq-lire mt-8 space-y-6">
          {t.momentEtapes.map((etape, i) => (
            <li key={etape} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--tq-bleu)] text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="tq-doux leading-relaxed">{etape}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">{t.eviteTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          {t.eviteTiquiz[0]}
          <strong>{t.eviteTiquiz[1]}</strong>
          {t.eviteTiquiz[2]}
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.eviteReste}</p>
        <div className="mt-8 flex flex-wrap gap-3">
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
