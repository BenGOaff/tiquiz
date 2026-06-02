"use client";

// components/ProjectSwitcher.tsx
//
// Dropdown projets multiprofils. Comportement :
// - Si l'user n'a qu'1 projet → return null (totalement transparent
//   pour le user actuel qui ne sait même pas que les projets existent).
// - Si l'user a ≥ 2 projets → dropdown sélectionner + indicateur visuel.
// - Si l'user est éligible (canCreateMore=true) → bouton "Nouveau projet".
//
// Phase 2 du chantier multiprofils : ce switcher EXISTE et bascule le
// cookie côté serveur, mais aucune route de lecture/écriture n'est
// encore filtrée par projet. La phase 3 activera le scoping.

import { useEffect, useState } from "react";
import { ChevronDown, FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";

interface ProjectSummary {
  id: string;
  name: string;
  is_default: boolean;
}

interface ProjectsResponse {
  ok: boolean;
  projects?: ProjectSummary[];
  canCreateMore?: boolean;
}

interface ActiveResponse {
  ok: boolean;
  activeProjectId?: string;
}

export function ProjectSwitcher() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [canCreateMore, setCanCreateMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/projects", { cache: "no-store", credentials: "same-origin" }).then(
        (r) => r.json() as Promise<ProjectsResponse>,
      ),
      fetch("/api/projects/active", { cache: "no-store", credentials: "same-origin" }).then(
        (r) => r.json() as Promise<ActiveResponse>,
      ),
    ])
      .then(([list, active]) => {
        if (cancelled) return;
        if (list?.ok && Array.isArray(list.projects)) {
          setProjects(list.projects);
          setCanCreateMore(!!list.canCreateMore);
        }
        if (active?.ok && active.activeProjectId) {
          setActiveId(active.activeProjectId);
        }
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tant qu'on n'a pas chargé OU si 1 seul projet → invisible. Aucun
  // user actuel ne voit la moindre différence.
  if (!projects || projects.length <= 1) {
    // ⚠️ Sauf si l'user est éligible — alors on lui montre le CTA
    // "Créer un autre projet" pour qu'il puisse adopter la feature.
    if (!projects || !canCreateMore || projects.length !== 1) return null;
  }

  const activeProject =
    projects.find((p) => p.id === activeId) ??
    projects.find((p) => p.is_default) ??
    projects[0];

  async function handleSwitch(projectId: string) {
    setOpen(false);
    if (projectId === activeId) return;
    try {
      const res = await fetch("/api/projects/active", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error("Impossible de changer de projet.");
        return;
      }
      setActiveId(projectId);
      // Recharge l'app pour que les listes (quizzes, leads, etc.)
      // se re-fetch avec le nouveau projet actif.
      window.location.reload();
    } catch {
      toast.error("Erreur réseau.");
    }
  }

  async function handleCreate() {
    const name = window.prompt("Nom du nouveau projet ?");
    if (!name || !name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.error === "PLAN_REQUIRED") {
          toast.error(data.message ?? "Disponible dans un plan supérieur.");
        } else {
          toast.error("Impossible de créer le projet.");
        }
        return;
      }
      // Refresh la liste
      const refreshed = (await fetch("/api/projects", {
        cache: "no-store",
        credentials: "same-origin",
      }).then((r) => r.json())) as ProjectsResponse;
      if (refreshed?.ok && Array.isArray(refreshed.projects)) {
        setProjects(refreshed.projects);
      }
      toast.success("Projet créé !");
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setCreating(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 hover:bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition"
        title="Changer de projet"
      >
        <FolderOpen className="w-4 h-4 text-primary" />
        <span className="truncate max-w-[160px]">{activeProject?.name ?? "Mon espace"}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-1.5 w-64 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
            <div className="py-1 max-h-72 overflow-y-auto">
              {projects?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSwitch(p.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition flex items-center gap-2 ${
                    p.id === activeProject?.id ? "bg-primary/5 text-foreground font-medium" : "text-foreground"
                  }`}
                >
                  <FolderOpen
                    className={`w-4 h-4 shrink-0 ${
                      p.id === activeProject?.id ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="truncate">{p.name}</span>
                  {p.is_default && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                      Défaut
                    </span>
                  )}
                </button>
              ))}
            </div>
            {canCreateMore && (
              <div className="border-t border-border">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/5 transition flex items-center gap-2 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  {creating ? "Création…" : "Nouveau projet"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
