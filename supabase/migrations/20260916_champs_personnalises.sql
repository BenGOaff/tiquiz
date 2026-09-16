-- ═══════════════════════════════════════════════════════════════
-- TIQUIZ - Champs personnalisés du formulaire de capture
-- (retour client, 16 septembre 2026)
-- ═══════════════════════════════════════════════════════════════
--
-- `quizzes.custom_fields` : la liste des champs que la créatrice ajoute
-- à son formulaire de capture, [{id, label, placeholder, required}].
-- L'id est STABLE : la valeur d'un lead est rangée sous cet id, jamais
-- sous le libellé, donc renommer un champ ne perd rien (même règle que
-- quiz_questions.id, 1er août 2026). Le contrôle de forme vit dans
-- lib/quiz/champsPersonnalises.ts, pas ici : ajouter un réglage à un
-- champ ne doit pas demander une migration.
--
-- `quiz_leads.custom_fields` : ce que le visiteur a saisi, {id: valeur}.
--
-- Aucun quiz existant ne bouge : le défaut est une liste vide.

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE quiz_leads
  ADD COLUMN IF NOT EXISTS custom_fields JSONB;

NOTIFY pgrst, 'reload schema';
