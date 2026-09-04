// app/(site)/apercu-landing-8f2c9d41/page.tsx
//
// LA LANDING EN VRAIE PAGE NEXT, POUR RELECTURE.
//
// Béné, 4 septembre 2026 : "propose moi une landing (pas besoin d'un
// secret dessus, juste met un slug introuvable) pour que je voie à quoi
// elle pourrait ressembler en vrai next avec la traduction".
//
// -- CE QUE CETTE PAGE DÉMONTRE ---------------------------------------
//
//   1. elle vit dans le groupe `(site)`, donc elle porte le MÊME
//      en-tête et le MÊME pied de page que /blog et /integrations.
//      L'accueil actuel, lui, est une capture Systeme.io de 1,4 Mo qui
//      ne partage rien avec le reste du domaine ;
//   2. elle se traduit. `?lang=en` change toute la page, exactement
//      comme les pages légales. Le texte vit dans `lib/site/landing.ts`,
//      pas dans ce fichier ;
//   3. son HTML est rendu par le SERVEUR, donc lisible par un robot qui
//      n'exécute pas de JavaScript.
//
// -- ELLE EST EN `noindex`, ET CE N'EST PAS QU'UNE PRÉCAUTION ---------
//
// Le slug introuvable suffit à ce que personne ne tombe dessus. Le
// `noindex`, lui, répond à autre chose : deux pages qui prétendent être
// l'accueil de Tiquiz se feraient concurrence sur la même requête, et
// c'est la règle déjà écrite pour les données structurées de la page de
// vente. Elle n'est donc ni dans le sitemap, ni dans `llms.txt`, ni
// dans le pied de page.
//
// -- LES LIENS MÈNENT À DES PAGES QUI EXISTENT ------------------------
//
// `/embed/preview` est le générateur d'aujourd'hui, `/signup`
// l'inscription gratuite. Poser un lien vers `/generateur-de-quiz`
// avant de l'avoir écrit, ce serait un 404 sur la page qui doit inspirer
// confiance (drame du centre d'aide, 24 août).

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { SUPPORTED_LOCALES } from "@/i18n/config";
import { HOTE_VENTE } from "@/lib/publicHost";
import { avantagesPartages, colonnesDeTarif, contenuLanding } from "@/lib/site/landing";

const CHEMIN = "/apercu-landing-8f2c9d41";
const LIEN_GENERATEUR = "/embed/preview";
const LIEN_INSCRIPTION = "/signup";

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>): Promise<string> {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) return brut;
  return await getLocale();
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuLanding(await resoudreLangue(searchParams));
  return {
    title: t.metaTitre,
    description: t.metaDescription,
    // Une page de relecture ne se met pas en concurrence avec l'accueil.
    robots: { index: false, follow: false },
    alternates: { canonical: `${HOTE_VENTE}${CHEMIN}` },
  };
}

