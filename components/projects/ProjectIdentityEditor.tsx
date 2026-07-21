"use client";

// Editor inline pour la visual identity d'un projet (nom + accent
// color + emoji + use_branding_logo). Port direct du pattern Tipote
// (Béné 2 juin 2026 — alignement "même emplacement, même design").
//
// Utilisé par le Dialog "Modifier" du ProjectSwitcher. Le parent
// appelle PATCH /api/projects/[projectId] en batch sur Enregistrer
// (chaque setter ici est optimistic sur le state local).
//
// Note : Tipote utilise next-intl pour les labels. Tiquiz n'a pas
// (encore) next-intl côté UI projets → labels FR hardcodés.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ImageOff, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ACCENT_COLORS,
  PROJECT_EMOJI,
} from "@/lib/projects/visualIdentity";

export interface ProjectIdentityValue {
  name: string;
  accent_color: string | null;
  icon_emoji: string | null;
  use_branding_logo: boolean;
}

interface Props {
  initial: ProjectIdentityValue;
  /** Optional brand_logo_url à prévisualiser quand "Use branding logo" est on. */
  brandingLogoUrl?: string | null;
  /** Notifie à chaque changement local pour qu'un seul "Save" parent batch. */
  onChange: (next: ProjectIdentityValue) => void;
  disabled?: boolean;
}

export function ProjectIdentityEditor({
  initial,
  brandingLogoUrl,
  onChange,
  disabled,
}: Props) {
  const t = useTranslations("projects");
  const [value, setValue] = useState<ProjectIdentityValue>(initial);

  // Si `initial` change (parent qui re-fetch), resync.
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  function update(patch: Partial<ProjectIdentityValue>) {
    const next = { ...value, ...patch };
    setValue(next);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="project-name" className="text-xs">
          {t("fieldName")}
        </Label>
        <Input
          id="project-name"
          value={value.name}
          onChange={(e) => update({ name: e.target.value })}
          disabled={disabled}
          placeholder={t("defaultSpace")}
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">{t("fieldAccent")}</Label>
          {value.accent_color ? (
            <button
              type="button"
              onClick={() => update({ accent_color: null })}
              disabled={disabled}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {ACCENT_COLORS.map((c) => {
            const active = value.accent_color === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => update({ accent_color: c.hex })}
                disabled={disabled}
                title={c.label}
                aria-label={c.label}
                aria-pressed={active}
                className={`relative size-7 rounded-md border-2 transition-all ${
                  active
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {active ? (
                  <Check className="size-3.5 text-white absolute inset-0 m-auto drop-shadow" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">{t("fieldIcon")}</Label>
          {value.icon_emoji ? (
            <button
              type="button"
              onClick={() => update({ icon_emoji: null })}
              disabled={disabled}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {PROJECT_EMOJI.map((e) => {
            const active = value.icon_emoji === e;
            return (
              <button
                key={e}
                type="button"
                onClick={() =>
                  update({ icon_emoji: e, use_branding_logo: false })
                }
                disabled={disabled || value.use_branding_logo}
                aria-pressed={active}
                className={`size-7 rounded-md grid place-items-center text-base transition-all ${
                  active
                    ? "ring-2 ring-foreground bg-muted scale-110"
                    : "hover:bg-muted"
                } disabled:opacity-40`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <Label
              htmlFor="use-branding-logo"
              className="text-xs font-semibold"
            >
              {t("useBrandLogo")}
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {t("useBrandLogoHint")}
            </p>
          </div>
          <Switch
            id="use-branding-logo"
            checked={value.use_branding_logo}
            onCheckedChange={(c) => update({ use_branding_logo: c })}
            disabled={disabled || !brandingLogoUrl}
          />
        </div>
        {value.use_branding_logo ? (
          brandingLogoUrl ? (
            <div className="flex items-center gap-2 pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandingLogoUrl}
                alt=""
                className="size-10 rounded border bg-background object-cover"
              />
              <span className="text-[11px] text-muted-foreground">
                {t("logoPreview")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
              <ImageOff className="size-3.5" />
              {t("noLogo")}
            </div>
          )
        ) : null}
        {!brandingLogoUrl && !value.use_branding_logo ? (
          <p className="text-[11px] text-muted-foreground">
            {t("noLogoHint")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
