"use client";

// components/sales/AnimatedBlock.tsx
//
// Injecte le markup d'un bloc d'animation (lib/salesAnimations). Le style
// et les @keyframes vivent dans components/sales/sales-animations.css.
// Les animations d'entree sont gatees derriere la classe `.tqz-play`
// posee sur le wrapper : elles se declenchent UNE fois quand le bloc
// entre dans le viewport (comme l'originale), pas au chargement de la page.
//
// Garde-fou anti "boite vide" : meme si l'IntersectionObserver ne se
// declenche jamais (navigateur exotique, reduced-motion, SSR douteux), un
// timer de secours pose `.tqz-play` apres 1.2s. Le contenu finit donc
// TOUJOURS visible.
//
// Le composant est memoise (props stables) : React ne reconcilie jamais le
// markup injecte apres le montage, donc les animations CSS ne sont jamais
// relancees par un re-render parent (ex. le typewriter du hero).

import { memo, useEffect, useRef } from "react";

export type BlockBehavior = "type-qb" | "type-sh" | "count-fb";

const QB_TEXT =
  "Je veux un quiz pour qualifier mes visiteurs prêts à commander ma formation sur l'éducation canine";
const SH_URL = "https://app.tiquiz.com/sandra-costa/formation-canine";

function typeInto(el: HTMLElement, text: string, speed: number, timers: number[]) {
  let i = 0;
  el.textContent = "";
  const id = window.setInterval(() => {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
    } else {
      window.clearInterval(id);
    }
  }, speed);
  timers.push(id);
}

function countTo(el: HTMLElement, target: number, duration: number) {
  let start: number | null = null;
  const step = (ts: number) => {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    el.textContent = String(Math.floor(p * target));
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = String(target);
  };
  requestAnimationFrame(step);
}

function AnimatedBlock({
  html,
  className,
  behavior,
}: {
  html: string;
  className?: string;
  behavior?: BlockBehavior;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const timers: number[] = [];
    let played = false;

    const runBehavior = () => {
      if (!behavior) return;
      if (behavior === "type-qb") {
        const el = root.querySelector<HTMLElement>("#tqz-qb-typed");
        if (el) timers.push(window.setTimeout(() => typeInto(el, QB_TEXT, 28, timers), 700));
      } else if (behavior === "type-sh") {
        const el = root.querySelector<HTMLElement>("#tqz-sh-url");
        if (el) timers.push(window.setTimeout(() => typeInto(el, SH_URL, 22, timers), 900));
      } else if (behavior === "count-fb") {
        const el = root.querySelector<HTMLElement>("#tqz-fb-count");
        if (el) timers.push(window.setTimeout(() => countTo(el, 541, 1200), 1200));
      }
    };

    const play = () => {
      if (played) return;
      played = true;
      root.classList.add("tqz-play");
      runBehavior();
    };

    // Primaire : on declenche l'animation UNE fois quand le bloc entre dans
    // le viewport (exactement comme l'originale). IntersectionObserver est
    // supporte par tous les navigateurs actuels, donc le contenu se revele
    // toujours au moment ou l'utilisateur le voit : jamais de boite vide.
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              play();
              observer?.disconnect();
              break;
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
      );
      observer.observe(root);
      // Filet de securite ultime : si l'observer ne se declenche jamais
      // (cas pathologique), on revele quand meme apres 6s pour ne JAMAIS
      // laisser un bloc vide.
      timers.push(window.setTimeout(play, 6000));
    } else {
      // Pas d'IntersectionObserver : on revele immediatement (contenu
      // visible, sans l'effet d'entree au scroll).
      play();
    }

    return () => {
      observer?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      timers.forEach((t) => window.clearInterval(t));
    };
  }, [behavior]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default memo(AnimatedBlock);
