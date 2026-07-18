"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Film, CheckCircle2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Champ vidéo d'un jour. Deux modes exclusifs :
 *  1. Une vidéo uploadée sur ton serveur (pipeline tus + Caddy). C'est
 *     l'option auto-hébergée : le fichier est servi via une URL signée.
 *  2. Une URL externe (YouTube, lien direct), pratique pour démarrer.
 */
export function VideoField({
  label = "Vidéo du jour",
  videoUrl,
  videoId,
  title,
  titlePlaceholder = "Titre de la vidéo (optionnel)",
  titleAlwaysVisible = false,
  onUrlChange,
  onUploaded,
  onClearUpload,
  onTitleChange,
}: {
  label?: string;
  videoUrl: string;
  videoId: string | null;
  /** Titre affiché dans le bandeau brandé au-dessus du lecteur (optionnel). */
  title: string;
  titlePlaceholder?: string;
  /** Affiche le champ titre même sans vidéo (utile pour nommer un slot
   *  avant d'y mettre la vidéo, ex. un réseau social). */
  titleAlwaysVisible?: boolean;
  onUrlChange: (v: string) => void;
  onUploaded: (videoId: string) => void;
  onClearUpload: () => void;
  onTitleChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleFile(file: File) {
    const tokenRes = await fetch("/api/admin/video/upload-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    if (tokenRes.status === 503) {
      toast.error("Le pipeline vidéo n'est pas encore branché sur le serveur. Colle une URL pour le moment.");
      return;
    }
    const token = await tokenRes.json();
    if (!tokenRes.ok) {
      toast.error(token.reason === "bad_ext" ? "Format vidéo non accepté (mp4, webm, mov, m4v, mkv)." : "Upload impossible.");
      return;
    }

    const { Upload: TusUpload } = await import("tus-js-client");
    setProgress(0);
    const upload = new TusUpload(file, {
      endpoint: token.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: { filename: file.name, filetype: file.type, videoId: token.videoId },
      headers: { Authorization: `Bearer ${token.token}` },
      onError: () => {
        setProgress(null);
        toast.error("L'upload a échoué. Réessaie.");
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: async () => {
        setProgress(null);
        // Marque la vidéo prête, puis la relie au jour.
        await fetch(`/api/admin/video/${token.videoId}/ready`, { method: "POST" });
        onUploaded(token.videoId);
        toast.success("Vidéo uploadée et prête.");
      },
    });
    upload.start();
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>

      {videoId ? (
        <div className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" />
            Vidéo uploadée sur ton serveur
          </span>
          <Button variant="ghost" size="sm" onClick={onClearUpload}>
            <X />
            Retirer
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Film className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={videoUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="Colle une URL YouTube ou un lien vidéo"
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={progress !== null}
          >
            <Upload />
            {progress !== null ? `${progress}%` : "Uploader"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Uploade un fichier (hébergé sur ton serveur, lecture protégée) ou colle une URL YouTube.
      </p>

      {(titleAlwaysVisible || videoId || videoUrl.trim()) && (
        <div className="flex flex-col gap-1">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
          />
          <p className="text-xs text-muted-foreground">
            Affiché dans un bandeau aux couleurs de l&apos;Atelier du Quiz au-dessus du lecteur.
          </p>
        </div>
      )}
    </div>
  );
}
