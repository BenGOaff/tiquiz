-- 20260611_resellers_v2_automation.sql (Tiquiz)
--
-- Phase 3 revendeur : provisioning AUTOMATIQUE des comptes clients.
-- (Béné 11 juin 2026, soir : "les accès de ses clients sont ouverts,
-- mis à jour etc depuis leur interface, pas manuel")
--
-- 1. webhook_token : secret du webhook entrant générique du revendeur.
--    POST /api/reseller-webhook/<token>?plan=monthly&action=activate
--    Appelable depuis SON Systeme.io, SON Stripe, SON PayPal, Zapier...
--    Le payload doit juste contenir l'email de l'acheteur.
-- 2. slug : identifiant public des bons de commande hébergés Tiquiz
--    (/order/<slug>/<plan>). Non devinable (12 hex aléatoires).
-- 3. pricing : tarifs affichés sur ses bons de commande hébergés
--    ({ monthly: { amount: "19", currency: "EUR" }, ... }). Affichage
--    uniquement : le paiement réel se fait sur SES pages Stripe/PayPal
--    (checkout_urls).
-- 4. checkout_urls : re-déclaré en ALTER au cas où la foundation a été
--    appliquée AVANT l'ajout de la colonne dans le CREATE TABLE
--    (CREATE TABLE IF NOT EXISTS n'ajoute pas les colonnes manquantes).
--
-- Ré-exécutable sans risque : IF NOT EXISTS partout, backfills WHERE NULL.

ALTER TABLE public.resellers
  ADD COLUMN IF NOT EXISTS checkout_urls JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS webhook_token TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.resellers.webhook_token IS
'Secret du webhook entrant generique du revendeur (provisioning auto de ses clients). Rotation possible depuis son panel.';

COMMENT ON COLUMN public.resellers.slug IS
'Identifiant public des bons de commande heberges (/order/<slug>/<plan>).';

-- Backfill des lignes existantes (64 hex pour le token, 12 pour le slug).
UPDATE public.resellers
SET webhook_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE webhook_token IS NULL;

UPDATE public.resellers
SET slug = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_resellers_webhook_token
  ON public.resellers (webhook_token)
  WHERE webhook_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_resellers_slug
  ON public.resellers (slug)
  WHERE slug IS NOT NULL;

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
