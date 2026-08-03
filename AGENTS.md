<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Anti-IA writing — JAMAIS de tiret long (drame 7 juin 2026)

Béné a une règle absolue dans tout le contenu user-visible (i18n
messages, copy UI, descriptions) : **aucun em-dash `—` ni en-dash `–`**.
Ces caractères sont une signature stylistique des LLM qui trahit
immédiatement le texte généré par IA et casse la crédibilité.

À utiliser à la place :
- Bullets : `-` (hyphen simple)
- Parenthèse stylistique : `,` ou `:` ou `(...)`
- Pause forte : `.` (nouvelle phrase)
- Plage : `à` ou `-` simple

Scan rapide avant tout commit qui touche au contenu user-visible :
```bash
grep -rn "—\|–" messages
```
Doit retourner ZÉRO ligne. Sinon, `sed -i 's/—/-/g; s/–/-/g' fichier`.

Cette règle s'applique aux contenus USER-VISIBLE uniquement. Les
commentaires de code peuvent en contenir, le user ne les voit jamais.
<!-- END:nextjs-agent-rules -->

## Distribution par résultat — RÈGLE UNIQUE (drame Gwenn 8 juin 2026)

Tout endroit qui affiche la distribution des leads par résultat de quiz
DOIT suivre cette règle exacte. La répétition de bugs (entrées
dupliquées, résultats oubliés, anciens noms) vient TOUJOURS d'une
ré-implémentation partielle qui zappe une étape.

**Citation Béné 8 juin :** "je veux que mes users voient leur quiz
EXISTANT, en temps réel, pas des anciennes versions ou des versions
tronquées." → source de vérité = `quiz_results` actuel.

**Algorithme obligatoire :**
1. **SEED** `byTitle` avec TOUS les profils actuels de `quiz_results`,
   `count = 0` inclus (pas de filtre zero). Source de vérité.
2. Pour chaque lead, tenter d'attribuer à un profil current :
   - via `result_id` → `quiz_results.title` LIVE (suit les renames)
   - sinon via le snapshot `result_title` SI ce titre existe encore
     dans `currentTitles`
   - **sinon : on EXCLUT silencieusement** (orphan / ancien nom après
     rename / profil supprimé). Pas de bucket "Anciens profils" affiché.
3. Le dénominateur des `%` = somme des leads MATCHÉS (pas `leads.length`),
   pour que les pourcentages affichés somment exactement à 100%.
4. Sort par count desc.

**Endroits à respecter (Tiquiz) :**
- `app/api/quiz/[quizId]/analytics/route.ts` — donut page Analytics
- `components/quiz/QuizResultsAnalytics.tsx` — donut dans l'éditeur quiz
- Toute nouvelle UI qui affiche des compteurs par résultat

**Endroits à respecter (Tipote) :**
- `app/api/quiz/[quizId]/analytics/route.ts` — utilise `leads.quiz_result_id`
  (migration 20260607_leads_quiz_result_id.sql) + fallback `quiz_result_title`
- `components/quiz/QuizResultsAnalytics.tsx` — lit depuis `quiz_leads`
  (table dédiée, déjà `result_id` + `result_title`)
- `app/api/quiz/[quizId]/public/route.ts` (capture) DOIT écrire
  ET `quiz_result_id` ET `quiz_result_title`

**Anti-patterns INTERDITS :**
- Ne PAS seeder avec `quiz_results` actuels → profils à 0 lead absents.
- Afficher un bucket "Anciens profils" ou "Sans résultat" → bruit visuel
  que Béné refuse.
- Calculer le `%` sur `leads.length` au lieu de `matchedTotal` → la
  somme ne fait pas 100% quand il y a des orphans exclus.
- `groupBy(result_title)` sans match au titre LIVE → anciens noms
  apparaissent en double après rename.

## Funnel par question - RÈGLE UNIQUE (drame Adeline 1er août 2026)

Tout affichage "où décrochent les répondants" DOIT être recalé sur la
liste ACTUELLE des questions, jamais sur les seuls events.

Adeline supprime sa 10e question. Les lignes de `quiz_question_events`
gardent `question_index = 9`, et la RPC `quiz_question_funnel_detail`
liste les index PRÉSENTS DANS LES EVENTS. Résultat : une "Question 10"
fantôme, une "pire chute : 59% Q9 -> Q10" qui désigne une question
supprimée, et un "restés jusqu'au bout" calculé sur elle.

**Algorithme obligatoire :** passer par `buildLiveFunnel()`
(`lib/quiz/funnel.ts`), qui :
1. SEED les étapes sur les questions actuelles (0 à count-1) ;
2. exclut les index >= count (questions supprimées) et les compte dans
   `removedQuestions`, que l'UI affiche honnêtement ;
3. marque `hasData: false` les questions vivantes sans event (ajoutées
   après coup) : l'UI montre "pas encore de donnée", jamais "0 visiteur",
   et ces étapes sont exclues du calcul de la pire chute ;
