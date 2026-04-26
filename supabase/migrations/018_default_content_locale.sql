-- Default language used when generating quiz content via the AI.
--
-- Decoupled from `ui_locale` (the language the user reads the Tiquiz
-- interface in). A user might browse Tiquiz in French but generate quizzes
-- in Brazilian Portuguese for their audience — these are independent.
--
-- The value is a BCP 47 tag matching `lib/quizLanguages.ts`. When NULL,
-- the QuizFormClient falls back to "fr".

alter table public.profiles
  add column if not exists content_locale text;

comment on column public.profiles.content_locale is
  'Default BCP 47 tag the AI uses when generating new quizzes for this user. NULL = fall back to "fr". Independent from ui_locale.';
