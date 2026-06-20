"use client";
/* eslint-disable react/no-unescaped-entities */

// components/sales/ResellerSalesPage.tsx
//
// Replique React de la page de vente Tiquiz, dynamique par revendeur :
// sections a deux colonnes (texte + visuel anime) sur fonds en degrade,
// alternees gauche/droite, comme l'original. Les boutons tarifs menent aux
// bons de commande du revendeur (/order/<slug>/<plan>) avec SES prix.
//
// Couleurs marque : #2B3264 (navy), #20BBE6 (cyan), #5A6EF6 (indigo).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Loader2, Play } from "lucide-react";

import AnimatedBlock, { type BlockBehavior } from "@/components/sales/AnimatedBlock";
import {
  COMPARISON,
  FACEBOOK,
  LEADS_LIST,
  OPTIN,
  PHONE_MOCKUP,
  POLL_PIE,
  POPQUIZ,
  QUIZ_BUILDER,
  SHARE_EMBED,
  SIO_SCOOP,
  STATS_DASH,
  TESTIMONIALS,
} from "@/lib/salesAnimations";

const NAVY = "#2B3264";
const CYAN = "#20BBE6";
const INDIGO = "#5A6EF6";
const LIGHT = "linear-gradient(180deg,#F4F7FE 0%,#EBF5FF 100%)";

const TYPE_WORDS = [
  "Booste ton trafic",
  "Génère plus de leads",
  "Améliore tes offres",
  "Booste tes ventes",
  "Démarque-toi",
];

export type SalesPlanKey = "monthly" | "yearly" | "monthly_plus" | "yearly_plus";

export interface ResellerSalesPageProps {
  resellerName: string;
  slug: string;
  youtubeId: string;
  hasProvider: boolean;
  prices: Partial<Record<SalesPlanKey, number>>;
}

/* ----------------------------- Animations hero ----------------------------- */

function useTypewriter() {
  const [text, setText] = useState("");
  useEffect(() => {
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = TYPE_WORDS[wordIndex];
      if (!deleting) {
        charIndex++;
        setText(word.substring(0, charIndex));
        if (charIndex < word.length) timer = setTimeout(tick, 85);
        else {
          deleting = true;
          timer = setTimeout(tick, 1400);
        }
      } else {
        charIndex--;
        setText(word.substring(0, charIndex));
        if (charIndex > 0) timer = setTimeout(tick, 45);
        else {
          deleting = false;
          wordIndex = (wordIndex + 1) % TYPE_WORDS.length;
          timer = setTimeout(tick, 250);
        }
      }
    };
    timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, []);
  return text;
}

function BubbleButton({ href, children }: { href: string; children: ReactNode }) {
  const layerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = [CYAN, INDIGO, "#8FE5F5", "#ffffff"];
    const mobile = window.innerWidth <= 768;
    const maxDist = mobile ? 30 : 70;
    const perBurst = mobile ? 8 : 14;
    const rand = (a: number, b: number) => Math.random() * (b - a) + a;
    const burst = () => {
      if (!layer.isConnected) return;
      for (let i = 0; i < perBurst; i++) {
        const side = Math.floor(Math.random() * 4);
        const t = Math.random();
        let sx = 50,
          sy = 50,
          dx = 0,
          dy = 0;
        const dist = rand(maxDist * 0.5, maxDist);
        if (side === 0) {
          sx = t * 100;
          sy = 0;
          dx = rand(-0.4, 0.4) * dist;
          dy = -dist;
        } else if (side === 1) {
          sx = 100;
          sy = t * 100;
          dx = dist;
          dy = rand(-0.4, 0.4) * dist;
        } else if (side === 2) {
          sx = t * 100;
          sy = 100;
          dx = rand(-0.4, 0.4) * dist;
          dy = dist;
        } else {
          sx = 0;
          sy = t * 100;
          dx = -dist;
          dy = rand(-0.4, 0.4) * dist;
        }
        const size = rand(mobile ? 2 : 3, mobile ? 6 : 9);
        const dur = rand(1.1, 1.6);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const ring = Math.random() < 0.45;
        const outer = document.createElement("span");
        outer.style.cssText = `position:absolute;top:${sy}%;left:${sx}%;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;pointer-events:none;animation:rspMove ${dur}s cubic-bezier(.16,.68,.32,1) forwards;`;
        outer.style.setProperty("--dx", `${dx}px`);
        outer.style.setProperty("--dy", `${dy}px`);
        const inner = document.createElement("span");
        inner.style.cssText = `display:block;width:100%;height:100%;border-radius:50%;animation:rspScale ${dur}s ease-out forwards;transform:scale(0);opacity:0;${ring ? `border:1.5px solid ${color};` : `background:${color};box-shadow:0 0 4px ${color};`}`;
        outer.appendChild(inner);
        layer.appendChild(outer);
        setTimeout(() => outer.remove(), dur * 1000 + 80);
      }
    };
    const offset = setTimeout(burst, 400 + Math.random() * 1400);
    const interval = setInterval(burst, 1400);
    return () => {
      clearTimeout(offset);
      clearInterval(interval);
    };
  }, []);
  return (
    <a
      href={href}
      className="relative inline-flex items-center justify-center overflow-visible rounded-full px-8 py-4 text-base font-bold text-white transition-transform active:scale-95"
      style={{ background: INDIGO, animation: "rspPulse 1.4s ease-in-out infinite" }}
    >
      <span ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </a>
  );
}

