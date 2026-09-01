// app/(site)/integrations/jotform-systeme-io/page.tsx
//
// JOTFORM : LA SEULE PAGE DU HUB OÙ L'INTÉGRATION EXISTE... SUR LE PAPIER.
//
// C'est ce qui rend le cas intéressant, et c'est aussi ce qui le rend
// délicat : dire "Jotform ment" serait faux et indéfendable. Jotform
// propose bien un raccourci qui fait gagner du temps. Ce qu'il ne fait
// pas, c'est retirer l'abonnement Zapier en dessous.
//
// 🚨 TROIS FAITS, ET LES TROIS ONT ÉTÉ MESURÉS, PAS RECOPIÉS :
//
//   1. Le bouton « Use this integration » de jotform.com/integrations/
//      systemeio mène à `jotform.com/build/?integration=Zapier&app=
//      systeme.io&clientID=...` (relevé sur la page en ligne).
//   2. Le schéma de leur PROPRE page fait passer la connexion par une
//      pastille "zapier" entre Jotform et systeme.io (capture).
//   3. L'écran Intégrations du constructeur Jotform ouvre un panneau
//      ZAPIER : "Sync Jotform submissions to 3000+ platforms", un bouton
//      "Se connecter à Zapier", et des "Modèles Zapier" (capture).
//
// La capture 2 est la démonstration la plus solide des trois, parce
// qu'elle vient d'eux et qu'elle se lit sans connaître Zapier.

import Link from "next/link";
import type { Metadata } from "next";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { ZAPIER, faqJsonLd, filDArianeJsonLd, type QuestionFaq } from "@/lib/site/integrations";

const TITRE = "Jotform et Systeme.io : ça passe par Zapier";
const DESCRIPTION =
  "Jotform annonce une intégration Systeme.io. En réalité son bouton ouvre Zapier. Ce que ça implique, et comment connecter les deux proprement.";
const CHEMIN = "/integrations/jotform-systeme-io";
const OG = `${HOTE_VENTE}/integrations/jotform-page-integration.webp`;

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}${CHEMIN}` },
  openGraph: {
    type: "article",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}${CHEMIN}`,
    siteName: "Tiquiz",
    locale: "fr_FR",
    images: [{ url: OG }],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION, images: [OG] },
};

const FAQ: readonly QuestionFaq[] = [
  {
    q: "Jotform a-t-il une intégration native avec Systeme.io ?",
    r: "Non. Jotform publie une page d'intégration Systeme.io, mais son bouton ouvre un constructeur de Zap : l'adresse contient le paramètre integration=Zapier. Aucune clé API Systeme.io n'est demandée, et la connexion passe donc par un compte Zapier.",
  },
  {
    q: "Faut-il un compte Zapier pour connecter Jotform à Systeme.io ?",
    r: `Oui. Le raccourci proposé par Jotform pré-remplit le Zap, mais il faut un compte Zapier, avec ses limites : ${ZAPIER.gratuitTachesParMois} tâches par mois en gratuit et des Zaps à ${ZAPIER.gratuitEtapesParZap} étapes.`,
  },
  {
    q: "Peut-on poser un tag différent selon la réponse ?",
    r: `Pas avec le plan gratuit. Il faut des chemins dans un Zap multi-étapes, donc le plan Zapier Professional à ${ZAPIER.professionnelParMois} par mois, et chaque tag doit exister dans Systeme.io avant d'être sélectionnable.`,
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    filDArianeJsonLd(HOTE_VENTE, [
      { nom: "Accueil", chemin: "/" },
      { nom: "Intégrations", chemin: "/integrations" },
      { nom: "Jotform", chemin: CHEMIN },
    ]),
    faqJsonLd(FAQ),
  ],
};

