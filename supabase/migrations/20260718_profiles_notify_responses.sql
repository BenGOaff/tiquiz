-- 20260718_profiles_notify_responses.sql (Tiquiz)
--
-- Notification email du créateur à chaque nouvelle réponse / lead
-- (demande Christelle 18 juil 2026 : "je n'ai pas reçu de notif des
-- réponses au sondage"). Jusqu'ici Tiquiz n'envoyait AUCUNE notification
-- au créateur. On ajoute un opt-out par user.
--
-- notify_responses : true = le créateur reçoit un email à chaque nouvelle
-- réponse sur ses quiz/sondages. Par défaut TRUE (les users attendent
-- d'être prévenus). Désactivable depuis Réglages.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_responses BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
