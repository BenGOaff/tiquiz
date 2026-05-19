-- 20260519_profiles_share_site_name.sql
-- Adeline (19 mai 2026) : sur un quiz partagé via son custom domain,
-- iMessage / WhatsApp affichaient "Tiquiz" sous l'aperçu (l'og:site_name
-- + le <title> · Tiquiz du layout). Quand l'user a payé pour un domain
-- brandé, plus AUCUNE trace de Tiquiz ne doit apparaître.
--
-- Cette colonne est l'override user-éditable du `og:site_name` (et du
-- suffix du <title>). Quand elle est vide :
--   - l'user est sur quiz.tipote.com → on garde "Tiquiz" (comportement
--     historique préservé pour les non-payants)
--   - l'user a un custom domain vérifié → fallback sur le hostname
--     (ex: quiz.adelinecirade.com)
-- Quand elle est remplie → on l'utilise telle quelle (ex: "Adeline Cirade").

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_site_name TEXT;

COMMENT ON COLUMN public.profiles.share_site_name IS
  'Nom de marque affiché dans og:site_name + suffix du <title> sur les routes publiques du créateur. Override de "Tiquiz". S''applique uniquement aux quiz/popquiz servis via un custom domain vérifié.';

-- Schema cache reload pour PostgREST (sinon /api/profile PATCH 500e en
-- "Could not find share_site_name in schema cache" jusqu'au prochain
-- redéploiement).
NOTIFY pgrst, 'reload schema';