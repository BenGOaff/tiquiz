-- 0020_plus_trial.sql (formaquiz / L'Atelier du Quiz)
--
-- Opération "les 20 premiers inscrits reçoivent 1 mois Tiquiz Plus offert".
-- Béné a DEUX tunnels Systeme.io (le sien + l'affilié), chacun avec 20
-- places. On suit le décompte par tunnel, de façon idempotente et safe
-- (compteur atomique + journal des octrois).
--
-- 2 tables :
--   plus_trial_counters : 1 ligne par tunnel = compteur atomique des
--     places réellement consommées (cap par défaut 20). La réservation
--     d'une place se fait par un UPDATE conditionnel atomique
--     (granted < cap), donc pas de survente même en cas d'appels
--     concurrents.
--   plus_trial_claims : journal par acheteur (idempotence + audit +
--     support du transfert vers le bon compte Tiquiz).
--
-- Sûr à ré-exécuter (IF NOT EXISTS partout).

CREATE TABLE IF NOT EXISTS public.plus_trial_counters (
  funnel      TEXT PRIMARY KEY,
  granted     INTEGER NOT NULL DEFAULT 0,
  cap         INTEGER NOT NULL DEFAULT 20,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Les 2 tunnels de Béné, seedés à 0/20. D'autres tunnels seront créés
-- à la volée par le code (upsert) avec cap 20.
INSERT INTO public.plus_trial_counters (funnel, granted, cap)
VALUES ('bene', 0, 20), ('affiliate', 0, 20)
ON CONFLICT (funnel) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.plus_trial_claims (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel         TEXT NOT NULL,
  sio_email      TEXT NOT NULL,
  sio_order_id   TEXT,
  tiquiz_email   TEXT,
  tiquiz_user_id TEXT,
  -- granted | already_premium | full | error | pending
  status         TEXT NOT NULL DEFAULT 'pending',
  granted_plan   TEXT,
  pre_plan       TEXT,
  expires_at     TIMESTAMPTZ,
  -- true seulement quand une place du compteur a réellement été prise.
  consumed_place BOOLEAN NOT NULL DEFAULT false,
  place_number   INTEGER,
  -- 'systeme_io' | 'affiliate_sale' | 'manual' | ...
  origin         TEXT,
  last_error     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un seul claim par (tunnel, email) : garantit l'idempotence côté
-- acheteur (les retries SIO ne créent pas de doublon).
CREATE UNIQUE INDEX IF NOT EXISTS idx_plus_trial_claims_funnel_email
  ON public.plus_trial_claims (funnel, lower(sio_email));

CREATE INDEX IF NOT EXISTS idx_plus_trial_claims_status
  ON public.plus_trial_claims (funnel, status);

NOTIFY pgrst, 'reload schema';
