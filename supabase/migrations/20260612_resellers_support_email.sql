-- 20260612_resellers_support_email.sql (Tiquiz)
--
-- Email d'accès personnalisé par revendeur (demande Béné 12 juin 2026).
--
-- Quand support_email est renseigné (et RESEND_API_KEY configurée),
-- les emails d'accès des clients du revendeur ne passent plus par le
-- template Supabase global (signé Béné) mais par un email Resend
-- personnalisé : nom du revendeur + son contact support, reply-to vers
-- lui. Ses clients le contactent LUI, pas Béné.
--
-- support_email NULL = comportement actuel (template Supabase).

ALTER TABLE public.resellers
  ADD COLUMN IF NOT EXISTS support_email TEXT;

COMMENT ON COLUMN public.resellers.support_email IS
'Contact support du revendeur, affiche dans les emails d''acces envoyes a ses clients (reply-to). NULL = template Supabase par defaut.';

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
