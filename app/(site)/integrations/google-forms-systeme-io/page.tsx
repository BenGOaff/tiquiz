// app/(site)/integrations/google-forms-systeme-io/page.tsx
//
// GOOGLE FORMS ET SYSTEME.IO : DEUX QUESTIONS, DEUX RÉPONSES.
//
// "Connecter Google Forms à Systeme.io" cache deux demandes qui n'ont
// rien à voir : AFFICHER le formulaire dans une page, et ENVOYER les
// réponses dans les contacts. Les confondre est la raison pour laquelle
// personne ne trouve de réponse utile : on lit un tutoriel d'intégration
// HTML alors qu'on cherchait un tag sur un contact.
//
// 🚨 LA CAPTURE MOBILE PORTAIT L'ADRESSE EMAIL DE BÉNÉ (le compte Google
// connecté s'affiche au dessus du formulaire). Elle est floutée dans le
// WebP publié, et vérifiée illisible. Une page publique est indexée pour
// toujours : une capture fournie se REGARDE champ par champ.

import Link from "next/link";
import type { Metadata } from "next";

import { Capture, EnBref, Faq, FilDAriane, Tableau } from "@/components/site/Integrations";
import { HOTE_VENTE } from "@/lib/publicHost";
import { ZAPIER, faqJsonLd, filDArianeJsonLd, type QuestionFaq } from "@/lib/site/integrations";

const TITRE = "Google Forms et Systeme.io : intégrer et connecter";
const DESCRIPTION =
  "Comment afficher un Google Forms dans une page Systeme.io, et surtout comment envoyer les réponses dans tes contacts avec le bon tag.";
const CHEMIN = "/integrations/google-forms-systeme-io";
const OG = `${HOTE_VENTE}/integrations/google-forms-zap-feuille.webp`;

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
    q: "Peut-on intégrer un Google Forms dans une page Systeme.io ?",
    r: "Oui, en collant le code d'intégration fourni par Google dans un bloc de code HTML de la page Systeme.io. Le formulaire s'affiche, mais il garde l'apparence de Google, sa hauteur est fixe, et il n'envoie aucune donnée dans les contacts Systeme.io.",
  },
  {
    q: "Comment envoyer les réponses d'un Google Forms dans Systeme.io ?",
    r: "Par Zapier ou Make, avec le déclencheur qui lit la feuille de calcul liée au formulaire. Ou par un script Google Apps qui appelle directement l'API Systeme.io, ce qui est gratuit mais demande de programmer.",
  },
  {
    q: "Google Forms peut-il créer un quiz avec des profils ?",
    r: "Non. Son mode questionnaire attribue un score, pas un profil, et il ne transmet rien à un outil externe. Un quiz par profil avec tag automatique demande un outil dédié.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    filDArianeJsonLd(HOTE_VENTE, [
      { nom: "Accueil", chemin: "/" },
      { nom: "Intégrations", chemin: "/integrations" },
      { nom: "Google Forms", chemin: CHEMIN },
    ]),
    faqJsonLd(FAQ),
  ],
};

