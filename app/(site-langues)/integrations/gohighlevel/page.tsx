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

import { Capture, EnBref, Faq, FilDAriane, Phrase } from "@/components/site/Integrations";
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

      {/* LE GUIDE PAS À PAS (Béné, 15 septembre 2026 : "le step by step
          comme Quizify : illustré, guidé à chaque étape"). Une action par
          étape, numérotée, avec le produit dans lequel on est, et sa
          capture. Tant qu'une capture manque, l'encadré NOMME l'écran à
          photographier : un vide passerait pour un oubli (c'est ce que font
          les pages de fonctionnalités depuis le 5 septembre). */}
      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">{t.etapesTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.etapesIntro}</p>
        <ol className="mt-8 space-y-10 list-none p-0">
          {t.etapes.map((e, n) => (
            <li key={e.titre} className="tq-lire">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tq-bleu)] text-white font-bold"
                >
                  {n + 1}
                </span>
                <h3 className="text-xl font-semibold m-0">
                  <span className="sr-only">{t.etapeMot} {n + 1} : </span>
                  {e.titre}
                </h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    e.ou === "tiquiz" ? "border-[var(--tq-bleu)] text-[var(--tq-bleu)]" : "border-[var(--tq-bord)] tq-doux"
                  }`}
                >
                  {t.ou[e.ou]}
                </span>
              </div>
              {e.corps.map((segments, i) => (
                <p key={i} className="tq-doux mt-4 leading-relaxed">
                  <Phrase segments={segments} lien={lien} />
                </p>
              ))}
              {e.capture.image ? (
                <Capture
                  src={`/integrations/${e.capture.image.fichier}`}
                  alt={e.capture.image.alt}
                  largeur={e.capture.image.largeur}
                  hauteur={e.capture.image.hauteur}
                  legende={e.capture.image.legende}
                />
              ) : (
                <div className="mt-6 rounded-2xl border-2 border-dashed border-[var(--tq-bord)] p-5">
                  <p className="m-0 text-xs font-extrabold uppercase tracking-wider tq-doux">{t.captureAAjouter}</p>
                  <p className="m-0 mt-2 text-sm">{e.capture.aFaire}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
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
