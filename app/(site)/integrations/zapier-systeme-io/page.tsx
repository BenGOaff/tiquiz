// app/(site)/integrations/zapier-systeme-io/page.tsx
//
// ZAPIER ET SYSTEME.IO : CE QUE LE PLAN GRATUIT PERMET.
//
// Cette page dit à quelqu'un de prendre Zapier quand c'est la bonne
// réponse, et elle le dit AVANT de parler de Tiquiz. C'est ce qui la
// rend crédible : une page d'intégration qui n'explique pas
// l'intégration est une page de vente déguisée.
//
// 🚨 DEUX FAITS À NE JAMAIS INVERSER, tous les deux vérifiés :
//
// 1. **Systeme.io n'est PAS une application "Premium" sur Zapier** :
//    elle est accessible depuis le plan gratuit. Ce qui coince, c'est
//    le nombre de tâches et d'étapes. Écrire l'inverse enverrait le
//    lecteur payer pour une raison qui n'existe pas.
// 2. **Le prix vient de la CAPTURE que la page affiche**
//    (`ZAPIER.professionnelParMois`), pas d'un chiffre écrit ici. Le
//    document de départ annonçait 19,99 $ et la capture dit 29,99 $ :
//    voir le commentaire de `lib/site/integrations.ts`.

import Link from "next/link";
import type { Metadata } from "next";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { ZAPIER, faqJsonLd, filDArianeJsonLd, type QuestionFaq } from "@/lib/site/integrations";

const TITRE = "Zapier et Systeme.io : ce que le plan gratuit permet";
const DESCRIPTION =
  "Connecter Zapier à Systeme.io : les actions disponibles, les limites réelles du plan gratuit, et à partir de quand il faut passer au payant.";
const CHEMIN = "/integrations/zapier-systeme-io";
const OG = `${HOTE_VENTE}/integrations/zapier-actions-systeme-io.webp`;

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
    q: "Systeme.io est-il une application Premium sur Zapier ?",
    r: "Non. L'application Systeme.io est accessible depuis le plan gratuit de Zapier. Ce sont le nombre de tâches mensuelles et le nombre d'étapes par Zap qui limitent, pas l'accès à l'application.",
  },
  {
    q: "Combien de tâches Zapier consomme un formulaire rempli ?",
    r: `Une tâche par action exécutée. Un Zap simple qui crée un contact avec son tag consomme une tâche par réponse, soit ${ZAPIER.gratuitTachesParMois} réponses par mois sur le plan gratuit. Les étapes Filter, Formatter et Path ne comptent pas.`,
  },
  {
    q: "Peut-on poser un tag différent selon la réponse avec le plan gratuit ?",
    r: `Non. Cela demande des chemins dans un Zap multi-étapes, réservé au plan Professional à ${ZAPIER.professionnelParMois} par mois. Le tag doit également exister dans Systeme.io avant d'être sélectionnable dans Zapier.`,
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    filDArianeJsonLd(HOTE_VENTE, [
      { nom: "Accueil", chemin: "/" },
      { nom: "Intégrations", chemin: "/integrations" },
      { nom: "Zapier", chemin: CHEMIN },
    ]),
    faqJsonLd(FAQ),
  ],
};

