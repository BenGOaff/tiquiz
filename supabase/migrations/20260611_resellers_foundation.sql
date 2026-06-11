-- 20260611_resellers_foundation.sql (Tiquiz)
--
-- Fondation du modèle REVENDEUR (option A validée par Béné 11 juin 2026) :
-- un client Tiquiz revend des comptes à SES clients, hébergés sur l'infra
-- Tiquiz (mêmes tables, mêmes RLS), simplement tagués via
-- profiles.reseller_id. Béné prend une commission sur ses clients PAYANTS
-- uniquement (barème dégressif stocké dans resellers.commission_tiers,
-- exploité en phase 2 pour la facturation automatique).
--
-- Phase 1 (cette migration) :
--   1. Table resellers (1 ligne = 1 revendeur, rattaché à son compte
--      Tiquiz existant via user_id).
--   2. Colonne profiles.reseller_id (NULL pour tous les clients directs
--      de Béné : AUCUN impact sur l'existant).
--   3. Table reseller_actions : audit de toutes les actions du revendeur
--      sur ses clients (création, renvoi d'accès, et en phase 2 :
--      upgrade/downgrade/suspension).
--
-- Conventions maison : IF NOT EXISTS partout, DROP POLICY IF EXISTS
-- avant CREATE POLICY, NOTIFY pgrst en fin.

-- ----------------------------------------------------------------------------
-- 1. resellers
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Compte Tiquiz du revendeur (son login). ⚠️ auth user id, PAS
  -- profiles.id (piège Tiquiz : profiles.user_id = auth id).
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  -- Barème de commission validé par Béné le 11 juin 2026. Paliers sur le
  -- nombre de clients ACTIFS (= payants) : max_active NULL = palier final.
  -- Exploité en phase 2 (facturation auto). Modifiable par revendeur.
  commission_tiers JSONB NOT NULL DEFAULT '[
    {"max_active": 200,  "rate": 0.40},
    {"max_active": 1000, "rate": 0.35},
    {"max_active": 2000, "rate": 0.30},
    {"max_active": 3000, "rate": 0.25},
    {"max_active": null, "rate": 0.20}
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.resellers IS
'Revendeurs Tiquiz : clients qui revendent des comptes a leurs propres clients, heberges sur l''infra Tiquiz. profiles.reseller_id pointe ici. Ecriture service-role uniquement (admin Bene).';

ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

-- Le revendeur peut lire SA propre ligne (statut, barème). Écriture
-- uniquement via service-role (admin Béné).
DROP POLICY IF EXISTS resellers_select_own ON public.resellers;
CREATE POLICY resellers_select_own ON public.resellers
  FOR SELECT
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. profiles.reseller_id
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.reseller_id IS
'NULL = client direct Tiquiz (cas general). Renseigne = compte appartenant au portefeuille d''un revendeur. Ne change RIEN au comportement du compte : memes RLS, memes features.';

CREATE INDEX IF NOT EXISTS idx_profiles_reseller
  ON public.profiles (reseller_id)
  WHERE reseller_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. reseller_actions (audit)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reseller_actions (
  id BIGSERIAL PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email TEXT,
  action TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reseller_actions IS
'Audit des actions revendeur sur ses clients (create_client, resend_access, puis phase 2 : plan_change, suspend). Ecriture service-role uniquement.';

CREATE INDEX IF NOT EXISTS idx_reseller_actions_reseller
  ON public.reseller_actions (reseller_id, created_at DESC);

ALTER TABLE public.reseller_actions ENABLE ROW LEVEL SECURITY;

-- Le revendeur peut relire son propre journal d'actions.
DROP POLICY IF EXISTS reseller_actions_select_own ON public.reseller_actions;
CREATE POLICY reseller_actions_select_own ON public.reseller_actions
  FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM public.resellers WHERE user_id = auth.uid())
  );

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
