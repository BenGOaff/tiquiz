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

| Repo | Fichier sur prod | En dev local |
|---|---|---|
| `~/tipote-app/` | **`.env`** | `.env.local` |
| `~/tiquiz-app/` | **`.env`** | `.env.local` |

**Et le `.env` se lit DANS UNE PARENTHÈSE, jamais dans le shell nu.**
Cette page recommandait l'inverse jusqu'au 22 août, et ça a mis les deux
apps par terre (section "Un shell qui garde le `.env` de l'autre app").

```bash
# Bon : la parenthèse est un sous-shell, tout meurt avec elle.
( set -a; . ~/tiquiz-app/.env; set +a; curl -sS -H "X-Cron-Secret: $CRON_SECRET" https://quiz.tipote.com/api/cron/... )

# Juste vérifier qu'une variable existe, sans l'afficher :
grep -c '^CRON_SECRET=' ~/tiquiz-app/.env      # 1 = présente
```

**INTERDIT : `set -a; . .env; set +a` sans parenthèses**, et à plus forte
raison dans un terminal qui servira ensuite à un `npm run build` ou à un
`pm2 restart --update-env`.

## Workflow Git — RÈGLE ABSOLUE

**Avant TOUT push, lire `CLAUDE_WORKFLOW.md`.**

Résumé : je ne pousse JAMAIS sur `main`. Je pousse uniquement sur la
branche de travail **indiquée dans la consigne de session**. Ce nom
CHANGE à chaque session : ne jamais recopier celui trouvé dans un
fichier, il y est forcément périmé. Béné est seule maître de `main`
côté GitHub.

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
npm run test:visual            # doit passer 99/99
```

- Échec = un layout a bougé sans intention -> corriger AVANT de pousser.
- Changement de design VOULU -> `npm run test:visual:update` puis
  committer les nouvelles références AVEC le changement.
- Le harness : `playwright.visual.config.ts` + `tests/visual/` + page
  fixture `/visual-test` (gated `VISUAL_TEST=1`, aucune base requise).
- Couverture, **99 tests** (mesuré le 23 août, pas déduit) :
  - **90 CAPTURES** : 5 dispositions x 6 écrans (intro, question, capture,
    bonus, résultat, résultat scoring multi-axes) x 3 viewports (desktop,
    écran haut, mobile). Si une nouvelle disposition/écran apparaît,
    AJOUTER le cas à la matrice du spec.
  - **9 MESURES DE BORDS** : `intro-bounds.spec.ts` (2 alignements x 3
    viewports) et `result-beats-bounds.spec.ts` (1 x 3). Elles mesurent
    des boîtes au lieu de les photographier, parce qu'une capture ne voit
    pas un bord qui bouge quand le texte se coupe au même mot (drame du
    sous-titre, 3 août).
  - Le chiffre "90/90" a traîné ici jusqu'au 23 août : il comptait les
    captures, pas les tests. Un nombre faux dans une consigne fait douter
    d'un vert légitime.
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
npm run test:visual    # 99/99, uniquement si le design/UX bouge
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

## Titre et sous-titre partagent UN bord, calculé UNE fois (drame Béné 3 août 2026)

"Je ne comprends pas pourquoi il y a toujours ce décalage entre le titre
et le sous-titre. On a déjà parlé de ça mille fois et ça n'a pas été
corrigé. Je veux juste que si j'aligne mon texte à gauche, le titre et le
sous-titre commencent au même endroit à gauche, je ne veux pas de
décalage par défaut."

Le "mille fois" est la vraie information. Le décalage venait d'un
`max-w-xl mx-auto` écrit en dur sur le sous-titre : `max-w-xl` borne la
longueur de ligne (utile, il reste), mais `mx-auto` CENTRE le bloc quoi
qu'il arrive. Tant que le titre est centré, invisible. Dès qu'elle aligne
son titre à gauche, le titre part du bord et le sous-titre reste centré,
donc commence plus à droite.

Et si ça n'avait jamais été corrigé partout, c'est que la règle
n'existait nulle part : elle était réécrite en ternaires dans chaque
écran de chaque composant. Le viewer avait été corrigé, l'éditeur non.
L'écran de question avait été corrigé, l'écran d'accueil non. Chaque
passage en oubliait un, donc le bug revenait.

**Règle : `lib/quiz/textAlign.ts`, et personne ne réécrit de ternaire
d'alignement.**

- `resolveBlockAlign(ownHtml, titleHtml, layout)` : son propre alignement
  -> celui du TITRE -> la disposition. Le titre sert de référence parce
  que c'est lui qui donne le ton de l'écran ; l'alignement propre du bloc
  passe devant parce qu'aligner le sous-titre exprès est un choix.
- `alignTextClass` / `alignBlockMarginClass` / `alignJustifyClass` pour
  le texte, la marge du bloc (JAMAIS `mx-auto` en dur) et les conteneurs
  flex (logo, bouton).
- `richTextAlign` renvoie `null` quand la créatrice n'a jamais touché à
  l'alignement du champ. Ce null n'est pas un détail : sans lui, un champ
  jamais aligné imposerait la gauche et recasserait tous les quiz
  centrés.

**Endroits à respecter :** `PublicQuizClient.tsx` (écran d'accueil),
`QuizDetailClient.tsx` et `SurveyDetailClient.tsx` (aperçu d'accueil).
Exception assumée : en disposition "couverture" (image plein écran), le
viewer centre tout sans condition, et l'aperçu fait pareil.

**INTERDIT :** `mx-auto` sur un bloc de texte de l'écran d'accueil, et
tout `align === "center" ? … : …` recopié dans un composant. Le test
`tests/logic/intro-align.test.mts` fige la règle.

Corollaire général, déjà vrai pour les réseaux de partage et le score :
**quand l'aperçu de l'éditeur recalcule une décision au lieu d'appeler la
même fonction que le viewer, il finit toujours par mentir.**

## La page de résultat suit les 4 temps de l'Atelier (3 août 2026)

Béné : "je voudrais retravailler la page résultat des quiz pour intégrer
cette logique : le miroir, la cause, le chemin, le pont. Comme ça on met
Tiquiz raccord avec ce qui est enseigné dans l'Atelier, ce qui n'est pas
le cas avec la présentation actuelle."

Le décalage était réel, et il ne venait pas d'un manque de champs : trois
des quatre temps existaient DÉJÀ en base, sous des noms produit qui ne
disaient pas à quoi ils servent.

| Temps | Champ | Ce qu'il fait |
|---|---|---|
| le miroir | `title` + `description` | il se reconnaît, donc il continue à lire |
| la cause | `insight` (+ `insight_heading`) | ce qui bloque vraiment, souvent autre chose que ce qu'il croyait |
| le chemin | `projection` (+ `projection_heading`) | les étapes, il voit que c'est faisable |
| le pont | `bridge` (+ `bridge_heading`) **nouveau** | l'offre comme suite logique, pas comme une pub |

Ce qui manquait vraiment, c'était le PONT (`cta_text` est le libellé du
bouton, 3 à 6 mots : il ne peut pas porter de bénéfices) et surtout
l'INTENTION : le prompt ne disait nulle part que ces blocs forment une
progression, donc l'IA écrivait quatre paragraphes interchangeables.

**Règle : `lib/quiz/resultBeats.ts` décide, personne d'autre.**
`buildResultBeats()` dit quels blocs, dans quel ordre, avec quel titre ;
`beatShell()` dit à quoi ils ressemblent. Le viewer public ET l'aperçu de
l'éditeur appellent les deux. Un aperçu qui recalcule l'allure du viewer
finit toujours par mentir (les réseaux de partage, le score, l'alignement
du sous-titre : trois fois le même bug).

**Règle : `quizzes.result_layout` porte la garantie "on ne touche pas aux
quiz existants".** Défaut `'classic'` en base, et `resultLayoutMode()` ne
renvoie `'beats'` que sur la valeur explicite. Colonne absente, valeur
inconnue, migration pas encore passée : page historique. Un quiz naît en
`'beats'` uniquement quand le contenu reçu porte VRAIMENT un pont
(`hasBridgeContent`), donc jamais sur un import ni une création manuelle.

**Le visuel : AUCUNE décoration qui prenne de la place horizontale.**
Il a fallu trois passages pour y arriver, et les trois échecs disent la
même chose. Bloc plein à la couleur de marque -> "l'encart est tout pété,
il monte presque sur le menu de gauche" ET "il est de la même couleur que
les boutons, ça entraîne de la confusion". Filet vertical + `pl-4` ->
"tous les morceaux du milieu sont décalés vers la droite : c'est si
compliqué de tout aligner partout sur les mêmes marges ??"

Non, ça ne l'est pas, et c'est nous qui l'avions compliqué : **une
décoration à gauche DÉPLACE forcément ce qu'elle décore.** Les temps se
distinguent donc par leur TITRE (couleur de marque, gras) et par le
rythme vertical. Le pont, dernier temps, prend un filet HORIZONTAL au
dessus de lui : il se voit et il ne décale rien.

**INTERDIT sur ces blocs : `pl-*`, `px-*`, `border-l-*`, `mx-*`.** Le
test `tests/visual/result-beats-bounds.spec.ts` mesure le bord gauche du
titre du profil ET de chaque temps, et exige qu'ils soient identiques à
1px près. Comparer les temps ENTRE EUX ne suffisait pas : ils étaient
parfaitement alignés... 20px à droite du titre, ce que Béné a vu tout de
suite.

**Images :** `quiz_results.beat_media` (JSONB) porte une image PAR temps,
avec `mode: "with" | "only"` ("only" = l'image remplace le texte).
Sanitizé par `sanitizeBeatMedia()` : ce champ finit dans un `<img src>`
public, donc jamais écrit brut.

**Le vocabulaire de la méthode ne sort JAMAIS côté visiteur.** "miroir",
"cause", "chemin", "pont" vivent dans l'aide de l'éditeur et dans le
prompt, pas dans le texte produit. Le prompt l'interdit explicitement :
sinon le visiteur lit le squelette au lieu du message.

## Les titres générés s'inspirent des ressources, sans les recopier (3 août 2026)

Béné : "ce serait pas mal aussi d'upgrader la qualité des titres et sous
titres générés par l'IA, pour le moment ils sont pas ouf. Peut être en
lui demandant de s'inspirer des 104 hooks."

`lib/prompts/quiz/copywriting.ts` distille `copywriting-claude/` (104
hooks, triggers psychologiques, puces promesses) en MÉCANIQUES, pas en
accroches à recopier. Coller les 104 lignes coûterait des tokens à chaque
génération et, surtout, produirait des quiz qui se ressemblent tous : un
modèle à qui on donne une liste finie recopie la liste.

Deux blocs, ajoutés au prompt existant sans y toucher par ailleurs :
`HOOK_CRAFT_BLOCK` (7 mécaniques d'accroche + déclencheurs + règles de
forme) et `RESULT_BEATS_BLOCK` (les 4 temps). Le reste du prompt de
génération, qui fonctionne bien, est inchangé.

## Le logo n'est pas un bloc de texte (retour Béné 3 août 2026)

"Si je centre mon titre à gauche, il centre aussi le logo : on doit
pouvoir centrer, aligner à gauche ou à droite le logo indépendamment du
titre ET on doit aussi pouvoir l'agrandir et le rétrécir comme pour les
gif et les images."

En calant tout l'écran d'accueil sur le bord du titre (correctif de la
veille), on avait réglé un décalage et créé une contrainte : le logo
n'avait plus de vie propre. Beaucoup de marques le veulent centré au
dessus d'un titre aligné à gauche.

**Règle : `lib/quiz/introLayout.ts`.** `resolveLogoAlign(setting,
titleAlign)` et `logoRender(align, widthPct)` décident, le viewer ET
l'aperçu appellent les deux. `brand_logo_align` vaut `'auto'` par défaut
(= suit le titre, comportement d'avant), `brand_logo_width` vaut NULL
(= `max-h-16 w-auto`, la taille d'avant). Aucun quiz existant ne bouge.

## Titre et sous-titre : la borne est sur le CONTENEUR, jamais sur un champ

Deuxième passage de Béné sur le même écran : "pourquoi la case du sous
titre est plus courte que celle du titre ?? Elle a une marge à droite que
le titre n'a pas."

Le `mx-auto` avait été retiré la veille, mais pas le `max-w-xl` posé à
côté. Le titre vivait dans un conteneur `max-w-2xl` (42rem), le
sous-titre portait EN PLUS sa propre borne à 36rem. **Mesuré avant
correction : titre 672px (bord droit 1056), sous-titre 576px (bord droit
960).** Tant que tout est centré les 96px se répartissent et ça ne se
voit pas ; aligné à gauche, ça saute aux yeux, et aucun réglage ne
pouvait le rattraper puisque la borne était en dur.

**Règle : la largeur du bloc d'accueil vit sur le CONTENEUR COMMUN**
(`intro_text_width`, NULL = pleine largeur), réglable à la poignée (le
même mécanisme que la largeur des colonnes du split, qu'elle a demandé
nommément). Le bloc est positionné par le TITRE pour les deux champs ;
l'alignement propre du sous-titre pilote SON TEXTE, pas la position de sa
boîte. **INTERDIT : tout `max-w-*` ou `mx-auto` sur le titre ou le
sous-titre de l'accueil.**

**Le filet de captures ne pouvait pas le voir**, et c'est la leçon
principale : le sous-titre de la fixture se coupait au même mot à 576px
et à 672px, donc les pixels étaient identiques alors que les bords ne
l'étaient pas. Les 90 captures sont passées au vert pendant tout le bug.
Le garde-fou est `tests/visual/intro-bounds.spec.ts`, qui MESURE les
boîtes au lieu de les photographier.

## Liste ou colonnes : l'aperçu ignorait le réglage (retour Béné 3 août 2026)

"Le WYSIWYG de la présentation sous forme de liste ou de colonnes des
réponses ne fonctionne pas : j'ai choisi liste et je vois toujours mes
colonnes c'est PAS bon."

Le viewer public lisait bien `answer_layout`. C'est l'APERÇU qui avait sa
propre règle écrite en dur, sans aucune trace du réglage :

```
q.options.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
```

Cocher "Liste" ne pouvait donc rien changer à l'écran. Et même en "Auto",
les deux côtés comptaient les options à des endroits différents.

**Règle : `lib/quiz/answerLayout.ts`.** `resolveAnswerLayout(quizLayout,
questionOverride)` puis `answerGridClass(layout, count, {stacked})`. Le
`stacked` sert l'aperçu mobile : le canvas y est étroit mais le VIEWPORT
ne l'est pas, donc les classes `sm:` resteraient actives et montreraient
deux colonnes que le visiteur ne verra jamais (même piège que le split).

Quatrième fois que le même défaut sort, après les réseaux de partage,
l'affichage du score et l'alignement du sous-titre. **Quand l'aperçu
recalcule une décision au lieu d'appeler la fonction du viewer, il finit
toujours par mentir.**

## Le sous-titre du quiz dit un BÉNÉFICE, jamais la fiche technique (retour Béné 3 août 2026)

"À chaque fois, l'IA génère un truc comme ça dans le sous titre du quiz :
'9 questions, un diagnostic, un truc concret à faire ce soir.' Franchement
on s'en fout du nombre de questions."

**La cause n'était pas la ligne qu'on croit.** Aucune consigne ne demandait
le nombre de questions. Le problème était l'inverse : rien ne disait ce
que le sous-titre DOIT contenir. Les deux seules mentions étaient
"accrocher en 1-2 phrases" et "texte d'intro engageant". À un modèle à qui
on demande d'être "engageant" sans dire sur quoi, il ne reste que les
faits du brief, et `NOMBRE DE QUESTIONS : 9` y est écrit. Il recopiait la
fiche technique faute de mieux.

**Règle : `introSubtitleBlock()` (`lib/prompts/quiz/copywriting.ts`)**,
branché sur la génération ET sur l'import (Béné a vu le problème sur les
deux). Bénéfice pour le visiteur, verbe d'ouverture ("Découvre pourquoi",
"Regarde si tu", "Apprends comment"), durée, et le bonus du créateur
quand il existe.

**La DURÉE est voulue, le NOMBRE DE QUESTIONS est interdit.** Les deux se
ressemblent et les confondre referait le bug dans l'autre sens : la durée
lève une objection ("ça me prend combien de temps ?"), le nombre de
questions ne dit rien au visiteur. La durée est CALCULÉE
(`estimateQuizMinutes`, ~20 s par question) et non laissée au modèle,
sinon il annonce 5 minutes sur un quiz de 3 questions.

## Un prompt est du CODE : il se teste (3 août 2026)

En relisant `lib/prompts/quiz/system.ts` pour le retour ci-dessus, trois
incohérences y vivaient sans que personne les voie :

1. un **tiret cadratin dans le gabarit de sortie** (`"Nom du profil — LE
   MIROIR"`), dans un prompt qui bannit les tirets cadratins dix lignes
   plus haut. On montrait au modèle exactement ce qu'on lui interdit ;
