-- 0007_profile_business.sql
-- L'onboarding profile desormais le BUSINESS de l'eleve (pas son niveau
-- quiz) pour proposer un parcours et un coaching adaptes.
--   activity_type : coach | formateur | freelance | ecommerce | createur | affiliation | autre
--   maturity      : demarrage | audience | liste | ventes
--   monetization  : offres | affiliation | les_deux | pas_encore
--   ads_budget    : oui | non
-- On garde niche (texte libre) et full_name. Les anciennes colonnes
-- level / objective restent en place (compat), mais ne sont plus saisies.

alter table profiles
  add column if not exists activity_type text,
  add column if not exists maturity text,
  add column if not exists monetization text,
  add column if not exists ads_budget text;

notify pgrst, 'reload schema';
