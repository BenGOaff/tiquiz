"use client";

// SocialProofCounter — affiche les compteurs globaux Tiquiz (nb quiz
// publiés + nb leads capturés) en preuve sociale. Source = /api/public/stats
// (cache 5 min, CORS ouvert → même endpoint que celui qui alimente le
// snippet Systeme.io de la sales page, comme ça les chiffres sont
// strictement les mêmes des 2 côtés).
//
// Variants :
//   • "card"   : carte autonome (dashboard, page Tarifs, etc.)
//   • "inline" : ligne discrète à intégrer dans un autre composant
//
// Affiche null tant que les chiffres ne sont pas chargés → pas de
// flash de "0 quiz / 0 leads" pendant la latence du fetch.

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Users, FileText } from "lucide-react";

type Stats = { quizzes: number; leads: number; updated_at?: string };

interface Props {
  variant?: "card" | "inline" | "hero";
  className?: string;
}

/** Map locale next-intl → tag BCP-47 utilisé par Intl.NumberFormat.
 *  next-intl utilise "fr" / "pt" / "pt-BR" ; Intl accepte tel quel. */
function bcp47(locale: string): string {
  return locale;
}

export function SocialProofCounter({ variant = "card", className = "" }: Props) {
  const t = useTranslations("socialProof");
  const locale = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // AbortController pour ne pas setState après unmount (cas mount/unmount
    // rapide en dev avec React StrictMode).
    const ctrl = new AbortController();
    fetch("/api/public/stats", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setStats({ quizzes: j.quizzes, leads: j.leads, updated_at: j.updated_at });
      })
      .catch(() => { /* silent fail : on n'affiche juste rien */ });
    return () => ctrl.abort();
  }, []);

  if (!stats) return null;

  const fmt = new Intl.NumberFormat(bcp47(locale));
  const qLabel = fmt.format(stats.quizzes);
  const lLabel = fmt.format(stats.leads);

  if (variant === "inline") {
    // Ligne minimaliste — réutilisable dans un footer / une bannière.
    return (
      <p className={`text-sm text-muted-foreground ${className}`.trim()}>
        {t("inline", { quizzes: qLabel, leads: lLabel })}
      </p>
    );
  }

  if (variant === "hero") {
    // Bandeau "communauté" placé en bas du dashboard (Béné 3 juin 2026 —
    // confusion avec les chiffres de l'user dans le placement précédent).
    // Background dégradé distinct des cartes user, chiffres en accent
    // (pas en primary qui sert aux KPI perso), encouragement final.
    return (
      <div
        className={`rounded-2xl border bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50 dark:from-cyan-950/30 dark:via-sky-950/30 dark:to-indigo-950/30 p-6 sm:p-8 ${className}`.trim()}
        aria-label={t("ariaLabel")}
      >
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl leading-none" aria-hidden="true">🌍</span>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold leading-tight">
              {t("heading")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t("subhead")}
            </p>
          </div>
        </div>
        <p className="text-base sm:text-lg leading-relaxed mt-4">
          {t("sentence", { quizzes: qLabel, leads: lLabel })}
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          {t("encouragement")}
        </p>
      </div>
    );
  }

  // variant="card" — bloc autonome avec 2 stats côte à côte.
  return (
    <div
      className={`rounded-xl border bg-card p-4 sm:p-5 ${className}`.trim()}
      aria-label={t("ariaLabel")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {t("heading")}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-bold leading-none tabular-nums">{qLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{t("quizzesLabel")}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-bold leading-none tabular-nums">{lLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{t("leadsLabel")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
