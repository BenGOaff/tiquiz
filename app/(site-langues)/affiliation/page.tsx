// app/(site-langues)/affiliation/page.tsx
//
// LE PROGRAMME D'AFFILIATION TIQUIZ.
//
// Remplace `tipote.fr/tiquiz/affiliation`, qui decrivait le programme
// Systeme.io. Ce qui a change depuis n'est pas cosmetique : le lien
// porte `?ref=`, le cookie dure un an, c'est NOUS qui payons, et
// l'autofacture est emise par nous. Une page qui decrirait encore
// l'ancien fonctionnement enverrait des affilies chercher leur argent
// au mauvais endroit.
//
// AUCUN CHIFFRE N'EST TAPE DANS CE FICHIER : ils viennent de
// `lib/site/programmeAffiliation.ts`, qui les derive du catalogue.
// AUCUNE PHRASE NON PLUS : elles vivent dans `lib/site/pageAffiliation.ts`,
// dans les deux langues.
//
// Un groupe de routes n'ajoute AUCUN segment d'URL : `/affiliation`
// reste exactement ce qu'il etait. Ce groupe la est le seul qui lit
// l'en-tete de langue pose par le middleware, donc le seul ou le chrome
// et les liens peuvent suivre `/en/`.

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { HOTE_VENTE } from "@/lib/publicHost";
import { AFFILIATE_DASHBOARD_URL } from "@/lib/affiliateUrls";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { gainAtelier, reglesPourLangue } from "@/lib/site/programmeAffiliation";
import {
  POURCENT_TIQUIZ,
  contenuAffiliation,
  gainsPourLangue,
} from "@/lib/site/pageAffiliation";
import { alternatesDeLangue, languePubliqueDuTexte } from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";
import SimulateurAffiliation from "@/components/site/SimulateurAffiliation";

