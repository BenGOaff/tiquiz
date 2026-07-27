-- Colonne referencee par app/api/quiz/[quizId]/public/route.ts depuis le
-- 21 juillet SANS migration : en prod, le select profiles echouait en silence
-- (42703) -> profil proprietaire null -> plan lu "free" pour TOUT LE MONDE.
-- Consequence : footer personnalise, masquage de marque, lien affilie tipote,
-- branding de repli et pixels par defaut morts sur tous les quiz publics,
-- meme pour les comptes lifetime (drame footer 27 juillet 2026).
alter table public.profiles
  add column if not exists default_content_locale text;

notify pgrst, 'reload schema';
