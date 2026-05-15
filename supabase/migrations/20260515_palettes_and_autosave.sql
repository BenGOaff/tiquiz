-- ═══════════════════════════════════════════
-- TIQUIZ — Palettes utilisateurs + auto-save brouillons
-- ═══════════════════════════════════════════
-- Deux features users, en une seule migration parce qu'on déploie en
-- même temps.
--
-- 1) saved_palettes : palettes de couleurs nommées de l'utilisateur,
--    réutilisables sur tous ses quizs / sondages / popquizs (charte de
--    marque centralisée — gain de temps + cohérence visuelle).
--
-- 2) draft_state / draft_updated_at : autosave des éditeurs. L'éditeur
--    push son snapshot dans draft_state à chaque modif (debouncé), et
--    nettoie après le Save explicite. Si l'user revient et que le
--    draft est plus récent que la dernière sauvegarde, on lui propose
--    de restaurer ou de repartir du dernier save.
--
-- Conservatif par construction : colonnes nullable / défaut sûr, donc
-- les quizs existants ne bougent pas tant que personne ne touche à
-- l'autosave côté éditeur.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS saved_palettes JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.saved_palettes IS
  'Palettes de couleurs sauvegardées par l''user : tableau de {id, name, colors[]}. Limites soft côté API : 10 palettes max, 5 couleurs max par palette.';

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS draft_state JSONB,
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quizzes.draft_state IS
  'Snapshot opaque (JSON) du dernier autosave de l''éditeur. NULL = pas de draft en attente.';
COMMENT ON COLUMN public.quizzes.draft_updated_at IS
  'Horodatage du dernier autosave. Comparé à updated_at pour décider si on propose une restauration.';

ALTER TABLE public.popquizzes
  ADD COLUMN IF NOT EXISTS draft_state JSONB,
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.popquizzes.draft_state IS
  'Snapshot opaque (JSON) du dernier autosave de l''éditeur popquiz. NULL = pas de draft.';
COMMENT ON COLUMN public.popquizzes.draft_updated_at IS
  'Horodatage du dernier autosave popquiz.';
