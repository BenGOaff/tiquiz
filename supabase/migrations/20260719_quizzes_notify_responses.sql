-- 20260719_quizzes_notify_responses.sql (Tiquiz)
--
-- Opt-out des notifications email PAR QUIZ / SONDAGE (demande Gwenn 19 juil
-- 2026 : "pouvoir mettre ou enlever les notifications pour chaque
-- quiz/sondage, vu qu'on peut en avoir des utilisations différentes").
--
-- S'ajoute au réglage global profiles.notify_responses : une notification
-- part seulement si le global ET le quiz sont activés. Défaut = activé.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS notify_responses BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
