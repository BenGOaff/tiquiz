"use client";

// Widget de preuve sociale Tiquiz — rendu en standalone dans un iframe
// embarqué sur tipote.fr/tiquiz (sales page Systeme.io). Tout est inline
// (style, anim, fetch) pour rester self-contained et indépendant du
// thème de la page hôte. Cf. CLAUDE_PITFALLS section AR pour les
// domaines de prod.

import { useEffect, useRef, useState } from "react";

type Stats = { quizzes: number; leads: number };

const COLORS = {
  text: "#2E386E",
  primary: "#5D6CDB",
  muted: "#6b7280",
  cardBg: "#ffffff",
  cardBorder: "rgba(93, 108, 219, 0.08)",
  cardShadow: "0 2px 12px rgba(46, 56, 110, 0.08)",
  shimmerLo: "#e5e7eb",
  shimmerHi: "#f3f4f6",
};

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export function SocialProofWidget() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  // Valeurs animées (count-up) qu'on rend dans les <div>.
  const [shown, setShown] = useState<Stats>({ quizzes: 0, leads: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => setFailed(true), 5000);
    fetch("/api/public/stats", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        clearTimeout(timer);
        if (j?.ok) setStats({ quizzes: j.quizzes, leads: j.leads });
        else setFailed(true);
      })
      .catch(() => {
        clearTimeout(timer);
        setFailed(true);
      });
    return () => {
      ctrl.abort();
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Anim count-up easeOutCubic 1.5 s dès que stats arrive.
  useEffect(() => {
    if (!stats) return;
    const start = Date.now();
    const duration = 1500;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown({
        quizzes: Math.round(stats.quizzes * eased),
        leads: Math.round(stats.leads * eased),
      });
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stats]);

  const fmt = new Intl.NumberFormat("fr-FR");
  const renderNum = (key: "quizzes" | "leads") => {
    if (stats) return fmt.format(shown[key]);
    if (failed) return "—";
    // Skeleton pulsant (CSS keyframes injectés plus bas).
    return (
      <span className="tq-shimmer" aria-hidden="true">
        0000
      </span>
    );
  };

  return (
    <>
      {/* Style global du widget — inline pour rester autonome dans
          l'iframe et ne pas dépendre du Tailwind de l'app. */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap");
        .tq-shimmer {
          display: inline-block;
          background: linear-gradient(
            90deg,
            ${COLORS.shimmerLo} 0%,
            ${COLORS.shimmerHi} 50%,
            ${COLORS.shimmerLo} 100%
          );
          background-size: 200% 100%;
          animation: tq-shimmer 1.4s infinite;
          color: transparent;
          border-radius: 0.5rem;
        }
        @keyframes tq-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div
        style={{
          fontFamily: FONT,
          textAlign: "center",
          color: COLORS.text,
          padding: "1rem 0.5rem",
          maxWidth: "40rem",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            fontSize: "1.0625rem",
            fontWeight: 600,
            margin: "0 0 1.25rem 0",
            lineHeight: 1.45,
            color: COLORS.text,
          }}
        >
          À ce jour les utilisateurs de Tiquiz ont :
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          <Card verb="publié" num={renderNum("quizzes")} noun="quiz" />
          <Card verb="capturé" num={renderNum("leads")} noun="leads qualifiés" />
        </div>
      </div>
    </>
  );
}

function Card({
  verb,
  num,
  noun,
}: {
  verb: string;
  num: React.ReactNode;
  noun: string;
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        borderRadius: "1rem",
        padding: "1.5rem 1rem",
        boxShadow: COLORS.cardShadow,
        border: `1px solid ${COLORS.cardBorder}`,
      }}
    >
      <div
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: COLORS.muted,
          marginBottom: "0.5rem",
        }}
      >
        {verb}
      </div>
      <div
        style={{
          fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
          fontWeight: 800,
          lineHeight: 1,
          color: COLORS.primary,
          fontVariantNumeric: "tabular-nums",
          minHeight: "1em",
        }}
      >
        {num}
      </div>
      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: COLORS.text,
        }}
      >
        {noun}
      </div>
    </div>
  );
}
