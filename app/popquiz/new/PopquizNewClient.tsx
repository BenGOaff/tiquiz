"use client";

// Popquiz creation flow, wrapped in AppShell so it sits inside the
// same chrome (sidebar, header, max-width container) as every other
// authoring page in the app. Layout, banner and section cards mirror
// /quizzes so the editor doesn't feel like a side-project.
//
// Publishing returns to a success Dialog (URL + copy + open) instead
// of jumping the user straight to the public play page — same
// pattern Tiquiz uses for quizzes / surveys.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Video,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PopquizPlayer } from "@/components/popquiz/PopquizPlayer";
import { parseVideoUrl } from "@/lib/popquiz";
import type { Popquiz, PopquizCue } from "@/lib/popquiz";
import { toast } from "sonner";

interface QuizOption {
  id: string;
  title: string;
  status: string;
}

interface DraftCue {
  // Local-only id so React keys are stable while editing; never sent
  // to the API — the DB mints the real uuid on insert.
  localId: string;
  quizId: string;
  timestampMs: number;
  behavior: "block" | "optional";
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PopquizNewClient({
  userEmail,
  quizzes,
}: {
  userEmail: string;
  quizzes: QuizOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [cues, setCues] = useState<DraftCue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state — set after a successful publish, drives the
  // confirmation Dialog. Mirrors the share-modal flow elsewhere in
  // the app rather than auto-redirecting.
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseVideoUrl(url), [url]);

  // Synthesize a Popquiz from the current draft so the same
  // PopquizPlayer the public viewer uses can render an inline
  // preview — WYSIWYG.
  const draftPopquiz = useMemo<Popquiz | null>(() => {
    if (!parsed) return null;
    return {
      id: "draft",
      title: title || "Sans titre",
      description: null,
      locale: "fr",
      isPublished: false,
      theme: null,
      video: {
        id: "draft-video",
        source: parsed.source,
        externalUrl: parsed.normalizedUrl,
        externalId: parsed.externalId,
        storagePath: null,
        hlsPath: null,
        thumbnailUrl: null,
        durationMs: null,
        status: "ready",
      },
      cues: cues.map<PopquizCue>((c, i) => ({
        id: c.localId,
        quizId: c.quizId,
        timestampMs: c.timestampMs,
        behavior: c.behavior,
        displayOrder: i,
      })),
    };
  }, [parsed, title, cues]);

  function addCue() {
    if (quizzes.length === 0) {
      setError("Crée d'abord un quiz dans Mes projets.");
      return;
    }
    setError(null);
    setCues((prev) => [
      ...prev,
      {
        localId: genId(),
        quizId: quizzes[0].id,
        // Stagger by 5 s after the previous cue so two cues never
        // collide on the (popquiz_id, timestamp_ms) unique index.
        timestampMs:
          prev.length === 0 ? 5000 : prev[prev.length - 1].timestampMs + 5000,
        behavior: "block",
      },
    ]);
  }

  function removeCue(localId: string) {
    setCues((prev) => prev.filter((c) => c.localId !== localId));
  }

  function updateCue(localId: string, patch: Partial<DraftCue>) {
    setCues((prev) =>
      prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)),
    );
  }

  async function handleSave(publish: boolean) {
    setError(null);
    if (!title.trim()) {
      setError("Donne un titre à ton popquiz.");
      return;
    }
    if (!parsed) {
      setError("Colle une URL YouTube, Vimeo ou .mp4 valide.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/popquiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          is_published: publish,
          cues: cues.map((c) => ({
            quiz_id: c.quizId,
            timestamp_ms: c.timestampMs,
            behavior: c.behavior,
          })),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      if (publish) {
        setPublishedId(json.popquizId);
      } else {
        toast.success("Brouillon enregistré");
        router.push("/quizzes");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  const publishedUrl =
    publishedId && typeof window !== "undefined"
      ? `${window.location.origin}/p/${publishedId}`
      : "";

  async function copyPublishedUrl() {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      toast.success("Lien copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  return (
    <AppShell userEmail={userEmail} headerTitle="Nouveau Popquiz">
      {/* Banner — same gradient + icon-tile pattern as /quizzes so
          the editor reads as part of the same product, not a side
          experiment. */}
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <Video className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">Popquiz</h2>
          <p className="text-sm text-white/80">
            Charge une vidéo, place des cues sur la timeline pour faire
            apparaître un quiz existant en plein milieu de la lecture.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Onboarding vidéo Q1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">URL de la vidéo</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  •  https://vimeo.com/…  •  https://…/video.mp4"
            />
            {url && !parsed ? (
              <p className="text-xs text-destructive">
                URL non reconnue (YouTube, Vimeo ou lien direct).
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {draftPopquiz ? (
        <Card className="overflow-hidden">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <Label className="text-sm">Aperçu</Label>
              <span className="text-[11px] text-muted-foreground">
                Le quiz s'affichera ici quand un cue sera atteint.
              </span>
            </div>
            <PopquizPlayer
              popquiz={draftPopquiz}
              renderOverlay={({ cue, onSkipped }) => {
                const linked = quizzes.find((q) => q.id === cue.quizId);
                return (
                  <div className="absolute inset-0 grid place-items-center p-6">
                    <div className="max-w-md w-full rounded-2xl bg-white shadow-2xl p-6 space-y-3">
                      <h3 className="text-base font-semibold">
                        Cue @ {formatMs(cue.timestampMs)} —{" "}
                        {linked?.title ?? "Quiz inconnu"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        En lecture finale, le quiz lié s'affichera ici.
                        Clique sur la croix pour reprendre la vidéo.
                      </p>
                      {cue.behavior === "optional" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onSkipped}
                        >
                          Passer
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="py-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Cues</h2>
              <p className="text-xs text-muted-foreground">
                Le quiz se déclenche à ce timestamp.
              </p>
            </div>
            <Button size="sm" onClick={addCue} type="button">
              <Plus className="size-4 mr-1" /> Ajouter
            </Button>
          </div>

          {cues.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun cue pour le moment.
            </p>
          ) : (
            <ul className="space-y-2">
              {cues.map((cue) => {
                const linked = quizzes.find((q) => q.id === cue.quizId);
                const isDraftQuiz = linked && linked.status !== "active";
                return (
                  <li
                    key={cue.localId}
                    className="flex flex-wrap items-center gap-2 rounded-md border p-3"
                  >
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={Math.floor(cue.timestampMs / 1000)}
                      onChange={(e) =>
                        updateCue(cue.localId, {
                          timestampMs:
                            Math.max(0, Number(e.target.value) || 0) * 1000,
                        })
                      }
                      className="w-24"
                      aria-label="Timestamp en secondes"
                    />
                    <span className="text-xs text-muted-foreground">s</span>

                    <select
                      value={cue.quizId}
                      onChange={(e) =>
                        updateCue(cue.localId, { quizId: e.target.value })
                      }
                      className="flex-1 min-w-[200px] h-9 rounded-md border bg-background px-2 text-sm"
                      aria-label="Quiz lié"
                    >
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                          {q.status !== "active" ? " (brouillon)" : ""}
                        </option>
                      ))}
                    </select>

                    <select
                      value={cue.behavior}
                      onChange={(e) =>
                        updateCue(cue.localId, {
                          behavior: e.target.value as "block" | "optional",
                        })
                      }
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      aria-label="Comportement"
                    >
                      <option value="block">Bloquant</option>
                      <option value="optional">Optionnel</option>
                    </select>

                    {isDraftQuiz ? (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Publie ce quiz pour qu'il s'affiche
                      </span>
                    ) : null}

                    <Button
                      size="icon"
                      variant="ghost"
                      type="button"
                      onClick={() => removeCue(cue.localId)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => handleSave(false)}
          type="button"
        >
          Enregistrer en brouillon
        </Button>
        <Button
          disabled={saving}
          onClick={() => handleSave(true)}
          type="button"
        >
          <Sparkles className="size-4 mr-2" />
          {saving ? "Publication…" : "Publier & obtenir le lien"}
        </Button>
      </div>

      {/* Success modal — stays on the editor page until the user
          dismisses, so they can keep tweaking and re-publish without
          losing context. */}
      <Dialog
        open={publishedId !== null}
        onOpenChange={(o) => {
          if (!o) setPublishedId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Popquiz publié 🎉</DialogTitle>
            <DialogDescription>
              Partage ce lien à ton audience. Tu peux y revenir depuis
              Mes projets à tout moment.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
            <code className="text-xs flex-1 truncate font-mono">
              {publishedUrl}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyPublishedUrl}
              type="button"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPublishedId(null);
                router.push("/quizzes");
              }}
              type="button"
            >
              Aller à mes projets
            </Button>
            <Button asChild>
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4 mr-2" />
                Voir le popquiz
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