2. l'**exemple d'options contredisait sa propre règle** : `result_index`
   0 deux fois alors que la consigne dit "chacun UNE fois". C'est le cas
   exact qui a fait remonter Véronique (un profil jamais attribuable) ;
3. `FORMAT : Quiz COURT (3 à 5 questions)` **et** `NOMBRE DE QUESTIONS :
   9`, dans le même prompt.

**Règle : `tests/logic/quiz-prompt.test.mts`.** Un prompt produit une
sortie et régresse en silence quand on le retouche : il se teste comme le
reste. Les assertions portent sur ce qui compte (la règle est présente,
le gabarit n'a pas d'em-dash, les `result_index` de l'exemple sont
distincts, aucune fourchette ne contredit le compte demandé).

Pour que ce soit possible, `npm run test:logic` résout maintenant l'alias
`@/` (`tests/logic/register-alias.mjs`). Sans ça, tout module qui importe
`@/lib/...` restait hors de portée du runner natif, donc non testé, donc
exactement là où les bugs s'installent.

## Une nouveauté qu'on ne montre pas n'existe pas (retour Jocelyne 3 août 2026)

"Elle veut profiter des dernières améliorations mais c'est pas possible sur
un quiz existant. Elle l'a dupliqué pour en profiter, mais ça n'a pas
marché."

Trois choses vraies dans cette phrase, et une fausse.

**Faux : "c'est pas possible sur un quiz existant".** La page en 4 temps
s'active sur n'importe quel quiz, l'interrupteur existait déjà. Il vivait
dans la colonne de réglages, parmi quinze autres, donc personne ne le
trouvait. Une nouveauté qu'on ne montre pas n'existe pas pour la
créatrice, et elle finit par bricoler autour.

**Vrai : dupliquer ne pouvait rien donner.** La duplication est FIDÈLE par
construction (`select("*")` + liste noire de colonnes non copiables dans
`app/api/quiz/[quizId]/duplicate/route.ts`). Elle copie donc aussi
`result_layout = 'classic'` et l'absence de pont : la copie reproduit
exactement la page de l'original. C'est le comportement voulu, pas un bug,
mais c'est un cul-de-sac pour qui espère "repartir à neuf".

**Corollaire sur la duplication :** elle est à l'épreuve du futur. Toute
nouvelle colonne de `quizzes`, `quiz_questions` ou `quiz_results` est
copiée automatiquement. Ne JAMAIS la réécrire en liste blanche : chaque
colonne oubliée deviendrait une perte silencieuse à la copie.

**Règle : toute fonctionnalité gatée par une colonne à défaut historique
doit avoir un repère dans l'éditeur.** Ici, un bandeau au dessus des
profils de résultat, visible uniquement quand `result_layout === 'classic'`,
avec un bouton qui bascule et une phrase qui dit que c'est réversible et
sans effet sur les autres quiz. Écarté = mémorisé en `localStorage` par
quiz (une préférence d'affichage ne mérite ni colonne ni migration), lu
APRÈS le montage pour ne pas casser l'hydratation.

## Typographie française : liste NOIRE, et l'espace s'INSÈRE (3 août 2026)

Béné : "en français on laisse un espace entre un mot et des guillemets, ou
un mot et un point d'interrogation. Là ça n'est plus le cas. Ce genre de
petits détails est chiant et long à corriger, on peut se l'éviter ?"

Oui, mais pas en recorrigeant : en retirant les DEUX causes.

**Cause 1 : la règle ne faisait que CONVERTIR une espace déjà présente.**
`Prêt ?` devenait `Prêt<nbsp>?` ; `Prêt?` restait `Prêt?`. Or un modèle de
langue écrit très souvent le français sans l'espace, donc tout le contenu
généré arrivait fautif et le restait après n'importe quel nombre de
sauvegardes. `fixFragment` INSÈRE désormais l'espace manquante.

**Cause 2 : elle n'était appliquée qu'à la MISE À JOUR, sur une liste
blanche de colonnes.** La CRÉATION (génération IA, import) n'appliquait
RIEN. Et une liste blanche oublie toute colonne ajoutée après elle : c'est
la mécanique même du "problème qui revient".

**Règle : `applyFrenchTypographyDeep(payload, locale)` au SEUL point
d'entrée**, sur `POST /api/quiz` (avant toute lecture du corps) et sur le
PATCH. Liste NOIRE de noms de champs + garde sur la FORME de la valeur.
Un champ nouveau est couvert d'office. **Les deux listes blanches ont été
supprimées, pas vidées : ne pas les réintroduire.**

**Insérer est plus dangereux que convertir**, d'où les gardes, tous
testés : on n'insère que devant une ponctuation qui TERMINE (suivie d'une
espace, d'une fermeture ou de la fin). Ça protège le `?` d'une query
(`a?b=1`), le `:` d'un schéma (`https://`), les heures (`12:30`), le CSS
(`color:red`). Le `:` exige en plus une LETTRE devant, jamais un chiffre.
`applyFrenchTypographyToHtml` découpe sur les balises ET les entités :
sans ça, `&nbsp;` deviendrait `&nbsp ;`.

**Aucune autre langue n'est touchée** (`isFrenchLocale`), c'est testé pour
les 7 locales.

## L'URL de l'Atelier vit à UN endroit (drame Béné 3 août 2026)

"J'ai voulu rebasculer de Tipote à Tiquiz sur l'Atelier et ça a foiré.
J'ai bien la demande d'autorisation de connexion mais derrière je tombe
sur la page d'erreur."

Le consentement marchait. C'est le RETOUR qui tombait dans le vide :
`app/api/partner/authorize/route.ts` renvoyait vers
`formaquiz.tipote.com`, hostname mort depuis le rebrand "quizing" du 18
juin. Vérifié le jour même : ce domaine répond **404**, quand
`quizing.tipote.com` répond bien.

**C'était la deuxième moitié d'un drame à moitié corrigé.** Le rebrand
avait déjà cassé l'ALLER (`lib/integrations/tiquiz.ts` côté Atelier
pointait vers `/connect/quizing`, inexistant). On avait réparé l'aller
sans voir que le RETOUR portait la même adresse périmée, à l'autre bout de
la chaîne et dans l'autre repo. **Une URL écrite en dur à deux endroits
ne se corrige jamais qu'à moitié.**

