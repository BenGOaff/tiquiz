-- 20260821_stripe_customer.sql
--
-- LE FIL QUI RELIE UN COMPTE TIQUIZ À SON CLIENT STRIPE.
--
-- Béné, 21 août : "on peut aussi permettre aux users de modifier leur
-- mode de paiement ? Genre ils veulent payer avec une autre carte ?"
--
-- Oui, et sans écrire un seul champ de carte : Stripe a un portail
-- client qui fait exactement ça (changer de carte, voir ses factures,
-- résilier). On n'a rien à construire, il faut juste pouvoir dire à
-- Stripe DE QUI on parle.
--
-- Et c'est précisément ce qui manquait : on encaissait, on ouvrait le
-- plan, et on jetait l'identifiant du client Stripe. Sans lui, impossible
-- d'ouvrir un portail, de retrouver un abonnement, ou de rapprocher une
-- vente d'un compte autrement que par l'adresse email.
--
-- POURQUOI PAS L'EMAIL COMME CLÉ
-- -------------------------------
-- Parce qu'elle change. Quelqu'un qui modifie son adresse dans Tiquiz,
-- ou qui a payé avec l'adresse de son conjoint, casserait le lien sans
-- que rien ne le signale. L'identifiant Stripe, lui, ne bouge jamais.
--
-- NE PAS CONFONDRE AVEC LES REVENDEURS
-- -------------------------------------
-- `resellers` a déjà son propre Stripe, avec ses propres clients. Cette
-- colonne ne concerne QUE le compte Stripe de Béné et ses ventes en
-- direct (`STRIPE_SECRET_KEY_OWNER`).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'Client Stripe sur le compte de Bene (ventes en direct). Sert au portail de facturation.';

-- Retrouver un compte a partir d'un evenement Stripe, qui ne porte que
-- cet identifiant et jamais l'adresse.
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
