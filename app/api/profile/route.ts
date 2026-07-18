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
          // Users provisionnes via Systeme.io ont deja first_name/last_name
          // en metadata auth : on les backfill pour un prenom/nom corrects.
          first_name: user.user_metadata?.first_name ?? null,
          last_name: user.user_metadata?.last_name ?? null,
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
    // Sémantique "projet secondaire = compte neuf VIDE" (Béné 2 juin 2026) :
    // Settings UI affiche les champs branding/positionnement VIDES sur
    // un projet secondaire jamais customisé. L'user remplit comme s'il
    // configurait un nouveau compte.
    //
    // Override TOTAL (null inclus) côté Settings = "compte neuf" effectif.
    // Note : le viewer public garde un fallback NON-NULL via
    // mergeOwnerBranding → les quiz en ligne ne sont jamais cassés
    // (le branding par défaut reste affiché jusqu'à customisation).
    const bp = await resolveBrandingForRequest(user.id, user.email ?? null);
    if (bp) {
      const merged: Record<string, unknown> = { ...profile };
      for (const key of PROJECT_SCOPED_FIELDS) {
        // OVERRIDE TOTAL : projet secondaire avec business_profile vide
        // affiche VIDE dans Settings (l'user voit ce qu'il doit remplir).
        merged[key] = (bp as unknown as Record<string, unknown>)[key];
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
      // Identite du titulaire du compte, editable dans Reglages (retour
      // Bene 14 juillet 2026 : les users doivent pouvoir corriger leur
      // prenom / nom saisis a l'envers a l'inscription). full_name est
      // recalcule serveur-side a partir de first_name + last_name plus bas.
      "first_name", "last_name",
      "full_name", "ui_locale", "content_locale", "address_form", "privacy_url",
      // Notifications email a chaque nouvelle reponse (opt-out). Cf.
      // migration 20260718_profiles_notify_responses.sql.
      "notify_responses",
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
    // Multiprofils Tiquiz : on lit le plan UNE FOIS pour décider où
    // route chaque champ. Les champs branding/positioning vont sur
    // business_profile du projet actif (pour les multiprofils) OU sur
    // profiles (pour les autres plans). Les autres champs (full_name,
    // locale, etc.) vont TOUJOURS sur profiles (= global par user).
    let isMultiprofils = false;
    try {
      const { data: planRow } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle();
      const plan = (planRow as { plan?: string | null } | null)?.plan ?? null;
      isMultiprofils = canUseMultiProjects(plan, {
        userId: user.id,
        email: user.email ?? null,
      });
    } catch {
      // Fail-open : si on n'arrive pas à lire le plan, on agit comme
      // non-multiprofils (= comportement legacy, écrit dans profiles).
      isMultiprofils = false;
    }

    const profilesUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const bpUpdates: Record<string, unknown> = {};
    const isBrandingKey = (k: string) =>
      (PROJECT_SCOPED_FIELDS as readonly string[]).includes(k);

    for (const key of allowed) {
      if (!(key in body)) continue;
      let val = body[key];

      // saved_palettes : sanitisation hex/forme.
      if (key === "saved_palettes") val = sanitisePalettes(val);

      // notify_responses : booléen strict (colonne NOT NULL).
      if (key === "notify_responses") val = Boolean(val);

      // share_site_name : trim + cap 60 chars + null si vide.
      if (key === "share_site_name") {
        if (val === null || val === undefined) {
          val = null;
        } else if (typeof val !== "string") {
          return NextResponse.json(
            { ok: false, error: "share_site_name doit être une string ou null" },
            { status: 400 },
          );
        } else {
          const trimmed = (val as string).trim().slice(0, 60);
          val = trimmed.length > 0 ? trimmed : null;
        }
      }

      // ROUTING : multiprofils + champ branding → business_profile only.
      // Sinon → profiles. JAMAIS de double-write : un seul "source of
      // truth" par (user, projet) pour les champs branding.
      if (isMultiprofils && isBrandingKey(key)) {
        bpUpdates[key] = val;
      } else {
        profilesUpdates[key] = val;
      }
    }

    // Identite : si prenom/nom fournis, on normalise (trim + cap) et on
    // recalcule full_name (source d'affichage legacy + admin) pour rester
    // coherent. Corrige les noms saisis a l'envers a l'inscription.
    if ("first_name" in profilesUpdates || "last_name" in profilesUpdates) {
      const fn = typeof profilesUpdates.first_name === "string" ? (profilesUpdates.first_name as string).trim().slice(0, 80) : "";
      const ln = typeof profilesUpdates.last_name === "string" ? (profilesUpdates.last_name as string).trim().slice(0, 80) : "";
      profilesUpdates.first_name = fn || null;
      profilesUpdates.last_name = ln || null;
      profilesUpdates.full_name = [fn, ln].filter(Boolean).join(" ") || null;
      // Miroir best-effort vers auth metadata (outils externes / re-login).
      // Merge shallow : on ne touche pas aux autres cles (sub, email...).
      try {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: { first_name: fn || null, last_name: ln || null, full_name: profilesUpdates.full_name },
        });
      } catch {
        /* non-fatal : la source de verite reste profiles */
      }
    }

    // Écrire profiles uniquement si on a des champs à modifier au-delà
    // de updated_at (sinon on bumpe updated_at à vide → polluant).
    let profile: unknown = null;
    if (Object.keys(profilesUpdates).length > 1) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(profilesUpdates)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      profile = data;
    } else {
      // Aucun champ profiles à modifier : on relit pour avoir la row
      // courante (utile au client pour l'overlay côté UI).
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      profile = data ?? null;
    }

    // Écrire business_profile du projet actif si patch branding.
    if (isMultiprofils && Object.keys(bpUpdates).length > 0) {
      try {
        const projectId = await resolveProjectIdForInsert(user.id);
        if (projectId) {
          // L'edit explicite marque l'onboarding du projet comme fait.
          bpUpdates.onboarding_completed = true;
          const result = await upsertBrandingForProject(user.id, projectId, bpUpdates);
          if (!result.ok) {
            console.error("[profile PATCH] business_profile write failed", result.error);
          } else if (result.row && profile) {
            // Overlay synchrone : le client voit les nouvelles valeurs
            // sans re-fetch GET. OVERRIDE TOTAL cohérent avec GET overlay.
            const merged: Record<string, unknown> = { ...(profile as Record<string, unknown>) };
            for (const key of PROJECT_SCOPED_FIELDS) {
              merged[key] = (result.row as unknown as Record<string, unknown>)[key];
            }
            merged.business_profile_onboarding_completed = result.row.onboarding_completed;
            merged.business_profile_project_id = result.row.project_id;
            profile = merged;
          }
        }
      } catch (err) {
        console.error("[profile PATCH] business_profile write threw", err);
        // Best-effort : on n'échoue pas l'API. Le client refetchera.
      }
    }

    return NextResponse.json({ ok: true, profile });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
