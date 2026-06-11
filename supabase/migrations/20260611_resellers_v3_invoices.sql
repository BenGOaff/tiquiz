-- 20260611_resellers_v3_invoices.sql (Tiquiz)
--
-- Phase 2 revendeur : commission mensuelle automatique.
--
-- Une facture par revendeur et par mois (period 'YYYY-MM'), générée par
-- le cron /api/cron/reseller-invoices :
--   - snapshot des LICENCES (comptes payants) par plan au moment de la
--     génération,
--   - taux du palier courant (resellers.commission_tiers),
--   - lignes par plan : nb licences x prix déclaré mensualisé x taux.
--     Les plans annuels sont mensualisés (prix / 12) pour une commission
--     lissée : "je ne touche que s'il touche", au prorata mensuel.
--   - prix déclaré manquant -> ligne flaggée missing_price, commission 0
--     sur cette ligne (Béné le voit dans son admin et tranche).
--
-- Montants en CENTIMES (bigint), jamais de float.
-- Statut : pending -> paid (marqué par Béné dans son admin).

CREATE TABLE IF NOT EXISTS public.reseller_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  -- Mois facturé, format 'YYYY-MM'. Une seule facture par mois et par
  -- revendeur (index unique ci-dessous, le cron est idempotent).
  period TEXT NOT NULL,
  licence_count INTEGER NOT NULL DEFAULT 0,
  rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  total_cents BIGINT NOT NULL DEFAULT 0,
  -- Détail par plan : [{ plan, licences, monthly_price_cents,
  --   commission_cents, missing_price }]
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

COMMENT ON TABLE public.reseller_invoices IS
'Factures mensuelles de commission Tipote dues par les revendeurs. Generees par /api/cron/reseller-invoices, marquees payees par Bene (admin).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_reseller_invoices_period
  ON public.reseller_invoices (reseller_id, period);

CREATE INDEX IF NOT EXISTS idx_reseller_invoices_status
  ON public.reseller_invoices (status, created_at DESC);

ALTER TABLE public.reseller_invoices ENABLE ROW LEVEL SECURITY;

-- Le revendeur lit SES factures. Écriture service-role uniquement
-- (cron + admin Béné).
DROP POLICY IF EXISTS reseller_invoices_select_own ON public.reseller_invoices;
CREATE POLICY reseller_invoices_select_own ON public.reseller_invoices
  FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM public.resellers WHERE user_id = auth.uid())
  );

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
