// app/(site)/integrations/interact-systeme-io/page.tsx
//
// INTERACT ET SYSTEME.IO : CE QUE DEMANDE LEUR PROPRE DOCUMENTATION.
//
// 🚨 TOUTE LA PAGE REPOSE SUR TROIS CITATIONS, ET LES TROIS ONT ÉTÉ
// RELEVÉES SUR LA PAGE D'AIDE D'INTERACT LE 1er SEPTEMBRE 2026 :
//
//   1. "A Zapier Pro account" (section « Before you start »)
//   2. "You must create a tag in Systeme.io for each quiz result you
//      want to use, or it won't appear as a selectable option in Zapier."
//   3. "Repeat this Zap setup for each quiz result tag you want to apply
//      in Systeme.io (one Zap per result tag)."
//
// Source : help.tryinteract.com/en/articles/8676075-how-to-connect-
// interact-to-systeme-io. On cite un concurrent : une phrase approchée
// serait indéfendable, et c'est la seule page du hub dont l'argument
// entier est la parole de l'autre. La capture affichée est la même page,
// traduite par le navigateur, donc elle dit "étiquette" là où nous
// écrivons "tag" : c'est leur traduction automatique, pas notre mot.

import Link from "next/link";
import type { Metadata } from "next";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { ZAPIER, faqJsonLd, filDArianeJsonLd, type QuestionFaq } from "@/lib/site/integrations";

const TITRE = "Interact et Systeme.io : ce que demande leur documentation";
const DESCRIPTION =
  "La documentation d'Interact impose Zapier Pro et un Zap par résultat de quiz pour se connecter à Systeme.io. Le détail exact, et l'alternative.";
const CHEMIN = "/integrations/interact-systeme-io";
const OG = `${HOTE_VENTE}/integrations/interact-doc-tags.webp`;

/** L'adresse de la page d'aide citée, pour que la citation se vérifie. */
const DOC_INTERACT =
  "https://help.tryinteract.com/en/articles/8676075-how-to-connect-interact-to-systeme-io";

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
    q: "Interact a-t-il une intégration native avec Systeme.io ?",
    r: "Non. La documentation officielle d'Interact décrit une connexion via Zapier et demande un compte Zapier Pro. Aucune connexion directe n'est proposée.",
  },
  {
    q: "Faut-il créer les tags à la main pour connecter Interact à Systeme.io ?",
    r: "Oui. La documentation d'Interact précise qu'un tag doit être créé dans Systeme.io pour chaque résultat de quiz, faute de quoi il n'apparaît pas comme option sélectionnable dans Zapier.",
  },
  {
    q: "Combien de Zaps faut-il pour un quiz Interact ?",
    r: "La documentation d'Interact demande de refaire le Zap pour chaque tag de résultat, soit un Zap par résultat. Un quiz à cinq profils demande donc cinq Zaps, en plus des cinq tags créés au préalable dans Systeme.io.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    filDArianeJsonLd(HOTE_VENTE, [
      { nom: "Accueil", chemin: "/" },
      { nom: "Intégrations", chemin: "/integrations" },
      { nom: "Interact", chemin: CHEMIN },
    ]),
    faqJsonLd(FAQ),
  ],
};

