-- 20260620b_profiles_reseller_subscription.sql
--
-- Suivi de l'abonnement actif d'un client de revendeur, pour gerer
-- proprement upgrade/downgrade :
-- - reseller_sub_provider : "stripe" | "paypal" (provider de l'abo en cours)
-- - reseller_sub_id       : id de l'abonnement chez ce provider
--
-- Permet : (1) d'annuler l'ancien abo quand le client change de formule
-- (anti double-prelevement), (2) de ne repasser en free QUE si l'abo annule
-- est bien l'abo courant du client (anti "annuler un abo => perdre l'acces
-- alors qu'un autre abo est encore actif").

alter table profiles add column if not exists reseller_sub_provider text;
alter table profiles add column if not exists reseller_sub_id text;

notify pgrst, 'reload schema';
