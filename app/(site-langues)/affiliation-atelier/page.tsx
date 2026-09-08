// app/(site-langues)/affiliation-atelier/page.tsx
//
// LE PROGRAMME D'AFFILIATION DE L'ATELIER DU QUIZ.
//
// Remplace `tipote.fr/atelier-du-quiz/affiliation`.
//
// -- UN SEUL PROGRAMME, UN SEUL CODE, DEUX LIENS ----------------------
//
// Le premier jet de cette page disait que l'Atelier tenait son propre
// registre d'affilies et ne lisait que `?sa=`, donc qu'un lien Tiquiz
// ne payait pas sur l'Atelier. **C'etait faux**, et Bene a demande de
// le verifier plutot que de le recopier d'une note d'aout.
//
// Verifie le 30 aout 2026, dans le depot de l'Atelier :
//
//   1. `atelierduquiz.fr` est un hote de vente de son app
//      (`lib/sales/salesHosts.ts`), donc son middleware capte le `?ref=`
//      exactement comme celui de Tiquiz ;
//   2. le bon de commande le transporte (`affiliateCode`) jusqu'au
//      webhook de paiement ;
//   3. `commissionnerVente` interroge le REGISTRE CENTRAL de Tipote en
//      PREMIER, avec `affiliate_code`, `source_app: "atelier"` (c'est ce
//      champ qui fixe les 70 %) et `base: "ht"` ;
//   4. le registre historique de l'Atelier n'est plus qu'un repli, pour
//      les eleves affilies la-bas et pas encore chez Tipote ;
//   5. si Tipote est injoignable, RIEN n'est ecrit nulle part et ca
//      crie : deux registres qui paient la meme vente, ce serait deux
//      fois le meme virement.
//
// Bene, 30 aout : "affiliate fait foi, et atelier reprend les chiffres
// d'affiliate. On ne doit pas mettre des donnees differentes."
//
// Consequence pour cette page : les chiffres viennent des MEMES modules
// que la page Tiquiz (`lib/site/programmeAffiliation.ts`), et les regles
// sont LA MEME liste. Une page qui reecrirait ses propres seuils
// finirait par annoncer un delai ou un minimum different. Le texte suit
// la meme regle : il vit dans `lib/site/pageAffiliation.ts`, avec celui
// de sa page soeur.

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { HOTE_VENTE } from "@/lib/publicHost";
import { AFFILIATE_DASHBOARD_URL } from "@/lib/affiliateUrls";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { reglesPourLangue } from "@/lib/site/programmeAffiliation";
import { POURCENT_ATELIER, contenuAffiliationAtelier } from "@/lib/site/pageAffiliation";
import { alternatesDeLangue, languePubliqueDuTexte } from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

const CHEMIN = "/affiliation-atelier";

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuAffiliationAtelier(await resoudreLangue(searchParams));
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

export default async function PageAffiliationAtelier({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuAffiliationAtelier(langue);
  const regles = reglesPourLangue(langue);

  const espace = await langueCanonique();
  const lien = (chemin: string) => hrefPourLangue(chemin, espace);

  return (
    <main>
      <section className="tq-large pt-16 sm:pt-24">
        <p className="tq-etiquette">{t.etiquette}</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.6rem] sm:text-[3.6rem]">
          <span className="tq-surb">{POURCENT_ATELIER} %</span>
          {t.h1Apres}
        </h1>
        <p className="tq-doux mt-6 max-w-[64ch] text-[1.1rem] leading-relaxed">{t.accroche}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href={AFFILIATE_DASHBOARD_URL}
            className="tq-bouton"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.ctaLien}
          </a>
          <Link href={lien("/affiliation")} className="tq-bouton tq-bouton-fantome">
            {t.ctaTiquiz}
          </Link>
        </div>
      </section>

      {/* CE QU'ON VEND VRAIMENT. Un affilie qui ne sait pas ce qu'il y a
          dedans en parle mal, et il en parle une fois. */}
      <section className="tq-large mt-24">
        <h2 className="text-[2rem]">{t.recoitTitre}</h2>
        <p className="tq-doux mt-3 max-w-[62ch] leading-relaxed">{t.recoitIntro}</p>
        <ol className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {t.etapes.map((etape, i) => (
            <li key={etape} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--tq-bleu)] text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="leading-relaxed">{etape}</span>
            </li>
          ))}
        </ol>
        <p className="tq-doux mt-8 max-w-[62ch] leading-relaxed">{t.recoitNote}</p>
      </section>

      {/* LE POINT QU'IL FAUT DIRE, ET IL EST L'INVERSE DE CE QU'ON
          CROYAIT : c'est le MEME programme. */}
      <section className="mt-24 bg-[var(--tq-panneau)] py-20">
        <div className="tq-large">
          <h2 className="text-[2rem]">{t.memeTitre}</h2>
          <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.memeIntro}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <p className="tq-etiquette">{t.labelTiquiz}</p>
              <code className="mt-3 block break-all rounded-lg bg-[var(--tq-panneau)] px-3 py-2.5 text-[0.95rem]">
                tiquiz.fr/?ref=TONCODE
              </code>
              <p className="tq-doux mt-3 text-[0.95rem] leading-relaxed">{t.noteTiquiz}</p>
            </div>
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <p className="tq-etiquette">{t.labelAtelier}</p>
              <code className="mt-3 block break-all rounded-lg bg-[var(--tq-panneau)] px-3 py-2.5 text-[0.95rem]">
                atelierduquiz.fr/?ref=TONCODE
              </code>
              <p className="tq-doux mt-3 text-[0.95rem] leading-relaxed">{t.noteAtelier}</p>
            </div>
          </div>
          <p className="tq-doux tq-lire mt-6 leading-relaxed">{t.memeNote}</p>
          <div className="mt-8">
            <a
              href={AFFILIATE_DASHBOARD_URL}
              className="tq-bouton"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.memeCta}
            </a>
          </div>
        </div>
      </section>

      <section className="tq-large py-24">
        <h2 className="text-[2rem]">{t.payeTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.payeIntro}</p>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {regles.map((r) => (
            <div key={r.titre}>
              <h3 className="text-[1.05rem]">{r.titre}</h3>
              <p className="tq-doux mt-2 leading-relaxed">{r.texte}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={lien("/affiliation")} className="tq-bouton">
            {t.ctaTiquiz}
          </Link>
          <a
            href={lien("/conditions-generales-affiliation")}
            className="tq-bouton tq-bouton-fantome"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.ctaConditions}
          </a>
        </div>
      </section>
    </main>
  );
}
