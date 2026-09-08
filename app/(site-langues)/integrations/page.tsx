// app/(site-langues)/integrations/page.tsx
//
// LE HUB DES INTÉGRATIONS SYSTEME.IO.
//
// Béné, 1er septembre 2026 : "on va créer un hub intégrations pour
// aller capter les intentions de recherches entre les outils
// concurrents et systeme io pour introduire Tiquiz."
//
// LA RÈGLE QUI REND CETTE PAGE SOLIDE : elle résout vraiment le
// problème posé, y compris quand la réponse est "prends Zapier". Une
// page d'intégration qui n'explique pas l'intégration est une page de
// vente déguisée, et ça se voit en dix secondes. Tiquiz arrive à la
// fin, sur le seul cas où c'est vrai.
//
// -- CETTE PAGE NE PORTE PLUS AUCUNE PHRASE ---------------------------
//
// Béné, 8 septembre 2026 : "continue la traduction de tout stp." Tout
// son texte vit dans `lib/site/hubIntegrations.ts`, et le tableau lit
// `outilsPourLangue(langue)`. Écrire le français ici et l'anglais
// ailleurs, c'est deux versions de la même page qui divergent au
// premier correctif, et c'est le défaut le plus cher de ce dépôt.
//
// -- POURQUOI ELLE VIT DANS `(site-langues)` --------------------------
//
// Le chrome et les liens doivent connaître la langue de l'ADRESSE, qui
// se lit dans l'en-tête posé par le middleware. Un groupe de routes
// n'ajoute AUCUN segment d'URL : `/integrations` reste
// `/integrations`, sa canonique ne bouge pas.
//
// -- SES SIX PAGES FILLES SONT TRADUITES AUSSI (8 septembre) ----------
//
// Cette note disait "les six pages détaillées sont en français", et la
// carte de chacune gardait son titre français pour ne pas promettre de
// l'anglais derrière le clic (règle du chrome). C'est fait : leur texte
// vit dans `lib/site/outils/*.ts`, une entrée par langue, donc
// `outilsLangueDesPages` vaut `null` et le bloc ci dessous ne rend
// plus rien. Il RESTE, parce que c'est lui qui reparlera le jour où une
// septième page arrivera sans son anglais.

import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { attributsEpinglePour } from "@/lib/blog/partage";
import { Capture, EnBref, Faq, FilDAriane, Logo, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import {
  ENFANTS_DU_HUB,
  LOGO_ZAPIER,
  OUTILS_PUBLIES,
  faqJsonLd,
  filDArianeJsonLd,
  outilsPourLangue,
} from "@/lib/site/integrations";
import { CHEMIN_HUB, contenuHub, type TexteHub } from "@/lib/site/hubIntegrations";
import {
  alternatesDeLangue,
  languePubliqueDuTexte,
  type LanguePublique,
} from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { langueCanonique } from "@/lib/site/langueRequete";

// LE SCHÉMA SERT LES DEUX LANGUES, ET C'EST VOULU : il ne porte que des
// logos et des flèches. Son TEXTE ALTERNATIF, lui, suit la langue : une
// lectrice aveugle anglophone n'entend pas le français (le reproche du
// client du 7 septembre, transposé à une image).
const SCHEMA_OG = `${HOTE_VENTE}/integrations/schema-connexion-systemeio-og.webp`;

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

// LA CANONIQUE VIENT DE L'ADRESSE, LE TEXTE VIENT DE LA LANGUE RÉSOLUE.
//
// Les deux répondent la même chose sur `/en/integrations`, et PAS sur
// `/integrations` visité avec un cookie anglais. Les confondre ferait
// annoncer deux canoniques pour la même URL, et c'est celle du robot
// qui compte (règle du 8 septembre).
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuHub(await resoudreLangue(searchParams));
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_HUB, canonique);
  const url = alternates?.canonical ?? `${HOTE_VENTE}${CHEMIN_HUB}`;
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
      images: [{ url: SCHEMA_OG, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.titre,
      description: t.description,
      images: [SCHEMA_OG],
    },
  };
}

