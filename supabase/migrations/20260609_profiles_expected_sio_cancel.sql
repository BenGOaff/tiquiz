-- 20260609_profiles_expected_sio_cancel.sql
--
-- Ajoute profiles.expected_sio_cancel_until pour distinguer un
-- SALE_CANCELED « attendu » (= notre code a auto-cancel l'ancien sub
-- quand l'user a fait un upgrade/downgrade vers un autre palier) d'un
-- SALE_CANCELED « vrai » (= l'user veut vraiment quitter et redescendre
-- en free).
--
-- WORKFLOW PROTÉGÉ :
--   1. User clique "Passer en mensuel+" depuis Tiquiz → checkout SIO
--   2. User paie → webhook ORDER_NEW reçu pour monthly_plus
--   3. Webhook : profiles.plan = monthly_plus + cancel anciens subs SIO
--      + expected_sio_cancel_until = NOW() + 24h
--   4. SIO fire SALE_CANCELED pour l'ancien sub (latence variable)
--   5. Webhook voit expected_sio_cancel_until > NOW() → IGNORE
--      (sinon on flipperait plan → free à tort, perdant les features +)
--
-- Sans cette colonne : l'auto-cancel des anciens subs ferait downgrade
-- immédiat l'user vers free juste après son upgrade. Catastrophe support.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expected_sio_cancel_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_expected_sio_cancel
  ON public.profiles(expected_sio_cancel_until)
  WHERE expected_sio_cancel_until IS NOT NULL;

NOTIFY pgrst, 'reload schema';
