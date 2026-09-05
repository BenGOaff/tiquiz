// app/(site)/apercu-landing-8f2c9d41/pieces.tsx
//
// LES PIÈCES DESSINÉES DE LA LANDING.
//
// TOUT EST UN TRACÉ SVG, JAMAIS UN CARACTÈRE UNICODE. Leçon du
// 2 septembre : `\2713` (la coche) et `\2192` (la flèche) n'existent ni
// dans Inter ni dans Open Sans, donc Windows rend un carré vide. Béné
// l'a vu sur la page de vente : "les icônes sur les boutons sont chelou
// partout".
//
// ET AUCUNE MAQUETTE N'EST UNE CAPTURE D'ÉCRAN. La seule que l'app sait
// produire vient de `/visual-test`, la fixture des tests visuels : elle
// porte un bandeau "Mode aperçu" et un quiz de démo écrit SANS ACCENTS
// ("Quel createur de quiz es-tu ?"). Dessinées, les maquettes sont
// traduites avec le reste de la page, nettes à toutes les densités, et
// elles ne pèsent rien. C'est le geste de son bloc
// `content/sales/v2/funnel-quiz.html`, qu'elle a relu trois fois.

import type { Brief, Maquette } from "@/lib/site/landing";

const T = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** La coche pleine des listes de tarif : un disque, une coche découpée. */
export function CochePleine() {
  return (
    <span aria-hidden className="tql-coche-pleine">
      <svg viewBox="0 0 20 20" width="18" height="18">
        <mask id="tql-m-coche">
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
        <circle cx="10" cy="10" r="9" fill="currentColor" mask="url(#tql-m-coche)" />
      </svg>
    </span>
  );
}

/**
 * LA CROIX DU BLOC "ce n'est pas pour toi si".
 *
 * DESSINÉE, jamais un caractère Unicode : la coche et la flèche de la
 * page de vente ont été refaites le 2 septembre pour exactement ça,
 * parce qu'un glyphe absent d'Open Sans rend un carré vide sur Windows.
 */
export function Croix() {
  return (
    <span aria-hidden className="tql-croix">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M6 6l12 12M18 6L6 18" {...T} strokeWidth="2.6" />
      </svg>
    </span>
  );
}

/** La coche fine, pour les rassurances sous un bouton. */
export function CocheFine() {
  return (
    <span aria-hidden className="tql-coche-fine">
      <svg viewBox="0 0 24 24" width="15" height="15">
        <path d="M4 12.5l5.5 5.5L20 7" {...T} strokeWidth="2.8" />
      </svg>
    </span>
  );
}

/** La flèche des boutons. */
export function Fleche() {
  return (
    <span aria-hidden className="tql-fleche-b">
      <svg viewBox="0 0 24 24" width="17" height="17">
        <path d="M4 12h15m0 0l-6-6m6 6l-6 6" {...T} strokeWidth="2.2" />
      </svg>
    </span>
  );
}

/**
 * LES SCINTILLES AUTOUR D'UN BOUTON.
 *
 * C'est son geste, relevé sur sa page de vente : une dispersion de
 * petits points bleus et cyan au dessus du bouton principal. Les
 * positions sont FIGÉES et pas tirées au hasard : un rendu serveur qui
 * tire un nombre aléatoire ne correspond pas à l'hydratation du client,
 * et React se plaint.
 */
const POINTS: readonly { x: number; y: number; r: number; c: 1 | 2 }[] = [
  { x: 4, y: 58, r: 3, c: 1 },
  { x: 12, y: 22, r: 2, c: 2 },
  { x: 19, y: 74, r: 4, c: 1 },
  { x: 27, y: 8, r: 2, c: 1 },
  { x: 34, y: 40, r: 3, c: 2 },
  { x: 45, y: 12, r: 2, c: 1 },
  { x: 58, y: 30, r: 4, c: 2 },
  { x: 67, y: 6, r: 2, c: 1 },
  { x: 74, y: 62, r: 3, c: 1 },
  { x: 83, y: 26, r: 2, c: 2 },
  { x: 91, y: 70, r: 4, c: 1 },
  { x: 97, y: 38, r: 2, c: 2 },
];

export function Scintilles() {
  return (
    <span aria-hidden className="tql-scint">
      {POINTS.map((p, i) => (
        <span
          key={i}
          className={p.c === 1 ? "tql-pt tql-pt-b" : "tql-pt tql-pt-c"}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.r, height: p.r }}
        />
      ))}
    </span>
  );
}

