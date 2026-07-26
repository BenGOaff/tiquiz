-- ════════════════════════════════════════════════════════════════
-- QUIZING — certificat de reussite = recompense de FIN DE PARCOURS
-- ════════════════════════════════════════════════════════════════
--
-- Changement de logique (25 juillet 2026) : le certificat n'est plus
-- gate par un examen. Il se debloque des que l'eleve a termine les 7
-- jours de l'Atelier. L'eleve choisit librement le nom affiche (nom +
-- prenom, marque, surnom...) au moment de le generer.
--
-- Ce fichier :
--   1. Ajoute `cert_number` : numero de certificat au format
--      AAAAMMJJ + rang du jour (ex. 2026072501 = 1er certificat du
--      25 juillet 2026). Sert de reference officielle + preuve sociale
--      cote admin.
--   2. Rend `score` / `total` nullables (plus d'examen note).
--   3. Cree un compteur journalier atomique + la fonction
--      `allocate_cert_number()` pour attribuer ce numero sans collision.
--
-- Conventions Bene : IF NOT EXISTS partout, RLS deja active sur
-- certificates (cf. 0007), NOTIFY pgrst en fin.

-- 1. Numero de certificat (unique, nullable le temps du backfill).
alter table certificates
  add column if not exists cert_number text;

-- 1bis. URL encodee dans le QR code du certificat. On la snapshote a la
-- generation : lien affilie tracke de l'eleve (page de vente de l'Atelier
-- + son ?sa=... Systeme.io) s'il a renseigne son ID affilie, sinon le lien
-- de vente simple. Ainsi l'eleve peut toucher une commission quand son
-- certificat est partage et scanne.
alter table certificates
  add column if not exists qr_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'certificates_cert_number_key'
  ) then
    alter table certificates
      add constraint certificates_cert_number_key unique (cert_number);
  end if;
end $$;

-- 2. Plus d'examen : score/total deviennent optionnels.
alter table certificates alter column score drop not null;
alter table certificates alter column total drop not null;

-- 3. Compteur journalier pour le rang du jour. Une ligne par jour,
--    incrementee atomiquement (upsert) a chaque nouveau certificat.
create table if not exists cert_number_seq (
  day  date primary key,
  last integer not null default 0
);

alter table cert_number_seq enable row level security;
-- Aucune policy : seule la service_role (fonction SECURITY DEFINER)
-- y touche. Les clients n'y accedent jamais directement.

-- Attribue et renvoie le prochain numero de certificat pour un jour
-- donne (par defaut aujourd'hui). Atomique : l'upsert verrouille la
-- ligne du jour, donc deux appels simultanes ne peuvent pas tomber sur
-- le meme rang.
create or replace function allocate_cert_number(p_day date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq integer;
begin
  insert into cert_number_seq (day, last)
    values (p_day, 1)
  on conflict (day)
    do update set last = cert_number_seq.last + 1
  returning last into seq;

  -- AAAAMMJJ + rang sur au moins 2 chiffres (01, 02, ... 99, 100).
  return to_char(p_day, 'YYYYMMDD') || lpad(seq::text, 2, '0');
end;
$$;

-- Recharge le cache de schema PostgREST.
notify pgrst, 'reload schema';
