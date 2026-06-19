-- 20260619_resellers_payment_keys.sql (Tiquiz)
--
-- Checkout NATIF revendeur (Béné 19 juin 2026) : le revendeur connecte
-- SES comptes Stripe / PayPal en collant une cle API. Tiquiz cree
-- lui-meme les paiements et ouvre les acces, sans liens a creer ni
-- webhook a cabler a la main. Remplacera a terme checkout_urls +
-- webhook_token (laisses en place tant que le checkout natif n'est pas
-- branche, pour ne rien casser).
--
-- SECURITE : les secrets (cle Stripe, secret PayPal) sont CHIFFRES au
-- repos cote application (AES-256-GCM, cf. lib/secretsCrypto.ts, cle
-- RESELLER_SECRETS_KEY en env). On ne stocke JAMAIS de secret en clair.
-- Les colonnes *_enc ne contiennent que du chiffre, illisible sans la
-- cle serveur, meme si la ligne fuit via RLS select-own.
--
-- Convention maison : IF NOT EXISTS partout, NOTIFY pgrst en fin.

ALTER TABLE public.resellers
  -- Stripe : cle secrete (sk_live_/rk_live_) chiffree, environnement
  -- detecte (live/test), libelle d'affichage (email ou id du compte).
  ADD COLUMN IF NOT EXISTS stripe_secret_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS stripe_env TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_label TEXT,
  -- PayPal : identifiants d'app REST (client_id + secret) chiffres.
  ADD COLUMN IF NOT EXISTS paypal_client_id_enc TEXT,
  ADD COLUMN IF NOT EXISTS paypal_secret_enc TEXT,
  ADD COLUMN IF NOT EXISTS paypal_env TEXT,
  ADD COLUMN IF NOT EXISTS paypal_account_label TEXT,
  -- Cache des objets Stripe crees par Tiquiz (price_id par plan) pour ne
  -- pas recreer un Price a chaque checkout. Rempli en phase checkout.
  -- Forme : { "monthly": "price_...", "yearly_plus": "price_..." }.
  ADD COLUMN IF NOT EXISTS stripe_price_ids JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.resellers.stripe_secret_key_enc IS
'Cle secrete Stripe du revendeur, CHIFFREE (AES-256-GCM, lib/secretsCrypto). Jamais en clair. Sert au checkout natif + cycle de vie abonnements.';

COMMENT ON COLUMN public.resellers.paypal_secret_enc IS
'Secret de l''app REST PayPal du revendeur, CHIFFRE (AES-256-GCM). Jamais en clair.';

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