const CHEMIN = "/affiliation";

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuAffiliation(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN}`;
  return {
    title: t.titre,
    description: t.description,
    ...(alternates ? { alternates } : {}),
    openGraph: {
      type: "website",
      title: t.titre,
      description: t.description,
      url,
      siteName: "Tiquiz",
      locale: canonique === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title: t.titre, description: t.description },
  };
}

export default async function PageAffiliation({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuAffiliation(langue);
  const gains = gainsPourLangue(langue);
  const atelier = gainAtelier(langue);
  const regles = reglesPourLangue(langue);

  // `/conditions-generales-affiliation` est une page LEGALE et
  // `hrefPourLangue` sait qu'elle n'a pas de version prefixee : un
  // `/en/` pose a la main y ferait un 404 au bout du bouton.
  const espace = await langueCanonique();
  const lien = (chemin: string) => hrefPourLangue(chemin, espace);

  return (
    <main>
      <section className="tq-large pt-16 sm:pt-24">
        <p className="tq-etiquette">{t.etiquette}</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.6rem] sm:text-[3.6rem]">
          {/* C'est le TAUX qu'on met en couleur, pas la phrase. Deux
              caracteres suffisent a porter le message ; six mots en
              3,6 rem ecraseraient le reste de la page, ce que Bene a
              releve le 30 aout ("c'est trop"). Depuis le 31, `tq-surb`
              est une couleur de texte, plus un rectangle bleu. */}
          <span className="tq-surb">{POURCENT_TIQUIZ} %</span>
          {t.h1Apres}
        </h1>
        <p className="tq-doux mt-6 tq-lire text-[1.1rem] leading-relaxed">{t.accroche}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href={AFFILIATE_DASHBOARD_URL}
            className="tq-bouton"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.ctaRejoindre}
          </a>
          <Link href={lien("/affiliation-atelier")} className="tq-bouton tq-bouton-fantome">
            {t.ctaAtelier}
          </Link>
        </div>
        <p className="tq-doux mt-4 text-sm">{t.noteGratuit}</p>
      </section>

      {/* LE SIMULATEUR. Il vivait sur sa page Systeme.io et il a disparu
          quand je l'ai remplacee sans l'avoir lue. Il remonte tout en
          haut : c'est la seule question que se pose un affilie, et lui
          seul y repond en chiffres. */}
      <section className="tq-large mt-16">
        <h2 className="text-[2.2rem]">{t.combienTitre}</h2>
        <p className="tq-doux tq-lire mt-4 text-[1.05rem] leading-relaxed">
          {t.combienIntro.avant}
          <strong className="text-[var(--tq-encre)]">{t.combienIntro.fort}</strong>
          {t.combienIntro.milieu}
          <strong className="text-[var(--tq-encre)]">{t.combienIntro.fort2}</strong>
          {t.combienIntro.apres}
        </p>
        <div className="mt-8">
          <SimulateurAffiliation langue={langue} />
        </div>
      </section>

      {/* LES DEUX RECOMPENSES, EN TOUTES LETTRES. */}
      <section className="tq-large mt-24">
        <h2 className="text-[2rem]">{t.recompenseTitre}</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border-2 border-[var(--tq-bleu)] bg-white p-7">
            <p className="tq-etiquette">{t.option1Label}</p>
            <h3 className="mt-2 text-[1.3rem]">{t.option1Titre}</h3>
            <ul className="tq-doux mt-4 space-y-2.5 leading-relaxed">
              {t.option1Items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-7">
            <p className="tq-etiquette">{t.option2Label}</p>
            <h3 className="mt-2 text-[1.3rem]">{t.option2Titre}</h3>
            <ul className="tq-doux mt-4 space-y-2.5 leading-relaxed">
              {t.option2Items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="tq-doux tq-lire mt-6 leading-relaxed">{t.recompenseNote}</p>
      </section>

      {/* CE QUE CA RAPPORTE, EN EUROS. */}
      <section className="tq-large mt-24">
        <h2 className="text-[2rem]">{t.gainsTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.gainsIntro}</p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--tq-bord)]">
                {t.gainsEntetes.map((e) => (
                  <th key={e} className="tq-etiquette py-3 pr-4">
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gains.map((l) => (
                <tr key={l.palier} className="border-b border-[var(--tq-bord)]">
                  <td className="py-4 pr-4 font-semibold">{l.palier}</td>
                  <td className="tq-doux py-4 pr-4">{l.prix}</td>
                  <td className="py-4 font-semibold text-[var(--tq-bleu)]">
                    {l.gain} <span className="tq-doux text-sm font-normal">{l.rythme}</span>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-4 pr-4 font-semibold">{t.gainsAtelierLabel}</td>
                <td className="tq-doux py-4 pr-4">{atelier.prix}</td>
                <td className="py-4 font-semibold text-[var(--tq-bleu)]">
                  {atelier.gain}{" "}
                  <span className="tq-doux text-sm font-normal">{t.gainsAtelierRythme}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="tq-doux tq-lire mt-6 text-[0.95rem] leading-relaxed">
          {t.gainsNote(gains[0].gain)}
        </p>
      </section>

      {/* LES REGLES. */}
      <section className="mt-24 bg-[var(--tq-panneau)] py-16">
        <div className="tq-large">
          <h2 className="text-[2rem]">{t.reglesTitre}</h2>
          <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.reglesIntro}</p>
          <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {regles.map((r) => (
              <div key={r.titre}>
                <h3 className="text-[1.05rem]">{r.titre}</h3>
                <p className="tq-doux mt-2 leading-relaxed">{r.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CE QUI A CHANGE. La question que tous les affilies en place
          vont se poser en arrivant ici. */}
      <section className="tq-large mt-28">
        <h2 className="text-[2rem]">{t.sioTitre}</h2>
        <p className="tq-doux mt-4 tq-lire leading-relaxed">{t.sioP1}</p>
        <p className="tq-doux mt-4 tq-lire leading-relaxed">
          {t.sioP2.avant}
          <code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5">{t.sioP2.fort}</code>
          {t.sioP2.apres}
        </p>
        <p className="tq-doux mt-4 tq-lire leading-relaxed">{t.sioP3}</p>
      </section>

      <section className="tq-large py-24">
        {/* PAS D'APLAT SOUS DU TEXTE (Bene, 31 aout 2026 : "supprime
            l'arriere plan bleu sous le texte [...] j'en veux pas, nulle
            part"). Ce bloc etait un panneau marine a texte blanc. Le
            gabarit retenu est celui d'`EncartCta`, valide le 30 aout :
            du blanc, un filet HORIZONTAL a la couleur de marque, le
            texte a l'encre du site. Un filet vertical est exclu : une
            decoration a gauche deplace ce qu'elle decore. */}
        <div className="rounded-3xl border border-[var(--tq-bord)] bg-white px-8 py-12 sm:px-14 sm:py-14">
          <span aria-hidden="true" className="block h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />
          <h2 className="mt-6 max-w-[22ch] text-[1.9rem] sm:text-[2.4rem]">
            {t.ctaTitreAvant}
            <span className="tq-surb">{t.ctaTitreSurb}</span>
          </h2>
          <p className="tq-doux mt-5 max-w-[54ch] leading-relaxed">{t.ctaTexte}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={AFFILIATE_DASHBOARD_URL}
              className="tq-bouton tq-bouton-plein"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.ctaCreer}
            </a>
            <a
              href={lien("/conditions-generales-affiliation")}
              className="tq-bouton tq-bouton-fantome"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.ctaConditions}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
