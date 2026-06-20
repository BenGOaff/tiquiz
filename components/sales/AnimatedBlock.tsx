"use client";

// components/sales/AnimatedBlock.tsx
//
// Injecte le markup d'un bloc d'animation (lib/salesAnimations). Le style
// et les @keyframes vivent dans components/sales/sales-animations.css
// (charge par le bundler) et s'auto-declenchent : aucune dependance a un
// JS de revelation. Ce composant ne gere QUE les comportements qui ont
// besoin de JS (saisie animee, compteur), en amelioration : si le JS ne
// tourne pas, le contenu reste visible (textes pre-remplis).

import { useEffect, useRef } from "react";

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
    if (!root || !behavior) return;
    const timers: number[] = [];
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
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.forEach((t) => window.clearInterval(t));
    };
  }, [behavior]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
