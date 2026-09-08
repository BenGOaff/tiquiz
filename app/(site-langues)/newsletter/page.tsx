// app/(site-langues)/newsletter/page.tsx
//
// LA PAGE D'INSCRIPTION À LA PÉPITE DU LUNDI.
//
// Remplace `tipote.fr/newsletter`. Le contenu est CELUI DE BÉNÉ, repris
// de sa page Systeme.io (31 août 2026) : le rendez-vous du lundi, ce
// qu'il y a dedans, les thèmes, ce qu'il n'y a PAS dedans, l'invitation
// à répondre, et sa note de franchise.
//
// Cette page ne porte donc plus AUCUNE phrase : elle rend
// `contenuNewsletter(langue)`. Écrire le français ici et l'anglais
// ailleurs, c'est deux versions du même texte qui divergent au premier
// correctif, et c'est le défaut le plus cher de ce dépôt.
//
// -- POURQUOI ELLE VIT DANS `(site-langues)` --------------------------
//
// Béné, 8 septembre 2026 : "oui traduis la newsletter." Le chrome et
// les liens doivent donc connaître la langue de l'ADRESSE, qui se lit
// dans l'en-tête posé par le middleware. Un groupe de routes n'ajoute
// AUCUN segment d'URL : `/newsletter` reste `/newsletter`, sa canonique
// ne bouge pas d'un caractère (sa contrainte du 8 septembre, "je ne
// veux pas changer les URL actuelles").
//
// -- CE QUI A ÉTÉ ADAPTÉ DE SA PAGE, ET POURQUOI -----------------------
//
// Sa page d'origine posait "Ce qu'il n'y a pas dedans" sur un APLAT
// MARINE avec du texte blanc, et l'entête de la maquette d'email de
// même. **Sa propre règle du 31 août l'interdit** : "supprime
// l'arrière plan bleu sous le texte, j'en veux pas, NULLE PART. Notre
// branding c'est celui des pages de vente." `branding-site.test.mts`
// le refuse d'ailleurs sur les écrans du site public.
//
// Le rythme de sa page est donc conservé (le bloc existe, il se
// distingue, il se lit d'un coup), mais par un CADRE et un filet
// HORIZONTAL, pas par un fond. Un filet vertical déplacerait ce qu'il
// décore (règle du 3 août, mesurée à 20 px).
//
// -- LE LIEN LÉGAL EST LE NÔTRE, ET IL SUIT LA LANGUE ------------------
//
// Sa page renvoyait à `/politique-de-confidentialite` de Systeme.io.
// Cette adresse existe chez nous : `ADRESSES_LEGALES_FR` la redirige
// vers `/privacy`, la page qui porte vraiment le document en 5 langues.
// C'est donc l'adresse FRANÇAISE qu'on sert en français (c'est celle
// que Béné communique), et `/privacy` en anglais : envoyer un lecteur
// anglophone sur une adresse française lui ferait croire qu'il va lire
// du français.
//
// Elle s'ouvre dans un nouvel onglet (règle du 24 août) : quelqu'un qui
// a déjà tapé son prénom et son adresse ne doit pas les perdre pour
// aller lire une politique.

import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { adresseExpediteur } from "@/lib/email/tiquizShell";
import { HOTE_VENTE } from "@/lib/publicHost";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { alternatesDeLangue, languePubliqueDuTexte } from "@/lib/site/langues";
import { langueCanonique } from "@/lib/site/langueRequete";
import {
  CHEMIN_NEWSLETTER,
  contenuNewsletter,
  type TexteNewsletter,
} from "@/lib/site/newsletter";
import FormulaireNewsletter from "@/components/site/FormulaireNewsletter";

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

/** L'adresse de la politique, dans la langue du TEXTE affiché. */
function lienConfidentialite(t: TexteNewsletter): string {
  return t.langue === "fr" ? "/politique-de-confidentialite" : "/privacy";
}