4. `reachedLastQuestion()` pour "restés jusqu'au bout" : la dernière
   question QUI A de la donnée.

Fail-open : si le nombre de questions est inconnu (0), on renvoie les
lignes brutes. Mieux vaut la donnée telle quelle qu'un écran vide.

**Endroits à respecter :** `app/api/stats/route.ts`,
`app/api/quiz/[quizId]/analytics/route.ts`, `lib/quiz/insights.ts`
(l'IA commentait la question fantôme), `app/stats/StatsShell.tsx`,
`components/quiz/QuizAnalyticsClient.tsx`.

Même famille : `app/api/quiz/[quizId]/aggregate-responses/route.ts`
borne les totaux visiteur aux questions ET aux options vivantes, sinon
les pourcentages ne font plus 100.

## Identité stable des questions - RÈGLE UNIQUE (1er août 2026)

Le recalage sur les questions vivantes (section ci-dessus) supprime la
question fantôme mais ne réaligne rien : une question supprimée ou
insérée AU MILIEU décale les index de tout l'historique postérieur. La
correction définitive est l'identité stable, et elle tient en 3 pièces.
Les trois sont obligatoires, en zapper une remet le bug.

**1. `quiz_questions.id` est DURABLE.** Le PATCH `/api/quiz/[quizId]`
fait UPDATE des lignes déjà connues, INSERT des nouvelles, DELETE de
celles que l'éditeur ne renvoie plus (exactement comme `quiz_results`).
Il ne fait PLUS `delete().eq("quiz_id")` + `insert(all)`, qui régénérait
tous les ids à chaque sauvegarde.
-> Corollaire : **tout éditeur DOIT renvoyer `id` dans le payload
`questions`** (`QuizDetailClient`, `SurveyDetailClient`). Sans l'id,
la question est traitée comme nouvelle et perd son historique.

**2. Ce qu'on écrit porte l'id.**
- `quiz_question_events.question_id` (route `/track`, le viewer envoie
  `questionId`) ;
- `quiz_leads.answers[].question_id` (le viewer envoie `question_id`
  dans chaque réponse).
L'index reste écrit à côté : c'est le repli des lignes historiques.
L'INSERT du `/track` retombe sur la version sans `question_id` si la
colonne n'existe pas encore en prod (jamais de tracking perdu en
silence, cf. drame `quiz_events.meta`).

**3. Tout lecteur traduit l'id en POSITION ACTUELLE** via
`lib/quiz/questionIdentity.ts` :
- `buildQuestionPositions(questions)` -> Map id -> position ;
- `resolveQuestionPosition(ref, positions, count)` -> position ou null ;
- `indexAnswersByPosition(answers, positions, count)` -> Map position ->
  réponse.
Ordre de résolution : `question_id` connu -> position actuelle ; id
inconnu -> question supprimée, on EXCLUT ; pas d'id -> on garde l'index
tant qu'il désigne une question vivante. Fail-open si la structure est
inconnue (0 question) : on renvoie l'index brut.

Côté SQL, les RPC font la même traduction (`left join` sur
`question_id`, `row_number()` pour la position) et renvoient une **ligne
sentinelle `question_index = -1`** dont `views` porte le nombre de
questions disparues. `buildLiveFunnel()` la lit et la transforme en
`removedQuestions`, que l'UI affiche honnêtement.

**Tri de référence : `order by sort_order, id`.** Les RPC l'utilisent ;
les requêtes JS qui construisent des positions doivent l'utiliser aussi
(`.order("sort_order").order("id")`), sinon deux lecteurs peuvent
calculer des positions différentes en cas d'égalité de `sort_order`.

**Anti-patterns INTERDITS :**
- `answers.find(a => a.question_index === qIdx)` : c'est exactement le
  bug. Passer par `indexAnswersByPosition`.
- Un éditeur qui renvoie `questions` sans `id`.
- Un nouveau lecteur d'`answers` qui n'importe pas
  `lib/quiz/questionIdentity.ts`.

**Endroits à respecter (Tiquiz) :** `app/api/quiz/[quizId]/route.ts`
(PATCH), `app/api/quiz/[quizId]/track/route.ts`,
`components/quiz/PublicQuizClient.tsx`, `QuizDetailClient.tsx`,
`SurveyDetailClient.tsx`, `QuizResultsAnalytics.tsx`, `SurveyTrends.tsx`,
`lib/survey/format.ts`, `lib/survey/analysis.ts`,
`app/api/quiz/[quizId]/survey-results/route.ts`,
`app/api/quiz/[quizId]/public/route.ts` (tags SIO par réponse),
`supabase/migrations/20260801_question_identity.sql`.
Le module quiz de Tipote est jumeau : toute correction ici doit être
portée là-bas, et réciproquement.

## Réponses sans options - à ne pas oublier (retour Jocelyne 1er août 2026)

