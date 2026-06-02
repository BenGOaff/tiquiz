-- 20260606_business_profiles_per_project.sql
--
-- Per-project branding + positionnement Tiquiz. Alignement Tipote
-- (Béné 2 juin 2026 : "Nouveau projet = nouveau compte = stat à
-- zéro, nouveau branding, nouveau positionnement, etc... comme sur
-- tipote, ça doit être comme un compte neuf, avec ses spécificités").
--
-- Tipote stocke ses brand/positioning sur `business_profiles` avec
-- UNIQUE(user_id, project_id). On porte la même structure côté Tiquiz
-- (table `business_profiles` aussi pour parité, mais avec les champs
-- spécifiques Tiquiz — pas de compta, de personas, etc.).
--
-- BACKFILL : pour chaque user existant qui a un projet par défaut, on
-- INSERT un business_profile recopiant les valeurs actuelles de son
-- profiles. Garantit que l'expérience actuelle des users (free, monthly,
-- yearly) reste IDENTIQUE — leur projet par défaut est seedé avec leur
-- branding actuel. Quand ils créeront un 2e projet (s'ils débloquent
-- multiprofils), ce 2e projet aura un business_profile vide à remplir.
--
-- LECTURE : tant qu'un user n'a pas multiprofils débloqué, le code
-- continue à lire `profiles.brand_*` (legacy path préservé). Quand
-- multiprofils est débloqué, le code lit `business_profiles` du projet
-- actif (cf. lib/projects/businessProfile.ts).
--
-- ON DELETE CASCADE : si l'user supprime un projet secondaire, son
-- business_profile correspondant disparaît avec — c'est juste un set
-- de défauts attaché au projet, pas un asset public. Les quizzes du
-- projet supprimé restent en ligne (FK quizzes.project_id en SET NULL,
-- cf. 20260603_multiprofils_foundation).

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Tag d'onboarding : false pour les projets nouvellement créés (UI
  -- propose un mini-onboarding pour cust omiser le branding). True pour
  -- le projet par défaut backfillé (les valeurs sont déjà set).
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Branding visuel ──
  brand_logo_url TEXT,
  brand_color_primary TEXT,
  brand_color_accent TEXT,
  brand_font TEXT,
  brand_website_url TEXT,
  saved_palettes JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- ── Positionnement (contenu / identité de marque) ──
  brand_tone TEXT,
  target_audience TEXT,

  -- ── Defaults pixel / analytics — pré-remplis sur les nouveaux quiz ──
  default_meta_pixel_id TEXT,
  default_ga4_measurement_id TEXT,
  default_google_ads_conversion_id TEXT,
  default_google_ads_conversion_label TEXT,
  default_meta_capi_token TEXT,
  default_share_domain TEXT,
  share_site_name TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT business_profiles_user_project_unique UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user ON public.business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_project ON public.business_profiles(project_id);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bp_select_own ON public.business_profiles;
CREATE POLICY bp_select_own ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bp_insert_own ON public.business_profiles;
CREATE POLICY bp_insert_own ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bp_update_own ON public.business_profiles;
CREATE POLICY bp_update_own ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bp_delete_own ON public.business_profiles;
CREATE POLICY bp_delete_own ON public.business_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- BACKFILL : pour chaque user, INSERT business_profiles sur le projet
-- par défaut avec les valeurs actuelles de profiles. Idempotent
-- (ON CONFLICT DO NOTHING grâce à l'UNIQUE).
-- ============================================================================

DO $backfill$
DECLARE
  user_record RECORD;
  default_project_id UUID;
BEGIN
  FOR user_record IN
    SELECT user_id, brand_logo_url, brand_color_primary, brand_color_accent,
           brand_font, brand_website_url, saved_palettes, brand_tone,
           target_audience, default_meta_pixel_id, default_ga4_measurement_id,
           default_google_ads_conversion_id, default_google_ads_conversion_label,
           default_meta_capi_token, default_share_domain, share_site_name
    FROM public.profiles
    WHERE user_id IS NOT NULL
  LOOP
    SELECT id INTO default_project_id
    FROM public.projects
    WHERE user_id = user_record.user_id AND is_default = true
    LIMIT 1;

    -- Skip si pas de projet par défaut (théoriquement impossible après
    -- 20260603_multiprofils_foundation mais on se protège).
    IF default_project_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.business_profiles (
      user_id, project_id, onboarding_completed,
      brand_logo_url, brand_color_primary, brand_color_accent,
      brand_font, brand_website_url, saved_palettes,
      brand_tone, target_audience,
      default_meta_pixel_id, default_ga4_measurement_id,
      default_google_ads_conversion_id, default_google_ads_conversion_label,
      default_meta_capi_token, default_share_domain, share_site_name
    )
    VALUES (
      user_record.user_id, default_project_id, TRUE,
      user_record.brand_logo_url, user_record.brand_color_primary, user_record.brand_color_accent,
      user_record.brand_font, user_record.brand_website_url, COALESCE(user_record.saved_palettes, '[]'::jsonb),
      user_record.brand_tone, user_record.target_audience,
      user_record.default_meta_pixel_id, user_record.default_ga4_measurement_id,
      user_record.default_google_ads_conversion_id, user_record.default_google_ads_conversion_label,
      user_record.default_meta_capi_token, user_record.default_share_domain, user_record.share_site_name
    )
    ON CONFLICT (user_id, project_id) DO NOTHING;
  END LOOP;
END
$backfill$;

NOTIFY pgrst, 'reload schema';
