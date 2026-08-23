-- ============================================================
-- LE FIL VERS L'ABONNEMENT PAYPAL.
--
-- Béné, 23 août 2026 : PayPal sur le bon de commande de Tiquiz. Stripe
-- vend des abonnements et on garde `stripe_customer_id` pour pouvoir
-- ouvrir le portail et arrêter le prélèvement. PayPal a besoin du même
-- fil, et il n'a pas la même forme : ce n'est pas un client, c'est un
-- abonnement (`I-XXXXXXXXXXXX`).
--
-- Sans cette colonne, le bouton "Arrêter l'abonnement" ne saurait pas
-- QUOI arrêter chez PayPal : on fermerait l'accès en laissant le
-- prélèvement tourner. C'est exactement le bug d'argent trouvé le même
-- jour sur l'annulation Stripe, et il ne faut pas le recréer en PayPal.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- On retrouve un abonnement depuis un événement PayPal, donc par son id.
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_subscription
  ON profiles(paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