**Règle : `lib/partner/atelierUrl.ts`.** `ATELIER_BASE_URL` et
`atelierConnectCallback()` y vivent seuls. Le retour reste FIXE (jamais lu
depuis la requête : ce serait une redirection ouverte, donc un vol de code
d'autorisation possible), mais la surcharge `FORMAQUIZ_CONNECT_CALLBACK`
est VALIDÉE : une valeur vide ou non-https retombe sur le domaine
canonique. Un `??` seul ne protège que de la variable absente, jamais de
la variable fausse. `tests/logic/atelier-callback.test.mts` interdit le
retour de l'ancien hostname.

## Une chute dans le funnel : sur QUI, et sur QUELLE question (drame Jocelyne 4 août 2026)

"J'avais une question sur laquelle il y avait vraiment une chute. À chaque
fois que je changeais quelque chose sur les conseils du robot, ça restait
bloqué dessus. Reformuler les quatre réponses, reformuler la question,
remettre les réponses dans un autre ordre : j'ai tout fait, j'attendais
trois quatre nouvelles personnes, même problème. Il m'a carrément
conseillé de l'enlever, je l'ai enlevée, et ça continue à bloquer au même
endroit, la question 7." Puis, le lendemain : "mon premier quiz a 15
questions et globalement tous les gens qui le commencent le terminent."

Ce n'était donc pas la longueur, et il n'y avait aucune question qui
bloque. Trois défauts empilés, du plus grave au moins grave.

**1. ON DÉSIGNAIT LA MAUVAISE QUESTION.** `views` d'une étape = les
sessions qui ont AFFICHÉ cette question (`question_view` part au rendu).
Quelqu'un qui abandonne entre la Q6 et la Q7 a donc vu la Q6 et jamais la
Q7 : **il s'est arrêté SUR la Q6**. Le bandeau annonçait "Question 7 fait
perdre X%, c'est le point chaud à reformuler en priorité". Jocelyne a
réécrit, réordonné puis supprimé une question que les partants n'avaient
jamais lue, et quand elle l'a supprimée l'ancienne Q8 a pris sa place :
le bandeau a redésigné "la 7". Aucune de ses corrections ne POUVAIT
produire d'effet.

**2. AUCUN SEUIL D'ÉCHANTILLON.** L'alerte partait à 15% de perte quel que
soit le nombre de personnes. Sur une étape atteinte par 8 visiteurs, UNE
personne vaut 12,5%. Et comme le pourcentage se calcule sur l'effectif
précédent, qui fond à mesure qu'on avance, l'alerte **dérive
mécaniquement vers la fin du quiz** sans rien devoir au contenu. Sur la
page Mes stats, le badge rouge sortait dès 1% de perte, sans aucun seuil.

**3. ON N'AFFICHAIT PAS CE QU'ON AVAIT.** Chaque étape porte `views` ET
`answers`. Vu sans réponse = il bute SUR la question (trop intime, pas
comprise, blocage technique) ; répondu puis parti = fatigue, et
reformuler ne sert à rien. Deux corrections opposées, aucune des deux
affichée.

**Règle : `lib/quiz/funnelSignal.ts` décide, personne d'autre.**
`readFunnelSignal(steps)` rend `no-data | too-few | steady | hotspot`,
et le hotspot porte la question qu'ils ont VUE (`questionIndex`), celle
qu'ils n'ont jamais atteinte (`neverReachedIndex`), la perte EN
PERSONNES, et la forme (`on-question` / `after-answer`). Seuils :
`MIN_SAMPLE = 20` (une personne ne peut plus à elle seule franchir les
15%), `MIN_LOST = 5` (en dessous on commente des individus),
`MIN_DROP_PCT = 15` (inchangé). `stepLoss()` porte la perte sur la
question qui la SUBIT, avec le nombre de personnes à côté du %.

**Endroits à respecter :** `components/quiz/QuizAnalyticsClient.tsx`,
`app/stats/StatsShell.tsx` (+ `answers` transmis par
`app/api/stats/route.ts`), `lib/quiz/insights.ts` (bloc VERDICT DU FUNNEL
calculé AVANT l'appel), `lib/insights/global.ts`, et le coach de
l'Atelier (`lib/coach/knowledge.ts`, bloc STATS_READING_RULES).

**Sur les prompts :** à un modèle qui reçoit une liste de pourcentages et
pour consigne "nomme le point de fuite prioritaire", il reste toujours un
maximum à nommer, même sur trois visiteurs. **La retenue ne s'obtient pas
en la demandant, elle s'obtient en calculant le verdict AVANT** et en le
lui donnant comme non négociable.

**Deux phrases obligatoires partout où on montre un funnel :**
- perdre du monde est NORMAL et SAIN, ce sont d'abord les visiteurs non
  qualifiés, aucun quiz ne vise 100% de complétion (sinon chaque départ
  se lit comme une faute et la créatrice réécrit un quiz qui va bien) ;
- une seule modification à la fois, puis 20 à 30 nouvelles réponses avant
  de juger.

**Et le partage n'est pas un levier universel.** Sur un sujet intime ou
stigmatisant (santé, santé mentale, neuroatypie, argent, poids,
sexualité, famille), partager publiquement revient à s'exposer : un taux
de partage bas n'y est ni un défaut du quiz ni un cadeau trop faible.
Jocelyne l'avait diagnostiqué seule, les prompts le disent maintenant.

Le module quiz de Tipote est jumeau : toute correction ici se porte
là-bas.

## Le mot "quiz" n'est plus interdit comme adresse (retour Béné 4 août 2026)

"On ne peut pas blacklister le mot 'quiz' parce que beaucoup vont
l'utiliser. C'est LOGIQUE !" Elle a raison, et la liste en interdisait une
vingtaine du même genre : dashboard, stats, leads, settings, login...

Ils n'étaient pas là pour la protéger. `RESERVED_PUBLIC_SLUGS` servait
DEUX choses à la fois : "ce slug masquerait une de nos pages" et "ce
chemin ne doit pas être servi sur le domaine d'une cliente". Le second est
déjà réglé, et mieux, par la porte du middleware : sur un domaine perso,
tout ce qui n'est pas explicitement autorisé répond 404.

Restait un vrai risque : `example.com/quiz` était résolu par le routeur
Next, et **une route statique gagne toujours contre une route
dynamique**. D'où la correction : le middleware RÉÉCRIT le slug nu vers
`/s/<slug>` (`app/s/[publicSlug]/page.tsx`), un chemin qui n'est pas une
page de l'app. Plus d'arbitrage à rendre, donc plus de mots à interdire.
L'URL vue par le visiteur ne change pas.

`routeTenantPath()` (`lib/publicSlug.ts`) est la fonction pure qui décide
`pass | slug | block`, testée par `tests/logic/tenant-routing.test.mts`
sur les deux moitiés : tous les mots naturels sont rendus, et aucune de
nos pages ne fuite. Il ne reste réservé que `api` ; `_next`,
`.well-known` et les fichiers à extension sont déjà impossibles puisque
`sanitizeSlug` n'accepte que `[a-z0-9-]`.

**INTERDIT :** rallonger `RESERVED_PUBLIC_SLUGS` avec un nom de route de
l'app. Si une nouvelle page apparaît, elle est déjà protégée par la porte
du middleware.

## Alignement : trois étages, et le plus fort doit pouvoir se taire (4 août 2026)

Béné : "tu empiles les trucs, ça devient n'importe quoi l'éditeur. Il faut
laisser le choix de TOUT aligner / centrer OU de modifier : une question
où les réponses sont centrées, la suivante alignée à gauche, ou même une
question en colonnes et une en liste. MAIS faut le faire BIEN."

Le "tu empiles" est le diagnostic exact. Il n'y avait qu'un étage assumé
(le réglage du quiz) et un étage CLANDESTIN : l'alignement écrit dans le
texte riche, qui gagne pour toujours dès qu'on a cliqué une fois sur un
bouton d'alignement. Jocelyne s'est retrouvée avec un quiz "centré" dont
elle réalignait les champs un par un, sans pouvoir revenir en arrière
autrement qu'en les reprenant tous.

**Règle : `lib/quiz/questionLayout.ts`, trois étages, du plus fort au plus
faible.**

1. le champ : l'alignement posé à la main dans le texte riche ;
2. la question : `quiz_questions.config.align` (nouveau) ;
3. le quiz : `question_layout`.

`"inherit"` n'est PAS une valeur d'affichage, c'est "je ne me prononce
pas", et c'est le défaut de tout ce qui existe. Aucun quiz en ligne ne
bouge. Pas de migration : `config` est déjà du JSONB.

**Et le retour en arrière doit être aussi facile que l'aller.**
`clearRichTextAlign()` + le bouton "Tout réaligner sur ce réglage"
retirent les exceptions des questions ET les alignements écrits dans les
champs (en conservant gras, couleurs, tailles). Sans lui, "tout centrer"
ne centrerait rien du tout sur un quiz déjà bricolé : c'est exactement ce
que Jocelyne a vécu, et c'est ce qui permet d'appliquer le réglage à un
quiz DÉJÀ EN LIGNE sans le refaire.

La disposition des réponses suit le même modèle
(`config.answer_layout`, déjà lu par le viewer depuis juillet).

**Endroits à respecter :** `PublicQuizClient.tsx` (écran de question),
`QuizDetailClient.tsx` (aperçu + contrôles). L'aperçu appelle
`resolveQuestionAlign`, jamais un ternaire recopié : sixième fois que ce
défaut sort. Test : `tests/logic/question-layout.test.mts`.

## L'image d'une réponse garde SON format (retour Béné 4 août 2026)

"Adapte la place de l'image au format de la photo, là elles sont
tronquées dans les réponses et c'est pourri."

Les vignettes étaient en `aspect-video object-cover` : la boîte imposait
son 16/9 et recadrait la photo dedans, coupant le haut des titres.

**La règle existait déjà**, écrite en tête de `PublicQuizClient` : "w-full
h-auto par défaut, jamais de `max-h-*` / `object-cover`". Elle était
contredite soixante lignes plus bas, à QUATRE endroits (les deux branches
du viewer, les deux aperçus d'éditeur). **Une règle écrite en commentaire
n'est pas une règle** : elle vit maintenant dans
`lib/quiz/answerImage.ts`, et les quatre appellent `answerImageRender()`.

Corollaire visuel : deux photos de formats différents donnent deux cartes
de hauteurs différentes. C'est voulu. La grille porte donc `items-start`
(`answerImageGridClass`), sinon la carte la plus courte s'étire.

Le filet de captures ne pouvait pas le voir : la fixture `/visual-test`
n'a aucune réponse illustrée. À ajouter à la matrice au prochain passage.

## Ton process de déploiement, et ce qu'il implique pour moi (4 août 2026)

Béné : "c'est mon process, et je ne le changerai pas."

**Ce que TU fais, pour chaque app :**

```bash
# sur ta machine
cd C:\Users\hello\Desktop\tiquiz
git fetch origin
git pull origin main
git status
git add .
git commit -m "claude todo 4 aout 4"
git push origin main

# sur le serveur
cd /home/tipote/tiquiz-app
git stash
git pull origin main
npm ci
npm run build && pm2 restart tiquiz-prod --update-env
```

Tu prends ma branche, tu copies le code dans ton dossier local, tu pousses
sur `main`, puis le serveur tire `main`. `main` est donc la branche de
PROD, et je n'y touche jamais : je pousse sur ma branche, tu fais le
reste.

**Ce que ça implique pour moi, et c'est le point à ne pas oublier :**

- **Les fichiers SUPPRIMÉS, et EUX SEULS, se signalent** (correction
  Béné, 22 août 2026 : "bien sûr qu'il le voit ! C'est les fichiers à
  supprimer qu'il faut me signaler"). Son copier-coller emporte très bien
  les fichiers nouveaux ; ce qu'il ne fait pas, c'est retirer ce qui a
  disparu, donc un fichier supprimé survit en prod et continue d'y
  tourner. Lister les nouveaux fichiers à chaque envoi, c'est du bruit
  qu'elle doit trier pour rien.
  -> Message final : la liste des SUPPRESSIONS, avec leur chemin, et
  rien si la liste est vide.
- Sur le serveur, un `git pull` peut afficher **"Already up to date"**
  alors que le fetch vient de télécharger des commits : c'est normal,
  `main` est à jour même quand `origin/claude/...` bouge. Ce n'est PAS un
  signe que le déploiement a raté.
- `npm ci` réinstalle depuis `package-lock.json` : toute nouvelle
  dépendance doit être committée AVEC son lock, sinon le build casse en
  prod et pas chez toi.

## Voir l'écran d'une cliente au lieu de la déranger (4 août 2026)

Jocelyne signalait un problème qu'aucun écran ne reproduisait de notre
côté. On a diagnostiqué à l'aveugle, on lui a fait faire une manip qui
n'a rien donné, et il a fallu quatre allers-retours pour comprendre que
son Atelier était relié au mauvais compte. Voir SON écran aurait tranché
en dix secondes.

```bash
cd /home/tipote/tiquiz-app
node scripts/login-link.mjs adresse@de-la-cliente.fr
```

Le script affiche un lien de connexion à usage unique dans le terminal.
Il **n'envoie aucun email** (c'est l'app qui poste le message dans le flux
normal, pas la génération du lien), et il ne touche ni au mot de passe ni
à la session en cours. Il existe dans les TROIS repos.

**Trois règles, réimprimées à chaque exécution :** fenêtre privée (sinon
on remplace sa propre session par la sienne sans s'en rendre compte), on
regarde sans rien modifier, on ferme en partant.

**Deux choix techniques à ne pas défaire.** Le script n'a AUCUNE
dépendance (`createClient` de supabase-js monte un client temps réel qui
exige un WebSocket natif, absent de Node 20 : ça plantait avant de rien
faire). Et il lit le `.env` lui-même, en ne cherchant QUE les deux clés
dont il a besoin : `set -a; . .env; set +a` demande à bash d'interpréter
tout le fichier, et une clé d'API sans rapport contenant des caractères
spéciaux faisait échouer le chargement entier.
## Une librairie qui change d'API, et un `as unknown as` qui l'a caché (drame François Xavier, 7 août 2026)

"Quand j'importe le quiz au format pdf, j'ai ce message d'erreur :
Erreur lors de la lecture du fichier : r is not a function."

**L'import PDF n'avait jamais marché.** Pas "plus" : jamais. Reproduit le
jour même, hors bundle : `pdfParse is not a function`.

`pdf-parse` v1 s'appelait comme une fonction. La v2, installée le 27
juillet, est une réécriture : elle exporte une CLASSE `PDFParse` et n'a
plus de default export du tout. Le code appelait donc un objet. En prod
le nom de la variable est minifié, d'où le `r` : un message qui ressemble
à un problème de fichier alors qu'il décrit notre code.

**Et le compilateur le savait.** `tsc` répond "Module has no default
export" sur `import pdfParse from "pdf-parse"` : les types livrés par la
v2 sont justes et ils gagnent sur `@types/pdf-parse` (resté en v1, retiré
depuis). Le bug a survécu parce que le code forçait le silence :

```ts
const pdfParse = (m as unknown as { default?: ... }).default ?? (m as unknown as (b: Buffer) => ...)
```

**Règle : pas de `as unknown as` sur un module externe.** Une double
assertion ne convertit rien, elle interdit la vérification. Garde-fou :
`tests/logic/pdf-import.test.mts`.

**Les deux apps étaient cassées, différemment.** Tiquiz en v2 (API
changée), Tipote resté en v1 dont l'`index.js` lit un fichier de test au
chargement (`ENOENT ./test/data/05-versions-space.pdf`), le bug connu de
cette version sous bundler. Deux repos jumeaux, deux versions
divergentes, donc deux pannes qu'un seul correctif n'aurait pas couvertes.
Les deux sont maintenant en `^2.4.5`, avec la MÊME implémentation.

**Le vert local ne prouvait rien, et c'est le vrai piège.** Test logique
vert, `tsc` vert, `next build` vert : l'import PDF échouait quand même une
fois compilé. `pdf-parse` charge son worker par un import DYNAMIQUE
construit à l'exécution, que Next ne voit pas passer :

```
Setting up fake worker failed: Cannot find module '.../pdf.worker.mjs'
```

D'où DEUX réglages dans `next.config.ts`, tous les deux nécessaires :
- `serverExternalPackages: ["pdf-parse"]` : sinon le worker est cherché
  dans les chunks au lieu de node_modules ;
- `outputFileTracingIncludes` sur `pdfjs-dist/legacy/build/pdf.worker.mjs`
  : sinon le fichier n'est pas copié dans la sortie standalone.

Vérifié en envoyant un VRAI PDF au serveur de production des deux apps.
Le test logique fige ces deux lignes, parce qu'elles ne servent à rien en
local et que rien d'autre ne dirait qu'on les a retirées.

**Et une exception n'est jamais la phrase que lit la cliente.** Le client
affichait `error.message` tel quel. François Xavier ne pouvait rien en
faire, et nous non plus : le vrai symptôme était noyé. Le serveur renvoie
maintenant une RAISON (`lib/quiz/importFailure.ts`), l'écran la traduit
dans les 7 langues, et les cas qui appellent une action ont leur propre
phrase : PDF scanné, PDF protégé par mot de passe, PDF abîmé. Même règle
que la suppression d'un quiz (3 août) : le serveur dit ce qui s'est
passé, l'interface dit comment le dire.

## Un client qui a payé reste en gratuit (drame Ivan, 7 août 2026)

Ivan Pellegry passe du gratuit au mensuel. Côté Systeme.io tout est bon :
il porte le tag `tiquiz-mensuel`, la vente est encaissée. Côté Tiquiz, son
compte reste en `free`.

**Le journal de production, une fois consultable, a tout dit :**

```
07/08 11:56-11:57  subscription.payment.failed  tunnel: -  offre: 3375217
07/08 11:58        customer.sale.completed      tunnel: -  offre: 3375217
                   -> refused, unknown_offer:3375217
06/08 21:05        free_optin   tunnel: tipote.fr/tiquiz-gratuit  offre: -
```

Le webhook est bien posé et il arrive. En passant à 17 / 170, le bon de
commande a gardé son URL mais vend un NOUVEAU plan tarifaire (`3375217`),
absent de `OFFER_TO_PLAN`. La route a répondu `unknown_offer` et refusé,
ce qui est le bon comportement, mais laisse dehors un client qui a payé.

**LA DÉCOUVERTE QUI COMPTE : un événement de VENTE ne porte AUCUNE URL de
tunnel.** Seul l'optin gratuit en a une. Le routage par URL, qui passe en
premier, ne peut donc rien faire sur une vente : **l'offer-price-id est
la seule voie qui existe** au moment où l'argent rentre.

Corollaire immédiat, et il vaut un audit : les paliers PLUS n'avaient
QUE leur URL depuis le 2 juin. Ils étaient donc irroutables sur une
vente, exactement comme Ivan, sans que personne l'ait jamais vu.

**JE ME SUIS TROMPÉ DEUX FOIS, ET LES DEUX FOIS DE LA MÊME FAÇON.**
D'abord j'ai présenté "les nouveaux ids ne sont pas dans la table" comme
un fait alors que c'était une hypothèse. Puis, quand Béné a précisé que
les URLs n'avaient pas changé, j'ai retiré un diagnostic JUSTE en
raisonnant "le routage par URL aurait donc dû marcher" : sans vérifier
qu'il y avait une URL dans le payload. Il n'y en a pas.

> **Les deux erreurs sont la même : raisonner sur la forme SUPPOSÉE d'un
> payload au lieu de la regarder.** Un journal se lit, il ne se déduit pas.

`tests/logic/sio-plan-routing.test.mts` fige désormais la forme OBSERVÉE
(vente sans URL avec `pricePlan.id`, optin avec URL sans offre) : si un
jour une vente cesse d'être reconnue, il dira si c'est le payload qui a
bougé.

**Les deux ajouts qui suppriment le silence :**

1. **Une vente encaissée sans accès envoie une alerte email** aux admins,
   avec l'offer-price-id et l'URL reçus, c'est à dire exactement les deux
   lignes à ajouter pour que le suivant passe. Le refus était juste ;
   c'est le silence qui coûtait une journée et un client.
2. **`/admin` liste les appels Systeme.io reçus** (`WebhookLogsCard` +
   `app/api/admin/webhook-logs/route.ts`), avec pour chaque ligne ce que
   le routage répondrait AUJOURD'HUI. C'est cet écran qui a tranché en
   dix secondes ce que deux diagnostics à l'aveugle n'avaient pas su
   trancher. Une vente absente de la liste n'est jamais arrivée.

**ET ON A CONFONDU DEUX IDENTIFIANTS PENDANT DEUX MOIS.** Le 2 juin, on
a noté que "tous les bons de commande partagent le même offer-price-id
(`offerprice-dc9c3e75`)" et on a basculé le routage sur l'URL pour
contourner l'ambiguïté. C'était faux : `offerprice-dc9c3e75` est l'**id
du bloc HTML** de la page de commande (`<div id="offerprice-dc9c3e75">`),
le même partout parce que c'est le même gabarit de page. Le webhook,
lui, envoie `pricePlan.id`, un entier UNIQUE par plan tarifaire.

On a donc contourné pendant deux mois une ambiguïté qui n'existait pas,
en se rabattant sur une URL qui, elle, est absente des ventes. **Un
identifiant vu dans le navigateur n'est pas celui reçu par le serveur :
c'est le payload qui fait foi, pas la page.**

**ET SURTOUT, LA RÈGLE QUE BÉNÉ A IMPOSÉE :** "pourquoi une vente
refusée ? Il a payé le client, il doit recevoir ses accès, point barre."

Elle a raison, et l'ancien comportement était indéfendable. Sur une offre
inconnue on refusait, donc un client qui venait de payer se retrouvait
sans rien. **Ce qui est ambigu dans ce cas, ce n'est pas QU'IL a payé
(l'événement est une vente confirmée), c'est seulement QUEL palier.** On
répond donc à la vraie question, dans cet ordre :

1. l'offer-price-id ;
2. l'URL (optins uniquement) ;
3. **le MONTANT** (`inferPlanFromAmount`), qui tranche entre la base et
   le PLUS, en correspondance EXACTE : un montant remisé ne doit pas
   ouvrir un palier au hasard ;
4. **le palier de base** (`FALLBACK_PAID_PLAN = "monthly"`).

Le repli n'est pas un pari : `monthly` et `yearly` ouvrent EXACTEMENT les
mêmes fonctionnalités (cf. `lib/planLimits.ts`), seule la facturation
diffère et Systeme.io s'en occupe. Se tromper entre les deux ne coûte
rien au client, et c'est le palier le moins cher, donc on ne donne jamais
un PLUS par accident.

**Le garde-fou qui reste : `isConfirmedSaleEvent(eventType)`.** Le repli
payant ne s'applique QU'À une vente confirmée. Un événement qu'on ne sait
pas nommer n'ouvre toujours RIEN : sans ça, n'importe quel appel mal
configuré donnerait un accès payant. Les annulations et les échecs de
paiement sont filtrés en amont.

L'alerte email dit maintenant QUEL palier a été ouvert, et que la
correction n'est pas urgente puisque le client a déjà son accès.

**Règle : tout plan vendu doit être joignable par un offer-price-id.**
L'URL est un complément utile (elle distingue les tunnels affiliés sur
les optins), pas une voie de secours : elle est absente là où ça compte.
Le test l'exige pour les quatre plans vendus, et interdit qu'un même id
route vers deux plans différents.

**Quand un tarif change, il y a donc trois choses à faire, pas une :** le
prix affiché dans l'app, l'entrée URL du bon de commande, et surtout son
nouvel offer-price-id.

## Partager SON résultat, pas le quiz (retour client, 7 août 2026)

"Quand je partage le résultat du quiz, le lien pointe vers la page de
bienvenue du quiz et non vers le résultat." Le texte qu'il obtenait :

```
J'ai identifié mon profil de stress dominant. Fais le test pour découvrir
le tien. https://quiz.tipote.com/q/type-stress-biologique?rp=aa87b13d-...
```

**Le lien n'était pas le problème**, et c'est le point à ne pas
inverser : il porte bien `?rp=<profil>`, et il DOIT mener au quiz. Béné :
"et pour chacun : lien vers le quiz." Celui qui reçoit le lien vient
passer le test, pas lire le résultat de quelqu'un d'autre.

Ce qui manquait, c'est que **le TEXTE ne parlait pas du résultat obtenu**.
Le visiteur partageait mot pour mot la phrase d'avant de l'avoir : de son
point de vue, il partageait donc "le quiz".

**Et c'est encore une moitié de décision.** Le serveur faisait déjà le bon
travail depuis le 28 juillet : avec `?rp=`, `og:title` vaut "J'ai
obtenu : <profil>" et `og:image` porte l'image du profil. Le viewer, lui,
appelait `buildShareText` (le texte du QUIZ) dans les deux cas. **Deux
endroits calculaient la même chose, un seul avait été corrigé** : c'est
mot pour mot ce que l'en-tête de `lib/quiz/shareText.ts` racontait déjà
pour le HTML brut, dans ce même fichier.

**La règle attendue, en deux lignes :**

| Moment | Texte | Aperçu | Lien |
|---|---|---|---|
| avant le résultat | le quiz | image du quiz | le quiz |
| après le résultat | LE PROFIL OBTENU | image du profil | le quiz |

**`buildResultShareText()` (`lib/quiz/shareText.ts`) décide**, et la
créatrice garde la main : un `{resultat}` dans son message de partage y
place le nom du profil elle-même (`{résultat}`, `{result}`, `{profil}`
acceptés aussi, elle écrit dans son élan). Sans variable, la phrase par
défaut nomme le profil, dans les 8 langues du viewer. Sans profil connu,
on retombe sur le texte du quiz : un partage sans texte serait pire.

**LA MÉCANIQUE EST UN PARAMÈTRE** (`getShareData(scope)`), jamais déduite
de la présence d'un `urlOverride`. Déduire marcherait aujourd'hui et
casserait au premier écran qui partage une autre URL : c'est la leçon des
contrôles "profil" appliqués à un quiz scoré.

**Et le texte et le lien sortent de la MÊME fonction** (`resultShare()`,
qui rend `{ scope, url }`). Le réglage `share_result_page` gouverne les
deux : décoché, le lien perd son `?rp=`, donc l'aperçu redevient celui du
quiz, et un texte qui annoncerait quand même "j'ai obtenu X" contredirait
l'image juste en dessous. Deux moitiés d'une même décision calculées
séparément finissent toujours par se contredire.

**L'écran de fin de SONDAGE reste en `"quiz"`** : il n'y a pas de profil
à nommer, c'est voulu.

Test : `tests/logic/result-share.test.mts`. Le module quiz de Tipote est
jumeau : la correction y vit aussi.


## Un export SingleFile n'a PAS les scripts (19 août 2026)

Béné, sur la page de vente de l'Atelier répliquée chez nous : "je vois
bien la page mais pas les popups comment ça marche et résumé en 5 points
ni le curseur étoile."

Ses trois blocs perso (étincelles au curseur, carrousel 5 écrans, mini
test) étaient bien écrits dans sa page Systeme.io. Dans notre copie, le
CSS était là et le JS avait disparu : **un seul `<script>` survivait dans
tout le document**, contre 11 sur la vraie page.

La cause n'est pas notre extracteur (il ne retire que Google Tag Manager
et Facebook) : **SingleFile retire les scripts par défaut**. L'export
qu'on nous avait donné n'en contenait aucun. Le CSS qui reste donne
l'illusion d'une page complète, et c'est ce qui rend le piège coûteux :
rien ne manque à l'oeil, seuls les comportements manquent.

**Règle : une page de vente se capture depuis son URL EN LIGNE**
(`scripts/fetch-sales-page.mjs`), jamais depuis un export fait à la
main. C'est d'ailleurs pour ça que Tiquiz marchait du premier coup et
pas l'Atelier : deux pages jumelles, deux méthodes de capture, une seule
panne. Même famille que les deux versions divergentes de `pdf-parse` du
7 août.

**Et une capture se VÉRIFIE dans un navigateur, pas à l'oeil.** On ouvre
la page servie par nous, on clique les boutons qui déclenchent quelque
chose, et on lit la console. C'est ce qui a montré, en plus, que deux des
quatre ids de son `TRIGGER_IDS` n'existent plus sur sa page (elle avait
recréé les boutons dans l'éditeur Systeme.io, ce qui leur a donné de
nouveaux ids) : son propre garde-fou le signalait déjà, sur la page en
ligne comme sur la copie, et personne ne lisait la console.

## Trois causes, un seul message : le 404 muet (19 août 2026)

La page de vente de l'Atelier répondait `Not found`. Trois branches de la
route rendaient exactement ce texte : clé absente, slug inconnu, fichier
non déployé. Impossible de savoir laquelle, donc impossible d'avancer
autrement qu'en devinant.

**Règle : une fois la porte franchie, le serveur DIT ce qui cloche.**
Sans la bonne clé, on ne dit rien (un refus explicite annoncerait qu'il y
a quelque chose derrière). Avec la bonne clé, on nomme la cause et on
donne la donnée qui manque toujours : le dossier depuis lequel on a
cherché. C'est la même règle que la suppression d'un quiz (3 août) et que
l'import PDF (7 août), appliquée à un endroit qui l'avait oubliée.

La cause réelle ce jour là : `SALES_PREVIEW_TOKEN` posée sur le serveur
de Tiquiz et pas sur celui de l'Atelier. **Deux apps, deux `.env`,** et
une variable posée une seule fois. `grep -l NOM_DE_LA_VAR /home/tipote/*/.env`
répond en une seconde à "je l'ai pourtant mise quelque part".

## Un shell qui garde le `.env` de l'autre app (panne 22 août 2026)

Les deux apps ont servi la base Supabase de l'AUTRE, deux fois dans la
même journée, pour deux raisons différentes. Une journée entière perdue.

### Le matin : le BUILD gravait les valeurs du terminal

Tiquiz affichait les quiz de Tipote et répondait `column
profiles.user_id does not exist` ; Tipote répondait `Could not find the
table 'public.content_item' in the schema cache`. Les liens de connexion
envoyés depuis `quiz.tipote.com` renvoyaient sur `app.tipote.com`.

Les quatre faits qui ont tranché, et c'est le bon réflexe de diagnostic
(comparer le FICHIER et le BUILD, jamais le fichier seul) :

```
== tiquiz-app ==  .env: ottpciabnrclwgdlwjdt   build: mmwyfqfbfkvcnrkyvagv
== tipote-app ==  .env: mmwyfqfbfkvcnrkyvagv   build: ottpciabnrclwgdlwjdt
```

**Les deux `.env` étaient justes. Les deux builds étaient croisés.**

Un `set -a; . .env; set +a` avait été lancé dans le terminal, pour les
DEUX apps, dans la même session, juste pour lire une variable. `set -a`
exporte tout le fichier dans le shell. Or Next lit `process.env` **avant**
`.env` (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
: "stopping once the variable is found"), et un `NEXT_PUBLIC_*` est gravé
dans le code au moment du `next build`, avec "the value from the
environment in which you run `next build`".

Les bases n'ont jamais été fusionnées : chacune est restée intacte, ce
sont les pointeurs qui étaient croisés.

### Le soir : la même panne, par une autre porte

Béné : "pourquoi j'ai tous mes contenus mais pas mes clients dans
Tipote ?" La question contenait le diagnostic.

Le garde-fou du matin a bien REFUSÉ de construire. Mais la ligne suivante
du déploiement, `pm2 restart --update-env`, a poussé ce terminal pollué
DANS le processus. Et comme `server.js` fait `process.chdir(__dirname)`,
le serveur standalone cherche ses fichiers d'environnement dans
`.next/standalone/`, où personne ne copiait rien : l'app ne vivait donc
QUE sur ce que PM2 gardait en mémoire, insensible à tous les rebuilds.

Le partage des symptômes disait exactement où regarder :
- les CONTENUS s'affichaient (clé anon, GRAVÉE dans le build, donc juste) ;
- les CLIENTS avaient disparu (clé de service, lue dans le PROCESSUS,
  donc celle de l'autre app).

**Un garde-fou qui protège le build ne protège pas le redémarrage.**

### Les garde-fous, et pourquoi il en faut plusieurs

Chacun couvre un MOMENT différent. En zapper un rouvre la porte par
laquelle la panne est déjà passée.

| Quand | Quoi | Ce qu'il attrape |
|---|---|---|
| avant le build | `prebuild` -> `scripts/check-build-env.mjs` | le terminal contredit le `.env` du repo : le build est REFUSÉ |
| après le build | `postbuild` -> copie `.env*` dans `.next/standalone/` en 600 | le serveur standalone a enfin une source de vérité, versionnée avec le déploiement |
| au démarrage | `instrumentation.ts` -> `lib/env/supabaseProject.ts` | la clé ne parle pas du même projet que l'URL : ça CRIE dans `pm2 logs`, à chaque démarrage |
| à la demande | `npm run check:supabase-keys` | compare le FICHIER, le TERMINAL, le BUILD et le PROCESSUS (`/proc/<pid>/environ`) |

**Le postbuild ne dispense JAMAIS d'`instrumentation.ts`** : `process.env`
passe toujours devant les fichiers, donc une valeur fausse héritée de PM2
gagne encore. Ce qui change, c'est qu'une variable ABSENTE du processus a
désormais une source fiable, versionnée avec le déploiement, au lieu de
dépendre de la mémoire de PM2.

Aucun de ces contrôles n'imprime la valeur d'une clé qui ressemble à un
secret (`estSecret`) : ces rapports finissent dans un terminal, un
historique, parfois un copier-coller. Ils disent "les deux valeurs
diffèrent" et s'arrêtent là. Les URL et les `NEXT_PUBLIC_*` restent
lisibles, ce sont elles qui rendent le diagnostic évident.

### Un journal se LIT, il ne se déduit pas

L'agent a mis une heure à trouver, en théorisant. Deux sources donnaient
la réponse en une commande : le corps de la réponse HTTP (onglet Réseau)
et `/proc/<pid>/environ`. Il a lancé quatre hypothèses avant d'aller les
regarder, et fait accuser une clé anon parfaitement bonne pendant trois
échanges parce que son test tapait sur un point d'entrée que cette clé
n'a pas le droit de lire.

**Un test qui ne distingue pas ce qu'il est censé distinguer est pire
qu'un test absent.** `/rest/v1/` répond 200 à n'importe quelle clé valide
du projet, quel que soit son rôle, et 401 à une clé anon valide.

| Ce qu'on veut savoir | Où taper |
|---|---|
| une clé anon est-elle bonne | `/auth/v1/settings` |
| une clé de service est-elle bonne | `/auth/v1/admin/users?page=1&per_page=1` |
| ce qu'une clé EST | décoder son `role` (`lireCleSupabase`) |

Et **un 401 peut vouloir dire "clé vide"** : mesurer la longueur de ce
qu'on a extrait avant de conclure quoi que ce soit.

### Un garde-fou non fusionné ne protège personne (23 août 2026)

Les trois derniers garde-fous ont été écrits le 22 au soir sur une branche
de travail, et ne sont jamais arrivés dans `main`. Pendant 24 heures, cette
page les décrivait comme actifs et le serveur ne les avait pas : la cause
exacte de la panne du soir était toujours là, derrière une doc qui disait
le contraire.

**Règle : quand une session écrit un garde-fou, la dernière étape n'est
pas de l'écrire, c'est de vérifier qu'il est arrivé.**

```bash
git log origin/main -1 --oneline -- instrumentation.ts scripts/check-supabase-keys.mjs
```

Aucune ligne = il n'est pas déployé, quoi qu'en dise la doc.

### Et la leçon qui dépasse cette panne

Une commande donnée à Béné doit être sûre même mal replacée.

- `( set -a; . .env; set +a; ... )` : la parenthèse est un sous-shell,
  tout meurt avec elle. **INTERDIT sans les parenthèses.** Une variable
  exportée dans un terminal survit à tout ce qu'on y tapera ensuite.
- `npm run build && pm2 restart <app> --update-env` : le `&&` n'est pas
  cosmétique. Sans lui, un build REFUSÉ se déployait quand même, et c'est
  exactement ce qui a mis Tipote par terre. Ne jamais donner ces deux
  commandes sur deux lignes séparées.

## Ce que l'API de Systeme.io donne, et ce qu'elle ne donne pas (22 août 2026)

Béné : "vu que tu es connecté à Systeme.io en MCP maintenant, tu ne peux
pas récupérer toutes les infos qu'il nous manque ? Genre les ventes
depuis le début, l'affiliation ?"

Relevé en interrogeant son compte, pas en supposant :

| Disponible | Absent |
|---|---|
| plans tarifaires (id, nom, montant, devise) | **les commandes / les ventes** |
| contacts, tags, champs de contact | **l'affiliation, les commissions** |
| tunnels, étapes, pages | les remboursements |
| campagnes, newsletters, règles d'automatisation | |
| codes de réduction, produits numériques | |

**L'historique des ventes ne peut donc PAS être rapatrié.** Il vit dans
leur tableau de bord, et chez nous seulement depuis le 7 août, dans
`webhook_logs`. Le dire est plus utile que de laisser espérer un import
qui n'existera pas.

**Ce que les plans tarifaires ont réglé, eux :** `lib/sio/pricePlans.ts`
porte la table LUE dans son compte. Elle a servi deux fois le jour même.
Trois plans Tiquiz en dollars existaient depuis avril et manquaient à
`OFFER_TO_PLAN` (une vente dessus tombait sur le repli, donc au bon
endroit mais au mauvais palier). Et le prix du plan donne enfin un ordre
de grandeur au montant d'une vente Systeme.io, qui s'affichait `0,00 €`.

**Ce prix reste une ESTIMATION, marquée `amountSource: "plan"`.** Son
compte porte 54 codes de réduction actifs, dont certains à 100 % : une
vente remisée vaut moins que le tarif affiché. Un montant `"plan"`
n'entre donc JAMAIS dans un chiffre d'affaires (ni `encaisseCents`, ni
`paidCents`, ni la courbe de `serieEncaissee`). **Un chiffre gonflé dans
un tableau de bord est pire qu'une absence de chiffre : il fait prendre
des décisions.**

`Sale.amountSource` vaut `"payload" | "plan" | "inconnu"`, et c'est un
CHAMP, pas une déduction de l'appelant. Tester `amountCents <= 0` pour
dire "montant inconnu" casserait le jour d'une vente à 0 € légitime,
c'est à dire le jour où quelqu'un utilise le code `GRATUIT`.

**Et deux listes de chemins qui cherchent la même chose finissent
toujours par diverger.** Le webhook lisait `order.total_price`, le
tableau de bord non : une vente pouvait être commissionnée au bon
montant et affichée à zéro. Les deux passent maintenant par
`PAID_AMOUNT_PATHS`. `pricePlan.amount` en est volontairement EXCLU :
c'est le prix du plan, pas la somme encaissée. Il ne sert qu'à deviner
le palier (`AMOUNT_PATHS`).

**Quand un tarif change, Systeme.io crée un nouveau plan, donc un nouvel
id, donc DEUX lignes à ajouter** : `OFFER_TO_PLAN` et `PRICE_PLANS`. Le
test `tests/logic/sio-price-plans.test.mts` exige que les deux tables
soient d'accord.

## Une fiche par client, et le tiroir qui a disparu (22 août 2026)

Béné : "Tu trouves ça pratique ? lisible ? facile à utiliser ? Quand
j'aurai 200000 clients, je fais comment ? Retrouver toutes ses infos,
pouvoir mettre à jour ses infos, le rembourser, savoir d'où il vient, ce
qu'il a comme accès, ce qu'il a payé ?"

J'avais empilé : une liste pour REGARDER (état, Atelier, argent) et une
autre pour AGIR (palier, lien de connexion, suppression), puis un tiroir
dépliant dans la première. Un tiroir sert à jeter un oeil, pas à
travailler, et deux listes des mêmes personnes finissent toujours par se
contredire.

**Règle : la liste reste une liste, et mène à `/admin/clients/<email>`.**
Tout ce qu'on FAIT sur une personne se passe sur sa fiche. Une adresse
plutôt qu'une fenêtre : elle se garde en favori, elle se partage avec
quelqu'un, elle survit à un rafraîchissement, et un ticket de support
peut la citer (l'email d'alerte le fait).

L'état et le rattachement des ventes passent par `buildPeople`, la MÊME
fonction que la liste. Une fiche qui recalcule afficherait "Abonné" là où
le tableau dit "Part bientôt".

**D'où vient la personne :** `readProvenance` (`lib/admin/provenance.ts`)
lit le PREMIER appel reçu pour son adresse et en sort le tunnel
d'entrée. `part-tiquiz-gratuit` vient d'une affiliée, `tiquiz-gratuit`
vient d'elle. Le plus ancien, jamais le plus récent : le plus récent
dirait par où elle est repassée. Le journal ne remonte qu'au 7 août, et
l'écran le DIT au lieu d'afficher un tiret.

## Le bouton Rembourser qui ne pouvait pas exister (22 août 2026)

"Il est où le fucking bouton rembourser ??"

Il n'y en avait pas, et il ne POUVAIT pas y en avoir : toutes ses ventes
d'aujourd'hui passent par Systeme.io, qui encaisse et garde l'argent. Le
bouton n'existe que sur nos propres encaissements, et il n'y en a encore
aucun.

**Règle : un bouton absent se justifie sur la ligne.** La colonne Payé
dit "à rembourser dans Systeme.io" ou "à rembourser depuis l'Atelier".
Un bouton absent sans un mot se lit comme un bug, et elle a passé du
temps à le chercher. Même famille que le `ok: false` muet du 3 août.

## Le support : le centre d'aide est chez Tipote, le ticketing chez nous

Le centre d'aide EXISTE (57 articles, servis par `app.tipote.com/support`,
partagés par les deux apps, cf. `lib/help.ts`). Ce qui manquait, c'était
le chemin vers un humain.

- `/support` : formulaire dans les 7 langues, **PUBLIQUE**. Celle qui a
  le plus besoin d'aide est celle qui n'arrive pas à se connecter : la
  renvoyer vers `/login` serait un cul-de-sac parfait. La ligne est dans
  le middleware, avec la même justification que `/depart/`.
- Les tickets vivent dans la base de TIQUIZ (`support_tickets`), pas chez
  Tipote : ils doivent apparaître sur la fiche du client, à côté de ses
  accès et de ses paiements. Une donnée dans une autre base est une
  donnée qu'on ne croisera jamais.
- La file est triée de façon que **ce qui attend le plus longtemps passe
  devant** (`trierFile`). Trier du plus récent enterrerait ceux qu'on a
  déjà fait attendre. Au delà de 24 h sans réponse, la ligne rougit.
- **L'ordre compte : on ENVOIE l'email d'abord, on enregistre ensuite.**
  L'inverse laisserait Béné convaincue d'avoir répondu et la cliente
  devant une boîte vide, en silence.
- Ce que la cliente a écrit est repris dans l'email de réponse, donc
  ÉCHAPPÉ (`renderTiquizMessage`) : sinon un `<` casse le message et un
  `<script>` volontaire devient une injection chez quelqu'un d'autre.

## Après un paiement pris chez nous (22 août 2026)

Trois choses doivent suivre un paiement. Une était là, deux manquaient.

1. **La facture** : déjà émise par Stripe (`invoice_creation`).
2. **L'email d'accès venait de SUPABASE.** `grantPlan` appelait
   `signInWithOtp`, donc Supabase envoyait SON gabarit, configuré pour
   l'autre app. C'est exactement le reproche du 22 août ("je reçois les
   trucs tipote"). On génère le jeton et on envoie NOTRE email.
   **INTERDIT : `signInWithOtp` dans un chemin qui envoie un email.**
3. **L'étiquette Systeme.io n'était pas posée.** Ses automatisations sont
   bâties dessus : un client payé chez nous et non étiqueté sort de
   toutes ses séquences sans que rien ne le signale. `poserTagAchat`
   utilise SA clé, celle de ses Paramètres (`resolveApiKey`), et ne crée
   JAMAIS une étiquette manquante : une étiquette créée par nous avec une
   faute se retrouverait en double dans sa liste.

Les deux sont best-effort et POSTÉRIEURES au plan : "il a payé le client,
il doit recevoir ses accès, point barre".

**PayPal sur Tiquiz n'est pas le PayPal de l'Atelier.** L'Atelier vend un
achat unique (API Orders, déjà branché dans formaquiz). Tiquiz vend des
ABONNEMENTS : il faut l'API Subscriptions, donc des produits et des plans
créés chez PayPal, et un cycle de vie d'abonnement à écouter. Ce n'est
pas un copier-coller, et ça ne se vérifie pas sans les identifiants.

## Vérifier DANS QUEL DOSSIER on regarde (ma faute, 22 août 2026)

J'ai annoncé à Béné qu'il n'y avait "rien dans Tiquiz, ni CGV ni mentions
légales, zéro page". C'était faux. Je lisais les fichiers de
`tipote-app` : le répertoire de travail du shell PERSISTE entre deux
commandes, et un `cd` fait dix minutes plus tôt s'appliquait encore.

Tiquiz a son corpus légal, écrit pour lui, en 5 langues :
`lib/legal/{legal-notice,privacy,terms,terms-of-use,cookies,affiliate}.ts`
et les pages `/legal`, `/terms`, `/privacy`, `/cookies`. Ma recherche
`find app -ipath "*cgv*"` n'a rien trouvé parce que les routes sont
nommées en anglais.

**Deux leçons, et la deuxième est la vraie :**
- `pwd` avant de conclure quoi que ce soit sur un dépôt, et un chemin
  ABSOLU dans les commandes qui traversent plusieurs dépôts ;
- **ne pas conclure "ça n'existe pas" d'une recherche qui n'a rien
  trouvé.** Une recherche vide veut dire "je n'ai pas trouvé", pas "il
  n'y a rien", et la différence a produit un rapport faux.

**Ce qui manquait vraiment était plus précis** : nos CGV disent à
l'article 5 "cette renonciation est recueillie avant paiement", et le bon
de commande n'affichait ni les CGV ni la renonciation. Le texte annonçait
quelque chose que l'écran ne faisait pas. Encore une moitié de décision.

## Elle a payé, elle n'a pas demandé à se connecter (Béné, 23 août 2026)

Premier vrai paiement sur notre bon de commande, en conditions réelles.
Le plan s'ouvre, le compte est créé, l'email part. Et Béné : "j'ai bien
reçu un lien de connexion mais pas le mail de bienvenue : il faut
vérifier qu'une personne qui était en gratuit et passe en payant reçoit
bien ce qu'il faut."

Il n'y avait pas de mail de bienvenue, et il n'y en avait jamais eu.
`grantPlanByEmail` appelait `sendMagicLinkEmail`, donc le seul message
qu'une cliente recevait après avoir payé s'intitulait "Tiquiz : ton lien
de connexion" et commençait par **"Tu as demandé à te connecter à Tiquiz
sans mot de passe"**. Elle n'avait rien demandé : elle avait payé. Aucune
phrase ne confirmait l'achat, ne nommait le plan ouvert, ni ne disait où
se gèrent la carte et les factures.

**Et le cas le plus fréquent était le pire.** Une cliente déjà inscrite
en gratuit qui passe en payant recevait un lien de connexion vers un
compte qu'elle savait déjà avoir : donc rien du tout, du point de vue de
sa commande. Béné n'a vu que la moitié du problème parce qu'elle avait
supprimé son compte gratuit avant de tester, ce qui l'a mise dans le cas
"compte créé".

**C'est le drame de l'Atelier du 7 août, jamais porté ici** : "l'email de
montée de palier n'est plus l'email de bienvenue". On souhaitait la
bienvenue à quelqu'un qui avait déjà le produit, sans jamais lui
confirmer que sa commande avait ouvert ce qu'il venait de payer.

**Règle : `lib/email/planOpenedContent.ts`, et la SITUATION est un
paramètre obligatoire.**

| Situation | Ce que la cliente lit |
|---|---|
| `nouveau-compte` | bienvenue, le plan nommé, le lien d'entrée (elle n'a pas de mot de passe) |
| `montee-de-palier` | sa commande confirmée, le plan nommé, et que ses quiz et ses leads sont intacts |

On ne peut pas appeler la fonction sans avoir dit de quel cas on parle :
c'est la seule protection qui survit au prochain qui touchera au fichier.
`created` (le compte a-t-il été créé par cet achat) est la source, et il
sortait déjà de `grantPlanByEmail`, personne ne le lisait.

Les deux messages portent le lien de connexion : le plus court chemin
vers son tableau de bord reste le même, c'est le TEXTE autour qui
change. Et le nom du plan vient du CATALOGUE (`OWNER_CATALOG`, donc de ce
qui a été affiché sur le bon de commande), jamais d'un payload.

`tests/logic/apres-paiement.test.mts` fige les 7 langues, les deux
situations, l'absence de la phrase "tu as demandé à te connecter", et
qu'aucune variable `{plan}` ne reste à trou.

## Annuler n'est pas rembourser (Béné, 23 août 2026)

"Je veux annuler et rembourser mon achat test depuis mon dashboard
admin. Il me faut un bouton pour annuler l'abo directement (l'user doit
aussi pouvoir le faire en toute autonomie) et un différent pour
rembourser (ce qui sera plus rare)."

En allant les écrire, DEUX bugs d'argent sont sortis. Les deux étaient
invisibles tant que personne n'avait payé pour de vrai chez nous.

**1. Annuler coupait l'accès et laissait le prélèvement tourner.**
`/api/billing/cancel` ne connaissait QUE Systeme.io. Une abonnée Stripe
qui cliquait "Annuler mon abonnement" tombait dans la branche "aucun
abonnement actif", **qui retirait son plan en local et répondait ok**.
Accès fermé, carte prélevée tous les mois. La pire combinaison possible,
et elle attendait depuis le jour où nous avons encaissé nous mêmes.

**2. Rembourser ne touchait pas à l'abonnement.** On rendait l'argent, on
fermait l'accès, et Stripe re-prélevait le mois suivant quelqu'un qui
n'avait plus rien. Ça ne se voit qu'un mois plus tard, sur son relevé.

Les deux sont le défaut de Véronique dans une autre famille : une logique
écrite pour un cas (Systeme.io) appliquée telle quelle à un autre (nos
propres encaissements).

**Les deux gestes, et ils ne se confondent jamais :**

| Geste | L'argent | L'accès | Le défaut |
|---|---|---|---|
| annuler | reste encaissé | tenu jusqu'à la fin de la période PAYÉE | `fin-de-periode` |
| rembourser | repart | fermé tout de suite | l'abonnement s'arrête en `immediat` |

**Règle : `lib/checkout/cancelSubscriptions.ts` décide, pour les DEUX
boutons.** La fiche client (`/api/admin/clients/abonnement`) et l'écran
de réglages (`/api/billing/cancel`) appellent la même fonction. Deux
écrans qui décideraient chacun de leur côté finiraient par se
contredire, et ici la contradiction se compte en euros prélevés.

**`quand` est un paramètre obligatoire**, jamais deviné. Le défaut est la
fin de période : elle a payé son mois, on ne le lui reprend pas.

**Et on regarde les DEUX fournisseurs.** Une même personne peut avoir un
abonnement Systeme.io (ses ventes historiques) et un abonnement Stripe
(notre bon de commande). N'en arrêter qu'un laisse l'autre tourner.

**INTERDIT : retirer un plan parce qu'on n'a "rien trouvé".** "Je n'ai
rien trouvé" et "je n'ai pas pu regarder" sont deux réponses différentes.
On n'aligne le plan sur gratuit que si les deux contrôles ont pu
s'exécuter. Un contrôle en erreur ne touche à rien et le dit.

Au passage : `hasActiveSubscription` ne listait que `monthly` et
`yearly`, donc une abonnée `monthly_plus` ou `yearly_plus` ne voyait
AUCUN bouton pour arrêter son abonnement. Les quatre paliers vendus
vivent dans `OWNER_CATALOG`, et ce sont eux.

**La clé Stripe restreinte doit avoir Abonnements en ÉCRITURE**, sinon
l'annulation répond `missing_permission`. L'écran le dit en toutes
lettres au lieu d'un "erreur serveur" qui enverrait chercher un bug dans
le code. Test : `tests/logic/subscription-cancel.test.mts`.

## On ne vend pas qu'à des femmes (Béné, 23 août 2026)

Sur la page de remerciement du bon de commande : "'Et te voilà dans
Tiquiz, prête à créer ton premier quiz' : c'est genré automatiquement ou
tu pars du principe que je ne vends qu'à des femmes ?? Ce qui n'est PAS
le cas évidemment."

Les prénoms de ce dépôt le disent tout seuls : François Xavier, Éric,
Maurice, Ivan. Un accord au féminin sur la première page qu'un client
voit après avoir payé, c'est un message qui dit "ce produit n'est pas
pour toi", trente secondes après qu'il ait sorti sa carte.

Ce n'était pas un oubli isolé : l'accueil des emails était genré dans
QUATRE langues (`Bienvenida`, `Benvenuta`, `Bem-vinda` x2) et l'écran de
session expirée en français et en italien.

**Règle : on tourne la phrase autrement, on ne met pas de point médian.**
"Prête à créer" devient "avec tout ce qu'il faut pour créer",
"Bienvenida" devient "Te damos la bienvenida", "Tu as été déconnectée"
devient "Ta session a expiré". Ça marche dans les 7 langues, alors que
le point médian n'existe qu'en français.

**Le 24, elle a tranché la nuance qui restait ouverte.** L'interface
gardait l'inclusif à trois endroits (`Devenir affilié·e`, `Prêt·e à
booster`, `Pas encore inscrit·e`), en attendant son avis. Son avis :
"arrête de penser que je n'ai que des users féminines putain !!! d'où ça
vient cette merde ??" Ces trois chaînes sont donc TOURNÉES comme les
autres ("Rejoindre le programme d'affiliation", "On booste ton business
aujourd'hui ?", "Pas encore dans le programme ?"), et leurs versions
espagnole et italienne aussi, qui étaient parties en "Lista/o" et
"Pronta/o" : lister les deux genres n'est pas mieux que d'en imposer un.

**Ne subsiste que l'aide de l'éditeur** qui explique la variante selon le
genre : elle DOIT montrer un exemple ("cher·e"), sinon la fonctionnalité
ne s'explique pas. C'est la seule exception du test.

Le filet est `tests/logic/genre-neutre.test.mts`, ici ET dans Tipote
depuis le 24 (il n'existait que d'un côté, et l'autre portait exactement
les mêmes fautes : un garde-fou qui ne protège qu'un des deux jumeaux ne
protège personne). Il ne crie PAS sur un accord avec un nom féminin
("analyse prête", "vidéo prête") : un test qui rougit pour rien finit
désactivé. Il ne regarde que l'adresse directe au lecteur.

## Un lien légal ne fait JAMAIS quitter la page (Béné, 24 août 2026)

"Pour toutes les pages créées dans Tiquiz et Tipote : un lien vers la
politique de confi etc. doit s'ouvrir dans un nouvel onglet et JAMAIS
faire quitter la page à un visiteur !! D'autant que sur le quiz, la
personne doit tout recommencer suivant les situations... c'est infernal
et le genre de choses pratiques auxquelles tu dois penser. Je ne sais pas
quand ça a sauté mais en tous cas je l'ai demandé et ça a été codé, puis
retiré."

**Ça n'avait pas sauté : ça n'avait jamais été posé** pour les liens
écrits par les créatrices. Le code DISAIT le faire. `sanitizeRichText`
portait `ADD_ATTR: ["target"]` sous le commentaire "Force links to open
safely", et **`ADD_ATTR` ne fait qu'AUTORISER l'attribut à survivre au
nettoyage : il n'en ajoute aucun.** Un lien posé dans n'importe quel
champ riche (consentement, page de résultat, bouton, pied de page)
sortait donc sans `target`, donc dans le même onglet. Le visiteur à la
question 7 qui va lire la politique de confidentialité perdait toutes
ses réponses, et il ne revenait pas : c'est juste avant de laisser son
email.

Encore une règle écrite en commentaire, donc pas une règle (comme le
`w-full h-auto` des images de réponse, 4 août).

**Règle, et elle tient en deux moitiés :**

1. **Le sanitizer pose le `target`** (HOOK 3 de `lib/richText.ts`,
   `afterSanitizeAttributes`), sur tout `<a>` qui a un `href`, avec
   `rel="noopener noreferrer"` (sans `noopener`, la page ouverte garde
   une poignée sur la nôtre via `window.opener`). C'est là et pas dans
   les composants : un lien peut venir de n'importe quel champ de
   n'importe quel écran, et une règle recopiée dans chaque composant
   finit toujours par en oublier un.
2. **Nos liens légaux écrits en dur** utilisent `<a target="_blank">` et
   jamais `<Link>` de Next, qui fait une navigation INTERNE, c'est à dire
   exactement ce qu'on ne veut pas.

**Endroits à respecter :** `components/quiz/PublicQuizClient.tsx` (les 3
branches de `ConsentText`), `components/legal/LegalFooterLinks.tsx` (sous
les formulaires de connexion et d'inscription),
`app/commande/[produit]/CommandeClient.tsx` (un paiement en cours),
`app/support/page.tsx`.

**Ce qui n'est PAS visé :** la navigation ENTRE pages légales. On n'y
perd rien, et forcer un onglet à chaque clic y serait juste pénible.

Garde-fou : `tests/logic/liens-legaux.test.mts`, qui tient les deux
moitiés (il SANITISE vraiment, il ne relit pas la source) et qui exige
que les écrans surveillés portent encore des liens légaux : un test qui
ne peut plus échouer ment. Le module quiz de Tipote est jumeau : le même
test y vit.

## Une seule file de tickets, une porte commune (Béné, 23 août 2026)

"S'il n'a pas reçu ses accès, comment il accède à
`quiz.tipote.com/support` ? Pas con hein ??? Je veux un service de
ticketing dans le centre d'aide commun à toutes les app, essentiellement
pour Tiquiz et L'Atelier qui sont vendus en ce moment, avec ticket relié
à la fiche client si elle existe."

**Sur le détail, notre formulaire était déjà public** (aucun compte
demandé, c'est écrit dans `app/support/page.tsx`). Sur le fond elle a
raison : quelqu'un dont rien ne marche ne sait pas sur QUELLE app écrire,
et il ne devrait pas avoir à le savoir.

**Et surtout, il y avait DEUX files.** `support_tickets` chez Tipote
depuis le 12 mars (les escalades du robot d'aide, avec la conversation)
et `support_tickets` ici depuis le 22 août (le formulaire). Deux bases,
deux écrans d'admin, aucun des deux ne connaissant L'Atelier. Une demande
pouvait attendre des jours dans celle qu'on ne regardait pas.

**Règle : la PORTE est commune, la FILE est unique et vit ici.**

| Où | Quoi |
|---|---|
| `app.tipote.com/support` | les 57 articles, le robot, ET le formulaire de contact (7 langues, sélecteur de produit) |
| `quiz.tipote.com/support` | le formulaire dans l'app, qui pré-remplit l'adresse quand une session existe |
| l'Atelier, menu "Besoin d'aide ?" | mène au centre d'aide avec `?produit=atelier` |
| **la file** | `support_tickets` de TIQUIZ, affichée dans `/admin` et sur la fiche client |

La file vit ici et pas chez Tipote pour la raison déjà écrite le 22 août :
le ticket doit s'afficher sur la FICHE CLIENT, à côté des accès, des
paiements et du statut Atelier, et c'est l'admin de Tiquiz qui porte
cette fiche. **Une donnée dans une autre base est une donnée qu'on ne
croisera jamais.**

**Le chemin :** le centre d'aide POSTe sur son `/api/support/ticket`
(Tipote), qui relaie vers `/api/partner/support-ticket` (ici) avec
`x-partner-secret`. Le secret ne protège rien de confidentiel (l'autre
porte est publique) : il sert à SAUTER LA LIMITE PAR IP, parce qu'un
relais serveur à serveur arrive toujours de la même adresse et couperait
tout le centre d'aide dès la sixième personne. Tipote applique SA limite,
sur l'IP réelle, avant de relayer.

**Si le relais échoue, on écrit dans la table locale de Tipote et on crie
dans le journal.** Elle a vu "envoyé" : la demande doit exister quelque
part. L'écran d'admin de Tipote garde donc l'historique, et porte un
bandeau qui dit où est la file vivante. Sans ce bandeau, Béné
surveillerait un écran qui ne bouge plus.

**`product` est validé, jamais écrit tel quel** (`lib/support/produit.ts`,
alias `formaquiz` et `quizing` acceptés). Valeur inconnue -> `tiquiz`, le
défaut de la colonne : un ticket mal étiqueté reste lisible, un ticket
refusé est une cliente sans réponse.

**Et l'écriture se replie sur l'ancienne forme** si la migration n'est
pas encore passée : PostgREST rejette l'écriture ENTIÈRE sur une colonne
inconnue, donc sans repli un déploiement en avance perdrait TOUS les
tickets en silence (drame `quiz_events.meta`, 15 jours de stats perdues).

Test : `tests/logic/support-ticketing.test.mts` ici,
`tests/logic/support-relay.test.mts` côté Tipote.

## PayPal sur Tiquiz : des ABONNEMENTS, pas un achat unique (23 août 2026)

Béné avait prévenu : "ce n'est pas un copier-coller de l'Atelier."
L'Atelier vend un achat unique et utilise l'API Orders (une commande,
une capture, terminé). Tiquiz vend des abonnements : il faut un produit,
un plan de facturation, un abonnement, et un cycle de vie à écouter.
Les deux se ressemblent en surface et ne font pas le même métier ;
recopier l'un sur l'autre aurait vendu un paiement unique de 17 € au
lieu d'un abonnement mensuel, et personne ne l'aurait vu avant le
deuxième mois.

**Ce n'était pas une nouveauté pour autant.** `lib/paypalRest.ts` fait
tourner des abonnements PayPal en production depuis des mois pour les
REVENDEURS, depuis leurs propres comptes. `lib/checkout/paypalOwner.ts`
est la même mécanique appliquée au compte de Béné avec NOTRE catalogue.
On ne l'importe pas : il tire `resellerPayments` donc `supabaseAdmin`,
qui exige les variables d'environnement au chargement et rend le tout
intestable. **La plomberie REST est dupliquée, les décisions ne le sont
pas.**

**Les quatre garanties du webhook sont celles de Stripe** : signature
vérifiée avant tout (PayPal ne signe pas avec un secret partagé, on lui
REDEMANDE s'il a émis l'événement, et ça exige
`PAYPAL_WEBHOOK_ID_OWNER`), idempotence par `webhook_logs`, relecture de
l'abonnement chez PayPal, et le plan qui vient du catalogue.

**Ce qui coupe et ce qui ne coupe pas :**

| Événement | Effet |
|---|---|
| `BILLING.SUBSCRIPTION.ACTIVATED` | ouvre le plan, rattache l'abonnement, paie l'affiliée |
| `CANCELLED` / `EXPIRED` | ferme l'accès |
| `SUSPENDED` | **ne ferme RIEN**, journalisé fort |
| `PAYMENT.SALE.COMPLETED` | l'échéance, enregistrée, aucun effet sur l'accès |
| `PAYMENT.SALE.REFUNDED` | ferme l'accès ET arrête l'abonnement |

`SUSPENDED` arrive après trois échecs de prélèvement. Couper là mettrait
dehors quelqu'un dont la carte vient d'expirer et qui va la changer :
même règle que Stripe sur `invoice.payment_failed`.

**L'adresse SAISIE voyage dans le `custom_id`, et elle gagne.** PayPal
renvoie l'adresse du COMPTE PayPal, qui n'est pas toujours celle utilisée
chez nous (compte du conjoint, adresse pro). Ouvrir l'accès sur celle-là
fabrique un compte orphelin, ce que l'Atelier a rencontré le 7 août sur
les commandes de bonus. `custom_id` est borné à 127 caractères par
PayPal : quand ça déborde on lâche le `sa`, JAMAIS l'adresse (une
attribution retombe sur la conversion par email, un accès perdu ne
retombe sur rien).

**PayPal ne connaît pas la fin de période.** `cancel` arrête le
prélèvement tout de suite, et c'est tout ce qu'il sait faire. On ne fait
donc pas semblant : le `quand` de `cancelSubscriptions.ts` décide ce que
NOUS faisons de l'accès, pas ce que PayPal fait du prélèvement.

**La commission est sur le TTC**, décision de Béné du 22 août ("pour
paypal : oui on garde le TTC"). PayPal ne ventile pas la TVA comme
Stripe Tax : passer une taxe à zéro dit la vérité de cette vente là au
lieu d'inventer un taux. Une vente PayPal paie donc l'affiliée un peu
plus qu'une vente carte, et c'est assumé.

**Le branchement se fait par `npm run paypal:setup`**, jamais à la main :
l'identifiant de webhook se relève dans l'interface PayPal, se recopie
dans un `.env`, et une faute de frappe ne se voit nulle part (le
paiement s'ouvre, l'argent rentre, aucun accès ne s'ouvre parce que la
vérification échoue en silence). Le script crée le webhook, affiche la
ligne à coller, et n'imprime jamais un secret.

**`PAYPAL_ENV_OWNER` absente vaut BAC À SABLE.** Des identifiants réels
envoyés à l'API du bac à sable sont refusés avec un message qui ne dit
pas pourquoi. `check:prod` le signale, et crie aussi quand Stripe est en
réel pendant que PayPal est en bac à sable : l'écran annonce un seul
mode, donc un des deux boutons ment.

Test : `tests/logic/paypal-owner.test.mts`.

## Le mois offert : l'essai du fournisseur, pas un palier prêté (23 août 2026)

Béné : "garder le mois offert aux affiliés pour qu'ils puissent créer du
contenu et tester ET qu'ils puissent [offrir] un mois gratuit pour tester
à tous leurs affiliés comme argument de vente 'passe par mon lien et
reçois un mois offert'. Bien sûr, ils ne peuvent pas cumuler mois offert
par l'affilié PLUS mois offert EN TANT qu'affilié : au total c'est un
mois offert, point barre. Il faut aussi tracker les tricheurs qui veulent
s'autoaffilier : même adresse email, même adresse IP etc."

Puis, la précision qui change la mécanique : "s'il a un test tiquiz plus
activé 15j il le garde mais on lui ajoute 30 jours de l'abonnement qu'il
choisit : s'il prend mensuel il a 30j gratos à mensuel. S'il prend
mensuel plus : il a 30j gratos à mensuel plus."

**Le premier jet était faux et compliqué.** Il posait un `monthly_plus`
prêté et devait ADDITIONNER des jours dans `affiliate_trial_*`, les
mêmes colonnes que les 15 jours de l'Atelier, avec toute la gymnastique
qui va avec (ne pas écraser `pre_plan`, repousser `expires_at`...).

**La bonne lecture est plus simple : c'est l'essai gratuit du
fournisseur, sur l'abonnement choisi.** `trial_period_days` chez Stripe,
un cycle de facturation `TRIAL` à 0 chez PayPal. Le client choisit son
palier, il n'est pas prélevé pendant 30 jours, puis il paie le prix de
CE palier. Et le cumul se règle tout seul : les 15 jours de l'Atelier
vivent dans `affiliate_trial_*` et continuent de tourner sans qu'on y
touche. **Le mois offert ne réécrit JAMAIS `plan` ni
`affiliate_trial_*`**, c'est ce que fige le test.

**Les deux règles, dans `lib/trial/moisOffert.ts` :**

1. **Un seul mois par personne, point barre.** `free_month_granted_at`
   n'est jamais effacé : sans ça il suffirait d'attendre l'expiration
   pour en reprendre un.
2. **Les tricheurs.** Auto-affiliation REFUSÉE, alias Gmail compris
   (`bene+x@gmail.com` et `b.e.n.e@gmail.com` sont la même boîte : c'est
   le moyen le plus simple de tricher, et comparer les adresses brutes
   ne le voit pas). Même IP : on ACCORDE et on SIGNALE. Béné a demandé
   de *tracker* les tricheurs, pas de fermer la porte à un client
   honnête : une IP partagée, c'est aussi un couple, deux collègues, une
   salle de formation.

**Le fait est ÉCRIT, jamais déduit.** Le nombre de jours offerts voyage
dans `subscription_data[metadata][free_month_days]` (Stripe) et dans le
`custom_id` (PayPal). Déduire d'un `sa` présent serait faux : un `sa`
peut être là sans qu'aucun essai n'ait été ouvert (déjà eu son mois,
auto-affiliation refusée), et marquer un cadeau jamais fait priverait
ces gens du leur.

**Et il se consomme à l'ACHAT, pas au bon de commande.** Un checkout
abandonné ne doit pas brûler le mois de quelqu'un qui n'a rien acheté.

**Le trou assumé, et il est nommé :** sur le formulaire carte, l'adresse
est saisie DANS Stripe, donc on ne peut pas toujours vérifier le
non-cumul avant. Connectée ou via PayPal (qui demande l'adresse avant),
le contrôle est complet ; anonyme, on accorde et on vérifie après. Un
deuxième mois est alors marqué `free_month_flag = 'deja_recu'` et remonte
dans l'admin. **On ne reprend rien** : reprendre un essai commencé, c'est
prélever quelqu'un qui ne s'y attend pas.

`AFFILIATE_INTERNAL_SECRET` sert au passage à demander à Tipote QUI
possède un lien (`/api/affiliate/proprietaire`) : la table `affiliates`
vit là-bas, et la copier ici donnerait deux registres, donc deux réponses
différentes le jour où l'un prend du retard.

Test : `tests/logic/mois-offert.test.mts`.

## Le mois offert ne s'ouvre QUE sur un lien du système courant (24 août 2026)

Béné, le 23 : "on le met sur l'espace affilié en expliquant que c'est
uniquement avec le système d'affiliation en cours et pas sur les anciens
liens systeme io (qui restent valides mais ne seront plus ceux à
utiliser dans le futur)". Et : "uniquement sur les liens affiliés
n'oublie pas, c'est pas pour celui qui tombe sur la page de vente tout
seul".

**La première version passait par un marqueur `?mo=1`, et Béné l'a
refusée le lendemain** : "je ne veux surtout pas de sa dans les nouveaux
liens sinon y'a forcément un moment où on va merder, trouver autre chose
nom de zeus ! Y'a pas que ce système, c'est celui de systeme io c'est
tout !!"

Elle avait raison, et sa correction a SUPPRIMÉ le problème au lieu de le
contourner. Le marqueur n'existait que parce que les deux générations de
liens portaient le même `?sa=` et étaient donc indiscernables. Depuis que
nos liens portent `?ref=jocelyne` (cf. la section suivante), **le nom du
paramètre dit à lui seul la génération du lien** :

| Le lien porte | D'où il vient | Commission | Mois offert |
|---|---|---|---|
| `?ref=` | l'espace affilié, aujourd'hui | oui | **oui** |
| `?sa=` | un ancien tunnel Systeme.io | oui | non |

`essaiPourCeCheckout({ ref })` ne prend donc QUE le code public. Un
checkout arrivé par un ancien lien n'a rien à lui passer : pas de
cadeau, et il commissionne exactement comme avant. `lib/affiliate/
moisOffertLien.ts` a été SUPPRIMÉ, et avec lui le cookie `tq_mo`.

**Un marqueur en moins, c'est un endroit en moins où on pouvait
l'oublier.** C'est la leçon générale : quand une décision demande un
drapeau à maintenir, se demander d'abord si la donnée qu'on a déjà ne
répond pas toute seule.

**Sans destination sur NOTRE domaine, le cadeau reste mort.** Les
tunnels Systeme.io ne nous transmettent rien de ce qu'on ajoute à
l'URL. D'où le slug `tiquiz_direct` (`https://tiquiz.fr/`), le seul par
lequel un `?ref=` peut arriver jusqu'à notre middleware.

Le nombre de jours vit dans le module PUR
(`JOURS_MOIS_OFFERT_ANNONCE`) : il est lu par la décision serveur ET par
l'écran qui l'annonce, et deux nombres écrits séparément finissent
toujours par diverger.

**Admin :** les mois offerts et ceux qui méritent un oeil remontent dans
`/admin` et sur la fiche client (`buildMoisOffertDigest`). Deux cas
échappent au moteur PAR CONSTRUCTION, et c'est pour ça qu'ils doivent
s'afficher : `deja_recu` (sur le formulaire carte, l'adresse est saisie
DANS Stripe, donc inconnue avant le paiement) et `meme_ip` (accordé
volontairement, une IP partagée c'est aussi un couple ou deux
collègues). **On montre, on ne reprend rien.**

