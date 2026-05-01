"use client";

// Popquiz creation form. Three blocks:
//   1. Title + URL (live-parsed; drives the preview)
//   2. Live preview (the same PopquizPlayer the viewer will see)
//   3. Cues list (timestamp + linked quiz + behavior)
//
// On save we POST the full draft as one payload; the API handles
// the atomic insert + ownership checks. A future iteration will add
// drag-on-timeline editing and a theme picker.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PopquizPlayer } from "@/components/popquiz/PopquizPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseVideoUrl } from "@/lib/popquiz";
import type { Popquiz, PopquizCue } from "@/lib/popquiz";

interface QuizOption {
  id: string;
  title: string;
}

interface DraftCue {
  // Local-only id so React keys are stable while editing; never sent
  // to the API (the DB mints the real uuid on insert).
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

export default function PopquizNewClient({
  quizzes,
}: {
  quizzes: QuizOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [cues, setCues] = useState<DraftCue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseVideoUrl(url), [url]);

  // Synthesize a Popquiz from the current draft so the editor
  // doubles as a live preview — same component as the public viewer.
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
      setError("Crée d'abord un quiz dans /quizzes.");
      return;
    }
    setError(null);
    setCues((prev) => [
      ...prev,
      {
        localId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `cue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        quizId: quizzes[0].id,
        // Stagger by 5 s after the previous cue so two cues don't
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
      router.push(publish ? `/p/${json.popquizId}` : "/popquizzes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Nouveau Popquiz</h1>
        <p className="text-sm text-muted-foreground">
          Charge une vidéo, ajoute des cues qui pausent la lecture
          pour faire apparaître un quiz existant.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border bg-card p-4">
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
      </section>

      {draftPopquiz ? (
        <section className="space-y-2">
          <Label>Aperçu</Label>
          <PopquizPlayer
            popquiz={draftPopquiz}
            renderOverlay={({ cue, onAnswered, onSkipped }) => {
              const linked = quizzes.find((q) => q.id === cue.quizId);
              return (
                <div className="p-6 space-y-3">
                  <h2 className="text-base font-semibold">
                    Cue @ {formatMs(cue.timestampMs)} —{" "}
                    {linked?.title ?? "Quiz inconnu"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    En lecture finale, le quiz s'affichera ici. Pour
                    l'aperçu on simule juste la pause.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onAnswered()}>
                      Reprendre
                    </Button>
                    {cue.behavior === "optional" ? (
                      <Button size="sm" variant="outline" onClick={onSkipped}>
                        Passer
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            }}
          />
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border bg-card p-4">
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
            {cues.map((cue) => (
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
            ))}
          </ul>
        )}
      </section>

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
          {saving ? "Publication…" : "Publier & obtenir le lien"}
        </Button>
      </div>
    </main>
  );
}
