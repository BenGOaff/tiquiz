-- ============================================================
-- LE SUPPORT DE TIQUIZ : UNE DEMANDE, UNE RÉPONSE, UNE TRACE.
--
-- Béné, 22 août 2026 : "pourquoi ne pas lier le compte client à l'aide
-- au ticketing ? Retrouver toutes ses infos, pouvoir mettre à jour ses
-- infos, le rembourser, savoir d'où il vient..."
--
-- Le CENTRE D'AIDE existe déjà (57 articles, servis par Tipote sur
-- app.tipote.com/support, partagés par les deux apps). Ce qui manquait,
-- c'est le chemin vers un humain : une cliente bloquée n'avait aucun
-- moyen d'écrire depuis Tiquiz, et Béné aucun endroit pour répondre.
--
-- Les tickets vivent dans la base de TIQUIZ, et pas chez Tipote, pour
-- une raison précise : ils doivent apparaître sur la fiche du client,
-- à côté de ses accès et de ses paiements. Une donnée dans une autre
-- base est une donnée qu'on ne croisera jamais.
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Renseigné quand la personne écrit depuis son compte. Reste NULL si
  -- elle écrit sans être connectée : c'est exactement le cas de
  -- quelqu'un qui n'arrive PAS à se connecter, donc le cas où le
  -- support compte le plus.
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- L'adresse, elle, est TOUJOURS là : c'est la seule chose qui permet
  -- de répondre, et de rattacher le ticket à une fiche client.
  email        TEXT NOT NULL,
  name         TEXT,

  subject      TEXT,
  message      TEXT NOT NULL,

  -- D'où elle écrivait. Un support qui sait sur quel écran la personne
  -- était bloquée répond en une fois au lieu de trois.
  page         TEXT,

  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'replied', 'closed')),
  admin_reply  TEXT,
  replied_at   TIMESTAMPTZ,

  locale       TEXT NOT NULL DEFAULT 'fr',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Les deux façons de lire : la file d'attente, et la fiche d'un client.
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email
  ON support_tickets(lower(email), created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- AUCUNE POLICY DE LECTURE, ET C'EST VOULU.
--
-- Un ticket contient ce qu'une cliente a écrit, souvent son problème de
-- paiement ou de connexion. Sans policy SELECT, seule la clé de service
-- y accède, c'est à dire uniquement nos routes admin. Une policy
-- "chacun lit les siens" serait tentante ; elle ouvrirait la table à
-- tout le monde au premier oubli de filtre.
--
-- L'écriture, elle, doit rester possible pour une personne NON
-- connectée : celle qui n'arrive pas à se connecter est justement celle
-- qui a besoin d'écrire.
DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;
CREATE POLICY "support_tickets_insert"
  ON support_tickets FOR INSERT
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