## Le lien d'affiliation porte `?ref=`, l'ancien `?sa=` reste lu (24 août 2026)

`sa` reste la CLÉ INTERNE des commissions (tout l'historique est
dessus) ; il ne sort plus dans une URL publique. Côté Tiquiz, on LIT les
deux, **dans des champs séparés** :

| Où | Nos liens | Anciens liens |
|---|---|---|
| URL | `?ref=jocelyne` | `?sa=sa0016...` |
| cookie | `tq_ref` | `tq_sa` |
| corps du checkout | `ref` | `sa` |
| metadata Stripe | `affiliate_code` | `affiliate_ref` |
| `custom_id` PayPal | 6e champ | 3e champ |

**Ils ne se devinent JAMAIS l'un l'autre.** Deviner à la forme
marcherait aujourd'hui et casserait le jour où une affiliée choisit un
code qui ressemble à un `sa`. Le client nomme le champ, le serveur lit
celui qu'on lui donne.

**Les nouveaux champs du `custom_id` PayPal sont AJOUTÉS EN FIN** : un
abonnement en cours le jour du déploiement se relit exactement comme
avant, aux mêmes positions. C'est testé.

`lib/affiliate/refLien.ts` porte le format (jumeau de `sanitizeRef` côté
Tipote : un code accepté là-bas et refusé ici serait une affiliée jamais
payée, sans le moindre symptôme) et la règle habituelle, **l'URL gagne
sur le cookie** : c'est le DERNIER lien qui a fermé la vente.

