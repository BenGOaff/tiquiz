// app/(site-langues)/integrations/google-forms-systeme-io/page.tsx
//
// GOOGLE FORMS ET SYSTEME.IO : DEUX QUESTIONS, DEUX RÉPONSES.
//
// Elle ne porte AUCUNE phrase : tout son texte vit dans
// `lib/site/outils/googleForms.ts`, dans les deux langues, et les
// phrases dont le milieu porte du gras ou un lien passent par
// `<Phrase>`.
//
// Un groupe de routes n'ajoute AUCUN segment d'URL :
// `/integrations/google-forms-systeme-io` reste exactement ce qu'il
// était.

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
  CHEMIN_GOOGLE_FORMS,
  contenuGoogleForms,
  type TexteGoogleForms,
} from "@/lib/site/outils/googleForms";
import {
  alternatesDeLangue,
  languePubliqueDuTexte,
  type LanguePublique,
} from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const OG = `${HOTE_VENTE}/integrations/google-forms-zap-feuille.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuGoogleForms(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_GOOGLE_FORMS, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_GOOGLE_FORMS}`;
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

function donneesStructurees(t: TexteGoogleForms, espace: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin: hrefPourLangue("/integrations", espace) },
        { nom: "Google Forms", chemin: hrefPourLangue(CHEMIN_GOOGLE_FORMS, espace) },
      ]),
      faqJsonLd(t.faq),
    ],
  };
}

export default async function GoogleFormsSystemeIo({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuGoogleForms(langue);

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
            { nom: "Google Forms" },
          ]}
        />
        <p className="tq-etiquette mt-8">{t.etiquette}</p>
        <h1 className="mt-3 max-w-[20ch] text-[2.4rem] sm:text-[3.2rem]">
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
        <h2 className="text-[2rem]">{t.afficherTitre}</h2>
        {t.afficherCorps.map((p) => (
          <p key={p} className="tq-doux tq-lire mt-4 leading-relaxed">
            {p}
          </p>
        ))}
        <Capture
          src="/integrations/google-forms-dans-systeme-io.webp"
          alt={t.captureMobile.alt}
          largeur={524}
          hauteur={928}
          premiere
          legende={t.captureMobile.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.envoyerTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <Phrase segments={t.envoyerZapier} lien={lien} />
        </p>
        <Capture
          src="/integrations/google-forms-zap-feuille.webp"
          alt={t.captureZap.alt}
          largeur={1400}
          hauteur={913}
          legende={t.captureZap.legende}
        />
        <p className="tq-doux tq-lire mt-8 leading-relaxed">
          <Phrase segments={t.envoyerScript} lien={lien} />
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <Phrase segments={t.lienZapier} lien={lien} />
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.comparTitre}</h2>
        <Tableau
          legende={t.comparLegende}
          entetes={[...t.comparEntetes]}
          lignes={t.comparLignes.map((l) => [...l])}
        />
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">{t.pasTitre}</h2>
        {t.pasCorps.map((p) => (
          <p key={p} className="tq-doux tq-lire mt-4 leading-relaxed">
            {p}
          </p>
        ))}
        <Capture
          src="/integrations/tiquiz-profils-tags.webp"
          alt={t.captureProfils.alt}
          largeur={1400}
          hauteur={913}
          legende={t.captureProfils.legende}
        />
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
