-- 20260611_profiles_milestone_rate_limit.sql (Tiquiz)
--
-- Rate-limit des toasts milestones : 1×/semaine max par user.
-- Mirror de la même migration côté Tipote.
--
-- Contexte : Gwenn 3 juin 2026 a signalé que le toast "Premier visiteur
-- qui finit ton quiz" revenait à chaque chargement de page (race
-- partiellement réglée côté client via sessionStorage, mais Béné a
-- demandé un vrai rate-limit serveur — 1 batch / semaine max).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS next_milestone_toast_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
