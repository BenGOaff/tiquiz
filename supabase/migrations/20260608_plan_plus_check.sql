-- 20260608_plan_plus_check.sql
--
-- Étend la CHECK constraint de profiles.plan pour accepter les
-- nouveaux paliers premium « + » (Béné 2 juin 2026) :
--   - monthly_plus (29€/mois) : multiprofils + analyse IA + multi-clés SIO
--   - yearly_plus (290€/an) : idem en annuel
-- Et `beta` qui était utilisé en pratique mais bloqué par la CHECK
-- d'origine (002_plan_system.sql autorisait seulement free/lifetime/
-- monthly/yearly → un INSERT plan=beta retournait 23514 check_violation).
--
-- SANS CETTE MIGRATION : le webhook Systeme.io ne peut PAS écrire
-- plan='monthly_plus' ou plan='yearly_plus' → l'user paye mais ne
-- reçoit JAMAIS l'accès premium → support à gérer en urgence.
--
-- IDEMPOTENT : DROP + ADD avec IF EXISTS / IF NOT EXISTS. Les users
-- actuels sur free/monthly/yearly/lifetime ne sont pas affectés.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN (
    'free',
    'monthly',
    'yearly',
    'lifetime',
    'beta',
    'monthly_plus',
    'yearly_plus'
  ));

NOTIFY pgrst, 'reload schema';
