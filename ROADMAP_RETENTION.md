# Roadmap rétention Tiquiz — audit 1er juin 2026

> Roadmap partagée Tipote ↔ Tiquiz issue de l'audit du 1er juin 2026.
> Document canonique complet : `tipote-app/ROADMAP_RETENTION.md`. Cette
> copie locale liste les phases qui touchent Tiquiz pour qu'un agent qui
> code sur Tiquiz ait le contexte sans dépendre du repo Tipote.

---

## 📝 TODO BÉNÉ — MISE À JOUR DOCUMENTATION PRODUIT (2 juin 2026)

Suite aux changements pricing + features du 2 juin (corrigés après-midi),
à mettre à jour manuellement (copywriting, pas du code).

### Matrice features par plan (source vérité CODE = lib/planLimits.ts) :

| Feature | free | monthly (9€) | yearly (90€) | **monthly+ (29€)** | **yearly+ (290€)** | lifetime / beta |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Quiz actifs | 1 | illim | illim | illim | illim | illim |
| Sondages actifs | 1 | illim | illim | illim | illim | illim |
| Popquizz | 1 | illim | illim | illim | illim | illim |
| Réponses captées visibles | 10 / mois | illim | illim | illim | illim | illim |
| Custom footer | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clés Systeme.io | 1 max | **1 max** | **1 max** | illim | illim | illim |
| Multiprofils (plusieurs comptes) | ✗ | ✗ | ✗ | **✓** | **✓** | ✓ |
| **Analyse IA des résultats** (quiz ET sondages) | ✗ | ✗ | ✗ | **✓** | **✓** | ✓ |

### Fichiers à mettre à jour :

- **`PRODUCT_BRIEF.md`** : ajouter les 2 paliers + (29€/290€) avec la
  matrice ci-dessus. Le mensuel ET l'annuel normaux ne peuvent
  connecter qu'**1 seule clé** Systeme.io. L'analyse IA couvre
  désormais quiz ET sondages. Beta et lifetime = équivalent + (tout débloqué).
- **`copywriting-claude/Sequence-activation-testeurs-gratuits-Tiquiz.md`** :
  mettre à jour la grille de prix dans la séquence email.
- **`copywriting-claude/article-blog-affiliation-tiquiz.md`** : recalculer
  les rentes affiliés en intégrant les nouveaux paliers 29/290.
- **Pages /pricing et /upgrade** côté UI marketing : ajouter monthly+ /
  yearly+ avec les bénéfices comparatifs.
- **Cahier des charges** : documenter la matrice complète et la
  sémantique "compte secondaire = compte neuf" (cf. CLAUDE_PITFALLS.md).

---

## 🔖 POINT D'ÉTAPE TIQUIZ — reprendre ici (dernière session : 1er juin 2026)

> Point d'étape complet (2 apps) dans `tipote-app/ROADMAP_RETENTION.md`.
> Tout est poussé sur `claude/busy-wright-501xR`.

### ✅ FAIT côté Tiquiz
- Rétention : milestones + Wall of Wins (phases 0-2, backfill ✅ 60
  milestones), 8 templates métier + galerie SEO `/templates`, smoke tests.
- Sondages : export CSV + PDF brandé Tiquiz, analyse IA des résultats
  (Claude Opus 4.8, gate plan `canUseSurveyAI`).
- Tier Opus → 4.8.

