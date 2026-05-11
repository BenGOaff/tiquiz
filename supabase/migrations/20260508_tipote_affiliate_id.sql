-- Tipote affiliate ID (Tiquiz) — pendant de la migration
-- 20260508_tipote_affiliate_id.sql côté Tipote.
--
-- Stocké sur public.profiles parce que Tiquiz n'a plus de table
-- business_profiles séparée (cf. /api/profile/route.ts qui lit sur
-- profiles directement). Affiliate ID = per-user, pas per-quiz.
--
-- Utilisé par le footer "Ce quiz vous est offert par Tiquiz" pour
-- ajouter ?sa=<id> sur le lien de découverte tipote.fr/part-tiquiz
-- → le créateur touche une commission sur les inscriptions Tiquiz
-- qui en découlent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipote_affiliate_id TEXT;

COMMENT ON COLUMN public.profiles.tipote_affiliate_id IS
  'Identifiant affilié Tipote (Systeme.io). Format : sa<32 hex>. Utilisé pour le tracking commission sur le footer "via Tiquiz" des quizzes publics.';
