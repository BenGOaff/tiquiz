"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type SioTag = { id: number; name: string };

type SioTagsContextValue = {
  tags: SioTag[] | null;
  loading: boolean;
  noApiKey: boolean;
  error: boolean;
  /**
   * L'outil qui recevra VRAIMENT les tags de ce quiz (14 septembre
   * 2026) : "systemeio", "gohighlevel"... La route le rend d'après la
   * destination du quiz ; l'onglet Automatiser écrit la recette de cet
   * outil et pas d'un autre. `null` tant que la route n'a pas répondu.
   */
  fournisseur: string | null;
  /** La connexion visée est en pause : rien ne part. */
  pause: boolean;
  /** La connexion visée est déconnectée : rien ne part non plus. */
  deconnecte: boolean;
  loadTags: () => Promise<void>;
  addTagLocal: (name: string) => void;
};

const SioTagsContext = createContext<SioTagsContextValue | null>(null);

export function useSioTagsContext() {
  return useContext(SioTagsContext);
}

export function SioTagsProvider({ children, quizId }: { children: ReactNode; quizId?: string }) {
  const [tags, setTags] = useState<SioTag[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [noApiKey, setNoApiKey] = useState(false);
  const [error, setError] = useState(false);
  const [fournisseur, setFournisseur] = useState<string | null>(null);
  const [pause, setPause] = useState(false);
  const [deconnecte, setDeconnecte] = useState(false);

  const loadTags = useCallback(async () => {
    if (tags !== null || loading) return;
    setLoading(true);
    setError(false);
    setNoApiKey(false);
    try {
      // quizId => la route resout la cle SIO du quiz (sous-compte inclus),
      // pas la cle du projet actif (retour Christelle 12 juillet 2026).
      const res = await fetch(`/api/systeme-io/tags${quizId ? `?quizId=${encodeURIComponent(quizId)}` : ""}`);
      const json = await res.json();
      if (json?.ok && Array.isArray(json.tags)) {
        setTags(json.tags);
        setFournisseur(typeof json.fournisseur === "string" ? json.fournisseur : "systemeio");
        setPause(json.pause === true);
        setDeconnecte(json.deconnecte === true);
      } else if (json?.error === "NO_API_KEY") {
        setNoApiKey(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tags, loading, quizId]);

  const addTagLocal = useCallback((name: string) => {
    setTags((prev) => {
      const list = prev ?? [];
      if (list.find((t) => t.name.toLowerCase() === name.toLowerCase())) return list;
      return [...list, { id: Date.now(), name }];
    });
  }, []);

  return (
    <SioTagsContext.Provider value={{ tags, loading, noApiKey, error, fournisseur, pause, deconnecte, loadTags, addTagLocal }}>
      {children}
    </SioTagsContext.Provider>
  );
}
