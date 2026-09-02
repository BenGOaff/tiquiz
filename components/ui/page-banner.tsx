// components/ui/page-banner.tsx
//
// LE NOM DE LA PAGE S'ÉCRIT UNE FOIS, ET C'EST DANS LA BARRE DU HAUT.
//
// Béné, 2 septembre 2026 : "y'a trop de titres sur une même page c'est
// tout en doublon : à quoi ça sert ?? Il faut uniformiser ça."
//
// Elle avait raison, et c'était mécanique : cinq écrans passaient leur
// titre à `AppShell` (qui le rend en `<h1>` dans la barre) PUIS le
// réécrivaient en `<h2>` dans un bandeau bleu, mot pour mot. Vérifié
// chaîne par chaîne avant de retirer quoi que ce soit : les cinq paires
// étaient identiques (Mes projets, Statistiques, Mes leads, Mes Popquiz,
// Paramètres). Il n'y avait donc rien à perdre, seulement une ligne à ne
// plus répéter.
//
// Ce qui reste dans le bandeau est ce que la barre ne peut PAS porter :
// la phrase qui dit à quoi sert l'écran, le compteur vivant ("83 leads
// capturés"), et les boutons d'action.
//
// LE BANDEAU EST UN COMPOSANT, PAS UN GABARIT À RECOPIER. Les cinq
// écrans portaient le même bloc copié-collé (`gradient-primary
// rounded-xl px-5 py-4 ...`), donc cinq occasions de diverger, et c'est
// exactement comme ça que le doublon s'est installé partout à la fois.
//
// INTERDIT : remettre un titre ici. Le titre vit dans `headerTitle`.

import * as React from "react";
import { cn } from "@/lib/utils";

type PageBannerProps = {
  /** L'icône de l'écran, déjà dimensionnée par le bandeau. */
  icon: React.ReactNode;
  /** Ce que la barre du haut ne dit pas : à quoi sert cet écran, ou un compteur. */
  children: React.ReactNode;
  /** Boutons d'action, alignés à droite, qui passent à la ligne sur mobile. */
  actions?: React.ReactNode;
  className?: string;
};

export function PageBanner({ icon, children, actions, className }: PageBannerProps) {
  return (
    <div
      className={cn(
        "gradient-primary rounded-xl px-5 py-3.5 md:px-6 md:py-4 flex items-center gap-4 text-white",
        className,
      )}
    >
      <div className="w-10 h-10 shrink-0 rounded-lg bg-white/15 flex items-center justify-center">
        {icon}
      </div>
      <p className="flex-1 min-w-0 text-sm md:text-[15px] leading-snug text-white/90">{children}</p>
      {actions ? (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

export default PageBanner;
