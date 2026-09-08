// app/(site-langues)/a-propos/page.tsx
//
// LA PAGE AUTEUR. Remplace `tipote.fr/benedicte-lagardette`.
//
// -- D'OÙ VIENT CE TEXTE -----------------------------------------------
//
// De sa page, lue le 30 août 2026, et il vit maintenant dans
// `lib/site/aPropos.ts` : ses phrases y sont gardées telles quelles
// partout où elles sont fortes. Les reformuler "proprement" aurait
// produit exactement le texte lisse qu'elle repère en trois lignes.
//
// Cette page ne porte donc plus AUCUNE phrase : elle rend
// `contenuAPropos(langue)`. Écrire le français ici et l'anglais
// ailleurs, c'est deux versions du même récit qui divergent au premier
// correctif, et c'est le défaut le plus cher de ce dépôt.
//
// -- POURQUOI ELLE VIT DANS `(site-langues)` --------------------------
//
// Béné, 8 septembre 2026 : "toutes les pages et mêmes les articles
// doivent être multilangues". Le chrome et les liens de la page doivent
// donc connaître la langue de l'ADRESSE, qui se lit dans l'en-tête posé
// par le middleware. Un groupe de routes n'ajoute AUCUN segment d'URL :
// `/a-propos` reste `/a-propos`, sa canonique ne bouge pas.
//
// -- LES DONNÉES STRUCTURÉES ------------------------------------------
//
// Le `sameAs` vient de son propre schema. C'est lui qui permet à un
// moteur de relier "Bénédicte Lagardette" à ses comptes, donc de la
// reconnaître comme la même personne partout : c'est ce qui fait
// remonter une page auteur sur une requête de nom.
//
// `jobTitle`, `knowsAbout` et la description de l'organisation SUIVENT
// LA LANGUE : les laisser en français sur une page anglaise décrirait
// une personne dans une langue que la page ne sert pas.

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { HOTE_VENTE } from "@/lib/publicHost";
import { COMPANY } from "@/lib/legal/company";
import { ATELIER_SALES_URL } from "@/lib/affiliateUrls";
import { AVIS, PAGE_AUTEUR_BLOG, RESEAUX, nomPourLangue } from "@/lib/site/reseaux";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { alternatesDeLangue, languePubliqueDuTexte } from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";
import { CHEMIN_A_PROPOS, contenuAPropos, type TexteAPropos } from "@/lib/site/aPropos";

const PORTRAIT = `${HOTE_VENTE}/bene.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

// LA CANONIQUE VIENT DE L'ADRESSE, LE TEXTE VIENT DE LA LANGUE RÉSOLUE.
// Deux questions différentes : quelqu'un dont le cookie dit "en" et qui
// ouvre `/a-propos` lit l'anglais, et la page reste canonique sur
// `/a-propos`. Sans ça, deux visiteurs annonceraient deux canoniques
// pour la même URL, et c'est celle du robot qui compte.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuAPropos(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_A_PROPOS, canonique);
  return {
    title: t.metaTitre,
    description: t.metaDescription,
    ...(alternates ? { alternates } : {}),
    openGraph: {
      type: "profile",
      title: t.metaTitre,
      description: t.metaDescription,
      url: alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_A_PROPOS}`,
      siteName: "Tiquiz",
      locale: canonique === "fr" ? "fr_FR" : "en_US",
      images: [{ url: PORTRAIT }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.metaTitre,
      description: t.metaDescription,
      images: [PORTRAIT],
    },
  };
}

function donneesStructurees(t: TexteAPropos) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${HOTE_VENTE}${CHEMIN_A_PROPOS}#person`,
        name: COMPANY.director,
        alternateName: ["Béné", "Bénédicte Bottet"],
        jobTitle: t.jsonLd.jobTitle,
        description: t.metaDescription,
        url: `${HOTE_VENTE}${CHEMIN_A_PROPOS}`,
        image: PORTRAIT,
        knowsAbout: t.jsonLd.knowsAbout,
        // Sa page auteur historique fait partie du `sameAs` : c'est ce
        // qui dit au moteur que les deux pages parlent de la MÊME
        // personne, au lieu de les mettre en concurrence.
        sameAs: [
          PAGE_AUTEUR_BLOG,
          ...RESEAUX.map((r) => r.url),
          ...AVIS.map((a) => a.url),
        ],
        worksFor: { "@id": `${HOTE_VENTE}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${HOTE_VENTE}/#organization`,
        name: "Tiquiz",
        url: HOTE_VENTE,
        description: t.jsonLd.orgDescription,
        founder: { "@id": `${HOTE_VENTE}${CHEMIN_A_PROPOS}#person` },
        legalName: COMPANY.name,
        vatID: COMPANY.vat,
        address: { "@type": "PostalAddress", streetAddress: COMPANY.address, addressCountry: "FR" },
      },
    ],
  };
}

function Externe({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="tq-pastille">
      {children}
    </a>
  );
}