### ⚠️ À DÉPLOYER (Béné)
- **Run migration `supabase/migrations/20260605_survey_ai_analysis.sql`**
  (nouvelle, pour l'analyse IA sondage). La 20260604 (business_events)
  est déjà appliquée.
- Build + restart pm2 `tiquiz-prod` (PDF refonte + analyse IA).
- Pour TESTER l'analyse IA : se mettre en plan `beta` OU ajouter son
  email dans l'env `TIQUIZ_SURVEY_AI_ALLOWLIST`.

### 📋 À REPRENDRE
1. **Multiprofils** : DESIGN backward-compat documenté plus bas (section
   "Multiprofils Tiquiz — DESIGN") + pitfall en tête de CLAUDE_PITFALLS.
   NON codé — à construire sans casser les quiz actifs existants.
2. **Plan premium** : brancher son slug dans `canUseSurveyAI` (et plus
   tard gate multiprofils) quand le pricing reprend.
3. **Pricing 19/190** (phase 6) : EN PAUSE.
4. **Templates V2** : 15+ modèles, A/B testing, auto-instanciation
   post-signup.
5. Retour Béné attendu sur templates + PDF.

---

## Contraintes business validées Béné (1er juin 2026)

- **Lifetime 57€ TERMINÉ** depuis longtemps. Plans actifs : Free /
  Monthly 9€ / Yearly 90€. Lifetime existants grandfathérés à vie.
- **Nouveau pricing à venir** : 19€/mois et 190€/an pour les futurs
  users uniquement. Abonnés actuels grandfathérés (9€/90€).
- **Pas de CTA "upgrade Tipote" dans Tiquiz** : Systeme.io a bloqué le
  whitelabel Tipote, donc impossible de vendre Tipote depuis Tiquiz pour
  l'instant. Garder archi compatible mais ne rien exposer côté UI.
- **Affiliate géré côté Systeme.io** : aucune mécanique financière
  côté Tiquiz.

---

## Phases Tiquiz (numérotation alignée avec Tipote)

### Phase 0 — Fondations `business_events`

Table générique de log + helper unique `logBusinessEvent()` + service
notifications. Cf. roadmap Tipote section 0 pour détails.

Kinds applicables Tiquiz : `lead_captured`, `quiz_view`, `quiz_start`,
`quiz_complete`, `quiz_share`, `quiz_published`, `popquiz_published`,
`account_connected`, `account_disconnected`.

### Phase 1 — Milestones Tiquiz

Catalogue spécifique :
- Premier quiz publié
- 10e, 50e, 100e, 500e, 1000e lead
- 100e, 1000e vue
- Premier partage capturé
- Premier popquiz publié
- 1 mois ancienneté, 3 mois, 6 mois, 1 an

Engine identique Tipote (table `user_milestones`, trigger
`evaluate_milestones`). Toasts + emails partageables.

### Phase 2 — Wall of Wins Tiquiz

Carte dashboard "Ce mois avec Tiquiz" : vues, complétions, partages,
leads, top quiz, milestones, vs période précédente. Email récap mensuel
1er du mois 9h locale.

**RÈGLE CARDINALE Béné (1er juin 2026)** : si la période ne contient
AUCUN résultat (0 lead, 0 partage, 0 vue, etc.), on **N'AFFICHE PAS**
la carte. Un dashboard "0 partout" démotive. À la place, état neutre
"Pas encore de chiffres, voici comment démarrer →" avec 1 CTA action.

### Phase 3 — Réengagement Tiquiz

Inactivité > 7j / > 14j / > 30j + détection "quiz à 0 vue depuis 14j".
Templates adaptés (proposer un quiz template métier, ouvrir le brainstorm
IA, etc.).

### Phase 5 — Templates par métier — V1 FAIT (juin 2026)

8 templates de quiz métier soignés (écrits à la main, ton humain, pas
"trop IA" — exigence Béné) :
- profil-entrepreneur (coach business)
- moteur-interieur (coach de vie)
- style-yoga (prof de yoga)
- terrain-naturo (naturopathe)
- pret-a-lancer-formation (formateur en ligne)
- levier-croissance-marketing (consultant marketing)
- style-photo (photographe)
- pret-premier-achat-immo (immobilier)

Archi : **données statiques TS** (`lib/templates/catalog.ts` + `types.ts`),
PAS de table DB (versionné, facile à éditer, zéro migration). Chaque
template a un `payload` qui calque EXACTEMENT la shape POST /api/quiz.

Instanciation : le bouton "Utiliser ce modèle" POST le payload vers
`/api/quiz` EXISTANT → zéro code d'INSERT custom, zéro divergence,
aucun risque pour les quiz existants. Au succès → redirection éditeur.

Galerie publique SEO :
- `/templates` : grille + filtre par métier (indexable, OG tags)
- `/templates/[slug]` : aperçu complet (intro + questions + résultats)
  + CTA. generateStaticParams pour le pré-rendu SEO. metadata par
  template.
- Non connecté → CTA renvoie vers /signup (acquisition).
- Connecté → instancie + édite.
- Entrée discrète depuis `/quiz/new` (bandeau, ne touche pas au form).

**Reste à faire (V2)** :
- A/B testing natif des titres/questions (5.C) — non commencé.
- Flux post-signup : auto-instancier le template choisi après
  inscription (V1 = le visiteur revient choisir manuellement).
- Plus de templates (objectif 15+) si V1 convertit bien.
- i18n : templates FR uniquement V1.

### Phase 6 — Nouveau pricing 19€/190€ futurs users

Colonne `profiles.pricing_grandfathered_at`, backfill `now()` au moment
du switch, nouveaux Price IDs Stripe, `/pricing` conditionnel.

### Phase 8 — Port complet (après stabilisation Tipote) — FAIT (juin 2026)

Port réalisé. Périmètre adapté à Tiquiz (mono-user, pas de mailer,
pas de ventes créateur) :

- ✅ **Phase 0** : `business_events` + `user_milestones` (migration
  `20260604_business_events_foundation.sql`, sans project_id). Helper
  `lib/businessEvents.ts` + `lib/businessOutcomes.ts` (lit quiz_leads /
  quiz_events / quizzes historiques, pas business_events seul).
- ✅ **Phase 1** : milestones Tiquiz (`lib/milestones/`) — quiz publiés,
  leads (1/10/100/1000), complétions (1/100/1000), partages (1/100),
  popquiz. Toast in-app via `<MilestoneToastListener />` (PAS d'email
  — Tiquiz n'a pas de mailer). API `/api/milestones/unseen` + `/seen`.
  Cron `/api/cron/backfill-milestones` (one-shot, auth Bearer).
- ✅ **Phase 2** : Wall of Wins (`components/dashboard/WallOfWins.tsx` +
  `/api/dashboard/wall-of-wins`) — leads / vues / complétions / partages
  + top quiz + milestones. Conditionnel "motivant ou rien". Accent
  primary (turquoise Tiquiz).
- ❌ **Phase 3 réengagement** : SKIP. Pas de mailer Tiquiz, et un nudge
  in-app ne ramène pas un user absent. Réactivable si Tiquiz ajoute un
  mailer Resend un jour.
- ❌ **Phase 4 coach proactif** : hors scope Tiquiz (pas de coach IA).

Branchements events (fire-and-forget, non bloquants) :
- `lead_captured` → `app/api/quiz/[quizId]/public/route.ts` (après
  upsert quiz_leads, y compris sondages anonymes pour les stats)
- `quiz_complete` + `quiz_share` → `app/api/quiz/[quizId]/track/route.ts`
- `quiz_share` server-side → `public/route.ts` PATCH (post-capture)

⚠️ À run en prod : migration `20260604_business_events_foundation.sql`
puis cron backfill `/api/cron/backfill-milestones`.

---

## Ordre d'exécution

Tipote en lead. On porte sur Tiquiz une fois chaque phase Tipote validée
en prod. Phase 5 (templates) et Phase 6 (pricing) peuvent être attaquées
directement sur Tiquiz, sans attendre Tipote — elles n'ont pas
d'équivalent côté Tipote.

Cf. `tipote-app/ROADMAP_RETENTION.md` pour le contexte complet.

---

## Chantier Sondages — export + analyse IA (juin 2026)

### Export résultats (CSV + PDF) — FAIT ✅
Route `GET /api/quiz/[id]/survey-results?format=csv|json` (owner-scoped).
- CSV : réponses brutes, 1 ligne/participant.
- PDF : rapport agrégé, généré client-side via jspdf (dynamic import).
Panneau `SurveyResultsPanel` monté dans le tab "trends" du sondage.

### Analyse IA des résultats — FAIT ✅ (gate à finaliser)
Route `GET|POST /api/quiz/[id]/survey-analysis`. Min 5 réponses.
- Sortie : ce que disent les résultats / à retenir / actions.
- Claude Opus 4.8 (contenu = meilleur Claude, Béné).
- Tiquiz n'a PAS de crédits → gate par PLAN via `canUseSurveyAI(plan)`
  (lib/planLimits). Stocké sur quizzes.survey_ai_analysis (re-runs
  gratuits).

⚠️ **RESTE À FAIRE quand le pricing reprend** :
- `canUseSurveyAI` n'autorise QUE le plan "beta" + une allowlist env
  (TIQUIZ_SURVEY_AI_ALLOWLIST) pour l'instant. Quand le plan premium
  (avec multiprofils) sortira, ajouter son slug dans `canUseSurveyAI`.
- Brancher le multiprofils (mentionné par Béné comme partie du même
  plan premium) — NON commencé.
- i18n : textes FR en dur dans SurveyResultsPanel (à externaliser si
  besoin EN).

⚠️ À run en prod : migration `20260605_survey_ai_analysis.sql`.

---

## Multiprofils Tiquiz — DESIGN (NON implémenté, juin 2026)

> Béné : "on ne crée pas encore les multiprofils, mais on commence à y
> penser pour le mettre en place sans tout casser pour les users actuels
> qui ont des quiz actifs."
>
> Tiquiz est aujourd'hui MONO-USER : `quizzes.user_id` uniquement, pas de
> `project_id` (contrairement à Tipote qui a le multi-projet Elite). Le
> risque n°1 en ajoutant les multiprofils = un filtre `project_id` qui
> MASQUE d'un coup tous les quiz existants (ils n'ont pas de projet).

### Invariant absolu à respecter le jour J

**Aucun user existant ne doit perdre la visibilité de ses quiz / sondages
/ popquiz / leads actifs.** Un quiz publié et embarqué sur un blog tiers
doit continuer à répondre exactement pareil. Zéro régression visiteur.

### Plan de migration sûr (à exécuter quand on construira la feature)

1. **Colonne nullable d'abord** : `ALTER TABLE quizzes ADD COLUMN
   IF NOT EXISTS project_id UUID` (NULL autorisé). Idem sur toute table
   scopée par user qui devra l'être (popquizzes, business_events,
   user_milestones, etc.). NULL = "projet par défaut".
   → À ce stade, RIEN ne change pour personne (colonne ignorée partout).

2. **Table `projects`** (id, user_id, name, is_default, created_at).
   Migration de données : pour CHAQUE user existant, créer 1 projet
   `is_default = true` nommé p.ex. "Mon espace".

3. **Backfill** : `UPDATE quizzes SET project_id = <default project du
   user> WHERE project_id IS NULL` (idem autres tables). Après backfill,
   plus aucun NULL → on peut filtrer sans rien masquer.
   ⚠️ Le backfill DOIT tourner AVANT d'activer le moindre filtre UI.

4. **Lecture tolérante pendant la transition** : tant que le backfill
   n'est pas 100% garanti, le filtre doit être
   `project_id = :active OR project_id IS NULL` quand `:active` est le
   projet par défaut. (Filet ceinture-bretelles : un quiz oublié au
   backfill reste visible dans le projet par défaut, jamais perdu.)

5. **Sélecteur de projet UI** : le projet par défaut est pré-sélectionné.
   Un user qui n'a jamais créé de 2e projet ne voit AUCUN changement
   (un seul projet = pas de switcher visible, ou switcher inerte).

6. **Routes publiques INCHANGÉES** : `/q/[id]`, `/p/[slug]` résolvent par
   quiz id/slug, JAMAIS par projet. Un visiteur ne sait pas ce qu'est un
   projet. Le `project_id` ne sert QU'au scoping dashboard créateur.
   → Garantit zéro impact sur les quiz embarqués existants.

7. **business_events / milestones / Wall of Wins** : aujourd'hui scopés
   user_id seul côté Tiquiz. Le jour du multiprofils, soit on garde
   l'agrégation au niveau user (tous projets confondus) — plus simple et
   sans risque — soit on ajoute un filtre projet optionnel. Décision à
   prendre à ce moment ; par défaut : agrégation user-level conservée.

### Gate produit

Le multiprofils Tiquiz est lié au plan premium (même palier que l'analyse
IA des sondages, cf. `canUseSurveyAI`). Réutiliser le même mécanisme de
gate plan. NE PAS l'ouvrir aux plans actuels.

### Ce qui est DÉJÀ prêt côté Tipote (à copier le moment venu)

Tipote a déjà le multi-projet (`business_profiles.project_id`,
`getActiveProjectId`, `ProjectSwitcher`). Le port Tiquiz s'inspirera de
cette archi éprouvée plutôt que de réinventer.
