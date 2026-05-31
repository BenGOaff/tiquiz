// app/api/visual-studio/brand-kit/route.ts (Tiquiz)
//
// Renvoie le brand kit de l'utilisateur Tiquiz au format Studio + un "voiceHint"
// (ton + cible) pour orienter la copy IA. Lecture seule, pas de crédit.
//
// Schéma Tiquiz : table `profiles` (brand_color_primary, brand_color_accent,
// brand_font, brand_logo_url, brand_tone, target_audience). Pas de
// business_profiles / personas / projects comme Tipote → on lit directement.

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { BRAND_PRESETS } from "@/lib/visualStudio/presets";
import type { BrandKit } from "@/lib/visualStudio/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Défauts alignés sur le preset Tiquiz quand le profil ne précise rien.
const DEFAULT_TEXT = "#2E386E";
const DEFAULT_BG = "#FFFFFF";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, brand_color_primary, brand_color_accent, brand_font, brand_logo_url, brand_tone, target_audience")
      .eq("user_id", user.id)
      .maybeSingle();

    const p = (profile ?? {}) as Record<string, string | null>;
    // Si l'user a un full_name, on l'utilise comme nom de marque par défaut
    // (ex: "Marie Dupont" → "marie-dupont" dans le filename). Sinon on
    // laisse vide : le CLIENT affiche un label traduit (t("myBrand")) côté
    // UI, et un fallback "my-brand" côté filename. Ça évite d'avoir
    // "Ma marque" en français dur dans une UI espagnole / anglaise.
    const brand: BrandKit = {
      name: (p.full_name && p.full_name.trim()) || "",
      logoUrl: p.brand_logo_url || null,
      primaryColor: p.brand_color_primary || BRAND_PRESETS.tiquiz.primaryColor,
      textColor: DEFAULT_TEXT,
      accentColor: p.brand_color_accent || BRAND_PRESETS.tiquiz.accentColor,
      backgroundColor: DEFAULT_BG,
      font: p.brand_font || "Inter",
    };

    // voiceHint condensé : ton de marque + audience cible → guide la copy IA.
    const voiceParts: string[] = [];
    if (p.brand_tone) voiceParts.push(`Tonalité de marque : ${p.brand_tone}.`);
    if (p.target_audience) voiceParts.push(`Audience cible : ${p.target_audience}.`);
    const voiceHint = voiceParts.join("\n");

    // Marques sélectionnables : la marque de l'user (si logo/couleur perso) + le
    // preset Tiquiz. La 1re = défaut.
    const hasCustom = !!brand.logoUrl || brand.primaryColor !== BRAND_PRESETS.tiquiz.primaryColor;
    const options = [
      ...(hasCustom ? [{ label: brand.name, kit: brand }] : []),
      { label: "Tiquiz", kit: BRAND_PRESETS.tiquiz },
    ];

    return NextResponse.json({ ok: true, brand, options, voiceHint });
  } catch (e) {
    console.error("[visual-studio/brand-kit] error:", e);
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