// LA CANONIQUE VIENT DE L'ADRESSE, LE TEXTE VIENT DE LA LANGUE RÉSOLUE.
// Deux questions différentes : quelqu'un dont le cookie dit "en" et qui
// ouvre `/newsletter` lit l'anglais, et la page reste canonique sur
// `/newsletter`. Sans ça, deux visiteurs annonceraient deux canoniques
// pour la même URL, et c'est celle du robot qui compte.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuNewsletter(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_NEWSLETTER, canonique);
  return {
    title: t.metaTitre,
    description: t.metaDescription,
    ...(alternates ? { alternates } : {}),
    openGraph: {
      type: "website",
      title: t.metaTitre,
      description: t.metaDescription,
      url: alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_NEWSLETTER}`,
      siteName: "Tiquiz",
      locale: canonique === "fr" ? "fr_FR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t.metaTitre,
      description: t.metaDescription,
    },
  };
}

export default async function PageNewsletter({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuNewsletter(langue);
  const contact = adresseExpediteur();
  const politique = lienConfidentialite(t);

  return (
    <main lang={langue} className="tq-large py-16 sm:py-24">
      {/* ── LE RENDEZ-VOUS DU LUNDI ── */}
      <section className="grid gap-12 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
        <div>
          <p className="tq-etiquette">{t.etiquette}</p>
          <h1 className="mt-3 text-[2.4rem] leading-[1.07] sm:text-[3.2rem]">
            {t.h1Avant} <span className="tq-surb">{t.h1Surligne}</span>.
          </h1>
          <p className="tq-doux mt-6 text-[1.15rem] leading-relaxed">
            {t.introAvant}
            <strong>{t.introFort}</strong>
            {t.introApres}
          </p>

          <ul className="mt-7 space-y-3">
            {t.promesses.map((p) => (
              <li key={p.fort} className="tq-doux flex gap-3 leading-relaxed">
                <span
                  aria-hidden
                  className="mt-[7px] h-[7px] w-[7px] flex-none rounded-full bg-[var(--tq-bleu)]"
                />
                <span>
                  <strong>{p.fort}</strong>
                  {p.suite}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* La maquette d'email. Décorative : cachée aux lecteurs d'écran,
            qui liraient sinon un faux message par dessus le vrai texte. */}
        <div
          aria-hidden
          className="overflow-hidden rounded-2xl border border-[var(--tq-bord)] bg-white shadow-[0_18px_44px_rgba(22,24,46,.13)]"
        >
          <div className="flex items-center gap-2 border-b border-[var(--tq-bord)] bg-[var(--tq-panneau)] px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-[var(--tq-bord)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--tq-bord)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--tq-bord)]" />
            <span className="ml-auto text-[11px] font-bold uppercase tracking-[.1em] text-[var(--tq-encre-douce)]">
              {t.maquette.jour}
            </span>
          </div>
          <div className="px-5 pb-6 pt-5">
            <div className="mb-4 flex items-center gap-3 border-b border-[var(--tq-bord)] pb-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--tq-bleu)] text-sm font-extrabold text-white">
                B
              </span>
              <span className="min-w-0 text-sm font-bold leading-tight">
                Béné
                <span className="block break-words text-[12.5px] font-normal text-[var(--tq-encre-douce)]">
                  {contact}
                </span>
              </span>
            </div>
            <p className="text-[1.15rem] font-extrabold leading-tight">{t.maquette.objet}</p>
            <p className="tq-doux mt-2 text-sm leading-relaxed">{t.maquette.corps}</p>
            <div className="mt-3 rounded-xl border border-[var(--tq-bord)] p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[.06em] text-[var(--tq-bleu-fonce)]">
                {t.maquette.etiquetteAction}
              </p>
              <p className="tq-doux mt-1 text-[13.5px] leading-relaxed">{t.maquette.action}</p>
            </div>
            <p className="mt-3 text-[13.5px] text-[var(--tq-encre-douce)]">
              {t.maquette.signature}
            </p>
          </div>
        </div>
      </section>

      {/* ── LE FORMULAIRE ── */}
      <section className="mt-16">
        <FormulaireNewsletter
          contact={contact}
          langue={langue}
          lienConfidentialite={politique}
        />
      </section>

      {/* ── CE QU'IL Y A DEDANS ── */}
      <section className="mt-20">
        <div className="h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />
        <h2 className="mt-5 text-[1.6rem] sm:text-[1.9rem]">{t.dedansTitre}</h2>
        <p className="tq-doux mt-3 max-w-[62ch] text-[1.05rem] leading-relaxed">{t.dedansIntro}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {t.dedans.map((c) => (
            <div key={c.tag} className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <p className="text-[11.5px] font-extrabold uppercase tracking-[.13em] text-[var(--tq-bleu-fonce)]">
                {c.tag}
              </p>
              <h3 className="mt-3 text-[1.1rem] font-extrabold leading-tight">{c.titre}</h3>
              <p className="tq-doux mt-2 text-[15.5px] leading-relaxed">{c.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LES THÈMES ── */}
      <section className="mt-20">
        <div className="h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />
        <h2 className="mt-5 text-[1.6rem] sm:text-[1.9rem]">{t.themesTitre}</h2>
        <p className="tq-doux mt-3 max-w-[62ch] text-[1.05rem] leading-relaxed">{t.themesIntro}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {t.themes.map((theme) => (
            <li
              key={theme}
              className="rounded-full border border-[var(--tq-bord)] bg-white px-4 py-2 text-[14.5px] font-bold"
            >
              {theme}
            </li>
          ))}
        </ul>
      </section>

      {/* ── CE QU'IL N'Y A PAS DEDANS ──
          Sa page d'origine posait ce bloc sur un aplat marine. Sa règle
          du 31 août l'interdit : cadre et filet, jamais de fond. */}
      <section className="mt-20">
        <div className="rounded-3xl border border-[var(--tq-bord)] bg-white p-8 sm:p-10">
          <div className="h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />
          <h2 className="mt-5 text-[1.6rem] sm:text-[1.9rem]">{t.pasDedansTitre}</h2>
          <p className="tq-doux mt-3 leading-relaxed">{t.pasDedansIntro}</p>
          <ul className="mt-6 space-y-3">
            {t.pasDedans.map((p) => (
              <li key={p.fort} className="tq-doux flex gap-3 leading-relaxed">
                <span
                  aria-hidden
                  className="mt-[3px] grid h-5 w-5 flex-none place-items-center rounded-full border border-[var(--tq-bord)] text-[11px] font-extrabold text-[var(--tq-bleu-fonce)]"
                >
                  ✕
                </span>
                <span>
                  <strong>{p.fort}</strong>
                  {p.suite}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── RÉPONDS-MOI ── */}
      <section className="mt-16">
        <div className="rounded-3xl border border-[var(--tq-bord)] bg-[var(--tq-panneau)] p-8 sm:p-10">
          <h2 className="text-[1.5rem] sm:text-[1.75rem]">{t.reponds.titre}</h2>
          {t.reponds.p.map((p) => (
            <p key={p} className="tq-doux mt-3 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* ── FRANCHISE ── */}
      <section className="mt-16">
        <div className="rounded-2xl border border-[var(--tq-bord)] p-7">
          <h3 className="text-[1.1rem] font-extrabold">{t.franchise.titre}</h3>
          {t.franchise.p.map((p) => (
            <p key={p} className="tq-doux mt-3 leading-relaxed">
              {p}
            </p>
          ))}
          <p className="mt-5 text-sm font-semibold">Béné</p>
        </div>

        <p className="tq-doux mt-6 text-sm leading-relaxed">
          {t.noteAvantAdresse}
          <strong>{contact}</strong>
          {t.noteApresAdresse}
          <a
            href={politique}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            {t.noteLien}
          </a>
          {t.noteFin}
        </p>
      </section>
    </main>
  );
}
