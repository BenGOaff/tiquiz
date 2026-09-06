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
  fonctionnalitesLiees,
} from "@/lib/site/fonctionnalites";
import { AnimVente } from "@/components/landing/anims";
import DeclencheurAnims from "@/components/landing/DeclencheurAnims";

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
 * du 2 septembre). Le trace est celui de la landing, ET IL RESTE
 * RECOPIE, pour une raison qui a change le 6 septembre : `pieces.tsx`
 * vit maintenant dans `components/landing/`, donc il serait importable,
 * mais son `CochePleine` porte la classe `tql-coche-pleine`, stylee dans
 * la feuille de la landing. L'importer ici donnerait une coche sans
 * taille ni couleur : c'est le TRACE qui est partage, pas l'habillage.
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

  const voisines = fonctionnalitesLiees(f);

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

          {/* SON VISUEL, DÉPLACÉ TEL QUEL. C'est le bloc animé de la
              section correspondante de sa page de vente, levé à l'octet
              près : "chaque page reprend la section correspondante de la
              page actuelle, telle qu'elle est écrite, avec son visuel."

              LA FEUILLE DE LA LANDING NE VIENT PAS AVEC, et c'est
              vérifié : chaque île porte son propre `<style>`, et
              `DeclencheurAnims` ne travaille que sur `[data-anim-vente]`,
              sans lire une seule classe `tql-`. La poser ici aurait
              chargé 30 Ko de CSS pour rien.

              QUATRE PAGES SUR HUIT N'EN ONT PAS, et rien ne s'affiche :
              un visuel inventé pour combler serait pire que son
              absence. */}
          {f.visuel ? (
            <div className="tqf-visuel">
              <DeclencheurAnims />
              <AnimVente bloc={f.visuel} />
            </div>
          ) : null}

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
            <p className="tqf-tarifs">
              <Link href="/tarifs">Le détail de chaque palier</Link>
            </p>
          </div>

          {/* LES DEUX VOISINES, ET PAS "LA SUIVANTE". Un enchaînement
              circulaire mène au hasard : quelqu'un qui lit la connexion
              Systeme.io se demande ce que sont les profils, pas ce qui
              vient après dans la liste. Les deux slugs sont déclarés à
              côté de la fonctionnalité, et le test exige qu'ils existent
              et qu'aucune page ne se cite elle même. */}
          {voisines.length > 0 ? (
            <div className="tqf-voisines">
              <p className="tqf-voisines-t">À lire aussi</p>
              <ul>
                {voisines.map((v) => (
                  <li key={v.slug}>
                    <Link href={`/fonctionnalites/${v.slug}`}>{v.nom}</Link>
                    <span>{v.resume}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
