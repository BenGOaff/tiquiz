"use client";

// components/sales/AnimatedBlock.tsx
//
// Rend un bloc HTML d'animation (lib/salesAnimations) et declenche le
// scroll-reveal de facon FIABLE : revele immediatement si deja visible,
// via IntersectionObserver sinon, et avec un filet de securite (timeout)
// pour ne JAMAIS laisser un bloc invisible (opacity:0) si l'observer rate.

import { useEffect, useRef } from "react";

const REVEAL_SELECTOR =
  ".tqz-wrap,.tqz-leads,.tqz-poll,.tqz-cmp,.tqz-mk,.tqz-qb,.tqz-sh,.tqz-fb,.tqz-opt,.tqz-sc";

export type BlockBehavior = "type-qb" | "type-sh" | "count-fb" | "loop-sc";

const QB_TEXT =
  "Je veux un quiz pour qualifier mes visiteurs prets a commander ma formation sur l'education canine";
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
    if (!root) return;
    const timers: number[] = [];
    let looper: number | undefined;
    let revealed = false;

    const runBehavior = () => {
      if (behavior === "type-qb") {
        const el = root.querySelector<HTMLElement>("#tqz-qb-typed");
        if (el) timers.push(window.setTimeout(() => typeInto(el, QB_TEXT, 28, timers), 600));
      } else if (behavior === "type-sh") {
        const el = root.querySelector<HTMLElement>("#tqz-sh-url");
        if (el) timers.push(window.setTimeout(() => typeInto(el, SH_URL, 22, timers), 800));
      } else if (behavior === "count-fb") {
        const el = root.querySelector<HTMLElement>("#tqz-fb-count");
        if (el) timers.push(window.setTimeout(() => countTo(el, 541, 1200), 1400));
      } else if (behavior === "loop-sc") {
        const sc = root.querySelector<HTMLElement>(".tqz-sc");
        if (sc) {
          const loop = () => {
            sc.classList.remove("tqz-visible");
            void sc.offsetWidth;
            sc.classList.add("tqz-visible");
          };
          loop();
          looper = window.setInterval(loop, 13500);
        }
      }
    };

    const doReveal = () => {
      if (revealed) return;
      revealed = true;
      root.querySelectorAll(REVEAL_SELECTOR).forEach((el) => el.classList.add("tqz-visible"));
      runBehavior();
    };

    // 1. Deja visible au montage ?
    const r = root.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh * 0.9 && r.bottom > 0) doReveal();

    // 2. Sinon, a l'entree dans le viewport.
    let io: IntersectionObserver | undefined;
    if (!revealed && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              doReveal();
              io?.disconnect();
              break;
            }
          }
        },
        { threshold: 0, rootMargin: "0px 0px -5% 0px" },
      );
      io.observe(root);
    }

    // 3. Filet de securite : on revele quoi qu'il arrive.
    const fb = window.setTimeout(doReveal, 2000);
    timers.push(fb);

    return () => {
      io?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      timers.forEach((t) => window.clearInterval(t));
      if (looper) window.clearInterval(looper);
    };
  }, [behavior]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
