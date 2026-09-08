-- ═══════════════════════════════════════════
-- TIQUIZ — Ce que coûte une génération anonyme
-- ═══════════════════════════════════════════
--
-- Béné, 8 septembre 2026 : "dans admin, fais moi apparaitre qui entre
-- par le générateur dans mes contacts et dans les stat comment le
-- générateur convertit : visites / inscrits gratos / abonnés et le ROI".
--
-- -- CE QUI MANQUAIT, ET C'EST LA SEULE CHOSE -------------------------
--
-- Les quatre marches de l'entonnoir étaient DÉJÀ lisibles :
--   - les visites  -> `trafic_jour`, chemin `/generateur-de-quiz` ;
--   - les quiz     -> `embed_quiz_sessions.created_at` + `source` ;
--   - les inscrits -> `claimed_by_user_id` + `claimed_at` ;
--   - les abonnés  -> le `plan` de ces comptes.
--
-- Le ROI, lui, n'avait AUCUNE entrée : `/api/embed/quiz/generate` lit
-- `json.content` et jette `json.usage`. Aucun compteur de jetons n'était
-- écrit nulle part, donc aucun coût ne pouvait se calculer, ni ici ni
-- ailleurs.
--
-- -- ON STOCKE DES FAITS, ON CALCULE L'ARGENT -------------------------
--
-- Le modèle et les jetons sont des faits : ils ne bougeront plus. Le
-- PRIX, lui, est une table qui se périme (`lib/generateur/tarifsIa.ts`,
-- avec sa date de relevé, l'idiome de `TAUX_UE`). Stocker un montant
-- figerait le tarif du jour dans la base ; stocker les jetons laisse le
-- coût se recalculer quand la table est corrigée.
--
-- -- TROIS COLONNES, PAS CINQ -----------------------------------------
--
-- Anthropic facture aussi les jetons de CACHE. Mesuré le 8 septembre :
-- l'appel du générateur public ne pose AUCUN `cache_control`, donc ces
-- deux compteurs vaudraient zéro sur chaque ligne. Deux colonnes que
-- personne n'écrit sont exactement le piège que ce dépôt paie en boucle
-- (une branche que rien n'exerce). Le jour où le générateur met son
-- prompt en cache, elles s'ajoutent.
--
-- -- L'ÉCRITURE EST BEST-EFFORT, ET ELLE NE BLOQUE RIEN ---------------
--
-- Elle a lieu APRÈS la réponse du modèle, en UPDATE. Si cette migration
-- n'est pas encore passée, PostgREST rejette l'update et la route CRIE
-- dans le journal : on perd la MESURE, jamais le quiz. Un visiteur ne
-- doit pas repartir sans son quiz parce qu'un compteur n'a pas pu
-- s'écrire.

alter table public.embed_quiz_sessions
  add column if not exists modele_ia text,
  add column if not exists jetons_entree integer,
  add column if not exists jetons_sortie integer;

comment on column public.embed_quiz_sessions.modele_ia is
  'Le modèle Anthropic qui a écrit ce quiz. Le prix se lit dans lib/generateur/tarifsIa.ts, jamais ici.';
comment on column public.embed_quiz_sessions.jetons_entree is
  'usage.input_tokens de la réponse Anthropic. NULL = généré avant le 8 septembre 2026, ou update refusé.';
comment on column public.embed_quiz_sessions.jetons_sortie is
  'usage.output_tokens de la réponse Anthropic.';

-- L'ENTONNOIR LIT PAR PÉRIODE, PUIS PAR SOURCE.
--
-- Sans cet index, chaque ouverture de l'écran Trafic balaie la table
-- entière, et elle grossit d'une ligne par quiz généré, donc à chaque
-- visiteur du générateur public.
create index if not exists embed_quiz_sessions_created_at_idx
  on public.embed_quiz_sessions (created_at desc);

notify pgrst, 'reload schema';
