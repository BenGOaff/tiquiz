-- ============================================================
-- UN SEUL SERVICE DE TICKETING, POUR TOUTES LES APPS.
--
-- Béné, 23 août 2026 : "je veux un service de ticketing dans le centre
-- d'aide commun à toutes les app, essentiellement pour Tiquiz et
-- L'Atelier qui sont vendus en ce moment, avec ticket relié à la fiche
-- client si elle existe."
--
-- Il y en avait DEUX, et c'est le vrai problème :
--   - `support_tickets` chez TIPOTE (12 mars) : les escalades du chat du
--     centre d'aide, avec la conversation complète ;
--   - `support_tickets` ici (22 août) : le formulaire de Tiquiz.
-- Deux files, deux écrans d'admin, et aucun des deux ne connaît
-- L'Atelier. Une réponse peut attendre des jours dans celle que l'on ne
-- regarde pas.
--
-- La file unique vit ICI, et pas chez Tipote, pour la raison déjà
-- écrite le 22 août : le ticket doit s'afficher sur la FICHE CLIENT, à
-- côté de ses accès et de ses paiements, et c'est l'admin de Tiquiz qui
-- porte cette fiche (elle lit déjà L'Atelier en lecture seule). Une
-- donnée dans une autre base est une donnée qu'on ne croisera jamais.
--
-- Le centre d'aide de Tipote garde la PORTE (le formulaire public) et
-- relaie ici. La porte est commune, la file est unique.
-- ============================================================

-- DE QUEL PRODUIT PARLE CE TICKET.
--
-- Défaut `tiquiz` : tout ce qui existe déjà vient du formulaire de
-- Tiquiz, donc aucun ticket ne change de sens en passant cette
-- migration.
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'tiquiz';

-- Pas de CHECK volontairement : une valeur inconnue doit s'afficher
-- telle quelle dans la file plutôt que faire échouer l'écriture d'un
-- ticket. Un ticket perdu coûte plus cher qu'un libellé bizarre. La
-- validation vit dans `lib/support/produit.ts`, côté application.

-- LA CONVERSATION, quand le ticket vient du chat du centre d'aide.
--
-- La table de Tipote la portait, pas celle-ci. Sans cette colonne, une
-- escalade relayée ici perdrait tout ce que la personne a déjà écrit au
-- robot, et Béné répondrait à une question sans en connaître le début.
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS conversation JSONB NOT NULL DEFAULT '[]'::jsonb;

-- La file se lit par produit quand une seule app est concernée.
CREATE INDEX IF NOT EXISTS idx_support_tickets_product
  ON support_tickets(product, status, created_at DESC);

NOTIFY pgrst, 'reload schema';
