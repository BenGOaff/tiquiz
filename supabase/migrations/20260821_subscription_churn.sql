-- 20260821_subscription_churn.sql
--
-- QUI A ARRÊTÉ SON ABONNEMENT, QUAND, ET POURQUOI.
--
-- Béné, 21 août : "qui a arrêté son abo : lui envoyer un mail pour lui
-- demander pourquoi et consigner ces réponses pour level up l'outil".
--
-- La question n'avait aucune donnée derrière : le webhook n'écoutait
-- aucun événement d'abonnement, donc personne ne nous disait qu'un
-- client était parti. Il gardait même son plan payant indéfiniment.
--
-- POURQUOI UNE TABLE À PART, ET PAS `plan_change_log`
-- ---------------------------------------------------
-- `plan_change_log` répond à "quel plan, quand, pourquoi", et il le fait
-- bien. Un départ a un cycle de vie plus long : il est ANNONCÉ (le
-- client résilie), puis EFFECTIF (la période payée se termine), puis on
-- lui DEMANDE pourquoi, puis il RÉPOND. Quatre moments, quatre dates,
-- que la table d'audit n'a pas vocation à porter.
--
-- LE MOMENT QUI COMPTE
-- --------------------
-- La ligne naît quand le client DEMANDE à partir, pas quand il est
-- parti. C'est le seul moment où il est encore client, donc le seul où
-- lui écrire a du sens.
--
-- CE QUE STRIPE DONNE GRATUITEMENT
-- ---------------------------------
-- Quand le client résilie depuis le portail Stripe, Stripe pose
-- `cancellation_details.feedback` (une raison parmi une liste) et
-- `.comment` (son texte libre). On ne les collectait pas. Une partie de
-- la réponse est donc là sans rien avoir à demander.

CREATE TABLE IF NOT EXISTS public.subscription_churn (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT        NOT NULL,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- D'où vient l'abonnement, et son identifiant chez le fournisseur.
  provider       TEXT        NOT NULL DEFAULT 'stripe',
  reference      TEXT,

  -- Ce qu'il payait, pour chiffrer ce qu'on perd.
  plan           TEXT,
  amount_cents   INTEGER,
  currency       TEXT,

  -- Les quatre moments.
  cancelled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),  -- il demande a partir
  ends_at        TIMESTAMPTZ,                          -- fin de la periode payee
  ended_at       TIMESTAMPTZ,                          -- l'acces est retire
  asked_at       TIMESTAMPTZ,                          -- on lui a demande pourquoi
  answered_at    TIMESTAMPTZ,                          -- il a repondu

  -- Ce que Stripe nous dit, sans rien demander.
  stripe_feedback TEXT,
  stripe_comment  TEXT,

  -- Sa reponse a nous.
  reason         TEXT,

  -- Il a annule sa resiliation : la ligne reste, pour ne pas perdre
  -- l'information "il a failli partir", qui vaut de l'or.
  reactivated_at TIMESTAMPTZ,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_churn IS
  'Un depart d abonnement : annonce, effectif, raison. Ecrit par le webhook Stripe.';

-- UNE LIGNE PAR ABONNEMENT, PAS UNE PAR EVENEMENT.
--
-- Stripe envoie plusieurs `customer.subscription.updated` pour le meme
-- depart (resiliation, puis changement de statut, puis fin). Sans cet
-- index, le tableau de bord compterait trois departs pour un seul
-- client. C'est exactement le drame des entrees dupliquees dans la
-- distribution par resultat (8 juin).
CREATE UNIQUE INDEX IF NOT EXISTS subscription_churn_ref_uidx
  ON public.subscription_churn (provider, reference)
  WHERE reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_churn_email_idx
  ON public.subscription_churn (email, cancelled_at DESC);

CREATE INDEX IF NOT EXISTS subscription_churn_cancelled_idx
  ON public.subscription_churn (cancelled_at DESC);

-- A relancer : parti, jamais interroge.
CREATE INDEX IF NOT EXISTS subscription_churn_a_relancer_idx
  ON public.subscription_churn (cancelled_at DESC)
  WHERE asked_at IS NULL;

ALTER TABLE public.subscription_churn ENABLE ROW LEVEL SECURITY;

-- Aucune politique utilisateur : seul `service_role` ecrit et lit, et il
-- contourne RLS. Un client n'a pas a lire les departs des autres.

NOTIFY pgrst, 'reload schema';
