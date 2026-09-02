"use client";

// components/tutorial/RestartTourButton.tsx
//
// LE TOUR GUIDÉ SE RELANCE DEPUIS LA BARRE DU HAUT.
//
// Béné, 2 septembre 2026 : "réactiver le tour guidé : mets le dans la
// head bar à côté de 'mon espace'."
//
// Avant, l'entrée vivait en bas de la sidebar ET ne s'affichait QUE si la
// carte d'invitation avait été fermée ou le tour désactivé. Donc, tant
// qu'on n'avait rien fermé, il n'existait aucun moyen visible de le
// relancer, et une fois la carte fermée il fallait descendre au pied
// d'une sidebar déjà chargée pour le retrouver.
//
// ICI IL EST TOUJOURS LÀ, et c'est le point : un raccourci qui apparaît
// et disparaît selon un état qu'on ne contrôle pas ne se mémorise pas.
// Une place fixe se retient.
//
// L'ÉTAT DÉCIDE DU GESTE, PAS DE LA PRÉSENCE. Tour désactivé -> on le
// réactive (`resetTutorial`). Tour actif -> on rouvre l'écran d'accueil
// du tour. C'est exactement ce que faisait l'entrée de la sidebar.

import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { useTutorial } from "@/hooks/useTutorial";
import { Button } from "@/components/ui/button";

export function RestartTourButton() {
  const t = useTranslations("tutorial");
  const { tutorialOptOut, isLoading, resetTutorial, setShowWelcome, setPhase } = useTutorial();

  // Tant qu'on ne sait pas dans quel état est le tour, on n'affiche rien :
  // un bouton qui change de sens une demi-seconde après l'affichage se
  // clique au mauvais moment.
  if (isLoading) return null;

  const libelle = tutorialOptOut ? t("helpReactivate") : t("helpRestart");

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      title={libelle}
      aria-label={libelle}
      onClick={() => {
        if (tutorialOptOut) {
          resetTutorial();
          return;
        }
        setShowWelcome(true);
        setPhase("welcome");
      }}
    >
      <Play className="h-4 w-4 shrink-0" />
      {/* Le libellé disparaît sous 640px : la barre y porte déjà le titre
          de la page, le sélecteur de projet et l'avatar. L'icône garde
          son `aria-label`, donc rien n'est perdu pour un lecteur d'écran. */}
      <span className="hidden sm:inline text-xs font-medium">{libelle}</span>
    </Button>
  );
}

export default RestartTourButton;
