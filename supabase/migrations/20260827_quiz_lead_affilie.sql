-- 20260827_quiz_lead_affilie.sql
--
-- L'AFFILIÉ QUI A AMENÉ LE LEAD (demande Maurice, 27 août 2026).
--
-- Maurice met un quiz à disposition de ses affiliés. Il le DUPLIQUAIT
-- une fois par affilié, uniquement pour savoir qui lui amenait quel
-- contact : des statistiques éparpillées, et une correction à reporter
-- autant de fois qu'il a de partenaires.
--
-- Un seul quiz suffit dès que le lead porte sa provenance.
--
-- Trois colonnes et pas une, parce que les trois répondent à trois
-- questions différentes et qu'aucune ne se déduit des autres :
--   affiliate_sa    l'identifiant Systeme.io de l'affilié du vendeur ;
--   affiliate_ref   notre code public ;
--   affiliate_canal ce que l'affilié a écrit lui même (?c=youtube),
--                   la seule chose que le referrer ne peut PAS voir.
--
-- `sa` et `ref` ne se devinent jamais l'un l'autre : deviner à la forme
-- marcherait aujourd'hui et casserait le jour où une affiliée choisit
-- un code qui ressemble à un `sa`.

ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS affiliate_sa TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_ref TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_canal TEXT;

-- La question posée par l'écran de stats est toujours "les leads de CE
-- quiz, groupés par provenance". L'index suit cette question.
CREATE INDEX IF NOT EXISTS quiz_leads_affiliate_idx
  ON public.quiz_leads (quiz_id, affiliate_ref, affiliate_sa);

NOTIFY pgrst, 'reload schema';
