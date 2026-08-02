-- 20260802_profiles_referrer_sa.sql (Tiquiz)
--
-- Identifiant Systeme.io de l'AFFILIÉ QUI A AMENÉ cet utilisateur.
--
-- Règle Béné (2 août 2026), à propos des liens que le coach propose :
-- "oui toujours affilié, je ne veux jamais les léser."
--
-- À ne pas confondre avec `profiles.tipote_affiliate_id`, qui est
-- l'identifiant de l'utilisateur EN TANT QU'AFFILIÉ (celui qui part dans
-- le pied de page de ses quiz). Ici c'est l'inverse : le parrain.
--
-- NULL = parrain inconnu. Dans ce cas le coach propose un lien nu, jamais
-- un `sa` inventé : une attribution fausse vole la commission d'un autre.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referrer_sa TEXT;

COMMENT ON COLUMN public.profiles.referrer_sa IS
  'Identifiant Systeme.io de l''affilié qui a amené cet utilisateur (le parrain). NULL = inconnu.';

NOTIFY pgrst, 'reload schema';
