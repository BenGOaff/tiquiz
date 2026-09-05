"use client";

// app/(site)/apercu-landing-8f2c9d41/Machine.tsx
//
// LE TITRE QUI DÉFILE, MACHINE À ÉCRIRE.
//
// Béné, 5 septembre 2026 : "sur ma page initiale il n'y a pas que ça
// comme H1 : 'Booste ton trafic grâce aux quiz interactifs'. Il y a
// aussi 'génère plus de leads', 'améliore tes offres' : c'est un texte
// qui défile en mode machine à écrire mais moderne."
//
// -- SES CHIFFRES, RELEVÉS DANS SA PAGE ------------------------------
//
// `content/sales/tiquiz.html`, bloc `rawhtml-125dab43` : 85 ms par
// lettre à l'écriture, 1400 ms de pause une fois le mot écrit, 45 ms à
// l'effacement, 250 ms avant le mot suivant. Ils ne sont pas choisis,
// ils sont LEVÉS : un rythme réinventé donnerait une page qui ressemble
// à la sienne sans lui ressembler.
//
// -- LE PREMIER MOT EST RENDU PAR LE SERVEUR -------------------------
//
// C'est lui que reçoit un lecteur sans JavaScript, et c'est lui que lit
// un moteur : `mots[0]` est écrit dans le HTML, l'animation ne fait que
// le remplacer ensuite. Un titre vide au premier rendu serait un `<h1>`
// vide pour Google.
//
// -- LA LIGNE NE DOIT PAS CHANGER DE HAUTEUR ------------------------
//
// Ses cinq phrases n'ont pas la même longueur. Si l'une d'elles passait
// sur deux lignes, toute la page sauterait cinq fois par cycle, sous
// les yeux de quelqu'un qui lit. Sa page tient ça par `white-space:
// nowrap` sur grand écran ; en dessous de 900 px le texte a le droit de
// revenir à la ligne, et c'est mesuré phrase par phrase avant d'être
// accepté (voir `tests/visual/landing-paddings.spec.ts`).
//
// ON NE POSE PAS DE GABARIT INVISIBLE derrière le mot : il porterait la
// phrase la plus longue dans le DOM, donc le `<h1>` contiendrait deux
// titres à la suite pour un moteur de recherche.
//
// -- ET ON RESPECTE "MOINS D'ANIMATIONS" -----------------------------
//
// `prefers-reduced-motion` : le premier mot reste affiché, sans boucle
// et sans curseur clignotant.

import { useEffect, useRef, useState } from "react";

/** Ses quatre durées, en millisecondes. */
const ECRITURE = 85;
const PAUSE = 1400;
const EFFACEMENT = 45;
const AVANT_LE_SUIVANT = 250;

export default function Machine({ mots }: { mots: readonly string[] }) {
  const [texte, setTexte] = useState(mots[0] ?? "");
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mots.length < 2) return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let motIndex = 0;
    let lettre = mots[0].length;
    let efface = true;
    let vivant = true;

    const tour = () => {
      if (!vivant) return;
      const mot = mots[motIndex];

      if (efface) {
        lettre -= 1;
        setTexte(mot.slice(0, lettre));
        if (lettre > 0) {
          minuterie.current = setTimeout(tour, EFFACEMENT);
        } else {
          efface = false;
          motIndex = (motIndex + 1) % mots.length;
          minuterie.current = setTimeout(tour, AVANT_LE_SUIVANT);
        }
        return;
      }

      lettre += 1;
      setTexte(mot.slice(0, lettre));
      if (lettre < mot.length) {
        minuterie.current = setTimeout(tour, ECRITURE);
      } else {
        efface = true;
        minuterie.current = setTimeout(tour, PAUSE);
      }
    };

    minuterie.current = setTimeout(tour, PAUSE);
    return () => {
      vivant = false;
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, [mots]);

  return (
    <span className="tql-machine">
      {texte}
      <span aria-hidden className="tql-curseur tql-curseur-cy" />
    </span>
  );
}
