// lib/effectivePixels.ts
//
// Résout la config pixel EFFECTIVE d'un quiz : la valeur par quiz si
// définie, sinon fallback sur les défauts du profil créateur.
//
// Pourquoi : le défaut profil (profiles.default_meta_pixel_id) n'était
// auto-rempli qu'à la CRÉATION d'un nouveau quiz. Les quiz existants
// gardaient meta_pixel_id NULL même après que le créateur ait posé son
// pixel dans /settings → "aucun pixel" sur la page publique (bug Gwenn
// 23/05, 2e itération). Le fallback render-time règle ça : poser le
// pixel dans les réglages s'applique partout sauf override explicite.

import { supabaseAdmin } from "./supabaseAdmin";

export type EffectivePixels = {
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
  googleAdsConversionId: string | null;
};

type QuizLevelPixels = {
  meta_pixel_id?: string | null;
  ga4_measurement_id?: string | null;
  google_ads_conversion_id?: string | null;
};

export async function resolveEffectivePixels(
  quiz: QuizLevelPixels,
  userId: string | null | undefined,
): Promise<EffectivePixels> {
  const meta = quiz.meta_pixel_id?.trim() || null;
  const ga4 = quiz.ga4_measurement_id?.trim() || null;
  const ads = quiz.google_ads_conversion_id?.trim() || null;

  // Si le quiz a au moins un ID, on ne fallback pas (override explicite).
  if (meta || ga4 || ads || !userId) {
    return { metaPixelId: meta, ga4MeasurementId: ga4, googleAdsConversionId: ads };
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("default_meta_pixel_id, default_ga4_measurement_id, default_google_ads_conversion_id")
    .eq("user_id", userId)
    .maybeSingle();
  const d = data as {
    default_meta_pixel_id?: string | null;
    default_ga4_measurement_id?: string | null;
    default_google_ads_conversion_id?: string | null;
  } | null;

  return {
    metaPixelId: d?.default_meta_pixel_id?.trim() || null,
    ga4MeasurementId: d?.default_ga4_measurement_id?.trim() || null,
    googleAdsConversionId: d?.default_google_ads_conversion_id?.trim() || null,
  };
}