/**
 * LES SIX PICTOGRAMMES DE LA GRILLE "TON QUIZ VA LÀ OÙ TU ES DÉJÀ".
 *
 * Dessinés à la main, dans l'ordre des six carreaux. Recopier les
 * tracés d'une bibliothèque d'icônes serait recopier du code sous
 * licence pour éviter d'en charger la police.
 */
const PICTOS: readonly string[] = [
  "M3 4h18l-7 8v7l-4 2v-9L3 4z", // un entonnoir : un tunnel Systeme.io
  "M4 5h16v14H4zM4 9h16M8 9v10", // une page avec barre latérale : WordPress
  "M5 4h14v16H5zM8 8h8M8 12h8M7 16h10v3H7z", // une page de vente et son bouton
  "M4 5h16M4 10h16M4 15h10", // des lignes de texte : un article
  "M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.4 2.5 15.6 0 18m0-18c-2.5 2.4-2.5 15.6 0 18", // un globe : ton domaine
  "M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1 1m0 8a5 5 0 01-7.5-.5l-2 2a5 5 0 007 7l1-1", // un lien : ailleurs
];

export function Picto({ i }: { i: number }) {
  return (
    <span aria-hidden className="tql-picto">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d={PICTOS[i % PICTOS.length]} {...T} strokeWidth="1.6" />
      </svg>
    </span>
  );
}

/** La flèche vers le bas des cartes de funnel. */
export function FlecheBas() {
  return (
    <span aria-hidden className="tql-fleche-bas">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M12 4v15m0 0l-6-6m6 6l6-6" {...T} strokeWidth="2" />
      </svg>
    </span>
  );
}

/** Le chevron d'une question de la FAQ. */
export function Chevron() {
  return (
    <span aria-hidden className="tql-chev">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M6 9l6 6 6-6" {...T} strokeWidth="2.2" />
      </svg>
    </span>
  );
}

/**
 * LA MAQUETTE DU HAUT DE PAGE : une question de quiz en cours.
 *
 * Elle montre le produit au lieu de le décrire, ce qui est le seul
 * geste que toutes les landings qui vendent ont en commun.
 */
export function MaquetteQuiz({ m }: { m: Maquette }) {
  return (
    <div className="tql-maq" aria-hidden>
      <div className="tql-maq-tete">
        <span className="tql-maq-pt" />
        <span className="tql-maq-pt" />
        <span className="tql-maq-pt" />
        <span className="tql-maq-url">quiz.tonsite.fr</span>
      </div>
      <div className="tql-maq-corps">
        <div className="tql-maq-barre">
          <span style={{ width: "34%" }} />
        </div>
        <p className="tql-maq-prog">{m.progression}</p>
        <p className="tql-maq-q">{m.question}</p>
        {m.reponses.map((r, i) => (
          <p key={r} className={i === m.choisie ? "tql-maq-r tql-maq-r-on" : "tql-maq-r"}>
            <span className="tql-maq-puce" />
            {r}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Le bloc de code sombre : les six lignes à coller. */
export function BlocCode() {
  return (
    <pre className="tql-code" aria-hidden>
      {`<iframe
  src="https://quiz.tonsite.fr/mon-quiz"
  width="100%" height="600"
  style="border:0"
  loading="lazy">
</iframe>`}
    </pre>
  );
}

/** Le lien nu, dans un champ, avec son bouton Copier. */
export function ChampLien({ copier }: { copier: string }) {
  return (
    <div className="tql-champ" aria-hidden>
      <span className="tql-champ-url">https://quiz.tonsite.fr/mon-quiz</span>
      <span className="tql-champ-b">{copier}</span>
    </div>
  );
}

/**
 * LA MAQUETTE DU BRIEF : les trois champs qu'on remplit vraiment.
 *
 * L'étape 1 réutilisait la maquette du quiz, donc la page montrait deux
 * fois le même écran. Celle là montre ce que l'étape 1 fait DIRE : trois
 * champs, pas un formulaire de dix minutes.
 */
export function MaquetteBrief({ b }: { b: Brief }) {
  return (
    <div className="tql-maq" aria-hidden>
      <div className="tql-maq-tete">
        <span className="tql-maq-pt" />
        <span className="tql-maq-pt" />
        <span className="tql-maq-pt" />
        <span className="tql-maq-url">{b.titre}</span>
      </div>
      <div className="tql-maq-corps">
        {b.champs.map((c) => (
          <div key={c.etiquette} className="tql-brief-champ">
            <p className="tql-brief-lab">{c.etiquette}</p>
            <p className="tql-brief-val">{c.valeur}</p>
          </div>
        ))}
        <p className="tql-brief-b">{b.bouton}</p>
      </div>
    </div>
  );
}