export default function JotformSystemeIo() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="tq-large pt-12 sm:pt-16">
        <FilDAriane
          etapes={[
            { nom: "Accueil", chemin: "/" },
            { nom: "Intégrations", chemin: "/integrations" },
            { nom: "Jotform" },
          ]}
        />
        <p className="tq-etiquette mt-8">Intégrations</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.4rem] sm:text-[3.2rem]">
          Connecter <span className="tq-surb">Jotform</span> à Systeme.io
        </h1>

        <EnBref>
          <p>
            Jotform a bien une page « intégration systeme.io », mais son bouton ouvre Zapier :
            l&apos;adresse contient <code>integration=Zapier</code>. Aucune clé API Systeme.io
            n&apos;est demandée.
          </p>
          <p>
            C&apos;est un Zap pré-configuré présenté comme une intégration, avec les mêmes limites
            que n&apos;importe quel Zap.
          </p>
        </EnBref>

        <p className="tq-doux tq-lire mt-10 leading-relaxed">
          Jotform est le plus complet des constructeurs de formulaires : conditions, calculs,
          paiements, signatures. Sa page d&apos;intégration Systeme.io existe, et c&apos;est ce qui
          rend le cas particulier.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Ce que fait vraiment le bouton</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Sur <code>jotform.com/integrations/systemeio</code>, le bouton « Use this integration »
          ouvre cette adresse :
        </p>
        <pre className="tq-lire mt-4 overflow-x-auto rounded-xl border border-[var(--tq-bord)] bg-[var(--tq-panneau)] p-4 text-[0.85rem]">
          <code>jotform.com/build/?integration=Zapier&amp;app=systeme.io&amp;clientID=...</code>
        </pre>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Le paramètre est dans l&apos;URL : <code>integration=Zapier</code>. Aucune clé API
          Systeme.io n&apos;est demandée à aucun moment, et aucun écran d&apos;authentification
          Systeme.io n&apos;apparaît. Ce que Jotform appelle une intégration est un Zap
          pré-configuré, et le raccourci est bien pratique, mais il ne change rien aux limites en
          dessous.
        </p>
        <Capture
          src="/integrations/jotform-page-integration.webp"
          alt="La page d'intégration Systeme.io de Jotform, dont le schéma fait passer la connexion par Zapier"
          largeur={1400}
          hauteur={711}
          premiere
          legende="Le schéma est de Jotform : entre Jotform et systeme.io, une pastille « zapier »."
        />
        <Capture
          src="/integrations/jotform-panneau-zapier.webp"
          alt="L'intégration Systeme.io de Jotform ouvre un panneau Zapier, avec ses modèles de Zap"
          largeur={1400}
          hauteur={978}
          legende="Dans le constructeur Jotform, l'écran s'intitule ZAPIER et demande de connecter un compte Zapier avant de proposer ses modèles."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Ce que ça implique</h2>
        <Tableau
          legende="Ce que la page d'intégration annonce, et ce qui se passe vraiment"
          entetes={["", "Ce qu'annonce la page", "Ce qui se passe"]}
          lignes={[
            ["Type de connexion", "intégration Systeme.io", "Zap Jotform vers Systeme.io"],
            ["Compte nécessaire", "Jotform", "Jotform et Zapier"],
            ["Clé API Systeme.io", "non demandée", "gérée par Zapier"],
            [
              "Volume",
              "non mentionné",
              `${ZAPIER.gratuitTachesParMois} tâches par mois en gratuit`,
            ],
            ["Tag par réponse", "non mentionné", "plan Zapier payant"],
          ]}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Le raccourci fait gagner le temps de configuration du Zap. Il ne fait pas gagner
          l&apos;abonnement. Le détail des limites est sur la page{" "}
          <Link href="/integrations/zapier-systeme-io">Zapier et Systeme.io</Link>.
        </p>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">Le cas du quiz</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Jotform sait produire un formulaire conditionnel avec des calculs, ce qui ressemble à un
          quiz. Ce qu&apos;il ne sait pas faire, c&apos;est envoyer un tag différent par profil dans
          Systeme.io sans repasser par des chemins Zapier, donc par le plan Professional à{" "}
          {ZAPIER.professionnelParMois} par mois, et sans créer chaque tag à la main au préalable.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Tiquiz écrit dans Systeme.io avec ta clé API, sans intermédiaire. Chaque profil porte son
          tag, et le tag est créé dans Systeme.io s&apos;il n&apos;existe pas encore. La connexion
          est comprise dans le plan gratuit, à 0 €, sans carte bancaire.
        </p>
        <Capture
          src="/integrations/tiquiz-profils-tags.webp"
          alt="Les profils d'un quiz Tiquiz et le tag Systeme.io posé sur chacun"
          largeur={1400}
          hauteur={913}
          legende="Un tag par profil, réglé dans l'éditeur : ni Zap, ni tag à créer avant."
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Pour un formulaire complexe avec paiement et signature, Jotform reste devant, et de loin.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="tq-bouton">
            Je teste Tiquiz gratuitement →
          </Link>
          <Link href="/integrations" className="tq-bouton tq-bouton-fantome">
            Voir tous les outils
          </Link>
        </div>
      </section>

      <Faq questions={FAQ} />
      <div className="pb-24" />
    </main>
  );
}
