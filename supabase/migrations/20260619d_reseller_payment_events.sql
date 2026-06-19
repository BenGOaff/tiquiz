-- 20260619d_reseller_payment_events.sql (Tiquiz)
--
-- Journal du flux de paiement revendeur (Bene 19 juin 2026) : tracer
-- chaque etape (connexion, checkout, ouverture d'acces, webhooks) et
-- SURTOUT les echecs, avec le pourquoi. Objectif : diagnostiquer un
-- probleme sans demander a personne d'ouvrir une console.
--
-- Lecture : le revendeur voit SES evenements (RLS select-own), Bene voit
-- tout via le service-role (admin). Ecriture : service-role uniquement.

CREATE TABLE IF NOT EXISTS public.reseller_payment_events (
  id BIGSERIAL PRIMARY KEY,
  -- NULL possible : ex. webhook recu avec un token inconnu.
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE,
  provider TEXT,                       -- stripe | paypal | null
  stage TEXT NOT NULL,                 -- connect | checkout | provision | webhook
  event TEXT NOT NULL,                 -- ex. checkout_start, provision_success...
  ok BOOLEAN NOT NULL DEFAULT true,    -- false = echec (a remonter en rouge)
  email TEXT,
  plan TEXT,
  detail TEXT,                         -- message lisible (raison de l'echec)
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rpe_reseller
  ON public.reseller_payment_events (reseller_id, created_at DESC);

-- Retrouver vite les echecs (pour l'admin et le revendeur).
CREATE INDEX IF NOT EXISTS idx_rpe_errors
  ON public.reseller_payment_events (created_at DESC)
  WHERE ok = false;

ALTER TABLE public.reseller_payment_events ENABLE ROW LEVEL SECURITY;

-- Le revendeur lit son propre journal.
DROP POLICY IF EXISTS rpe_select_own ON public.reseller_payment_events;
CREATE POLICY rpe_select_own ON public.reseller_payment_events
  FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM public.resellers WHERE user_id = auth.uid())
  );

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
