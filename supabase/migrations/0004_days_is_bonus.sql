-- ════════════════════════════════════════════════════════════════
-- QUIZING — distinction parcours / bonus
-- ════════════════════════════════════════════════════════════════
-- is_bonus = true : contenu bonus, accessible a tout moment (hors de la
-- sequence quotidienne). false : jour du parcours (debloque sequentiellement).

alter table days
  add column if not exists is_bonus boolean not null default false;

notify pgrst, 'reload schema';
