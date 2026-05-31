"use client";

// Bouton "Générer un visuel" + Studio, CÔTÉ TIQUIZ. Adapté du TipoteStudioButton :
//   1. Brand kit = identité de l'user (table profiles), chargé via /api/visual-studio/brand-kit.
//   2. Upload → bucket PUBLIC `public-assets` (path studio/<uid>/<ts>.png) via le client navigateur.
//   3. PAS de crédits (Tiquiz n'a pas de système de crédits) → génération ungated.
//   4. Carrousel + presets de styles désactivés (on vise quiz/sondages, image seule).
//
// L'hôte fournit `onApplyImage` pour insérer le visuel dans le bon slot (couverture
// ou image de résultat). Le composant gère la génération + l'upload storage.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Wand2, Loader2 } from "lucide-react";
import { ImageStudio } from "@/components/visual-studio/ImageStudio";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { BRAND_PRESETS } from "@/lib/visualStudio/presets";
import { Button } from "@/components/ui/button";
import type { BrandKit, StudioResult, StudioFormatId } from "@/lib/visualStudio/types";

export type StudioSavedImage = {
  url: string;
  path: string;
  filename: string;
  size: number;
  type: string;
};

function toSaved(r: StudioResult): StudioSavedImage {
  const ext = r.blob.type === "image/jpeg" ? "jpg" : "png";
  return {
    url: r.url,
    path: r.storagePath ?? "",
    filename: `studio.${ext}`,
    size: r.blob.size,
    type: r.blob.type || "image/png",
  };
}

export function TiquizStudioButton({
  intent,
  titleText,
  contentId,
  // Visuels d'ILLUSTRATION : paysage par défaut + carré. Pas de portrait/story.
  formats = ["16:9", "1:1"],
  defaultFormat = "16:9",
  label,
  size = "sm",
  variant = "outline",
  onApplyImage,
}: {
  /** Contexte pour guider l'IA (titre + intro, ou texte du résultat). */
  intent?: string;
  /** Titre posé SUR l'image (ex: titre du résultat). Pas de hook IA inventé. */
  titleText?: string;
  /** Id du quiz → range les visuels sous son dossier. */
  contentId?: string;
  formats?: StudioFormatId[];
  defaultFormat?: StudioFormatId;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  onApplyImage?: (img: StudioSavedImage) => void;
}) {
  const t = useTranslations("visualStudio");
  const [open, setOpen] = useState(false);
  const [brandKit, setBrandKit] = useState<BrandKit>(BRAND_PRESETS.tiquiz);
  const [brandOptions, setBrandOptions] = useState<{ label: string; kit: BrandKit }[] | undefined>(undefined);
  const [brandVoice, setBrandVoice] = useState<string>("");
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [loadingBrand, setLoadingBrand] = useState(false);

  useEffect(() => {
    if (!open || brandLoaded || loadingBrand) return;
    setLoadingBrand(true);
    fetch("/api/visual-studio/brand-kit", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.brand) {
          setBrandKit(j.brand as BrandKit);
          if (Array.isArray(j.options) && j.options.length) {
            setBrandOptions(j.options as { label: string; kit: BrandKit }[]);
          }
          if (typeof j.voiceHint === "string") setBrandVoice(j.voiceHint);
        }
      })
      .catch(() => { /* on garde le preset Tiquiz par défaut */ })
      .finally(() => {
        setBrandLoaded(true);
        setLoadingBrand(false);
      });
  }, [open, brandLoaded, loadingBrand]);

  // Upload du PNG généré vers public-assets (bucket public, convention
  // <topic>/<uid>/<file>). Renvoie l'URL publique durable.
  async function upload(blob: Blob): Promise<{ url: string }> {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("not authenticated");
    const ext = blob.type === "image/jpeg" ? "jpg" : "png";
    const path = `studio/${user.id}/${contentId ? contentId + "-" : ""}${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, blob, { upsert: true, contentType: blob.type || "image/png" });
    if (error) throw error;
    const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
    return { url: data.publicUrl };
  }

  return (
    <>
      <Button type="button" size={size} variant={variant} onClick={() => setOpen(true)}>
        {open && loadingBrand ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4 mr-1.5" />
        )}
        {label ?? t("buttonDefaultLabel")}
      </Button>
      <ImageStudio
        open={open}
        onOpenChange={setOpen}
        brandKit={brandKit}
        brandOptions={brandOptions}
        brandVoice={brandVoice}
        initialIntent={intent}
        // Le titre du résultat est le SEUL texte ; les autres calques restent vides.
        initialText={{ kicker: "", headline: titleText ?? "", accent: "", subline: "", cta: "" }}
        illustrationMode
        formats={formats}
        defaultFormat={defaultFormat}
        enableCarousel={false}
        enableStylePrefs={true}
        upload={upload}
        // Pas de crédits côté Tiquiz : génération autorisée d'office.
        onChargeCredit={async () => true}
        applyLabel={t("applyInsert")}
        onApply={(r) => onApplyImage?.(toSaved(r))}
      />
    </>
  );
}
