"use client";

// components/TiquizFocusCard.tsx
// Carte "Quiz suivi" de la page d'accueil (Gwenn 19 juil 2026). L'Atelier
// étudie UN seul quiz à la fois. Par défaut, le quiz le plus récent (celui
// que l'user vient de créer) ; il peut en choisir un autre, mémorisé jusqu'à
// ce qu'il le change. Sélection limitée aux QUIZ (profil), pas les sondages
// ni popquiz, pour éviter les erreurs. États guidés : pas connecté -> bouton
// connexion ; connecté sans quiz -> bouton création.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target, ExternalLink, Loader2, Plus, Link2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TIQUIZ_APP_URL = "https://quiz.tipote.com";

type QuizRef = { id: string; title: string; project_id: string | null; mode: string | null };
type ProjectRef = { id: string; name: string; is_default: boolean };

export function TiquizFocusCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRef[]>([]);
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  // Distingue "impossible de charger la liste" (API Tiquiz KO / pas déployée)
  // de "vraiment aucun quiz" : sinon on afficherait "crée ton premier quiz"
  // à quelqu'un qui en a plein (drame Gwenn 19 juil 2026).
  const [loadError, setLoadError] = useState(false);
  const initRan = useRef(false);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/me/tiquiz-quizzes");
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) {
        setLoadError(true);
        return;
      }
      setConnected(Boolean(data.connected));
      if (data.error) {
        // Connecté mais la liste n'a pas pu être récupérée : NE PAS conclure
        // "aucun quiz". On propose de réessayer.
        setLoadError(true);
        return;
      }
      setProjects((data.projects ?? []) as ProjectRef[]);
      // Tous les quiz SAUF les sondages (les popquiz ne sont pas un `mode`).
      const qs = ((data.quizzes ?? []) as QuizRef[]).filter((q) => q.mode !== "survey");
      setQuizzes(qs);
      const stored = String(data.selectedScope ?? "");
      const storedId = stored.startsWith("quiz:") ? stored.slice(5) : "";
      const valid = qs.some((q) => q.id === storedId);
      if (valid) {
        setScope(stored);
      } else if (qs.length > 0 && !initRan.current) {
        // Défaut = quiz le plus récent (liste triée created_at desc côté
        // Tiquiz). Persisté une fois, silencieusement (la synchro des stats
        // se fait sur la page Avancées).
        initRan.current = true;
        const def = `quiz:${qs[0].id}`;
        setScope(def);
        void fetch("/api/me/tiquiz-selection", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: def }),
        });
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeQuiz(next: string) {
    if (!next || next === scope) return;
    setScope(next);
    setBusy(true);
    try {
      await fetch("/api/me/tiquiz-selection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: next }),
      });
      // Recalcule les stats sur le nouveau quiz + prévient le Quiz Doctor.
      await fetch("/api/integrations/tiquiz/sync", { method: "POST" });
      window.dispatchEvent(new Event("tiquiz-scope-changed"));
      router.refresh();
      toast.success("Quiz suivi mis à jour.");
    } catch {
      toast.error("Impossible d'appliquer la sélection.");
    } finally {
      setBusy(false);
    }
  }

  const Header = (
    <span className="flex items-center gap-2 font-medium">
      <Target className="size-4 text-primary" />
      Quiz suivi
    </span>
  );

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Liste indisponible (API Tiquiz KO / pas encore déployée) : on NE dit PAS
  // "aucun quiz". On propose de réessayer.
  if (loadError) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          <p className="text-sm text-muted-foreground">
            Impossible de récupérer tes quiz Tiquiz pour le moment. Réessaie dans un instant.
          </p>
          <Button size="sm" variant="outline" onClick={() => load()} className="mt-auto w-fit">
            <RefreshCw />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pas connecté : inviter à connecter (1 clic).
  if (!connected) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          <p className="text-sm text-muted-foreground">
            Connecte ton compte Tiquiz pour suivre ici le quiz que tu construis dans l'Atelier.
            En lecture seule, 1 clic.
          </p>
          <Button asChild size="sm" className="mt-auto w-fit">
            <a href="/api/integrations/tiquiz/start">
              <Link2 />
              Connecter mon compte Tiquiz
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connecté mais aucun quiz : inviter à en créer un.
  if (quizzes.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          <p className="text-sm text-muted-foreground">
            Tu n'as pas encore de quiz. Crée ton premier quiz dans Tiquiz : c'est lui que l'Atelier
            analysera ici.
          </p>
          <Button asChild size="sm" className="mt-auto w-fit">
            <a href={TIQUIZ_APP_URL} target="_blank" rel="noopener noreferrer">
              <Plus />
              Créer mon premier quiz
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selectedId = scope.startsWith("quiz:") ? scope.slice(5) : "";

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 py-5">
        {Header}
        <p className="text-sm text-muted-foreground">
          L'Atelier analyse un quiz à la fois. Choisis sur quel quiz tu veux bosser, c'est gardé en
          mémoire jusqu'à ce que tu en changes.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tiquiz-quiz" className="text-xs text-muted-foreground">
            Choisis ton quiz
          </label>
          <select
            id="tiquiz-quiz"
            value={selectedId}
            onChange={(e) => changeQuiz(`quiz:${e.target.value}`)}
            disabled={busy}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {projects.map((p) => {
              const projQuizzes = quizzes.filter((q) => q.project_id === p.id);
              if (projQuizzes.length === 0) return null;
              return (
                <optgroup key={p.id} label={p.name}>
                  {projQuizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {quizzes.filter((q) => !q.project_id).length > 0 && (
              <optgroup label="Sans projet">
                {quizzes
                  .filter((q) => !q.project_id)
                  .map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-auto w-fit">
          <a href="/avancees">
            <ExternalLink />
            Voir mes résultats et le Quiz Doctor
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
