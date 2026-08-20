-- 20260820_owner_webhook_idempotency.sql
--
-- L'IDEMPOTENCE DES WEBHOOKS DE NOS PROPRES VENTES (Stripe, PayPal).
--
-- CE QUI NE MARCHAIT PAS
-- ----------------------
-- `lib/webhooks/log.ts` a été écrit le 20 août en portant le fichier de
-- l'Atelier, où l'index unique est `(source, event_id)`. Sur Tiquiz, le
-- seul index unique de `webhook_logs` est celui de la migration 012 :
--
--   ON public.webhook_logs (event_id)
--   WHERE event_id IS NOT NULL AND status = 'processed'
--
-- Il ne se déclenche QUE sur les lignes marquées `processed`. Or nos
-- webhooks Stripe et PayPal écrivent `received`, donc l'insertion
-- réussissait toujours, donc `duplicate` valait toujours `false`, donc
-- **l'idempotence n'existait pas** : un réessai de Stripe aurait ouvert
-- le plan une deuxième fois et renvoyé un deuxième lien de connexion.
--
-- Personne n'a été touché : le tunnel Tiquiz n'a jamais encaissé (les
-- clés ne sont pas posées, la route répond 503). Mais c'est exactement
-- le genre de faille qui ne se voit qu'à la première vraie vente.
--
-- POURQUOI UN INDEX PARTIEL, ET PAS `(source, event_id)` TOUT COURT
-- -----------------------------------------------------------------
-- Parce que la route Systeme.io journalise PLUSIEURS fois le même
-- événement (`received`, puis `processed` ou `error`). Il existe donc
-- déjà des doublons `(source, event_id)` en base, et un index unique
-- global échouerait à la création, ce qui laisserait la migration à
-- moitié appliquée.
--
-- L'index ne couvre donc que nos deux sources à nous. Systeme.io garde
-- son fonctionnement, ses lignes multiples et son propre index.

create unique index if not exists webhook_logs_owner_event_uidx
  on public.webhook_logs (source, event_id)
  where event_id is not null and source in ('stripe', 'paypal');

notify pgrst, 'reload schema';
