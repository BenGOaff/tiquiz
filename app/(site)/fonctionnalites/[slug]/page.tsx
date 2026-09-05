// app/(site)/fonctionnalites/[slug]/page.tsx
//
// LA PAGE DÉTAILLÉE D'UNE FONCTIONNALITÉ.
//
// Béné, 5 septembre 2026 : "sur la page détail on détaille comment ça
// marche avec des screenshot etc."
//
// -- LES CAPTURES D'ÉCRAN, ET CE QUI EST HONNÊTE ---------------------
//
// Je ne peux pas les produire d'ici. La seule que l'app sait rendre
// vient de `/visual-test`, la fixture des tests visuels : elle porte un
// bandeau "Mode aperçu" et un quiz de démonstration écrit SANS ACCENTS
// ("Quel createur de quiz es-tu ?"). La poser sur une page qui vend
// mettrait du texte de test sur l'argument.
//
// Alors chaque fonctionnalité NOMME la capture qui lui manque, et la
// page l'affiche en clair, dans un encadré qui se voit. Un espace vide
// passerait pour un oubli ; nommé, il se remplit en deux minutes dans
// un compte réel, et il disparaît dès que le fichier existe.
//
// -- LE PALIER N'EST PAS DÉCORATIF -----------------------------------
//
// "payant" ne veut pas dire PLUS. Le guide d'automatisation est dans
// les quatre paliers payants, l'analyse IA seulement dans les deux
// paliers PLUS. Les confondre ferait promettre sur cette page ce que le
// bon de commande ne donne pas.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HOTE_VENTE } from "@/lib/publicHost";

import { CSS } from "../styles";
import {
  FONCTIONNALITES,
  LIBELLE_PALIER,
  fonctionnaliteParSlug,
} from "@/lib/site/fonctionnalites";

export function generateStaticParams() {
  return FONCTIONNALITES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = fonctionnaliteParSlug(slug);
  if (!f) return {};
  return {
    title: f.nom,
    description: f.resume,
    alternates: { canonical: `${HOTE_VENTE}/fonctionnalites/${f.slug}` },
    openGraph: {
      type: "article",
      title: f.nom,
      description: f.resume,
      url: `${HOTE_VENTE}/fonctionnalites/${f.slug}`,
      siteName: "Tiquiz",
      locale: "fr_FR",
    },
  };
}

/**
 * LA COCHE EST DESSINEE, JAMAIS UN CARACTERE UNICODE.
 *
 * Un `content: "\2713"` rend tres bien dans Inter et dans aucune des
 * polices de Bene : sur Windows le navigateur sort un carre vide (drame
 * du 2 septembre). Le trace est celui de la landing, recopie a dessein :
 * son `pieces.tsx` vit dans un dossier d'apercu au nom temporaire
 * (`apercu-landing-8f2c9d41`), donc l'importer casserait ces pages le
 * jour ou la landing prendra son adresse definitive.
 */
function Coche() {
  return (
    <span aria-hidden className="tqf-coche">
      <svg viewBox="0 0 20 20" width="17" height="17">
        <mask id="tqf-m-coche">
          <rect width="20" height="20" fill="#fff" />
          <path
            d="M5.5 10.2l3 3 6-6.4"
            fill="none"
            stroke="#000"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
        <circle cx="10" cy="10" r="9" fill="currentColor" mask="url(#tqf-m-coche)" />
      </svg>
    </span>
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = fonctionnaliteParSlug(slug);
  if (!f) notFound();

  const rang = FONCTIONNALITES.findIndex((x) => x.slug === f.slug);
  const suivante = FONCTIONNALITES[(rang + 1) % FONCTIONNALITES.length];

  return (
    <main className="tqf">
      <style>{CSS}</style>
      <section className="tqf-tete">
        <div className="tqf-lire">
          <p className="tqf-fil">
            <Link href="/fonctionnalites">Les fonctionnalités</Link>
            <span> · </span>
            <span>{f.nom}</span>
          </p>
          <span className={`tqf-palier tqf-palier-${f.palier}`}>{LIBELLE_PALIER[f.palier]}</span>
          <h1>{f.nom}</h1>
          <p className="tqf-chapo">{f.resume}</p>
        </div>
      </section>

      <section className="tqf-sec">
        <div className="tqf-lire">
          {/* POURQUOI D'ABORD. Le problème avant la mécanique : sinon on
              explique comment marche quelque chose dont le lecteur ne
              sait pas encore pourquoi il en aurait besoin. */}
          <h2>Pourquoi</h2>
          <p>{f.pourquoi}</p>

          <h2>Ce que ça te rapporte</h2>
          <ul className="tqf-benefices">
            {f.benefices.map((b) => (
              <li key={b}>
                <Coche />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <h2>Comment ça marche</h2>
          <p className="tqf-court">{f.commentCourt}</p>
          {f.detail.map((d) => (
            <div key={d.titre} className="tqf-bloc">
              <h3>{d.titre}</h3>
              {d.corps.map((c) => (
                <p key={c}>{c}</p>
              ))}
            </div>
          ))}

          <p className="tqf-ou">
            <strong>Où ça se passe :</strong> {f.ou}
          </p>

          {/* LA CAPTURE MANQUANTE, DITE EN CLAIR. Voir l'en-tête. */}
          <div className="tqf-capture">
            <p className="tqf-capture-t">Capture d'écran à ajouter</p>
            <p>{f.capture}</p>
          </div>

          <div className="tqf-fin">
            <Link href="/signup" className="tqf-cta">
              Créer mon compte gratuit
            </Link>
            <p className="tqf-rassure">Gratuit, sans carte bancaire.</p>
          </div>

          <p className="tqf-suite">
            Fonctionnalité suivante :{" "}
            <Link href={`/fonctionnalites/${suivante.slug}`}>{suivante.nom}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
