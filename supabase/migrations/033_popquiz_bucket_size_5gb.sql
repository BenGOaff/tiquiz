-- ════════════════════════════════════════════
-- TIQUIZ — Popquiz: bump video bucket size limit to 5 GB
-- ════════════════════════════════════════════
--
-- Béné 2026-05-04 : « augmente la taille des vidéos acceptées et ne
-- pas dire à l'user que le plan supabase etc... il doit juste savoir
-- la taille max acceptée ».
--
-- 032 avait posé 2 GB. On passe à 5 GB pour couvrir les screencasts
-- 1080p de 2-3 heures sans rogner. Le message d'erreur côté UI a
-- aussi été nettoyé (« Fichier trop volumineux. La taille maximale
-- acceptée est 5 Go. ») — plus aucune mention de Supabase ou de
-- « ton plan ».
--
-- Idempotente : juste un UPDATE sur la row existante du bucket.

UPDATE storage.buckets
SET file_size_limit = 5368709120 -- 5 GB
WHERE id = 'popquiz-videos';
