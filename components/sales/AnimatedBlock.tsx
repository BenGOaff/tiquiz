"use client";

// components/sales/AnimatedBlock.tsx
//
// Rend un bloc HTML d'animation (lib/salesAnimations) et declenche le
// scroll-reveal : quand le bloc entre dans le viewport, on ajoute la
// classe `tqz-visible` aux elements qui pilotent les animations CSS
// (meme principe que les scripts Systeme.io d'origine). Le prop `behavior`
// porte les comportements JS specifiques (typing, compteur, boucle).

import { useEffect, useRef } from "react";

const REVEAL_SELECTOR =
  ".tqz-wrap,.tqz-leads,.tqz-poll,.tqz-cmp,.tqz-mk,.tqz-qb,.tqz-sh,.tqz-fb,.tqz-opt,.tqz-sc";

export type BlockBehavior = "type-qb" | "type-sh" | "count-fb" | "loop-sc";

const QB_TEXT =
  "Je veux un quiz pour qualifier mes visiteurs prets a commander ma formation sur l'education canine";
const SH_URL = "https://app.tiquiz.com/sandra-costa/formation-canine";

function typeInto(el: HTMLElement, text: string, speed: number) {
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
  return id;
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

export default function AnimatedBlock({
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
    let looper: number | undefined;

    const runBehavior = () => {
      if (behavior === "type-qb") {
        const el = root.querySelector<HTMLElement>("#tqz-qb-typed");
        if (el) timers.push(window.setTimeout(() => typeInto(el, QB_TEXT, 28), 600));
      } else if (behavior === "type-sh") {
        const el = root.querySelector<HTMLElement>("#tqz-sh-url");
        if (el) timers.push(window.setTimeout(() => typeInto(el, SH_URL, 22), 800));
      } else if (behavior === "count-fb") {
        const el = root.querySelector<HTMLElement>("#tqz-fb-count");
        if (el) timers.push(window.setTimeout(() => countTo(el, 541, 1200), 1400));
      } else if (behavior === "loop-sc") {
        const sc = root.querySelector<HTMLElement>(".tqz-sc");
        if (sc) {
          const loop = () => {
            sc.classList.remove("tqz-visible");
            // force reflow puis re-add pour relancer les animations
            void sc.offsetWidth;
            sc.classList.add("tqz-visible");
          };
          loop();
          looper = window.setInterval(loop, 13500);
        }
      }
    };

    const reveal = () => {
      root.querySelectorAll(REVEAL_SELECTOR).forEach((el) => el.classList.add("tqz-visible"));
      if (behavior === "loop-sc") return; // gere son propre cycle
      runBehavior();
    };

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      if (behavior === "loop-sc") runBehavior();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (behavior === "loop-sc") runBehavior();
            else reveal();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      if (looper) window.clearInterval(looper);
    };
  }, [behavior]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