export default function GoogleFormsSystemeIo() {
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
            { nom: "Google Forms" },
          ]}
        />
        <p className="tq-etiquette mt-8">Intégrations</p>
        <h1 className="mt-3 max-w-[20ch] text-[2.4rem] sm:text-[3.2rem]">
          Connecter <span className="tq-surb">Google Forms</span> à Systeme.io
        </h1>

        <EnBref>
          <p>
            Afficher un Google Forms dans une page Systeme.io est possible avec le code
            d&apos;intégration fourni par Google, mais le formulaire garde son apparence Google et
            n&apos;envoie rien dans les contacts.
          </p>
          <p>
            Pour que les réponses deviennent des contacts avec leur tag, il faut Zapier, Make, ou un
            script Google Apps.
          </p>
        </EnBref>

        <p className="tq-doux tq-lire mt-10 leading-relaxed">
          Deux questions différentes se cachent derrière « connecter Google Forms à Systeme.io », et
          elles n&apos;ont pas la même réponse.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Afficher le formulaire dans une page Systeme.io</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Google Forms fournit un code d&apos;intégration, et Systeme.io accepte un bloc de code
          HTML dans ses pages. Techniquement, cela fonctionne.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Ce qui ne fonctionne pas, c&apos;est le reste. Le formulaire garde l&apos;apparence de
          Google, pas celle de la page. Sa hauteur est fixe, ce qui produit souvent une barre de
          défilement sur téléphone. Et il ne communique pas avec Systeme.io : une personne peut
          remplir le formulaire sans jamais devenir un contact. Elle devient une ligne dans un
          tableur.
        </p>
        <Capture
          src="/integrations/google-forms-dans-systeme-io.webp"
          alt="Un Google Forms intégré dans une page Systeme.io sur mobile, avec sa barre de défilement"
          largeur={524}
          hauteur={928}
          premiere
          legende="Le même formulaire, dans une page Systeme.io, sur un téléphone : sa hauteur est fixe, donc il défile dans sa propre boîte."
        />
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Envoyer les réponses dans les contacts</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          <strong>Avec Zapier ou Make.</strong> Déclencheur sur une nouvelle réponse, action « Create
          or Update a Contact, Including Adding Tags ». Un piège propre à Google Forms : le
          déclencheur lit la <strong>feuille de calcul liée</strong>, pas le formulaire. La feuille
          de réponses doit donc exister avant. Et l&apos;ajout d&apos;une question plus tard décale
          les colonnes, ce qui casse l&apos;association en silence.
        </p>
        <Capture
          src="/integrations/google-forms-zap-feuille.webp"
          alt="Le déclencheur Zapier lit la feuille de calcul liée au Google Forms, pas le formulaire"
          largeur={1400}
          hauteur={913}
          legende="Le déclencheur du Zap s'appelle « New or Updated Spreadsheet Row » : c'est la feuille de calcul qu'il surveille, pas le formulaire."
        />
        <p className="tq-doux tq-lire mt-8 leading-relaxed">
          <strong>Avec un script Google Apps.</strong> Gratuit et directement dans Google :
          Extensions, Apps Script, un déclencheur sur l&apos;envoi du formulaire, et un appel à
          l&apos;API Systeme.io. Là encore, l&apos;API attend l&apos;identifiant du tag et pas son
          nom : il faut chercher le tag, le créer s&apos;il manque, puis le poser sur le contact.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Le détail des limites de Zapier, chiffré :{" "}
          <Link href="/integrations/zapier-systeme-io">Zapier et Systeme.io</Link>.
        </p>
      </section>

      <section className="tq-large mt-16">
        <h2 className="text-[2rem]">Les deux questions, côte à côte</h2>
        <Tableau
          legende="Afficher le formulaire dans la page et envoyer les réponses dans les contacts sont deux choses différentes"
          entetes={[
            "",
            "Afficher le formulaire dans la page",
            "Envoyer les réponses dans les contacts",
          ]}
          lignes={[
            [
              "Possible ?",
              "Oui, avec le code d'intégration Google",
              "Oui, avec Zapier, Make ou un script Apps",
            ],
            [
              "Coût",
              "0 €",
              `0 € jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois, puis ${ZAPIER.professionnelParMois}`,
            ],
            ["Apparence", "celle de Google, hauteur fixe", "sans objet"],
            ["Le visiteur devient un contact", "Non", "Oui"],
            ["Tag différent selon la réponse", "Non", "plan Zapier payant, ou du code"],
          ]}
        />
      </section>

      <section className="tq-large mt-16 pb-24">
        <h2 className="text-[2rem]">Ce que Google Forms ne fait pas</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Un quiz qui calcule un profil et pose un tag différent selon les réponses. Le mode
          questionnaire noté de Google Forms donne un score, pas un profil, et il n&apos;envoie rien
          nulle part.
        </p>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Tiquiz couvre ce cas sans code et sans abonnement intermédiaire : la clé API Systeme.io
          collée une fois, les profils écrits, et chaque personne repart avec son tag. Le tag est
          créé dans Systeme.io s&apos;il n&apos;existe pas. C&apos;est compris dans le plan gratuit,
          à 0 €, sans carte bancaire.
        </p>
        <Capture
          src="/integrations/tiquiz-profils-tags.webp"
          alt="Les profils d'un quiz Tiquiz et le tag Systeme.io posé sur chacun"
          largeur={1400}
          hauteur={913}
          legende="Un tag par profil, réglé dans l'éditeur : c'est tout ce qu'il y a à faire."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="tq-bouton">
            Je teste gratuitement →
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
