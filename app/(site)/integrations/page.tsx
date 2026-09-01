// app/(site)/integrations/page.tsx
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
// LES DEUX PAGES PAS ENCORE ÉCRITES (Google Forms, Interact) sont dans
// le TABLEAU mais pas dans la liste de liens : une ligne manquante dans
// un comparatif se lit comme un oubli, alors qu'un lien vers une page
// qui n'existe pas est un 404 depuis la page qui doit inspirer
// confiance (drame du centre d'aide, 24 août).

import Link from "next/link";
import type { Metadata } from "next";
import { attributsEpinglePour } from "@/lib/blog/partage";

import { Capture, EnBref, Faq, FilDAriane, Logo, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import {
  ENFANTS_DU_HUB,
  LOGO_ZAPIER,
  OUTILS,
  OUTILS_PUBLIES,
  ZAPIER,
  faqJsonLd,
  filDArianeJsonLd,
  type QuestionFaq,
} from "@/lib/site/integrations";

// 45 caractères : Google coupe autour de 60, et le suffixe " · Tiquiz"
// posé par le gabarit du site compte dedans. Le <h1> de la page, lui,
// ne bouge pas : c'est lui qui porte la phrase entière.
const TITRE = "Intégrations Systeme.io : formulaires et quiz";
const DESCRIPTION =
  "Tally, Typeform, Google Forms, Interact, Zapier : comment chaque outil se connecte à Systeme.io, ce que chaque méthode coûte, et laquelle choisir.";
const SCHEMA_OG = `${HOTE_VENTE}/integrations/schema-connexion-systemeio-og.webp`;

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}/integrations` },
  openGraph: {
    type: "article",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}/integrations`,
    siteName: "Tiquiz",
    locale: "fr_FR",
    images: [{ url: SCHEMA_OG, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION, images: [SCHEMA_OG] },
};

