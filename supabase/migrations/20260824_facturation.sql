-- 20260824_facturation.sql
--
-- CE QU'IL FAUT POUR UNE FACTURE, ET LA FACTURE ELLE MÊME.
--
-- Béné, 24 août 2026 : "dans la fiche contact de mes clients j'ai aussi
-- besoin de savoir : l'entreprise (si concerné), l'adresse, le pays, la
-- tva (si concerné), prénom, nom, adresse email, bref tout ce qu'il faut
-- pour une facture légale et que je puisse mettre à jour si demande du
-- client : lui aussi doit avoir ces infos et pouvoir les mettre à jour.
-- PayPal envoie des factures auto ? Si non il faut qu'on les créée...
-- stripe le fait c'est bien mais paypal j'ai un doute."
--
-- Son doute est fondé, et la réponse est vérifiable chez nous sans même
-- interroger PayPal : `lib/checkout/paypalOwner.ts` n'appelle AUCUN
-- point d'entrée de facturation, et l'abonnement qu'on crée ne porte ni
-- adresse ni numéro de TVA. Aucune facture n'existait donc pour une
-- vente PayPal, quoi que PayPal fasse de son côté. Stripe, lui, en émet
-- (`invoice_creation` en paiement unique, et un abonnement facture tout
-- seul à chaque échéance).
--
-- DEUX TABLES, ET LA DIFFÉRENCE EST LA CLÉ DE TOUT
-- -------------------------------------------------
-- `facturation_clients` : les infos ACTUELLES, celles que le client et
--   Béné modifient. Elles servent aux factures À VENIR.
-- `factures` : ce qui a été émis. Une facture est FIGÉE, y compris
--   l'identité de l'acheteur, recopiée dedans au moment de l'émission.
--
-- Ce n'est pas une précaution d'ingénieur, c'est la loi : une facture
-- émise ne se modifie pas. Si un client déménage, ses anciennes factures
-- gardent l'ancienne adresse ; une erreur se corrige par un AVOIR suivi
-- d'une nouvelle facture, jamais en réécrivant l'ancienne. Une table qui
-- lirait l'adresse courante à l'affichage réécrirait tout l'historique
-- au premier déménagement, sans que personne ne le voie.