export default async function PageAPropos({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuAPropos(langue);

  // LES LIENS SUIVENT L'ADRESSE, PAS LE TEXTE. Et ils passent par
  // `hrefPourLangue`, jamais par un préfixe posé à la main : `/blog` a
  // sa version anglaise, `/newsletter` et `/support` non, et `/` sert la
  // page de vente capturée, qui est française. Un préfixe à l'aveugle
  // fabriquerait trois 404 au bout des boutons de fin de page.
  const espace = await langueCanonique();
  const lien = (chemin: string) => hrefPourLangue(chemin, espace);

  return (
    <main lang={langue}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees(t)) }}
      />

      <section className="tq-large pt-16 sm:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="tq-etiquette">{t.etiquette}</p>
            <h1 className="mt-3 text-[2.4rem] sm:text-[3.3rem]">
              {t.h1Avant} <span className="tq-surb">{t.h1Surligne}</span>
            </h1>
            {t.intro.map((p) => (
              <p key={p} className="tq-doux mt-6 max-w-[58ch] text-[1.1rem] leading-relaxed">
                {p}
              </p>
            ))}
          </div>
          <div className="tq-carte-media max-w-[320px] justify-self-start lg:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bene.webp"
              alt={t.altPortrait}
              width={560}
              height={560}
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <section className="tq-large py-20">
        <h2 className="text-[1.8rem]">{t.origines.titre}</h2>
        <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
          {t.origines.p.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section className="bg-[var(--tq-panneau)] py-16">
        <div className="tq-large">
          <h2 className="text-[1.8rem]">{t.arret.titre}</h2>
          <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
            {t.arret.p.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="tq-large py-20">
        <h2 className="text-[1.8rem]">{t.iziquiz.titre}</h2>
        <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
          {t.iziquiz.p.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <blockquote className="mt-10 max-w-[46rem] border-l-[3px] border-[var(--tq-bleu)] pl-5">
          <p className="text-[1.15rem] leading-relaxed">{t.iziquiz.citation}</p>
          <footer className="tq-doux mt-2 text-sm">{t.iziquiz.citationAuteur}</footer>
        </blockquote>
      </section>

      <section className="bg-[var(--tq-panneau)] py-16">
        <div className="tq-large">
          <h2 className="text-[1.8rem]">{t.tiquiz.titre}</h2>
          <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
            {t.tiquiz.p.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="font-semibold text-[var(--tq-encre)]">{t.tiquiz.emphase}</p>
          </div>

          <div className="mt-10 grid max-w-[46rem] gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <h3 className="text-[1.1rem]">{t.produits.tiquiz.titre}</h3>
              <p className="tq-doux mt-2 leading-relaxed">{t.produits.tiquiz.corps}</p>
              <Link href={lien("/")} className="tq-bouton mt-5">
                {t.produits.tiquiz.bouton}
              </Link>
            </div>
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <h3 className="text-[1.1rem]">{t.produits.atelier.titre}</h3>
              <p className="tq-doux mt-2 leading-relaxed">{t.produits.atelier.corps}</p>
              <a
                href={ATELIER_SALES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="tq-bouton tq-bouton-fantome mt-5"
              >
                {t.produits.atelier.bouton}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="tq-large py-20">
        <h2 className="text-[1.8rem]">{t.valeurs.titre}</h2>
        <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
          {t.valeurs.p.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="font-semibold text-[var(--tq-encre)]">{t.valeurs.emphase}</p>
        </div>

        <h2 className="mt-14 text-[1.8rem]">{t.doutes.titre}</h2>
        <p className="tq-doux mt-4 max-w-[46rem] leading-relaxed">{t.doutes.corps}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {AVIS.map((a) => (
            <Externe key={a.url} href={a.url}>
              {nomPourLangue(a, langue)}
            </Externe>
          ))}
        </div>

        <h2 className="mt-14 text-[1.8rem]">{t.suivre}</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {RESEAUX.map((r) => (
            <Externe key={r.url} href={r.url}>
              {nomPourLangue(r, langue)}
            </Externe>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href={lien("/newsletter")} className="tq-bouton">
            {t.boutons.newsletter}
          </Link>
          <Link href={lien("/blog")} className="tq-bouton tq-bouton-fantome">
            {t.boutons.blog}
          </Link>
          <Link href={lien("/support")} className="tq-bouton tq-bouton-fantome">
            {t.boutons.ecrire}
          </Link>
        </div>

        <p className="mt-12 text-sm font-semibold">Béné</p>
        <p className="tq-doux mt-6 max-w-[46rem] text-sm leading-relaxed">
          {t.mentions.avant}
          {COMPANY.name} ({COMPANY.form}){t.mentions.milieu}
          {/* UN LIEN LÉGAL NE FAIT JAMAIS QUITTER LA PAGE (règle du
              24 août) : `<a target="_blank">`, jamais `<Link>`. Et son
              adresse ne se préfixe pas : le document existe en 5 langues
              et se sert sur le même chemin. */}
          <a
            href="/mentions-legales"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {t.mentions.lien}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
