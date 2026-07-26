-- ════════════════════════════════════════════════════════════════
-- QUIZING — diagnostic d'entree (date de completion)
-- ════════════════════════════════════════════════════════════════
-- Le diagnostic ecrit deja niche / level / objective (colonnes existantes
-- sur profiles). On ajoute juste un marqueur de completion pour savoir
-- quand l'afficher (1re connexion) et ne plus le represente ensuite.

alter table profiles
  add column if not exists diagnostic_completed_at timestamptz;

notify pgrst, 'reload schema';
