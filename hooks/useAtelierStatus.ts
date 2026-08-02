"use client";

// hooks/useAtelierStatus.ts
//
// L'utilisatrice a-t-elle L'Atelier du Quiz ? La réponse décide vers OÙ
// on l'envoie quand elle a besoin d'aide : le coach de l'Atelier si elle
// l'a, le support sinon. Proposer un coach auquel on n'a pas accès est
// pire que ne rien proposer.
//
// `null` = pas encore su. On n'affiche RIEN tant qu'on ne sait pas,
// plutôt que de montrer le mauvais lien une fraction de seconde.
//
// Une seule requête cross-app par session navigateur (mémorisée en
// sessionStorage). Extrait de AppSidebar pour que la page de création de
// quiz s'en serve aussi, sans dupliquer la mécanique de cache.

import { useEffect, useState } from "react";

const CACHE_KEY = "tiquiz_atelier_status";

export function useAtelierStatus(enabled = true): boolean | null {
  const [hasAtelier, setHasAtelier] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      const cached = window.sessionStorage.getItem(CACHE_KEY);
      if (cached !== null) {
        setHasAtelier(cached === "1");
        return;
      }
    } catch {
      /* sessionStorage indispo (navigation privee stricte) */
    }
    let cancelled = false;
    fetch("/api/me/atelier-status")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const v = j?.hasAtelier === true;
        setHasAtelier(v);
        try {
          window.sessionStorage.setItem(CACHE_KEY, v ? "1" : "0");
        } catch {
          /* noop */
        }
      })
      .catch(() => {
        // Echec reseau : on considere qu'elle ne l'a pas, donc on
        // l'envoie au support. Jamais vers une porte fermee.
        if (!cancelled) setHasAtelier(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return hasAtelier;
}
