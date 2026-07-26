-- 0024_profiles_affiliate_email_overrides.sql
-- Personnalisation des emails de vente par l'affilié (espace Affiliation >
-- Emails). Chaque affilié peut modifier le corps d'un email et l'enregistrer :
-- on stocke ses versions dans un JSON sur son profil, clé = numéro d'email.
--   { "1": { "subject": "...", "bodyHtml": "<p>...</p>" }, "2": {...} }
-- Absence de clé = il utilise le modèle par défaut. RLS profiles déjà en
-- place (l'affilié ne modifie que sa ligne).

alter table public.profiles
  add column if not exists affiliate_email_overrides jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
