-- 20260725_profiles_trial_pending_days.sql
-- Essai Plus Atelier : DEMARRAGE DIFFERE a la premiere connexion.
--
-- Avant : a l'achat, on posait plan=*_plus + affiliate_trial_expires_at =
-- now + 60j. Le compte a rebours demarrait donc a l'ACHAT, meme si l'eleve
-- ne se connectait que des semaines plus tard (il perdait des jours).
--
-- Maintenant : a l'achat on pose plan=*_plus + affiliate_trial_pending_days
-- (= le nombre de jours a poser plus tard) et on laisse expires_at NULL. A la
-- CREATION du premier quiz/sondage (POST /api/quiz), on pose expires_at =
-- now + pending_days et on remet pending_days a NULL. Le cron d'expiration
-- ignore deja les expires_at NULL, donc rien ne s'expire tant que l'essai
-- n'a pas demarre (l'eleve peut arriver sur l'Atelier sans commencer son quiz).
--
-- Nullable, additif : les essais DEJA en cours (expires_at non NULL,
-- pending_days NULL) ne changent pas.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS affiliate_trial_pending_days INTEGER;

COMMENT ON COLUMN public.profiles.affiliate_trial_pending_days IS
  'Essai Plus OCTROYE mais PAS ENCORE DEMARRE : nombre de jours a poser sur affiliate_trial_expires_at a la creation du premier quiz/sondage. NULL = aucun essai en attente.';

NOTIFY pgrst, 'reload schema';
