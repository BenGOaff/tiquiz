-- ════════════════════════════════════════════════════════════════
-- TIQUIZ — tag de lead pour les sondages (mode=survey)
-- ════════════════════════════════════════════════════════════════
--
-- Les quiz taggent leurs leads via le tag du RESULTAT (quiz_results.
-- sio_tag_name). Les sondages n'ont pas de resultat : il leur faut un
-- tag de capture au niveau du sondage. On reutilise la colonne
-- quizzes.sio_capture_tag (deja prevue, jusqu'ici inutilisee cote code).
--
-- Idempotent : ADD COLUMN IF NOT EXISTS. Si la colonne existe deja en
-- prod, ce script ne change rien (a part le commentaire).

alter table public.quizzes
  add column if not exists sio_capture_tag text;

comment on column public.quizzes.sio_capture_tag is
  'Tag Systeme.io applique a chaque lead capture sur un SONDAGE (mode=survey) quand capture_enabled=true. NULL = pas de tag. Les quiz utilisent les tags par resultat, pas celui-ci.';

notify pgrst, 'reload schema';
