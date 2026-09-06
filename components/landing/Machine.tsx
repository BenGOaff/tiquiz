"use client";

// components/landing/Machine.tsx
//
// LE TITRE QUI TOURNE, EN FONDU ENCHAÎNÉ.
//
// Béné, 6 septembre 2026 : "réduis le tableau à 3 entrées, dans cet
// ordre exact. Remplace l'effet machine à écrire par un fondu enchaîné :
// le mot doit toujours être affiché en entier, jamais tronqué lettre
// par lettre. Durée d'affichage 3 s, transition 400 ms."
//
// -- POURQUOI LE FONDU, ET PAS LA MACHINE À ÉCRIRE -------------------
//
// La machine à écrire montre un mot COUPÉ pendant les trois quarts du
// cycle : "Booste ton tra", "Booste ton t", "Booste ton". Sur un H1,
// c'est la phrase la plus importante de la page qui passe son temps à
// être fausse, et un lecteur qui arrive au mauvais moment lit un mot
// tronqué. Le fondu ne montre jamais que des phrases entières.
//
// -- LE PREMIER MOT EST RENDU PAR LE SERVEUR -------------------------
//
// C'est lui que reçoit un lecteur sans JavaScript, et c'est lui que lit
// un moteur : `mots[0]` est écrit dans le HTML, la boucle ne fait que
// le remplacer ensuite. Un titre vide au premier rendu serait un `<h1>`
// vide pour Google.
//
// -- LA LIGNE NE DOIT PAS CHANGER DE HAUTEUR -------------------------
//
// Ses trois phrases n'ont pas la même longueur. `white-space: nowrap`
// tient la hauteur sur grand écran ; sous 900 px le texte a le droit de
// revenir à la ligne, comme chez elle.
//
// ON NE POSE PAS DE GABARIT INVISIBLE derrière le mot : il porterait la
// phrase la plus longue dans le DOM, donc le `<h1>` contiendrait deux
// titres à la suite pour un moteur de recherche.
//
// -- ET ON RESPECTE "MOINS D'ANIMATIONS" -----------------------------
//
// `prefers-reduced-motion` : le premier mot reste affiché, sans boucle
// et sans fondu.

import { useEffect, useRef, useState } from "react";

/** Ses deux durées, en millisecondes. */
const AFFICHAGE = 3000;
const TRANSITION = 400;

export default function Machine({ mots }: { mots: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [estompe, setEstompe] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mots.length < 2) return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let vivant = true;

    // LE CYCLE : on affiche, on estompe, ON CHANGE LE MOT PENDANT QU'IL
    // EST INVISIBLE, puis on le ramène. Changer le texte avant la fin de
    // la transition ferait voir le mot suivant en train d'apparaître par
    // dessus le précédent.
    const tour = () => {
      if (!vivant) return;
      setEstompe(true);
      minuterie.current = setTimeout(() => {
        if (!vivant) return;
        setIndex((i) => (i + 1) % mots.length);
        setEstompe(false);
        minuterie.current = setTimeout(tour, AFFICHAGE);
      }, TRANSITION);
    };

    minuterie.current = setTimeout(tour, AFFICHAGE);
    return () => {
      vivant = false;
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, [mots]);

  return (
    <span className={`tql-fondu${estompe ? " tql-fondu-off" : ""}`}>
      {mots[index] ?? mots[0]}
    </span>
  );
}