## L'audit du 24 août : quatre trous dans les chaînes paiement

Béné : "je n'envoie rien en prod ni sur supabase pour le moment et tu me
fais un audit complet de tout ce qui pourrait merder... Je veux un
système fiable et stable."

Garde-fou commun : `tests/logic/audit-24-aout.test.mts`.

### 1. UN RÉESSAI DE WEBHOOK NE POUVAIT PAS REPASSER (le plus grave)

La ligne de journal était écrite AVANT le travail, et **tout conflit sur
l'index valait "déjà traité"**. Or l'index du 20 août couvrait tous les
statuts.

Conséquence : dès que le traitement ÉCHOUAIT (Supabase indisponible une
seconde, Stripe injoignable, une colonne manquante), la route répondait
502 pour demander un réessai, et **ce réessai était refusé par notre
propre journal** : ligne existante -> doublon -> 200 -> le fournisseur
arrête de réessayer.

**Une vente encaissée dont le premier traitement ratait n'ouvrait donc
JAMAIS l'accès**, et le symptôme était l'absence de symptôme. Huit
chemins de nos deux webhooks répondaient 502 en comptant sur un réessai
qui ne pouvait pas arriver.

**La correction : le statut fait partie du verrou.**

```
(source, event_id) where status in ('processing','processed')
```

