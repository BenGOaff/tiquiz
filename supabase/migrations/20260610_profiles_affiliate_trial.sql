-- 20260610_profiles_affiliate_trial.sql (Tiquiz)
--
-- Trial 1 mois Plus pour les affiliés Tipote — colonnes mémoire.
--
-- Contexte : le dashboard affilié (côté Tipote) octroie aux affiliés
-- 1 mois gratuit sur Tiquiz Plus pour tester l'outil avant de le
-- recommander à leur audience. Tipote écrit ici via service-role
-- cross-app (env TIQUIZ_SUPABASE_URL + TIQUIZ_SUPABASE_SERVICE_ROLE_KEY
-- ajoutées côté Tipote). Pour l'utilisateur, c'est juste : il clique
-- "activer", son plan Tiquiz passe en monthly_plus (ou yearly_plus s'il
-- était déjà sur l'annuel) pendant 30 jours, puis revient en arrière
-- automatiquement.
--
-- 2 colonnes :
--   - affiliate_trial_expires_at : date de fin du trial. Lue par le cron
--     `affiliate-trial-expiry` qui se charge du downgrade auto.
--   - affiliate_trial_pre_plan : plan que l'user avait AVANT le trial.
--     Permet au cron de remettre le bon plan à l'expiration. NULL = pas
--     de trial en cours (ou trial déjà terminé/réverti).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS affiliate_trial_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS affiliate_trial_pre_plan TEXT;

-- Index sur la date d'expiration pour que le cron quotidien parcoure
-- uniquement les profiles concernés (au lieu de full-scan profiles).
CREATE INDEX IF NOT EXISTS idx_profiles_affiliate_trial_expires_at
  ON public.profiles (affiliate_trial_expires_at)
  WHERE affiliate_trial_expires_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
