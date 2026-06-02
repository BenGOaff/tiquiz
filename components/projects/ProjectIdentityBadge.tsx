"use client";

// Visual identity badge pour un projet : "icon chip" + nom, stylé
// avec l'accent color du projet quand défini. Port direct du pattern
// Tipote (Béné 2 juin 2026 — alignement "même emplacement, même design").
//
// Réutilisé par :
//   - la pill header (trigger ProjectSwitcher)
//   - les items du dropdown
//   - l'indicateur "projet actif" en bas de sidebar (optionnel)
//
// Ordre de résolution de l'icône :
//   1. use_branding_logo === true ET logo URL → render le logo
//   2. icon_emoji set → render l'emoji
//   3. ni l'un ni l'autre → fallback sur folder glyph
//
// Le logo n'est pas fetché ici — le parent le passe (vit sur
// profiles.brand_logo côté Tiquiz, scopé par projet via business_profile
// quand cette table sera ajoutée plus tard).

import { FolderOpen } from "lucide-react";

export interface ProjectBadgeProject {
  id: string;
  name: string;
  accent_color?: string | null;
  icon_emoji?: string | null;
  use_branding_logo?: boolean | null;
}

interface Props {
  project: ProjectBadgeProject;
  /** Logo URL — utilisée quand use_branding_logo est true. */
  brandingLogoUrl?: string | null;
  /** Taille visuelle — ajuste à la fois la pastille et le gap. */
  size?: "sm" | "md" | "lg";
  /** Override custom du nom (ex. nom default traduit). */
  nameOverride?: string;
  /** Cache le nom et ne render que la pastille. */
  iconOnly?: boolean;
  className?: string;
}

const SIZE_TOKENS: Record<
  "sm" | "md" | "lg",
  { chip: string; emoji: string; glyph: string; text: string; gap: string }
> = {
  sm: {
    chip: "size-5 text-[11px]",
    emoji: "text-xs",
    glyph: "size-3",
    text: "text-xs",
    gap: "gap-1.5",
  },
  md: {
    chip: "size-6 text-sm",
    emoji: "text-sm",
    glyph: "size-3.5",
    text: "text-sm",
    gap: "gap-2",
  },
  lg: {
    chip: "size-8 text-base",
    emoji: "text-lg",
    glyph: "size-4",
    text: "text-sm font-semibold",
    gap: "gap-2.5",
  },
};

export function ProjectIdentityBadge({
  project,
  brandingLogoUrl,
  size = "md",
  nameOverride,
  iconOnly,
  className,
}: Props) {
  const tokens = SIZE_TOKENS[size];
  const accent = project.accent_color || null;
  const useLogo = project.use_branding_logo && brandingLogoUrl;
  const emoji = project.icon_emoji;

  // Le fond de la pastille est une version tintée de l'accent si set,
  // sinon un muted discret. La bordure garde la pastille visible sur
  // un header chargé.
  const chipStyle = accent
    ? {
        backgroundColor: `${accent}1f`, // ~12% opacity
        borderColor: `${accent}66`, // ~40% opacity
        color: accent,
      }
    : undefined;

  return (
    <span className={`inline-flex items-center ${tokens.gap} ${className ?? ""}`}>
      <span
        className={`${tokens.chip} grid place-items-center rounded-md border bg-muted/60 overflow-hidden shrink-0`}
        style={chipStyle}
        aria-hidden
      >
        {useLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandingLogoUrl!}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              // Logo cassé → fallback emoji ou glyph en cachant l'img.
              // La classe parent reste pour conserver la teinte.
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : emoji ? (
          <span className={tokens.emoji} aria-hidden>
            {emoji}
          </span>
        ) : (
          <FolderOpen className={`${tokens.glyph} text-muted-foreground`} />
        )}
      </span>
      {!iconOnly ? (
        <span className={`${tokens.text} truncate`}>
          {nameOverride ?? project.name}
        </span>
      ) : null}
    </span>
  );
}