const FAQ: readonly QuestionFaq[] = [
  {
    q: "Systeme.io a-t-il des intégrations natives avec les outils de formulaire ?",
    r: "Non. Systeme.io expose une API et se connecte à Zapier, Make et Pabbly, mais aucun des grands outils de formulaire (Tally, Typeform, Google Forms, Jotform) ne s'y connecte directement. Il faut passer par une plateforme d'automatisation, ou par un outil qui a développé la connexion lui-même.",
  },
  {
    q: "Peut-on connecter un formulaire à Systeme.io gratuitement ?",
    r: `Oui, de deux façons. Avec le plan gratuit de Zapier, limité à ${ZAPIER.gratuitTachesParMois} tâches par mois et à des Zaps de ${ZAPIER.gratuitEtapesParZap} étapes. Ou avec un webhook et un peu de code appelant l'API Systeme.io, ce qui ne coûte rien mais demande de savoir programmer.`,
  },
  {
    q: "Comment poser un tag différent selon la réponse au formulaire ?",
    r: `Avec Zapier, il faut un Zap par réponse possible et des chemins, ce qui demande le plan Professional à ${ZAPIER.professionnelParMois} par mois. Chaque tag doit aussi exister dans Systeme.io avant la configuration. Un outil de quiz connecté directement, comme Tiquiz, associe le tag au profil sans intermédiaire.`,
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    filDArianeJsonLd(HOTE_VENTE, [
      { nom: "Accueil", chemin: "/" },
      { nom: "Intégrations", chemin: "/integrations" },
    ]),
    {
      "@type": "ItemList",
      name: "Connecter un formulaire ou un quiz à Systeme.io",
      itemListElement: ENFANTS_DU_HUB.map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${o.nom} et Systeme.io`,
        url: `${HOTE_VENTE}/integrations/${o.slug}`,
      })),
    },
    faqJsonLd(FAQ),
  ],
};

export default function HubIntegrations() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="tq-large pt-12 sm:pt-16">
        <FilDAriane etapes={[{ nom: "Accueil", chemin: "/" }, { nom: "Intégrations" }]} />
        <p className="tq-etiquette mt-8">Intégrations</p>
        <h1 className="mt-3 max-w-[20ch] text-[2.4rem] sm:text-[3.2rem]">
          Connecter un formulaire ou un quiz à <span className="tq-surb">Systeme.io</span>
        </h1>

        {/* L'ENCADRÉ PASSE AVANT LA PREMIÈRE IMAGE. C'est le bloc que les
            moteurs et les assistants citent : le faire descendre sous un
            schéma de 1600 px le rend invisible pour eux. */}
        <EnBref>
          <p>
            Aucun des grands outils de formulaire ne parle directement à Systeme.io. Tally,
            Typeform, Google Forms, Jotform et Interact passent tous par un intermédiaire :
            Zapier, Make ou Pabbly. Compter un abonnement de plus, à partir de{" "}
            {ZAPIER.professionnelParMois} par mois dès qu&apos;il faut un tag différent selon la
            réponse.
          </p>
          <p>
            Tiquiz écrit dans Systeme.io avec ta clé API, sans intermédiaire, et crée le tag
            s&apos;il n&apos;existe pas.
          </p>
        </EnBref>

        <Capture
          src="/integrations/schema-connexion-systemeio.webp"
          alt="Tally, Typeform, Google Forms, Jotform et Interact passent par Zapier, Make, n8n ou Pabbly pour atteindre Systeme.io, Tiquiz s'y connecte directement"
          largeur={1600}
          hauteur={996}
          premiere
          epingle={attributsEpinglePour(
            "hub-integrations",
            `${HOTE_VENTE}/integrations`,
            `${TITRE} - ${DESCRIPTION}`,
          )}
        />
      </section>

      <section className="tq-large mt-16">
        <p className="tq-doux tq-lire leading-relaxed">
          Systeme.io ne fabrique pas de quiz. Il fait très bien le reste : les emails, les tags,
          les tunnels, les paiements. La question qui revient donc sans arrêt est celle du
          raccord : comment les réponses d&apos;un formulaire arrivent-elles <strong>dans</strong>{" "}
          Systeme.io, avec le bon tag sur le bon contact ?
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Chaque outil a été vérifié un par un, en septembre 2026. Voilà l&apos;état des lieux.
        </p>

        <h2 className="mt-14 text-[2rem]">Ce que chaque outil demande</h2>
        <Tableau
          legende="Ce que chaque outil de formulaire demande pour atteindre Systeme.io"
          entetes={[
            "Outil",
            "Intégration native Systeme.io",
            "Ce qu'il faut en plus",
            "Tag automatique par profil",
          ]}
          lignes={OUTILS.map((o) => [
            <span key="n" className="flex items-center gap-2.5">
              {o.logo ? <Logo logo={o.logo} nom={o.nom} hauteur={18} /> : null}
              <strong>{o.nom}</strong>
            </span>,
            o.nom === "Tiquiz" ? "Oui, avec ta clé API" : "Non",
            o.intermediaire,
            o.tagParProfil,
          ])}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Ce tableau ne dit pas que ces outils sont mauvais. Tally est excellent et gratuit,
          Typeform est le plus beau du marché, Interact a une bibliothèque de modèles que personne
          n&apos;égale. Il dit seulement ce que chacun demande avant que la première réponse arrive
          dans Systeme.io.
        </p>
      </section>

      <section className="tq-large mt-20">
        <h2 className="text-[2rem]">Comment choisir</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Si le besoin est un <strong>formulaire simple</strong> avec un tag unique pour tout le
          monde, n&apos;importe lequel de ces outils fait l&apos;affaire, et le plan gratuit de
          Zapier suffit tant qu&apos;on reste sous cent réponses par mois.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Si le besoin est un <strong>quiz qui pose un tag différent selon les réponses</strong>,
          le calcul change complètement. Il faut un Zap par profil, donc des Zaps multi-étapes,
          donc le plan Zapier payant, plus chaque tag créé à la main dans Systeme.io au préalable.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          C&apos;est ce deuxième cas qui justifie un outil connecté directement.
        </p>
      </section>

      <section className="tq-large mt-20">
        <h2 className="text-[2rem]">Choisis ton outil</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {OUTILS_PUBLIES.map((o) => (
            <Link
              key={o.slug}
              href={`/integrations/${o.slug}`}
              className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6 transition hover:border-[var(--tq-encre)]"
            >
              {o.logo ? <Logo logo={o.logo} nom={o.nom} hauteur={22} /> : null}
              <p className="mt-4 text-[1.15rem] font-bold">{o.nom} et Systeme.io</p>
              <p className="tq-doux mt-2 leading-relaxed">{o.resume}</p>
            </Link>
          ))}
          <Link
            href="/integrations/zapier-systeme-io"
            className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6 transition hover:border-[var(--tq-encre)]"
          >
            <Logo logo={LOGO_ZAPIER} nom="Zapier" hauteur={22} />
            <p className="mt-4 text-[1.15rem] font-bold">Zapier et Systeme.io</p>
            <p className="tq-doux mt-2 leading-relaxed">
              Ce que le plan gratuit permet vraiment, et à partir de quand il faut payer.
            </p>
          </Link>
        </div>
        {/* CE QUI N'EST PAS ENCORE ÉCRIT EST DIT, SANS LIEN. Un lien vers
            une page absente est un 404 depuis la page qui doit inspirer
            confiance ; ne rien dire du tout laisse croire qu'on n'a pas
            regardé ces outils. */}

      </section>

      <section className="tq-large mt-20">
        <h2 className="text-[2rem]">Avant de commencer, quel que soit l&apos;outil</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          La clé API se trouve dans Systeme.io, Paramètres, API. C&apos;est elle qui autorise un
          outil extérieur à créer un contact et à poser un tag. Elle donne accès à toute la liste
          de contacts : elle se traite comme un mot de passe et ne se colle que dans un outil de
          confiance.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/blog/comment-creer-quiz-systeme-io" className="tq-bouton tq-bouton-fantome">
            La méthode complète, étape par étape
          </Link>
          <Link
            href="/blog/comparatif-outils-quiz-systeme-io"
            className="tq-bouton tq-bouton-fantome"
          >
            Le comparatif des outils de quiz
          </Link>
        </div>
      </section>

      <Faq questions={FAQ} />

      <section className="tq-large mt-20 pb-24">
        <div className="tq-lire rounded-2xl border border-[var(--tq-bord)] bg-white p-8">
          <div className="h-1 w-12 rounded-full bg-[var(--tq-bleu)]" aria-hidden />
          <h2 className="mt-5 text-[1.6rem]">Un quiz qui écrit dans Systeme.io tout seul</h2>
          <p className="tq-doux mt-3 leading-relaxed">
            La connexion et les tags par profil sont dans le plan gratuit de Tiquiz, à 0 €, sans
            carte bancaire et sans limite de durée.
          </p>
          <div className="mt-6">
            <Link href="/signup" className="tq-bouton">
              Je teste Tiquiz gratuitement →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
