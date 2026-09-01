// app/(site)/integrations/tally-systeme-io/page.tsx
//
// TALLY ET SYSTEME.IO : LES TROIS MÉTHODES, DONT UNE GRATUITE.
//
// La page dit d'abord comment faire SANS nous, y compris la méthode
// gratuite qui demande du code. C'est ce qui la rend lisible par
// quelqu'un qui cherche vraiment à connecter Tally, et c'est la seule
// façon d'être crédible au moment où on parle de Tiquiz.
//
// 🚨 LE FAIT VÉRIFIÉ DANS CE DÉPÔT, ET IL EST LE COEUR DE LA PAGE :
// Tiquiz CRÉE le tag Systeme.io quand il manque. Ce n'est pas une
// promesse commerciale, c'est `app/api/quiz/[quizId]/public/route.ts`,
// qui fait `POST /tags` sur un nom introuvable avant de le poser sur le
// contact. À ne pas confondre avec `poserTagParNom` (les ventes et la
// newsletter), qui ne crée JAMAIS un tag avec la clé de Béné : un nom
// mal orthographié se retrouverait en double dans SA liste.

import Link from "next/link";
import type { Metadata } from "next";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { ZAPIER, faqJsonLd, filDArianeJsonLd, type QuestionFaq } from "@/lib/site/integrations";

const TITRE = "Connecter Tally à Systeme.io : les 3 méthodes";
const DESCRIPTION =
  "Tally n'a pas d'intégration Systeme.io. Webhook, Zapier ou Make : ce que chaque méthode demande, ce qu'elle coûte, et le piège des tags.";
const CHEMIN = "/integrations/tally-systeme-io";
const OG = `${HOTE_VENTE}/integrations/tally-integrations.webp`;

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
    q: "Tally a-t-il une intégration Systeme.io ?",
    r: "Non. La page des intégrations de Tally liste Google Sheets, Notion, Coda, Airtable, Slack, Discord, Linear, Attio et les webhooks, ainsi que les plateformes d'automatisation. Systeme.io n'y figure pas.",
  },
  {
    q: "Peut-on connecter Tally à Systeme.io sans Zapier ?",
    r: "Oui, avec un webhook Tally qui pointe vers un petit service appelant l'API Systeme.io. C'est gratuit, mais cela demande de programmer, parce que les deux outils n'échangent pas le même format de données.",
  },
  {
    q: "Pourquoi le contact arrive-t-il sans son tag ?",
    r: "Parce que l'API Systeme.io attend l'identifiant numérique du tag, pas son nom. Il faut d'abord chercher le tag avec GET /tags?query=, le créer avec POST /tags s'il n'existe pas, puis poser son identifiant sur le contact.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    filDArianeJsonLd(HOTE_VENTE, [
      { nom: "Accueil", chemin: "/" },
      { nom: "Intégrations", chemin: "/integrations" },
      { nom: "Tally", chemin: CHEMIN },
    ]),
    faqJsonLd(FAQ),
  ],
};