C'est exactement la forme de l'index de la migration 012, qui protège le
webhook Systeme.io depuis mars et qui n'avait pas été reprise. Une ligne
`error` en SORT, donc le réessai suivant peut reprendre.

Trois cas, tous nécessaires : rien en base -> on travaille ; `processed`
-> vrai doublon ; `processing` -> quelqu'un travaille (409, réessaie
plus tard) ou son travail est mort en route (> 2 min -> on reprend).

**Et la décision est sortie dans un module PUR** (`verrouRegles.ts`) :
`log.ts` importe `supabaseAdmin`, donc aucun test ne pouvait l'importer,
donc rien ne la testait. C'est LITTÉRALEMENT là que le bug s'était
installé. `maintenant` est un paramètre : un test qui dépend de
l'horloge clignote.

**Le marquage est obligatoire à TOUTES les sorties**, exception
comprise. D'où la séparation `POST` / `traiterEvenement` : un `return`
oublié au milieu de deux cents lignes laisserait l'événement bloqué.

### 2. REMBOURSER UNE ÉCHÉANCE N'ARRÊTAIT PAS L'ABONNEMENT

L'identifiant client venait UNIQUEMENT de la session de paiement. Une
ÉCHÉANCE d'abonnement n'en a pas (c'est une facture, pas une session) :
`vente` valait `null` sur tout remboursement mensuel, donc l'abonnement
n'était pas arrêté. Accès fermé, et Stripe prélevait le mois suivant.

Le bug d'argent du 23 août, par une autre porte. Repli sur
`readCustomerId(charge.customer)`, qui gère les deux formes de Stripe et
existait déjà : ne pas s'en servir n'était pas une précaution, c'était
un trou.

### 3. RIEN NE LIAIT `SALES_HOSTS` ET `OWN_HOSTS`

Un domaine de vente absent d'`OWN_HOSTS` est pris par le portier pour le
domaine d'une créatrice : **404 sur le bon de commande ET sur son
`/api/commande/session`**. Le commentaire disait "à garder en phase", et
rien ne le vérifiait : la mécanique des deux listes qui divergent,
quatre fois payée dans ce dépôt.

### 4. UNE PORTE PARTENAIRE COMPARAIT SON SECRET AVEC `!==`

`support-ticket` était la seule ; les autres utilisent `safeEqual`. Une
comparaison naïve s'arrête au premier caractère différent : son TEMPS
raconte combien de caractères sont justes.

### 5. UN APPEL VERS L'AUTRE APP POUVAIT BLOQUER UN WEBHOOK

`commissionnerVente` tourne DANS le webhook de paiement et n'avait aucun
délai maximum. Une panne de Tipote gardait la requête ouverte jusqu'à ce
que la plateforme la tue. `proprietaireDuLien` avait le sien : deux
appels vers la même app, un seul protégé.

## Monter de palier : le prorata chez Stripe, un abonnement neuf chez PayPal (23 août 2026)

Béné : "l'user paye 17€ pour le mois et veut upgrader à tiquiz plus : on
retire les 17€ qu'il a payés déjà pour lui faire payer le complément
pour le mois en cours et la bonne somme le mois d'après ?" Puis : "Pour
stripe oui on met le prorata en route. Pour paypal : on dit rien, on
facture et on upgrade point barre."

**LE BUG D'ARGENT QUE ÇA FERME.** L'écran des formules envoyait vers le
bon de commande du palier voulu. Un abonné qui cliquait ouvrait donc un
**DEUXIÈME abonnement** pendant que le premier continuait de le
prélever, et il ne s'en apercevait qu'au relevé suivant. Même famille
que les deux bugs d'argent du 23 août (annuler qui coupait l'accès en
laissant le prélèvement, rembourser qui laissait l'abonnement tourner).

**Le SENS du changement ne se lit pas sur le prix.** Un palier porte
DEUX axes : le niveau (base / Plus) et la facturation (mois / année).
L'annuel coûte 170 € d'un coup mais revient moins cher au mois : un
classement par prix rangerait "mensuel -> annuel" dans les descentes, et
refuserait le passage à l'année. La règle est donc sur les deux axes
(`sensDuChangement`, `lib/checkout/planChange.ts`) : monter de niveau =
montée ; à niveau égal, mois -> année = montée ; tout le reste =
descente.

**Une descente est REFUSÉE, avec sa raison.** L'appliquer tout de suite
retirerait des fonctionnalités déjà payées jusqu'à la fin de la période.
La sortie honnête existe déjà : elle arrête son abonnement (l'accès tient
jusqu'à la date payée) et reprend le palier qu'elle veut. L'écran le DIT
au lieu de n'afficher aucun bouton (leçon du bouton Rembourser absent,
22 août).

**Le montant vient de Stripe, jamais d'une soustraction faite par nous.**
`GET /api/billing/change-plan?produit=` demande la facture que Stripe
émettrait (`/v1/invoices/create_preview`). Un montant affiché différent
du montant prélevé est pire que pas de montant du tout. **GET n'a pas le
droit de facturer** : un préchargement de navigateur fait des GET.

**PayPal ne sait pas faire de prorata**, et ce n'est pas un raccourci :
il n'a pas d'équivalent de `proration_behavior`. On ouvre un abonnement
neuf au palier demandé, et on arrête l'ancien **UNE FOIS le nouveau
ACTIVÉ**, dans le webhook. L'ordre n'est pas un détail : arrêter d'abord
laisserait sans rien quelqu'un qui n'irait pas au bout de l'accord
PayPal. Le lien entre les deux voyage dans le `custom_id` (5e champ,
`remplace`) : le perdre laisserait la personne prélevée DEUX fois, donc
il ne se sacrifie JAMAIS, contrairement au `sa`.

**Le plan s'ouvre par le WEBHOOK, pas par la route.**
`ouvertureDemandee()` rend `null` dès que rien n'a bougé : Stripe envoie
`customer.subscription.updated` pour à peu près tout (une carte changée,
une TVA renseignée), et ouvrir à chaque fois enverrait un email de
confirmation à quelqu'un qui vient de mettre sa carte à jour. Un accès à
VIE n'est jamais remplacé par un abonnement.

`PLANS_A_VIE` vivait en deux exemplaires (`cancelSubscriptions.ts` et
`admin/people.ts`) : la liste est maintenant dans
`lib/checkout/plansAVie.ts`. Test : `tests/logic/plan-change.test.mts`.

## Une facture légale, et PayPal n'en émet aucune (Béné, 24 août 2026)

"Dans la fiche contact de mes clients j'ai aussi besoin de savoir :
l'entreprise (si concerné), l'adresse, le pays, la tva (si concerné),
prénom, nom, adresse email, bref tout ce qu'il faut pour une facture
légale et que je puisse mettre à jour si demande du client : lui aussi
doit avoir ces infos et pouvoir les mettre à jour. PayPal envoie des
factures auto ? Si non il faut qu'on les créée... stripe le fait c'est
bien mais paypal j'ai un doute."

**Son doute était fondé, et ça se vérifie chez nous sans interroger
PayPal :** `lib/checkout/paypalOwner.ts` n'appelle AUCUN point d'entrée
de facturation, et l'abonnement qu'on crée ne porte ni adresse ni numéro
de TVA. Aucune facture n'existait donc pour une vente PayPal, quoi que
PayPal envoie de son côté. Un avis de paiement n'est pas une facture :
ni numérotation, ni identité complète du vendeur, ni adresse de
l'acheteur, ni ventilation de TVA. Stripe, lui, en émet vraiment
(`invoice_creation` en paiement unique, et un abonnement facture tout
seul à chaque échéance).

**Règle : on n'émet QUE pour PayPal.** Émettre aussi pour Stripe ferait
deux factures pour une seule vente, avec deux numérotations. Notre série
`TQ-<année>-NNNN` ne couvre donc que les ventes PayPal (et les pièces
créées à la main). L'écran client le DIT au lieu d'afficher une liste
incomplète : les factures carte se téléchargent dans le portail Stripe,
déjà branché juste au dessus.

### Deux tables, et la différence est la clé de tout

| | Ce que c'est | Qui l'écrit |
|---|---|---|
| `facturation_clients` | les infos ACTUELLES, pour les factures À VENIR | le client, Béné, le bon de commande, Stripe |
| `factures` | ce qui a été émis, FIGÉ, identité de l'acheteur RECOPIÉE dedans | la fonction SQL `emettre_facture`, personne d'autre |

Ce n'est pas une précaution d'ingénieur, **c'est la loi** : une facture
émise ne se modifie pas. Un client qui déménage garde son ancienne
adresse sur ses anciennes factures ; une erreur se corrige par un AVOIR
suivi d'une nouvelle facture. Un écran qui lirait l'adresse COURANTE
réécrirait tout l'historique au premier déménagement, sans que personne
ne le voie. **Les deux écrans le disent en toutes lettres**, sinon
quelqu'un qui corrige son adresse attend de voir ses anciennes factures
changer, ne voit rien, et conclut que le bouton ne marche pas (scénario
Jocelyne du 1er août).

### La numérotation : pas une séquence Postgres

Une séquence saute des numéros dès qu'une transaction est annulée, c'est
même sa raison d'être. Une numérotation de factures doit être
**chronologique et continue** : un trou est exactement ce qu'un contrôle
cherche. D'où `facture_compteurs` + la fonction `emettre_facture`, qui
alloue le numéro ET insère dans la MÊME transaction.

**Elle ne lève jamais sur un doublon : elle rend la facture déjà émise.**
PayPal rejoue ses webhooks à la moindre erreur, et deux factures pour un
encaissement coûtent infiniment plus cher qu'une facture manquante.
L'index `(provider, sale_ref, genre)` le garantit côté base.

**La série est l'année du PAIEMENT, pas l'année courante** : un webhook
rejoué le 2 janvier pour un encaissement du 31 décembre doit tomber dans
la série de décembre.

### La TVA : quatre cas, et le piège est le premier

`resoudreTva()` (`lib/facture/tva.ts`) décide, personne d'autre.

| Acheteur | Régime | Taux |
|---|---|---|
| France | TVA française | 20 % |
| UE, numéro de TVA valide | autoliquidation | 0 % |
| UE, sans numéro | guichet unique OSS | le taux de SON pays |
| hors UE | hors champ (art. 259 B) | 0 % |

**LE PIÈGE : une entreprise FRANÇAISE avec un numéro de TVA paie quand
même.** L'autoliquidation n'existe pas entre deux entreprises du même
pays. Se tromper là, c'est facturer 0 % à tous les clients pros français
et payer la TVA de sa poche au redressement. C'est testé nommément.

**Le prix est TTC** (décision du 12 août), donc le HT est
`total / (1 + taux)` et la TVA est la DIFFÉRENCE. Arrondir les deux
séparément donne une facture dont les lignes ne font pas le total.

**`TAUX_UE` se périme.** Un État change son taux quand il veut, et ça
arrive plusieurs fois par an dans l'Union. La table porte `TAUX_MAJ`, une
date : à revérifier une fois par an sur la liste de la Commission. Un
taux faux ne se voit sur aucun écran, il se voit à la déclaration.

**Ce qu'on ne fait PAS : valider un numéro de TVA auprès de VIES.** On
vérifie sa FORME (et que son préfixe correspond au pays de l'adresse, la
Grèce mise à part qui écrit `EL`). Un numéro bien formé mais inexistant
produirait une autoliquidation injustifiée, donc de la TVA à notre
charge : ces factures sortent marquées `tva-a-valider-vies` et remontent
sur la fiche client. Brancher VIES est le prochain pas.

### On émet toujours, on ne retient jamais

"Il a payé le client, il doit recevoir ses accès, point barre" (7 août)
vaut aussi pour sa facture. Adresse absente, pays inconnu, numéro
illisible : on émet, au taux français, et la colonne `a_completer` porte
ce qui manque. L'admin voit la liste ; personne n'attend une adresse
pour avoir sa facture.

### Où l'adresse est collectée, et pourquoi pas ailleurs

- **Stripe** la collecte déjà (`billing_address_collection: "required"`
  + `tax_id_collection`). Le webhook la RÉCUPÈRE dans
  `facturation_clients` : la redemander serait présenter un formulaire
  vide à quelqu'un qui vient de le remplir.
- **PayPal** ne demande rien et ne rend rien d'exploitable. Le bon de
  commande la demande donc AVANT d'ouvrir PayPal. Après le retour serait
  trop tard : celui qui ferme son onglet a payé quand même.
- **`completerFacturation` ne remplace jamais le bloc entier**
  (`fusionnerAcheteur`, champ par champ) : Stripe ne collecte pas la
  société, et effacerait celle saisie la semaine d'avant.

### Endroits à respecter

`lib/facture/{tva,identite,construire,paypalVente,stripeAcheteur,pays}.ts`
(purs et testés), `lib/facture/store.ts` (aucune décision, il importe
`supabaseAdmin` donc aucun test ne peut l'importer),
`components/facturation/ChampsFacturation.tsx` (LE formulaire, partagé
par les trois écrans : bon de commande, réglages, fiche admin),
`app/facture/[numero]/page.tsx`,
`app/api/commande/paypal/webhook/route.ts`,
`app/api/commande/webhook/route.ts`, `app/api/compte/mes-infos/route.ts`,
`app/api/admin/clients/[email]/route.ts`,
`supabase/migrations/20260824_facturation.sql`.
Test : `tests/logic/facturation.test.mts`.

**Pas de moteur PDF, et c'est volontaire.** Une facture électronique n'a
pas à être un PDF : ce qui compte, c'est son contenu, sa numérotation et
le fait qu'elle ne change plus. La page `/facture/<numero>` rend ce qui a
été figé, et le navigateur sait l'enregistrer en PDF. Ajouter un moteur,
c'est une dépendance de plus dans `npm ci`, un binaire à embarquer dans
la sortie standalone, et un chemin de plus qui casse en production sans
casser en local (leçon `pdf-parse`, 7 août).

## Sortir de Systeme.io : l'état des lieux vit dans UN fichier

Béné, 24 août 2026 : "note où on s'arrête et ce qu'il reste à faire pour
qu'à terme mon système remplace complètement Systeme io pour les ventes
et l'affiliation sauf pour les emails."

**`ROADMAP_SORTIE_SIO.md`**, à la racine de ce dépôt. Il couvre les TROIS
dépôts (les ventes ici, l'affiliation chez Tipote, l'Atelier chez
formaquiz) et il vit à un seul endroit : trois copies d'un état des lieux
divergeraient en une semaine, et c'est le motif de ce dépôt depuis trois
mois.

**Le point à retenir sans ouvrir le fichier :** les emails restent chez
Systeme.io, donc notre système doit continuer de leur PARLER. Or
`poserTagAchat` échoue quand le contact n'existe PAS chez eux, ce qui est
le cas normal de quelqu'un qui achète sur notre bon de commande. Il sort
donc de toutes les séquences, en silence, et le problème grossit à chaque
vente prise chez nous. C'est le chantier 1.

Y est aussi noté, à discuter le 25 août : alléger le Supabase de Tiquiz
(section 9), avec la requête de tailles à passer AVANT toute décision.

## L'audit du 26 août : le mois offert commissionnait à l'envers

Béné : "tu peux auditer tout le parcours de vente tiquiz et l'atelier,
paypal et stripe plus tout le système d'affiliation ?"

Le détail complet vit dans l'`AGENTS.md` de Tipote (l'affiliation y vit).
Ce qui concerne CE dépôt tient en trois points.

### LA COMMISSION EST RÉCURRENTE : chaque mois, pas une fois

Béné, en relisant l'audit : "chez nous on paye bien 40% chaque mois où
[le client] reste abonné, pas une seule fois... ! On arrête de payer
s'il se barre c'est tout. S'il arrête son abonnement ou s'il demande un
remboursement : pas de com pour son affilié. Mais sinon on paye tous les
mois..."

**Le code faisait exactement l'inverse, des deux côtés :**

| | Ce qui se passait |
|---|---|
| PayPal | commission à l'ACTIVATION, donc UNE fois, et sur un mois offert avant le premier euro |
| Stripe | commission au CHECKOUT, donc UNE fois, et JAMAIS sur un mois offert (montant zéro) |

**Règle : une commission par ENCAISSEMENT, aucune sur une ouverture.**
Stripe commissionne chaque `invoice.paid`, PayPal chaque
`PAYMENT.SALE.COMPLETED`. Le checkout ne commissionne plus que les
produits SANS échéance (`product.interval === null`), sinon le premier
mois compterait deux fois, sous deux clés différentes que l'unicité ne
verrait pas.

**LA CLÉ EST LE PAIEMENT, JAMAIS L'ABONNEMENT.** C'est le coeur : avec
l'abonnement pour clé, la deuxième échéance tombe sur la contrainte
d'unicité et l'affilié ne touche plus rien à partir du deuxième mois.
La facture Stripe et la vente PayPal sont donc les références, et le
moyen de paiement préfixe la clé (`stripe:` / `paypal:`) au lieu du
`stripe:` universel d'avant, qui marchait par accident.

**Trois cas se règlent alors tout seuls, sans un drapeau de plus :**
- le MOIS OFFERT : la facture d'essai vaut 0, donc pas de commission ;
  la première vraie échéance en crée une ;
- l'ARRÊT de l'abonnement : plus d'échéance, donc plus de commission ;
- la MONTÉE DE PALIER : la facture suivante porte le nouveau montant,
  donc la commission suit.

C'est la leçon générale du 24 août, appliquée ici : quand une décision
demande un drapeau à maintenir, se demander d'abord si la donnée qu'on a
déjà ne répond pas toute seule.

**Un remboursement n'annule que l'échéance remboursée.** Les mois déjà
encaissés ont été gagnés et restent acquis : elle dit "on arrête de
payer s'il se barre", pas "on reprend ce qui a été versé". La charge
Stripe porte `invoice`, le remboursement PayPal porte `sale_id` : on
essaie les deux clés, une seule existe en base.

### Un remboursement annule la commission, un impayé aussi

`annulerCommissionVente()` (`lib/affiliate/ownerSale.ts`) est la
contrepartie de `commissionnerVente`, avec la MÊME clé
(`stripe:<reference>`). Elle ne jette jamais : un remboursement doit
aboutir même si Tipote ne répond pas.

**`charge.dispute.*` n'était écouté nulle part.** Un impayé laissait
l'accès ouvert, l'abonnement actif ET la commission en route : on perdait
la vente, le service rendu et la commission, les trois d'un coup. On agit
sur `funds_withdrawn` (l'argent est VRAIMENT parti), jamais sur `created`
(une contestation se conteste, et couper l'accès de quelqu'un qui va
gagner son litige nous ferait perdre un client pour rien).

**La mécanique est un PARAMÈTRE** (`surRemboursement(event, motif)`) :
sur un litige, `data.object` est un LITIGE, il n'a ni `amount_refunded`
ni `refunded`, donc `readRefundOutcome` y répondrait "aucun
remboursement" et on ne ferait rien.

### La base de commission est DITE

`commissionnerVente` envoie `base: "ht"` : `commissionBaseCents` a déjà
retiré la TVA, et sans ce champ Tipote la rabotait une deuxième fois.

Et `moisOffert.ts` ne redéfinit plus la règle des alias d'adresse : elle
vit dans `lib/affiliate/memeAdresse.ts`, partagée avec l'attribution des
commissions. Enfermée ici, elle ne gardait que le CADEAU.

Test : `tests/logic/audit-26-aout.test.mts`.
