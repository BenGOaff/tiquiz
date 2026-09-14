// app/(site-langues)/integrations/gohighlevel/page.tsx
//
// CONNECTER TIQUIZ À GOHIGHLEVEL : la page d'aide publique (Béné,
// 14 septembre 2026, "pages d'aide comme celles de Quizify"). Son texte
// vit dans `lib/site/outils/gohighlevel.ts`, dans les deux langues ;
// cette page ne porte AUCUNE phrase.
//
// Elle vit dans `(site-langues)` pour la même raison que ses voisines :
// le chrome et les liens lisent la langue de l'ADRESSE, posée par le
// middleware, et un groupe de routes n'ajoute aucun segment d'URL.

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { EnBref, Faq, FilDAriane, Phrase } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { faqJsonLd, filDArianeJsonLd } from "@/lib/site/integrations";
import { CHEMIN_GOHIGHLEVEL, contenuGoHighLevel, type TexteGoHighLevel } from "@/lib/site/outils/gohighlevel";
import { alternatesDeLangue, languePubliqueDuTexte, type LanguePublique } from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const OG = `${HOTE_VENTE}/integrations/schema-connexion-systemeio-og.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuGoHighLevel(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_GOHIGHLEVEL, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_GOHIGHLEVEL}`;
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

function donneesStructurees(t: TexteGoHighLevel, espace: LanguePublique) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin: hrefPourLangue("/integrations", espace) },
        { nom: "GoHighLevel", chemin: hrefPourLangue(CHEMIN_GOHIGHLEVEL, espace) },
      ]),
      faqJsonLd(t.faq),
    ],
  };
}

export default async function TiquizGoHighLevel({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuGoHighLevel(langue);
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
            { nom: "GoHighLevel" },
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
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.etapesTitre}</h2>
        {t.etapes.map((e) => (
          <div key={e.titre} className="mt-8">
            <h3 className="text-xl font-semibold">{e.titre}</h3>
            {e.corps.map((segments, i) => (
              <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
                <Phrase segments={segments} lien={lien} />
              </p>
            ))}
          </div>
        ))}
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.envoyeTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.envoyeIntro}</p>
        <ul className="tq-lire mt-4 space-y-3">
          {t.envoye.map((segments, i) => (
            <li key={i} className="tq-doux leading-relaxed">
              <Phrase segments={segments} lien={lien} />
            </li>
          ))}
        </ul>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.agenceTitre}</h2>
        {t.agenceCorps.map((segments, i) => (
          <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
            <Phrase segments={segments} lien={lien} />
          </p>
        ))}
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.pauseTitre}</h2>
        {t.pauseCorps.map((segments, i) => (
          <p key={i} className="tq-doux tq-lire mt-4 leading-relaxed">
            <Phrase segments={segments} lien={lien} />
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

      <section className="tq-large mt-16 pb-24">
        <Faq langue={langue} questions={t.faq} />
      </section>
    </main>
  );
}
