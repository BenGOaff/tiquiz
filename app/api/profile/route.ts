// app/api/profile/route.ts
// GET: fetch user profile | PATCH: update profile settings
//
// Note: sio_user_api_key / sio_api_key_name are no longer in the whitelist.
// Those legacy columns now feed the lazy migration only — new keys are
// registered through /api/sio-api-keys, encrypted at rest, and managed
// from Settings via SioApiKeysManager.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  resolveBrandingForRequest,
  upsertBrandingForProject,
} from "@/lib/projects/businessProfile";
import { resolveProjectIdForInsert } from "@/lib/projects/scopeFilter";
import { canUseMultiProjects } from "@/lib/planLimits";

// Champs portés par le business_profile per-projet (multiprofils). Les
// autres (full_name, plan, ui_locale, etc.) restent sur profiles =
// global par user. Cf. lib/projects/businessProfile.ts.
const PROJECT_SCOPED_FIELDS = [
  "brand_logo_url",
  "brand_color_primary",
  "brand_color_accent",
  "brand_font",
  "brand_website_url",
  "saved_palettes",
  "brand_tone",
  "target_audience",
  "default_meta_pixel_id",
  "default_ga4_measurement_id",
  "default_google_ads_conversion_id",
  "default_google_ads_conversion_label",
  "default_meta_capi_token",
  "default_share_domain",
  "share_site_name",
] as const;

// Soft limits — must match the constants in
// components/editor/UserPalettePicker.tsx so a tampered client can't
// stuff arbitrary blobs into the profile.
const MAX_PALETTES = 10;
const MAX_COLORS_PER_PALETTE = 5;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function sanitisePalettes(raw: unknown): Array<{ id: string; name: string; colors: string[] }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ id: string; name: string; colors: string[] }> = [];
  for (const p of raw.slice(0, MAX_PALETTES)) {
    if (!p || typeof p !== "object") continue;
    const obj = p as Record<string, unknown>;
    const id = typeof obj.id === "string" && obj.id.length > 0 && obj.id.length <= 80
      ? obj.id
      : null;
    const name = typeof obj.name === "string"
      ? obj.name.slice(0, 60)
      : "";
    const colors = Array.isArray(obj.colors)
      ? obj.colors
          .filter((c): c is string => typeof c === "string" && HEX_RE.test(c))
          .slice(0, MAX_COLORS_PER_PALETTE)
      : [];
    if (!id) continue;
    out.push({ id, name, colors });
  }
  return out;
}

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name ?? null,
        })
        .select("*")
        .single();
      return NextResponse.json({ ok: true, profile: newProfile });
    }

    // Multiprofils Tiquiz : pour les users avec plan premium, on
    // OVERRIDE les champs branding/positionnement avec les valeurs du
    // business_profile du projet actif (= "nouveau projet = nouveau
    // branding"). Pour les autres plans, on retourne profiles tel quel
    // → zéro régression pour free / monthly / yearly.
    const bp = await resolveBrandingForRequest(user.id, user.email ?? null);
    if (bp) {
      const merged: Record<string, unknown> = { ...profile };
      for (const key of PROJECT_SCOPED_FIELDS) {
        // override seulement si le business_profile a une valeur
        // non-null (sinon on garde celle de profiles comme défaut).
        const v = (bp as unknown as Record<string, unknown>)[key];
        if (v !== null && v !== undefined) merged[key] = v;
      }
      merged.business_profile_onboarding_completed = bp.onboarding_completed;
      merged.business_profile_project_id = bp.project_id;
      return NextResponse.json({ ok: true, profile: merged });
    }

    return NextResponse.json({ ok: true, profile });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = await req.json();

    const allowed = [
      "full_name", "ui_locale", "content_locale", "address_form", "privacy_url",
      "brand_logo_url", "brand_favicon_url", "brand_color_primary", "brand_color_accent",
      "brand_font", "brand_tone", "brand_website_url",
      "target_audience",
      // ID affilié Tipote — utilisé sur le footer Tiquiz public pour
      // attribuer les commissions au créateur via ?sa=<id>.
      "tipote_affiliate_id",
      // Palettes de couleurs nommées de l'user. Sanitisé ci-dessous
      // (max 10 palettes × 5 couleurs × hex format) avant d'écrire.
      "saved_palettes",
      // Défauts Meta + Google pixels (Phase B, mai 2026) — pré-remplis
      // sur les nouveaux quizzes du créateur. Modifiables per-quiz.
      "default_meta_pixel_id", "default_ga4_measurement_id",
      "default_google_ads_conversion_id", "default_google_ads_conversion_label",
      // Token Conversions API Meta (secret server-side) — apparié au
      // pixel par défaut pour l'envoi des Lead côté serveur (dédup).
      "default_meta_capi_token",
      // Override de `og:site_name` + suffix du <title> pour les quiz
      // servis via un custom domain. Cf. migration 20260519.
      "share_site_name",
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    // saved_palettes : on n'utilise pas Zod ici (cohérence avec le
    // reste de la route), donc on valide à la main avant d'écrire.
    if ("saved_palettes" in updates) {
      updates.saved_palettes = sanitisePalettes(updates.saved_palettes);
    }

    // share_site_name : trim + cap 60 chars + null si vide. Pas de HTML
    // sanitization avancée (on l'injecte tel quel dans og:site_name et
    // le <title> — Next.js l'escape automatiquement, donc safe).
    if ("share_site_name" in updates) {
      const raw = updates.share_site_name;
      if (raw === null || raw === undefined) {
        updates.share_site_name = null;
      } else if (typeof raw !== "string") {
        return NextResponse.json(
          { ok: false, error: "share_site_name doit être une string ou null" },
          { status: 400 },
        );
      } else {
        const trimmed = raw.trim().slice(0, 60);
        updates.share_site_name = trimmed.length > 0 ? trimmed : null;
      }
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Multiprofils Tiquiz : si l'user a multiprofils débloqué ET que
    // le patch contient des champs branding/positioning, on écrit AUSSI
    // dans business_profiles du projet actif → "nouveau branding" par
    // projet. On garde le write sur profiles (single source of truth
    // pour les non-multiprofils + défaut de fallback).
    try {
      const { data: planRow } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle();
      const plan = (planRow as { plan?: string | null } | null)?.plan ?? null;
      const eligible = canUseMultiProjects(plan, {
        userId: user.id,
        email: user.email ?? null,
      });
      if (eligible) {
        const bpPatch: Record<string, unknown> = {};
        for (const key of PROJECT_SCOPED_FIELDS) {
          if (key in updates) bpPatch[key] = updates[key];
        }
        if (Object.keys(bpPatch).length > 0) {
          const projectId = await resolveProjectIdForInsert(user.id);
          if (projectId) {
            // L'edit explicite des champs branding marque l'onboarding
            // de ce projet comme effectué (l'user a customisé).
            bpPatch.onboarding_completed = true;
            await upsertBrandingForProject(user.id, projectId, bpPatch);
          }
        }
      }
    } catch (err) {
      // Best-effort : on n'échoue pas l'API profile si le write
      // business_profile a un souci. profile reste à jour côté legacy.
      console.error("[profile PATCH] business_profile write failed", err);
    }

    return NextResponse.json({ ok: true, profile });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
