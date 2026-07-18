"use client";

import { LifeBuoy } from "lucide-react";

/**
 * Affordance discrète sur chaque jour : "Un blocage ?". Au lieu d'une boîte
 * muette, on ouvre le coach en mode blocage : il repond tout de suite (il a
 * le contexte du jour + le carnet + le quiz), et l'echange est logge en
 * feedback pour le dashboard admin d'amelioration (cf. /api/coach).
 */
export function BlockerButton({ dayNumber }: { dayNumber: number }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("coach:open", { detail: { dayNumber, blocage: true } }),
        )
      }
      className="mx-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <LifeBuoy className="size-4" />
      Un blocage sur ce jour ? Demande au coach
    </button>
  );
}