`free_text`, `rating_scale` et `star_rating` n'ont pas d'options. Toute
synthèse par question qui ne compte que `option_index` / `option_indices`
les fait DISPARAÎTRE de l'écran (leur `totalAnswered` reste à 0), alors
que les réponses sont bien en base dans `quiz_leads.answers[].text` /
`.rating` / `.stars`. Traiter les trois familles :
- options -> compteur par option (existant) ;
- texte libre -> la liste des réponses écrites + un bouton Copier ;
- échelle -> répartition des notes + moyenne.

## Fichier env sur le serveur prod — À NE PAS CONFONDRE (drame 3 juin 2026)

Sur le serveur prod, **les deux apps utilisent `.env`** (pas `.env.local`).
`.env.local` est une convention de DEV Next.js uniquement.

| Repo | Sur prod (à sourcer pour le shell) | En dev local |
|---|---|---|
| `~/tipote-app/` | **`.env`** | `.env.local` |
| `~/tiquiz-app/` | **`.env`** | `.env.local` |

Pour avoir `CRON_SECRET` (et toutes les autres vars) dans le shell :
```bash
cd ~/tiquiz-app && set -a; . .env; set +a
echo "CRON_SECRET = '$CRON_SECRET'"   # doit afficher une valeur, pas ''
```

## Workflow Git — RÈGLE ABSOLUE

**Avant TOUT push, lire `CLAUDE_WORKFLOW.md`.**

Résumé : je ne pousse JAMAIS sur `main`. Je pousse uniquement sur la
branche `claude/busy-wright-501xR`. Béné est seule maître de
`main` côté GitHub.

## URLs canoniques prod — À NE PAS INVENTER (drame 3 juin 2026)

J'ai pondu `https://www.tipote.fr/tiquiz/api/cron/...` dans un curl alors
que c'était faux. À mémoriser une fois pour toutes :

| Domaine | Sert | Exemples |
|---|---|---|
| `https://quiz.tipote.com/` | App Tiquiz (dashboard authentifié) | `/admin`, `/api/cron/...` |
| `https://www.tipote.fr/tiquiz` | Sales hub Tiquiz (Systeme.io) | — |
| `https://www.tipote.fr/tiquiz/affiliation` | Page affiliation Tiquiz + Atelier (explique, puis renvoie vers `affiliate.tipote.com`) | — |
| `https://www.tipote.fr/tiquiz-mensuel` etc. | Pages plan Tiquiz spécifiques | `-gratuit`, `-mensuel`, `-mensuel-plus`, `-annuel`, `-annuel-plus` |
| `https://app.tipote.com/` | App Tipote (dashboard authentifié) | `/admin`, `/api/cron/...` |
| `https://www.tipote.fr/` | Sales pages Tipote (Systeme.io) | `/commande`, `/elite` |
| `https://affiliate.tipote.com/` | Dashboard affilié (sous-domaine Tipote) | `/trial-tiquiz`, `/promouvoir` |

