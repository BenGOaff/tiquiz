"use client";

// app/templates/TemplatesGallery.tsx
//
// Galerie client : filtre par métier + grille de cartes. Chaque carte
// mène à la page détail /templates/<slug> (preview + bouton "Utiliser").

import { useMemo, useState } from "react";
import Link from "next/link";

import type { QuizTemplate } from "@/lib/templates/types";
import { TemplatesChrome } from "./TemplatesChrome";

export default function TemplatesGallery({
  templates,
  isLoggedIn,
}: {
  templates: QuizTemplate[];
  isLoggedIn: boolean;
}) {
  const metiers = useMemo(
    () => Array.from(new Set(templates.map((t) => t.metier))),
    [templates],
  );
  const [activeMetier, setActiveMetier] = useState<string | null>(null);

  const visible = activeMetier
    ? templates.filter((t) => t.metier === activeMetier)
    : templates;

  return (
    <TemplatesChrome isLoggedIn={isLoggedIn}>
      <div className="max-w-[1100px] mx-auto w-full px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight">
            Des quiz déjà écrits pour ton métier.
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Choisis un modèle, personnalise-le à ta sauce, publie-le. Tes
            questions, tes résultats et tes textes sont déjà rédigés — tu n&apos;as
            plus qu&apos;à les rendre tiens.
          </p>
        </div>

        {/* Filtres par métier */}
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveMetier(null)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              activeMetier === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            Tous
          </button>
          {metiers.map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetier(m)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                activeMetier === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Grille */}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((t) => (
            <Link
              key={t.slug}
              href={`/templates/${t.slug}`}
              className="group rounded-xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:shadow-sm transition flex flex-col"
            >
              <div className="text-3xl">{t.emoji}</div>
              <h2 className="mt-3 font-semibold text-foreground leading-snug group-hover:text-primary transition">
                {t.cardTitle}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground flex-1">
                {t.tagline}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="rounded-full bg-muted/50 px-2 py-0.5">
                  {t.metier}
                </span>
                <span>≈ {t.estimatedMinutes} min</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </TemplatesChrome>
  );
}
