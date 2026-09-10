"use client";
// components/embed/QuizEnCours.tsx
//
// L'ÉCRAN D'ATTENTE QUI NE FAIT PLUS ATTENDRE (chantier 3, 10 septembre
// 2026). Pendant que le modèle écrit, le titre, puis chaque question,
// puis chaque profil apparaissent ICI, dans l'ordre, dès qu'ils sont
// complets. Sous le quiz, trois cartes tournent toutes les 4 secondes ;
// à côté, UNE question (Systeme.io : oui, non, pas encore) qui ne
// bloque rien.
//
// Aucune décision ici : l'ordre et le contenu viennent des événements
// de la route (`lib/embed/fluxGeneration.ts`), la mécanique des cartes
// et de la question vit dans `lib/embed/attente.ts`, pur et testé. Ce
// fichier ne fait que rendre.
//
// LE MOUVEMENT RESPECTE `prefers-reduced-motion` : chaque apparition
// passe par `motion-safe:`, donc quelqu'un qui a demandé moins de
// mouvement voit les questions arriver sans glissement ni fondu. Le
// CONTENU, lui, change quand même : c'est une information, pas une
// décoration.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ReponseSystemeIo } from "@/lib/analytics/parcours";
import {
  CLES_CARTES,
  INTERVALLE_CARTES_MS,
  REPONSES_SIO,
  carteSuivante,
  indiceApresReponse,
} from "@/lib/embed/attente";
import type { Progression } from "@/lib/embed/fluxGeneration";

const APPARITION =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500";

type Props = {
  t: Record<string, string>;
  etape: string;
  apercu: Progression;
  systemeio: ReponseSystemeIo | null;
  onSystemeio: (reponse: ReponseSystemeIo) => void;
};

export default function QuizEnCours({ t, etape, apercu, systemeio, onSystemeio }: Props) {
  const [carte, setCarte] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCarte((c) => carteSuivante(c)), INTERVALLE_CARTES_MS);
    return () => clearInterval(id);
  }, []);

  const indice = indiceApresReponse(systemeio);
  const rienEncore = !apercu.titre && apercu.questions.length === 0;

  return (
    <div className="flex-1 flex flex-col gap-6 py-4" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 text-primary animate-spin shrink-0" aria-hidden="true" />
        <p className="font-semibold">{etape}</p>
      </div>

      {/* LE QUIZ EN TRAIN DE S'ÉCRIRE : jamais une page vide. Tant que
          rien n'est complet, la phrase d'attente d'avant reste là. */}
      <div className="rounded-2xl border bg-card p-5 sm:p-6 space-y-5">
        {apercu.titre ? (
          <h2 className={`text-xl sm:text-2xl font-bold leading-snug ${APPARITION}`}>{apercu.titre}</h2>
        ) : (
          <p className="text-sm text-muted-foreground">{rienEncore ? t.genSub : t.genTitreEnCours}</p>
        )}

        {apercu.questions.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.genQuestions}</p>
            <ol className="space-y-4">
              {apercu.questions.map((q, i) => (
                <li key={i} className={`space-y-2 ${APPARITION}`}>
                  <p className="font-medium">
                    <span className="text-muted-foreground mr-2">{t.genQuestionN.replace("{n}", String(i + 1))}</span>
                    {q.texte}
                  </p>
                  {q.options.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((o, j) => (
                        <li key={j} className="rounded-lg border px-3 py-2 text-sm bg-background">{o}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {apercu.resultats.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.genProfils}</p>
            <ul className="flex flex-wrap gap-2">
              {apercu.resultats.map((r, i) => (
                <li key={i} className={`rounded-full border px-3 py-1 text-sm font-medium ${APPARITION}`}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* LES TROIS CARTES : dix mots, toutes les 4 secondes. `key` sur
          l'indice, donc chaque carte entre avec son apparition. */}
      <div className="min-h-12 flex items-center">
        <p key={carte} className={`text-sm text-muted-foreground ${APPARITION}`}>
          {t[CLES_CARTES[carte]]}
        </p>
      </div>

      {/* LA QUESTION UTILE. Elle ne bloque rien : aucune réponse n'est
          exigée, et le quiz continue de s'écrire pendant qu'on lit. */}
      <div className="rounded-xl border border-dashed p-4 space-y-3">
        <p className="text-sm font-medium">{t.genQuestionSio}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.genQuestionSio}>
          {REPONSES_SIO.map((r) => (
            <button
              key={r.valeur}
              type="button"
              onClick={() => onSystemeio(r.valeur)}
              aria-pressed={systemeio === r.valeur}
              className={
                "rounded-full border px-4 py-1.5 text-sm transition-colors " +
                (systemeio === r.valeur
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent")
              }
            >
              {t[r.cle]}
            </button>
          ))}
        </div>
        {indice && <p className={`text-sm text-muted-foreground ${APPARITION}`}>{t[indice]}</p>}
      </div>
    </div>
  );
}
