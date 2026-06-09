"use client";

// components/editor/EditorPreviewDeviceContext.tsx
//
// Propage le device de preview ("mobile" / "desktop") choisi dans
// QuizDetailClient (toggle Monitor / Smartphone) vers les RichTextEdit
// imbriques. La toolbar font-size lit ce contexte pour appliquer la
// taille a la bonne CSS variable (--fs-m mobile, --fs-d desktop).
//
// Drame Bene 8 juin 2026 : "je veux deux tailles differentes sur mobile
// et pc, passer de l'un a l'autre pour editer sur chaque device".
// Pattern identique a UserPalettesProvider pour la coherence.

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type EditorPreviewDevice = "mobile" | "desktop";

const EditorPreviewDeviceContext = createContext<EditorPreviewDevice>("desktop");

export function EditorPreviewDeviceProvider({
  device,
  children,
}: {
  device: EditorPreviewDevice;
  children: ReactNode;
}) {
  // useMemo stabilise la valeur quand le parent re-render pour une
  // autre raison (state du formulaire), evite des re-renders en chaine
  // de tous les RichTextEdit qui ne sont pas concernes.
  const value = useMemo(() => device, [device]);
  return (
    <EditorPreviewDeviceContext.Provider value={value}>
      {children}
    </EditorPreviewDeviceContext.Provider>
  );
}

export function useEditorPreviewDevice(): EditorPreviewDevice {
  return useContext(EditorPreviewDeviceContext);
}
