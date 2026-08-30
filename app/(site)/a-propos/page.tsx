// app/(site)/a-propos/page.tsx
//
// LA PAGE À PROPOS. Remplace `tipote.fr/benedicte-lagardette`.
//
// -- CE QUE JE N'AI PAS ÉCRIT, ET POURQUOI -----------------------------
//
// Sa biographie. Je n'ai aucune source vérifiable sur son parcours, et
// sa règle numéro un est de ne jamais rien affirmer de faux. Une page
// "à propos" remplie d'un récit inventé serait exactement le genre de
// texte qu'elle repère en trois lignes, et le pire endroit possible pour
// se le permettre : c'est la page où on demande de lui faire confiance.
//
// Cette page dit donc ce qui EST vérifiable : ce qu'elle construit, avec
// quoi, pour qui, et les règles qu'elle s'impose. Le récit personnel
// est à ajouter par elle.
//
// Les données structurées `Person` + `Organization` sont ici et pas
// ailleurs : c'est la page qui relie un nom à une entreprise, et c'est
// ce qu'un moteur cherche sur une requête de marque.

import Link from "next/link";
import type { Metadata } from "next";

import { HOTE_VENTE } from "@/lib/publicHost";
import { COMPANY } from "@/lib/legal/company";

const TITRE = "Bénédicte Lagardette, fondatrice de Tiquiz";
const DESCRIPTION =
  "Qui écrit derrière Tiquiz et l'Atelier du Quiz, ce qu'elle construit, et les règles qu'elle s'impose. Pas de promesse en l'air, pas de faux chiffre.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}/a-propos` },
  openGraph: {
    type: "profile",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}/a-propos`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: COMPANY.director,
  url: `${HOTE_VENTE}/a-propos`,
  jobTitle: "Fondatrice de Tiquiz",
  worksFor: {
    "@type": "Organization",
    name: COMPANY.name,
    url: HOTE_VENTE,
    vatID: COMPANY.vat,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.address,
      addressCountry: "FR",
    },
  },
};

export default function PageAPropos() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="mx-auto max-w-3xl px-5 pt-14 sm:px-8 sm:pt-20">
        <p className="tq-etiquette">À propos</p>
        <h1 className="mt-3 text-[2.4rem] sm:text-[3.2rem]">
          Salut, moi c&apos;est <span className="tq-surb">Béné</span>
        </h1>
        <p className="tq-doux mt-6 text-[1.15rem] leading-relaxed">
          Je construis Tiquiz, l&apos;Atelier du Quiz et Tipote. Et je m&apos;en sers moi-même :
          mes propres quiz ramènent mes propres clients, c&apos;est comme ça que je sais ce qui
          marche et ce qui ne marche pas.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h2 className="text-[1.75rem]">Ce que je construis</h2>
        <div className="mt-7 space-y-7">
          <div>
            <h3 className="text-[1.1rem]">Tiquiz</h3>
            <p className="tq-doux mt-2 leading-relaxed">
              Le logiciel. Tu décris ton sujet, l&apos;IA écrit le quiz (questions, réponses,
              profils), tu relis, tu remplaces deux ou trois formulations par les tiennes, et
              c&apos;est en ligne. Les leads arrivent dans Systeme.io déjà taggés par profil, sans
              Zapier ni Make.
            </p>
          </div>
          <div>
            <h3 className="text-[1.1rem]">L&apos;Atelier du Quiz</h3>
            <p className="tq-doux mt-2 leading-relaxed">
              La méthode. Sept jours, une étape par jour, et je réponds du premier au dernier.
              L&apos;outil ne sert à rien si les questions sont mauvaises : l&apos;Atelier, c&apos;est
              la partie que le logiciel ne peut pas faire à ta place.
            </p>
          </div>
          <div>
            <h3 className="text-[1.1rem]">Tipote</h3>
            <p className="tq-doux mt-2 leading-relaxed">
              Le coaching IA et la création de contenus, pour les solopreneurs, les coachs, les
              consultants, les affiliés et les freelances.
            </p>
          </div>
        </div>
      </section>

      {/* LES RÈGLES. C'est le vrai contenu d'une page "à propos" :
          pas un CV, mais ce sur quoi on peut la juger. */}
      <section className="bg-[var(--tq-panneau)] py-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-[1.75rem]">Ce que je ne ferai pas</h2>
          <p className="tq-doux mt-3 leading-relaxed">
            Autant l&apos;écrire, comme ça tu peux me le reprocher si je dérape.
          </p>
          <ul className="mt-7 space-y-5">
            <li>
              <p className="font-semibold">Aucun chiffre sans source.</p>
              <p className="tq-doux mt-1 leading-relaxed">
                Si je cite un taux de conversion, je dis d&apos;où il vient. Si je te raconte un cas
                client, la personne a donné son accord et les chiffres sont les siens.
              </p>
            </li>
            <li>
              <p className="font-semibold">Aucune fausse urgence.</p>
              <p className="tq-doux mt-1 leading-relaxed">
                Pas de compte à rebours qui se remet à zéro, pas de portes qui ferment alors
                qu&apos;elles ne ferment pas, pas de hausse de tarif annoncée qui n&apos;arrive
                jamais. Quand quelque chose s&apos;arrête vraiment, je le dis, et ça s&apos;arrête.
              </p>
            </li>
            <li>
              <p className="font-semibold">Je ne recommande que ce que j&apos;ai testé.</p>
              <p className="tq-doux mt-1 leading-relaxed">
                Si je n&apos;ai rien de vrai à dire sur un outil, je me tais. Et il m&apos;arrive de
                dire à quelqu&apos;un que ce n&apos;est pas pour lui : ça m&apos;a fait perdre des
                ventes, et je continuerai.
              </p>
            </li>
            <li>
              <p className="font-semibold">Je réponds moi-même.</p>
              <p className="tq-doux mt-1 leading-relaxed">
                Le support, c&apos;est moi. Pas un centre d&apos;appel, pas un robot qui te renvoie
                vers une page d&apos;aide.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h2 className="text-[1.75rem]">Pour qui</h2>
        <p className="tq-doux mt-4 leading-relaxed">
          Gwenn, Martine, Omar, Christian, Denis. Des infopreneurs, des coachs, des consultants,
          des affiliés, des solopreneurs. Des gens qui ont une audience, parfois petite, et qui
          savent qu&apos;une liste d&apos;emails vaut plus qu&apos;un compteur d&apos;abonnés.
        </p>
        <p className="tq-doux mt-4 leading-relaxed">
          Jocelyne, par exemple, écrit des romans. Elle a monté un quiz sur le TDAH et rassemblé 285
          inscrites en 9 jours, avec 63,50 € de publicité (elle a donné son accord pour que je le
          raconte). Ce n&apos;est ni un miracle ni une exception : c&apos;est ce que fait un bon
          quiz quand les questions sont les bonnes.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/blog" className="tq-bouton">
            Lire le blog
          </Link>
          <Link href="/newsletter" className="tq-bouton tq-bouton-fantome">
            Recevoir la newsletter
          </Link>
          <Link href="/support" className="tq-bouton tq-bouton-fantome">
            M&apos;écrire
          </Link>
        </div>

        <p className="tq-doux mt-12 text-sm leading-relaxed">
          Tiquiz et l&apos;Atelier du Quiz sont édités par {COMPANY.name} ({COMPANY.form}), dont je
          suis la dirigeante. L&apos;adresse et les mentions complètes sont sur la{" "}
          <a
            href="/mentions-legales"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            page des mentions légales
          </a>
          .
        </p>
      </section>
    </main>
  );
}