**Erreurs typiques à éviter** :
- ❌ `tipote.fr/tiquiz/api/...` (n'existe pas — Tiquiz est sur `quiz.tipote.com`)
- ❌ `tipote.fr/tiquiz/dashboard` (idem)
- ❌ `tipote.fr/tiquiz/commande` (la page d'accueil de vente est `tipote.fr/tiquiz` tout court)

## Migrations SQL — ALERTE OBLIGATOIRE (drame 2 juin 2026)

**Dès que je touche `supabase/migrations/*.sql`** (création OU
modification), mon message final à Béné DOIT contenir un bloc visuellement
visible :

```
🚨 MIGRATION À APPLIQUER SUR SUPABASE
   Fichier(s) : supabase/migrations/<YYYYMMDD_xxx>.sql
   Étapes : Studio → SQL Editor → coller le contenu → Run
   Vérification : npm run check:migrations-pending  (doit passer ✓)
```

Pourquoi non négociable :
- 18 mai → 2 juin 2026 : `quiz_events.meta` jamais appliquée sur Tiquiz →
  TOUTES les vues, starts, completes ont été perdues silencieusement
  pendant 15 jours. Stats fausses sur TOUS les quizzes.
- 2 juin matin : `quizzes.survey_thanks_*` jamais appliquée sur Tipote →
  TOUS les quiz publics ont retourné 404. App offline ~2h.
- 2 juin midi : table `quiz_events` entièrement absente sur Tipote
  (migration `20260521_tracking_foundation` jamais appliquée). Aucune
  stat depuis le lancement Tipote.

**Garde-fou auto** : `npm run check:migrations-pending` parse tous les
`.sql` du repo et liste ce qui manque en prod (sans intervention manuelle
nécessaire — contrairement à `check:schema` qui exige une liste
hand-curated). À lancer après chaque déploiement.

## vexp <!-- vexp v1.3.11 -->

**MANDATORY: use `run_pipeline` — do NOT grep or glob the codebase.**
vexp returns pre-indexed, graph-ranked context in a single call.

### Workflow
1. `run_pipeline` with your task description — ALWAYS FIRST (replaces all other tools)
2. Make targeted changes based on the context returned
3. `run_pipeline` again only if you need more context

### Available MCP tools
- `run_pipeline` — **PRIMARY TOOL**. Runs capsule + impact + memory in 1 call.
  Auto-detects intent. Includes file content. Example: `run_pipeline({ "task": "fix auth bug" })`
- `get_context_capsule` — lightweight, for simple questions only
- `get_impact_graph` — impact analysis of a specific symbol
- `search_logic_flow` — execution paths between functions
- `get_skeleton` — compact file structure
- `index_status` — indexing status
- `get_session_context` — recall observations from sessions
- `search_memory` — cross-session search
- `save_observation` — persist insights (prefer run_pipeline's observation param)

### Agentic search
- Do NOT use built-in file search, grep, or codebase indexing — always call `run_pipeline` first
- If you spawn sub-agents or background tasks, pass them the context from `run_pipeline`
  rather than letting them search the codebase independently

### Smart Features
Intent auto-detection, hybrid ranking, session memory, auto-expanding budget.

### Multi-Repo
`run_pipeline` auto-queries all indexed repos. Use `repos: ["alias"]` to scope. Run `index_status` to see aliases.
<!-- /vexp -->

## Claude personal notes — pitfalls + conventions

**Avant de coder, lire `CLAUDE_PITFALLS.md` (pense-bête perso).**
Bugs récurrents identifiés + conventions implicites à respecter pour
ne pas casser l'existant. Ce fichier doit être mis à jour quand un
bug remonte plusieurs fois.

**Pour les chantiers rétention en cours : lire `ROADMAP_RETENTION.md`**
(audit Béné du 1er juin 2026 — phases 0 à 8). Contraintes business
Tiquiz (pricing 19/190 pour futurs users, lifetime 57€ terminé, pas de
bridge Tipote, affiliate géré SIO) listées en fin du pitfalls.

Checklist minimum :
- Migration SQL → `IF NOT EXISTS` + `NOTIFY pgrst, 'reload schema';` en fin.
- Nouvelle colonne sur `quizzes` → 7 endroits à toucher (cf. section A du pitfalls).
- Storage upload → bucket `public-assets`, path `<topic>/<auth.uid()>/<file>`.
- Image visiteur → `w-full h-auto`, jamais `max-h-* object-cover`.
- `RichTextEdit` Dialogs → rendre dans LES DEUX branches (editing + display).
- i18n namespace → **Tiquiz `quizEditor`**, **Tipote `quizDetail`**. Vérifier.
- `extractResultLabel(cleanPlaceholdersForLabel(text))` pour les labels admin.
- Compteurs `quizzes.*_count` auto-bumpés par trigger → ne JAMAIS UPDATE direct.
- Endpoints `/track` retournent 200 toujours (`{ok: false, reason}` pour soft fail).
- Typecheck `npx tsc --noEmit` avant chaque commit, exit 0 obligatoire.

## Tests visuels AVANT push — RÈGLE (demande Béné 27 juillet 2026)

Pour TOUT changement qui touche au design ou à l'UX (viewer public,
layouts, branding, CSS, composants d'écran), lancer AUTOMATIQUEMENT le
filet visuel avant de committer, sans que Béné ait à le demander :

```bash
npm run test:visual            # doit passer 90/90
```

- Échec = un layout a bougé sans intention -> corriger AVANT de pousser.
- Changement de design VOULU -> `npm run test:visual:update` puis
  committer les nouvelles références AVEC le changement.
- Le harness : `playwright.visual.config.ts` + `tests/visual/` + page
  fixture `/visual-test` (gated `VISUAL_TEST=1`, aucune base requise).
- Couverture : 5 dispositions x 6 écrans (intro, question, capture, bonus, résultat, résultat scoring multi-axes) x 3 viewports (desktop, écran
  haut, mobile). Si une nouvelle disposition/écran apparaît, AJOUTER le
  cas à la matrice du spec.
- Origine : footer devenu 3e colonne en split + carte collée en haut sur
  écrans hauts, jamais vus avant la prod. Plus jamais ça.

## Taille de police d'un champ : UNE seule enveloppe (drame Jocelyne 1er août 2026)

La taille de police au niveau du champ vit dans un `<div
class="rt-field-fs" style="--rt-fs-m: Xpx; --rt-fs-d: Ypx">` qui
enveloppe tout le contenu (cf. `RichTextEdit`, section dual-device).

**Le piège :** le navigateur restructure le contenu d'un `contentEditable`
à la moindre commande. Aligner, coller, appuyer sur Entrée enveloppe le
bloc dans un `<div>`, et l'enveloppe de taille n'est alors PLUS enfant
direct du champ. Le code cherchait `:scope > .rt-field-fs` : il ne la
trouvait plus, en créait une SECONDE par-dessus, et comme la plus
profonde porte sa propre variable CSS, c'est ELLE qui gagne. Résultat :
le menu affiche la nouvelle taille, l'écran garde l'ancienne, et
l'utilisatrice conclut que le bouton ne marche pas. Reproduit sur la 6e
réponse d'une question de Jocelyne, celle qu'elle avait centrée.

**Règle :** `applyFieldFontSize()` cherche les enveloppes PARTOUT dans le
champ (`querySelectorAll`), reprend les tailles de la **plus profonde**
(celle qui gagne en CSS, donc celle que l'utilisatrice voit), les retire
TOUTES, puis en recrée UNE SEULE en enfant direct. Un `<div>` qui
n'existait que pour porter la taille est déballé ; un `<div>` qui porte
autre chose (un alignement) est conservé tel quel. Effet de bord voulu :
un champ déjà cassé se répare tout seul au premier clic sur une taille.

**Ne jamais** revenir à un `:scope >` ni supposer que le DOM d'un
contentEditable ressemble à ce qu'on y a écrit. Le module Tipote est
jumeau : toute correction ici se porte là-bas.

## Quiz scoré : les contrôles "profil" ne s'appliquent PAS (drame Véronique 1er août 2026)

Deux mécaniques d'attribution du résultat coexistent, et elles ne se
mélangent jamais :

| Mode | Le résultat est choisi par | Ce qui compte sur l'option |
|---|---|---|
| profils (défaut) | `option.result_index` le plus voté | `result_index` |
| scoring | la TRANCHE `[min_score, max_score]` | `points` |

En scoring, `result_index` ne veut rien dire. Or deux analyses de
l'éditeur sont bâties dessus :
- `resultCoverage` ("combien de questions mènent à ce résultat") ;
- `tieAnalysis` (ex-æquo entre profils).

Sur un quiz scoré, elles répondaient zéro pour tout le monde, d'où le
bandeau rouge **"Ce résultat ne peut jamais être attribué"** sur un quiz
parfaitement fonctionnel : Véronique testait, obtenait le bon résultat,
et voyait quand même l'alerte. Deux jours perdus, et un bouton
"Rééquilibrer avec l'IA" qui aurait réécrit des `result_index` inutiles.

**Règle : les deux analyses sortent en `ok` / vide dès que
`quiz.mode === "scoring"`.** Le contrôle équivalent en scoring existe
déjà et lui est correct : `trancheCoverage` (trous et chevauchements
entre les tranches, comparés à la plage réellement atteignable via
`computeReachableRange`).

**Avant d'ajouter un contrôle de cohérence sur les résultats**, se
demander de quelle mécanique il parle, et le gater sur `isScoring`. Le
module Tipote est jumeau : toute correction ici se porte là-bas.

## Filet de tests logique : OBLIGATOIRE avant push (1er août 2026)

Trois bugs de suite sont partis en prod sous les yeux de vraies
clientes : le funnel fantôme d'Adeline, la taille de police de Jocelyne,
la fausse alerte de Véronique. Aucun n'était une faute de frappe. Tous
les trois sont le MÊME défaut :

> une logique écrite pour un cas est appliquée telle quelle à un autre,
> et rien ne le contredit avant que la cliente ne le découvre.

- Adeline : un index positionnel appliqué à un historique dont la
  structure a bougé.
- Jocelyne : un `:scope >` appliqué à un DOM que le navigateur a
  restructuré.
- Véronique : une analyse "profils" appliquée à un quiz scoré.

Le filet visuel ne pouvait rien voir : il photographie le viewer public,
alors que ces trois bugs vivent dans des fonctions.

**La règle :**

```bash
npm run test:logic     # runner natif Node, ~1s, aucune dependance
npm run test:visual    # 90/90, uniquement si le design/UX bouge
npx tsc --noEmit       # exit 0
```

`npm run test:logic` tourne AVANT chaque push, sans exception et sans
qu'on le demande. Les tests vivent dans `tests/logic/*.test.mts` et
portent le nom de la cliente et ce qu'elle a vu : un test rouge, c'est
une cliente qui va perdre confiance.

**Corollaire, plus important que les tests eux-mêmes :** une logique
enfermée dans un composant React n'est pas testable, donc elle n'est pas
testée. Toute règle métier (cohérence, statistiques, manipulation DOM,
conversion de format) sort dans `lib/` en fonction pure, et le composant
se contente de l'appeler. C'est ce qui a été fait pour
`lib/quizCoherence.ts` et `lib/richTextFieldSize.ts`.

**Et quand un cas a deux mécaniques, la mécanique est un PARAMÈTRE
OBLIGATOIRE**, pas une variable devinée à l'intérieur (cf.
`analyzeResultCoverage(mode, ...)`). On ne peut plus appeler la fonction
sans avoir dit de quoi on parle : c'est la seule protection qui survit
au prochain qui touchera au fichier.

**Un test qui clignote est pire que pas de test.** Le 1er août, une
capture visuelle est sortie rouge puis verte au retry (hauteur de page
pas encore stable). Corrigé à la source par `settle()` dans le spec :
on attend que la hauteur du document ne bouge plus, au lieu d'un
`waitForTimeout` qui dépend de la charge machine.

## Flèche retour = hiérarchie, jamais l'historique (drame Gwenn 1er août 2026)

Gwenn clique sur les stats depuis Mes projets. La flèche des stats la
ramène sur le quiz, la flèche du quiz la ramène sur les stats. "Et je
tourne en boucle entre les deux, sans pouvoir en sortir."

La page stats pointait EN DUR vers l'éditeur ; l'éditeur faisait
`router.back()`, donc revenait aux stats. `router.back()` n'est pas une
hiérarchie, c'est un historique : il renvoie là d'où on vient, y compris
vers un écran qui renverra ici. Deux écrans qui se citent l'un l'autre =
cycle, et la seule sortie (le bouton retour du navigateur) rejoue la
même boucle.

**Règle :** la flèche retour d'un écran de projet passe par
`projectBackHref()` (`lib/nav/projectBack.ts`) et remonte à Mes projets.
La navigation LATÉRALE (stats <-> éditeur) existe toujours, mais par un
lien nommé ("Modifier"), jamais par la flèche.

**INTERDIT :** `router.back()` sur une flèche retour, et une destination
qui dépend du referrer ou de `window.history`. Le test
`tests/logic/project-navigation.test.mts` remonte de parent en parent et
exige que ça s'arrête : un futur écran qui recréerait un cycle le fait
rougir avant la cliente.

## "Ne pas afficher le score" (retour Véronique 1er août 2026)

Véronique décoche tout en mode Score, et le pourcentage reste affiché.
Deux causes, les deux dans la même famille que les drames précédents :
une combinaison de réglages relue à trois endroits du viewer.

1. Sans jauge, la page affichait `X / Y` **et** une ligne de
   pourcentage, alors que le panneau promet "à la place du simple texte
   X / Y".
2. Le sélecteur d'affichage était gaté par `showScoreGauge ||
   scoringAxesEdit.length > 0` : sans jauge ni axes, elle n'avait
   AUCUN contrôle.

**Règle :** la décision vit dans `resolveScoreDisplay(mode, showGauge)`
et `resolveAxisScoreDisplay(mode)` (`lib/quizScoring.ts`), jamais dans
le JSX. `score_display_mode` vaut `"percent" | "label" | "hidden"`
(pas de migration : la colonne existait). `"hidden"` retire le score
GLOBAL et les barres d'axes ; les axes restent éditables (ils alimentent
les variables `{score_axe}` et les tags Systeme.io).

Le module Tipote est jumeau : toute correction ici se porte là-bas.

## Boutons de partage : les réseaux cochés, ou TOUS (retour Béné 1er août 2026)

Deux problèmes distincts, sur le même bouton.

**1. "Partager mes résultats ne déclenche rien."** Le bouton appelait
`navigator.share`, absent des navigateurs desktop, retombait sur un
`navigator.clipboard.writeText`, et TOUT échec était avalé par un
`catch {}` silencieux. Sur desktop, au mieux un toast discret, au pire
rien du tout. Il ouvre maintenant un panneau de boutons par réseau,
comme l'écran bonus le faisait déjà.

**2. Le repli oubliait 4 réseaux sur 9.** La liste par défaut était
codée en dur à deux endroits :
`["x", "facebook", "linkedin", "whatsapp", "threads"]`. Une créatrice
qui ne cochait AUCUN réseau (le cas par défaut) privait ses visiteurs
d'Instagram, Pinterest, Reddit et email sans le savoir.

**Règle :** `resolveShareNetworks()` (`lib/quiz/shareNetworks.ts`), une
seule fonction testée pour tous les écrans. Sélection non vide -> elle,
dans SON ordre. Rien de coché, colonne nulle, valeur illisible -> TOUS
les réseaux (`ALLOWED_SHARE_NETWORKS`). Une sélection qui ne contient
que des réseaux inconnus retombe sur tous, jamais sur zéro bouton.
L'aperçu de l'éditeur passe par la MÊME fonction, sinon il ment.

**Ne pas ré-écrire de liste de réseaux en dur**, nulle part, y compris
dans un aperçu. C'est comme ça que le bug est né.

L'URL partagée depuis l'écran de résultat est celle du profil obtenu
(`?rp=`) : `getShareData` / `shareOn` / `copyShareLink` prennent un
`urlOverride`. Instagram, qui n'a pas d'URL de partage web, copie ce
même lien (pas celui du quiz).

Le partage de fin de quiz reste désactivable : `show_result_share`,
toggle "Afficher le bouton de partage" dans l'éditeur.

## Un lien envoyé par email pointe sur NOTRE domaine (drame Véronique 2 août 2026)

"Je demande un nouveau mot de passe, je clique sur le bouton, et
j'arrive sur `localhost n'autorise pas la connexion`. Bref, je tourne en
rond. PS : je n'ai pas de proxy et pas de pare-feu."

Elle avait raison sur toute la ligne : le lien lui demandait vraiment
d'ouvrir un serveur sur SA machine.

**Pourquoi.** Le lien reçu portait
`redirect_to=http://localhost:3000/auth/callback`. Ce n'était pas un
repli de Supabase : c'est NOUS qui l'avions écrit. En prod,
`NEXT_PUBLIC_APP_URL` vaut `http://localhost:3000`, et le code faisait
`process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com"`. Un `??`
ne protège que du MANQUANT, jamais du FAUX : une variable présente et
absurde traverse tout.

**Et ça ne concernait pas que le mot de passe.** La même variable est lue
partout : retours de paiement, emails de notification de réponse, liens
d'invitation revendeur, emails d'essai Plus, webhook Systeme.io. Tout ce
qui en sortait pointait sur la machine de celui qui recevait le message.

**Règle : on n'envoie jamais le lien Supabase.** On envoie le nôtre,
construit avec `properties.hashed_token` :
`${APP_URL}/auth/callback?token_hash=...&type=recovery`. `/auth/callback`
consomme le jeton lui-même (`verifyOtp`). Plus de liste blanche, plus de
Site URL entre l'utilisatrice et son compte.

**Règle : plus AUCUNE lecture directe de `NEXT_PUBLIC_APP_URL` ni de
`NEXT_PUBLIC_SITE_URL`.** Tout passe par `resolveAppUrl()` /
`resolvePublicUrl()` (`lib/authLinks.ts`), qui refusent toute adresse
locale (localhost, 127.x, ::1, .local) et retombent sur l'origine de la
requête, puis sur le domaine canonique du contexte. Un `.env` de prod
mal renseigné ne peut plus rien casser.

**Le `??` avec une valeur par défaut est un faux garde-fou** : il ne
couvre que la variable absente. Quand une variable a une valeur
INTERDITE, il faut la valider, pas lui donner un défaut. Côté client, `window.location.origin`
remplace `process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"` :
le domaine où l'utilisatrice navigue vraiment.

**Restent dépendants de la config Supabase** (rien à faire côté code) :
les emails que Supabase envoie lui-même, c'est à dire le lien magique et
la confirmation d'inscription. Vérifier dans le dashboard que le Site
URL est `https://quiz.tipote.com` et que les Redirect URLs contiennent
`https://quiz.tipote.com/auth/callback`.

## Profil ou score : c'est LA décision qui bloque (Véronique 2 août 2026)

Véronique a construit un quiz scoré alors qu'elle voulait des profils.
Elle a cherché pendant deux jours pourquoi "ça ne collait pas", et c'est
le coach qui a fini par lui dire. Il n'y avait aucun bug : le mauvais
mode avait été choisi à la première seconde, et rien ne l'avait alertée.

Les deux libellés parlaient produit, pas usage : "score sur 100, jauge,
axes, résultats par tranches" ne veut rien dire pour une débutante.
Ils parlent maintenant du QUESTIONNEMENT :

- profil -> **qui es-tu ?** (le plus courant)
- score  -> **où en es-tu ?**

Sous les deux cartes, une phrase donne le critère, une autre rassure
(tout reste modifiable), et un lien mène à quelqu'un qui répond : le
coach de l'Atelier pour celles qui l'ont (`useAtelierStatus`), le support
pour les autres. **Proposer un coach auquel on n'a pas accès est pire que
ne rien proposer** : c'est pour ça que rien ne s'affiche tant que le
statut n'est pas connu.

## Mode scoring : le visiteur ne doit JAMAIS voir une page vide

Trouvé en auditant le scoring. Le viewer faisait
`ranges.find(...) ?? null` : un score qui tombe dans un TROU entre deux
tranches, ou un quiz dont aucun résultat n'a de tranche (le cas d'une
débutante qui n'a pas encore touché aux bornes), donnait
`resultProfile = null`. Tout l'écran de résultat étant en
`resultProfile?.`, le visiteur répondait à tout, laissait son email, et
arrivait sur une page sans titre, sans texte, sans bouton. En silence.

**Règle : `pickScoringResultIndex()` (`lib/quizScoring.ts`) rend toujours
un résultat dès qu'il en existe un.** Tranche qui contient le score,
sinon la tranche la plus proche, sinon le premier résultat.
`analyzeTrancheCoverage` reste là pour prévenir la créatrice : il
l'avertit, il ne sauve pas le visiteur.

**Et poser des tranches est un calcul, pas une décision de créatrice.**
La plage de points atteignable est affichée en permanence (plus seulement
quand quelque chose cloche), et un bouton "Répartir les tranches" découpe
la plage en tranches contiguës via `splitRangeIntoTranches()`, la MÊME
fonction que la finalisation d'un quiz généré par l'IA.

## Un `ok: false` produit TOUJOURS quelque chose à l'écran (3 août 2026)

Béné supprime un projet : rien. Elle recommence : rien. La seule trace
était un `400` nu dans la console du navigateur, et elle a fini par se
demander si le quiz n'était pas supprimé côté serveur et réaffiché par
erreur. Il ne l'était pas.

Deux fautes empilées, et la deuxième est la plus grave :

1. `popquiz_cues.quiz_id` référence `quizzes(id)` en **ON DELETE
   RESTRICT** : un quiz réutilisé comme question dans une vidéo
   interactive ne PEUT pas être supprimé. C'est voulu, et la migration le
   disait : "the editor will surface a warning instead". L'éditeur n'a
   jamais rien affiché.
2. Le client faisait `if (data.ok) { retirer de la liste }` et **rien**
   dans le cas contraire. Le `catch` ne couvrait que la panne réseau. Un
   refus du serveur était donc, à l'écran, indiscernable d'un clic qui
   n'a pas pris.

**Règle : une réponse `ok: false` DOIT produire un message visible.** Un
échec silencieux coûte plus cher que le bug qu'il masque, parce qu'il
envoie l'utilisatrice chercher au mauvais endroit.

**Règle : un refus n'est pas une panne.** `classifyDeleteError()`
(`lib/quizDelete.ts`) traduit l'erreur Postgres en raison exploitable ;
la route répond **409** (l'état des données s'y oppose) et jamais 400
(qui laissait croire à une requête malformée), avec un `reason` que le
client traduit et le nom des vidéos qui retiennent le quiz. Le serveur
renvoie la RAISON, jamais la phrase : l'interface existe en 7 langues.

## Le chrome d'édition n'hérite jamais de l'aperçu (drame Jocelyne 3 août 2026)

"Je voudrais grossir les polices sur les boutons, mais ce n'est pas
possible, menu déroulant vide."

Le menu n'était pas vide : il s'ouvrait avec ses 11 tailles, écrites en
BLANC sur un panneau BLANC. L'éditeur est du WYSIWYG, donc la toolbar de
`RichTextEdit` vit DANS l'aperçu, donc à l'intérieur du
`<button class="text-white">` du CTA. Les entrées du menu n'avaient
aucune classe de couleur : elles héritaient du blanc. Seul l'en-tête, qui
porte `text-muted-foreground`, restait visible : un menu avec un titre et
rien dessous. Et ça n'arrivait QUE sur les boutons, les seuls endroits où
l'aperçu force une couleur de texte.

**Règle : la classe `rt-chrome` (globals.css) est posée à la RACINE de
tout élément de chrome rendu dans l'aperçu** (toolbar, popovers, barre
d'image). Elle neutralise les propriétés HÉRITÉES (couleur, taille,
graisse, casse, interlettrage, alignement) : les descendants qui
imposent la leur gagnent comme avant, ceux qui n'imposent rien
retrouvent des valeurs saines.

**Ne pas recolorer un menu à la fois** : le prochain popover ajouté à la
toolbar ramènerait le bug. Et **ne pas utiliser `--foreground`** : le
`<main>` de l'aperçu le réécrit avec la couleur de texte du quiz, ce qui
rejouerait exactement le bug pour toute créatrice ayant choisi un texte
clair. D'où la variable dédiée `--rt-chrome-fg`, définie en clair ET en
sombre.

Le filet visuel ne pouvait rien voir : il photographie le viewer public,
pas l'éditeur. Le garde-fou est `tests/logic/editor-chrome.test.mts`.

## Moins de réponses que de profils (escalade Véronique 3 août 2026)

"Configuration 2 axes croisés pour 4 profils. Comme il n'y a que 3
réponses possibles par question et 4 résultats, forcément ça déconne."

Elle a raison. En mode profils, une voix ne peut venir que d'une option
portant le `result_index` du profil. Une question à 3 réponses ne peut
voter que pour 3 profils sur 4 : à cette question, le 4e est hors course.
Répété sur tout le quiz, ça donne le bandeau rouge "Ce résultat ne peut
jamais être attribué".

Trois corrections, et les trois comptent :

1. **À la source.** Le prompt de génération demande désormais, en mode
   profils, EXACTEMENT `resultCount` options par question de choix, avec
   les `resultCount` result_index apparaissant chacun UNE fois. Une
   réponse par profil, c'est le design naturel d'un quiz de profil.
2. **Nommer la cause.** `analyzeOptionSupply(mode, questions, count)`
   (`lib/quizCoherence.ts`) détecte le cas, et l'alerte dit qu'il MANQUE
   des réponses. "Ajuste les options ou demande à l'IA de rééquilibrer"
   était vrai mais indevinable : déplacer un `result_index` d'un profil
   vers un autre laisse toujours un profil découvert.
3. **Rendre l'action capable.** `/rebalance` ne savait que DÉPLACER des
   `result_index`. Il renvoie maintenant aussi des `additions` (nouvelles
   réponses rédigées dans la langue et le ton de la question), validées
   côté serveur : jamais plus d'une réponse par profil, jamais un doublon
   d'une réponse existante, jamais sur une question déjà complète.

**Il n'ajoute JAMAIS de question**, et ce n'est pas un oubli : le nombre
de questions est une décision de la créatrice, pas un trou à combler.

Comme toujours, `analyzeOptionSupply` est gaté sur le mode : en scoring,
`result_index` ne veut rien dire (cf. le drame du 1er août). `yes_no` et
les types sans options (`free_text`, `rating_scale`, `star_rating`) sont
exclus : deux réponses ou zéro réponse, c'est leur principe, pas un
manque.
