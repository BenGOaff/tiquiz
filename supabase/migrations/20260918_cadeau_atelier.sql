-- supabase/migrations/20260918_cadeau_atelier.sql
--
-- L'ATELIER OFFERT À QUI PASSE DU GRATUIT AU PAYANT.
--
-- Béné, 18 septembre 2026 : "s'il upgrade sur la version payante
-- (n'importe laquelle) il reçoit en plus l'Atelier du Quiz gratos."
--
-- Le cadeau n'est ouvert que dans des FENÊTRES (son arbitrage du même
-- jour) : les 7 jours qui suivent l'inscription gratuite, puis 2 jours à
-- la relance de 6 mois, puis 2 jours à celle d'un an.
--
-- -- POURQUOI ON GARDE LA DATE D'ENVOI, ET PAS SEULEMENT UN DRAPEAU ----
--
-- La relance part par un cron, et un cron ne tourne pas à la seconde
-- près : il peut prendre un jour de retard après une panne. Une fenêtre
-- calculée depuis `created_at + 6 mois` se refermerait donc AVANT que la
-- personne ne reçoive l'email qui la lui annonce.
--
-- La fenêtre part de la date d'ENVOI, celle qui correspond à ce que la
-- personne a lu. C'est la seule défendable.
--
-- -- ET POURQUOI `offert_le` EST UNE DATE, PAS UN BOOLÉEN --------------
--
-- Un booléen dit "oui". Une date dit "oui, ce jour là", ce qui répond
-- tout seul à la question qui viendra ("il l'a eu quand ?") sans avoir à
-- fouiller un journal. Même choix que `free_month_granted_at`.
--
-- AUCUNE LIGNE EXISTANTE N'EST TOUCHÉE : tout arrive à NULL, ce qui se
-- lit "jamais relancé, jamais offert", et c'est la vérité.

alter table public.profiles
  add column if not exists cadeau_atelier_offert_le timestamptz;

alter table public.profiles
  add column if not exists cadeau_atelier_relance_6mois_le timestamptz;

alter table public.profiles
  add column if not exists cadeau_atelier_relance_1an_le timestamptz;

-- PAR QUELLE PORTE il est entré : l'inscription, la relance de 6 mois,
-- celle d'un an. Sert à savoir laquelle de ses trois relances convertit,
-- ce qui décide de celles qu'on garde.
alter table public.profiles
  add column if not exists cadeau_atelier_fenetre text;

-- Le cron cherche les comptes gratuits à relancer : sans cet index il
-- lit toute la table à chaque passage.
create index if not exists idx_profiles_cadeau_relance
  on public.profiles (created_at)
  where cadeau_atelier_offert_le is null;

comment on column public.profiles.cadeau_atelier_offert_le is
  'Quand l''Atelier lui a ete offert sur un upgrade gratuit -> payant. NULL = jamais.';
comment on column public.profiles.cadeau_atelier_relance_6mois_le is
  'Quand la relance de 6 mois est PARTIE. C''est elle qui ouvre les 2 jours, pas une date calculee.';
comment on column public.profiles.cadeau_atelier_relance_1an_le is
  'Idem pour la relance d''un an.';
comment on column public.profiles.cadeau_atelier_fenetre is
  'inscription | relance_6_mois | relance_1_an : par quelle porte il est entre.';

notify pgrst, 'reload schema';
