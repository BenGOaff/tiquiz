"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TutorialProvider } from "@/hooks/useTutorial";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <TutorialProvider>
      {children}
      <Toaster richColors position="top-right" />
    </TutorialProvider>
  );
}
