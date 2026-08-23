-- ============================================================
-- LE MOIS OFFERT : UNE SEULE FOIS, ET ON VOIT QUI TRICHE.
--
-- Béné, 23 août 2026 : "garder le mois offert aux affiliés pour qu'ils
-- puissent créer du contenu et tester ET qu'ils puissent [offrir] un
-- mois gratuit pour tester à tous leurs affiliés comme argument de vente
-- 'passe par mon lien et reçois un mois offert'. Bien sûr, ils ne
-- peuvent pas cumuler mois offert par l'affilié PLUS mois offert EN TANT
-- qu'affilié : au total c'est un mois offert, point barre. Il faut aussi
-- tracker les tricheurs qui veulent s'autoaffilier."
--
-- -- CE QUE C'EST, ET CE QUE CE N'EST PAS -------------------------
--
-- Précision de Béné le même jour : "s'il prend mensuel il a 30j gratos
-- à mensuel. S'il prend mensuel plus : il a 30j gratos à mensuel plus."
--
-- Ce n'est donc PAS un palier prêté : c'est un essai gratuit sur
-- l'abonnement choisi, ouvert par Stripe (`trial_period_days`) et par
-- PayPal (un cycle `TRIAL`). Aucune de ces colonnes ne touche au palier
-- de la personne, et c'est le point : ses 15 jours de Tiquiz Plus
-- offerts par l'Atelier vivent dans `affiliate_trial_*` et continuent
-- de tourner sans qu'on y touche. Deux mécaniques séparées, aucune ne
-- mange l'autre.
--
-- -- POURQUOI UN MARQUEUR QUI SURVIT -------------------------------
--
-- Le "point barre" a besoin d'une mémoire qui survit à la fin de
-- l'essai : sans elle, il suffirait d'attendre l'expiration pour
-- reprendre un mois. `free_month_granted_at` n'est donc jamais effacé.

-- QUAND elle a eu son mois offert. Jamais effacé : c'est le "point barre".
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_month_granted_at TIMESTAMPTZ;

-- PAR QUELLE PORTE : 'affiliee' (elle est affiliée et teste l'outil)
-- ou 'filleul' (elle est venue par le lien de quelqu'un).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_month_source TEXT;

-- LE LIEN qui l'a amenée, quand il y en avait un. C'est ce qui permet
-- de compter les mois offerts par une affiliée, et de repérer celle qui
-- en distribue trente à la même adresse IP.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_month_sa TEXT;

-- L'EMPREINTE de l'adresse IP, jamais l'adresse elle même (SHA256 + sel,
-- comme `affiliate_clicks.ip_hash` côté Tipote depuis mai). On compare
-- des empreintes, on ne stocke pas de donnée personnelle.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_month_ip_hash TEXT;

-- CE QUI SENT MAUVAIS, sans bloquer. Béné a demandé de TRACKER les
-- tricheurs, pas de fermer la porte au nez d'un client honnête : une IP
-- partagée, c'est aussi un couple, deux collègues, une salle de
-- formation. On accorde, on marque, et l'admin voit la ligne.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_month_flag TEXT;

-- Les deux lectures : "combien de mois ce lien a-t-il distribué",
-- et "quelles empreintes d'IP ont déjà servi sur ce lien".
CREATE INDEX IF NOT EXISTS idx_profiles_free_month_sa
  ON profiles(free_month_sa, free_month_granted_at DESC)
  WHERE free_month_sa IS NOT NULL;

NOTIFY pgrst, 'reload schema';
