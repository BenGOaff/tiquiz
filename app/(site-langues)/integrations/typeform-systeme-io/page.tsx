// app/(site-langues)/integrations/typeform-systeme-io/page.tsx
//
// TYPEFORM ET SYSTEME.IO : IL N'Y A QUE ZAPIER.
//
// La page dit la méthode qui marche avant de parler de nous, et elle
// pose le coût à plat : c'est ce qui la rend lisible par quelqu'un qui
// cherche vraiment à connecter Typeform.
//
// Elle ne porte AUCUNE phrase : tout son texte vit dans
// `lib/site/outils/typeform.ts`, dans les deux langues, et les phrases
// dont le milieu porte du gras ou un lien passent par `<Phrase>`.
//
// Un groupe de routes n'ajoute AUCUN segment d'URL :
// `/integrations/typeform-systeme-io` reste exactement ce qu'il était.

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
  CHEMIN_TYPEFORM,
  contenuTypeform,
  type TexteTypeform,
} from "@/lib/site/outils/typeform";
import {
  alternatesDeLangue,
  languePubliqueDuTexte,
  type LanguePublique,
} from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const OG = `${HOTE_VENTE}/integrations/typeform-recherche-systeme-io.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuTypeform(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_TYPEFORM, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_TYPEFORM}`;
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

function donneesStructurees(t: TexteTypeform, espace: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin: hrefPourLangue("/integrations", espace) },
        { nom: "Typeform", chemin: hrefPourLangue(CHEMIN_TYPEFORM, espace) },
      ]),
      faqJsonLd(t.faq),
    ],
  };
}

export default async function TypeformSystemeIo({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuTypeform(langue);

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
            { nom: "Typeform" },
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
        <Capture
          src="/integrations/typeform-recherche-systeme-io.webp"
          alt={t.captureRecherche.alt}
          largeur={1400}
          hauteur={827}
          premiere
          legende={t.captureRecherche.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.methodeTitre}</h2>
        {t.methodeCorps.map((segments, i) => (
          <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
            <Phrase segments={segments} lien={lien} />
          </p>
        ))}
        <Capture
          src="/integrations/typeform-zap-systeme-io.webp"
          alt={t.captureZap.alt}
          largeur={1400}
          hauteur={913}
          legende={t.captureZap.legende}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.coutTitre}</h2>
        <Tableau
          legende={t.coutLegende}
          entetes={[...t.coutEntetes]}
          lignes={t.coutLignes.map((l) => [...l])}
        />
        {t.coutApres.map((p, i) => (
          <p key={p} className={`tq-doux tq-lire leading-relaxed ${i === 0 ? "mt-6" : "mt-4"}`}>
            {p}
          </p>
        ))}
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">{t.quizTitre}</h2>
        {t.quizCorps.map((p) => (
          <p key={p} className="tq-doux tq-lire mt-4 leading-relaxed">
            {p}
          </p>
        ))}
        <Capture
          src="/integrations/tiquiz-cle-api.webp"
          alt={t.captureCle.alt}
          largeur={1400}
          hauteur={502}
          legende={t.captureCle.legende}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          <Phrase segments={t.quizLien} lien={lien} />
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