-- ============================================================
-- 1. LES INFOS DE FACTURATION DU CLIENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.facturation_clients (
  -- LA CLÉ EST L'ADRESSE, PAS LE COMPTE.
  --
  -- Parce qu'au moment où l'argent rentre, le compte n'existe pas
  -- toujours : `grantPlanByEmail` peut créer le compte APRÈS le
  -- paiement. Une clé `user_id` obligerait à écrire la facturation plus
  -- tard, donc à ne pas l'écrire du tout le jour où l'étape saute.
  --
  -- `user_id` est rempli dès qu'on le connaît, et les lectures passent
  -- par lui EN PREMIER : quelqu'un qui change l'adresse de son compte
  -- garde ses infos de facturation.
  email_cle    TEXT PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- L'adresse de facturation. Elle peut différer de celle du compte :
  -- une comptable reçoit souvent les factures d'un compte qui n'est pas
  -- le sien.
  email        TEXT,

  prenom       TEXT,
  nom          TEXT,
  -- "si concerné" : un particulier n'a ni société ni numéro de TVA, et
  -- l'écran ne doit pas lui demander de remplir des cases vides.
  societe      TEXT,
  tva_numero   TEXT,

  adresse1     TEXT,
  adresse2     TEXT,
  code_postal  TEXT,
  ville        TEXT,
  -- ISO 3166-1 alpha-2, en majuscules. C'est LUI qui décide de la TVA :
  -- un pays écrit en toutes lettres ("Belgique", "belgium", "BE") donne
  -- trois valeurs pour un seul pays, donc trois taux possibles.
  pays         TEXT,

  -- QUI a écrit la dernière version. Sans ça, personne ne sait si une
  -- adresse vient du client, de Béné, ou du formulaire de paiement, et
  -- la question se pose exactement le jour où elle est fausse.
  maj_par      TEXT CHECK (maj_par IN ('client', 'admin', 'checkout', 'stripe', 'paypal')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS facturation_clients_user_idx
  ON public.facturation_clients (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.facturation_clients ENABLE ROW LEVEL SECURITY;

-- AUCUNE POLICY, comme pour `support_tickets`, et pour la même raison :
-- c'est une adresse postale et un numéro de TVA. Seules nos routes
-- serveur y touchent, avec la clé de service, après avoir vérifié la
-- session. Une policy "chacun lit la sienne" ouvrirait la table entière
-- au premier oubli de filtre.

-- ============================================================
-- 2. LE COMPTEUR DE NUMÉROS
-- ============================================================
--
-- POURQUOI PAS UNE SEQUENCE POSTGRES : une séquence saute des numéros
-- dès qu'une transaction est annulée (c'est même sa raison d'être, elle
-- ne prend pas de verrou). Une numérotation de factures doit être
-- CHRONOLOGIQUE ET CONTINUE : un trou est exactement ce qu'un contrôle
-- cherche. On prend donc un verrou sur une ligne de compteur, dans la
-- même transaction que l'insertion.

CREATE TABLE IF NOT EXISTS public.facture_compteurs (
  serie    TEXT PRIMARY KEY,
  dernier  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 3. LES FACTURES ÉMISES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.factures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- "TQ-2026-0001". La série est l'année : on repart à 1 le 1er janvier,
  -- ce qui est la pratique courante et reste continu à l'intérieur.
  serie        TEXT NOT NULL,
  rang         INTEGER NOT NULL,
  numero       TEXT NOT NULL UNIQUE,

  -- 'facture' ou 'avoir'. Un remboursement n'efface jamais une facture :
  -- il en émet une autre, en négatif, qui la référence.
  genre        TEXT NOT NULL DEFAULT 'facture' CHECK (genre IN ('facture', 'avoir')),
  avoir_de     UUID REFERENCES public.factures(id) ON DELETE SET NULL,

  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_cle    TEXT NOT NULL,

  provider     TEXT NOT NULL CHECK (provider IN ('paypal', 'stripe', 'manuel')),
  -- Ce qu'on a encaissé, tel que le fournisseur le nomme. C'est la clé
  -- d'idempotence : un webhook rejoué ne doit pas émettre deux factures.
  sale_ref     TEXT,

  product_id   TEXT,
  libelle      TEXT NOT NULL,

  currency     TEXT NOT NULL DEFAULT 'eur',
  -- Le prix de Béné est TTC (décision du 12 août). Le HT et la TVA sont
  -- donc CALCULÉS à l'intérieur du total, jamais ajoutés par dessus.
  total_cents  INTEGER NOT NULL,
  ht_cents     INTEGER NOT NULL,
  tva_cents    INTEGER NOT NULL,
  -- En points de base : 2000 = 20,00 %. La Finlande est à 25,5 %, donc
  -- un entier de pourcentage perdrait une vraie valeur.
  tva_taux_bp  INTEGER NOT NULL,
  -- La phrase légale qui va avec le taux (autoliquidation, OSS, hors
  -- UE). Elle est FIGÉE avec la facture : les règles changent, la
  -- facture émise ne change pas.
  tva_mention  TEXT,

  -- L'IDENTITÉ RECOPIÉE, vendeur ET acheteur. Voir l'en-tête : c'est ce
  -- qui rend la facture opposable des années après.
  acheteur     JSONB NOT NULL DEFAULT '{}'::jsonb,
  vendeur      JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Ce qui reste à compléter, quand on a émis quand même. On n'attend
  -- jamais une adresse pour donner sa facture à quelqu'un qui a payé :
  -- on émet, on marque, et l'admin voit la liste.
  a_completer  TEXT[] NOT NULL DEFAULT '{}',

  paid_at      TIMESTAMPTZ,
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- L'IDEMPOTENCE. Un webhook PayPal est rejoué à la moindre erreur : sans
-- cet index, un réessai émettrait une deuxième facture pour le même
-- encaissement, avec un numéro de plus. Deux factures pour une vente est
-- infiniment plus coûteux qu'une facture manquante.
CREATE UNIQUE INDEX IF NOT EXISTS factures_vente_uidx
  ON public.factures (provider, sale_ref, genre)
  WHERE sale_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS factures_client_idx
  ON public.factures (email_cle, issued_at DESC);
CREATE INDEX IF NOT EXISTS factures_a_completer_idx
  ON public.factures (issued_at DESC)
  WHERE array_length(a_completer, 1) IS NOT NULL;

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
-- Idem : aucune policy. Une facture porte une adresse postale, un numéro
-- de TVA et un montant.

-- ============================================================
-- 4. ÉMETTRE, EN UNE SEULE TRANSACTION
-- ============================================================
--
-- Allouer le numéro puis insérer en deux appels laisserait un trou dans
-- la numérotation dès que le second échoue. Les deux sont donc ici,
-- ensemble, et le verrou de ligne du compteur sérialise les émissions
-- concurrentes (deux échéances qui tombent à la même seconde).
--
-- ET CETTE FONCTION NE LÈVE JAMAIS SUR UN DOUBLON : elle renvoie la
-- facture déjà émise. Un webhook rejoué doit pouvoir répondre 200 sans
-- rien casser, et sans consommer un numéro pour rien.

CREATE OR REPLACE FUNCTION public.emettre_facture(
  p_serie       TEXT,
  p_genre       TEXT,
  p_user_id     UUID,
  p_email_cle   TEXT,
  p_provider    TEXT,
  p_sale_ref    TEXT,
  p_product_id  TEXT,
  p_libelle     TEXT,
  p_currency    TEXT,
  p_total_cents INTEGER,
  p_ht_cents    INTEGER,
  p_tva_cents   INTEGER,
  p_tva_taux_bp INTEGER,
  p_tva_mention TEXT,
  p_acheteur    JSONB,
  p_vendeur     JSONB,
  p_a_completer TEXT[],
  p_paid_at     TIMESTAMPTZ,
  p_avoir_de    UUID
) RETURNS public.factures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rang    INTEGER;
  v_numero  TEXT;
  v_ligne   public.factures;
BEGIN
  -- Déjà émise ? On rend la même, sans toucher au compteur.
  IF p_sale_ref IS NOT NULL THEN
    SELECT * INTO v_ligne FROM public.factures
     WHERE provider = p_provider AND sale_ref = p_sale_ref AND genre = p_genre
     LIMIT 1;
    IF FOUND THEN
      RETURN v_ligne;
    END IF;
  END IF;

  INSERT INTO public.facture_compteurs (serie, dernier)
       VALUES (p_serie, 0)
  ON CONFLICT (serie) DO NOTHING;

  UPDATE public.facture_compteurs
     SET dernier = dernier + 1
   WHERE serie = p_serie
  RETURNING dernier INTO v_rang;

  v_numero := p_serie || '-' || lpad(v_rang::text, 4, '0');

  INSERT INTO public.factures (
    serie, rang, numero, genre, avoir_de, user_id, email_cle, provider,
    sale_ref, product_id, libelle, currency, total_cents, ht_cents,
    tva_cents, tva_taux_bp, tva_mention, acheteur, vendeur, a_completer, paid_at
  ) VALUES (
    p_serie, v_rang, v_numero, p_genre, p_avoir_de, p_user_id, p_email_cle,
    p_provider, p_sale_ref, p_product_id, p_libelle, p_currency, p_total_cents,
    p_ht_cents, p_tva_cents, p_tva_taux_bp, p_tva_mention,
    COALESCE(p_acheteur, '{}'::jsonb), COALESCE(p_vendeur, '{}'::jsonb),
    COALESCE(p_a_completer, '{}'::text[]), p_paid_at
  )
  RETURNING * INTO v_ligne;

  RETURN v_ligne;
END;
$$;

REVOKE ALL ON FUNCTION public.emettre_facture(
  TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER,
  INTEGER, INTEGER, TEXT, JSONB, JSONB, TEXT[], TIMESTAMPTZ, UUID
) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
