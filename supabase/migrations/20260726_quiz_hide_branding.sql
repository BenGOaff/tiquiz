-- Masquer completement le pied de page "propose par Tiquiz" (plans payants).
-- Le gate est cote serveur : app/api/quiz/[quizId]/public/route.ts n'expose
-- hide_branding = true que si footerAllowed (isPaidPlan ou reseller). Un plan
-- free ne peut donc jamais retirer la mention meme si la colonne est a true.
alter table public.quizzes
  add column if not exists hide_branding boolean not null default false;

notify pgrst, 'reload schema';