export default function ZapierSystemeIo() {
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
            { nom: "Zapier" },
          ]}
        />
        <p className="tq-etiquette mt-8">Intégrations</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.4rem] sm:text-[3.2rem]">
          Connecter <span className="tq-surb">Zapier</span> à Systeme.io
        </h1>

        <EnBref>
          <p>
            L&apos;application Systeme.io existe sur Zapier et elle est accessible dès le plan
            gratuit : elle n&apos;est pas classée « Premium ». La limite est ailleurs.
          </p>
          <p>
            Le plan gratuit donne {ZAPIER.gratuitTachesParMois} tâches par mois et des Zaps à{" "}
            {ZAPIER.gratuitEtapesParZap} étapes. Pour poser un tag différent selon une réponse, il
            faut des chemins, donc le plan Professional à {ZAPIER.professionnelParMois} par mois.
          </p>
        </EnBref>

        <p className="tq-doux tq-lire mt-10 leading-relaxed">
          Zapier est le passage obligé de la plupart des intégrations Systeme.io, puisque presque
          aucun outil ne s&apos;y connecte directement. Voici ce qu&apos;il sait faire et où il
          s&apos;arrête.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Ce que Systeme.io expose dans Zapier</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <strong>Déclencheurs :</strong> nouvelle inscription à un formulaire d&apos;opt-in,
          nouvelle vente, tag ajouté à un contact, campagne terminée, nouvelle inscription à un
          webinaire.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <strong>Actions :</strong> créer ou mettre à jour un contact avec ses tags, retirer un
          tag, inscrire ou désinscrire d&apos;une campagne, donner ou retirer l&apos;accès à un
          cours.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          L&apos;action utile dans neuf cas sur dix s&apos;appelle « Create or Update a Contact,
          Including Adding Tags ». Elle crée le contact s&apos;il n&apos;existe pas, le met à jour
          sinon, et pose les tags choisis dans la foulée.
        </p>
        <Capture
          src="/integrations/zapier-actions-systeme-io.webp"
          alt="Les actions Systeme.io proposées dans Zapier : créer ou mettre à jour un contact avec ses tags, retirer un tag, inscrire ou désinscrire d'une campagne"
          largeur={1400}
          hauteur={910}
          premiere
          legende="Les actions Systeme.io telles que Zapier les propose, dans un Zap réel."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Les limites, chiffrées</h2>
        <Tableau
          legende="Ce que le plan gratuit de Zapier permet, comparé au plan Professional"
          entetes={["", "Plan gratuit", "Professional"]}
          lignes={[
            ["Prix", "0 €", `${ZAPIER.professionnelParMois} par mois`],
            ["Tâches par mois", String(ZAPIER.gratuitTachesParMois), "selon le palier choisi"],
            ["Étapes par Zap", String(ZAPIER.gratuitEtapesParZap), "illimitées"],
            ["Chemins et filtres", "disponibles", "disponibles"],
            ["Applications Premium", "non", "oui"],
          ]}
        />
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Deux précisions qui comptent. <strong>Systeme.io n&apos;est pas une application
          Premium</strong> : son accès n&apos;est pas ce qui bloque. Et les étapes « Filter »,
          « Formatter » et « Path » ne consomment pas de tâche, ce qui aide sur le quota mais pas
          sur la limite de {ZAPIER.gratuitEtapesParZap} étapes.
        </p>
        <Capture
          src="/integrations/zapier-tarifs.webp"
          alt={`Le plan gratuit de Zapier est limité à ${ZAPIER.gratuitTachesParMois} tâches par mois et ${ZAPIER.gratuitEtapesParZap} étapes par Zap, le plan Professional démarre à ${ZAPIER.professionnelParMois} par mois`}
          largeur={1400}
          hauteur={1223}
          legende="La page de tarifs de Zapier, en septembre 2026."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Le moment où le plan gratuit ne suffit plus</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Trois situations, et elles arrivent vite.
        </p>
        <ol className="tq-lire mt-8 space-y-6">
          {[
            "Le volume dépasse cent réponses par mois. Cent tâches, c'est cent formulaires remplis, pas cent visiteurs.",
            "Le tag doit dépendre de la réponse. Un tag unique pour tout le monde tient en deux étapes. Un tag par profil demande des chemins, donc un Zap multi-étapes, donc le plan payant.",
            "Il faut plusieurs actions à la suite : créer le contact, poser le tag, puis l'inscrire à une campagne. Trois étapes.",
          ].map((t, i) => (
            <li key={t} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--tq-bleu)] text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="tq-doux leading-relaxed">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">Ce qui évite Zapier entièrement</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Pour un quiz, Tiquiz écrit dans Systeme.io avec ta clé API, sans intermédiaire. Chaque
          profil porte son tag, et Tiquiz <strong>crée le tag dans Systeme.io s&apos;il
          n&apos;existe pas encore</strong> : rien à préparer à l&apos;avance, aucun Zap à
          dupliquer. La connexion et les tags sont compris dans le plan gratuit de Tiquiz, à 0 €,
          sans carte bancaire.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Pour tout le reste (Calendly, Stripe, une boutique, un formulaire de contact), Zapier
          reste le bon outil.
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
