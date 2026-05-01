// Server-only data access for popquizzes. Centralised so routes
// and pages share the same hydrated `Popquiz` shape (video + theme
// + cues + branding), and so the relationship-select syntax lives
// in one place if Supabase ever changes it.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  CueBehavior,
  Popquiz,
  PopquizBranding,
  PopquizCue,
  PopquizTheme,
  PopquizVideo,
  VideoSource,
  VideoStatus,
} from "./types";

interface VideoRow {
  id: string;
  source: string;
  external_url: string | null;
  external_id: string | null;
  storage_path: string | null;
  hls_path: string | null;
  thumbnail_url: string | null;
  duration_ms: number | null;
  status: string;
}

interface ThemeRow {
  id: string;
  name: string;
  config: unknown;
  is_preset: boolean;
  is_shared: boolean;
}

interface CueRow {
  id: string;
  quiz_id: string;
  timestamp_ms: number;
  behavior: string;
  display_order: number;
}

interface PopquizRow {
  id: string;
  user_id: string | null;
  slug: string | null;
  title: string;
  description: string | null;
  locale: string;
  is_published: boolean;
  // supabase-js returns to-one relations as either a single object
  // or null; we type both sides defensively at the boundary.
  video: VideoRow | VideoRow[] | null;
  theme: ThemeRow | ThemeRow[] | null;
  cues: CueRow[];
}

interface ProfileBrandRow {
  brand_logo_url: string | null;
  brand_color_primary: string | null;
  brand_website_url: string | null;
}

const FULL_SELECT = `
  id,
  user_id,
  slug,
  title,
  description,
  locale,
  is_published,
  video:popquiz_videos!inner(
    id, source, external_url, external_id,
    storage_path, hls_path, thumbnail_url,
    duration_ms, status
  ),
  theme:popquiz_themes(
    id, name, config, is_preset, is_shared
  ),
  cues:popquiz_cues(
    id, quiz_id, timestamp_ms, behavior, display_order
  )
`;

function firstOrSelf<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapVideo(row: VideoRow): PopquizVideo {
  return {
    id: row.id,
    source: row.source as VideoSource,
    externalUrl: row.external_url,
    externalId: row.external_id,
    storagePath: row.storage_path,
    hlsPath: row.hls_path,
    thumbnailUrl: row.thumbnail_url,
    durationMs: row.duration_ms,
    status: row.status as VideoStatus,
  };
}

function mapTheme(row: ThemeRow | null): PopquizTheme | null {
  if (!row) return null;
  const cfg =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, string>)
      : {};
  return {
    id: row.id,
    name: row.name,
    config: cfg,
    isPreset: row.is_preset,
    isShared: row.is_shared,
  };
}

function mapCue(row: CueRow): PopquizCue {
  return {
    id: row.id,
    quizId: row.quiz_id,
    timestampMs: row.timestamp_ms,
    behavior: row.behavior as CueBehavior,
    displayOrder: row.display_order,
  };
}

function mapBranding(profile: ProfileBrandRow | null): PopquizBranding {
  return {
    logoUrl: profile?.brand_logo_url?.trim() || null,
    websiteUrl: profile?.brand_website_url?.trim() || null,
    primaryColor: profile?.brand_color_primary?.trim() || null,
  };
}

// Mutates the popquiz in place — if the creator has a brand colour
// set, it overrides the theme accent so the player paints in the
// creator's identity even when no per-popquiz theme exists yet.
function applyBrandingToTheme(
  popquiz: Popquiz,
  branding: PopquizBranding,
): Popquiz {
  if (!branding.primaryColor) return popquiz;
  const cfg = popquiz.theme?.config ?? {};
  return {
    ...popquiz,
    theme: {
      id: popquiz.theme?.id ?? "brand-fallback",
      name: popquiz.theme?.name ?? "Brand",
      isPreset: false,
      isShared: false,
      config: { ...cfg, accent: branding.primaryColor },
    },
  };
}

function rowToPopquiz(
  row: PopquizRow,
  branding: PopquizBranding,
): Popquiz | null {
  const video = firstOrSelf(row.video);
  if (!video) return null;
  const popquiz: Popquiz = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    locale: row.locale,
    isPublished: row.is_published,
    video: mapVideo(video),
    theme: mapTheme(firstOrSelf(row.theme)),
    branding,
    cues: row.cues.map(mapCue).sort((a, b) => a.timestampMs - b.timestampMs),
  };
  return applyBrandingToTheme(popquiz, branding);
}

async function fetchOwnerBranding(
  userId: string | null,
): Promise<PopquizBranding> {
  if (!userId) return mapBranding(null);
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("brand_logo_url, brand_color_primary, brand_website_url")
    .eq("user_id", userId)
    .maybeSingle();
  return mapBranding(data ?? null);
}

// Public-facing fetch — uses the service role so the play page can
// load a popquiz without a logged-in viewer. Only published rows
// are returned; drafts stay invisible. Accepts either a UUID or a
// custom slug, mirroring how /q/[quizId] resolves quizzes.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPublishedPopquiz(
  popquizIdOrSlug: string,
): Promise<Popquiz | null> {
  let row: PopquizRow | null = null;

  if (UUID_RE.test(popquizIdOrSlug)) {
    const { data } = await supabaseAdmin
      .from("popquizzes")
      .select(FULL_SELECT)
      .eq("id", popquizIdOrSlug)
      .eq("is_published", true)
      .maybeSingle();
    row = (data as unknown as PopquizRow) ?? null;
  }

  if (!row) {
    const { data } = await supabaseAdmin
      .from("popquizzes")
      .select(FULL_SELECT)
      .eq("slug", popquizIdOrSlug)
      .eq("is_published", true)
      .maybeSingle();
    row = (data as unknown as PopquizRow) ?? null;
  }

  if (!row) return null;
  const branding = await fetchOwnerBranding(row.user_id);
  return rowToPopquiz(row, branding);
}

// Owner-scoped fetch using the caller's RLS-aware client. Used by
// the editor to load drafts the user owns.
export async function fetchOwnedPopquiz(
  supabase: SupabaseClient,
  popquizId: string,
): Promise<Popquiz | null> {
  const { data, error } = await supabase
    .from("popquizzes")
    .select(FULL_SELECT)
    .eq("id", popquizId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as PopquizRow;
  const branding = await fetchOwnerBranding(row.user_id);
  return rowToPopquiz(row, branding);
}
