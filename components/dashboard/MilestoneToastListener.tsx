"use client";

// components/dashboard/MilestoneToastListener.tsx (Tiquiz)
//
// Monté une seule fois dans le dashboard Tiquiz (jamais sur les routes
// publiques /q/, /p/). Au mount : GET /api/milestones/unseen, affiche
// un toast sonner par milestone (espacés 1.5s), puis POST /seen.
//
// Port adapté de Tipote. Sonner est déjà le toaster Tiquiz (Providers.tsx).

import { useEffect, useRef } from "react";
import { toast } from "sonner";

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

        const milestones = data.milestones;
        const ids = milestones.map((m) => m.id);

        milestones.forEach((m, index) => {
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
