import { Play } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";

/**
 * Vignette vidéo brandée L'Atelier du Quiz : un bandeau aux couleurs du
 * produit avec le titre de la vidéo, posé au-dessus du lecteur. Sans
 * titre, on rend le lecteur nu (comportement historique). Utilisée par
 * la page du jour, aussi bien pour les vidéos placées via les
 * shortcodes [[video:1]] / [[video:2]] que pour celles affichées en
 * haut de page.
 */
export function VideoBlock({ src, title }: { src: string | null; title?: string | null }) {
  const t = (title ?? "").trim();
  if (!t) return <VideoPlayer src={src} />;

  return (
    <figure className="flex flex-col">
      <figcaption className="flex items-center justify-between gap-3 rounded-t-xl bg-primary px-4 py-2.5 text-primary-foreground">
        <span className="flex min-w-0 items-center gap-2">
          <Play className="size-4 shrink-0 fill-current" />
          <span className="truncate font-display text-sm font-bold sm:text-base">{t}</span>
        </span>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest opacity-80">
          L&apos;Atelier du Quiz
        </span>
      </figcaption>
      <VideoPlayer src={src} className="rounded-t-none" />
    </figure>
  );
}