function donneesStructurees(t: TexteHub, espace: LanguePublique) {
  const chemin = hrefPourLangue(CHEMIN_HUB, espace);
  return {
    "@context": "https://schema.org",
    "@graph": [
      filDArianeJsonLd(HOTE_VENTE, [
        { nom: t.filAccueil, chemin: hrefPourLangue("/", espace) },
        { nom: t.filIntegrations, chemin },
      ]),
      {
        "@type": "ItemList",
        name: t.itemListNom,
        itemListElement: ENFANTS_DU_HUB.map((o, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${o.nom} ${t.outilsEt} Systeme.io`,
          url: `${HOTE_VENTE}${CHEMIN_HUB}/${o.slug}`,
        })),
      },
      faqJsonLd(t.faq),
    ],
  };
}

export default async function HubIntegrations({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuHub(langue);

  // LES LIENS INTERNES PASSENT PAR `hrefPourLangue`, jamais par un
  // `/en/` posé à la main : `/signup` n'a aucune version anglaise, et
  // le préfixe fabriquerait un 404 au bout du dernier bouton.
  //
  // Les six pages filles NE SONT PAS préfixées : elles n'existent qu'en
  // français, et `hrefPourLangue` refuserait de toute façon (il lit la
  // même source que le sitemap). On les écrit donc en clair.
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
          etapes={[{ nom: t.filAccueil, chemin: lien("/") }, { nom: t.filIntegrations }]}
        />
        <p className="tq-etiquette mt-8">{t.etiquette}</p>
        <h1 className="mt-3 max-w-[20ch] text-[2.4rem] sm:text-[3.2rem]">
          {t.h1Avant}
          <span className="tq-surb">{t.h1Surb}</span>
        </h1>

        {/* L'ENCADRÉ PASSE AVANT LA PREMIÈRE IMAGE. C'est le bloc que les
            moteurs et les assistants citent : le faire descendre sous un
            schéma de 1600 px le rend invisible pour eux. */}
        <EnBref langue={langue}>
          {t.enBref.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </EnBref>

        <Capture
          src="/integrations/schema-connexion-systemeio.webp"
          alt={t.altSchema}
          largeur={1600}
          hauteur={996}
          premiere
          epingle={attributsEpinglePour(
            "hub-integrations",
            `${HOTE_VENTE}${lien(CHEMIN_HUB)}`,
            `${t.titre} - ${t.description}`,
            // L'ÉPINGLE VIT DANS LE DOSSIER DE SA LANGUE, comme les
            // couvertures du blog. Sans épingle anglaise, la fonction
            // rend un objet vide : aucun attribut posé, plutôt qu'une
            // épingle française sous une page anglaise.
            langue,
          )}
        />
      </section>

      <section className="tq-large mt-16">
        {t.intro.map((p) => (
          <p key={p} className="tq-doux tq-lire mt-4 leading-relaxed first:mt-0">
            {p}
          </p>
        ))}

        <h2 className="mt-14 text-[2rem]">{t.tableauTitre}</h2>
        <Tableau
          legende={t.tableauLegende}
          entetes={[...t.tableauEntetes]}
          lignes={outilsPourLangue(langue).map((o) => [
            <span key="n" className="flex items-center gap-2.5">
              {o.logo ? <Logo logo={o.logo} nom={o.nom} hauteur={18} /> : null}
              <strong>{o.nom}</strong>
            </span>,
            o.nom === "Tiquiz" ? t.natifOui : t.natifNon,
            o.intermediaire,
            o.tagParProfil,
          ])}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">{t.tableauApres}</p>
      </section>

      <section className="tq-large mt-20">
        <h2 className="text-[2rem]">{t.choisirTitre}</h2>
        {t.choisirCorps.map((p) => (
          <p key={p} className="tq-doux tq-lire mt-4 leading-relaxed">
            {p}
          </p>
        ))}
      </section>

      <section className="tq-large mt-20">
        <h2 className="text-[2rem]">{t.outilsTitre}</h2>
        {t.outilsLangueDesPages ? (
          <p className="tq-doux mt-3 leading-relaxed">{t.outilsLangueDesPages}</p>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {OUTILS_PUBLIES.map((o) => (
            <Link
              key={o.slug}
              href={`${CHEMIN_HUB}/${o.slug}`}
              className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6 transition hover:border-[var(--tq-encre)]"
            >
              {o.logo ? <Logo logo={o.logo} nom={o.nom} hauteur={22} /> : null}
              <p className="mt-4 text-[1.15rem] font-bold">
                {o.nom} {t.outilsEt} Systeme.io
              </p>
              <p className="tq-doux mt-2 leading-relaxed">{o.resume}</p>
            </Link>
          ))}
          <Link
            href={`${CHEMIN_HUB}/zapier-systeme-io`}
            className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6 transition hover:border-[var(--tq-encre)]"
          >
            <Logo logo={LOGO_ZAPIER} nom="Zapier" hauteur={22} />
            <p className="mt-4 text-[1.15rem] font-bold">Zapier {t.outilsEt} Systeme.io</p>
            <p className="tq-doux mt-2 leading-relaxed">{t.zapierResume}</p>
          </Link>
        </div>
      </section>

      <section className="tq-large mt-20">
        <h2 className="text-[2rem]">{t.avantTitre}</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">{t.avantCorps}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {t.avantLiens.map((l) => (
            <Link key={l.href} href={l.href} className="tq-bouton tq-bouton-fantome">
              {l.libelle}
            </Link>
          ))}
        </div>
      </section>

      <Faq langue={langue} questions={t.faq} />

      <section className="tq-large mt-20 pb-24">
        <div className="tq-lire rounded-2xl border border-[var(--tq-bord)] bg-white p-8">
          <div className="h-1 w-12 rounded-full bg-[var(--tq-bleu)]" aria-hidden />
          <h2 className="mt-5 text-[1.6rem]">{t.finTitre}</h2>
          <p className="tq-doux mt-3 leading-relaxed">{t.finCorps}</p>
          <div className="mt-6">
            <Link href={lien("/signup")} className="tq-bouton">
              {t.finCta}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
