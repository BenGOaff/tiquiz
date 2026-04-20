-- Idempotency + processing status for Systeme.io webhook retries.
--
-- WHY THIS EXISTS
-- ---------------
-- SIO retries webhooks aggressively on 5xx/timeout. Without a dedup key
-- each retry would createUser → fail "already registered" → listUsers →
-- upsert profile → send a *new* magic link, flooding the buyer's inbox.
--
-- event_id stores a stable dedup key (we use "sio_order_<order.id>" from
-- the payload). The partial unique index lets many logs have event_id=NULL
-- (legacy rows, failure events we don't dedup) without blocking inserts.
--
-- status lets the handler record whether a given payload was actually
-- granted access ("processed") vs ignored ("skipped"/"failure_event") vs
-- errored ("error"). The idempotency check only short-circuits on
-- status='processed' so a previously-failed attempt can still be retried.
--
-- Purpose: prevent double-grants & double-emails on SIO retry, and make
-- the webhook_logs table actually useful for SAV ("did buyer X receive
-- their access?").

ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS error text;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_logs_event_id_processed_uidx
  ON public.webhook_logs (event_id)
  WHERE event_id IS NOT NULL AND status = 'processed';

CREATE INDEX IF NOT EXISTS webhook_logs_status_idx
  ON public.webhook_logs (status, received_at DESC)
  WHERE status IS NOT NULL;