export default function TallySystemeIo() {
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
            { nom: "Tally" },
          ]}
        />
        <p className="tq-etiquette mt-8">Intégrations</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.4rem] sm:text-[3.2rem]">
          Connecter <span className="tq-surb">Tally</span> à Systeme.io
        </h1>

        <EnBref>
          <p>
            Tally n&apos;a pas d&apos;intégration Systeme.io : elle ne figure pas dans sa liste.
            Trois méthodes existent quand même.
          </p>
          <p>
            Un webhook Tally vers l&apos;API Systeme.io, gratuit mais avec un peu de code. Zapier,
            gratuit jusqu&apos;à {ZAPIER.gratuitTachesParMois} réponses par mois. Ou Make. Pour un
            quiz qui pose un tag différent par profil, aucune des trois ne suffit sans passer au
            payant.
          </p>
        </EnBref>

        <p className="tq-doux tq-lire mt-10 leading-relaxed">
          Tally est gratuit pour presque tout, et c&apos;est ce qui rend la question fréquente : le
          formulaire est fait en dix minutes, mais les réponses restent chez Tally pendant que la
          liste de contacts est dans Systeme.io.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Les intégrations proposées par Tally sont Google Sheets, Notion, Coda, Airtable, Slack,
          Discord, Linear, Attio et les webhooks, plus les plateformes d&apos;automatisation.
          Systeme.io n&apos;y figure pas.
        </p>
        <Capture
          src="/integrations/tally-integrations.webp"
          alt="La page des intégrations de Tally, où Systeme.io ne figure pas"
          largeur={1400}
          hauteur={782}
          premiere
          legende="La liste des intégrations de Tally : Systeme.io n'y est pas."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Les trois méthodes, comparées</h2>
        <Tableau
          legende="Coût, compétence et temps de mise en place des trois méthodes pour relier Tally à Systeme.io"
          entetes={["", "Webhook et code", "Zapier", "Make"]}
          lignes={[
            [
              "Coût",
              "0 €",
              `0 € jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois`,
              "selon le volume",
            ],
            ["Compétence", "savoir programmer", "aucune", "prise en main moyenne"],
            ["Mise en place", "une à deux heures", "un quart d'heure", "une demi-heure"],
            ["Tag par profil", "possible", "plan payant", "possible"],
          ]}
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Méthode 1 : le webhook, directement sur l&apos;API Systeme.io</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          La plus propre et la moins chère. La seule qui demande du code.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Tally envoie chaque réponse à une adresse au choix. Systeme.io reçoit un contact sur son
          API. Ils ne parlent pas la même langue : il faut donc un petit service au milieu qui
          traduit, par exemple une fonction Netlify ou un worker Cloudflare, dont les plans gratuits
          suffisent largement.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Ce que ce service doit faire, dans l&apos;ordre : recevoir le webhook Tally, en extraire
          l&apos;email et les réponses, appeler{" "}
          <code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5 text-[0.9em]">
            POST https://api.systeme.io/api/contacts
          </code>{" "}
          avec l&apos;en-tête{" "}
          <code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5 text-[0.9em]">X-API-Key</code>
          , récupérer l&apos;identifiant du contact, puis appeler{" "}
          <code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5 text-[0.9em]">
            POST /contacts/&#123;id&#125;/tags
          </code>
          .
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <strong>Le piège, et il n&apos;est documenté nulle part :</strong> Systeme.io attend
          l&apos;identifiant du tag, pas son nom. Il faut donc chercher le tag avec{" "}
          <code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5 text-[0.9em]">
            GET /tags?query=NomDuTag
          </code>
          , et le créer avec{" "}
          <code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5 text-[0.9em]">
            POST /tags
          </code>{" "}
          s&apos;il n&apos;existe pas. Sans ça, le contact arrive sans tag et aucune automatisation
          ne se déclenche. L&apos;erreur est difficile à voir, parce que tout a l&apos;air de
          fonctionner : le contact est bien là.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Méthode 2 : Zapier</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Déclencheur « New Submission » chez Tally, action « Create or Update a Contact, Including
          Adding Tags » chez Systeme.io. Le champ email est associé, le tag choisi, le Zap activé.
          Un quart d&apos;heure.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Le plan gratuit donne {ZAPIER.gratuitTachesParMois} tâches par mois et des Zaps à{" "}
          {ZAPIER.gratuitEtapesParZap} étapes. Tant que le tag est le même pour tout le monde, deux
          étapes suffisent.
        </p>
        <Capture
          src="/integrations/tally-zap-systeme-io.webp"
          alt="Un Zap qui relie une réponse Tally à la création d'un contact dans Systeme.io"
          largeur={1400}
          hauteur={913}
          legende="Le Zap, une fois configuré : Tally déclenche, Systeme.io crée le contact."
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Le détail des limites de Zapier, chiffré :{" "}
          <Link href="/integrations/zapier-systeme-io">Zapier et Systeme.io</Link>.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Méthode 3 : Make, Pabbly ou n8n</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Même principe, tarifs différents. Make est plus généreux sur le volume et moins simple à
          prendre en main. Pabbly se paie une fois. n8n s&apos;héberge soi-même, gratuitement.
        </p>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">Le cas du quiz</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Tout ce qui précède vaut pour un formulaire : un email, un prénom, un tag pour tout le
          monde.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Un quiz pose cinq questions, calcule un profil, et chaque profil doit poser un tag
          différent. Avec Tally et Zapier, cela signifie un Zap par profil, des chemins, donc le
          plan Professional, plus chaque tag créé à la main dans Systeme.io au préalable.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Tiquiz couvre exactement ce cas. La clé API Systeme.io est collée une fois, les profils
          sont écrits, et chaque personne qui termine le quiz arrive dans Systeme.io avec le tag de
          son profil. Tiquiz cherche le tag et <strong>le crée s&apos;il n&apos;existe pas</strong>.
          Un profil peut porter plusieurs tags.
        </p>
        <Capture
          src="/integrations/tiquiz-cle-api.webp"
          alt="L'écran de Tiquiz où se colle la clé API Systeme.io"
          largeur={1400}
          hauteur={502}
          legende="La clé API se colle une seule fois, dans les réglages de Tiquiz."
        />
        <Capture
          src="/integrations/tiquiz-contact-tague.webp"
          alt="Un contact arrivé dans Systeme.io avec le tag de son profil de quiz"
          largeur={1400}
          hauteur={735}
          legende="Le contact arrive dans Systeme.io avec le tag de son profil, sans intermédiaire."
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          La connexion à Systeme.io et les tags sont dans le plan gratuit de Tiquiz, à 0 €, sans
          carte bancaire, sans limite de durée.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Tally reste excellent pour les formulaires de contact et les inscriptions simples.
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
