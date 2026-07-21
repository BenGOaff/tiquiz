"use client";

// components/ProjectSwitcher.tsx
//
// Dropdown de sélection de projet dans le header Tiquiz. Port direct
// du pattern Tipote (Béné 2 juin 2026 — "même emplacement, même design") :
// - Liste les projets du user avec ProjectIdentityBadge (accent + emoji)
// - Permet de switcher (cookie côté client + reload)
// - "Nouveau projet" : gated multiprofils (modal upsell si plan non éligible)
// - Modifier (nom + accent + emoji + use_branding_logo) depuis le menu
// - Supprimer avec danger-zone (recopier le nom pour confirmer)
//
// Différences Tipote / Tiquiz volontairement conservées :
// - Plan gate : canCreateMore depuis GET /api/projects (gate via
//   canUseMultiProjects côté serveur : "beta" + allowlist env, tant
//   que le palier premium n'existe pas). Côté Tipote = plan "elite".
// - Toast : sonner (Tiquiz) au lieu de useToast (Tipote).
// - Update : PATCH /api/projects/[projectId] au lieu de PATCH /api/projects.
// - Delete : DELETE /api/projects/[projectId] au lieu de query string.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Plus,
  FolderOpen,
  Check,
  Trash2,
  Pencil,
  Crown,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectIdentityBadge } from "@/components/projects/ProjectIdentityBadge";
import {
  ProjectIdentityEditor,
  type ProjectIdentityValue,
} from "@/components/projects/ProjectIdentityEditor";

import { getActiveProjectCookie, switchProject } from "@/lib/projects/client";

type Project = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  // Visual identity — toutes optionnelles
  accent_color?: string | null;
  icon_emoji?: string | null;
  use_branding_logo?: boolean | null;
};

interface ProjectsResponse {
  ok: boolean;
  projects?: Project[];
  canCreateMore?: boolean;
  /** True pour monthly/yearly — affiche le switcher + CTA upgrade vers +. */
  showUpsell?: boolean;
  plan?: string | null;
}

