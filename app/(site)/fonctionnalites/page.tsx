// app/(site)/fonctionnalites/page.tsx
//
// LE HUB DES FONCTIONNALITÉS.
//
// Béné, 5 septembre 2026 : "je veux aussi une page avec le détail de
// chaque fonctionnalité pour creuser le sujet : sur la landing on
// présente pourquoi cette fonctionnalité + les bénéfices + comment ça
// marche en une phrase. Sur la page détail on détaille comment ça
// marche avec des screenshot etc."
//
// Cette page est la porte : une carte par fonctionnalité, son palier,
// et sa phrase. Le détail vit sur `/fonctionnalites/<slug>`.
//
// LE TEXTE VIENT DE `lib/site/fonctionnalites.ts`, ET IL EST LE MÊME
// QUE CELUI DE LA LANDING. Écrire ici une deuxième version des mêmes
// arguments donnerait, dans six mois, une landing qui promet ce que la
// page détaillée ne décrit plus. C'est le défaut le plus cher de ce
// dépôt, sorti sept fois.

import Link from "next/link";
import type { Metadata } from "next";

import { HOTE_VENTE } from "@/lib/publicHost";

import { CSS } from "./styles";
import { FONCTIONNALITES, LIBELLE_PALIER } from "@/lib/site/fonctionnalites";

const TITRE = "Tout ce que Tiquiz sait faire";
const DESCRIPTION =
  "La connexion Systeme.io, les quiz par profil ou scorés, les sondages, les Popquiz, les tags automatiques, les générateurs : chaque fonctionnalité, expliquée en détail.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}/fonctionnalites` },
  openGraph: {
    type: "website",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}/fonctionnalites`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
};

export default function Page() {
  return (
    <main className="tqf">
      <style>{CSS}</style>
      <section className="tqf-tete">
        <div className="tqf-large">
          <h1>Tout ce que Tiquiz sait faire</h1>
          {/* LE NOMBRE VIENT DE LA LISTE, jamais écrit à la main : il
              a annoncé "quatorze" pendant que la liste en portait huit,
              et personne ne l'aurait vu depuis le code. */}
          <p className="tqf-chapo">
            {FONCTIONNALITES.length} fonctionnalités, expliquées une par une : à quoi
            elles servent, ce qu'elles te rapportent, et comment elles marchent
            vraiment. Clique sur celle qui t'intéresse.
          </p>
        </div>
      </section>

      <section className="tqf-sec">
        <div className="tqf-large">
          <div className="tqf-grille">
            {FONCTIONNALITES.map((f) => (
              <Link key={f.slug} href={`/fonctionnalites/${f.slug}`} className="tqf-carte">
                <span className={`tqf-palier tqf-palier-${f.palier}`}>
                  {LIBELLE_PALIER[f.palier]}
                </span>
                <h2>{f.nom}</h2>
                <p>{f.resume}</p>
                <span className="tqf-lire">Le détail</span>
              </Link>
            ))}
          </div>

          {/* LE MAILLAGE : le hub mène aux huit enfants ET au tarif. */}
          <div className="tqf-fin">
            <Link href="/tarifs" className="tqf-cta">
              Voir les tarifs
            </Link>
            <p className="tqf-rassure">Le premier palier ne coûte rien, et il n'expire pas.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
