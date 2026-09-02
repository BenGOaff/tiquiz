"use client";

// Liste des popquizzes du créateur. Visuellement aligné sur
// app/quizzes/QuizzesClient.tsx (même cards, mêmes icônes d'action,
// même filter par statut) pour que la traversée Quizzes ↔ Popquizzes
// se sente comme une seule app, pas deux modules séparés.
//
// Béné 2026-05-04 : « la version la plus cohérente avec le reste du
// fonctionnement. Plus jolie. Plus facile à utiliser. »

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Video,
  Copy,
  Code,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmbedCodeDialog } from "@/components/popquiz/EmbedCodeDialog";
import { useShareDomain } from "@/hooks/useShareDomain";
import { toast } from "sonner";
import { PageBanner } from "@/components/ui/page-banner";

export interface PopquizListItem {
  id: string;
  title: string;
  slug: string | null;
  is_published: boolean;
  views_count: number;
  completions_count: number;
  thumbnail_url: string | null;
  source: string;
}

type Filter = "all" | "active" | "draft";

export function PopquizzesClient({
  popquizzes: initial,
  isPaid,
  maxFree,
}: {
  popquizzes: PopquizListItem[];
  isPaid: boolean;
  /** Nombre max de popquizzes pour le plan gratuit (utilisé pour le gate UI). */
  maxFree: number;
}) {
  const t = useTranslations("popquizList");
  const router = useRouter();
  const [popquizzes, setPopquizzes] = useState<PopquizListItem[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [embedHandle, setEmbedHandle] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { shareOrigin, embedOrigin, buildPublicUrl } = useShareDomain();

  const counts = useMemo(() => {
    const active = popquizzes.filter((p) => p.is_published).length;
    const draft = popquizzes.length - active;
    return { all: popquizzes.length, active, draft };
  }, [popquizzes]);

  const filtered = useMemo(() => {
    if (filter === "all") return popquizzes;
    if (filter === "active") return popquizzes.filter((p) => p.is_published);
    return popquizzes.filter((p) => !p.is_published);
  }, [filter, popquizzes]);

  // Gate plan free : si l'utilisateur free a déjà atteint son quota,
  // on désactive le bouton « Nouveau Popquiz » avec un tooltip explicatif
  // au lieu de le laisser cliquer puis échouer au save.
  const atFreeLimit = !isPaid && popquizzes.length >= maxFree;

  function copyLink(p: PopquizListItem) {
    const handle = p.slug ?? p.id;
    // Honour the creator's chosen share domain (custom domain or
    // main host) — same source of truth as the editor's share tab.
    const url = buildPublicUrl("p", handle);
    void navigator.clipboard.writeText(url);
    toast.success(t("toastLinkCopied"));
  }

  function handleDelete(id: string, title: string) {
    const ok = window.confirm(
      t("confirmDelete", { title: title || t("untitledFallback") }),
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/popquiz/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !data.ok) {
          toast.error(data.error || t("toastDeleteFailed"));
          return;
        }
        setPopquizzes((prev) => prev.filter((p) => p.id !== id));
        toast.success(t("toastDeleted"));
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("toastNetworkError"));
      }
    });
  }

  return (
    <>
      {/* Bannière gradient — même pattern visuel que /quizzes pour la
          cohérence cross-list. CTA primaire à droite. */}
      <PageBanner
        icon={<Video className="h-5 w-5" />}
        actions={<>
          {atFreeLimit ? (
            <Button
              variant="secondary"
              disabled
              title={t("freeLimitTooltip")}
            >
              <Lock className="h-4 w-4 mr-2" />
              {t("freeLimitButton")}
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/popquiz/new">
                <Sparkles className="h-4 w-4 mr-2" />
                {t("newPopquiz")}
              </Link>
            </Button>
          )}
        </>}
      >
        {t("heroSubtitle")}
      </PageBanner>

      {/* Filtre par statut — même pattern que /quizzes */}
      {popquizzes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "active", "draft"] as const).map((f) => {
            const label =
              f === "all" ? t("filterAll") : f === "active" ? t("filterPublished") : t("filterDrafts");
            const c = counts[f];
            return (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="rounded-full"
              >
                {label}
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
                  {c}
                </Badge>
              </Button>
            );
          })}
        </div>
      )}

      {popquizzes.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center space-y-3">
          <Video className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">{t("emptyState")}</p>
          {atFreeLimit ? null : (
            <Button asChild>
              <Link href="/popquiz/new">{t("createFirst")}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const handle = p.slug ?? p.id;
            const editHref = `/popquiz/${p.id}`;
            const completionRate =
              p.views_count > 0
                ? Math.round((p.completions_count / p.views_count) * 100)
                : 0;
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail vidéo (16:9) — fallback : icône Video.
                        On utilise <img> plutôt que <Image> pour gérer
                        proprement les CDN externes (i.ytimg.com, vimeo)
                        sans avoir à configurer next/image domains. */}
                    <div className="relative w-24 h-14 rounded-md overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                      {p.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground">
                          <Video className="h-5 w-5" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] uppercase tracking-wide bg-black/60 text-white px-1 rounded">
                        {p.source}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">
                          {p.title || <span className="italic text-muted-foreground">{t("untitled")}</span>}
                        </h3>
                        {p.is_published ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-500/30">
                            {t("badgePublished")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t("badgeDraft")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{t("viewsCount", { count: p.views_count })}</span>
                        <span>·</span>
                        <span>{t("completionsCount", { count: p.completions_count })}</span>
                        {completionRate > 0 ? (
                          <>
                            <span>·</span>
                            <span className="font-medium text-foreground">
                              {t("completionRate", { rate: completionRate })}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {p.is_published ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyLink(p)}
                            title={t("actionCopyLink")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEmbedHandle(handle)}
                            title={t("actionEmbed")}
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild title={t("actionView")}>
                            <Link href={`/p/${handle}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </>
                      ) : null}
                      <Button variant="ghost" size="icon" asChild title={t("actionEdit")}>
                        <Link href={editHref}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id, p.title)}
                        disabled={pending}
                        title={t("actionDelete")}
                      >
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EmbedCodeDialog
        open={embedHandle !== null}
        onOpenChange={(o) => !o && setEmbedHandle(null)}
        embedUrl={
          embedHandle
            ? `${embedOrigin}/embed/p/${embedHandle}`
            : ""
        }
      />
    </>
  );
}
