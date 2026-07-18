-- 0009_day_pepite.sql
-- "La pépite" du jour : un nugget avance et actionnable (persuasion, Ask,
-- growth hack) rendu dans un encart distinct. Personnalise comme le reste
-- (prenom + glossaire persona). Editable dans l'admin.

alter table days
  add column if not exists pepite_html text;

notify pgrst, 'reload schema';
