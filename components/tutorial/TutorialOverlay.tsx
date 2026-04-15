// components/tutorial/TutorialOverlay.tsx
"use client";

import { usePathname } from "next/navigation";
import { useTutorial } from "@/hooks/useTutorial";
import { WelcomeModal } from "@/components/tutorial/WelcomeModal";
import { TourCompleteModal } from "@/components/tutorial/TourCompleteModal";

export function TutorialOverlay() {
  const pathname = usePathname();
  const { phase, isLoading } = useTutorial();

  const isBlockedRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/q/");

  if (isLoading) return null;
  if (isBlockedRoute) return null;

  const isInSpotlight =
    phase === "tour_dashboard" || phase === "tour_create" || phase === "tour_quizzes";

  return (
    <>
      <WelcomeModal />
      <TourCompleteModal />

      {isInSpotlight ? (
        <div
          className="fixed inset-0 bg-black/40 z-30 pointer-events-none transition-opacity duration-300"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
