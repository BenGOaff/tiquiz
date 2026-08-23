-- 20260824_webhook_lock.sql
--
-- LE RÉESSAI D'UN WEBHOOK DOIT POUVOIR REPASSER (audit du 24 août 2026).
--
-- CE QUI NE MARCHAIT PAS
-- ----------------------
-- L'index posé le 20 août couvrait TOUS les statuts :
--
--   (source, event_id) where event_id is not null
--                        and source in ('stripe','paypal')
--
-- Nos webhooks écrivaient une ligne `received` AVANT de travailler.
-- Quand le traitement échouait (Supabase indisponible une seconde,
-- Stripe injoignable), la route répondait 502 pour demander un réessai
-- au fournisseur. Ce réessai retombait sur la ligne `received`, était
-- pris pour un doublon, et recevait un 200.
--
-- Résultat : **une vente encaissée dont le premier traitement rate
-- n'ouvrait jamais l'accès**, et le fournisseur cessait de réessayer.
-- Huit chemins de nos deux webhooks répondaient 502 en comptant sur un
-- réessai qui ne pouvait pas arriver.
--
-- LA CORRECTION
-- -------------
-- Le statut fait partie du verrou. Une ligne `error` en SORT, donc le
-- réessai suivant peut reprendre. C'est exactement la forme de l'index
-- de la migration 012, qui protège le webhook Systeme.io depuis mars.
--
-- Rien à sauvegarder : les lignes existantes gardent leur statut, elles
-- sortent simplement de l'index si elles ne sont ni en cours ni
-- terminées.

drop index if exists public.webhook_logs_owner_event_uidx;

create unique index if not exists webhook_logs_owner_event_uidx
  on public.webhook_logs (source, event_id)
  where event_id is not null
    and source in ('stripe', 'paypal')
    and status in ('processing', 'processed');

-- Retrouver une vente restée en cours (traitement mort en route) sans
-- balayer toute la table.
create index if not exists webhook_logs_processing_idx
  on public.webhook_logs (source, received_at desc)
  where status = 'processing';

notify pgrst, 'reload schema';
