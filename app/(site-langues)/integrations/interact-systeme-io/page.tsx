// app/(site-langues)/integrations/interact-systeme-io/page.tsx
//
// INTERACT ET SYSTEME.IO : CE QUE DEMANDE LEUR PROPRE DOCUMENTATION.
//
// Elle ne porte AUCUNE phrase : tout son texte vit dans
// `lib/site/outils/interact.ts`. Les DEUX CITATIONS y vivent hors des
// objets de langue et ne sont donc jamais traduites : on cite un
// concurrent, et une citation approchée serait indéfendable.
//
// Un groupe de routes n'ajoute AUCUN segment d'URL :
// `/integrations/interact-systeme-io` reste exactement ce qu'il était.

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import {
  Capture,
  EnBref,
  Faq,
  FilDAriane,
  Phrase,
  Tableau,
} from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { faqJsonLd, filDArianeJsonLd } from "@/lib/site/integrations";
import {
  CHEMIN_INTERACT,
  CITATIONS_INTERACT,
  DOC_INTERACT,
  contenuInteract,
  type TexteInteract,
} from "@/lib/site/outils/interact";
import {
  alternatesDeLangue,
  languePubliqueDuTexte,
  type LanguePublique,
} from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const OG = `${HOTE_VENTE}/integrations/interact-doc-tags.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuInteract(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_INTERACT, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_INTERACT}`;
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

function donneesStructurees(t: TexteInteract, espace: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin: hrefPourLangue("/integrations", espace) },
        { nom: "Interact", chemin: hrefPourLangue(CHEMIN_INTERACT, espace) },
      ]),
      faqJsonLd(t.faq),
    ],
  };
}

export default async function InteractSystemeIo({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuInteract(langue);

  // `/signup` est servi par l'APP et n'a AUCUNE version préfixée :
  // `hrefPourLangue` le laisse nu, et un `/en/` posé à la main y
  // fabriquerait un 404 au bout du bouton.
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
            { nom: "Interact" },
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
        <h2 className="text-[2rem]">{t.docTitre}</h2>
        {t.docCorps.map((segments, i) => (
          <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
            <Phrase segments={segments} lien={lien} />
          </p>
        ))}
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.docAnnonce}</p>
        <blockquote className="tq-lire mt-6 border-t-2 border-[var(--tq-bleu)] pt-5">
          {CITATIONS_INTERACT.map((citation, i) => (
            <p
              key={citation}
              className={`text-[1.05rem] italic leading-relaxed ${i === 0 ? "" : "mt-4"}`}
            >
              « {citation} »
            </p>
          ))}
          <footer className="tq-doux mt-4 text-sm">
            {t.sourceAvant}
            <a href={DOC_INTERACT} target="_blank" rel="noopener noreferrer">
              {t.sourceLien}
            </a>
            {t.sourceApres}
          </footer>
        </blockquote>
        <p className="tq-doux tq-lire mt-6 leading-relaxed">{t.docApres}</p>
        <Capture
          src="/integrations/interact-doc-tags.webp"
          alt={t.captureDoc.alt}
          largeur={1209}
          hauteur={652}
          premiere
          legende={t.captureDoc.legende}
        />
        <Capture
          src="/integrations/interact-un-zap-par-resultat.webp"
          alt={t.captureZaps.alt}
          largeur={1400}
          hauteur={913}
          legende={t.captureZaps.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.reelTitre}</h2>
        <Tableau
          legende={t.reelLegende}
          entetes={[...t.reelEntetes]}
          lignes={t.reelLignes.map((l) => [...l])}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          <Phrase segments={t.reelApres} lien={lien} />
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.tiquizTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <Phrase segments={t.tiquizCorps} lien={lien} />
        </p>
        <Capture
          src="/integrations/tiquiz-tag-sur-le-profil.webp"
          alt={t.captureTag.alt}
          largeur={1400}
          hauteur={735}
          legende={t.captureTag.legende}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">{t.tiquizGratuit}</p>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">{t.mieuxTitre}</h2>
        {t.mieuxCorps.map((p) => (
          <p key={p} className="tq-doux tq-lire mt-4 leading-relaxed">
            {p}
          </p>
        ))}
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <Phrase segments={t.mieuxLien} lien={lien} />
        </p>
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
