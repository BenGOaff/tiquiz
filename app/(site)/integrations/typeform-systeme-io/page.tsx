// app/(site)/integrations/typeform-systeme-io/page.tsx
//
// TYPEFORM ET SYSTEME.IO : LA MÉTHODE, ET LE COÛT RÉEL.
//
// 🚨 AUCUN PRIX N'EST ÉCRIT À LA MAIN SUR CETTE PAGE.
//
// Le prix de Zapier vient de `ZAPIER.professionnelParMois`, relevé sur
// la capture que la page Zapier affiche. Le prix de Tiquiz vient du
// CATALOGUE (`OWNER_CATALOG`), c'est à dire de ce que le bon de commande
// encaisse vraiment. C'est la leçon du blog : un montant recopié est un
// montant faux au premier changement de tarif, et ici il vit dans un
// tableau de comparaison, donc à l'endroit exact où un lecteur le
// vérifie.

import Link from "next/link";
import type { Metadata } from "next";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { OWNER_CATALOG, formatCents } from "@/lib/checkout/catalog";
import { HOTE_VENTE } from "@/lib/publicHost";
import { ZAPIER, faqJsonLd, filDArianeJsonLd, type QuestionFaq } from "@/lib/site/integrations";

const TITRE = "Connecter Typeform à Systeme.io : méthode et coût réel";
const DESCRIPTION =
  "Typeform n'a pas d'intégration Systeme.io native. La méthode avec Zapier, les deux pièges de configuration, et le calcul du coût à l'année.";
const CHEMIN = "/integrations/typeform-systeme-io";
const OG = `${HOTE_VENTE}/integrations/typeform-recherche-systeme-io.webp`;

/** Le prix du palier d'entrée, lu dans le catalogue, jamais recopié. */
const PRIX_TIQUIZ = formatCents(
  OWNER_CATALOG.mensuel.amountCents,
  OWNER_CATALOG.mensuel.currency,
  "fr",
);

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
    q: "Typeform a-t-il une intégration Systeme.io ?",
    r: "Non. Aucune intégration native n'existe entre Typeform et Systeme.io. La connexion passe par une plateforme d'automatisation comme Zapier, Make ou Pabbly.",
  },
  {
    q: "Pourquoi le tag n'apparaît-il pas dans Zapier ?",
    r: "Parce qu'il n'existe pas encore dans Systeme.io. Zapier ne propose que les tags déjà créés dans le compte. Il faut créer le tag dans Systeme.io, puis recharger la liste dans Zapier.",
  },
  {
    q: "Combien coûte la connexion Typeform vers Systeme.io ?",
    r: `Zéro jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois avec un tag unique, grâce au plan gratuit de Zapier. Au delà, ou dès qu'il faut un tag différent selon la réponse, le plan Zapier Professional à ${ZAPIER.professionnelParMois} par mois devient obligatoire, en plus de l'abonnement Typeform.`,
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    filDArianeJsonLd(HOTE_VENTE, [
      { nom: "Accueil", chemin: "/" },
      { nom: "Intégrations", chemin: "/integrations" },
      { nom: "Typeform", chemin: CHEMIN },
    ]),
    faqJsonLd(FAQ),
  ],
};

export default function TypeformSystemeIo() {
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
            { nom: "Typeform" },
          ]}
        />
        <p className="tq-etiquette mt-8">Intégrations</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.4rem] sm:text-[3.2rem]">
          Connecter <span className="tq-surb">Typeform</span> à Systeme.io
        </h1>

        <EnBref>
          <p>
            Typeform n&apos;a pas d&apos;intégration Systeme.io. La connexion passe par Zapier ou
            Make : compter deux abonnements, dont un qui sert uniquement de transport.
          </p>
          <p>
            Deux pièges à la configuration : le champ email doit être de type email dans Typeform,
            et le tag doit exister dans Systeme.io avant de créer le Zap.
          </p>
        </EnBref>

        <p className="tq-doux tq-lire mt-10 leading-relaxed">
          Typeform est le plus soigné des outils de formulaire : une question par écran, des
          transitions douces, un taux de complétion élevé. La connexion à Systeme.io, elle, passe
          par un tiers.
        </p>
        <Capture
          src="/integrations/typeform-recherche-systeme-io.webp"
          alt="Une recherche Systeme.io dans les intégrations Typeform ne donne aucun résultat"
          largeur={1400}
          hauteur={827}
          premiere
          legende="La recherche « systeme » dans l'annuaire d'intégrations de Typeform : aucun résultat."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">La méthode</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Dans Zapier, déclencheur « New Entry » chez Typeform, action « Create or Update a Contact,
          Including Adding Tags » chez Systeme.io. Le champ email est associé, le tag choisi, le Zap
          testé avec une vraie réponse, puis activé.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Deux détails coûtent une heure quand personne ne les signale. Le champ email doit être un
          vrai champ de <strong>type email</strong> dans Typeform, sinon Zapier propose une liste de
          champs sans lui. Et le tag doit <strong>exister dans Systeme.io avant</strong> la
          configuration du Zap, sinon il n&apos;apparaît pas dans la liste déroulante.
        </p>
        <Capture
          src="/integrations/typeform-zap-systeme-io.webp"
          alt="Le Zap qui relie une réponse Typeform à un contact Systeme.io"
          largeur={1400}
          hauteur={913}
          legende="Le Zap une fois configuré : Typeform déclenche, Systeme.io crée le contact."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Le coût, posé à plat</h2>
        <Tableau
          legende="Ce que coûte la connexion vers Systeme.io selon l'outil choisi"
          entetes={["", "Typeform seul", "Typeform + Zapier", "Tiquiz"]}
          lignes={[
            [
              "Outil",
              "plan gratuit limité en réponses",
              "idem",
              `0 € puis ${PRIX_TIQUIZ} par mois`,
            ],
            [
              "Transport vers Systeme.io",
              "impossible",
              `0 € jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois, puis ${ZAPIER.professionnelParMois}`,
              "compris",
            ],
            [
              "Tag différent par profil",
              "non",
              "plan Zapier payant obligatoire",
              "compris",
            ],
            ["Tags à créer à la main", "sans objet", "oui, un par profil", "non, créés au passage"],
          ]}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Le plan gratuit de Typeform limite le nombre de réponses mensuelles, ce qui est précisément
          le chiffre qu&apos;on cherche à faire monter.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Ce calcul se défend malgré tout : une entreprise qui fait déjà tourner quinze
          automatisations sur Zapier paie cette connexion zéro de plus.
        </p>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">Le cas du quiz</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Un quiz à quatre profils demande quatre tags différents selon la réponse. Chez Zapier, cela
          veut dire des chemins, donc des Zaps multi-étapes, donc le plan payant, sans alternative.
          Plus les quatre tags créés à la main dans Systeme.io avant de commencer.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Tiquiz associe le tag au profil directement, avec la clé API Systeme.io collée une fois. Le
          tag est cherché puis créé s&apos;il manque. La connexion est comprise dans le plan gratuit,
          à 0 €, sans carte bancaire.
        </p>
        <Capture
          src="/integrations/tiquiz-cle-api.webp"
          alt="L'écran de Tiquiz où se colle la clé API Systeme.io"
          largeur={1400}
          hauteur={502}
          legende="La clé API se colle une seule fois, dans les réglages de Tiquiz."
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Le comparatif des outils de quiz, avec leurs prix réels :{" "}
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
