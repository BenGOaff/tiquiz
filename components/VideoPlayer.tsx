"use client";

import { useEffect, useRef } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

const YT_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function youtubeId(url: string): string | null {
  const m = url.match(YT_RE);
  return m ? m[1] : null;
}

/**
 * Lecteur vidéo du jour. Gère YouTube (iframe), HLS (.m3u8 via hls.js)
 * et les fichiers directs (mp4/webm). Quand aucune vidéo n'est encore
 * chargée, on affiche un placeholder propre plutôt qu'un cadre vide.
 *
 * Quand le pipeline auto-hébergé sera branché, on passera ici l'URL de
 * lecture signée (HLS) renvoyée par le serveur.
 */
export function VideoPlayer({
  src,
  poster,
  className,
}: {
  src: string | null;
  poster?: string | null;
  /** Classes ajoutées au cadre (ex. rounded-t-none sous un bandeau titré). */
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHls = !!src && src.includes(".m3u8");

  useEffect(() => {
    if (!isHls || !src || !videoRef.current) return;
    const video = videoRef.current;

    // Safari lit le HLS nativement.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (Hls.isSupported()) {
        const instance = new Hls();
        instance.loadSource(src);
        instance.attachMedia(videoRef.current);
        hls = instance;
      }
    });
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [isHls, src]);

  const frame = cn(
    "aspect-video w-full overflow-hidden rounded-xl bg-foreground/5 ring-1 ring-foreground/10",
    className,
  );

  if (!src) {
    return (
      <div className={`${frame} flex flex-col items-center justify-center gap-2 text-muted-foreground`}>
        <Film className="size-8" />
        <span className="text-sm">La vidéo de ce jour arrive très vite.</span>
      </div>
    );
  }

  const ytId = youtubeId(src);
  if (ytId) {
    return (
      <div className={frame}>
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          title="Vidéo du jour"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={frame}>
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        poster={poster ?? undefined}
        src={isHls ? undefined : src}
      />
    </div>
  );
}