export function ProjectSwitcher() {
  const t = useTranslations("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [canCreateMore, setCanCreateMore] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [targetProject, setTargetProject] = useState<Project | null>(null);

  const [newName, setNewName] = useState("");
  // Le dialog "Modifier" couvre nom + visual identity. Seed depuis le
  // projet ciblé à l'ouverture, save le tout en un PATCH.
  const [identityDraft, setIdentityDraft] = useState<ProjectIdentityValue>({
    name: "",
    accent_color: null,
    icon_emoji: null,
    use_branding_logo: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Charger les projets
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = (await res.json()) as ProjectsResponse;
      if (json.ok && Array.isArray(json.projects)) {
        setProjects(json.projects);
        setCanCreateMore(!!json.canCreateMore);
        setShowUpsell(!!json.showUpsell);

        const cookieId = getActiveProjectCookie();
        const found = json.projects.find((p) => p.id === cookieId);
        if (found) {
          setActiveId(found.id);
        } else if (json.projects.length) {
          const def = json.projects.find((p) => p.is_default);
          setActiveId(def?.id ?? json.projects[0]!.id);
        }
      }
    } catch {
      // fail-open
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const activeProject = projects.find((p) => p.id === activeId);

  // ─── Handlers ───

  const handleSwitchProject = (projectId: string) => {
    if (projectId === activeId) return;
    switchProject(projectId);
  };

  const handleNewProjectClick = () => {
    if (!canCreateMore) {
      setShowUpsellDialog(true);
      return;
    }
    setNewName("");
    setShowCreateDialog(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCreateProject = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();

      if (!json.ok) {
        if (json.error === "PLAN_REQUIRED") {
          setShowCreateDialog(false);
          setShowUpsellDialog(true);
          return;
        }
        throw new Error(json.message || json.error || "");
      }

      toast.success(t("toastCreated"), {
        description: t("toastCreatedDesc", { name: trimmed }),
      });
      setShowCreateDialog(false);

      // Switch direct sur le nouveau projet + reload (le user veut
      // y aller, c'est ce qu'il vient de créer).
      try {
        switchProject(json.project.id);
      } catch {
        // fallback : on refresh la liste localement si switch échoue
        void loadProjects();
      }
    } catch (e) {
      toast.error(t("toastCreateFailed"), {
        description: e instanceof Error && e.message ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenameClick = (proj: Project) => {
    setTargetProject(proj);
    setNewName(proj.name);
    setIdentityDraft({
      name: proj.name,
      accent_color: proj.accent_color ?? null,
      icon_emoji: proj.icon_emoji ?? null,
      use_branding_logo: proj.use_branding_logo ?? false,
    });
    setShowRenameDialog(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRename = async () => {
    if (!targetProject) return;
    const trimmedName = identityDraft.name.trim();
    if (!trimmedName) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${targetProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: trimmedName,
          accent_color: identityDraft.accent_color,
          icon_emoji: identityDraft.icon_emoji,
          use_branding_logo: identityDraft.use_branding_logo,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "");

      setProjects((prev) =>
        prev.map((p) =>
          p.id === targetProject.id
            ? {
                ...p,
                name: trimmedName,
                accent_color: identityDraft.accent_color,
                icon_emoji: identityDraft.icon_emoji,
                use_branding_logo: identityDraft.use_branding_logo,
              }
            : p,
        ),
      );
      toast.success(t("toastUpdated"));
      setShowRenameDialog(false);
    } catch (e) {
      toast.error(t("toastUpdateFailed"), {
        description: e instanceof Error && e.message ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (proj: Project) => {
    setTargetProject(proj);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!targetProject) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${targetProject.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || json.error || "");

      toast.success(t("toastDeleted"));
      setShowDeleteDialog(false);

      // Si on supprime le projet actif, switch sur le default
      if (targetProject.id === activeId) {
        const defaultProj = projects.find((p) => p.is_default);
        if (defaultProj) {
          switchProject(defaultProj.id);
          return;
        }
      }

      setProjects((prev) => prev.filter((p) => p.id !== targetProject.id));
    } catch (e) {
      toast.error(t("toastDeleteFailed"), {
        description: e instanceof Error && e.message ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  // Logique d'affichage (Béné 2 juin 2026) :
  // - free → invisible (statu quo, "free ne bouge pas")
  // - monthly / yearly → VISIBLE avec CTA upgrade vers mensuel+/annuel+
  //   (= showUpsell = true côté API)
  // - monthly_plus / yearly_plus / beta / lifetime → visible (canCreateMore)
  // - peu importe le plan, dès qu'on a ≥ 2 projets → visible
  const hasMultipleProjects = projects.length > 1;
  if (!hasMultipleProjects && !canCreateMore && !showUpsell) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background hover:bg-accent transition-colors text-sm font-medium max-w-[240px]"
            title={t("switchTitle")}
            style={
              activeProject?.accent_color
                ? {
                    borderColor: `${activeProject.accent_color}66`,
                    boxShadow: `inset 0 0 0 1px ${activeProject.accent_color}1a`,
                  }
                : undefined
            }
          >
            {activeProject ? (
              <ProjectIdentityBadge
                project={activeProject}
                size="md"
                nameOverride={activeProject.name || t("defaultSpace")}
              />
            ) : (
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{t("defaultSpace")}</span>
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          {projects.map((proj) => (
            <DropdownMenuItem
              key={proj.id}
              className="flex items-center justify-between gap-2 group"
              onSelect={(e) => {
                if ((e.target as HTMLElement).closest("[data-action]")) {
                  e.preventDefault();
                  return;
                }
                handleSwitchProject(proj.id);
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {proj.id === activeId ? (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 flex-shrink-0" />
                )}
                <ProjectIdentityBadge project={proj} size="sm" />
                {proj.is_default && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded flex-shrink-0">
                    {t("defaultBadge")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  data-action="rename"
                  className="p-1 rounded hover:bg-accent"
                  title={t("renameAction")}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameClick(proj);
                  }}
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
                {!proj.is_default && (
                  <button
                    data-action="delete"
                    className="p-1 rounded hover:bg-destructive/10"
                    title={t("deleteAction")}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(proj);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                )}
              </div>
            </DropdownMenuItem>
          ))}

          {!projects.length && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              {t("emptyMenu")}
            </div>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={handleNewProjectClick} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>{t("newProject")}</span>
            {!canCreateMore && (
              <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 ml-auto" />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog : Créer un projet */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newProject")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("createSrDesc")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("createBody")}
          </p>
          <Input
            ref={inputRef}
            placeholder={t("namePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateProject();
            }}
            maxLength={80}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancelBtn")}</Button>
            </DialogClose>
            <Button
              onClick={handleCreateProject}
              disabled={!newName.trim() || submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {t("createBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : Upsell multiprofils — cible monthly / yearly (showUpsell) */}
      <Dialog open={showUpsellDialog} onOpenChange={setShowUpsellDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              {t("upsellTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("upsellSrDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{t("upsellBody")}</p>
            <p className="text-foreground">{t("upsellPlans")}</p>
            <p className="text-[12px] italic text-muted-foreground/80">
              {t("upsellPending")}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("closeBtn")}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : Modifier le projet (nom + couleur + icône + logo) */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("editSrDesc")}
            </DialogDescription>
          </DialogHeader>
          <ProjectIdentityEditor
            initial={identityDraft}
            brandingLogoUrl={null}
            onChange={setIdentityDraft}
            disabled={submitting}
          />
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t("cancelBtn")}</Button>
            </DialogClose>
            <Button
              onClick={handleRename}
              disabled={!identityDraft.name.trim() || submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("saveBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : Supprimer — danger zone (recopie du nom) */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(o) => {
          setShowDeleteDialog(o);
          if (!o) setDeleteConfirmText("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="size-9 rounded-full bg-destructive/15 grid place-items-center ring-1 ring-destructive/30">
                <AlertTriangle className="size-5 text-destructive" />
              </span>
              <DialogTitle className="text-destructive">
                {t("dangerZone")}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              {t("deleteSrDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              {t("deleteBody", { name: targetProject?.name ?? "" })}
            </p>
            <div className="rounded-md border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {t("deleteWhatHappens")}
              </p>
              <ul className="text-xs text-foreground/80 space-y-0.5 list-disc ml-4">
                <li>{t("deleteItem1")}</li>
                <li>{t("deleteItem2")}</li>
                <li>{t("deleteItem3")}</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                {t("deleteConfirmLabel")}{" "}
                <span className="font-mono font-bold">
                  {targetProject?.name}
                </span>
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={targetProject?.name ?? ""}
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t("cancelBtn")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                submitting ||
                deleteConfirmText.trim() !== (targetProject?.name ?? "").trim()
              }
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("deleteConfirmBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
