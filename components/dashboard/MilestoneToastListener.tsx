"use client";

// components/dashboard/MilestoneToastListener.tsx (Tiquiz)
//
// Monté une seule fois dans le dashboard Tiquiz (jamais sur les routes
// publiques /q/, /p/). Au mount : GET /api/milestones/unseen, affiche
// un toast sonner par milestone (espacés 1.5s), puis POST /seen.
//
// Port adapté de Tipote. Sonner est déjà le toaster Tiquiz (Providers.tsx).
//
// Race condition fixée (Gwenn 3 juin 2026) : si l'user navigue vite entre
// 2 pages, le 2ᵉ mount fetchait /unseen avant que le marquage seen du 1ᵉʳ
// mount n'ait commit en DB → même milestone re-affiché en boucle.
//
// Retour Gwenn 10 juin 2026 ("popups à chaque connexion") : passage de
// sessionStorage à localStorage. sessionStorage est vidé à chaque nouvel
// onglet/session, donc ne protégeait pas entre deux connexions si le
// marquage serveur échouait. localStorage persiste sur le navigateur :
// un milestone affiché une fois sur ce device ne re-pop jamais, même si
// le serveur a raté le marquage. Liste cappée à 200 ids.

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const SHOWN_KEY = "tiquiz.milestones.shown.v2";
const SHOWN_CAP = 200;

function readShown(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SHOWN_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function addShown(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const set = readShown();
    for (const id of ids) set.add(id);
    const arr = Array.from(set).slice(-SHOWN_CAP);
    window.localStorage.setItem(SHOWN_KEY, JSON.stringify(arr));
  } catch {
    /* localStorage indispo : on tolère, le marquage serveur reste le filet */
  }
}

interface UnseenMilestone {
  id: string;
  key: string;
  emoji: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

interface UnseenResponse {
  ok: boolean;
  milestones?: UnseenMilestone[];
}

export function MilestoneToastListener() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/milestones/unseen", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as UnseenResponse;
        if (cancelled || !data?.ok || !data.milestones?.length) return;

        // Filtrer ce qu'on a déjà montré dans cet onglet (race-proof).
        const alreadyShown = readShown();
        const fresh = data.milestones.filter((m) => !alreadyShown.has(m.id));
        if (fresh.length === 0) return;

        const ids = fresh.map((m) => m.id);
        // Marquer comme montrés AVANT d'afficher : si l'user navigue dans
        // les 1.5s avant le 2ᵉ toast, le sessionStorage protège déjà.
        addShown(ids);

        fresh.forEach((m, index) => {
          window.setTimeout(() => {
            toast.success(`${m.emoji} ${m.title}`, {
              description: m.body,
              duration: 8000,
              action:
                m.ctaLabel && m.ctaUrl
                  ? {
                      label: m.ctaLabel,
                      onClick: () => {
                        if (m.ctaUrl) window.location.href = m.ctaUrl;
                      },
                    }
                  : undefined,
            });
          }, index * 1500);
        });

        await fetch("/api/milestones/seen", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        }).catch(() => {});
      } catch (err) {
        console.error("[MilestoneToastListener]", err);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
