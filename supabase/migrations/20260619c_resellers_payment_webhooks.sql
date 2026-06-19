-- 20260619c_resellers_payment_webhooks.sql (Tiquiz)
--
-- Cycle de vie des abonnements revendeur (Bene 19 juin 2026) : quand un
-- client arrete de payer (resiliation, echec de paiement repete), son
-- acces repasse en free AUTOMATIQUEMENT. Tiquiz cree lui-meme le webhook
-- dans le compte Stripe / PayPal du revendeur a la connexion : aucun
-- cablage manuel pour lui.
--
-- Le webhook entrant est identifie par resellers.webhook_token (deja
-- present, reutilise) : /api/payments/stripe/<token>, /api/payments/paypal/<token>.
--
-- SECURITE : le signing secret Stripe est CHIFFRE (AES-256-GCM). L'id de
-- webhook PayPal n'est pas secret (sert juste a verifier la signature via
-- l'API PayPal), stocke en clair.

ALTER TABLE public.resellers
  ADD COLUMN IF NOT EXISTS stripe_webhook_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_webhook_secret_enc TEXT,
  ADD COLUMN IF NOT EXISTS paypal_webhook_id TEXT;

COMMENT ON COLUMN public.resellers.stripe_webhook_secret_enc IS
'Signing secret du webhook Stripe cree automatiquement dans le compte du revendeur, CHIFFRE (AES-256-GCM). Sert a verifier les events entrants.';

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