export default async function ApercuLandingPage({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuLanding(langue);
  const colonnes = colonnesDeTarif(t);
  const partages = avantagesPartages();

  // Le titre porte son mot clé en couleur. On DÉCOUPE au lieu de
  // réécrire le titre en deux morceaux : le fragment doit rester une
  // partie de la phrase, sinon la traduction suivante le perdra.
  const [avant, apres] = t.titre.split(t.motCle);

  return (
    <main lang={t.langue}>
      {/* ── L'ACCROCHE ─────────────────────────────────────────── */}
      <section className="tq-large pt-16 pb-14 sm:pt-24 sm:pb-20">
        <p className="tq-etiquette">{t.etiquette}</p>
        <h1 className="mt-4 max-w-4xl text-4xl sm:text-6xl">
          {avant}
          <span className="tq-surb">{t.motCle}</span>
          {apres}
        </h1>
        <p className="tq-lire tq-doux mt-6 text-lg leading-relaxed">{t.accroche}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={LIEN_GENERATEUR} className="tq-bouton">
            {t.ctaPrincipal}
          </Link>
          <Link href={LIEN_INSCRIPTION} className="tq-bouton tq-bouton-fantome">
            {t.ctaSecondaire}
          </Link>
        </div>
        <p className="tq-doux mt-4 text-sm">{t.sousCta}</p>
      </section>

      {/* ── LE PROBLÈME, ET LE CHIFFRE ─────────────────────────── */}
      <section className="border-y border-[var(--tq-bord)] bg-white py-16 sm:py-20">
        <div className="tq-large grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            <h2 className="text-3xl sm:text-4xl">{t.problemeTitre}</h2>
            {t.problemeCorps.map((p) => (
              <p key={p} className="tq-lire tq-doux mt-5 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
          {/* LE CHIFFRE EST EN COULEUR, PAS DANS UN RECTANGLE BLEU.
              Règle du 31 août : aucun aplat de couleur sous du texte,
              nulle part. Le bleu ne sert qu'au bouton, à la pastille,
              au filet horizontal et au chiffre. */}
          <div className="border-t-2 border-[var(--tq-bleu)] pt-6">
            <p
              className="text-6xl font-black leading-none sm:text-7xl"
              style={{ color: "var(--tq-bleu)" }}
            >
              {t.chiffre}
            </p>
            <p className="mt-4 font-semibold leading-snug">{t.chiffreLegende}</p>
            <p className="tq-doux mt-3 text-sm leading-relaxed">{t.chiffreSource}</p>
          </div>
        </div>
      </section>

      {/* ── LE MÉCANISME ───────────────────────────────────────── */}
      <section className="tq-large py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl">{t.mecaniqueTitre}</h2>
        <ol className="mt-10 grid gap-10 sm:grid-cols-2">
          {t.etapes.map((e, i) => (
            <li key={e.titre} className="flex gap-4">
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "var(--tq-bleu)" }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg">{e.titre}</h3>
                <p className="tq-doux mt-2 leading-relaxed">{e.corps}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── LE DIFFÉRENCIATEUR ─────────────────────────────────── */}
      <section className="border-y border-[var(--tq-bord)] bg-white py-16 sm:py-20">
        <div className="tq-large">
          <h2 className="tq-lire text-3xl sm:text-4xl">{t.sioTitre}</h2>
          {t.sioCorps.map((p) => (
            <p key={p} className="tq-lire tq-doux mt-5 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* ── OÙ VIT LE QUIZ ─────────────────────────────────────── */}
      <section className="tq-large py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl">{t.ouTitre}</h2>
        <p className="tq-lire tq-doux mt-5 leading-relaxed">{t.ouCorps}</p>
        <ul className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {t.ouListe.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--tq-bleu)" }}
              />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── LES TARIFS ─────────────────────────────────────────── */}
      <section className="border-y border-[var(--tq-bord)] bg-white py-16 sm:py-20">
        <div className="tq-large">
          <h2 className="text-3xl sm:text-4xl">{t.prixTitre}</h2>
          <p className="tq-lire tq-doux mt-4 leading-relaxed">{t.prixNote}</p>
          {/* TROIS COLONNES, PAS CINQ. Le mensuel et l'annuel d'un même
              palier ne sont pas deux offres : c'est la même chose, payée
              autrement. Cinq cartes obligeaient à lire quatre fois les
              mêmes lignes pour trouver ce qui change. */}
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {colonnes.map((c) => (
              <div
                key={c.nom}
                className="flex flex-col rounded-2xl border border-[var(--tq-bord)] p-6"
                style={{ background: "var(--tq-creme)" }}
              >
                <p className="text-sm font-semibold">{c.nom}</p>
                <p className="mt-3 text-3xl font-black leading-none">{c.prix}</p>
                <p className="tq-doux mt-2 text-sm">{c.cadence}</p>
                {c.prixAn ? <p className="tq-doux text-sm">{c.prixAn}</p> : null}
                <ul className="mt-5 space-y-2 border-t border-[var(--tq-bord)] pt-5 text-sm">
                  {c.lignes.map((ligne) => (
                    <li key={ligne} className="flex gap-2 leading-relaxed">
                      <span aria-hidden className="tq-puce" />
                      <span>{ligne}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CE QUE TOUT LE MONDE A, DIT UNE FOIS. Recopier ces sept
              lignes dans les trois colonnes noierait ce qui les
              distingue, et c'est justement ce qu'on vient chercher ici. */}
          <div className="mt-10 border-t border-[var(--tq-bord)] pt-8">
            <h3 className="text-lg font-semibold">{t.partageTitre}</h3>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {partages.map((ligne) => (
                <li key={ligne} className="flex gap-2 leading-relaxed">
                  <span aria-hidden className="tq-puce" />
                  <span>{ligne}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── LA FAQ, EN `<details>` NATIF ───────────────────────── */}
      {/* Zéro JavaScript : c'est un script qui a figé la FAQ de la page
          de vente le 2 septembre. Un bloc qui n'a besoin de rien ne peut
          pas se casser quand on retire quelque chose, il s'ouvre au
          clavier, et Ctrl+F ouvre le bon panneau. */}
      <section className="tq-large py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl">{t.faqTitre}</h2>
        <div className="tq-lire mt-8">
          {t.faq.map((f) => (
            <details key={f.q} className="border-b border-[var(--tq-bord)] py-5">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="tq-doux mt-3 leading-relaxed">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── LA SORTIE ──────────────────────────────────────────── */}
      <section className="border-t border-[var(--tq-bord)] bg-white py-16 sm:py-20">
        <div className="tq-large">
          <h2 className="tq-lire text-3xl sm:text-4xl">{t.finTitre}</h2>
          <p className="tq-lire tq-doux mt-5 leading-relaxed">{t.finCorps}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={LIEN_GENERATEUR} className="tq-bouton">
              {t.ctaPrincipal}
            </Link>
            <Link href={LIEN_INSCRIPTION} className="tq-bouton tq-bouton-fantome">
              {t.ctaSecondaire}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
