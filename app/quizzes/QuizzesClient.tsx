"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TopPerformerBadge, TrendingBadge } from "@/components/ui/highlight-badge";
import { EmptyCanvasArt, EmptySearchArt } from "@/components/ui/illustrations";
import { stripHtml } from "@/lib/richText";
import { interpolateText } from "@/lib/quizPersonalization";
import {
  Eye,
  Play,
  CheckCircle,
  Users,
  Share2,
  Pencil,
  Trash2,
  Copy,
  Code,
  ClipboardList,
  Sparkles,
  MessageCircleQuestion,
  Video,
  BarChart3,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { EmbedCodeDialog } from "@/components/popquiz/EmbedCodeDialog";

type ProjectMode = "quiz" | "survey" | "popquiz";

type Project = {
  id: string;
  // Slug is popquiz-only — used to build pretty share / embed URLs.
  slug: string | null;
  title: string;
  status: string;
  mode: ProjectMode;
  views_count: number;
  starts_count: number;
  completions_count: number;
  shares_count: number;
  created_at: string;
  leads_count?: number;
};

// Quand `view = "folders"`, on affiche les 3 cartes-catégories
// (= état initial). Quand l'user clique sur une carte, `view` passe
// au mode correspondant et on affiche la liste filtrée. Le bouton
// "Retour aux catégories" remet view à "folders".
type View = "folders" | ProjectMode;

// Définition des 3 cases-catégories. Order = ordre d'affichage dans
// la grille. Les couleurs (bg + icon) sont alignées sur les badges
// existants pour la cohérence visuelle (quiz=bleu, sondage=violet,
// popquiz=cyan).
const FOLDERS: Array<{
  id: ProjectMode;
  icon: typeof Sparkles;
  iconColor: string;
  bgColor: string;
}> = [
  {
    id: "quiz",
    icon: Sparkles,
    iconColor: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "survey",
    icon: MessageCircleQuestion,
    iconColor: "text-purple-500 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "popquiz",
    icon: Video,
    iconColor: "text-cyan-500 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
];

export default function QuizzesClient({ userEmail }: { userEmail: string }) {
  const t = useTranslations("dashboard");
  const tProjects = useTranslations("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("folders");

  const [embedHandle, setEmbedHandle] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Charge en parallèle les 2 sources : quizzes (quiz +
        // sondages) et popquizzes. Les popquizzes étaient exclus
        // depuis le 2026-05-04 — ils sont réintégrés ici car la
        // page Mes projets agit désormais comme hub central
        // (cf. tipote MyContent), avec 3 cases dédiées plutôt
        // qu'une liste mélangée.
        const [quizRes, popquizRes] = await Promise.all([
          fetch("/api/quiz").then((r) => r.json()).catch(() => ({ ok: false })),
          fetch("/api/popquiz").then((r) => r.json()).catch(() => ({ ok: false })),
        ]);

        const quizRows: Record<string, unknown>[] = quizRes.ok
          ? (quizRes.quizzes ?? [])
          : [];
        const popquizRows: Record<string, unknown>[] = popquizRes.ok
          ? (popquizRes.popquizzes ?? [])
          : [];

        const enriched: Project[] = [];

        // Quiz / Sondages — enrich avec leads_count via /api/quiz/[id]
        for (const row of quizRows) {
          const qRes = await fetch(`/api/quiz/${row.id}`);
          const qData = await qRes.json();
          enriched.push({
            id: String(row.id),
            slug: null,
            title: String(row.title ?? ""),
            status: String(row.status ?? "draft"),
            mode: row.mode === "survey" ? "survey" : "quiz",
            views_count: Number(row.views_count ?? 0),
            starts_count: Number(row.starts_count ?? 0),
            completions_count: Number(row.completions_count ?? 0),
            shares_count: Number(row.shares_count ?? 0),
            created_at: String(row.created_at ?? ""),
            leads_count: qData.leads?.length ?? 0,
          });
        }

        // Popquizzes — pas de leads/starts/shares (le format vidéo
        // n'expose pas les mêmes événements), on remplit avec 0
        // pour garder la même shape Project.
        for (const row of popquizRows) {
          enriched.push({
            id: String(row.id),
            slug: typeof row.slug === "string" ? row.slug : null,
            title: String(row.title ?? ""),
            status: row.is_published ? "active" : "draft",
            mode: "popquiz",
            views_count: Number(row.views_count ?? 0),
            starts_count: 0,
            completions_count: Number(row.completions_count ?? 0),
            shares_count: 0,
            created_at: String(row.created_at ?? ""),
            leads_count: 0,
          });
        }

        enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setProjects(enriched);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDelete(projectId: string, mode: ProjectMode) {
    if (!confirm(t("confirmDelete"))) return;
    try {
      const path =
        mode === "popquiz"
          ? `/api/popquiz/${projectId}`
          : `/api/quiz/${projectId}`;
      const res = await fetch(path, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setProjects((prev) => prev.filter((q) => q.id !== projectId));
        toast.success(t("quizDeleted"));
      }
    } catch {
      toast.error("Error");
    }
  }

  function copyLink(p: Project) {
    const segment = p.mode === "popquiz" ? "p" : "q";
    const handle = p.mode === "popquiz" ? (p.slug ?? p.id) : p.id;
    const url = `${window.location.origin}/${segment}/${handle}`;
    navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  }

  const counts = useMemo(() => {
    const quiz = projects.filter((p) => p.mode === "quiz").length;
    const survey = projects.filter((p) => p.mode === "survey").length;
    const popquiz = projects.filter((p) => p.mode === "popquiz").length;
    return { quiz, survey, popquiz, all: projects.length };
  }, [projects]);

  // Liste filtrée — uniquement utile quand on est dans une case
  // (view !== "folders"). Sur l'écran "folders", on n'affiche pas
  // de liste, juste les 3 cards.
  const filteredList = useMemo(() => {
    if (view === "folders") return [];
    return projects.filter((p) => p.mode === view);
  }, [projects, view]);

  const topPerformerId = useMemo(() => {
    let best: { id: string; rate: number } | null = null;
    for (const p of projects) {
      if (p.starts_count < 5) continue;
      const rate = (p.leads_count ?? 0) / p.starts_count;
      if (rate <= 0) continue;
      if (!best || rate > best.rate) best = { id: p.id, rate };
    }
    return best?.id ?? null;
  }, [projects]);

  const trendingIds = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return new Set(
      projects
        .filter(
          (p) =>
            (p.leads_count ?? 0) >= 3 &&
            new Date(p.created_at).getTime() > sevenDaysAgo,
        )
        .map((p) => p.id),
    );
  }, [projects]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const embedUrl = embedHandle ? `${origin}/embed/p/${embedHandle}` : "";

  // Helper : récupère le label localisé d'une catégorie. Fallback
  // sur des libellés FR si la clé i18n n'existe pas (le déploiement
  // peut précéder l'ajout des locales).
  function folderLabel(id: ProjectMode): string {
    const fallback =
      id === "quiz"
        ? "Mes Quiz"
        : id === "survey"
          ? "Mes Sondages"
          : "Mes Popquiz";
    try {
      return tProjects(`folder_${id}` as "folder_quiz");
    } catch {
      return fallback;
    }
  }

  return (
    <AppShell userEmail={userEmail} headerTitle={tProjects("title")}>
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">{tProjects("title")}</h2>
          <p className="text-sm text-white/70">{tProjects("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Button asChild variant="secondary">
            <Link href="/quiz/new">
              <Sparkles className="h-4 w-4 mr-2" />
              {tProjects("createQuiz")}
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="bg-white/15 hover:bg-white/25 text-white"
          >
            <Link href="/survey/new">
              <MessageCircleQuestion className="h-4 w-4 mr-2" />
              {tProjects("createSurvey")}
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="bg-white/15 hover:bg-white/25 text-white"
          >
            <Link href="/popquiz/new">
              <Video className="h-4 w-4 mr-2" />
              {(() => {
                try {
                  return tProjects("createPopquiz" as "createQuiz");
                } catch {
                  return "Créer un popquiz";
                }
              })()}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">…</div>
      ) : view === "folders" ? (
        /* ─── État initial : grille de 3 cards-catégories ───
         * Pattern repris de tipote MyContent. Cliquer sur une card
         * passe `view` au mode correspondant ; la liste filtrée
         * apparaît à la place de la grille (avec un bouton retour). */
        <div className="space-y-6">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center flex flex-col items-center">
                <EmptyCanvasArt className="w-32 h-32 mb-2" />
                <h3 className="text-lg font-semibold mb-2">
                  {tProjects("emptyTitle")}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {tProjects("emptyDesc")}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button asChild className="rounded-full">
                    <Link href="/quiz/new">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {tProjects("createQuiz")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/survey/new">
                      <MessageCircleQuestion className="h-4 w-4 mr-2" />
                      {tProjects("createSurvey")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/popquiz/new">
                      <Video className="h-4 w-4 mr-2" />
                      {(() => {
                        try {
                          return tProjects("createPopquiz" as "createQuiz");
                        } catch {
                          return "Créer un popquiz";
                        }
                      })()}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FOLDERS.map((folder) => {
                const FIcon = folder.icon;
                const count = counts[folder.id];
                return (
                  <button
                    key={folder.id}
                    onClick={() => setView(folder.id)}
                    className="group text-left"
                    aria-label={folderLabel(folder.id)}
                  >
                    <Card className="group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-primary/40 cursor-pointer h-full will-change-transform">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-11 h-11 rounded-xl ${folder.bgColor} flex items-center justify-center transition-transform group-hover:scale-105`}
                        >
                          <FIcon className={`w-5 h-5 ${folder.iconColor}`} />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {folderLabel(folder.id)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {count}{" "}
                        {count <= 1 ? (
                          (() => {
                            try {
                              return tProjects("elementOne" as "untitled");
                            } catch {
                              return "élément";
                            }
                          })()
                        ) : (
                          (() => {
                            try {
                              return tProjects("elementMany" as "untitled");
                            } catch {
                              return "éléments";
                            }
                          })()
                        )}
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── Liste filtrée pour la catégorie sélectionnée ───
         * Bouton retour vers la grille des 3 cases. Le rendu de
         * chaque carte projet est identique à l'ancienne liste. */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("folders")}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              {(() => {
                try {
                  return tProjects("backToFolders" as "title");
                } catch {
                  return "Retour aux catégories";
                }
              })()}
            </Button>
            <h3 className="text-lg font-semibold">
              {folderLabel(view)} ({counts[view]})
            </h3>
          </div>

          {filteredList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center flex flex-col items-center">
                <EmptySearchArt className="w-28 h-28 mb-2" />
                <h3 className="text-lg font-semibold mb-2">
                  {tProjects("emptyFilterTitle")}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {tProjects("emptyFilterDesc")}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full"
                >
                  <Link
                    href={
                      view === "popquiz"
                        ? "/popquiz/new"
                        : view === "survey"
                          ? "/survey/new"
                          : "/quiz/new"
                    }
                  >
                    {view === "popquiz" ? (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        {(() => {
                          try {
                            return tProjects("createPopquiz" as "createQuiz");
                          } catch {
                            return "Créer un popquiz";
                          }
                        })()}
                      </>
                    ) : view === "survey" ? (
                      <>
                        <MessageCircleQuestion className="h-4 w-4 mr-2" />
                        {tProjects("createSurvey")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {tProjects("createQuiz")}
                      </>
                    )}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredList.map((p) => {
                const leads = p.leads_count ?? 0;
                const rate =
                  p.starts_count > 0
                    ? Math.round((leads / p.starts_count) * 100)
                    : 0;
                const isSurvey = p.mode === "survey";
                const isPopquiz = p.mode === "popquiz";

                // Title + pencil both lead to the editor for the right
                // type (popquiz → /popquiz/[id], quiz/survey → /quiz/[id]).
                const editHref = isPopquiz
                  ? `/popquiz/${p.id}`
                  : `/quiz/${p.id}`;

                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Link
                              href={editHref}
                              className="text-lg font-semibold hover:underline truncate"
                            >
                              {stripHtml(interpolateText(p.title, { name: "", gender: "x" })) || tProjects("untitled")}
                            </Link>
                            <Badge
                              variant="outline"
                              className={
                                isPopquiz
                                  ? "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800"
                                  : isSurvey
                                    ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              }
                            >
                              {isPopquiz ? (
                                <>
                                  <Video className="h-3 w-3 mr-1" />
                                  Popquiz
                                </>
                              ) : isSurvey ? (
                                <>
                                  <MessageCircleQuestion className="h-3 w-3 mr-1" />
                                  {tProjects("badgeSurvey")}
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {tProjects("badgeQuiz")}
                                </>
                              )}
                            </Badge>
                            <Badge
                              variant={
                                p.status === "active" ? "default" : "secondary"
                              }
                            >
                              {p.status === "active" ? "Active" : "Draft"}
                            </Badge>
                            {topPerformerId === p.id && <TopPerformerBadge />}
                            {trendingIds.has(p.id) &&
                              topPerformerId !== p.id && <TrendingBadge />}
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" /> {p.views_count}{" "}
                              {t("views")}
                            </span>
                            {!isPopquiz && (
                              <span className="flex items-center gap-1">
                                <Play className="h-3.5 w-3.5" /> {p.starts_count}{" "}
                                {t("starts")}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />{" "}
                              {p.completions_count} {t("completions")}
                            </span>
                            {!isPopquiz && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" /> {leads}{" "}
                                {isSurvey
                                  ? tProjects("respondents")
                                  : t("leads")}
                              </span>
                            )}
                            {!isSurvey && !isPopquiz && (
                              <span className="flex items-center gap-1">
                                <Share2 className="h-3.5 w-3.5" />{" "}
                                {p.shares_count} {t("shares")}
                              </span>
                            )}
                            {rate > 0 && (
                              <span className="font-medium text-foreground">
                                {rate}% {t("conversionRate")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyLink(p)}
                            title={t("copyLink")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {isPopquiz ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEmbedHandle(p.slug ?? p.id)}
                              title="Code d'intégration"
                            >
                              <Code className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={editHref} title={t("editQuiz")}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {!isPopquiz ? (
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={`/quiz/${p.id}/analytics`}
                                title="Statistiques"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(p.id, p.mode)}
                            title={t("deleteQuiz")}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <EmbedCodeDialog
        open={embedHandle !== null}
        onOpenChange={(o) => {
          if (!o) setEmbedHandle(null);
        }}
        embedUrl={embedUrl}
      />
    </AppShell>
  );
}
