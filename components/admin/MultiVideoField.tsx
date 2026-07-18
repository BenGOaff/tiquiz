"use client";

import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoField } from "@/components/admin/VideoField";
import type { DayVideo } from "@/lib/types";

/**
 * Liste ORDONNÉE de vidéos d'un module (ex. une par réseau social).
 * Chaque entrée : un titre (nom du réseau, affiché dans le bandeau
 * brandé) + une vidéo (upload auto-hébergé OU URL externe). Ajout /
 * suppression / réordonnancement. L'ordre définit le N des shortcodes
 * [[video:N]] côté contenu.
 *
 * Utilisée quand un jour a besoin de plus de deux vidéos ; alimente la
 * colonne days.videos (jsonb). Si la liste est vide, le jour retombe sur
 * le couple video/video2 classique (VideoField x2 dans DayEditor).
 */
export function MultiVideoField({
  videos,
  onChange,
}: {
  videos: DayVideo[];
  onChange: (next: DayVideo[]) => void;
}) {
  function update(i: number, patch: Partial<DayVideo>) {
    onChange(videos.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }
  function remove(i: number) {
    onChange(videos.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= videos.length) return;
    const next = [...videos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add() {
    onChange([...videos, { title: "", url: "", video_id: null }]);
  }

  return (
    <div className="flex flex-col gap-4">
      {videos.map((v, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface-soft/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Vidéo {i + 1} · [[video:{i + 1}]]
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Monter"
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => move(i, 1)}
                disabled={i === videos.length - 1}
                aria-label="Descendre"
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                aria-label="Retirer cette vidéo"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <VideoField
            label={`Vidéo ${i + 1}`}
            videoUrl={v.url ?? ""}
            videoId={v.video_id}
            title={v.title}
            titlePlaceholder="Titre / nom du réseau (ex. Facebook)"
            titleAlwaysVisible
            onUrlChange={(url) => update(i, { url })}
            onUploaded={(video_id) => update(i, { video_id, url: "" })}
            onClearUpload={() => update(i, { video_id: null })}
            onTitleChange={(title) => update(i, { title })}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-fit">
        <Plus />
        Ajouter une vidéo
      </Button>
    </div>
  );
}