export default function InteractSystemeIo() {
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
            { nom: "Interact" },
          ]}
        />
        <p className="tq-etiquette mt-8">Intégrations</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.4rem] sm:text-[3.2rem]">
          Connecter <span className="tq-surb">Interact</span> à Systeme.io
        </h1>

        <EnBref>
          <p>
            Interact n&apos;a pas d&apos;intégration native avec Systeme.io. Sa documentation
            demande un compte Zapier Pro, un Zap distinct par résultat de quiz, et la création à la
            main d&apos;un tag dans Systeme.io pour chaque résultat.
          </p>
          <p>
            Sur un quiz à cinq profils : cinq tags créés à la main, cinq Zaps, et deux abonnements.
          </p>
        </EnBref>

        <p className="tq-doux tq-lire mt-10 leading-relaxed">
          Interact est le plus connu des outils de quiz marketing, et sa bibliothèque de modèles est
          la plus fournie du marché. Voici comment il se connecte à Systeme.io, tel que sa propre
          documentation le décrit.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Ce que dit la documentation d&apos;Interact</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Il n&apos;existe pas d&apos;intégration native. La connexion passe par <strong>Zapier</strong>
          , et la page d&apos;aide demande un compte <strong>Zapier Pro</strong> dès sa section
          « Before you start ».
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Le chemin décrit tient en trois temps. Dans Interact, activer la capture de leads et
          connecter Zapier avec une clé API. Dans Zapier, créer un Zap avec « New Lead » comme
          déclencheur. Puis choisir, côté Systeme.io, l&apos;action « Create or Update a Contact,
          Including Adding Tags ».
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">Et ces deux précisions, dans leurs termes :</p>
        <blockquote className="tq-lire mt-6 border-t-2 border-[var(--tq-bleu)] pt-5">
          <p className="text-[1.05rem] italic leading-relaxed">
            « You must create a tag in Systeme.io for each quiz result you want to use, or it
            won&apos;t appear as a selectable option in Zapier. »
          </p>
          <p className="mt-4 text-[1.05rem] italic leading-relaxed">
            « Repeat this Zap setup for each quiz result tag you want to apply in Systeme.io (one Zap
            per result tag). »
          </p>
          <footer className="tq-doux mt-4 text-sm">
            Documentation Interact,{" "}
            <a href={DOC_INTERACT} target="_blank" rel="noopener noreferrer">
              help.tryinteract.com
            </a>
            , relevée le 1er septembre 2026.
          </footer>
        </blockquote>
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Autrement dit : chaque résultat de quiz demande un tag créé à la main dans Systeme.io avant
          toute configuration, puis son propre Zap.
        </p>
        <Capture
          src="/integrations/interact-doc-tags.webp"
          alt="La documentation d'Interact demande de créer un tag dans Systeme.io pour chaque résultat de quiz"
          largeur={1209}
          hauteur={652}
          premiere
          legende="La page d'aide d'Interact, traduite par le navigateur : ce qu'elle appelle « étiquette » est le tag Systeme.io."
        />
        <Capture
          src="/integrations/interact-un-zap-par-resultat.webp"
          alt="Un Zap par résultat de quiz, comme le recommande la documentation d'Interact"
          largeur={1400}
          hauteur={913}
          legende="Le Zap à refaire pour chaque profil : déclencheur Interact, action Systeme.io."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Ce que cela donne sur un quiz réel</h2>
        <Tableau
          legende="Ce qu'un quiz à cinq profils demande, chez Interact avec Zapier et chez Tiquiz"
          entetes={["Quiz à 5 profils", "Interact + Zapier", "Tiquiz"]}
          lignes={[
            ["Tags à créer à la main", "5", "0, créés au passage"],
            ["Zaps à configurer", "5", "0"],
            ["Abonnements", "2", "1"],
            ["Ajouter un 6e profil", "1 tag + 1 Zap + 1 test", "écrire le profil"],
            ["Coût du transport", `${ZAPIER.professionnelParMois} par mois`, "compris"],
          ]}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Le plan gratuit de Zapier ne couvre pas ce cas : {ZAPIER.gratuitTachesParMois} tâches par
          mois, et des Zaps limités à {ZAPIER.gratuitEtapesParZap} étapes alors qu&apos;il en faut
          davantage. Le détail est sur la page{" "}
          <Link href="/integrations/zapier-systeme-io">Zapier et Systeme.io</Link>.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">La différence côté Tiquiz</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Elle tient en une phrase : <strong>Tiquiz cherche le tag dans le compte Systeme.io et le
          crée s&apos;il n&apos;y est pas.</strong> Rien à préparer, rien à associer, aucun Zap à
          dupliquer par profil. La clé API est collée une fois, les profils sont écrits, et chaque
          personne qui termine le quiz arrive taguée. Un profil peut porter plusieurs tags pour
          croiser deux segments.
        </p>
        <Capture
          src="/integrations/tiquiz-tag-sur-le-profil.webp"
          alt="Dans Tiquiz, le tag Systeme.io se règle directement sur le profil"
          largeur={1400}
          hauteur={735}
          legende="Le tag se règle sur le profil lui même, dans l'éditeur du quiz."
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          La connexion à Systeme.io est dans le plan gratuit de Tiquiz, à 0 €, sans carte bancaire,
          sans limite de durée.
        </p>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">Ce qu&apos;Interact fait mieux</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          La bibliothèque de modèles, sans comparaison possible aujourd&apos;hui. Des années
          d&apos;avance sur la finition de l&apos;éditeur. Et un écosystème d&apos;intégrations bien
          plus large, puisque Systeme.io n&apos;est qu&apos;une destination parmi des dizaines.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Si le choix se joue sur les modèles tout faits, Interact est devant. Si le choix se joue
          sur des leads tagués dans Systeme.io sans payer de transport, la réponse est de
          l&apos;autre côté.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Le comparatif complet des outils de quiz :{" "}
          <Link href="/blog/comparatif-outils-quiz-systeme-io">
            comparatif des outils de quiz pour Systeme.io
          </Link>
          .
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="tq-bouton">
            Je crée mon quiz gratuitement →
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
