"use client";

// app/(site)/apercu-landing-8f2c9d41/DeclencheurAnims.tsx
//
// CE QUI DÉCLENCHE SES ANIMATIONS.
//
// Ses blocs animés ne partent PAS tout seuls : leurs règles sont écrites
// `.tqvs.tqz-visible .machin { animation: ... }`, et sur sa page un petit
// script pose la classe `tqz-visible` quand le bloc arrive à ~85 % du
// viewport. Sans lui, les blocs levés sont INERTES, et ça ne se voit
// qu'à l'écran : mesuré, 0 élément animé sur les deux premiers blocs
// posés sans déclencheur.
//
// -- POURQUOI RÉÉCRIT ET PAS LEVÉ -----------------------------------
//
// Ses scripts sont minifiés, il y en a un PAR bloc, et ils parlent à des
// ids de sa page. Celui ci fait la même chose en vingt lignes, avec le
// MÊME seuil (85 %) : c'est sa mécanique, réimplémentée, et je le dis au
// lieu de laisser croire qu'elle est levée telle quelle.
//
// -- IL RELANCE, PARCE QUE C'EST CE QU'ELLE FAIT --------------------
//
// Certains de ses blocs rejouent leur scène toutes les 13,5 s (retirer
// la classe, forcer un recalcul, la remettre). C'est ce qui fait qu'on
// ne rate pas la démonstration en arrivant dessus au mauvais moment.
//
// -- ET IL RESPECTE "MOINS D'ANIMATIONS" ---------------------------
//
// `prefers-reduced-motion` : on pose la classe UNE fois, sans boucle.
// Le bloc s'affiche dans son état final au lieu de clignoter.

import { useEffect } from "react";

/** Le seuil de sa page : le bloc démarre quand son haut passe sous 85 %. */
const SEUIL = 0.85;
/** Sa cadence de relance. */
const RELANCE_MS = 13500;

export default function DeclencheurAnims() {
  useEffect(() => {
    const blocs = Array.from(
      document.querySelectorAll<HTMLElement>("[data-anim-vente] > *:not(style)"),
    );
    if (blocs.length === 0) return;

    const moinsDAnimations =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const minuteries: ReturnType<typeof setTimeout>[] = [];

    const relancer = (el: HTMLElement) => {
      el.classList.remove("tqz-visible");
      // Forcer un recalcul, sinon le navigateur regroupe le retrait et
      // l'ajout et l'animation ne repart pas.
      void el.offsetWidth;
      el.classList.add("tqz-visible");
      minuteries.push(setTimeout(() => relancer(el), RELANCE_MS));
    };

    const demarrer = (el: HTMLElement) => {
      if (el.dataset.anime === "oui") return;
      el.dataset.anime = "oui";
      el.classList.add("tqz-visible");
      if (!moinsDAnimations) minuteries.push(setTimeout(() => relancer(el), RELANCE_MS));
    };

    const regarder = () => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      for (const el of blocs) {
        const r = el.getBoundingClientRect();
        // Un bloc masqué par une media query mesure zéro : on le laisse.
        if (r.width === 0 && r.height === 0) continue;
        if (r.top < h * SEUIL && r.bottom > -40) demarrer(el);
      }
    };

    regarder();
    window.addEventListener("scroll", regarder, { passive: true });
    window.addEventListener("resize", regarder);
    return () => {
      window.removeEventListener("scroll", regarder);
      window.removeEventListener("resize", regarder);
      minuteries.forEach(clearTimeout);
    };
  }, []);

  return null;
}
