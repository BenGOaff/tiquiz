"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TutorialProvider } from "@/hooks/useTutorial";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <TutorialProvider>
      {children}
      {/* Sonner toaster wired to the design system: card surface,
          soft shadow, rounded corners, and a tonal left-stripe per
          variant (success → emerald, error → rose, warning → amber,
          info → sky). richColors stays on so the toast types pull
          their accent from the variant; we override the surface
          chrome to match the rest of the app. */}
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "rounded-xl border border-border/60 shadow-card border-l-4",
            actionButton: "rounded-full",
            cancelButton: "rounded-full",
          },
        }}
      />
    </TutorialProvider>
  );
}
