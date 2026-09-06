"use client";

// components/landing/DeclencheurAnims.tsx
//
// CE QUI DÉCLENCHE SES ANIMATIONS, ET CE QUI GARANTIT QU'AUCUN BLOC NE
// RESTE VIDE.
//
// Béné, 6 septembre 2026 : "les animations au scroll laissent des écrans
// blancs. En scrollant vite, des sections entières restent invisibles."
//
// -- POURQUOI ÇA ARRIVAIT, MESURÉ ------------------------------------
//
// Ses règles s'écrivent `.tqvs.tqz-visible .machin{animation:...}`, et
// les onze îles portent entre 3 et 19 déclarations `opacity:0` dans leur
// état de départ (compté fichier par fichier). Un bloc que le
// déclencheur n'atteignait pas ne restait donc pas "figé mais lisible" :
// il restait PARTIELLEMENT VIDE, et ça ne se voit sur aucune capture.
//
// -- LA CORRECTION TIENT EN TROIS TEMPS, ET L'ORDRE COMPTE -----------
//
//   1. le SERVEUR envoie le bloc DÉJÀ révélé (`assurerRevele`, dans
//      `anims.tsx`) : sans JavaScript, sans réseau, sur un robot ou un
//      lecteur d'écran, il s'affiche entier ;
//   2. au MONTAGE, on retire la classe sur les seuls blocs encore hors
//      de l'écran. C'est le sens qu'elle demande : "l'état masqué n'est
//      appliqué qu'après le montage côté client" ;
//   3. l'observateur la remet quand le bloc entre, et NE LA RETIRE PLUS
//      JAMAIS : "une fois l'élément révélé il le reste définitivement".
//
// Si l'étape 2 ou 3 ne s'exécute pas (script bloqué, erreur ailleurs
// dans la page, navigateur ancien), le bloc reste dans l'état de
// l'étape 1, c'est à dire visible. Le sens de l'erreur est donc sûr :
// au pire une animation ne se rejoue pas, jamais un écran blanc.
//
// -- LE SEUIL : SA MARGE DE 10 % -------------------------------------
//
// `rootMargin: "0px 0px -10% 0px"` rogne 10 % en bas de la zone
// d'observation : le bloc se déclenche quand son haut a passé 90 % du
// viewport. C'est le réglage qu'elle demande, et l'observateur voit
// aussi un bloc qui ENTRE sans défilement (la page s'allonge, une image
// arrive, un reflow).
//
// -- ET LE FILET, PARCE QU'UN OBSERVATEUR NE VOIT PAS UN SAUT --------
//
// Un `IntersectionObserver` ne dit RIEN quand un saut fait passer un
// bloc de "en dessous" à "au dessus" sans image intermédiaire : pas de
// changement d'état, donc pas d'entrée. Ça arrive à une vraie lectrice
// qui appuie sur Fin, qui clique une ancre du menu, ou qui jette la
// molette. Le balayage sur `scroll` rattrape exactement ce cas, parce
// que sa règle est "le haut du bloc est passé sous le seuil", et qu'un
// bloc franchi l'a forcément passé.
//
// -- ET ON RESPECTE "MOINS D'ANIMATIONS" -----------------------------
//
// `prefers-reduced-motion: reduce` : on ne retire RIEN, donc rien ne
// bouge et tout reste visible. C'est le seul comportement qui tienne les
// deux promesses en même temps.
//
// -- CE QUI A ÉTÉ RETIRÉ, ET POURQUOI --------------------------------
//
// La relance toutes les 13,5 s (sa mécanique, reprise en août) retirait
// la classe pendant une image pour rejouer la scène. C'est exactement ce
// qu'elle interdit désormais : "une fois l'élément révélé il le reste
// définitivement". Un retrait d'une image sur un bloc à 19 `opacity:0`,
// c'est un clignotement blanc sous les yeux de quelqu'un qui lit.

import { useEffect } from "react";

// ON LIT LE MODULE PUR, JAMAIS `anims.tsx`. Celui-ci lit le disque
// (`node:fs`) : importé depuis un composant client, il casse le bundle
// avec "the chunking context does not support external modules". `tsc`
// répond exit 0 dessus, seul le filet de captures l'attrape.
import { DECLENCHEURS } from "@/lib/site/blocsAnimes";

/** Sa marge : le bloc part quand son haut a passé 90 % du viewport. */
const MARGE_BASSE_PCT = 10;
const SEUIL = 1 - MARGE_BASSE_PCT / 100;

export default function DeclencheurAnims() {
  useEffect(() => {
    const blocs = Array.from(
      document.querySelectorAll<HTMLElement>("[data-anim-vente] > *:not(style)"),
    );
    if (blocs.length === 0) return;

    // MOINS D'ANIMATIONS : on ne touche à rien. Les blocs sont servis
    // révélés, donc tout est visible et rien ne s'anime en boucle.
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const classes = [...DECLENCHEURS];

    // LA RÈGLE, ÉCRITE UNE FOIS : le haut du bloc est passé sous le
    // seuil. Un bloc DÉJÀ REMONTÉ au dessus de l'écran la vérifie aussi,
    // et c'est voulu : il a forcément été franchi.
    const passeLeSeuil = (el: HTMLElement) => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      return el.getBoundingClientRect().top < h * SEUIL;
    };

    const reveler = (el: HTMLElement) => {
      if (el.dataset.revele === "oui") return;
      el.dataset.revele = "oui";
      el.classList.add(...classes);
    };

    // L'ÉTAT MASQUÉ EST POSÉ ICI, ET NULLE PART AILLEURS. Un bloc déjà
    // visible à l'ouverture n'est jamais masqué : le masquer puis le
    // révéler dans la même image ferait clignoter le premier écran.
    for (const el of blocs) {
      if (passeLeSeuil(el)) {
        el.dataset.revele = "oui";
      } else {
        el.classList.remove(...classes);
      }
    }

    const balayer = () => {
      for (const el of blocs) if (passeLeSeuil(el)) reveler(el);
    };

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting || passeLeSeuil(el)) reveler(el);
        }
      },
      { rootMargin: `0px 0px -${MARGE_BASSE_PCT}% 0px` },
    );
    for (const el of blocs) observateur.observe(el);

    balayer();
    window.addEventListener("scroll", balayer, { passive: true });
    window.addEventListener("resize", balayer);
    return () => {
      observateur.disconnect();
      window.removeEventListener("scroll", balayer);
      window.removeEventListener("resize", balayer);
    };
  }, []);

  return null;
}
