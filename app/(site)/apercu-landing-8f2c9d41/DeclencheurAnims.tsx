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
//
// -- POURQUOI UN OBSERVATEUR, ET UN FILET DERRIÈRE -----------------
//
// Le premier jet ne regardait les blocs que sur `scroll` et `resize`,
// et il laissait `tes-pixels` INERTE. MESURÉ le 5 septembre, position
// par position : un bloc peut être FRANCHI D'UN COUP, sans qu'aucune
// image de la page ne le montre dans la fenêtre. Ça arrive à une vraie
// lectrice qui appuie sur Fin, qui clique une ancre du menu, ou qui
// jette la molette. Le bloc reste alors figé pour toujours, dans son
// état d'avant l'animation, et ça ne se voit pas : il s'affiche très
// bien, il ne bouge simplement jamais.
//
// DEUX MÉCANIQUES, ET CHACUNE COUVRE CE QUE L'AUTRE NE PEUT PAS :
//
//   `IntersectionObserver` voit un bloc ENTRER dans la zone même sans
//   défilement (la page s'allonge, une image arrive, un reflow) ;
//   il ne dit RIEN quand un saut le fait passer de "en dessous" à
//   "au dessus" sans image intermédiaire : pas de changement d'état,
//   donc pas d'entrée.
//
//   Le filet sur `scroll` rattrape exactement ce cas là, parce que sa
//   règle est "le haut du bloc est passé sous 85 % du viewport", et
//   qu'un bloc franchi l'a forcément passé.
//
// LE `bottom > -40` DU PREMIER JET EST CE QUI COÛTAIT LE BUG : il
// refusait de démarrer un bloc déjà remonté au dessus de l'écran, donc
// un bloc franchi restait figé. Un bloc dépassé A ÉTÉ VU : on le
// démarre. `demarrer` est idempotent (`data-anime`), donc les deux
// mécaniques peuvent le réclamer sans se marcher dessus.

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

    // DEUX DÉCLENCHEURS, PAS UN, ET C'EST MESURÉ.
    //
    // Ses blocs se répartissent en deux familles de classes : les uns
    // s'animent sur `.tqz-visible`, les autres sur `.tqz1-visible`. Le
    // premier jet ne posait que la première : SIX des neuf blocs levés
    // le 5 septembre restaient INERTES, et ça ne se voit qu'à l'écran
    // (c'est déjà exactement ce qui était arrivé aux trois premiers).
    //
    // On pose les deux : une classe qu'un bloc n'utilise pas ne lui
    // coûte rien, une classe manquante lui coûte son animation.
    const DECLENCHEURS = ["tqz-visible", "tqz1-visible"];

    const relancer = (el: HTMLElement) => {
      el.classList.remove(...DECLENCHEURS);
      // Forcer un recalcul, sinon le navigateur regroupe le retrait et
      // l'ajout et l'animation ne repart pas.
      void el.offsetWidth;
      el.classList.add(...DECLENCHEURS);
      minuteries.push(setTimeout(() => relancer(el), RELANCE_MS));
    };

    const demarrer = (el: HTMLElement) => {
      if (el.dataset.anime === "oui") return;
      el.dataset.anime = "oui";
      el.classList.add(...DECLENCHEURS);
      if (!moinsDAnimations) minuteries.push(setTimeout(() => relancer(el), RELANCE_MS));
    };

    // LA RÈGLE, ÉCRITE UNE FOIS : le haut du bloc est passé sous 85 %
    // du viewport. Un bloc DÉJÀ REMONTÉ au dessus de l'écran la vérifie
    // aussi, et c'est voulu : il a forcément été franchi.
    const passeLeSeuil = (el: HTMLElement) => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      return el.getBoundingClientRect().top < h * SEUIL;
    };

    const balayer = () => {
      for (const el of blocs) if (passeLeSeuil(el)) demarrer(el);
    };

    // Rogner 15 % en bas de la zone d'observation revient exactement à
    // la même règle : on ne la réécrit pas, on la traduit.
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting || passeLeSeuil(e.target as HTMLElement)) {
            demarrer(e.target as HTMLElement);
          }
        }
      },
      { rootMargin: `0px 0px -${Math.round((1 - SEUIL) * 100)}% 0px` },
    );
    for (const el of blocs) observateur.observe(el);

    balayer();
    window.addEventListener("scroll", balayer, { passive: true });
    window.addEventListener("resize", balayer);
    return () => {
      observateur.disconnect();
      window.removeEventListener("scroll", balayer);
      window.removeEventListener("resize", balayer);
      minuteries.forEach(clearTimeout);
    };
  }, []);

  return null;
}