/* ----------------------------- Donnees plans ----------------------------- */

const PAID_FEATURES = [
  "Quiz, sondages et Popquiz illimités",
  "Réponses illimitées",
  "Génération IA des questions et résultats",
  "Connexion native Systeme.io",
  "Capture de leads automatique avec tags",
  "Design professionnel et responsive",
  "Personnalisation du branding (logo, couleurs)",
  "Lien partageable et intégration embed",
  "Statistiques de complétion",
  "Retrait du watermark Tiquiz",
  "Nom de domaine personnalisé",
];

const PLUS_EXTRAS = [
  "Multiprofils : autant de profils que de clients accompagnés",
  "Analyse IA des résultats : des insights sur ton audience",
  "Multi-clés API Systeme.io : autant de comptes que besoin",
  "Templates de quiz prêts à personnaliser",
];

function formatPrice(cents: number): string {
  const v = (cents / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");
  return `${v}EUR`;
}

/* ----------------------------- Helpers layout ----------------------------- */

function FeatureRow({
  bg,
  reverse,
  eyebrow,
  title,
  highlight,
  paragraph,
  bullets,
  widget,
  behavior,
}: {
  bg?: string;
  reverse?: boolean;
  eyebrow?: string;
  title: string;
  highlight?: string;
  paragraph?: string;
  bullets?: string[];
  widget: string;
  behavior?: BlockBehavior;
}) {
  return (
    <section style={bg ? { background: bg } : undefined} className="px-5 py-14">
      <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2">
        <div className={reverse ? "md:order-2" : ""}>
          {eyebrow ? (
            <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: CYAN }}>
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-3xl font-black leading-tight sm:text-4xl" style={{ color: NAVY }}>
            {title} {highlight ? <span style={{ color: INDIGO }}>{highlight}</span> : null}
          </h2>
          {paragraph ? (
            <p className="mt-4 text-base leading-relaxed text-slate-600">{paragraph}</p>
          ) : null}
          {bullets ? (
            <ul className="mt-5 space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-slate-700">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: CYAN }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={reverse ? "md:order-1" : ""}>
          <AnimatedBlock html={widget} behavior={behavior} />
        </div>
      </div>
    </section>
  );
}

function Heading({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <h2
      className="text-center text-3xl font-black sm:text-4xl"
      style={{ color: light ? "#fff" : NAVY }}
    >
      {children}
    </h2>
  );
}

/* ----------------------------- FAQ ----------------------------- */

const FAQ: Array<[string, string]> = [
  [
    "J'ai absolument besoin d'un compte Systeme.io ?",
    "Non. Mais Tiquiz est optimisé pour synchroniser tes contacts avec Systeme.io. Tu peux aussi exporter tes leads en CSV pour ton autorépondeur.",
  ],
  [
    "Est-ce que j'aurai quelque chose à télécharger ?",
    "Non, rien. Tiquiz est un logiciel 100% en ligne (SaaS). Un navigateur et une connexion suffisent.",
  ],
  ["Ai-je besoin d'une carte bancaire pour essayer ?", "Non. La version gratuite est accessible sans carte bancaire."],
  ["Y a-t-il des frais cachés ?", "Aucun. Le prix affiché est le prix que tu paies, tout est compris."],
  ["Comment résilier mon abonnement ?", "En un clic depuis ton espace, dans tes paramètres. Pas d'engagement."],
  [
    "Ai-je besoin de Zapier, Make ou Google Sheets ?",
    "Non. Tiquiz se connecte directement à Systeme.io, sans outil tiers.",
  ],
  [
    "Je suis débutant(e), est-ce que ça peut m'aider ?",
    "Absolument. Tiquiz est pensé pour les solopreneurs, coachs, consultants et créateurs, même sans compétence technique.",
  ],
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold"
        style={{ color: NAVY }}
      >
        {q}
        <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <p className="pb-4 text-slate-600">{a}</p> : null}
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function ResellerSalesPage({
  resellerName,
  slug,
  youtubeId,
  hasProvider,
  prices,
}: ResellerSalesPageProps) {
  const typed = useTypewriter();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const [freeEmail, setFreeEmail] = useState("");
  const [freeBusy, setFreeBusy] = useState(false);
  const [freeMsg, setFreeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const startFree = async () => {
    const email = freeEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setFreeMsg({ ok: false, text: "Entre un email valide." });
      return;
    }
    setFreeBusy(true);
    setFreeMsg(null);
    try {
      const res = await fetch(`/api/order/${slug}/free`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.ok) {
        setFreeEmail("");
        setFreeMsg({ ok: true, text: "C'est bon ! Ton accès vient de t'être envoyé par email." });
      } else if (json.error === "rejected_email_taken") {
        setFreeMsg({ ok: false, text: "Cet email a déjà un compte. Connecte-toi directement." });
      } else {
        setFreeMsg({ ok: false, text: "Une erreur est survenue. Réessaie dans un instant." });
      }
    } catch {
      setFreeMsg({ ok: false, text: "Une erreur est survenue. Réessaie dans un instant." });
    } finally {
      setFreeBusy(false);
    }
  };

  const planCard = (key: SalesPlanKey, name: string, plus: boolean) => {
    const cents = prices[key];
    if (!cents) return null;
    const periodLabel = key.startsWith("yearly") ? "/ an" : "/ mois";
    const features = plus ? [...PAID_FEATURES, ...PLUS_EXTRAS] : PAID_FEATURES;
    return (
      <div
        className="flex flex-1 flex-col rounded-3xl border bg-white p-7 shadow-sm"
        style={plus ? { borderColor: INDIGO, borderWidth: 2 } : { borderColor: "#e2e8f0" }}
      >
        <div className="text-sm font-bold uppercase tracking-wide" style={{ color: CYAN }}>
          {name}
        </div>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-4xl font-black" style={{ color: NAVY }}>
            {formatPrice(cents)}
          </span>
          <span className="mb-1 text-sm text-slate-500">{periodLabel}</span>
        </div>
        <ul className="mt-5 flex-1 space-y-2 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: CYAN }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center">
          {hasProvider ? (
            <BubbleButton href={`/order/${slug}/${key}`}>Accès {name}</BubbleButton>
          ) : (
            <span className="text-xs text-slate-400">Bientôt disponible</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @keyframes rspBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes rspMove{from{transform:translate(0,0)}to{transform:translate(var(--dx),var(--dy))}}
        @keyframes rspScale{0%{transform:scale(0);opacity:0}18%{transform:scale(1);opacity:1}75%{opacity:.9}100%{transform:scale(.2);opacity:0}}
        @keyframes rspPulse{0%{transform:scale(1);box-shadow:0 4px 14px rgba(90,110,246,.28)}30%{transform:scale(1.04);box-shadow:0 10px 30px rgba(90,110,246,.45)}100%{transform:scale(1);box-shadow:0 4px 14px rgba(90,110,246,.28)}}
        @media (max-width:768px){html,body{overflow-x:clip}}
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tiquiz-logo.png" alt="Tiquiz" className="h-8 w-auto" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <a href="#demo" className="hover:text-slate-900">Demo</a>
            <a href="#tarifs" className="hover:text-slate-900">Tarifs</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <a
            href="#tarifs"
            className="rounded-full px-5 py-2 text-sm font-bold text-white"
            style={{ background: INDIGO }}
          >
            Commander
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pb-10 pt-14 text-center" style={{ background: LIGHT }}>
        <div className="mx-auto max-w-3xl">
          <h1
            className="text-4xl font-black leading-tight sm:text-6xl"
            style={{ color: NAVY, minHeight: "1.1em" }}
          >
            {typed}
            <span style={{ color: CYAN, animation: "rspBlink .8s infinite" }}>|</span>
          </h1>
          <p className="mt-3 text-lg font-semibold text-slate-500">grâce à la viralité des quiz</p>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600">
            Crée des quiz viraux qui attirent du trafic qualifié sur tes offres et transforment
            tes visiteurs en clients payants. Connecté directement à Systeme.io, sans Zapier.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <BubbleButton href="#tarifs">C'est parti !</BubbleButton>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full border-2 px-7 py-4 text-base font-bold"
              style={{ borderColor: INDIGO, color: NAVY }}
            >
              <Play className="h-4 w-4" /> Voir la démo
            </a>
          </div>
        </div>
      </section>

      {/* Video demo */}
      <section id="demo" className="px-5 py-12" style={{ background: LIGHT }}>
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
          <div className="relative" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title="Demo Tiquiz"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Viralite + dashboard stats */}
      <FeatureRow
        title="Booste ton trafic"
        highlight="grâce à la viralité des quiz"
        paragraph="Pour découvrir leurs résultats, tes prospects partagent d'abord le quiz sur leurs réseaux. Chaque partage expose ta marque à un nouveau public : plus de trafic, plus de visibilité, sans redoubler d'efforts."
        widget={STATS_DASH}
      />

      {/* Leads qualifies */}
      <FeatureRow
        bg={LIGHT}
        reverse
        title="Capture des"
        highlight="leads qualifiés"
        paragraph="Oublie les inscrits qui ne passent jamais à l'action. Quand un prospect prend le temps de remplir ton quiz, c'est qu'il est vraiment intéressé."
        bullets={[
          "Des prospects chauds, pas des touristes",
          "Bien plus qualifiés que ceux qui téléchargent un ebook",
          "C'est avec eux que tu veux remplir ta liste",
        ]}
        widget={LEADS_LIST}
      />

      {/* Offres irresistibles */}
      <FeatureRow
        title="Crée des"
        highlight="offres irrésistibles"
        paragraph="Un quiz ne recueille pas que des emails : il te donne des informations précieuses sur ton audience pour créer des offres qu'elle va s'arracher."
        bullets={[
          "Les difficultés et désirs actuels de ton audience",
          "Leurs objectifs, préférences et problèmes non résolus",
          "Les solutions déjà essayées et leur satisfaction",
        ]}
        widget={POLL_PIE}
      />

      {/* Mini-tunnels : mockup 3 ecrans */}
      <section className="px-5 py-14" style={{ background: LIGHT }}>
        <Heading>
          Transforme tes quiz en <span style={{ color: INDIGO }}>mini-tunnels de vente</span>
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
          Une expérience fraîche et amusante qui mène tes prospects jusqu'à l'achat, en douceur.
        </p>
        <div className="mt-8">
          <AnimatedBlock html={PHONE_MOCKUP} />
        </div>
      </section>

      {/* Popquiz (section auto-portee, 2 colonnes interne) */}
      <AnimatedBlock html={POPQUIZ} />

      {/* Comparatif */}
      <section className="px-5 py-14">
        <Heading>
          Prends <span style={{ color: INDIGO }}>5 ans d'avance</span> sur tes concurrents
        </Heading>
        <div className="mt-8">
          <AnimatedBlock html={COMPARISON} />
        </div>
      </section>

      {/* Comment marche : creation IA + partage */}
      <section className="px-5 pt-14" style={{ background: LIGHT }}>
        <Heading>Comment marche Tiquiz ?</Heading>
      </section>
      <FeatureRow
        bg={LIGHT}
        eyebrow="Étape 1"
        title="Crée le quiz parfait"
        highlight="à partir d'un simple prompt"
        paragraph="L'IA de Tiquiz te génère un quiz complet en quelques secondes. Tu n'as plus qu'à le personnaliser avec ta personnalité et ton offre."
        widget={QUIZ_BUILDER}
        behavior="type-qb"
      />
      <FeatureRow
        bg={LIGHT}
        reverse
        eyebrow="Étape 2"
        title="Partage ton quiz"
        highlight="en 1 clic"
        paragraph="Copie le lien (avec ton nom de domaine) ou le code embed, et diffuse-le partout : page d'accueil, article de blog, pop-up, réseaux."
        widget={SHARE_EMBED}
        behavior="type-sh"
      />

      {/* Viralite : partage social */}
      <section className="px-5 pt-14">
        <Heading>
          Propage ta marque <span style={{ color: INDIGO }}>comme une traînée de poudre</span>
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
          Pour voir leurs résultats, tes prospects partagent ton quiz. Il devient viral, sans
          dépenser un centime en publicité.
        </p>
        <AnimatedBlock html={FACEBOOK} behavior="count-fb" />
      </section>

      {/* Capture / opt-in */}
      <section className="px-5 py-6" style={{ background: LIGHT }}>
        <Heading>
          Capture, exporte, <span style={{ color: INDIGO }}>automatise</span>
        </Heading>
        <AnimatedBlock html={OPTIN} />
      </section>

      {/* Le 1er outil connecte a Systeme.io (scenes en boucle) */}
      <section className="px-5 py-14">
        <AnimatedBlock html={SIO_SCOOP} />
      </section>

      {/* Temoignages */}
      <section className="px-5 py-14" style={{ background: "#f1f5f9" }}>
        <Heading>Il y a un avant ... et un après Tiquiz</Heading>
        <div className="mt-8">
          <AnimatedBlock html={TESTIMONIALS} />
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="mx-auto max-w-4xl px-5 py-14">
        <Heading>Un tarif unique avantageux</Heading>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Vendu par {resellerName}. Choisis ta formule, ton accès s'ouvre juste après le paiement.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            className={`text-sm font-semibold ${period === "monthly" ? "text-slate-900" : "text-slate-400"}`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setPeriod((p) => (p === "monthly" ? "yearly" : "monthly"))}
            className="relative h-8 w-14 rounded-full"
            style={{ background: NAVY }}
            aria-label="Basculer mensuel / annuel"
          >
            <span
              className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform"
              style={{ left: 4, transform: period === "yearly" ? "translateX(24px)" : "none" }}
            />
          </button>
          <button
            type="button"
            onClick={() => setPeriod("yearly")}
            className={`text-sm font-semibold ${period === "yearly" ? "text-slate-900" : "text-slate-400"}`}
          >
            Annuel
          </button>
          <span
            className="ml-1 rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ background: NAVY, opacity: period === "yearly" ? 1 : 0.45 }}
          >
            2 mois offerts
          </span>
        </div>

        {/* Essai gratuit */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-wide" style={{ color: CYAN }}>
                Gratuit à vie
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Teste sans carte bancaire. 1 quiz actif, 10 réponses par mois.
              </p>
            </div>
            <span className="text-3xl font-black" style={{ color: NAVY }}>
              0EUR
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={freeEmail}
              onChange={(e) => setFreeEmail(e.target.value)}
              placeholder="ton@email.com"
              className="min-w-[220px] flex-1 rounded-lg border bg-background px-3 py-3 text-sm"
            />
            <button
              type="button"
              onClick={startFree}
              disabled={freeBusy}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: INDIGO }}
            >
              {freeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commencer gratuitement"}
            </button>
          </div>
          {freeMsg ? (
            <p className={`mt-2 text-xs ${freeMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {freeMsg.text}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row">
          {period === "monthly" ? (
            <>
              {planCard("monthly", "Mensuel", false)}
              {planCard("monthly_plus", "Mensuel Plus", true)}
            </>
          ) : (
            <>
              {planCard("yearly", "Annuel", false)}
              {planCard("yearly_plus", "Annuel Plus", true)}
            </>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-2xl px-5 py-12">
        <Heading>Questions frequentes</Heading>
        <div className="mt-8">
          {FAQ.map(([q, a]) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* CTA final */}
      <div style={{ background: NAVY }} className="px-5 py-14 text-center text-white">
        <Heading light>Ta liste emails ne va pas se construire toute seule</Heading>
        <p className="mx-auto mt-4 max-w-xl text-slate-200">
          Pendant que tu hésites, tes visiteurs quittent ton site sans laisser leur email. Un quiz
          change tout.
        </p>
        <div className="mt-8 flex justify-center">
          <BubbleButton href="#tarifs">C'est parti !</BubbleButton>
        </div>
      </div>

      <footer className="px-5 py-8 text-center text-xs text-slate-400">
        Propulsé par Tiquiz. Vendu par {resellerName}.
      </footer>
    </div>
  );
}
