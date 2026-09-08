// app/(site-langues)/integrations/tally-systeme-io/page.tsx
//
// TALLY ET SYSTEME.IO : LES TROIS MÉTHODES, DONT UNE GRATUITE.
//
// La page dit d'abord comment faire SANS nous, y compris la méthode
// gratuite qui demande du code. C'est ce qui la rend lisible par
// quelqu'un qui cherche vraiment à connecter Tally, et c'est la seule
// façon d'être crédible au moment où on parle de Tiquiz.
//
// Elle ne porte AUCUNE phrase : tout son texte vit dans
// `lib/site/outils/tally.ts`, dans les deux langues, et les phrases dont
// le milieu porte du code ou du gras passent par `<Phrase>`.
//
// Un groupe de routes n'ajoute AUCUN segment d'URL :
// `/integrations/tally-systeme-io` reste exactement ce qu'il était.

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
import { CHEMIN_TALLY, contenuTally, type TexteTally } from "@/lib/site/outils/tally";
import {
  alternatesDeLangue,
  languePubliqueDuTexte,
  type LanguePublique,
} from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const OG = `${HOTE_VENTE}/integrations/tally-integrations.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuTally(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_TALLY, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_TALLY}`;
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

function donneesStructurees(t: TexteTally, espace: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin: hrefPourLangue("/integrations", espace) },
        { nom: "Tally", chemin: hrefPourLangue(CHEMIN_TALLY, espace) },
      ]),
      faqJsonLd(t.faq),
    ],
  };
}

export default async function TallySystemeIo({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuTally(langue);

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
            { nom: "Tally" },
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

        {t.intro.map((p) => (
          <p key={p} className="tq-doux tq-lire mt-10 leading-relaxed first:mt-10 [&+p]:mt-4">
            {p}
          </p>
        ))}
        <Capture
          src="/integrations/tally-integrations.webp"
          alt={t.captureIntegrations.alt}
          largeur={1400}
          hauteur={782}
          premiere
          legende={t.captureIntegrations.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.comparTitre}</h2>
        <Tableau
          legende={t.comparLegende}
          entetes={[...t.comparEntetes]}
          lignes={t.comparLignes.map((l) => [...l])}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.m1Titre}</h2>
        {t.m1Corps.map((segments, i) => (
          <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
            <Phrase segments={segments} lien={lien} />
          </p>
        ))}
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.m2Titre}</h2>
        {t.m2Corps.map((segments, i) => (
          <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
            <Phrase segments={segments} lien={lien} />
          </p>
        ))}
        <Capture
          src="/integrations/tally-zap-systeme-io.webp"
          alt={t.captureZap.alt}
          largeur={1400}
          hauteur={913}
          legende={t.captureZap.legende}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          <Phrase segments={t.m2Lien} lien={lien} />
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.m3Titre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.m3Corps}</p>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">{t.quizTitre}</h2>
        {t.quizCorps.map((segments, i) => (
          <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
            <Phrase segments={segments} lien={lien} />
          </p>
        ))}
        <Capture
          src="/integrations/tiquiz-cle-api.webp"
          alt={t.captureCle.alt}
          largeur={1400}
          hauteur={502}
          legende={t.captureCle.legende}
        />
        <Capture
          src="/integrations/tiquiz-contact-tague.webp"
          alt={t.captureContact.alt}
          largeur={1400}
          hauteur={735}
          legende={t.captureContact.legende}
        />
        {t.quizFin.map((p, i) => (
          <p key={p} className={`tq-doux tq-lire leading-relaxed ${i === 0 ? "mt-6" : "mt-4"}`}>
            {p}
          </p>
        ))}
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
