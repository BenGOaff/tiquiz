-- 20260620_resellers_handle.sql (Tiquiz)
--
-- Page de vente par revendeur (Bene 20 juin 2026) : chaque revendeur a sa
-- replique de la page de vente Tiquiz a une URL lisible, du type
-- quiz.tipote.com/<handle>/tiquiz, dont les boutons tarifs mènent a SES
-- bons de commande (/order/<slug>/<plan>).
--
-- handle = identifiant lisible (a-z0-9 et tirets), unique, derive du nom
-- a la creation, modifiable par le revendeur.

ALTER TABLE public.resellers
  ADD COLUMN IF NOT EXISTS handle TEXT;

COMMENT ON COLUMN public.resellers.handle IS
'Identifiant lisible pour l''URL de la page de vente (/<handle>/tiquiz). Unique, a-z0-9 et tirets.';

-- Backfill : slug lisible derive du nom, dedoublonne si collision.
WITH ranked AS (
  SELECT
    id,
    trim(both '-' FROM regexp_replace(lower(coalesce(nullif(trim(name), ''), 'revendeur')),
      '[^a-z0-9]+', '-', 'g')) AS base,
    row_number() OVER (
      PARTITION BY trim(both '-' FROM regexp_replace(lower(coalesce(nullif(trim(name), ''), 'revendeur')),
        '[^a-z0-9]+', '-', 'g'))
      ORDER BY created_at
    ) AS rn
  FROM public.resellers
  WHERE handle IS NULL
)
UPDATE public.resellers r
SET handle = CASE WHEN k.rn = 1 THEN k.base ELSE k.base || '-' || k.rn END
FROM ranked k
WHERE r.id = k.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_resellers_handle
  ON public.resellers (handle)
  WHERE handle IS NOT NULL;

-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
