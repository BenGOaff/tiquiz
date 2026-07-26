-- ════════════════════════════════════════════════════════════════
-- QUIZING — renommage applicatif (formaquiz -> quizing / L'Atelier du Quiz)
-- ════════════════════════════════════════════════════════════════
-- Aligne la PROD existante sur le renommage du code :
--   1. table video formaquiz_videos -> quizing_videos
--   2. chemins de stockage des videos deja uploadees (prefixe)
--   3. texte de marque stocke en base (instruction du coach)
--
-- Idempotent / guarde : sur une fresh install, 0001 cree deja
-- quizing_videos donc le rename ci-dessous est un no-op (IF EXISTS).
--
-- ⚠️ Le point 2 (storage_path) ne fait que reecrire la valeur en base.
-- Les OBJETS reels doivent etre deplaces cote Supabase Storage
-- (formaquiz/... -> quizing/...). Voir la note infra du PR / message.

-- 1. Table video : rename uniquement si l'ancienne existe encore.
alter table if exists formaquiz_videos rename to quizing_videos;

-- 2. Chemins de stockage : prefixe "formaquiz/" -> "quizing/".
update quizing_videos
   set storage_path = 'quizing/' || substr(storage_path, length('formaquiz/') + 1)
 where storage_path like 'formaquiz/%';

-- 3. Texte de marque stocke en base : instruction du coach IA.
update coach_settings
   set instruction = replace(instruction, 'FormaQuiz', 'L''Atelier du Quiz'),
       updated_at = now()
 where instruction like '%FormaQuiz%';

-- Recharge le cache de schema PostgREST.
notify pgrst, 'reload schema';
