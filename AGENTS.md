<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## ÉTAT DU SYSTÈME au 30 août 2026 (à lire en premier)

Ce fichier est CHRONOLOGIQUE : il raconte des pannes, dans l'ordre où
elles sont arrivées. C'est utile pour comprendre POURQUOI une règle
existe, et inutile pour savoir où on en est. Ce bloc là répond à la
deuxième question, et il est le seul à devoir être relu quand quelque
chose change.

### Les trois applications, et les six domaines

| Domaine | Sert | Dépôt | Port |
|---|---|---|---|
| `tiquiz.fr` | vente, bon de commande, **blog et site public** | tiquiz | 3001 |
| `quiz.tipote.com` | l'app Tiquiz (derrière connexion) | tiquiz | 3001 |
| `pilotage.tipote.com` | le centre de pilotage (même app) | tiquiz | 3001 |
| `atelierduquiz.fr` | vente de l'Atelier du Quiz | formaquiz | 3002 |
| `quizing.tipote.com` | l'app de l'Atelier (la formation) | formaquiz | 3002 |
| `app.tipote.com`, `affiliate.tipote.com` | Tipote et l'espace affilié | tipote-app | 3000 |

`www.tipote.fr` reste chez Systeme.io : ce sont les anciens tunnels, ils
fonctionnent encore et **ne commissionnent plus** (voir plus bas).

### Qui décide de quoi (la règle qui évite les contradictions)

- **Tipote PAIE.** Le registre d'affiliés, les taux, les commissions et
  les versements vivent là, et nulle part ailleurs. Tiquiz et l'Atelier
  AFFICHENT et remontent leurs ventes.
- **Tiquiz VEND.** Le catalogue, les prix et le bon de commande sont ici
  (`lib/checkout/`, `lib/planLimits.ts`). Aucun prix ne se recopie.
- **L'Atelier ENSEIGNE.** Il n'a plus de registre d'affiliés propre
  depuis le 26 août : il envoie `source_app: "atelier"` à Tipote, qui
  applique 70 %. Son ancien registre reste un REPLI.

### L'argent, en cinq lignes

- Encaissement : **Stripe et PayPal, sur notre bon de commande**
  `tiquiz.fr/commande/<produit>`. Les tunnels Systeme.io historiques
  tournent en parallèle.
- Prix : 17 / 170 (Mensuel, Annuel), 29 / 290 (les paliers PLUS).
- Affiliation : **40 % sur Tiquiz, récurrent à chaque échéance**, 70 %
  sur l'Atelier. Le taux MONTE avec les filleuls jusqu'à 70 %
  (`lib/affiliate/recompense.ts` chez Tipote).
- Cookie d'affiliation : **1 an**. Versement à **J+30**, minimum 20 €.
- **Nos liens portent `?ref=`, jamais `?sa=`.** Conséquence décisive :
  un lien qui atterrit chez Systeme.io ne paie plus personne. C'est
  pour ça que les 8 destinations affiliées sont sur nos domaines.

### Avant CHAQUE push, sans qu'on le demande

```bash
npm run test:logic     # runner natif, ~15 s, aucune dependance
npx tsc --noEmit       # exit 0 obligatoire
npm run test:visual    # 99/99, UNIQUEMENT si le design ou l'UX bouge
```

Et selon ce qui a été touché : `npm run check:caddy` (un fichier de
`infra/caddy/`), `npm run check:migrations-pending` (après un
déploiement), `npm run check:supabase-keys` (un doute sur un `.env`),
`npm run check:stripe` (un doute sur les commissions récurrentes : il
dit la version d'API des webhooks et les événements écoutés),
**`npm run check:assets`** (après TOUT déploiement qui touche à Caddy,
à nginx ou aux images).

### ET LA RÈGLE QUI MANQUAIT, PAYÉE LE 31 AOÛT

**Quand un changement déplace l'endroit d'où quelque chose est SERVI,
la dernière étape n'est pas d'écrire la configuration : c'est d'aller
chercher l'URL et de lire le code de réponse.** Une commande, dix
secondes.

Ce jour là, toutes les images de toutes les créatrices ont répondu 403
pendant des heures, sur des quiz qui tournaient en PUBLICITÉ payante.
Le bloc de service avait été écrit dans la config nginx, correctement,
commenté, relu... et adressé à un serveur qui ne voit jamais ces
requêtes, parce que c'est Caddy qui répond. Personne n'a demandé au
serveur s'il servait vraiment le fichier.

### Les cinq pièges qui ont coûté le plus cher

1. **Une logique enfermée dans un composant React n'est pas testable,
   donc elle n'est pas testée.** Toute règle métier sort dans `lib/` en
   fonction pure. C'est là que vivaient le funnel d'Adeline, la taille
   de police de Jocelyne et le lien Pinterest sans image.
2. **Quand un cas a deux mécaniques, la mécanique est un PARAMÈTRE
   OBLIGATOIRE**, jamais devinée à l'intérieur (`mode`, `base`, `quand`,
   `scope`, `choix`, `maintenant`). Le compilateur refuse alors un
   appelant qui se tait.
3. **Un `??` protège du MANQUANT, jamais du FAUX.** Une variable
   présente et absurde traverse tout : c'est ce qui a envoyé des liens
   `localhost` à des clientes.
4. **Un aperçu qui recalcule une décision au lieu d'appeler la fonction
   du viewer finit toujours par mentir.** Sorti six fois.
5. **Un garde-fou qui ne protège qu'un des deux jumeaux ne protège
   personne.** Les modules quiz de Tiquiz et Tipote sont jumeaux : toute
   correction se porte des deux côtés.

### Où chercher le reste

| Question | Fichier |
|---|---|
| ce que le produit promet, quoi écrire en com | `PRODUCT_BRIEF.md` |
| comment ça marche, écran par écran | `CAHIER_DES_CHARGES.md` |
| **ce qui reste à faire, dit par Béné** | **`CHANTIERS.md`** |
| ce qui reste à reprendre à Systeme.io | `ROADMAP_SORTIE_SIO.md` |
| les bugs récurrents et les conventions | `CLAUDE_PITFALLS.md` |
| sur quelle branche pousser | `CLAUDE_WORKFLOW.md` |
| le programme d'affiliation en détail | `PLAN_AFFILIATION.md` (dépôt tipote-app) |

**Béné ne lit pas les dossiers.** Tout ce qu'elle doit faire ou copier
se met dans le message final, jamais dans un fichier qu'on lui demande
d'ouvrir. Une commande à la fois, aucun paramètre à remplacer.

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
GIT_TERMINAL_PROMPT=0 git pull origin main
npm ci
npm run build && pm2 restart tiquiz-prod --update-env
```

`GIT_TERMINAL_PROMPT=0` a ete ajoute le 2 septembre : sans lui, un 401
bloque le terminal sur un prompt muet, sans rien expliquer.

Et le serveur porte, une fois pour toutes :

```bash
git config --global http.version HTTP/1.1
```

Sans lui, git en HTTP/2 sur cette machine recoit un 401 sur TOUT depot
public, y compris git/git. Voir la section "Le deploiement fantome".

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
3. **Le tag Systeme.io n'était pas posée.** Ses automatisations sont
   bâties dessus : un client payé chez nous et non taggé sort de
   toutes ses séquences sans que rien ne le signale. `poserTagAchat`
   utilise SA clé, celle de ses Paramètres (`resolveApiKey`), et ne crée
   JAMAIS un tag manquant : un tag créé par nous avec une
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
défaut de la colonne : un ticket mal taggé reste lisible, un ticket
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

**La commission est sur le HT, comme partout ailleurs** (Béné,
31 août 2026 : "pour l'affiliation on fait uniquement 40 % etc. sur le
HT. Débrouille toi pour que sur PayPal ça marche aussi, il y a forcément
un moyen de calculer chez nous la TVA si concerné ou pas"). Voir la
section "Une vente PayPal paie sur le HT" plus bas : ça remplace sa
décision du 22 août ("pour paypal : oui on garde le TTC").

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

**Une descente est ACCEPTÉE, et elle prend effet à l'ÉCHÉANCE** (Béné,
29 août : "je veux que le downgrade soit pris en compte sans
désabonnement côté user"). Cette page a dit le contraire jusqu'au
31 août, et c'était périmé, pas faux à l'origine : la descente était
refusée jusqu'au 29. L'ancien refus était mauvais commercialement, il
fallait résilier pour descendre et beaucoup ne revenaient pas.

Ce qu'il ne faut PAS faire, en revanche, c'est l'appliquer tout de
suite : elle a payé sa période au tarif fort, on ne lui reprend pas ce
qu'elle a acheté (règle du 23 août). Chez Stripe, la descente passe donc
par un CALENDRIER à deux phases (`programmerDescente`) ; chez PayPal
elle est refusée avec sa raison (`descente_paypal`), parce que PayPal
n'a pas de calendrier. Un changement déjà programmé se VOIT et se défait
(`lireDescenteProgrammee` / `annulerDescenteProgrammee`) : le découvrir
un matin sans se souvenir de l'avoir demandé serait pire que pas de
descente du tout.

**Le piège du calendrier, et il vaut de l'argent :** les metadonnées
d'une phase sont posées SUR L'ABONNEMENT au moment où la phase commence.
N'y écrire que `product` risquait d'effacer `affiliate_code`,
`free_month_days` et la remise en attente le jour de la bascule.
`metadonneesDeLaPhaseSuivante()` REPORTE tout ce que l'abonnement porte,
puis réécrit `product` et `source`. Voir la section du 31 août.

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

## Le cookie d'affiliation dure UN AN (Béné, 26 août 2026)

"Son cookie est posé pour 1 an sur le device de son prospect."

`REF_MAX_AGE_SECONDS` et `SA_MAX_AGE_SECONDS` valaient 90 jours. Un
prospect qui cliquait en janvier et achetait en juin ne payait plus
personne, alors que le programme promet un an. Un quiz se partage
longtemps, et une décision d'abonnement se prend rarement le jour du
clic.

Les deux cookies portent la MÊME durée : deux durées différentes
donneraient deux réponses pour la même promesse selon le lien emprunté.

## Une inscription gratuite rattache son affilié, à VIE

"S'il s'inscrit en free sur son lien : il reste son affilié à vie."

**Cette règle ne marchait QUE via Systeme.io.** Leur optin appelle
`sio-conversion` chez Tipote, qui écrit le rattachement. Notre propre
inscription (`/api/auth/signup`) ne lisait ni le cookie, ni le `?ref=`,
et n'écrivait rien du tout.

Un affilié qui envoyait quelqu'un sur NOS pages perdait donc son
prospect à l'expiration du cookie : il avait fait le travail (amener
l'inscrit) et ne touchait rien sur la vente qui arrivait trois mois plus
tard. **Et le problème grossissait à chaque inscription prise chez
nous**, c'est à dire à mesure qu'on sort de Systeme.io.

`rattacherInscrit()` (`lib/affiliate/rattacherInscrit.ts`) est appelée
APRÈS la création du compte, et ne jette jamais : le rattachement
compte, l'inscription compte plus. Sans lien affilié dans les cookies,
elle ne fait AUCUN aller-retour réseau, parce que c'est le cas normal et
le plus fréquent.

Le registre vit chez Tipote (`POST /api/affiliate/rattacher`, secret
partagé), pas ici : le copier donnerait deux registres, donc deux
réponses différentes le jour où l'un prend du retard.

**Le PREMIER rattachement gagne**, et un affilié exclu n'en crée aucun :
c'est à vie, donc ce n'est pas l'endroit où être permissif.

Test : `tests/logic/audit-26-aout.test.mts`.

## Une commission récurrente tenait à la version d'API de Stripe (31 août 2026)

Béné : "je vais démarcher de très gros affiliés, je ne peux pas me
permettre de proposer un système instable."

**Aucun appel de ce dépôt n'envoie d'en-tête `Stripe-Version`.** Les
réponses arrivent donc dans la version PAR DÉFAUT DU COMPTE, et les
webhooks dans la version choisie SUR L'ENDPOINT. Les deux se règlent
dans le tableau de bord de Stripe, pas chez nous, et elles peuvent
changer sans qu'une ligne de code bouge.

**MESURÉ sur le serveur le 31 août, pas déduit :** le compte et les deux
endpoints sont en **`2020-08-27`**, et une facture payée porte encore
`subscription` et `tax` à la RACINE. Rien n'est donc cassé aujourd'hui,
et il faut le dire dans ce sens là : ce qui suit est un FILET pour le
jour où Béné accepte la mise à jour d'API que Stripe lui proposera, pas
la correction d'une panne en cours.

Ce filet n'est pas théorique pour autant, parce que Stripe a DÉPLACÉ
trois champs que ce dépôt lit pour payer les affiliés, et que les trois
échoueraient EN SILENCE :

| Ce qu'on lisait | Où c'est passé | Ce que ça coûte |
|---|---|---|
| `invoice.subscription` | `invoice.parent.subscription_details.subscription` | `invoice.paid` sort en "ce n'est pas un abonnement" : **plus AUCUNE commission récurrente**, l'affilié touche le 1er mois et plus rien |
| `invoice.tax` | `invoice.total_taxes[].amount` | la taxe vaut zéro, la commission se calcule sur le TTC : **1,13 € de trop par vente et par mois** |
| `subscription.current_period_end` | `subscription.items.data[].current_period_end` | la date annoncée à qui descend de palier disparaît |

Le deuxième est exactement l'écart du 26 août, par une autre porte. Et
le premier est le plus grave parce que **zéro erreur ne s'écrirait nulle
part** : le webhook répondrait 200, la vente serait encaissée, l'accès
s'ouvrirait, et seule l'affiliée verrait qu'il ne se passe plus rien
chez elle. Une mise à jour d'API acceptée d'un clic un mardi soir se
paierait en commissions manquantes découvertes des semaines plus tard.

**Règle : `lib/checkout/formeStripe.ts` lit les DEUX formes, personne ne
lit un champ Stripe à la main.** `abonnementDeLaFacture`,
`taxeDeLaFacture`, `finDePeriodeAbonnement`, `metaAbonnementDeLaFacture`,
`montantAbonnement`. Pur, donc testé.

**On n'ÉPINGLE PAS une version, et c'est délibéré.** Épingler nos appels
sortants ne dit rien de la version des webhooks REÇUS : ça ne fermerait
que la moitié de la porte, et ça créerait une deuxième valeur à
maintenir. Une lecture tolérante ne casse jamais ce qui marchait, et
elle marche déjà le jour où Béné accepte la mise à jour d'API que Stripe
lui propose.

**Et pour SAVOIR au lieu de supposer :**

```bash
npm run check:stripe
```

Il dit la version des événements récents, la version de CHAQUE endpoint
de webhook, la forme réelle d'une facture payée, et surtout **les
événements manquants avec ce que chacun coûte**. Un événement absent de
l'abonnement d'un endpoint ne produit AUCUNE erreur : il n'arrive
simplement jamais. Le test exige que sa liste reste d'accord avec
`OWNER_SUBSCRIPTION_EVENTS`.

**Et c'est LÀ qu'il a trouvé quelque chose de vraiment cassé**, le jour
même de son écriture, alors que la version d'API allait bien :

| Endpoint | Manquait | Ce que ça coûtait |
|---|---|---|
| `quiz.tipote.com` | `charge.dispute.created` + `charge.dispute.funds_withdrawn` | un impayé gardait son accès ET sa commission : le trou que l'audit du 26 août croyait avoir fermé côté CODE était resté ouvert côté CONFIG |
| `quiz.tipote.com` | `customer.subscription.trial_will_end` | la remise promise après le mois offert ne se posait jamais |
| `quizing.tipote.com` (l'Atelier) | les deux `charge.dispute.*` | idem, sur l'achat unique |

**La leçon, et elle est plus grande que Stripe :** on avait écrit le code
des litiges le 26 août, écrit le test, mis à jour cette page, et
personne n'avait vérifié que le fournisseur ENVOYAIT l'événement. Un
`if` qui attend un événement jamais émis est indiscernable d'un `if` qui
marche. C'est la version « configuration » du garde-fou non fusionné du
23 août : **écrire un garde-fou n'est pas la dernière étape, vérifier
qu'il reçoit quelque chose l'est.**

**Deux apps, deux listes, et le contrôle a failli crier pour rien.** Son
premier jet réclamait `invoice.paid` à l'Atelier, qui vend un ACHAT
UNIQUE et n'écoute aucun événement d'abonnement : cinq fausses alertes
sur sept, et une alerte fausse emporte les vraies avec elle. Le tableau
`SERVEURS` porte donc, par hôte, ce que l'app vend. Un hôte inconnu fait
dire "je ne sais pas ce que cette app vend", jamais "il manque des
événements".

C'est la leçon d'Ivan (7 août), réappliquée : **on regarde ce qu'il y a,
on ne raisonne pas sur ce qu'il devrait y avoir.** `refFacture`
(`lib/checkout/sales.ts`) le faisait DÉJÀ pour `payment_intent` : la
moitié du problème était connue, et l'autre moitié vivait dans le
fichier qui paie.

**L'Atelier n'est PAS concerné** : il vend un achat unique, son webhook
Stripe n'écoute ni `invoice.*` ni `customer.subscription.*`. Vérifié, pas
supposé. Le jour où il vendra un abonnement, ce fichier se porte là-bas.

### Un changement de palier perdait l'affiliée

Deux chemins, deux fuites, et le repli qui les cachait à moitié.

**PayPal ne sait pas changer le palier : on ouvre un abonnement NEUF.**
Son `custom_id` naissait sans `affiliate_code` ni `affiliate_ref`, donc
chaque `PAYMENT.SALE.COMPLETED` suivant remontait une vente sans lien.
`change-plan` recopie maintenant les deux depuis l'abonnement remplacé,
et c'est un PARAMÈTRE OBLIGATOIRE de `monterViaPaypal` : l'oublier ne
casse rien de visible, ça arrête juste de payer quelqu'un.

**Stripe passe par un calendrier sur une descente**, et les metadonnées
de la phase 1 sont posées sur l'abonnement au moment de la bascule (voir
la section "Monter de palier").

**Le repli qui rend ces deux trous discrets, et pourquoi il ne suffit
pas :** `attributeSale` retrouve l'affiliée par la CONVERSION en base
quand le lien manque. Mais cette conversion n'est écrite qu'à la
PREMIÈRE commission attribuée. Quelqu'un qui change de palier pendant
son mois offert n'en a jamais eu une seule : son affiliée n'était plus
jamais payée, sans qu'une ligne le dise.

Test : `tests/logic/audit-31-aout.test.mts`.

## Équipes dans le PLUS : ce qui est noté, et ce qui bloque (Béné, 29 août 2026)

"Imaginons une entreprise qui a besoin d'avoir plusieurs
collaborateurs : ils auraient accès aux quiz, sondages etc. et l'admin
pourrait décider de ne pas ouvrir les accès à la partie facturation ou
aux leads. Pour un prestataire, on lui ouvre des accès pour qu'il mette
le quiz en place et suive les statistiques, place les pixels, mais on
veut pas qu'il voit forcément nos leads ni nos détails de facturation.
Uniquement pour le Plus. 5 places pour le prix actuel, au delà +50 €/mois,
au delà de 10 encore +100 €/mois."

Pas urgent, c'est pour démarcher de plus grosses structures. Trois
choses à ne pas perdre en attendant.

**1. LE MULTIPROFIL N'EST PAS UNE ÉQUIPE, et c'est le piège.** Les
projets (`project_id`, phase 6) partitionnent le CONTENU d'UNE personne.
Une équipe partitionne les DROITS de plusieurs personnes sur le même
contenu. Bâtir l'un sur l'autre donnerait "un projet = un collaborateur",
donc un prestataire qui voit tout ou rien selon le projet, ce qui est
exactement ce qu'elle refuse.

**2. LE DROIT LE PLUS DUR EST CELUI DES LEADS.** Ce sont des données
personnelles chiffrées (`lib/piiCrypto.ts`, une clé par créatrice). Un
membre sans droit "leads" ne doit pas les voir, mais il doit voir les
STATISTIQUES, qui se calculent sur les mêmes lignes. Le droit se pose
donc sur la lecture des CHAMPS (email, nom, réponses nominatives), pas
sur la table : un gate au niveau de l'écran laisserait l'API ouverte,
et c'est par l'API qu'on récupère un export.

**3. LA FACTURATION EST DÉJÀ SÉPARABLE.** `facturation_clients`,
`factures` et le portail Stripe sont des écrans à part : c'est le droit
le plus simple à poser, et probablement celui par lequel commencer.

**Sur le prix, mon avis, qu'elle a demandé.** La marche de 5 à 6 places
coûte +50 €/mois, soit +263 % pour UN siège de plus : c'est le genre de
marche où on n'ajoute jamais la 6e personne, on partage un mot de passe,
et le revendeur perd la vente ET le contrôle des accès. Un prix PAR
SIÈGE au delà des 5 inclus (par exemple +10 €/mois par siège) rapporte
la même chose à 10 places, se dit en une phrase à un acheteur, et ne
crée aucune raison de tricher. Les paliers restent utiles pour les gros
volumes, mais posés plus haut (au delà de 20, 50).


## Le simulateur d'affiliation répond enfin à la question posée (31 août 2026)

Béné : "la calculatrice sur la page affiliation est bordélique : je veux
voir combien je gagne chaque mois en fonction de mes affiliés, et de
leurs plans. Et en dessous, je veux voir l'option : augmenter mes
commissions OU faire baisser mon abonnement. Le visiteur doit voir que
ça existe mais là on l'aide à être séduit par le programme c'est tout."

Le "bordélique" est précis, et il tenait en trois choses :

1. **le résultat était SUR 12 MOIS**, alors que la question d'un affilié
   est mensuelle. Il fallait diviser de tête, et pas par 12 pour un
   filleul annuel ;
2. **tous les filleuls avaient le MÊME plan**, alors qu'elle écrit "de
   LEURS plans" au pluriel : une audience mélange forcément du mensuel
   et de l'annuel, et c'est le mélange qui donne le vrai chiffre ;
3. **il ARBITRAIT entre les deux récompenses** ("ce que tu as intérêt à
   choisir"), et pour ça il demandait SON abonnement au visiteur avant
   de lui montrer un seul chiffre. Un formulaire qui interroge quelqu'un
   sur un abonnement qu'il n'a pas encore, sur la page qui doit le
   convaincre, c'est une porte fermée.

**Règle : `simulerParPlan()` (`lib/site/recompenseAffiliation.ts`), un
CURSEUR par palier, un total MENSUEL, et les deux options MONTRÉES en
dessous.** L'arbitrage se fait dans l'espace affilié, une fois inscrit,
avec ses vrais filleuls.

### Le palier était calculé, il n'était pas MONTRÉ (même jour)

Elle a relu l'écran : "elle prend en compte l'augmentation de palier ?
Il faut ! [...] la calculatrice elle doit prendre en compte le taux
suivant le nb d'affiliés. Aussi fais la plus ergonomique, avec des
curseurs et pas des boutons plus moins."

**Le taux ÉTAIT pris en compte** : `simulerParPlan` appelle
`tauxCommissionPct` sur le TOTAL des filleuls, et c'est testé depuis le
premier jet. Ce qui manquait, c'est qu'on ne le VOYAIT nulle part :
l'écran affichait un montant sans la mécanique qui le fait monter, donc
il se lisait comme un simple produit, donc rien ne donnait envie de
pousser plus loin. Un barème invisible ne motive personne.

L'écran dit maintenant trois choses en même temps : le taux courant, ce
que la marche a déjà ajouté par rapport aux 40 % de départ, et la
MARCHE SUIVANTE (`prochaineMarcheCommission`, dans le lib, pure et
testée). Les deux cartes du bas affichent la valeur atteinte à ce
nombre de filleuls, au lieu d'un "jusqu'à 70 %" abstrait.

**Le seuil ne se réécrit PAS dans le composant.** La marche s'ouvre au
PREMIER filleul de la dizaine (1 -> 45 %, 11 -> 50 %), c'est le
découpage de `tauxCommissionPct`, et deux formules pour le même barème
finissent toujours par diverger. Le test compare la marche annoncée à ce
que `tauxCommissionPct` rendra vraiment : annoncer un palier que le
barème ne donnera pas se découvre au premier versement.

**Les boutons plus/moins demandaient dix clics pour atteindre la
première marche.** Avec un curseur, le chiffre bouge pendant qu'on
tire : la mécanique se comprend sans la lire. Le champ numérique reste
à côté, parce que le curseur s'arrête à 100 et que quelqu'un qui vise
plus doit pouvoir l'écrire.

Trois choses à ne pas défaire :

- **le taux s'applique au TOTAL des filleuls**, jamais palier par
  palier : c'est ce que fait `attributeSale` chez Tipote, où
  `recompense_commission_pct` est posé sur l'AFFILIÉ et pas sur la
  vente. Découper donnerait un taux plus bas que celui versé ;
- **une échéance ANNUELLE est LISSÉE sur douze mois**, et l'écran le
  dit. C'est la seule façon d'additionner deux récurrences ; annoncer
  56,67 € le mois de l'échéance et 0 € les onze autres serait exact et
  inutilisable ;
- **le total est arrondi UNE fois**, sur la somme non arrondie. Arrondir
  chaque ligne puis les additionner ferait que le total affiché n'est
  pas la somme des lignes affichées, et c'est le genre d'écart qu'un
  affilié relève.

`simuler()` a été RETIRÉ, pas laissé sans appelant : une fonction morte
qui arbitre est un piège que le prochain passage rebranche en croyant
réparer.

Test : `tests/logic/simulateur-affiliation.test.mts`.

### ET L'ÉCART QUE ÇA A RÉVÉLÉ : le blog annonce 20 % de trop

Le simulateur calcule sur le **HT** (`horsTaxes`), comme le système
paie : `COMMISSION_BASE = "ht"`, décision de Béné du 19 août. Le blog,
lui, est écrit sur le **TTC**.

| | le blog annonce | Stripe verse (40 % du HT) |
|---|---|---|
| 1 filleul mensuel | 6,80 €/mois | **5,67 €/mois** |
| 30 filleuls mensuels | 204 €/mois | **170,10 €/mois** |
| 1 filleul annuel | 68 €/an | **56,67 €/an** |
| 50 filleuls annuels | 3 400 €/an | **2 833,50 €/an** |

C'est mot pour mot le drame du 19 août, transposé au blog : l'app
promettait 32,90 € et payait 27,42 €, et la cause était la même, un
montant écrit à la main à côté d'un montant calculé.

**TRANCHÉ LE 31 AOÛT : c'est le HT, partout.** "Pour l'affiliation on
fait uniquement 40 % etc. sur le HT." Le blog a été recalculé
(`lib/blog/faitsProgramme.ts`, dix corrections, `npm run blog:reparer`)
et un test exige désormais que le blog et le simulateur annoncent le
MÊME montant au centime. PayPal aussi paie sur le HT : voir "Une vente
PayPal paie sur le HT".

**Il restait une deuxième nuance, et elle joue dans l'autre sens :** le
blog annonce **40 %**, alors qu'à 30 filleuls le taux réel est **55 %**,
donc 233,70 €/mois au lieu des 170,10 € affichés. Le blog sous-vend
maintenant le programme. C'est un choix de communication, pas une
erreur : 40 % est bien le taux de DÉPART, et le simulateur montre la
montée. À reprendre avec Béné si elle veut que le blog en parle.

## Le blog vit dans le dépôt, pas dans une base (Béné, 29 août 2026)

"Sinon oui mon blog sur tiquiz.fr/blog. Je vais supprimer les anciennes
versions dans la foulée. Profites-en pour mettre à jour l'affiliation,
les liens, les prix etc..."

Dix articles importés depuis Systeme.io, servis sur `tiquiz.fr/blog`.
`content/blog/*.json` porte le contenu, `lib/blog/` les décisions,
`public/blog/img/` les visuels. Dix articles qui changent trois fois par
an n'ont rien à faire dans une base : un fichier se relit dans une revue
de code, se déploie avec le reste, et ne peut pas disparaître parce
qu'une migration n'a pas été passée.

**L'import lit le MODÈLE de la page, jamais le HTML rendu.** Chaque page
Systeme.io embarque `window.__PRELOADED_STATE__` : le contenu bloc par
bloc, avec son type. C'est du JavaScript et pas du JSON (`\x3c`, `\'`) :
c'est Node qui sait le lire, pas un remplacement de chaînes fait à la
main. Deux racines existent, `BlogPostBody` ET `BlogPageBody` : oublier
la seconde a sorti l'étude de cas Jocelyne à zéro bloc, sans un mot.

**Trois pièges de l'import, tous invisibles sans un contrôle explicite :**

1. **L'ORDRE des remplacements décide de la justesse.** Mis en premier,
   `9 €/mois -> 17 €/mois` transforme "1 filleul à 9 €/mois = 3,60 €" en
   "1 filleul à 17 €/mois = 3,60 €" : le prix devient juste et le calcul
   devient faux, ce qui est pire que de n'avoir rien touché. Les phrases
   qui portent une ARITHMÉTIQUE se corrigent entières, AVANT les
   remplacements génériques.
2. **Deux motifs qui se chevauchent : le plus long d'abord.** Un motif
   court consomme sa cible et le long ne trouve plus rien, en silence.
3. **Une même lettre s'écrit de deux façons** (`à` précomposé ou `a` +
   accent combinant). On normalise en NFC avant toute comparaison,
   sinon un remplacement échoue sans bruit.
   Et une espace INSÉCABLE (`1 800 €`) ne se tape pas : on l'exprime.

Le pipeline REFUSE de finir en silence : il compte les corrections
appliquées, liste celles qui n'ont trouvé aucune cible, et cherche ce
qui ne devrait plus exister (ancien prix, ancien lien, tiret cadratin,
chevron, point médian). `tests/logic/blog.test.mts` rejoue ces contrôles
sur le contenu déployé.

**Le lien vers l'Atelier menait chez Systeme.io, et cette exception a
été LEVÉE le 30 août.** Elle disait que l'Atelier tenait son propre
registre d'affiliés et ne lisait que `?sa=`, donc que repointer le lien
changerait QUI est payé. Vérifié ligne par ligne dans son dépôt le
30 août : ce n'est plus vrai. `atelierduquiz.fr` est un hôte de vente,
son middleware capte le `?ref=`, et `commissionnerVente` interroge le
registre CENTRAL de Tipote en premier (`source_app: "atelier"`). Les
liens du blog pointent donc sur `atelierduquiz.fr`, et le test l'exige
dans ce sens là.

**Les images sont chez nous, recompressées** (82 fichiers, 24,3 Mo ->
5,7 Mo). Les GIF passent en WebP **animé** : `sharp(buf, {animated:
true})`, sinon on ne garde que la première image et le GIF devient une
capture fixe sans que rien ne le signale. Hotlinker le CDN de
Systeme.io aurait tué tous les visuels le jour de la résiliation.

**Ce qui manquait pour ranker sur "tiquiz".** La page de vente ne
portait AUCUNE donnée structurée : elle était un document parmi d'autres
contenant le mot. Elle déclare maintenant `Organization`, `WebSite` et
ses offres (`lib/sales/servePage.ts`), **uniquement sur le domaine
public** : deux pages qui prétendent être le site officiel se feraient
concurrence sur la même requête. Les prix viennent du CATALOGUE, jamais
recopiés.

**À faire quand elle en aura le temps :** plusieurs visuels portent
`www.tipote.fr/tiquiz` incrusté dans l'image. Ça ne casse rien, mais ça
envoie le lecteur vers une adresse qui va disparaître.

## La page d'article du blog, refaite sur le modèle Typeform (Béné, 30 août 2026)

Elle a listé dix défauts en regardant une page d'article, et neuf
viennent d'UN chiffre : **le corps de l'article faisait 1168 px de
large**. Mesuré, pas déduit. À 18 px, ça fait 150 caractères par ligne
et l'oeil perd le début de la ligne suivante, ce qu'elle décrit par "le
contenu est mal réparti, dur à lire". Les images héritaient de cette
largeur, d'où "certaines images sont d'une taille disproportionnée c'est
carrément n'importe quoi".

**La page est maintenant une grille : 720 px de lecture, 320 px de rail
collant.** Le rail porte ce qui doit rester sous les yeux (sommaire,
partage, invitation) ; le bas de page porte ce qu'on choisit après avoir
fini de lire.

### Les trois défauts d'images, et pourquoi la largeur n'était que le premier

| Ce qu'on affichait | Mesuré |
|---|---|
| `gwenn.webp` (200 px) en `w-full` | agrandie **5,8 fois** |
| `publicite-quiz.webp` (842 x 1808) | **2508 px de haut**, deux écrans et demi |
| `schema-...-large.webp` **PUIS** `-mobile.webp` | le même schéma deux fois, la 2e étirée sur 2151 px |

Le troisième est le vrai "n'importe quoi" et aucune largeur ne l'aurait
corrigé : ses schémas existent en DEUX versions dessinées exprès, et
l'import les a transformées en deux blocs image ordinaires. Il fallait
comprendre qu'ils n'en font qu'un.

- `lib/blog/imagesArticle.ts` : `normaliserImages()` retire les doublons
  voisins puis apparie les variantes en un `<picture>`. **L'extension
  peut différer** entre les deux versions (`.svg` et `.webp`) : c'est le
  cas réel du corpus.
- `lib/blog/dimensionsImage.ts` : la taille naturelle, lue dans les
  premiers octets (WebP VP8 / VP8L / VP8X, PNG, JPEG, GIF) et dans le
  `viewBox` des SVG. **Pas de dépendance** : la lecture a lieu au build,
  sur des fichiers du dépôt, et une librairie de plus est un chemin de
  plus qui casse en prod sans casser en local (leçon `pdf-parse`).
- `tailleAffichage()` borne par la colonne ET par la hauteur (760 px).
  Une capture en portrait se borne par sa HAUTEUR : c'est ce qui
  manquait. Le ratio est conservé, on RÉDUIT, on ne recadre jamais.
- CSS : `width: auto; height: auto` + les deux `max-*`. **Poser
  `width: 100%` avec un `max-height` ÉCRASERAIT l'image**, ce qui est
  pire que le problème d'origine.

### Le bouton bleu sur bleu : c'était de la spécificité CSS

"Un bouton texte bleu sur couleur bleu c'est carrément de la merde."
Elle a raison et c'était mesurable : `.tq-site .tiquiz-blog a` pèse
0,3,0 et `.tq-bouton` 0,1,0, donc le libellé prenait le bleu foncé des
liens d'article. **#0B3FA8 sur #1D6BF0 = 1,93:1**, quand le minimum
lisible est 4,5:1.

`tq-bouton-plein` (globals.css) monte la spécificité au lieu d'un
`!important` : le prochain bouton posé dans un article portera la classe
sans avoir à connaître cette histoire.

Au passage, l'encart de fin d'article n'est plus un aplat marine ("les
encarts bleu sont moches j'en veux pas") : fond blanc, filet HORIZONTAL
à la couleur de marque, texte à l'encre du site.

### AUCUN APLAT DE COULEUR SOUS DU TEXTE, NULLE PART (Béné, 31 août 2026)

"Supprime l'arrière plan bleu sous le texte c'est pas adapté, pas beau,
j'en veux pas, NULLE PART. Au pire mets carrément le texte en couleur,
mais dans les couleurs Tiquiz pas couleurs des vignettes. **Notre
branding c'est celui des pages de vente tiquiz.fr et atelierduquiz.fr
pas les vignettes.**"

**Troisième fois que la remarque sort**, et c'est ça qui fait qu'elle
devient une règle et un test plutôt qu'une correction de plus :

- 3 août : "l'encart est tout pété" ET "il est de la même couleur que
  les boutons, ça entraîne de la confusion" (les quatre temps de la page
  de résultat) ;
- 30 août : "les encarts bleu sont moches j'en veux pas en plus ils
  rendent le texte illisible" (la fin d'article) ;
- 31 août : le simulateur, le bloc de fin de la page affiliation, celui
  du blog, et le surligneur de titre.

**Le motif est toujours le même : on prend les couleurs d'un VISUEL et
on les applique à une INTERFACE.** Sa dernière phrase le nomme mieux que
tous les audits : le branding vient des PAGES DE VENTE, pas des
vignettes d'articles. Un dessin de 1200 px peut porter trois mots dans
un bloc bleu et vivre sur un fond marine ; une page qui doit se LIRE,
non.

**Règle : fond blanc ou crème, texte à l'encre, et le bleu ne sert plus
qu'à quatre choses** : un bouton, une pastille numérotée, un FILET
HORIZONTAL, et un CHIFFRE. Le seul fond sombre qui reste est le PIED de
page (`.tq-pied`), le geste Typeform qu'elle a montré elle même, où
rien ne se lit longtemps.

**`.tq-surb` est devenu une COULEUR DE TEXTE** ("au pire mets carrément
le texte en couleur"). C'était un dégradé bleu avec du blanc dessus,
recopié des vignettes ; c'est maintenant le mot en bleu de marque, plus
lourd que le reste du titre. Aucun appel n'a bougé, les sept titres
concernés gardent leur emphase.

**INTERDIT :** `bg-[var(--tq-marine)]` sur un bloc de contenu, un
`bg-[var(--tq-bleu)]` avec du padding sous du texte, et le `text-white`
qui en découle. `tests/logic/branding-site.test.mts` les refuse sur les
sept écrans du site public, et exige que `.tq-surb` n'ait plus de
`background`.

Un filet reste HORIZONTAL, jamais vertical : une décoration à gauche
déplace ce qu'elle décore, et les bords ne s'alignent plus (règle du
3 août, mesurée à 20 px).

### Pinterest ne recevait PAS l'image, et le viewer de quiz non plus

"Aucune image ne peut être repartagée sur Pinterest, les images ne sont
pas conformes." Deux causes, et la première vivait dans le viewer :

1. **Le lien Pinterest n'a jamais porté de `media=`.** Il était écrit
   dans `PublicQuizClient.tsx`, au milieu d'un composant de 5000 lignes,
   donc hors de portée de tout test : il y est resté des mois. Sans
   `media`, Pinterest ouvre son formulaire SANS image et demande au
   visiteur d'en choisir une.
2. **Le format.** Pinterest est un flux VERTICAL : une image 16/9 y
   occupe trois fois moins de hauteur que ses voisines, donc elle ne
   circule pas. Les couvertures font 1200 x 675.

**Règle : `lib/partage/urlsReseaux.ts` construit les URL, pour le blog
ET pour le viewer de quiz.** `media` est un CHAMP du contexte, jamais
deviné, et un chemin relatif n'est jamais envoyé (Pinterest ne connaît
pas notre domaine). `absolutiser()` refuse toute origine locale, comme
`resolveAppUrl` : un `??` protège du manquant, jamais du faux.

`npm run blog:epingles` construit une épingle **1000 x 1500** par
article (`public/blog/pin/<slug>.jpg`, committées) : sa couverture
nette, posée sur elle-même floutée et assombrie, avec son logo en pied.
**On ne dessine AUCUN texte** : ses couvertures portent déjà leur titre
dans sa typographie, et le réécrire avec la police que trouve le serveur
donnerait une épingle qui change d'allure selon la machine.

### Le TL;DR est un chapeau, pas un paragraphe

Il vit dans le PREMIER bloc HTML, mélangé au texte
(`<p><strong><em>TL;DR</em></strong></p>` suivi du résumé).
`extraireResume()` (`lib/blog/gabarit.ts`) le sort et retire le libellé.
Neuf articles sur dix en ont un ; l'étude de cas de Jocelyne n'en a pas,
et on n'en fabrique PAS : un résumé tiré des premières phrases répète
mot pour mot le paragraphe juste en dessous.

### Les liens qui mentaient (et le script qui les répare)

"Certains liens sont débiles comme 'C'est pour ça que Tiquiz existe' qui
mène vers l'affiliate center et pas vers Tiquiz."

- **7 liens de lecture** menaient à `affiliate.tipote.com/signup` ;
- **4 URL étaient MORTES**, concaténées par l'import :
  `systeme.io/fr?sa=<id>fr/blog/exemples-lead-magnets` ;
- **7 liens externes en `http://`** ;
- **46 guillemets collés** : l'import a remplacé les chevrons `«` `»` par
  des guillemets droits et a emporté l'espace qui les entourait.

`npm run blog:reparer` (idempotent, `--verifie` pour compter seulement)
corrige les quatre familles. **La décision se prend sur le COUPLE
(destination, texte du lien)** : `affiliate.tipote.com` est une
destination JUSTE quand la phrase parle du programme et FAUSSE quand
elle dit "teste Tiquiz". Un remplacement à l'aveugle sur l'URL aurait
cassé les liens légitimes de l'article d'affiliation.

La règle de reponctuation vit dans `lib/blog/reponctuation.ts`, et le
TEST APPELLE LA MÊME FONCTION que le script : le contenu est propre
quand la réparation ne change rien. Deux copies de la règle finiraient
par ne plus être d'accord.

**L'exception "le lien de l'Atelier reste chez Systeme.io" est LEVÉE.**
Elle datait du 25 août et disait que l'Atelier tenait son propre
registre et ne lisait que `?sa=`. Vérifié dans son dépôt le 30 août :
`atelierduquiz.fr` est un hôte de vente, son middleware capte le `?ref=`,
et `commissionnerVente` interroge le registre CENTRAL de Tipote en
premier avec `source_app: "atelier"`.

### Les commentaires : modérés par défaut, et rendus par le serveur

Sa raison est le référencement. Une liste chargée après coup par le
navigateur n'est pas dans le HTML servi : pour un moteur, l'article n'a
alors aucun commentaire. La liste est donc **rendue par le serveur**, et
le JSON-LD porte `commentCount` (uniquement quand il y en a : annoncer
`0` sur dix articles dit le contraire de ce qu'on cherche).

- **L'adresse email ne sort jamais.** Elle n'est pas dans le `select` de
  la lecture publique : c'est la règle des IBAN du 25 août.
- **Le champ piège** plutôt qu'un captcha (qui fait fuir une lectrice sur
  cinq et envoie ses données à un tiers). Le piège attrapé répond 200 :
  dire à un robot qu'il est repéré lui apprend à ne plus l'être.
- **On ne compte PAS les noms de domaine nus** comme des liens. Ce blog
  parle d'outils, "Systeme.io" apparaît dans toute discussion normale, et
  les compter refuserait les commentaires les plus intéressants. Un
  garde-fou qui crie pour rien finit désactivé.

**LE PIÈGE QUI A ÉTÉ ÉVITÉ DE JUSTESSE, et il vaut pour tout ce dépôt :**
`lib/supabaseAdmin.ts` LÈVE au chargement du module quand une variable
manque. Un `import` en tête de `commentairesStore.ts` faisait donc
répondre **500 à toute la page d'article** sans base, alors que le blog
n'a jamais eu besoin de base pour s'afficher. Constaté en lançant le
serveur, pas déduit. Le client est chargé par `await import(...)` DANS
le try : une base absente coûte la section commentaires, jamais
l'article.

🚨 Migration : `supabase/migrations/20260830_blog_commentaires.sql`.

### Tout mettre en attente ne modérait rien : ça éteignait la section (31 août 2026)

Béné : "qui les valide, quand et comment ? J'ai voulu tester et il était
écrit 'votre commentaire est en cours de validation'. Sauf que, ben
c'est pas fait la suite ? On peut regarder ce que font les blogs les
plus modernes et fiables en ce moment et calquer sur leur comportement ?
Peut être une auto modération (pas de liens, pas de discours négatifs ou
déplacés, pas de spam). L'idée c'est de permettre aux gens de laisser
des commentaires (mais JE DOIS ÊTRE ALERTÉE pour savoir qu'il y en a) et
de montrer aux moteurs de recherche et à l'IA que mon blog intéresse le
public."

**Elle a raison, et le défaut n'était pas un morceau manquant : c'était
la posture.** Le 30 août, la règle écrite ici disait "rien n'est public
par défaut", et la file de modération existait bel et bien. Mais
personne ne relève une file tous les jours, et RIEN ne disait qu'il y
avait quelque chose dedans : en pratique, aucun commentaire n'aurait
jamais été publié. Un blog dont la section commentaires reste vide dit à
Google et aux modèles exactement le contraire de ce qu'elle cherche, et
la lectrice qui ne voit jamais son message ne revient pas.

**Règle : trois issues, pas deux** (`lib/blog/commentaires.ts`,
`jugerCommentaire` rend `statut` + `motifs`). C'est le comportement des
blogs qui marchent, Akismet et le défaut de WordPress compris.

| Issue | Quand | Béné |
|---|---|---|
| `publie` | aucun signal douteux | prévenue, rien à faire |
| `en_attente` | un signal l'a retenu | prévenue, elle tranche |
| `refuse` | propos haineux | ça n'atteint jamais la page |

**UN LIEN RETIENT TOUJOURS.** C'est sa règle ("pas de liens"), et c'est
la seule qui protège vraiment : le spam de commentaire n'existe que pour
poser un lien. Un lecteur honnête qui cite une source attend quelques
heures, ce n'est pas cher payé. Les autres signaux : tournure de spam
(`ressembleAuSpam`), plus de 60 % de majuscules, huit fois le même
caractère, un "nom" de plus de cinq mots.

**ON RETIENT, ON NE REFUSE PAS, sauf haine.** Un doute mal placé qui
REFUSE fait perdre un vrai lecteur sans que personne ne le sache ; un
doute mal placé qui RETIENT coûte un clic. Les deux erreurs n'ont pas le
même prix.

**Et les filtres ne crient PAS pour rien.** "Putain c'est génial" est un
compliment : `proposInterdits` ne vise que ce qui s'attaque à une
personne ou à un groupe. `ressembleAuSpam` cherche des TOURNURES de
placement ("gagner de l'argent facile", "backlinks pas cher", un numéro
WhatsApp), jamais un mot isolé : "j'ai fait un quiz sur les casinos"
doit passer. Un filtre qui rougit pour rien finit désactivé, et on se
retrouve sans filtre du tout (leçon du filet genre-neutre, 24 août).

**L'ALERTE PART DANS LES DEUX CAS**
(`lib/email/commentaireBlogAlerte.ts`), et l'OBJET dit lequel : elle
trie sa boîte sans ouvrir. Un commentaire auto-publié n'appelle aucune
action, mais il apparaît sur SON site sous SON nom : ne l'alerter que
sur les cas douteux lui ferait découvrir les autres par hasard, des
semaines plus tard. Quand la lectrice a laissé son adresse, elle est en
`reply_to` : répondre à un commentaire est la meilleure façon de faire
revenir quelqu'un, et aller chercher son adresse dans l'admin est
exactement ce qui fait qu'on ne le fait jamais.

`objetAlerte` vit dans le module PUR et pas dans le module d'email :
celui-ci porte `import "server-only"`, donc aucun test ne peut le
charger. C'est le piège qui avait caché le verrou des webhooks le
24 août.

**Le MOTIF est affiché dans l'admin, jamais deviné.** Sans lui, Béné
relit chaque message pour comprendre ce qui l'a arrêté. Un commentaire
reçu AVANT l'auto-modération n'a pas de motif : l'écran dit "reçu avant
l'auto-modération", il n'en invente pas un.

**Les deux écritures se replient sur l'ancienne forme** si la colonne
`motifs` n'est pas encore en prod, en écriture ET en lecture. Sans le
repli en lecture, la file reviendrait VIDE, et un écran vide se lit "il
n'y a rien à faire" alors qu'il veut dire "je n'ai pas pu regarder" (ce
sont deux réponses différentes, règle du 23 août).

🚨 Migration : `supabase/migrations/20260831_blog_commentaires_moderation.sql`.

### Ce que le filet de tests fige

`tests/logic/article-blog.test.mts` (31 tests) et les cinq nouveaux tests
de `blog.test.mts`. Ils portent ce qu'ELLE a vu : une image agrandie 5,8
fois, une capture de 2508 px de haut, le même schéma affiché deux fois,
un lien de lecture vers l'espace affilié, un guillemet collé, une épingle
qui n'est pas en 1000 x 1500.

### Les textes alternatifs : 43 % du blog n'en avait aucun (31 août 2026)

Cette page annonçait **80 %**. C'était faux, et je corrige plutôt que
d'empiler : mesuré, c'est **33 images sur 76**, soit 43 %, concentrées
sur deux articles (17 raisons, l'étude de cas de Jocelyne).

**Un `alt` vide, c'est trois choses perdues d'un coup :** une lectrice
aveugle n'entend rien (ou s'entend épeler
`mjaxntazmgewmtkwodgyywezytzimjvinmzknti3mjg0mge4owu.webp`), Google ne
sait pas ce qu'il y a dans le schéma, et un modèle de langue non plus.
C'est exactement ce que Béné vise en parlant de GEO : ChatGPT et Claude
lisent le `alt`, jamais le pixel. Or les schémas de ce blog portent
l'essentiel de l'argumentaire (l'email contre les réseaux, le tunnel de
Jocelyne, les chiffres de sa campagne) : sans texte, ce contenu
n'existait pour aucun des trois.

Les 33 textes ont été écrits en REGARDANT chaque image, une par une.
Ils vivent dans `lib/blog/altImages.ts`, la même mécanique que
`faitsProgramme.ts` : un module, `npm run blog:reparer` qui l'applique,
et un test qui exige qu'il ne reste aucune image sans texte. Écrit à la
main dans le JSON, un `alt` disparaîtrait au prochain import.

**La clé est le CHEMIN de l'image, pas sa position** : une image déplacée
garde son texte, et les deux variantes desktop/mobile d'un même schéma
sont couvertes d'un coup.

**On n'ÉCRASE jamais un `alt` existant.** Trois portent encore "tiquiz
amazon" sur des visuels sans rapport, hérités de Systeme.io ; les
remplacer en masse ferait perdre les bons. Ils se corrigent un par un,
en les ajoutant à la table.

Le test dit aussi ce qu'un `alt` NE doit pas être : pas de "image de"
(un lecteur d'écran annonce déjà que c'en est une), pas plus de 200
caractères, pas de tiret cadratin. Il a attrapé deux de mes propres
textes en les écrivant.

### Ce qui reste ouvert, et qui n'est pas du code

- **Plusieurs visuels portent `tipote.fr/tiquiz` incrusté dans l'image**
  (les schémas SVG en pied, la bannière de l'étude de cas). Ça ne casse
  rien, mais ça envoie le lecteur vers une adresse qui va disparaître.
  Seule Béné peut les redessiner.

## Les nouvelles couvertures, et le chiffre qui a survécu au dessin (31 août 2026)

Béné a livré dix couvertures neuves, une par article, aux noms exacts des
slugs. Converties en WebP 1200 de large dans `public/blog/img/<slug>.webp`
(668 Ko -> 553 Ko), épingles Pinterest reconstruites
(`npm run blog:epingles`, 10/10), et le dossier source retiré de
`public/` : servi tel quel, il aurait exposé 11 Mo de PNG à
`/blog/nouvelles%20couvertures%20articles/`, crawlables et en double.

**Neuf sur dix règlent le problème de l'adresse périmée** : elles portent
`tiquiz.fr/blog` au lieu de `tipote.fr/<slug>`. Vérifié en les
REGARDANT, pas en le supposant.

**La dixième rejoue les deux erreurs de l'ancienne**, et c'est un dessin
donc aucun test ne peut le voir :
`rente-mensuelle-affiliation-tiquiz.png` annonce **108 €/mois pour 30
filleuls** (c'est 30 x 9 € x 40 %, l'ancien tarif : le bon chiffre est
204 €) et montre le lien **`tipote.fr/tiquiz?sa=TON_ID`**, c'est à dire
le domaine Systeme.io ET le paramètre que Béné a banni le 24 août. Un
lien qui atterrit là ne paie plus personne. À redessiner ; l'épingle
Pinterest en hérite.

### Et le même 108 € vivait ENCORE dans la FAQ de l'article

En vérifiant le chiffre du dessin contre le texte, la FAQ portait cinq
faits dont **quatre faux**. Deux familles, et la seconde coûte le plus
cher.

**Des calculs restés au tarif d'avant le 6 août.** "Avec 30 filleuls
actifs sur le mensuel, ta rente s'élève à 108 € par mois", alors que la
phrase JUSTE AU DESSUS annonce 6,80 € par filleul (donc 204 €) et que le
corps de l'article dit 204 €. Le même article se contredisait à deux
paragraphes d'écart. Idem pour "1 800 € par an" sur 50 filleuls annuels,
quand le corps dit 3 400 €. C'est le piège de l'import nommé le 29 août :
la passe corrige les PRIX et laisse les CALCULS faits avec l'ancien prix.

**Des promesses que le système contredit.** "versée automatiquement le 10
de chaque mois" (c'est ENTRE le 10 et le 13), et surtout **"Pas de seuil
de versement à atteindre"** alors qu'il y en a un, 20 €, plus un délai de
30 jours. L'espace affilié le dit correctement depuis le 26 août ; le
blog promettait l'inverse. Ça ne se découvre qu'au premier virement, et
c'est le blog qui recrute : un gros affilié lit ici, constate là-bas, et
ne revient pas. Même famille que les CGV du 22 août, dont l'article 5
annonçait une renonciation que l'écran ne recueillait pas.
Le kit annonçait aussi "un dashboard de suivi de ta rente sur Systeme
io" : il vit sur `affiliate.tipote.com` depuis que le registre est chez
nous.

**Règle : `lib/blog/faitsProgramme.ts`**, appliqué par
`npm run blog:reparer` et vérifié par `tests/logic/blog.test.mts`, qui
appelle LA MÊME fonction : le contenu est propre quand la réparation ne
change plus rien. Les montants se CALCULENT (`RENTE_PAR_FILLEUL`), ils ne
se recopient pas, sinon le prochain changement de tarif laissera encore
des calculs à l'ancien prix. Et **les faits passent AVANT la
reponctuation** : reponctuer d'abord change les espaces autour des `€`,
donc plus aucune phrase entière ne serait reconnue.

**LA FAUTE QUE J'AI FAITE EN L'ÉCRIVANT, et qui vaut plus que la règle :**
le motif de "1 800 € par an" portait une espace ORDINAIRE, l'article une
INSÉCABLE. Le remplacement ne trouvait rien. **Et le contrôle échouait de
la même façon, avec le même littéral : il répondait "aucun fait faux" sur
un article qui portait encore le mauvais chiffre.** Un contrôle qui ne
distingue pas ce qu'il est censé distinguer est pire qu'un contrôle
absent (leçon des clés Supabase, 22 août). Les motifs acceptent
maintenant n'importe quelle espace, et un test le fige.

**Reste à trancher par Béné, pas par le code :** la FAQ promet des
commissions sur Tipote "quand Tipote sort", avec des prix (19 € à
917 €/mois) et un exemple à 39,60 €/mois. Tipote n'est pas en vente, et
la règle du 8 juin dit qu'on n'en parle NULLE PART en affiliation.


## Une vente PayPal paie sur le HT, comme une vente carte (Béné, 31 août 2026)

"Pour l'affiliation on fait uniquement 40 % etc. sur le HT. Débrouille
toi pour que sur PayPal ça marche aussi, il y a forcément un moyen de
calculer chez nous la TVA si concerné ou pas et le montant de la
commission, de manière fiable et stable."

**Elle avait raison : le moyen existait déjà, il n'était pas branché.**

### Ce que le code faisait, et pourquoi ça ne se voyait pas

Le webhook PayPal envoyait `amountTaxCents: 0` et, deux lignes plus
bas, `base: "ht"` à Tipote. **Le champ disait "hors taxes", le nombre
était TTC.** Tipote faisait confiance au champ et ne retirait rien.

Un paramètre obligatoire ne protège de rien quand on lui ment. C'est la
limite de la règle du 1er août ("quand un cas a deux mécaniques, la
mécanique est un PARAMÈTRE OBLIGATOIRE") : elle force l'appelant à
DIRE, elle ne l'empêche pas de dire faux.

| | ce qui était versé | ce qui est dû |
|---|---|---|
| Tiquiz mensuel, 17 € | 6,80 € | **5,67 €** |
| Tiquiz annuel, 170 € | 68 € | **56,67 €** |
| l'Atelier, 47 € à 70 % | 32,90 € | **27,42 €** |

Les deux derniers chiffres de la troisième ligne sont EXACTEMENT ceux du
drame du 19 août, où l'app annonçait 32,90 € et payait 27,42 €. On avait
corrigé ce que l'app ANNONCE ; le chemin PayPal, lui, versait encore les
32,90 €.

### Le moyen : c'est la facture qu'on émet déjà

Depuis le 24 août, **c'est NOUS qui émettons la facture d'une vente
PayPal** (PayPal n'en émet aucune). `construireFacture` résout donc déjà
le régime de TVA de l'acheteur (son pays, son numéro, la réponse de
VIES) et décompose le TTC : France 20 %, autoliquidation 0 %, guichet
unique au taux de SON pays, hors UE 0 %.

`facturerEcheance` / `facturerVente` RENDENT maintenant la facture
qu'elles viennent de construire, et la commission lit son `tvaCents`
(`lib/facture/taxeVentePaypal.ts`). **Montant facturé et montant
commissionné sortent du MÊME calcul, par construction** : les
recalculer séparément est le défaut sorti six fois dans ce dépôt, et
ici la contradiction se compterait en euros versés.

**On ne devine JAMAIS un taux.** Un acheteur belge, un professionnel en
autoliquidation et un acheteur hors UE n'ont pas la même taxe : un
`0.2` posé quelque part les paierait tous les trois faux. Le test
l'interdit dans les deux webhooks.

### Sans facture, on retient et on crie

Le seul cas sans facture est celui où tout a échoué. On ne rend PAS
zéro : zéro veut dire "vente sans TVA", et ce serait faux neuf fois sur
dix. On retient le taux du pays du vendeur, ce que `resoudreTva` fait
déjà d'un pays inconnu, et **le journal le dit**.

**Le sens du repli est ce qui compte** : retenir une TVA sur une vente
qui n'en portait pas SOUS-paie l'affiliée, ce qui se corrige au lot
suivant ; l'inverse SUR-paie, et un virement parti ne revient pas
(règle de Tipote, 26 août).

Corollaire : une taxe LÉGITIMEMENT à zéro (autoliquidation, hors UE)
n'est pas un repli. Les confondre sous-paierait de 20 % chaque vente
professionnelle.

### Au passage, côté Atelier

La commission utilisait `commande.amountTotalCents` (ce qu'on avait
enregistré à la création de la commande) pendant que la facture
utilisait le montant de la CAPTURE (ce qui a vraiment été payé, une
remise comprise). Décomposer une TVA calculée sur un total et la retirer
d'un AUTRE donne une base fausse qui a l'air juste. L'encaissement passe
maintenant devant.

Test : `tests/logic/commission-ht-paypal.test.mts`, dans les deux dépôts.


## Poser un tag chez Systeme.io ne déclenche RIEN (mesuré le 31 août 2026)

Béné : "tout bascule sur le nouveau système et les nouvelles pages,
nouveau blog, nouveaux domaines, il faut bien que ce soit ça qui
s'affiche pour les nouveaux partout."

En allant basculer le bouton d'essai gratuit de la page de vente, une
vérification a arrêté le geste, et c'est la bonne nouvelle du jour :
elle a évité de casser ses emails.

### Ce qui a été mesuré, dans son compte, par leur API

| Question | Réponse de l'API |
|---|---|
| combien de règles d'automatisation | **51**, toutes actives |
| combien se déclenchent sur `tag_added` | **aucune** |
| sur quoi se déclenchent-elles | `form_subscribed`, toutes |

🚨 **CETTE MESURE EST INVALIDE, ET LA CONCLUSION QUI EN A ÉTÉ TIRÉE
AUSSI (corrigé le 31 août au soir).** Béné a envoyé la capture d'une
règle « Tag "newsletter" ajouté -> S'abonner à la campagne Pépites
365 », active dans son tableau de bord. Elle n'apparaît **nulle part**
dans la réponse de l'API, même sans aucun filtre.

**L'API de Systeme.io ne sait pas représenter ces règles.** Sur les 51
qu'elle rend, aucune ne porte l'action « s'abonner à une campagne »,
alors que ses tunnels en font évidemment. Elle ne montre donc qu'un
SOUS-ENSEMBLE, et son silence ne veut rien dire.

**C'est exactement la règle du 22 août, que j'ai enfreinte :** ne pas
conclure "ça n'existe pas" d'une recherche qui n'a rien trouvé. Une
recherche vide dit "je n'ai pas trouvé", pas "il n'y a rien". Je l'ai
fait deux fois, le 31 août matin sur `tiquiz-free` et le soir sur
`newsletter`, en présentant les deux comme des faits mesurés.

**Ce qui est VRAI, et vérifié :** au moins une règle `tag_added` existe
et abonne à une campagne. Poser le tag `newsletter` SUFFIT donc à
inscrire quelqu'un à Pépites 365.

**Ce qui reste INCONNU :** si `tiquiz-free` et les tags de vente
ont la leur. **Le seul endroit où ça se vérifie est son tableau de bord**
(https://systeme.io/dashboard/automation-rules), pas l'API. Ne plus
jamais écrire ici qu'une règle n'existe pas sur la foi de cet outil.

### Ce que ça casse déjà, en production

- **`tiquiz.fr/signup`** (l'inscription gratuite, revenue chez nous le
  27 août) : le compte est créé, le rattachement affilié est posé, le
  contact est créé chez Systeme.io avec `tiquiz-free`... et il ne reçoit
  rien. L'AGENTS.md de Tipote affirmait "ses séquences email partent
  comme avant" : c'était faux, et c'est corrigé là-bas.
- **`poserTagAchat` après une vente sur notre bon de commande** : même
  chose. Le tag est posée, aucune séquence ne part.

Le code d'`app/api/auth/signup/route.ts` le disait déjà, depuis le
25 août : "aucune règle n'écoute encore `tiquiz-free`". C'est la
documentation qui a écrit le contraire, et c'est elle qu'on relit.

### Ce qu'on NE fait pas, et pourquoi

**Le bouton d'essai gratuit de la page de vente reste sur leur optin**
(`SALES_LINKS_LEFT_ALONE`). Le basculer sur `tiquiz.fr/signup`
donnerait l'attribution affiliée et retirerait la séquence email : on
échangerait un problème contre un autre, sur le chemin le plus
fréquenté du site.

**Le vrai déblocage est chez Béné, en deux minutes** : créer une règle
d'automatisation avec le déclencheur "tag ajouté" sur `tiquiz-free`
(puis sur les tags de vente), qui inscrit à la campagne. Une fois
qu'elle existe, le bouton bascule et tout marche des deux côtés.

**Règle générale : un tag posé par l'API n'est pas une séquence
déclenchée.** Les deux se ressemblent et ne sont pas la même chose. Ce
dépôt a écrit trois fois "son workflow écoute ce tag" sans
l'avoir vérifié une seule fois. C'est la leçon d'Ivan (7 août), et celle
des événements Stripe manquants (31 août) : **écrire le code n'est pas
la dernière étape, vérifier que le fournisseur envoie ou écoute quelque
chose l'est.**

### RÉSOLU LE 1er SEPTEMBRE : les deux règles existent, et elles marchent

Béné : "c'est ok côté systeme io note le quelque part, le signup ajoute
le tag tiquiz free, et de mon côté j'ai un workflow qui envoie la
campagne tiquiz free."

| Le tag | Sa règle chez Systeme.io | Qui le pose chez nous |
|---|---|---|
| `tiquiz-free` | -> campagne **Tiquiz free** | `tiquiz.fr/signup` |
| `tiquiz-clients` | -> campagne **Tiquiz abonnement** | `grantPlanByEmail`, toute vente encaissée par nous |

**Ce n'est plus un inconnu, c'est un fait**, et il ferme le trou décrit
plus haut : l'inscription gratuite envoie bien sa séquence.

**LE PALIER NE DÉCLENCHE RIEN, ET C'EST LA TROUVAILLE.** Béné, le même
jour : "il faut que tu ajoutes le tag tiquiz-clients pour faire partir
la campagne tiquiz abonnement à chaque vente sur notre système." Son
workflow n'écoute pas `tiquiz-mensuel` : il écoute `tiquiz-clients`. Un
client payé sur notre bon de commande portait donc son palier, et
n'entrait dans AUCUNE séquence. `readSioClientTag` (`lib/sio/tags.ts`)
décide, `grantPlanByEmail` pose les deux tags SÉPARÉMENT (une panne
n'emporte pas l'autre), et un échec CRIE dans le journal.

**Le tag s'AJOUTE au palier, il ne le remplace pas** : ses segments et
ses filtres sont bâtis sur `tiquiz-mensuel` et compagnie. Et `free` en
est exclu : il a déjà SA campagne, et marquer client quelqu'un qui n'a
rien payé fausserait le seul segment qui compte pour ses relances.

**MESURÉ le 1er septembre avant d'écrire une ligne** : le tag existe
dans son compte (id 2156863, créé le jour même). On ne CRÉE jamais un
tag (règle du 22 août) : un nom inventé ou mal orthographié se
retrouverait en double et sa règle continuerait de pointer l'autre.

**Et l'API reste aveugle, re-vérifié le même jour :** interrogée sur les
règles `tag_added`, elle rend **zéro**, alors que ces deux règles
existent et fonctionnent. Son silence ne veut toujours rien dire. Le
seul endroit où une règle se vérifie est son tableau de bord.

**QUESTION CLOSE LE 3 SEPTEMBRE.** Béné : "c'est ok j'ai vérifié tu peux
le noter pour arrêter de m'en reparler stp ?" Elle a passé en revue ses
règles d'automatisation dans son tableau de bord. **Ne plus lui reposer
la question**, et ne plus ouvrir de tâche là dessus : le sujet est
tranché par elle, pas par une mesure de notre côté, et c'est le seul
endroit où il POUVAIT l'être.

**Ce qui reste ouvert :** une vente arrivée par un TUNNEL Systeme.io ne
passe pas par `grantPlanByEmail`, donc elle ne reçoit pas
`tiquiz-clients` de notre part. Chez elle, une règle "tag
`tiquiz-mensuel` ajouté -> ajouter `tiquiz-clients`" couvrirait ces
ventes là sans une ligne de code.


## Toutes les images en 403 : le garde-fou était à l'étage du dessous (31 août 2026)

Béné : "toutes les images sont cassées c'est pas normal", puis "j'ai
même plus les favicon putain", puis "a priori tous les champs pour
ajouter des images ont disparu de tiquiz !!! Tu as fait quoi ???". Et,
en même temps, une vraie cliente : "Damien a perdu tous ses visuels de
quiz".

**Trois symptômes, UNE cause, et AUCUN fichier perdu.**

### Ce qui s'est passé

Les images ont été basculées sur le serveur des vidéos cette semaine,
pour économiser Supabase. Le bloc qui sert `/assets/` a été écrit dans
`infra/nginx/videos.*.conf`... alors que c'est **Caddy** qui répond sur
`videos.quiz.tipote.com`. nginx ne voit jamais ces requêtes.

`/assets/<image>.webp` tombait donc dans le `handle` des VIDÉOS, qui
exige un lien signé (`forward_auth` -> `/_validate-secure-link`). Aucune
image n'en porte, donc Caddy répondait `403 forbidden` à TOUTES les
images de TOUTES les créatrices, d'un coup.

**Deux fautes empilées, et il fallait les deux corrections :** même avec
une signature valide, la racine du site est `/srv/popquiz-videos`, donc
l'image aurait été cherchée dans le dossier des vidéos.

### LE 403 ÉTAIT LE DIAGNOSTIC, et c'est ce qu'il faut retenir

Un fichier absent rend **404**. Un **403** dit que le refus vient de
l'AUTHENTIFICATION, pas du disque. Partir chercher des fichiers perdus
aurait été chercher au mauvais endroit pendant des heures, alors que
tout était sur le serveur, refusé à la porte.

Confirmé par deux sondes qui distinguent les deux blocs, avant d'écrire
la moindre ligne : `OPTIONS /assets/x.webp` répondait **204** (le bloc
`/assets` n'a aucun gestionnaire d'`OPTIONS`, celui des vidéos oui), et
le corps du 403 faisait 9 octets, `forbidden`, donc Caddy et pas nginx.

### Le troisième symptôme n'en était pas un

"Tous les champs pour ajouter des images ont disparu" : ils n'ont pas
bougé. `QuizDetailClient` rend l'aperçu **à la place** du bouton d'ajout
dès qu'une image existe (`imgUrl ? <img> : <label>Image de la
question</label>`). Un aperçu en 403 se lit donc "le champ a disparu".
**Un symptôme rapporté est une observation, jamais un diagnostic.**

### Les garde-fous, et pourquoi il en faut deux

| Quand | Quoi | Ce qu'il attrape |
|---|---|---|
| avant le push | `tests/logic/assets-servis.test.mts` | le Caddyfile ne sert plus `/assets/`, ou depuis le mauvais dossier, ou derrière la signature |
| après le déploiement | `npm run check:assets` | la CONFIG VIVANTE refuse encore |

**`check:assets` distingue ce qu'il est censé distinguer**, et c'est
tout son intérêt (leçon des clés Supabase, 22 août) : il demande un nom
qui n'existe PAS exprès. **404 = la route est saine**, 403 = la panne.
Il n'a donc besoin ni d'un vrai fichier, ni d'un secret. Vérifié le jour
même contre la production : il sort en rouge sur la panne en cours.

**`handle` et PAS `handle_path`** dans le Caddyfile : ce sont deux
directives différentes dans l'ordre de Caddy, et l'attrape-tout des
vidéos est un `handle`. Avec la même directive, l'ordre d'écriture fait
foi, et il se lit dans le fichier.

**Et le chemin ne vit plus qu'à un endroit** : `DOSSIER_ASSETS_DEFAUT`
(`lib/storage/cheminAsset.ts`, module pur donc testable). Il était écrit
dans la route d'envoi et dans nginx, sans que rien ne les compare.

### La leçon, plus grande que cette panne

C'est la version « mauvais serveur » du garde-fou non fusionné du
23 août. **Écrire un bloc de configuration n'est pas la dernière étape ;
vérifier que c'est bien LUI qui répond l'est.** Le fichier était juste,
correctement commenté, testé par l'oeil, et adressé à un serveur qui ne
voit jamais ces requêtes.

## Le formulaire de la newsletter : 502 muet, et la campagne qui n'est pas abonnée (31 août 2026)

Béné teste `tiquiz.fr/newsletter` : "Je n'ai pas réussi à t'inscrire".
La console dit `api/newsletter: 502`. Le reste de ses messages de
console (des `preload ... not used`) est du bruit sans rapport.

### 1. CINQ CAUSES ÉCRASÉES EN UN SEUL `false`

`poserTagParNom` rendait un booléen. Un `false` pouvait vouloir dire :
pas de compte administrateur, aucune clé Systeme.io connectée, contact
impossible à créer, tag introuvable, ou pose refusée. **Un
booléen ne dit pas où chercher**, et le journal disait "vérifier la clé
API et l'existence du tag", c'est à dire DEUX pistes sur cinq.

C'est le drame du 19 août ("trois causes, un seul message : le 404
muet") dans une autre famille. `poserTagParNomDetaille` rend une
RAISON ; `poserTagParNom` reste un booléen pour les webhooks de vente,
qui ne doivent jamais bloquer un accès payé.

La raison SORT aussi dans la réponse HTTP : sans elle, diagnostiquer
demande un accès au serveur. Aucune de ces valeurs n'est un secret,
elles nomment un état de configuration.

### 2. CE QUI A ÉTÉ MESURÉ DANS SON COMPTE, ET QUI CHANGE LA CONCLUSION

| Question | Réponse |
|---|---|
| le tag `newsletter` existe-t-il | **oui**, id 263284, créé en 2022 |
| le contact de test a-t-il été créé | **NON** : l'échec est à la création |
| une règle écoute-t-elle `tag_added` sur ce tag | **OUI**, vérifié par Béné dans son tableau de bord (l'API ne la voit pas) |
| la règle 1273770 fait quoi | déclencheur `form_subscribed`, action `add_tag` |
| "Pépites 365" est-elle une campagne | **oui**, id 1172338 |

**J'ai conclu de ce relevé que poser le tag ne déclencherait rien.
C'ÉTAIT FAUX.** Béné a envoyé la capture de sa règle « Tag
"newsletter" ajouté -> S'abonner à la campagne Pépites 365 », active.
L'API ne la rend pas, même sans filtre : elle ne sait pas représenter
ces règles (aucune des 51 qu'elle montre ne porte l'action « abonner à
une campagne »).

**Donc, pour la newsletter : poser le tag SUFFIT.** La chaîne est
complète dès que le 502 est réparé.

**Et la vraie leçon est sur la MÉTHODE, pas sur Systeme.io.** L'API
n'a aucun point d'entrée pour abonner un contact à une campagne (ça,
c'est vérifié : seul `assign_contact_tag` existe), et j'en ai déduit
qu'elle ne pouvait pas non plus me MONTRER une règle qui le fait. Un
outil qui ne sait pas FAIRE quelque chose ne sait pas forcément le
VOIR non plus : son silence n'est pas une réponse. La vérification se
fait dans son tableau de bord.

### 3. UNE ADRESSE QUE J'AI REMPLACÉE ALORS QU'ELLE ÉTAIT BONNE

Le message d'échec disait "écris à hello@tiquiz.fr". J'ai affirmé que
cette adresse n'existait nulle part ailleurs et je l'ai remplacée.
Béné : "si on l'a mise en place hier, c'est l'adresse qu'on utilise
pour tiquiz et l'atelier maintenant, c'est réglé sur cloudflare, resend
et dans le .env."

Ma source était un COMMENTAIRE périmé de `lib/email/tiquizShell.ts`,
qui disait que l'expéditeur "reste hello@tipote.com" alors que le code
juste en dessous lit `SUPPORT_FROM_EMAIL`. Le commentaire a été
corrigé, et l'écran lit maintenant `adresseExpediteur()`, c'est à dire
LA MÊME SOURCE que l'expéditeur des emails.

**Un commentaire n'est pas une mesure.** C'est la troisième fois que ce
dépôt paie une règle écrite en commentaire et démentie par le code
(le `w-full h-auto` des images de réponse, l'`ADD_ATTR: ["target"]` des
liens légaux, et celle-ci).

**Une adresse écrite à la main dans un message d'erreur est une adresse
que personne ne vérifiera jamais**, parce qu'on ne lit ce message que le
jour où quelque chose est déjà cassé.


## L'inscription newsletter : TROIS blocages empilés, et aucun n'était celui qu'on croyait (31 août 2026)

Suite de la section précédente. Béné, après trois déploiements : "j'ai
mis la clé, elle est valide, une clé systeme.io fonctionnelle (pas
celle de mon compte tiquiz utilisateur). Pas mieux."

Elle avait raison à chaque fois, et à chaque fois la cause était
ailleurs. Les trois se cachaient l'une derrière l'autre : chaque
correction découvrait la suivante.

### 1. LE CHEMIN QUI MÈNE À LA CLÉ, PAS LA CLÉ

La sonde de production répondait `aucune_cle`, et j'en ai conclu qu'il
fallait poser la clé dans le `.env`. Béné : "ma clé systeme io elle
n'est pas dans le .env, elle est dans mon compte Tiquiz." Elle y était
bien. Ce qui cassait, c'est ce qui mène à elle.

Pour aller la chercher, on résout d'abord l'identifiant du compte
ADMINISTRATEUR, et on le cherchait dans `profiles.email`. Cette colonne
est **NULLABLE et aucun déclencheur ne la remplit**
(`001_initial_schema.sql`) : un compte ouvert avant que `grantPlan` ne
l'écrive n'y a aucune adresse. Chercher un admin là, c'est chercher
dans un annuaire à moitié rempli.

`auth.users` est la seule table où une adresse est garantie :
`idProprietaireViaAuth` l'interroge en repli, sur les deux adresses
admin, avec la même pagination que `grantPlanByEmail`.

### 2. UNE CLÉ REFUSÉE SE LISAIT "CONTACT IMPOSSIBLE"

Une fois la clé trouvée, la sonde répondait `contact_impossible`, ce qui
envoie chercher du côté du contact. Or un 401 rend `null` sur la
RECHERCHE comme sur la CRÉATION : les deux se lisaient pareil. C'est le
défaut que ce fichier existe pour corriger, une couche plus bas.

`cle_refusee` (401/403) est maintenant une raison à part.

**ET ON N'ARBITRE PAS ENTRE LES DEUX CLÉS.** Il en existe deux (son
compte Tiquiz, et le `.env`), et rien dans le code ne peut savoir
laquelle marche. Choisir un ordre définitif serait un pari dans les deux
sens : faire gagner le `.env` fait gagner une valeur périmée le jour où
elle change sa clé dans l'écran Paramètres ; faire gagner la base est ce
qui bloquait. **On les essaie**, un refus passe à la suivante, et le
journal dit laquelle a été acceptée. Jamais deux fois la même valeur :
sinon le journal dirait "deux clés refusées" pour une seule.

### 3. ET LE TAG ÉTAIT HORS DE PORTÉE DEPUIS LE DÉBUT

C'est la trouvaille qui compte, et elle est MESURÉE dans son compte, pas
déduite :

| Question | Réponse |
|---|---|
| combien de tags | plus de 100 (`hasMore: true`) |
| les 100 plus récentes s'arrêtent quand | **24 mars 2025** |
| quand a été créée `newsletter` | **30 juillet 2022** |
| quand ont été créées `tiquiz-free`, `tiquiz-mensuel`... | avril 2026 |

`trouverTag` demandait `?limit=200`. **Le maximum accepté par
Systeme.io est 100.** Le tag `newsletter` était donc INTROUVABLE,
et l'inscription ne pouvait pas aboutir **même avec une clé
parfaitement valide**. Les tags de VENTE, elles, sont dans la
première page : c'est exactement pour ça que le tagging des achats
marchait et que celui de la newsletter n'avait jamais eu la moindre
chance.

On pagine (`startingAfter`), borné à 30 pages : un webhook de paiement
ne reste pas ouvert indéfiniment.

**C'est la leçon des 51 règles d'automatisation, payée deux fois dans
la même semaine : une liste tronquée ne dit pas qu'elle est tronquée.**
Ici elle le disait (`hasMore`), et personne ne le lisait.

### La méthode qui a fini par trancher

Les trois causes ont été trouvées en INTERROGEANT son compte Systeme.io,
pas en relisant le code : le contact de test n'existait pas, le même
corps de création (`{email, locale}`) était accepté par l'API, la liste
des tags s'arrêtait en mars 2025. Trois mesures, trois minutes.

Le contact créé pour ce test a été supprimé après.

Test : `tests/logic/newsletter-cle.test.mts`.


## Un 5xx devant un formulaire perd sa raison (mesuré le 31 août 2026)

Béné : "le test d'inscription gratuite avec un ref ne fonctionne pas :
`/api/auth/signup` 502. Du coup c'est top, on attire du trafic et les
gens peuvent même pas s'inscrire, ça inspire vachement confiance."

**Le compte ÉTAIT créé.** Vérifié en sondant la production puis en
regardant son compte Systeme.io : le contact portait déjà `tiquiz-free`
à la seconde près. Le seul geste qui avait échoué était le DERNIER,
l'envoi de l'email par Resend. Et l'écran annonçait l'inverse.

### Pourquoi l'écran mentait

La route répondait **502**, et Cloudflare, qui sert nos six domaines
(relevé le même jour : `server: cloudflare` sur les six), **remplace le
corps d'un 502** par sa propre page, `error code: 502` en text/plain.
Le `res.json()` du formulaire échouait donc, `reason` valait
`undefined`, et l'écran affichait sa phrase par défaut : "Erreur lors
de la création du compte."

La phrase JUSTE existait déjà (`errEmailFailed` : "ton compte est créé
mais l'email de confirmation n'est pas parti"). Elle n'arrivait jamais.
Et un deuxième essai répondait "adresse déjà inscrite", ce qui achevait
de faire croire à un système cassé.

**Mesuré deux fois le même jour**, sur deux routes indépendantes : le
formulaire de la newsletter le matin, l'inscription l'après-midi. Un
400 de validation, lui, revient avec notre JSON intact.

### La règle

**Un refus MÉTIER sur un chemin lu par un NAVIGATEUR répond 200 avec
`ok: false` et sa raison.** Les 4xx restent (ils passent intacts et ils
disent la bonne chose). Un 5xx ne se justifie que là où un FOURNISSEUR
doit réessayer, c'est à dire dans un webhook : un navigateur ne
réessaie rien tout seul, donc le statut ne lui sert à rien et le corps
lui sert à tout.

Corrigés le 31 août : `auth/signup` (4 sorties), `newsletter`,
`commande/session`, `commande/paypal`, `depart`. Garde-fou :
`tests/logic/corps-avale-par-cloudflare.test.mts`, qui exige aussi que
les webhooks GARDENT leurs 5xx.

**Restent en 5xx, volontairement :** les écrans d'`/admin` (Béné y a
accès au serveur).

🚨 **ET CETTE PAGE A DIT UNE CHOSE FAUSSE ICI (corrigé le 1er septembre).**
Elle écrivait que les routes de génération IA gardaient leurs 5xx "dont
`aiFailure.ts` traduit déjà le statut côté client". **`aiFailure.ts`
n'existait pas dans ce dépôt** : il ne vivait que dans formaquiz. La
doc décrivait donc comme actif un garde-fou absent, ce qui est pire
qu'une doc muette, et c'est exactement la faute du 23 août (un
garde-fou écrit sur une branche et jamais fusionné, décrit ici comme
en place pendant 24 heures).

Il existe maintenant (`lib/aiFailure.ts`), il est le jumeau de celui de
l'Atelier, et il ne porte AUCUNE phrase : l'interface existe en 7
langues, donc le serveur rend la RAISON et l'écran la traduit. La route
des générateurs répond 200 avec `ok: false`, jamais 5xx.

**FAIT LE 3 SEPTEMBRE : les six chemins IA y passent aussi.**
`/api/quiz/generate`, `rebalance`, `rewrite`, `gender-variants`,
`idea-chat` et `/api/embed/quiz/generate` répondaient encore en 500,
502, 503 ou 504 : leur raison n'atteignait jamais la créatrice.

**ET LE DÉFAUT ÉTAIT PIRE QUE LE STATUT.** `/api/quiz/generate`
renvoyait `{ error: "Claude API key missing on the server." }` et le
client AFFICHAIT ce champ tel quel : une créatrice espagnole lisait une
phrase technique en anglais. Le rééquilibrage, lui, faisait
`setRebalanceError(data?.error ?? "Une erreur est survenue.")`, donc une
phrase FRANÇAISE écrite en dur dans une interface qui existe en
7 langues. C'est la faute des replis "Résultat 4" du 1er septembre.

**Règle : `lib/ia/echecIa.ts` répond, `hooks/useEchecIa.ts` traduit.**
Le serveur rend une RAISON, jamais une phrase. Les 9 raisons vivent dans
le namespace `erreursIa` des 7 fichiers de `messages/`, en phrases
NEUTRES : les mêmes servent la génération d'un quiz, un rééquilibrage et
les générateurs. Une raison inconnue retombe sur `generic`, elle
n'affiche JAMAIS sa clé.

**LE DISCRIMINANT EST LE `Content-Type`, PAS LE STATUT**
(`lib/ia/lireEchecIa.ts`). Ces routes STREAMENT : un flux répond
`text/event-stream`, un échec `application/json`. Le client testait
`res.ok` puis lisait `res.body` ; avec un 200 nu il aurait cherché un
flux qui n'existe pas, donc attendu un quiz qui n'arrive jamais. C'est
le piège de ce chantier, et il ne se voit pas en lisant le statut.

**Deux routes gardent leur corps tel quel, et c'est délibéré.**
`gender-variants` affiche déjà une phrase traduite avec le CODE entre
parenthèses pour le diagnostic (design commenté sur place), et la démo
de la page de vente porte des messages de déploiement en français. Là,
seul le statut empêchait le corps d'arriver : le corps ne change pas.

**Le 429 reste un 429**, comme tous les 4xx : ils passent intacts à
travers Cloudflare et ils disent la bonne chose.

Le test `corps-avale-par-cloudflare.test.mts` couvre maintenant les 11
chemins, exige les 9 raisons dans les 7 langues, et refuse qu'un écran
recopie le champ `error` du serveur. Vérifié en rejouant trois versions
d'avant : les trois rougissent. **Le module quiz de Tipote est jumeau :
les 5 mêmes routes y portaient les mêmes 5xx, la correction y vit
aussi.**

### Et ce qu'il reste à faire, qui n'est PAS du code

Resend refuse l'envoi. La cause exacte est dans le journal, à une
commande :

```bash
pm2 logs tiquiz-prod --nostream --lines 200 | grep -i "signup\|Resend"
```

`sendTiquizEmail` écrit `Resend a refuse <statut> <corps>`. Le suspect
le plus probable est le domaine `tiquiz.fr`, basculé le 30 août :
tant qu'il n'est pas VÉRIFIÉ chez Resend (SPF et DKIM posés dans
Cloudflare et validés), tout envoi depuis `hello@tiquiz.fr` est refusé,
y compris les liens de connexion.

## Un segment d'URL n'est PAS décodé par Next (31 août 2026)

Béné ouvre une fiche client depuis le pilotage. Le titre affiche
`blagardette%2Btestaffi2%40gmail.com`, et surtout la ligne "Amené par"
ne s'affiche jamais.

Ce n'était pas un défaut cosmétique. La ligne se cherche dans une table
indexée par l'adresse RÉELLE :

```
attributions["blagardette%2Btestaffi2%40gmail.com"]  ->  undefined
```

Et comme **`@` s'encode toujours en `%40`** dans un segment d'URL, la
recherche échouait pour TOUT LE MONDE, pas seulement pour les adresses à
`+`. Le suivi d'affiliation avait donc l'air de ne connaître personne,
alors que la donnée était là.

**Et la cause est un commentaire qui affirmait le contraire :** la page
portait "Next décode déjà le segment : `a%40b.fr` arrive en `a@b.fr`."
C'est faux. Sa jumelle `app/admin/clients/[email]` décodait, elle. Un
garde-fou qui ne protège qu'un des deux jumeaux ne protège personne, et
une règle écrite en commentaire n'est pas une règle : c'est la
quatrième fois que ce dépôt paie exactement ça.

**Règle : `lireEmailParam()` (`lib/admin/emailParam.ts`), et pas un
`decodeURIComponent` recopié.** Il ne LÈVE jamais (`decodeURIComponent`
jette `URIError` sur un `%` isolé, et une fiche qui répond 500 est pire
qu'une adresse imparfaite), et il normalise en minuscules, puisque
c'est sous cette forme que l'adresse sert de clé partout ailleurs.

**Le `+` n'est PAS converti en espace.** C'est dans une QUERY qu'il vaut
une espace, pas dans un CHEMIN. Le convertir casserait toutes les
adresses en `+alias`, c'est à dire exactement celles avec lesquelles on
teste l'affiliation.

L'autre moitié de cette panne vit chez Tipote : l'attribution ne se
construisait que sur les ventes, jamais sur les inscriptions gratuites.

## Le repli d'expéditeur partait d'un domaine non vérifié (31 août 2026)

Béné : "je n'ai reçu que l'email de bienvenue venant de Systeme.io, pas
celui qu'on est censés envoyer."

`REPLI_EXPEDITEUR` valait `hello@tipote.com`, et le commentaire à côté
justifiait ce choix : "c'est le domaine vérifié de longue date chez
Resend". **Relevé dans son compte Resend le 31 août, c'est faux.** Les
domaines vérifiés sont `tiquiz.fr`, `atelierduquiz.fr` et
**`send.tipote.com`** : `tipote.com` tout court n'y est pas.

Donc, dès que `SUPPORT_FROM_EMAIL` manque dans le processus, l'app écrit
depuis un domaine que Resend REFUSE, et **plus aucun email ne part**,
liens de connexion compris.

C'est le `??` du 2 août dans une autre robe : **une valeur par défaut
qu'on n'a jamais essayée n'est pas un garde-fou, c'est une hypothèse.**
Et le test la figeait, avec pour justification "un repli doit être ce
qui marche à coup sûr" : personne n'avait vérifié que ça marchait.

Le repli est maintenant `hello@tiquiz.fr`. Le contrôle de démarrage
(`lib/env/expediteur.ts`) continue de crier quand la variable manque :
un repli qui marche reste un repli silencieux.

## Une clé Resend appartient à un COMPTE, pas au domaine qu'on regarde (31 août 2026)

Deux sources se contredisaient, et les deux disaient vrai :

| Source | Ce qu'elle disait |
|---|---|
| le tableau de bord de Béné | `tiquiz.fr` -> **Verified** |
| `pm2 logs tiquiz-prod` | `The tiquiz.fr domain is not verified` |

**Une clé Resend appartient à un compte (et à une équipe).** Le tableau
de bord montre le compte qu'on REGARDE ; l'API répond pour le compte de
la clé qu'on ENVOIE. Quand les deux diffèrent, un domaine peut être
parfaitement vérifié d'un côté et inconnu de l'autre, et **rien à
l'écran ne le dit**.

Pendant ce temps, AUCUN email ne partait, et le journal le montre sur
cinq chemins différents : `signupEmail`, `magicLinkEmail`,
`passwordResetEmail`, `responseNotification`, `resellerEmail`. Une
inscription créait bien le compte et laissait la personne dehors.

**Règle : on ne déduit pas d'un tableau de bord ce que l'API répondra.**

```bash
npm run check:resend
```

Il demande à Resend, AVEC LA CLÉ QUE L'APP UTILISE VRAIMENT, la liste
des domaines qu'elle voit, et la compare à l'adresse d'expédition
résolue. Il existe dans les TROIS dépôts, parce qu'un garde-fou qui ne
protège qu'un des jumeaux ne protège personne. Il n'imprime jamais la
clé, seulement son préfixe et sa longueur (règle du 22 août).

C'est la même leçon que les images en 403 : **quand un changement
déplace l'endroit d'où quelque chose est SERVI, la dernière étape n'est
pas d'écrire la configuration, c'est d'aller lire la réponse.**

### CE QUI A RÉELLEMENT DÉBLOQUÉ, ET CE QUE MON CONTRÔLE A DIT DE FAUX

Le contrôle a répondu **401** sur la clé du serveur. Béné l'a remplacée
par celle du compte où `tiquiz.fr` est vérifié, et **les emails
partent**.

Mais le message que ce contrôle affichait était FAUX, et il faut le
dire : il annonçait "elle est révoquée, mal recopiée, ou elle n'a pas
le droit de lire", en mettant les trois sur le même plan. Or **une clé
Resend en `Sending access` répond 401 sur `/domains` tout en
fonctionnant parfaitement** : elle sait envoyer, elle n'a pas le droit
de lister. Sa capture d'écran le montrait d'ailleurs, colonne
Permission.

Le geste a été le bon par chance, pas par diagnostic. **Un contrôle qui
ne distingue pas ce qu'il est censé distinguer est pire qu'un contrôle
absent** (leçon des clés Supabase, 22 août), et je venais de la refaire
dans l'outil écrit pour l'appliquer. Le script nomme désormais les deux
causes, dit où trancher (la colonne Permission), et rappelle que le
journal du serveur, lui, dit toujours la vérité.

**Et ça vaut aussi pour Tipote**, qui retombe sur `hello@tipote.com`
alors que le compte relevé ce jour là vérifie `send.tipote.com` et pas
`tipote.com`. On ne l'a PAS changé : quelle adresse Tipote doit employer
est une décision de Béné, pas une déduction. Le contrôle est là pour
qu'elle la prenne en connaissance de cause.

### Le bloc de qualification : trois passages, et le troisième est le bon (2 septembre 2026)

Béné, sur le premier jet : "le quiz est moche, il prend trop de place :
il faut pouvoir le voir sans scroller. En plus les questions sont
balourdes, elles ne permettent pas vraiment de déterminer si OUI ou NON
Tiquiz est fait pour le visiteur."

Puis, sur le deuxième (les trois questions en colonnes) : "est-ce que
toi, en tant que visiteur tu comprends que c'est un quiz et que tu dois
cliquer pour savoir si Tiquiz est fait pour toi ?? C'est moche pas
ergonomique, pas un 'vrai' quiz, pas pratique, trop compliqué, trop
restrictif, pas assez bien écrit."

**Six reproches, UNE cause : j'avais fait un FORMULAIRE, pas un quiz.**
Un quiz pose UNE question, on clique, on avance, on obtient un résultat.
Un formulaire montre tout d'un coup et attend qu'on remplisse. Corriger
le premier jet en resserrant la mise en page (les colonnes) n'a réglé
que la hauteur, et a laissé les cinq autres reproches intacts.

| Ce qu'elle a vu | Ce qui le causait |
|---|---|
| on ne comprend pas qu'il faut cliquer | des libellés plats, bord gris clair, aucune affordance |
| pas un "vrai" quiz | trois questions ensemble, aucune progression, aucun résultat qui ARRIVE |
| trop compliqué | six options à lire avant de bouger le doigt |
| trop restrictif | UNE réponse discordante sur trois donnait un refus sec |
| pas assez bien écrit | du vocabulaire d'outil ("branches conditionnelles poussées") |
| moche | trois colonnes serrées à 16 px de gouttière |

**Ce qui change, et les quatre points comptent :**

1. **UNE question à la fois**, avec une barre de progression et
   "Question 1 sur 3". C'est ce qui fait qu'un quiz se lit comme un quiz.
2. **Deux gros boutons** pleine largeur, fond bleu clair, flèche à
   droite, qui montent au survol. On ne peut plus les prendre pour du
   texte.
3. **TROIS verdicts**, plus deux. Le refus sec sur une seule réponse
   était le "trop restrictif" : quelqu'un qui veut des leads ET une
   maquette au pixel près se faisait renvoyer, alors que Tiquiz lui va
   très bien sur l'essentiel. Trois réponses discordantes restent un
   vrai non ("Franchement, non."), et le bloc garde donc sa capacité à
   faire sortir quelqu'un.
4. **Un bouton Recommencer**, en `<input type="reset">` NATIF : sans
   lui, on ne peut plus rien changer une fois la troisième réponse
   donnée. Le `<form>` n'existe que pour ça, et il est sûr : la page
   capturée n'en contient aucun autre (mesuré), donc pas d'imbrication.

**LES TROIS REFUS SONT VRAIS, et ce sont exactement les trois secondes
options** : un résultat rédigé sur mesure pour chaque visiteur (Tiquiz
attribue un profil PRÉÉCRIT, `lib/quizScoring.ts`), des logiques
conditionnelles avancées (le parcours est linéaire), un design au pixel
près. Une question de qualification qui ne peut faire sortir personne
n'en est pas une : c'est ce qui avait tué le tout premier jet ("tu vends
quelque chose ?", "tu es prêt à relire l'IA ?").

**Le bloc dit le POSITIONNEMENT, c'est son vrai sujet.** Béné : "Tiquiz
c'est pour les personnes qui veulent capturer des leads et il est
optimisé pour ça, pas pour établir un diagnostic ultra personnalisé ni
pour évaluer finement une personne. [...] c'est UNE partie du système
complet." On ne vend pas un outil de diagnostic, on vend la PORTE
D'ENTRÉE d'un système, et les trois verdicts le disent.

**ZÉRO JAVASCRIPT, et ce n'est pas un caprice** : c'est un script qui a
tué la FAQ de cette page le matin même. Boutons radio + CSS `:has()`
pour l'enchaînement et les verdicts, `<input type="reset">` pour
repartir. Un bloc qui n'a besoin de rien ne peut pas se casser quand on
retire quelque chose.

**LA HAUTEUR EST RÉSERVÉE AUTOUR DE LA CARTE, PAS DEDANS.** Mesuré à
1280x900 et 1440x800 : **763 px dans les CINQ états** (repos, question
2, et les trois verdicts), donc la page ne bouge pas d'un pixel au
moment exact où on la lit. Posée DANS la carte, la réserve affichait
140 px de vide sous une question courte ; dehors, c'est du fond blanc,
donc invisible. Et la ligne "Recommencer" vit hors de la carte, donc
`min-height` ne l'absorbe pas : elle est en `visibility:hidden`, pas en
`display:none`, sinon la page se décalait de 37 px.

**Et la mesure porte sur le GESTE, pas sur l'état au repos** (la leçon
de la FAQ, le même jour) : la sonde CLIQUE vraiment, vérifie que
l'étape 1 disparaît, que l'étape 2 s'affiche, que la jauge avance de
32 px à 187 px, que les trois combinaisons donnent les trois verdicts et
que Recommencer remet tout à zéro.

**Ce que ce bloc n'est PAS :** un quiz Tiquiz. Aucune capture d'email,
aucun tag, aucun profil, rien qui parte nulle part, et le test l'exige.

Garde-fou : les trois tests de `tests/logic/page-vente-v2.test.mts`,
vérifiés en rejouant QUATRE versions d'avant (les trois étapes affichées
d'un coup, le verdict nuancé retiré, la reprise en `display:none`, les
options sans relief) : les quatre rougissent.

**Et ma faute en écrivant le test, qui est la sixième de la semaine :**
mes assertions CSS passaient par `texteVisible()`, qui retire le
`<style>`. Elles portaient donc sur une chaîne d'où la règle testée
avait été enlevée. `regles()` lit le fichier sans les commentaires mais
AVEC le CSS. Un contrôle qui ne distingue pas ce qu'il est censé
distinguer est pire qu'un contrôle absent, et il faut le rappeler à
chaque helper de test qu'on écrit, pas seulement aux clés d'API.

### Les portraits : 1024 x 1024 pour un affichage en 48 x 48 (2 septembre 2026)

Béné : "oui vas y pour les portraits en faisant attention de ne rien
dégrader en qualité pour aucun des devices et moteurs de recherche."

**1286 Ko -> 95 Ko, 93 % de moins, sur 22 fichiers.** Les portraits de
témoignages faisaient 1024 x 1024 et s'affichent en 48 x 48 : vingt et
une fois trop grands.

**LA TAILLE D'AFFICHAGE EST MESURÉE, PAS SUPPOSÉE.** Le maximum relevé
sur QUATRE largeurs (390, 768, 1280, 1920), **toutes images différées
forcées à charger** : une image encore différée rend 0 x 0, ce qui la
ferait passer pour non affichée, et une image petite sur un ordinateur
peut être grande sur un téléphone.

**La cible est TROIS fois l'affichage** (`DENSITE_COUVERTE`). Deux fois
couvre les écrans Retina courants ; trois fois couvre aussi les
téléphones à très forte densité, et sur une vignette de 48 px la
différence entre 96 et 144 pixels coûte quelques kilo-octets. On ne
descend jamais en dessous, et on ne dépasse jamais la taille réelle :
on ne fabrique pas de pixels. `fit: "inside"` et
`withoutEnlargement: true` : on RÉDUIT, on ne recadre jamais.

**Quatre choses ne sont PAS touchées, et c'est ce qui répond à sa
phrase :**

1. **les SVG.** Ils sont VECTORIELS, donc déjà parfaits à toutes les
   densités : les rasteriser serait exactement la dégradation qu'elle
   demande d'éviter. `a787cf8c0b74.svg` (47 Ko) et `22617289340f.svg`
   (97 Ko) sont du vrai vectoriel, 28 et 77 tracés, zéro bitmap dedans.
   **Vérifié dans les fichiers, pas supposé** ;
2. **les GIF animés** : une conversion qui ne demande pas l'animation ne
   garde que la première image, et ça ne se voit qu'en ligne ;
3. **l'`og:image`** (`c7c793ad598e.gif`), celle que les moteurs et les
   réseaux affichent en aperçu. Le test l'exige ;
4. **les fichiers d'origine.** On écrit un fichier NOUVEAU
   (`<nom>-<largeur>.webp`) : la vraie page de vente sert les siens, et
   le chantier ne change rien à ce qui est en ligne.

Et une image dont la marge est faible reste intacte : on ne réduit que
si le réel fait au moins DEUX fois la cible et que le fichier pèse au
moins 10 Ko. Les trois captures 1500 x 999 affichées à 314 px sont donc
laissées telles quelles.

```bash
npm run vente:images              # construit les fichiers reduits
npm run vente:images -- --verifie # dit ce qu'il ferait, n'ecrit rien
```

Le script REFUSE de construire si le fichier ne fait pas la taille que
la table annonce (l'image a été remplacée depuis la mesure), si la cible
n'est pas plus petite que le réel, ou si elle passe sous trois fois
l'affichage. La table pourrait être éditée à la main : le contrôle est
refait à l'exécution.

### ET LA SONDE A TROUVÉ DEUX IMAGES CASSÉES, exposées par le retrait du bundle

En vérifiant qu'aucune image n'était dégradée, deux rendaient
`naturalWidth === 0` : **elles ne s'affichaient pas du tout.**

La capture porte des `data:image/png;base64,/9j/...`. Le préfixe `/9j/`
est la signature d'un JPEG : ces images ANNONCENT du PNG et contiennent
du JPEG. Sur une adresse `data:`, le type déclaré fait foi, donc le
navigateur refuse de décoder. Le bundle React de Systeme.io
reconstruisait ces balises et masquait le problème ; sans lui, elles
sont nues.

**Elles sont dans la capture d'ORIGINE** (4 sur la vraie page, 2 sur la
v2) : on ne les a pas fabriquées. On corrige la DÉCLARATION, pas les
pixels.

**Et l'une des deux est TRONQUÉE à la source** : son base64 ne finit pas
par `ffd9`, la marque de fin d'un JPEG. Les octets manquent, rien ne
peut les rendre. Ce sont des aperçus flous de préchargement
(`tqz-opt-lo`, "optimized low quality"), donc invisibles pour la
lectrice : on retire la balise et ses 3,5 Ko de base64. **Le script
REFUSE de retirer une image tronquée qui porterait un texte
alternatif** : une image qui dit quelque chose se signale, elle ne
disparaît pas en silence.

**La leçon est celle du 22 août, encore : on mesure la page RENDUE, pas
le fichier.** Ces deux images étaient cassées depuis le retrait du
bundle, et aucun test de contenu ne pouvait le voir.

Test : les 7 cas ajoutés à `tests/logic/page-vente-v2.test.mts`.

## Le nom d'un écran s'écrit UNE fois, dans la barre du haut (2 septembre 2026)

Béné : "y'a trop de titres sur une même page c'est tout en doublon : à
quoi ça sert ?? Il faut uniformiser ça."

Cinq écrans passaient leur titre à `AppShell` (qui le rend en `<h1>`
dans la barre) PUIS le réécrivaient en `<h2>` dans un bandeau bleu, mot
pour mot. **Vérifié chaîne par chaîne avant de retirer quoi que ce
soit** : les cinq paires étaient identiques (Mes projets, Statistiques,
Mes leads, Mes Popquiz, Paramètres). Il n'y avait donc rien à perdre,
seulement une ligne à ne plus répéter.

**Règle : `components/ui/page-banner.tsx`, et le bandeau n'a PAS de
prop de titre.** Ce qu'il porte est ce que la barre ne peut pas dire :
la phrase qui explique l'écran, le compteur vivant ("83 leads
capturés"), et les boutons d'action.

**Le bandeau est un COMPOSANT, pas un gabarit à recopier.** Les cinq
écrans portaient le même bloc copié-collé (`gradient-primary rounded-xl
px-5 py-4 ...`), donc cinq occasions de diverger, et c'est exactement
comme ça que le doublon s'est installé partout à la fois. Le test
interdit qu'un écran le redessine à la main.

**Exception : la page d'aide hors session.** Sans session il n'y a pas
de barre, donc pas de titre : il revient dans la page, et c'est le seul
endroit où le `<h1>` est écrit deux fois dans le fichier.

## Aide et contact : UNE entrée, et le tour guidé passe en haut

Béné, le même jour : "sur Tiquiz il y a trop de trucs dans la sidebar :
aide + contact c'est au même endroit = un seul item" et "réactiver le
tour guidé : mets le dans la head bar à côté de 'mon espace'."

Deux entrées répondaient à la même question ("j'ai besoin d'aide"), la
première vers le centre d'aide de Tipote, la seconde vers notre
formulaire. **Deux portes pour un besoin, c'est un choix à faire avant
même d'avoir expliqué son problème.** Il ne reste que `/support`, qui
porte les deux : le centre d'aide en premier (une réponse tout de suite
vaut mieux qu'une réponse demain) et le formulaire dessous, avec
l'adresse déjà remplie quand la session existe.

**Le tour guidé, lui, était introuvable la moitié du temps.** Son
entrée vivait au pied de la sidebar ET ne s'affichait QUE si la carte
d'invitation avait été fermée ou le tour désactivé : tant qu'on n'avait
rien fermé, il n'existait aucun moyen visible de le relancer.
`RestartTourButton` vit maintenant dans la barre, à côté du sélecteur
de projet, et **il est toujours là**. Un raccourci qui apparaît et
disparaît selon un état qu'on ne contrôle pas ne se mémorise pas ; une
place fixe se retient. L'état décide du GESTE (réactiver ou rouvrir
l'accueil du tour), jamais de la présence.

## Mes projets : un aller-retour PAR PROJET, en série (2 septembre 2026)

Béné : "la page 'mes projets' est très longue à charger : il n'y aurait
pas un souci ?"

Il y en avait un, et **il était écrit noir sur blanc au dessus du code
qui le causait.** `GET /api/quiz` agrège les leads en UN appel SQL
(`quiz_leads_summary`) et pose `leads_count` sur chaque ligne, sous ce
commentaire : "le dashboard n'a plus besoin de faire un fetch par quiz
(N+1)". `QuizzesClient` faisait exactement ça, et EN SÉRIE : un
`await fetch("/api/quiz/<id>")` par projet, chacun ramenant le quiz
ENTIER (questions, résultats, leads) pour n'en garder qu'un nombre.
Vingt projets, vingt requêtes à la queue leu leu, et la page blanche
pendant ce temps.

**Cinquième fois que ce dépôt paie une règle écrite en commentaire et
démentie par le code** (le `w-full h-auto` des images de réponse,
l'`ADD_ATTR: ["target"]` des liens légaux, le "Next décode déjà le
segment" du pilotage, le brouillon de question d'Adeline, et celui-ci).

Le test tient les DEUX moitiés : le client ne redemande plus chaque
projet, ET la route agrège toujours. Ne vérifier que la première
afficherait zéro lead partout sans que rien ne rougisse.

Garde-fou : `tests/logic/barre-et-titres.test.mts`.

## Le brouillon d'une question ne suit PAS le visiteur (retour Adeline, 1er septembre 2026)

"On peut revenir en arrière, ce qui est un plus, mais lorsqu'on le fait
ça efface les cases suivantes déjà remplies."

**RIEN N'ÉTAIT EFFACÉ EN BASE**, et c'est ce qui rendait le retour
difficile à croire : `answers` n'est jamais tronqué, aucune ligne de
code ne coupe le tableau. Ce qui suivait le visiteur, c'était le
BROUILLON, c'est à dire l'état de SAISIE de la question affichée.

Il vivait dans QUATRE variables globales au composant (`freeTextDraft`,
`multiOptionsDraft`, `autreTexte`, `autreChoisi`), jamais remises à la
question courante. Cinq symptômes, un seul défaut :

| Ce qu'elle a vu | Ce qui se passait |
|---|---|
| "ça efface les cases suivantes déjà remplies" | le texte tapé en Q3 arrivait pré-rempli en Q4 ; valider ÉCRASAIT la réponse déjà donnée |
| des cases cochées sans les avoir cochées | la sélection d'un multi-choix restait d'une question à l'autre |
| revenir puis cliquer décoche tout | le premier clic repartait d'un brouillon VIDE au lieu de la sélection affichée |
| impossible de tout décocher | l'affichage retombait sur la réponse enregistrée dès que le brouillon était vide |
| le texte du "Autre" invisible au retour | l'option était surlignée, le champ restait FERMÉ |

**LA CAUSE COMMUNE : la question affichée et l'état de saisie n'étaient
reliés par rien.** La remise à zéro était recopiée dans les
gestionnaires de navigation, et il en manquait : la flèche retour vidait
le texte libre, le swipe AVANT non, et les cases cochées n'étaient
vidées nulle part.

**Et un commentaire l'annonçait déjà**, posé sur `multiOptionsDraft` :
"Reset whenever currentQ changes (handled in commitAnswer + an effect
below)". **Cet effet n'a jamais existé.** Quatrième fois que ce dépôt
paie une règle écrite en commentaire et démentie par le code (le
`w-full h-auto` des images de réponse, l'`ADD_ATTR: ["target"]` des
liens légaux, le "Next décode déjà le segment" du pilotage).

**Règle : `lib/quiz/brouillonReponse.ts` décide, et UN SEUL effet
applique.** `brouillonPourQuestion(reponse, autreIdx)` rend les quatre
champs de saisie depuis la réponse de la QUESTION COURANTE ; l'effet
tourne sur `[currentQ, step, quiz, resumed]`. Plus aucune remise à zéro
dans un gestionnaire de navigation : c'est ce qui en oubliait un.

**Et le brouillon est le SEUL à décider de l'affichage.** Les deux
replis du genre `brouillon.length > 0 ? brouillon : réponse
enregistrée` sont SUPPRIMÉS, pas assouplis : **un brouillon vide est une
intention, pas une absence.** C'est ce repli qui rendait "tout décocher"
et "effacer mon texte" impossibles.

`answers` est volontairement HORS des dépendances de l'effet : valider
une réponse le modifie, et relancer l'effet là remettrait le brouillon
de la question qu'on vient de quitter. `resumed` y est, pour le seul cas
où la reprise d'un brouillon local ne change pas l'index.

**Le filet de captures ne pouvait rien voir** : il photographie un écran
au repos, et ce bug ne vit que dans l'enchaînement des gestes. Le
garde-fou est `tests/logic/brouillon-question.test.mts`, vérifié en
rejouant la version d'avant (il rougit).

Le module quiz de Tipote est jumeau : la correction y vit aussi.

## Le menu sous une réponse dit le NOM du profil (retour Christian, 1er septembre 2026)

"Les différents résultats n'apparaissent pas sous les réponses. Seuls
apparaissent « Résultat 1, Résultat 2 » etc."

Il avait raison, et le menu ne POUVAIT rien afficher d'autre : les deux
sélecteurs posés sous chaque réponse de l'éditeur jetaient le profil et
n'en gardaient que le rang.

```
editResults.map((_, ri) => <option>…Résultat {ri + 1}</option>)
                  ^^^ le profil, ignoré
```

Aucun titre, si bien écrit soit-il, ne pouvait apparaître. Sur un quiz à
six profils, "Résultat 4" ne dit rien : la créatrice branche ses
réponses au hasard, ou remonte vérifier l'ordre à chaque clic. C'est le
geste le plus répété de tout l'éditeur.

**LA RÈGLE EXISTAIT DÉJÀ, recopiée à la main quatre fois dans le MÊME
fichier** (`stripHtml(extractResultLabel(cleanPlaceholdersForLabel(t)))`
plus un repli). Deux endroits ne l'ont jamais eue. Une règle recopiée
finit toujours par en oublier un : c'est le `mx-auto` du sous-titre, les
images de réponse, les réseaux de partage, la sixième fois.

**Règle : `lib/quiz/resultLabel.ts`, `resultChoiceLabel(titre,
secours)`, et personne ne recompose.** Les trois étapes comptent et
l'ordre aussi : placeholders interpolés à VIDE (sinon le menu affiche
"Bonjour {name}, tu es le..."), puis `extractResultLabel` (retire le
", tu es le·la" et les marques inclusives), puis `stripHtml` (un
`<option>` ne rend pas de HTML, il montrerait les balises).

**`secours` est OBLIGATOIRE.** Un profil encore sans titre doit rester
choisissable : une entrée vide dans un menu est pire que "Résultat 3".

Ici les quatre autres endroits passaient déjà par la clé traduite
`quizEditor.previewResult` ; côté Tipote, trois replis étaient écrits en
français DANS LE CODE, et une créatrice espagnole lisait "Résultat 4".

**Exception assumée :** `titleForVisual` compose les deux mêmes
fonctions pour le titre d'une IMAGE générée, sans repli et avec sa
propre capitalisation. Ce n'est pas un libellé d'interface, et le
confondre casserait la génération d'images. Le test vise la composition
SUIVIE D'UN REPLI, pas la composition elle-même.

Test : `tests/logic/nom-du-profil.test.mts`. Le module quiz de Tipote est
jumeau : la correction y vit aussi.

### Et un projet qui n'est pas à vous ne téléporte plus personne

Béné, en essayant d'ouvrir le quiz de Christian : "je n'arrive pas à
accéder à ses quiz, je ne sais pas pourquoi, et pire : ça me redirige
directement vers mon dashboard et pas vers une page 'ce quiz n'est pas
disponible'."

On DISAIT bien quelque chose, un toast, mais `router.push("/dashboard")`
partait dans la foulée : elle changeait d'écran avant d'avoir lu la
raison, et se retrouvait sur son tableau de bord sans savoir pourquoi.
Un toast qui accompagne une navigation n'est pas un message, c'est un
reflet.

**Règle : les quatre éditeurs affichent un ÉCRAN** (titre, phrase, et
UNE sortie nommée qui passe par `projectBackHref`, donc la hiérarchie et
jamais l'historique). Plus aucune redirection sur un chargement qui
échoue. Seul le mode EMBED garde le toast : il n'a pas de tableau de
bord où retourner.

**On ne distingue pas "supprimé" de "pas à toi", et c'est voulu** : la
route répond 404 dans les deux cas pour ne pas révéler qu'un projet
existe. La phrase dit donc les deux possibilités, plus la seule chose
qui inquiète vraiment : rien n'a été modifié.

**Trouvé au passage** : deux de ces quatre écrans affichaient
`toast.error("Quiz not found")`, écrit en dur EN ANGLAIS dans une
interface qui existe en 7 langues. Les clés `unavailableTitle` et
`unavailableBody` sont posées dans les 7 fichiers.

## Deux liens, le même mot, deux gestes opposés (retour Christian, 1er septembre 2026)

Béné : "est-ce que c'est bien expliqué, la différence entre le lien de
partage pour FAIRE le quiz et celui pour COPIER le quiz dans son compte ?"

Non, et l'écran faisait tout pour les confondre :

| Le geste | Où | Comment il s'appelait |
|---|---|---|
| donner le lien pour RÉPONDRE au quiz | onglet de l'éditeur | "Partager", icône `Share2` |
| donner une COPIE du quiz à quelqu'un | carte de Mes projets | "Partager ce quiz", icône `Share2` |
| se dupliquer le quiz à soi même | carte de Mes projets | "Dupliquer", icône `CopyPlus` |

**Même mot, même icône, et le deuxième est le seul qui donne son
travail.** Un créateur qui colle ce lien à son audience installe son
quiz dans le compte de chaque personne qui clique. Le texte du panneau
était juste et complet, mais il fallait l'ouvrir pour le découvrir :
l'entrée, elle, disait le contraire.

**Règle : le geste se nomme par son VERBE, pas par sa famille.**
"Donner une copie du quiz", icône `Gift`, distincte des deux autres. Et
la première ligne du panneau pose le contraste AVANT le bouton
(`partageQuiz.notPublicLink`, 7 langues) : "ce n'est PAS le lien pour
faire passer le quiz, celui-là est dans l'onglet Partager de l'éditeur".

**Trois gestes voisins ne peuvent pas porter deux icônes.** Le premier
jet remplaçait `Share2` par `CopyPlus`... qui est déjà l'icône de
"Dupliquer". On déplaçait la collision au lieu de la retirer.

## Vérifier que le bouton du quiz porte bien l'identifiant (Béné, 1er septembre 2026)

"On peut vérifier que l'url du CTA du quiz se voit bien attribuer l'id
de l'affilié au bon format ? Il faut récupérer l'id dans l'url
(`?sa=sa...`) et l'ajouter à l'url du CTA."

```bash
npm run check:cta-affilie -- "https://quiz.tipote.com/q/mon-quiz?sa=sa0007..."
```

Il va chercher le VRAI quiz sur le serveur et imprime l'adresse que
portera chaque bouton (fin de quiz, chaque profil, quiz fermé). Il
appelle les MÊMES fonctions que le viewer (`lireAffiliateDuQuiz` puis
`attacherAffiliate`) : un script qui réécrirait la règle finirait par
dire le contraire de ce que le visiteur voit, c'est le défaut sorti six
fois dans ces dépôts.

**LE PIÈGE QU'IL EXISTE POUR ATTRAPER : un `sa` mal formé est jeté SANS
BRUIT.** C'est voulu, cette valeur finit dans un versement. Mais à
l'écran rien ne le montre : le bouton mène quelque part, il ne porte
simplement rien. Le script dit la longueur reçue et la forme attendue
("sa" + 20 à 80 caractères hexadécimaux, `lib/affiliate/saFormat.ts`).

**Ce qu'il ne peut PAS vérifier, et il le dit :** la deuxième moitié
appartient au vendeur. Systeme.io pose SON cookie quand le visiteur
atterrit sur SA page ; nous, on ne fait que coller l'identifiant sur le
bouton. Et leur API n'expose AUCUN moyen d'assigner un affilié à un
contact (mesuré : l'écriture d'un contact n'accepte que des champs et
une langue). Un contact créé par notre capture d'email affichera donc
toujours "Affilié : Aucun" tant que la personne n'a pas cliqué le
bouton.

## Une valeur d'URL n'est pas un motif de recherche (1er septembre 2026)

Dans un LIKE Postgres, **`_` remplace n'importe quel caractère** et `%`
n'importe quelle suite. Or `_` est parfaitement légal partout : dans une
adresse email, et rien n'empêche quelqu'un de le taper dans une URL.

La passe du 31 août avait couvert les recherches de COMPTE, chez Tipote
seulement, et cette page n'en disait rien : **un garde-fou qui ne protège
qu'un des deux jumeaux ne protège personne**, et une règle absente de
cette page est une règle que le prochain passage ne connaît pas.

Le même joker vivait sur `slug`, `hostname` et `code`, tous lus dans une
URL publique. **18 fichiers ici, 29 côté Tipote.** Le plus coûteux :

**`/q/mon_quiz` pouvait servir le quiz d'une AUTRE créatrice**, ou n'en
servir aucun : deux lignes trouvées font échouer `maybeSingle`, donc un
404 sur un quiz qui existe et qui tourne peut être en publicité payante.

**ON ÉCHAPPE, ON NE PASSE PAS À `.eq`.** `.eq` serait plus simple, mais
la casse des valeurs stockées n'est pas garantie (imports Systeme.io,
slugs historiques) : empêcher un accès serait PIRE que le bug corrigé.
`echapperMotifLike` (`lib/db/motifLike.ts`) ne change RIEN au
comportement, sauf exactement le cas fautif. Le `\` s'échappe EN
PREMIER, sinon on échapperait les barres qu'on vient d'ajouter.

**Le garde-fou BALAIE tout le dépôt, il ne surveille pas une liste de
fichiers.** Une liste oublie le prochain fichier écrit, et c'est
exactement comme ça que ces endroits sont arrivés. Vérifié en rejouant
la version d'avant (le test rougit).

Test : `tests/logic/email-pas-un-motif.test.mts`.

## Une entité HTML sans balise autour (retour Christian, 1er septembre 2026)

Le titre de son 4e résultat revenait de la base ainsi, et s'affichait tel
quel sur sa page de résultat :

```
Ce n'est pas parce que tu n'es pas doué...&nbsp ;
```

**C'était nous.** La typographie française insère une espace devant `;`,
`?`, `!` et `:`. Elle a donc coupé l'entité `&nbsp;` en deux.

**Le garde-fou existait, et il a été contourné par la DÉTECTION.**
`applyFrenchTypographyToHtml` découpe correctement sur les balises ET les
entités ; c'est `applyFrenchTypography` qui choisissait entre les deux
versions, et sa règle était :

```
const LOOKS_LIKE_HTML = /<[a-z!/][^>]*>/i;
```

**Une chaîne peut porter une ENTITÉ sans porter la moindre balise**, et
c'était exactement son cas. Elle partait donc vers la version texte brut,
celle qui ne sait pas ce qu'est un `&nbsp;`.

**Règle : on ne choisit plus.** `applyFrenchTypography` passe TOUJOURS par
le découpage. Sur du texte sans balise ni entité, les deux rendaient déjà
le même résultat (un seul `fixFragment` sur toute la chaîne) : il n'y
avait donc rien à arbitrer, seulement une occasion de se tromper. C'est
la leçon écrite vingt lignes plus haut dans le même fichier ("quand une
erreur ne coûte rien à commettre et détruit du travail en silence, on
rend l'erreur IMPOSSIBLE"), appliquée à la détection elle-même.
`LOOKS_LIKE_HTML` est SUPPRIMÉE, pas laissée sans appelant.

**Et un champ déjà cassé se répare au prochain enregistrement.**
`reparerEntitesCassees()` recolle `&nbsp<espace>;` avant le découpage :
une entité coupée en deux ne redevient jamais une entité toute seule, et
la cliente n'a aucun moyen de savoir d'où sort ce texte. Même geste que
`applyFieldFontSize`, qui répare un champ abîmé au premier clic (1er
août).

**LISTE FERMÉE d'entités, et c'est voulu** : `nbsp`, `amp`, `lt`, `gt`,
`quot`, `apos` et les formes numériques. `M&M ;` est de la prose
parfaitement légitime, et le recoller réécrirait ce que la cliente a
écrit.

### Et ce qui est déjà cassé en base s'affiche juste, sans migration

Béné, en lisant la première correction : "ce genre de souci on l'a eu
mille fois et il revient toujours, il faut vraiment le corriger et s'en
débarrasser définitivement, j'en ai marre de corriger toujours les mêmes
choses."

Corriger à l'ENREGISTREMENT ne suffisait pas : le texte abîmé est DÉJÀ en
base chez des clientes. Il aurait fallu que chacune rouvre et
ré-enregistre chaque champ, un par un, pour faire disparaître un texte
qu'elle n'a jamais tapé.

**`sanitizeRichText` et `stripHtml` réparent donc au PASSAGE.** Tout ce
qui s'affiche est juste, immédiatement, sans toucher à une seule ligne de
la base et sans migration. La base garde sa valeur abîmée jusqu'au
prochain enregistrement du champ, qui la recolle pour de bon.

**Et le vrai invariant est l'IDEMPOTENCE.** Une règle qui INSÈRE une
espace tourne à CHAQUE enregistrement : si sa sortie n'est pas un point
fixe, le texte dérive un peu plus à chaque sauvegarde et personne ne voit
rien avant que ce soit illisible. C'est ça, "il revient toujours". Le
test l'exige maintenant sur une batterie de cas (deux fois ET trois fois,
parce qu'un cycle de période 2 passerait un test qui n'applique que deux
fois), plus une liste de chaînes techniques qui ne doivent pas bouger
d'un caractère : une URL avec `?`, un `style="color:red"`, `12:30`,
`&nbsp;`, `&amp;`, `&#233;`.

Test : les 7 cas ajoutés à `tests/logic/french-typography.test.mts`,
vérifiés en rejouant la détection d'avant (5 rougissent).

## L'onglet Automatisation : ce qu'il faut créer dans Systeme.io (Béné, 1er septembre 2026)

"Un onglet Automatisation, en plus de créer, partager, résultats, qui
explique le workflow et les tags précis à créer dans Systeme.io pour
envoyer ce qu'il faut à qui en a besoin. **Pas un truc générique, un truc
réel** qui explique selon le bonus offert, le CTA, les profils de
résultats."

**CE QUE ÇA RÉPARE, ET C'EST LE TROU LE PLUS CHER DU PRODUIT.** Tiquiz
POSE des tags sur le contact Systeme.io. Mais poser un tag
ne déclenche RIEN tant qu'aucune règle d'automatisation ne l'écoute, et
ces règles se créent à la main dans leur tableau de bord (mesuré le
31 août). Une créatrice met son quiz en ligne, capte 40 adresses, et il
ne se passe rien. Elle n'en conclut pas qu'il lui manque une règle : elle
en conclut que Tiquiz ne sert à rien.

**Règle : `lib/automatisation/planSysteme.ts` décide, et il n'annonce que
ce qui part VRAIMENT.** C'est tout l'enjeu du "pas générique" : les six
familles de tags n'ont pas les mêmes conditions, et une liste qui
les récite toutes enverrait la créatrice construire des workflows sur des
tags qu'elle n'aura jamais.

| Tag | Part quand |
|---|---|
| profil (`sio_tag_names`) | QUIZ seulement, un sondage n'a pas de résultat |
| `sio_capture_tag` | SONDAGE seulement |
| par réponse (`options[].sio_tag_name`) | SONDAGE seulement |
| score (`score-<tranche>`, `<axe>-<tranche>`) | si `sio_score_tags` est coché |
| `sio_share_tag_name` | dès qu'il est RENSEIGNÉ, sans regarder `virality_enabled` |
| formation / communauté | **rien à créer** : Tiquiz ouvre l'accès lui même |

**Le dernier cas est le piège inverse** : une règle de plus ouvrirait
l'accès DEUX fois, et ça ne se voit qu'en recevant deux emails. La carte
dit donc de ne rien faire.

**Les tags de score sont CALCULÉS au moment de la réponse**, à partir
des libellés de la créatrice. L'écran en fait donc UNE LIGNE PAR VALEUR
POSSIBLE (`tagsDeScorePossibles`) : une ligne = une règle à créer.
Annoncer un motif obligeait à le déplier de tête. Et `slugifyAxisLabel`
n'accepte que `[a-z0-9_]` : "En route" donne `score-en_route`, avec un
SOULIGNÉ. Deviner un tiret ferait créer une règle sur un tag qui
n'arrive jamais.

**Le module ne rend AUCUNE phrase**, seulement des données (le type de
groupe, le tag exact, le contexte) : l'interface existe en 7 langues, et
c'est l'écran qui écrit. Le nom du tag est CLIQUABLE-COPIABLE : c'est le
seul endroit où une faute de frappe casse tout en silence.

### LA RECETTE EST DITE UNE FOIS, PAS UNE FOIS PAR TAG (même jour)

Premier jet : une carte par tag, chacune répétant les trois mêmes clics.
Béné : "empiler les conseils qui disent la même chose t'es sûr que c'est
le plus lisible, pratique, intelligent ? Genre 1 : les profils et 2 : le
bonus de partage. Et ensuite tu n'en répètes pas, tu fais un truc facile
à lire sans avoir besoin de scroller pendant mille ans."

Elle avait raison, et c'est mesurable : les trois clics sont IDENTIQUES
pour tous les tags. Un quiz à six profils affichait donc **dix-huit
lignes de marche à suivre pour six informations**.

**Le module rend des GROUPES** (`groupes`, pas `etapes`), chacun avec sa
liste de tags. L'écran écrit la recette UNE seule fois, en haut, et
chaque groupe ne porte plus que ses noms de tags. L'ordre des groupes
est celui du parcours, et le groupe "rien à créer" passe en dernier :
c'est une note, pas une tâche. Le test interdit que `recette1/2/3`
apparaisse plus d'une fois dans le composant.

**Et la page NE DÉFILAIT PAS.** L'éditeur est en
`h-screen ... overflow-hidden` : sans conteneur défilant, tout ce qui
dépasse est simplement inatteignable. Le panneau porte donc
`flex-1 overflow-y-auto`, et le test le fige.

### LE NOM D'UN PROFIL PASSE PAR `resultChoiceLabel`

Ce qu'elle a lu à l'écran, mot pour mot :

```
Le profil "<div class="rt-field-fs" style="--rt-fs-m&nbsp;: 24px">Team Capture..."
```

Le titre d'un profil est du texte RICHE : il porte des balises et des
variables. **La règle avait été écrite le matin même** (retour
Christian, `lib/quiz/resultLabel.ts`) et je l'ai oubliée le lendemain,
dans le module qui l'aurait le plus utilisée. **Une règle qui n'est pas
APPELÉE ne protège de rien** : ce n'est plus "elle n'existe pas", c'est
"elle existe et personne ne l'appelle", ce qui est pire parce qu'on
croit le sujet réglé.

Le module lui passe un secours VIDE (il ne traduit pas) et porte le
`rang` à côté : un profil encore sans titre s'affiche "Profil 2" dans la
langue de la créatrice.

### LA CLÉ SYSTEME.IO AVAIT BIEN ÉTÉ SORTIE DE LA COLONNE

Béné : "en réorganisant la sidebar on a viré le choix de la clé Systeme
io du coup j'ai une erreur. Dans l'onglet partager c'était juste pour le
bonus de partage et donc le tag de partage."

**J'ai d'abord répondu qu'elle n'y avait jamais été. C'était faux**, et
`git log` le dit en une commande :

| Date | Onglet qui portait le sélecteur |
|---|---|
| jusqu'au 24 août | `create`, donc la COLONNE |
| 25 août | `share`, à l'intérieur du bloc `virality_enabled` |
| 1er septembre | `create`, remis dans "Gestion du quiz" |

C'est la refonte de la colonne en `SettingsSection` (25 août) qui l'a
emporté dans l'onglet Partager, avec le bloc du bonus de partage. Une
créatrice qui ne propose pas de bonus n'avait donc **aucun moyen** de
choisir sa clé pendant une semaine, et rien ne le disait.

**La leçon vaut plus que la correction : quand on REGROUPE un écran, on
compte ce qui entre et ce qui sort.** Sept sections entraient, six sont
ressorties, et personne n'a compté. Et quand quelqu'un dit "on a viré
X", `git log -S "X"` répond en dix secondes : je l'ai contredite de
mémoire avant de mesurer.

`QuizSioKeyPicker` prend une `variante` (`"carte" | "colonne"`), et le
rendu de la colonne reprend l'idiome des autres réglages (un `<h3>` à la
même taille, l'aide en `text-[11px]`, le select pleine largeur). Une
carte au milieu de sept sections plates se voit comme une pièce
rapportée. **Il n'y en a plus qu'UN seul endroit** : le groupe "Gestion
du quiz", pour le quiz comme pour le sondage.

### ET LE BANDEAU ROUGE ACCUSAIT UNE COLONNE QUI N'EST PAS LA CLÉ

Sur sa capture, le panneau annonçait "Aucune clé Systeme.io n'est reliée
à ce quiz" sur un quiz dont les tags partaient très bien.

`quiz.sio_api_key_id` est une **SURCHARGE par quiz** (le cas du
freelance qui envoie les leads d'UN quiz vers le compte de son client).
Vide, elle veut dire "pas de surcharge" : `resolveApiKey` retombe sur la
clé par défaut du compte, puis sur n'importe laquelle, puis sur la clé
historique. Le bandeau sortait donc chez **presque tout le monde**.

C'est le `??` du 2 août dans une autre robe : **une colonne vide ne veut
pas dire "pas de clé", elle veut dire "pas de surcharge".**

**Règle : le fait est un PARAMÈTRE OBLIGATOIRE** (`cleReliee`), et il se
lit là où on demande VRAIMENT ses tags à Systeme.io, c'est à dire dans
`SioTagsProvider`. Le panneau construit donc son plan lui même : il est
le seul à être DANS le provider. `cleRelieeDepuisTags` est pure :
des tags reçus (liste vide comprise) -> la clé répond ; `noApiKey` ->
on le dit ; une erreur ou rien encore -> **`null`, et on se tait**.
Un avertissement affiché à tort fait chercher au mauvais endroit, ce qui
est exactement ce qu'on répare.

### PORTÉ DANS TIPOTE le 1er septembre

L'onglet, le module et les 7 langues vivent des deux côtés. **Une seule
phrase diffère, et c'est voulu** : Tipote n'a pas de clé par quiz (pas
de table `sio_api_keys`), la sienne vit dans Réglages > Connexions, pour
tout le compte. `manqueCle` y renvoie donc là bas.

**Ce qui manque est dit à part, et le bloquant passe devant** : sans clé
Systeme.io reliée, aucun contact n'est créé et aucun tag n'est
posée, donc tout le reste de l'écran serait un plan pour rien.

**On ne réclame le tag de partage QUE si un bonus de partage est promis**
(`virality_enabled`). Les simples boutons de partage de la page de
résultat sont vrais par défaut : crier là dessus ferait rougir l'écran de
presque tout le monde, et un avertissement qui sort pour rien finit
ignoré.

**Endroits à respecter :** `lib/automatisation/planSysteme.ts` (pur),
`components/quiz/AutomatisationPanel.tsx`, `QuizDetailClient.tsx` et
`SurveyDetailClient.tsx` (le 4e onglet). Le filet de captures ne couvre
pas l'éditeur : le garde-fou est
`tests/logic/plan-automatisation.test.mts`.

**Porté dans Tipote le 1er septembre** : même onglet, même module,
mêmes 7 langues. Voir plus bas la seule phrase qui diffère.

## Les trois générateurs de contenu (Béné, 1er septembre 2026)

"Pour les générateurs oui on va le faire pour les membres + et les
beta/lifetime, ça doit être visible pour les membres gratuits et sans
plus : s'ils veulent s'en servir on leur propose d'upgrader. On doit le
faire BIEN, sur une page générateurs : l'user choisit quel générateur il
veut utiliser (3 cartes cliquables), ensuite un nouvel onglet s'ouvre,
l'user choisit le quiz pour lequel il veut créer, comme sur l'Atelier."
Et : "fais ça bien, pas à l'arrache comme pour l'onglet automatisation."

| Le générateur | Ce qu'il écrit | Il marche sur |
|---|---|---|
| le BONUS | le bonus entier, comment le fabriquer, les textes qui le remettent | un quiz dont les profils sont remplis |
| les EMAILS | une séquence post-quiz, écrite pour UN profil | idem |
| la PROMO | des emails d'invitation et des posts | tout, sondage compris |

### CE QUE LA CRÉATRICE SAISIT : SON OFFRE, ET RIEN D'AUTRE

C'est la leçon de l'Atelier reprise telle quelle (Béné, 5 août : "on ne
réutilise pas assez les données du quiz"). Le titre, la promesse
d'accueil, le ton (tu/vous), la langue, les profils, leurs tags et
l'adresse publique sont RELUS CÔTÉ SERVEUR à chaque appel
(`lib/generateurs/briefQuiz.ts`). Un formulaire qui redemande ce qu'on
sait produit des réponses vagues, donc un contenu vague.

Le brief ne transite JAMAIS par le client : sans ça, n'importe qui
pourrait annoncer un autre quiz que le sien et faire écrire du contenu
sur des profils qui ne lui appartiennent pas.

### DEUX ÉTAPES, ET UN MORCEAU À LA FOIS

`pistes` rend trois pistes en JSON court, `produire` rend UN morceau.
Générer tout d'un coup, c'est exactement ce qui a sorti du JSON BRUT à
l'écran devant des élèves de l'Atelier le 3 août : la réponse coupée à
la limite de tokens, `JSON.parse` qui échoue, et l'écran qui montre
notre panne au lieu du livrable.

**L'INDEX D'UN MORCEAU EST RECALCULÉ, jamais recopié du modèle.** Il
rend parfois deux "email 1", ou saute de 1 à 3 : une numérotation à trou
fait écrire deux fois le même email et en oublier un autre, en silence.

**Et les morceaux s'écrivent EN SÉRIE, jamais en parallèle** : trois
appels simultanés donnent un 429 et deux morceaux sur trois vides
(drame Fabienne, Atelier, 4 août). Un morceau qui échoue n'emporte pas
les suivants, et ce qui est déjà écrit reste à l'écran.

**Les trois blocs du BONUS sont imposés par nous**, pas choisis par le
modèle : il en oublierait un une fois sur trois, et la créatrice se
retrouverait avec un bonus qu'elle ne sait pas livrer. Pour les deux
autres, le nombre est une décision éditoriale : c'est la piste qui le
porte, bornée par `MAX_PIECES`.

### LE SOCLE EST CACHÉ, DONC IL N'INTERPOLE RIEN

`lib/prompts/generateurs/socle.ts` est le SEUL bloc marqué
`cache_control`, et il décrit les TROIS générateurs alors qu'un appel
n'en sert qu'un : un socle par générateur donnerait trois préfixes,
donc trois caches à réchauffer.

**Le cache d'Anthropic est un PRÉFIXE EXACT.** Une seule valeur du brief
glissée dans le socle, et il change à chaque appel : on paie alors
l'ÉCRITURE du cache (1,25 fois le prix) sans jamais le relire, c'est à
dire pire que pas de cache. Le test interdit toute interpolation et
mesure sa longueur (en dessous de 1024 tokens, Anthropic ignore le
`cache_control` EN SILENCE). La seule preuve que ça marche est dans les
compteurs `usage` que la route journalise.

### CE QUI EST DIT AU MODÈLE, ET POURQUOI

- **La langue est NOMMÉE**, jamais laissée en code ISO : `pt-BR` fait
  écrire du portugais européen une fois sur deux. Une langue inconnue ne
  retombe PAS sur le français (leçon du robot d'aide, 31 août).
- **Le ton du quiz est imposé**, pas redemandé.
- **Le lien du quiz n'est donné QUE là où il doit apparaître** : dans la
  promo et dans les textes de remise. Le CONTENU du bonus se lit hors
  ligne, y coller l'adresse renverrait le lecteur vers le quiz qu'il
  vient de finir.
- **Un champ vide est OMIS**, jamais rendu avec un tiret : une ligne
  "OFFRE : -" apprend au modèle qu'il a le droit d'en inventer une.

### CE QUE L'ÉCRAN NE DÉCIDE PAS

Quel générateur marche sur quel projet (`blocageGenerateur`), quels
morceaux il produit (`piecesDeLaPiste`), comment se rend le Markdown
(`markdownVersHtml`) : tout vit dans `lib/generateurs/`, en fonctions
pures et testées. **Un projet bloqué est MONTRÉ, avec sa raison** : le
griser sans un mot se lit comme un bug (règle du 22 août).

**Le rendu s'affiche, le Markdown reste copiable à côté** : montrer
`## Titre` et `**gras**` serait la même faute que le JSON brut. Et ce
texte vient d'un modèle, donc d'ailleurs : tout est échappé,
guillemets compris, et un `href` qui n'est pas http, https ou mailto
n'est jamais rendu cliquable.

### LE VERROU EST DANS LA ROUTE, PAS À L'ÉCRAN

L'écran MONTRE les trois cartes à tout le monde et propose de monter de
palier ; c'est `app/api/generateurs/route.ts` qui refuse
(`canUseAIAnalysis`, donc beta / lifetime / mensuel PLUS / annuel PLUS).
Un gate posé seulement à l'écran laisse la porte de l'API grande
ouverte, et c'est par l'API qu'on récupère le contenu.

### L'ADRESSE PUBLIQUE VIT DÉSORMAIS À UN SEUL ENDROIT

`lib/quiz/urlPublique.ts`. La règle était enfermée dans
`hooks/useShareDomain.ts`, donc côté navigateur seulement ; les
générateurs tournent côté serveur et mettent cette adresse dans des
emails et des posts. Une deuxième écriture aurait donné deux adresses
pour le même quiz, et c'est celle du contenu généré qui serait partie
dans une campagne. Le hook appelle la fonction, le serveur aussi.

**Le domaine perso de la créatrice gagne** : c'est celui qu'elle
partage. Et `surDomainePerso` est un PARAMÈTRE, jamais deviné à la
forme de l'adresse.

**Endroits à respecter :** `lib/generateurs/{catalogue,briefQuiz,blocs,offre,markdown}.ts`,
`lib/prompts/generateurs/{socle,consignes}.ts`, `lib/aiFailure.ts`,
`lib/quiz/urlPublique.ts`, `app/api/generateurs/route.ts`,
`app/generateurs/`. Test : `tests/logic/generateurs.test.mts`.
**Le module vit dans les DEUX dépôts** : toute évolution se porte des
deux côtés, y compris les DEUX écrans, identiques à l'octet près.

**Les deux différences assumées, et elles sont chez Tipote :** il ouvre
les générateurs à tout compte payant (il n'a pas de palier "PLUS"), et
ils y CONSOMMENT DES CRÉDITS (Tiquiz n'en a pas). Le compteur est donc
une PROP optionnelle de l'écran, nulle ici, et `lib/generateurs/credits.ts`
ne vit QUE là bas : un module mort ici serait un piège que le prochain
passage rebrancherait en croyant réparer. Le barème et le calcul qui
l'a produit sont dans l'`AGENTS.md` de Tipote.

## Les générateurs, deuxième passage (Béné, 2 septembre 2026)

Quatre reproches, et le premier rendait la fonctionnalité entièrement
inutilisable.

### 1. LE GÉNÉRATEUR NE TROUVAIT PAS LA CLÉ ANTHROPIC

"Le générateur de bonus ne fonctionne pas j'ai un message d'erreur c'est
relou." L'écran disait "L'écriture n'est pas disponible pour le moment.
On est prévenus.", c'est à dire `not_configured`, c'est à dire "aucune
clé".

Il y en avait une, et toutes les autres fonctions IA la trouvaient très
bien. **La route des générateurs lisait `ANTHROPIC_API_KEY` TOUT COURT,
quand les NEUF autres endroits lisent `ANTHROPIC_API_KEY` PUIS
`CLAUDE_API_KEY_OWNER`.** Sur le serveur, c'est la seconde qui porte la
valeur : les générateurs étaient donc le seul écran incapable d'écrire
quoi que ce soit.

**Neuf copies de la même résolution, et la dixième était fausse.** Une
règle recopiée finit toujours par en oublier un : c'est le `mx-auto` du
sous-titre, les images de réponse, les réseaux de partage, les libellés
de profil. Ici l'oubli coûtait une fonctionnalité entière, et en
silence, parce qu'un écran qui dit "pas disponible" a l'air de parler
d'une panne passagère. `lib/ai/cleAnthropic.ts` est le seul endroit,
et le test l'exige des dix appelants.

**Chez Tipote c'est pire, et le module y est donc indispensable :**
TROIS noms circulent (`CLAUDE_API_KEY_OWNER`, `ANTHROPIC_API_KEY`,
`ANTHROPIC_API_KEY_OWNER`) et deux fichiers ne les lisent pas dans le
même ordre. Là bas le module les essaie tous, et **CRIE quand deux
portent des valeurs DIFFÉRENTES** : l'ordre déciderait sinon laquelle
est facturée, et c'est une question pour un humain.

### 2. UN GÉNÉRATEUR D'EMAILS ÉCRIT DES EMAILS, PAS DES PISTES

"Le générateur d'emails ne génère pas 'des pistes' mais des emails
putain t'as fait n'imp."

Elle a raison, et c'est la faute du 1er août : une mécanique écrite pour
un cas, appliquée telle quelle à un autre. J'avais fait passer les TROIS
générateurs par "trois pistes au choix", alors que ça ne veut dire
quelque chose que pour UN.

L'Atelier fait la distinction depuis le début : son labo BONUS a bien
ses pistes (la créatrice choisit QUEL bonus elle fabrique), son funnel
EMAILS n'en a aucune (un bouton, cinq emails). Parce qu'il n'y a rien à
choisir : une séquence post-quiz a toujours les mêmes cinq temps.

| Générateur | Pistes ? | Pourquoi |
|---|---|---|
| bonus | OUI | le bonus est une CRÉATION : trois idées valent mieux qu'une imposée |
| emails | NON | la séquence a des temps fixes, elle se déroule |
| promo | NON | annoncer un quiz est une routine, pas une création |

**Règle : `lib/generateurs/sequences.ts`.** Les cinq temps de la
séquence sont ceux de l'Atelier, MOT POUR MOT (`lib/funnelSequence.ts`
là bas) : ils ont été corrigés par les retours de vraies élèves et ils
sont enseignés dans la formation. Les réécrire ici donnerait deux
méthodes pour la même chose, et Tiquiz serait celui qui se trompe. La
promo a son propre plan, trois emails et quatre publications, chacune
par un angle DIFFÉRENT (quatre posts qui disent la même chose autrement,
c'est un post publié quatre fois).

**`piecesDeLaPiste` ignore ce que le modèle déclare** dès qu'un plan
fixe existe, et la route REFUSE l'étape des pistes sur ces générateurs :
un écran resté sur l'ancienne version dépenserait des jetons (et des
crédits, côté Tipote) pour rien.

**L'intention part dans le PROMPT, le rôle s'affiche TRADUIT.**
`resume` porte la consigne au modèle, en français ; `cle` est traduite
par l'écran dans les 7 langues. Afficher `resume` tel quel serait le
"Résultat 4" du 1er septembre.

### 3. PLUSIEURS ÉTAPES QUI S'ENCHAÎNENT, PAS UNE PAGE QUI EMPILE

"Tu n'as pas repris la belle mise en page facile de l'Atelier [...] fais
plutôt plusieurs étapes qui s'enchaînent qu'une longue page qui empile
les infos."

L'écran affichait TOUT en même temps : le projet, le profil, l'offre,
les pistes et les contenus. À l'ouverture, quatre sections dont trois
qu'on ne peut pas encore remplir.

**Règle : `lib/generateurs/parcours.ts`**, et les étapes dépendent du
générateur (c'est tout l'intérêt) :

```
bonus  : projet -> réglages -> pistes -> contenus
emails : projet -> réglages -> contenus
promo  : projet -> contenus
```

Faire traverser une étape vide à la promo serait un clic pour rien. Le
fil des étapes en haut se reclique : **revenir en arrière doit être
aussi facile que d'avancer**, sinon on recommence tout pour corriger un
mot. Et une étape qu'on ne peut pas franchir DIT ce qui manque, elle ne
se contente pas d'un bouton gris.

**Sur l'étape des pistes il n'y a pas de bouton "Suivant"** : on avance
en CHOISISSANT une piste. Un bouton à côté mènerait à un écran de
contenus sans rien à écrire.

### LE PROJET SE CHOISIT DANS UN MENU, PAS DANS UNE GRILLE (3 septembre)

Béné : "générateurs : menu déroulant au lieu des cartes de quiz."

Une carte par projet donne une page interminable dès qu'on en a vingt,
et le geste ici est un CHOIX dans une liste, pas une exploration. Les
autres grilles restent (les profils, les pistes, les contenus) : là on
COMPARE, donc la carte a un sens.

**CE QUI NE DEVAIT PAS SE PERDRE : un projet bloqué DIT pourquoi.** Le
griser sans un mot se lit comme un bug, et la créatrice cherche (règle
du 22 août). Une `<option>` tient sur une ligne, donc la raison y est
dite en version COURTE (`projet.bloqueCourt`, 3 raisons x 7 langues) ;
la version longue reste celle des écrans qui ont la place.

**Et le cul-de-sac muet a été fermé au passage.** L'écran testait
`projets.length === 0` pour afficher "aucun de tes projets ne peut
encore servir à ce générateur" : la phrase parle de ce qui est
UTILISABLE, le test parlait de ce qui EXISTE. Avec des cartes ça se
voyait à peine ; avec un menu, une liste dont toutes les options sont
grisées serait un cul-de-sac sans un mot. `utilisables` filtre donc sur
`blocageGenerateur`, et c'est lui que l'écran teste.

**Le nombre de questions est passé SOUS le menu** : c'est la seule chose
que la carte disait et qu'une `<option>` ne peut pas porter.

Les deux écrans restent identiques à l'octet près dans les deux dépôts.
Test : le bloc "le choix du projet" de
`tests/logic/generateurs-parcours.test.mts`, vérifié en rejouant deux
versions d'avant (la grille remise, la raison retirée).

### ON LANCE DEPUIS LES RÉGLAGES, ON ATTERRIT SUR LES PISTES (3 septembre)

Béné : "cette étape est inutile : autant générer les trois pistes
directement ! Pourquoi t'as pas repris exactement ce qu'on a codé dans
l'atelier ? C'est tellement pratique, on l'a déjà testé, amélioré,
peaufiné. Les prompts, mises en pages, fonctionnement, présentation,
tout était parfait, pourquoi partir sur autre chose ?"

**Elle a raison sur les deux, et le deuxième reproche est le vrai.**

L'étape des pistes s'ouvrait VIDE : un titre, une phrase, et un bouton
"Proposer trois pistes". Deux clics pour un seul geste, et un écran qui
ne sert qu'à porter son propre bouton.

**Le labo de l'Atelier n'a JAMAIS fait ça, et ça se lit en une ligne**
(`app/(app)/labo-bonus/BonusLabClient.tsx`) : son écran de brief FINIT
par le bouton "Proposer 3 pistes", et `askPistes` fait
`setStep("pistes")`. On arrive donc sur un écran qui MONTRE les trois
pistes. Le mien avait la même liste d'étapes et le bouton du mauvais
côté de la césure.

| | l'Atelier, depuis le début | ici, avant le 3 septembre |
|---|---|---|
| le bouton qui lance | au pied du brief | sur l'écran d'après |
| l'écran des pistes | montre les trois pistes | vide, avec un bouton |
| la recommandation | AU DESSUS des cartes | en dessous, donc lue trop tard |

**Les trois sont alignés sur l'Atelier**, ses phrases comprises ("Trois
pistes, tu en choisis une", "Elles sont volontairement différentes.
Prends celle qui te ressemble, pas la plus impressionnante.").

**Ce qui NE devait pas se perdre : le prix de la relance.** "Proposer
trois autres pistes" REFACTURE, et une relance gratuite en apparence est
la meilleure façon de vider un compteur sans comprendre pourquoi. Le
bouton de relance reste donc sur l'écran des pistes, en `outline` (sur
un écran qui montre déjà trois pistes, un bouton plein tire l'oeil vers
le geste qui coûte), et le coût est dit AUX DEUX endroits : au pied des
réglages avant de lancer, et à côté de la relance. Le test compte les
deux occurrences.

**LA LEÇON, ET ELLE EST SUR MOI.** Le module `parcours.ts` porte en
commentaire "L'Atelier fait l'inverse depuis le début (`library ->
brief -> pistes -> produce`), et c'est ce qu'elle demande ici". J'avais
donc lu son parcours, recopié la LISTE des étapes, et réécrit ce qui se
passe DANS chacune. **Reprendre la structure d'un écran qui marche n'est
pas la reprendre : ce qui marche est dans le détail des gestes.** Quand
un écran de l'Atelier fait déjà le travail, on va le LIRE, geste par
geste, avant d'en écrire un autre.

Test : le bloc "les pistes : le lancement vit au pied des réglages" de
`tests/logic/generateurs-parcours.test.mts`, vérifié en rejouant la
version d'avant (deux tests rougissent).

### PAREIL QUE L'ATELIER, NI PLUS NI MOINS (Béné, 3 septembre 2026)

"Au final je veux exactement la même chose sur l'atelier et sur tiquiz.
Pareil. Ni plus, ni moins. En visible et en invisible pour les users."

Le passage a été fait geste par geste, en lisant son labo au lieu de
lire sa liste d'étapes. Ce qui différait, mesuré :

| Le geste | l'Atelier | ici, avant |
|---|---|---|
| l'écran de production | une GRILLE de dossiers, un clic ouvre, la flèche remonte | tout empilé |
| le titre de l'écran | celui de la piste, sa punchline, l'avancement | "Les contenus" |
| corriger un texte | l'éditeur, sur place | lecture seule |
| exporter | PDF par bloc | rien |
| choisir une piste | n'écrit RIEN, chaque dossier a son bouton | écrivait tout d'un coup |
| la relance | AJOUTE une piste, max 6 | remplaçait les trois |

**Quatre modules sont IMPORTÉS, pas réécrits**, et ils sont identiques à
l'octet près dans les trois dépôts : `lib/bonus/document.ts`,
`accents.ts`, `markdownHtml.ts`, `printable.ts`, plus
`components/BonusDocument.tsx`. Le garde-fou est une commande :

```bash
cmp lib/bonus/document.ts ../formaquiz/lib/bonus/document.ts
```

Deux copies d'une même règle finissent toujours par diverger, et ici la
divergence coûte un PDF qui ne ressemble plus à l'écran.

**LA PREUVE QUE CE N'EST PAS THÉORIQUE, trouvée en portant.** La mise en
forme en ligne vivait en DEUX exemplaires chez lui, `inline()` dans
`BonusDocument.tsx` et `inline()` dans `printable.ts`, et le commentaire
du second annonçait "la MEME mise en forme qu'a l'ecran". **Elles
avaient déjà divergé** : l'écran n'échappait pas le guillemet double,
l'impression si. Or c'est une règle de SÉCURITÉ (ce texte vient d'un
modèle et finit dans un `innerHTML`).

Elle vit maintenant dans `lib/bonus/document.ts`, en un seul exemplaire,
avec la cible en PARAMÈTRE (`"ecran"` ouvre un onglet, `"impression"`
non). Et surtout elle est enfin TESTABLE : enfermée dans un `.tsx`, elle
ne l'était pas, donc rien ne vérifiait qu'un `javascript:` était refusé.
Les deux tests de l'Atelier qui la surveillaient lisaient sa SOURCE avec
des regex, donc ils figeaient une écriture et pas un comportement : ils
APPELLENT la fonction désormais, des deux côtés.

**Ce qui change pour la créatrice, et qu'il faut assumer :** les emails
et la promo ne s'écrivent plus d'un seul bouton. Chaque morceau a le
sien, comme les trois blocs du bonus dans l'Atelier. C'est plus de clics
et c'est le prix de "pareil" ; c'est aussi ce qui évite de facturer sept
contenus à quelqu'un qui en voulait deux.

🚨 **Fichier SUPPRIMÉ : `lib/generateurs/markdown.ts`.** C'était NOTRE
rendu, à côté de celui de l'Atelier : le même contenu s'affichait de
deux façons selon l'écran où on le lisait. La bibliothèque
(`/generateurs/mes-contenus`) passe par le même rendu que la production.
Supprimé et pas laissé sans appelant : un module mort est un piège que
le prochain passage rebranche en croyant réparer.

Test : `tests/logic/generateurs-parcours.test.mts`, bloc "l'écran de
production suit le labo de l'Atelier", vérifié en rejouant la version
d'avant (l'édition retirée, le PDF retiré, l'avancement recompté : les
trois rougissent).

### Le repli sans section perdait la mise en forme (même jour)

Béné, en lisant le portage : "ça ne va pas supprimer ce qui s'écrivait
en markdown ? Les users doivent voir en beau, bien mis en forme comme
sur l'atelier."

**Elle avait raison de se méfier, et le trou était PLUS grave que ça.**

Le rendu branchait sur `hasStructure(doc)` : un document sans aucun
titre de section retombait sur un affichage de `{b.text}` TEL QUEL.
Mesuré sur un email réel :

| ce que le modèle écrit | ce que le repli affichait |
|---|---|
| `Tu es **Team Capture**.` | `Tu es **Team Capture**.` |
| `[le quiz](https://...)` | `[le quiz](https://...)` |
| `- un point` puis `- deux` | **rien du tout** |

La dernière ligne est la pire : un bloc qui n'était pas un paragraphe
rendait la chaîne vide, donc la LISTE DISPARAISSAIT de l'écran.

**Et c'était le cas le PLUS FRÉQUENT ici.** Les trois blocs d'un bonus
portent toujours des `##`, donc ça ne se voyait pas dans l'Atelier. Un
email et un post court n'en ont pas : les deux générateurs à plan fixe
tombaient donc systématiquement dans le repli.

**Règle : `BonusDocument` est appelé SANS CONDITION**, sur l'écran de
production comme dans la bibliothèque. Il rend déjà `doc.lead` avec le
même moteur que les sections (gras, italique, liens, listes, étapes,
code) et sans carte autour : le repli n'apportait rien, il retirait.

**Le markdown reste la source de vérité et ne bouge pas d'un octet** :
c'est lui qui est stocké, lui que l'éditeur relit par le pont, lui que
le PDF imprime, et lui qu'elle colle dans Systeme.io. Ce qui a changé,
c'est le RENDU, et il est désormais celui de l'Atelier partout.

**LA LEÇON :** le commentaire du repli disait "un texte sans aucune
section retombe sur un rendu simple : forcer une carte unique qui
contient tout n'apporterait rien". La phrase était plausible et fausse,
puisque `BonusDocument` ne force aucune carte sur le lead. **Un repli se
juge sur ce qu'il REND, jamais sur ce que son commentaire annonce.**

Test : le cas "un contenu SANS titre de section garde sa mise en forme"
de `tests/logic/generateurs-parcours.test.mts`, vérifié en rejouant le
repli d'avant (il rougit).

### L'ÉTAPE DU BRIEF MANQUAIT ENTIÈREMENT (Béné, 3 septembre 2026)

Captures de l'Atelier à l'appui : "mais t'as pas du tout reproduit sur
Tiquiz ce qu'on a sur l'atelier !! C'est où l'étape pour choisir quand
sera envoyé le bonus, le type de bonus, pour un partage ou un quiz
complété ??? Je t'ai pas demandé de l'à peu près je t'ai demandé
PAREIL."

**Elle avait raison, et ce n'était pas un détail de mise en page : les
DEUX choix qui décident de ce que le bonus doit ÊTRE n'existaient pas.**

| Le réglage | l'Atelier | ici, avant |
|---|---|---|
| ce que reçoit chaque profil (`plan`) | 3 cartes cliquables | rien |
| l'offre payante | plusieurs, une par profil, avec pastilles | UNE seule |
| la couverture des profils | avertissement nommant les profils | rien |
| quand le bonus est remis (`declencheur`) | 2 cartes cliquables | rien |
| le profil du contenu | dans le DOSSIER, avec "(écrit)" par profil | dans les réglages |

**Et mon propre `lib/generateurs/offre.ts` disait noir sur blanc "on ne
reprend PAS ça ici, pas encore".** Le "pas encore" était un mauvais
calcul dès le départ : le retour de Monique (Atelier, 5 août) décrit un
quiz qui ORIENTE vers trois offres, ce qui est exactement ce que Tiquiz
vend. Renvoyer les trois profils vers la même offre, c'est dire
l'inverse de ce que le quiz vient de leur dire.

**CE MODULE EST UNE RÉIMPLÉMENTATION, ET JE LE DIS.** Les quatre autres
modules du labo sont portés à l'octet près, un `cmp` le prouve.
`lib/bonus/offers.ts` ne peut pas l'être : il parle anglais
(`BonusOffer.promise`) et tout `lib/generateurs/` parle français. J'ai
d'abord tenté un pont, et il tenait sur un `as unknown as` entre deux
formes DIFFÉRENTES, c'est à dire un mensonge que le compilateur ne
pouvait plus contredire (règle du 7 août). Il n'y a donc qu'UNE forme, en
français, et c'est le COMPORTEMENT qui est figé :
`tests/logic/offres-par-profil.test.mts` rejoue les cas de son
`bonus-offers.test.mts` un par un.

**Quatre choses à ne pas défaire :**

1. **Le plan est posé AVANT les offres** (Béné, Atelier, 5 août : "c'est
   ce que reçoit chaque profil qui doit aller en premier"). Ce n'est pas
   qu'une question de logique : ce choix décide si les pastilles de
   profils existent dans les cartes d'offre, donc elles apparaissent
   APRÈS lui, dans le sens de lecture.
2. **Trois valeurs pour le plan, pas deux réglages.** "Un bonus ou
   plusieurs ?" et "une offre ou plusieurs ?" feraient quatre
   combinaisons dont une est INCOHÉRENTE : un bonus commun qui devrait
   mener vers trois offres. La quatrième est impossible par
   construction.
3. **La clé d'un contenu décliné porte le PROFIL** (`contenu-1:2`).
   Sans lui, écrire le 2e profil écrase le 1er, et elle ne s'en aperçoit
   qu'en rouvrant. Et un dossier décliné n'est "Prêt" que quand TOUS ses
   profils sont écrits : le dire dès le premier ferait croire le bonus
   terminé alors qu'il en manque trois.
4. **Le serveur REFUSE une couverture incomplète** (`couverture_offres`),
   il ne devine pas. L'écran prévient déjà, mais un bonus écrit pour un
   profil qui ne mène nulle part fait travailler la créatrice pour rien.
   Une offre INUTILISÉE, elle, ne bloque pas : c'est presque toujours
   une case oubliée, pas une faute.

**Et le déclenchement part dans le PROMPT**, pas seulement à l'écran : à
la fin du quiz le bonus prolonge un résultat qu'on vient de lire ; après
un partage il récompense un geste, donc il doit valoir le geste. Le
taire laisse le modèle écrire pour le cas moyen.

**Ce qui reste différent, et c'est assumé :** le plan et le déclencheur
sont gatés sur `estBonus`. "Quand vas-tu envoyer ce bonus ?" ne veut
rien dire pour une séquence d'emails ou pour de la promo, et le labo de
l'Atelier EST le bonus. C'est un PARAMÈTRE du générateur, jamais déduit
de la présence d'une offre.

Test : `tests/logic/offres-par-profil.test.mts`, vérifié en rejouant la
version d'avant (8 tests rougissent).

### J'AI RELEVÉ SES PHRASES UNE PAR UNE (Béné, 3 septembre 2026)

"Tu peux pas chercher par toi-même ce qui ne serait pas strictement
identique pour le corriger ? Tu as TOUS les codes pour le faire."

Si, et c'est ce qu'il fallait faire depuis le début au lieu d'attendre
qu'elle ouvre l'écran. La méthode, reproductible :

1. extraire chaque phrase VISIBLE de son labo (commentaires retirés) ;
2. la chercher dans nos 7 fichiers de langue, en normalisant les
   accents, les apostrophes et les variables ;
3. lire ce qui reste.

**26 phrases sans équivalent.** Après tri, deux vrais gestes manquants
et une série de mots.

**LES DEUX GESTES :**

| Ce qui manquait | Ce que ça coûtait |
|---|---|
| **le temps par personne** d'une piste (`needsHerTime` chez lui) | le socle interdit déjà ce qui demande son temps à CHAQUE visiteur, mais un format peut en valoir la peine. Le prix se DIT : caché derrière le mot "personnalisé", il ne se découvre qu'au quarantième lead, c'est à dire quand le quiz commence à marcher |
| **"L'étape de partage n'est pas encore activée sur ton quiz"** | on proposait un déclenchement qui n'existe pas sur ce quiz là, donc un bonus que personne ne recevrait jamais. La carte lit maintenant `virality_enabled` en base |

**ET TROIS DÉFAUTS TROUVÉS EN CHERCHANT :**

- **les trois dossiers du bonus n'avaient AUCUNE phrase.** Mes cartes
  affichaient `piece.resume`, qui est VIDE sur le bonus : trois cartes
  sans un mot pour dire ce qu'il y a dedans. "Pour toi / pour ton
  visiteur" est exactement ce qui évite d'ouvrir les trois pour savoir
  lequel est lequel (`aides.*`, ses phrases).
- **un dossier vide décrivait l'écran au lieu de dire le geste.** "Rien
  n'a encore été écrit" contre "Génère ton guide de création"
  (`vides.*`).
- **une offre de trois mots passait.** Son labo refuse en dessous de 10
  caractères, avec la phrase qui dit quoi corriger.

**LES MOTS, alignés sur les siens** : "Proposer 3 pistes", "Je cherche
tes pistes...", "Je prends celle-ci", "Ton offre payante", "C'est vers
elle que ton bonus doit ramener", "Autorise les pop-ups", "La copie a
échoué. Sélectionne le texte et copie-le à la main."

**CE QUI RESTE DIFFÉRENT, ET C'EST ASSUMÉ :**

- **nos messages d'erreur sont plus riches que les siens.** Il dit "La
  génération n'a pas abouti. Réessaie dans un instant." ; nous rendons
  une RAISON parmi neuf, traduite en 7 langues, qui dit quoi faire
  (saturé, trop long, hors quota, pas configuré...). C'est la règle du
  3 août, et reculer là dessus serait une régression.
- **la BIBLIOTHÈQUE ne rouvre pas un projet.** Chez lui, "Tes bonus" est
  le premier écran dès qu'un bonus existe, et rouvrir restaure le brief,
  les pistes, la piste choisie et les blocs, en atterrissant à la bonne
  étape. Ici `/generateurs/mes-contenus` LIT les contenus, elle ne
  reprend pas le travail : `generateur_contenus` stocke les morceaux
  mais ni le brief (plan, déclencheur, offres) ni la piste. C'est le
  seul écart qui demande une MIGRATION, et il est nommé ici pour ne pas
  être redécouvert.

**LA LEÇON DE MÉTHODE, et elle vaut pour les prochains portages :**
comparer deux écrans à l'oeil rate ce qui n'est PAS là. Relever les
phrases de l'un et les chercher dans l'autre trouve les absences, qui
sont exactement ce qu'un coup d'oeil ne voit pas.

Test : le bloc "les mots et les gestes de son labo" de
`tests/logic/offres-par-profil.test.mts`, vérifié en rejouant la version
d'avant (6 tests rougissent).

**Et deux fois de suite, mon propre test était faux avant le code.** Le
premier figeait le JSX au caractère près, donc il rougissait sur une
correction juste. Le second regardait LIGNE PAR LIGNE, donc il
rougissait sur un garde posé à la ligne d'au dessus. Un test qui mesure
la présence ou l'ORDRE de quelque chose dans un fichier retire d'abord
les commentaires, sinon il tombe sur sa propre explication.

### 4. LES CONTENUS SE RETROUVENT

"Il faut aussi que les users retrouvent leurs créations dans
'générateurs' : ajoute une étape avec le choix -> 'mes contenus
générés' > 3 blocs pour classer les 3 types de contenus générés OU
'générer de nouveaux contenus' > 3 générateurs."

Un contenu généré vivait dans l'onglet du navigateur et nulle part
ailleurs : un rafraîchissement, et le travail était perdu. Côté Tipote
il était même PAYÉ en crédits, donc perdu et facturé.

- `/generateurs` : les deux cartes ;
- `/generateurs/nouveau` : les trois générateurs ;
- `/generateurs/mes-contenus` : trois blocs, un par générateur.

**Trois choses à ne pas défaire :**

1. **On enregistre APRÈS CHAQUE MORCEAU, pas à la fin.** Une génération
   dure une minute et demie : l'onglet fermé au septième morceau ne doit
   pas tout emporter. Une LIGNE par livraison, pas par morceau : une
   séquence de cinq emails est UN contenu, et cinq lignes obligeraient
   chaque lecteur à les recoller dans le bon ordre.
2. **`quiz_id` est en ON DELETE SET NULL et le titre est RECOPIÉ.** Un
   quiz supprimé ne doit pas emporter les emails écrits pour lui : ils
   sont peut-être déjà programmés dans Systeme.io. C'est la règle de la
   facture émise (24 août).
3. **Un bloc VIDE reste affiché.** Sa présence dit que le générateur
   existe : le masquer ferait croire qu'il n'y en a que deux.

**L'enregistrement est BEST-EFFORT et ne lève jamais** : le texte est
déjà à l'écran, faire échouer la réponse pour un souci de base ferait
perdre les deux. Et la lecture distingue "je n'ai pas pu regarder" de
"il n'y a rien" : un écran vide se lit "je n'ai rien créé", et ce serait
faux.

🚨 Migration : `supabase/migrations/20260902_generateurs_contenus.sql`,
**sur les DEUX Supabase** (Tiquiz et Tipote).

### 5. ET LA LANGUE : j'avais réécrit une table de SEPT à côté des CENT

"Pense au multilangues, on doit offrir la même qualité à toutes les
langues prises en charge et les contenus + bonus sont générés dans la
langue du quiz bien sûr."

`consigneLangue` portait une table de sept langues, celles de
l'INTERFACE. Un quiz écrit en japonais ou en swahili en sortait donc
avec `la langue de code "ja"`, alors que `buildLanguageDirective`
(`lib/quizLanguages.ts`) existe depuis des mois et rend "Japanese
(日本語)" plus ses NOTES RÉGIONALES ("voiture" vs "char", "ordenador" vs
"computadora"). C'est ce que reçoit déjà la génération de quiz : deux
qualités de consigne pour deux écrans du même produit, et c'est le
générateur qui écrivait moins bien.

Test : `tests/logic/generateurs-parcours.test.mts`, dans les deux
dépôts. Le test de la CLÉ, lui, diffère : Tipote lit trois noms.

### 6. ET LE PROMPT DU BONUS N'ÉTAIT PAS CELUI DE L'ATELIER (3 septembre 2026)

Béné : "t'es sûr d'avoir utilisé les mêmes prompts pour les générateurs
de bonus et les emails ? Je les trouve moins bien que sur l'Atelier...
tu utilises bien Claude ? Le meilleur modèle rapport qualité prix ?"

**LE MODÈLE EST HORS DE CAUSE, ET C'EST MESURÉ.** Les trois dépôts
appellent `resolveAnthropicModel(process.env.ANTHROPIC_MODEL, "sonnet")`,
donc `claude-sonnet-4-6`, avec la MÊME fonction et la même table. Le
labo bonus de l'Atelier (`app/api/me/bonus/route.ts`) et les générateurs
d'ici tournent sur le même modèle : il ne peut pas expliquer un écart.

**LES PROMPTS, EUX, N'ÉTAIENT PAS LES MÊMES.** Seuls les CINQ TEMPS de
la séquence emails l'étaient (vérifié caractère par caractère entre
`lib/funnelSequence.ts` et `lib/generateurs/sequences.ts` : cinq
intentions identiques). Tout le reste est une RÉÉCRITURE, et cette page
laissait croire l'inverse.

Ce qui manquait, compté dans `socle.ts` + `consignes.ts` avant
correction, zéro occurrence de chacun :

| Ce qui manquait | Ce que ça coûte |
|---|---|
| **les 4 PILIERS d'un bonus qui convertit** (urgence, spécificité, accessibilité, CONTINUITÉ) | rien ne disait au modèle qu'un bonus doit ouvrir un vide que seule l'offre comble. D'où des bonus qui se suffisent à eux mêmes, donc qui ne vendent pas |
| **le test qui tranche** ("si un concurrent pouvait publier le même texte en changeant son logo") | c'est le critère le plus dur et le seul qui produise du contenu qu'on ne peut pas confondre |
| **les puces promesses en DEUX temps** (bénéfice + conséquence concrète) | sans lui, le modèle rend un SOMMAIRE. "Un modèle d'email" au lieu de "tu écris ton email du lundi en dix minutes" |
| **le moment psychologique dans le persona** | le modèle écrivait du contenu de blog, correct, qui ignore que la personne vient de recevoir un résultat sur elle même |

**Les trois premiers viennent de l'Atelier, mot pour mot ou presque**
(`lib/prompts/bonus.ts` : `FOUR_PILLARS`, `VALUE_CRITERIA`,
`PROMISE_BULLETS`). Ils ont été écrits là bas, corrigés par les retours
de vraies élèves, et enseignés dans la formation : les réécrire ici
donnait deux méthodes pour la même chose, et c'est Tiquiz qui se
trompait.

**OÙ ILS VIVENT, ET CE N'EST PAS INDIFFÉRENT.** Ce qui vaut pour les
TROIS générateurs (le test du logo, les puces promesses, le moment
psychologique) va dans le SOCLE, donc dans le bloc caché : il ne coûte
presque rien à partir de la deuxième lecture. Les 4 PILIERS sont
bonus-spécifiques et vivent dans `consignes.ts`, la partie variable :
dans le socle, ils seraient facturés sur chaque email et chaque post,
qui n'en ont que faire. Le test l'exige dans les deux sens.

**LA LEÇON, ET ELLE EST SUR MOI :** j'avais écrit ici "les cinq temps
sont ceux de l'Atelier, mot pour mot", ce qui était vrai, et cette
phrase a servi de preuve que TOUT venait de l'Atelier, ce qui était
faux. **Une phrase exacte sur une moitié laisse croire l'autre moitié.**
C'est la même faute que la mesure des règles d'automatisation : dire ce
qu'on a vérifié, et dire aussi ce qu'on n'a pas vérifié.

Test : les 4 cas ajoutés à `tests/logic/generateurs.test.mts` (les deux
dépôts), vérifiés en rejouant la version d'avant : les 4 rougissent.

## ON DIT TAG, JAMAIS ÉTIQUETTE (Béné, 1er septembre 2026)

"Ne dis jamais étiquette, nulle part, on parle bien de tag en français
aussi. Supprime tout ce que tu appelles étiquette partout pour dire tag,
et mets tags bordel !"

**La raison est produit, pas stylistique : c'est le mot que Systeme.io
affiche.** Son menu CRM en français dit "Tag". Une consigne qui dit
"étiquette" envoie la créatrice chercher un mot qui n'existe pas sur son
écran, au moment précis où elle suit une marche à suivre clic par clic.

**Et ça vaut par LANGUE, pas dans l'absolu.** Vérifié sur ses captures du
tableau de bord Systeme.io :

| Langue | Ce que Systeme.io affiche | Ce qu'on écrit |
|---|---|---|
| français, italien, portugais, anglais | Tag | **tag** |
| **espagnol** | Etiquetas | **etiqueta** |

L'espagnol est la seule exception, et elle est OBLIGATOIRE : y écrire
"tag" rendrait la consigne fausse, puisque le bouton qu'elle doit
cliquer s'appelle "Etiqueta añadida". L'arabe n'a pas été vérifié.

**La nuance à ne pas rater : "étiquette" au sens LIBELLÉ n'est pas un
tag.** Le libellé min/max d'une échelle, le "conversion label" de Google
Ads, le mot affiché à la place d'un score : ce ne sont pas des tags
Systeme.io. On y écrit **libellé**, pas "tag", sinon on rend le texte
faux dans l'autre sens.

Ça couvre aussi le CODE : un fichier `etiquetteVente.ts` et une fonction
`poserEtiquetteAcheteur` disaient le mot interdit. Renommés en
`tagVente.ts` et `poserTagAcheteur`.

**ET LA FAUTE QUE J'AI FAITE EN L'APPLIQUANT, qui vaut plus que la
règle :** j'ai remplacé le mot partout d'un coup, sans relire les
phrases. "Étiquette" est féminin, "tag" est masculin : le dépôt s'est
retrouvé avec "un tag posée", "le tag exacte", "de le tag", "aucune tag
manquante". Et là où le mot voulait dire LIBELLÉ, le texte est devenu
faux : la largeur d'un axe de graphique "réserve la largeur des tags",
l'orientation EXIF d'une photo devenait "un tag tourne-moi de 90
degrés". Réparé le jour même, mais le geste était mauvais.

**Un remplacement de mot n'est pas une opération mécanique.** Un mot
porte un GENRE (donc des accords à refaire) et un SENS (donc des
endroits où il ne s'applique pas). Le contrôle à faire après, et pas
avant :

```bash
grep -rnE "(une|nouvelle|cette|aucune|toute) tags?|tags? (créée|posée|manquante|exacte|courte|ancienne|inconnue)|de le tag" . --exclude-dir=node_modules
```

Zéro ligne, sinon on a laissé une phrase cassée derrière soi.

## Le nom d'un fichier ne dit pas ce qu'il y a dedans (1er septembre 2026)

Béné a livré 29 visuels neufs pour remplacer les schémas du blog.
**Trois d'entre eux étaient décalés d'un cran par rapport à leur nom :**
`optin-vs-quiz.png` porte le schéma "97 % de tes visiteurs s'évaporent",
`triple-effet-quiz.png` porte "Opt-in classique vs Quiz interactif".
Les poser au nom du fichier aurait mis deux schémas au mauvais endroit
dans le même article, et aucun test ne peut voir ça.

**Règle : un visuel se place en le REGARDANT, jamais d'après son nom.**
C'est la même règle que les `alt`, et pour la même raison.

**Trois visuels ne sont PAS posés**, et la raison est écrite à côté :
`comparatif-outils-popquiz` et `tableaucomparatif-videos interactives`
annoncent **9 €/mois ou 90 €/an** (tarif d'avant le 6 août), et le
second a en plus sa colonne "Note" décalée d'une ligne (Tiquiz y est
noté "Vimeo Interactive"). `rente-mensuelle-tiquiz` annonce 9 €/mois ET
une commission de 50 % sur Tipote, c'est à dire les deux choses que
Béné demandait de retirer de cet article. Un dessin ne se corrige pas
en code : ils sont à redessiner.

**Ce qui reste à redessiner, tous visuels confondus :** les trois ci
dessus, plus quatre schémas qui portent encore `— tipote.fr/tiquiz` en
pied (`ia generation`, `profile-tag-mapping`, `viralite-share-bonus`, et
`svg-4-triple-effet-quiz-fr.webp` qui n'a pas de remplaçant).

### Et le remède documenté qui ne marchait pas

`poserAlt` disait "on n'écrase JAMAIS un `alt` existant" et, dans la
même phrase, que "les mauvais se corrigent en les ajoutant à la table".
**Les deux ne pouvaient pas être vrais** : un `alt` importé de
Systeme.io ("tiquiz avis", "qui viral tiquiz") existe, donc il bloquait
la correction, donc l'ajouter à la table ne faisait rien.

**LA TABLE GAGNE désormais sur ce qu'elle NOMME**, et la protection qui
comptait reste : une image absente de la table garde son texte, on ne
perd aucun `alt` correct venu de l'import.

## L'article qui recrute les affiliés ne promet que ce qui est payé (1er septembre 2026)

Béné : "rente mensuelle tiquiz : il manque tous les tableaux et les
images .. bref l'article est pourri et cassé".

**1. LES TABLEAUX AVAIENT DISPARU À L'IMPORT.** Trois titres se
suivaient sans rien entre eux ("2.1", "2.2", "2.3"), et la section 8
annonçait "voici une comparaison" avant d'enchaîner sur "Verdict :".
L'import n'a pas su lire les blocs tableau de Systeme.io et les a
laissés tomber, en silence.

**Règle : `lib/blog/tableauxRente.ts` CALCULE les tableaux**, avec les
mêmes fonctions que le simulateur de la page d'affiliation
(`tauxCommissionPct`, `commissionCentsAuTaux`). Cet article a déjà
annoncé 108 €/mois pour 30 filleuls et 1 800 €/an pour 50 filleuls
annuels : un tableau tapé à la main serait faux au premier changement
de tarif, de taux ou de base.

**On ne reconstruit PAS le comparatif avec les 4 autres programmes.**
Je n'ai vérifié aucun de leurs taux, et le verdict annonçait "Systeme io
reste plus élevé en taux (60 %)". La section compare maintenant les
CRITÈRES d'une rente solide et ce que Tiquiz répond sur chacun : tout y
est vérifiable dans notre code.

**2. SIX ENDROITS PROMETTAIENT TIPOTE.** La section 4 entière annonçait
50 % à vie sur des plans de 19 à 917 €/mois, plus "×14 sur ta rente".
Tipote n'est pas en vente : ni les plans, ni le taux, ni le ×14 ne sont
vérifiables. Elle parle maintenant de l'**Atelier du Quiz** (70 %, donc
27,42 €, calculés depuis le catalogue) et du **barème qui monte de 40 à
70 %**. Ce qui viendra plus tard est annoncé **sans date, sans prix et
sans taux**, et l'article le dit explicitement.

**3. SIX ENDROITS ANNONÇAIENT UN VERSEMENT "LE 10 DE CHAQUE MOIS" ET
"SANS SEUIL".** Il y a un seuil de 20 € et un délai de 30 jours, et le
versement a lieu ENTRE le 10 et le 13. L'espace affilié le dit
correctement depuis le 26 août ; le blog promettait l'inverse, y compris
dans sa `description`, c'est à dire la seule phrase lue avant le clic.

**4. LE PLANCHER ÉTAIT ÉCRIT COMME UN PLAFOND.** 40 % est la première
marche. L'article SOUS-vendait le programme, ce qui est l'autre façon de
mentir.

**Les MOTS CLÉS passent maintenant par la même correction que le texte**
(`motsCles: a.motsCles.map(texte)`) : deux d'entre eux portaient une
promesse fausse et échappaient au pipeline. Un chiffre faux reste faux
quand il sert de mot clé.

Test : `tests/logic/rente-affiliation-blog.test.mts`.

## Une décoration à gauche n'est pas le seul défaut de mise en page

Les tableaux se posent APRÈS le paragraphe qui les annonce, jamais juste
sous le titre : un tableau tombé entre un titre et sa phrase
d'introduction se lit comme un bloc venu de nulle part. Les ancres de
`TABLEAUX` sont donc des FRAGMENTS DE TEXTE pour ces cas là, et un `id`
de titre seulement quand le titre est suivi directement du tableau.

Et **`corrigerFaits` tourne AVANT `poserTableaux`** : une ancre doit
correspondre au texte CORRIGÉ, pas au texte importé.

## Le SEO de tiquiz.fr : quatre défauts qu'on ne voit pas depuis le code (1er septembre 2026)

Les quatre ont été constatés EN LIGNE, pas déduits.

**1. La page servait DEUX balises `<title>`.** `stripHeadTags` visait
`<title>` NU, alors que Systeme.io publie
`<title data-react-helmet="true">`. Le retrait ne mordait pas, et Google
choisissait lui même. **Et corriger ça seul aurait coûté le mot clé :**
c'est le titre de la capture qui portait "Systeme.io", la requête la
plus rentable du produit. Le titre du code le nomme désormais.

**2. Quatre liens seulement menaient chez nous**, les quatre boutons de
commande. Le reste partait chez `www.tipote.fr` : les cinq liens légaux,
l'affiliation, l'Atelier, le LOGO, et `www.tipote.fr/tiquiz`, c'est à
dire SA PROPRE COPIE. Depuis la page qui doit remplacer l'ancienne, un
lien vers l'ancienne la désigne comme celle qui fait autorité.

**LES DESTINATIONS SONT NOS VRAIES ROUTES, et c'est le piège de ce
correctif.** Les chemins de Systeme.io (`/mentions-legales`, `/cgv`,
`/cgu`, `/politique-de-confidentialite`, `/politique-de-cookies`)
n'existent PAS chez nous : les recopier aurait posé cinq 404 dans le
pied de page de la page qui vend, c'est à dire le drame du centre
d'aide du 24 août. Nos pages sont `/legal`, `/terms`, `/terms-of-use`,
`/privacy` et `/cookies`.

**On traite aussi les liens ÉCHAPPÉS** (`href=\"...\"`) : trois liens
vers l'Atelier vivaient dans le modèle JSON de la page, et ce sont ceux
que l'éditeur relit pour reconstruire le bloc.

**`SALES_SITE_LINKS` est une LISTE, pas une règle.** "Tout ce qui pointe
sur tipote.fr revient chez nous" serait faux : l'optin gratuit et les
tunnels beta et US y vivent pour de bonnes raisons
(`SALES_LINKS_LEFT_ALONE`).

**3. Google lisait `tiquiz.fr` en ANGLAIS.** `DEFAULT_LOCALE` vaut "en"
et un robot n'envoie jamais de cookie : `tiquiz.fr/legal` répondait
"Legal Notice · Tiquiz". Le français est désormais le défaut **sur les
domaines de vente seulement** ; un visiteur qui a une préférence a un
cookie, et ce cookie gagne toujours.

**4. L'accueil du blog plafonnait à 7 articles sur 10.** Les trois plus
anciens n'étaient atteignables que par leur rubrique. Pas de
pagination : elle les enfermerait derrière un clic.

**Le garde-fou des adresses en dur exempte les CLÉS, pas le fichier.**
`SALES_SITE_LINKS` NOMME ces adresses pour ne plus les servir, et une
clé de correspondance ne peut pas passer par une constante sans cesser
de correspondre. Une DESTINATION écrite en dur dans ce même fichier fait
toujours rougir le test, vérifié en la rejouant.

Tests : `tests/logic/tete-page-vente.test.mts` et
`tests/logic/liens-site-page-vente.test.mts`, qui portent sur la VRAIE
capture. Un test qui n'exercerait qu'une chaîne écrite à la main aurait
été vert le jour du bug.

## Le hub intégrations : capter la recherche entre un concurrent et Systeme.io (Béné, 1er septembre 2026)

"On va créer un hub intégrations pour aller capter les intentions de
recherches entre les outils concurrents et systeme io pour introduire
Tiquiz."

**POURQUOI CES PAGES MARCHENT.** Sur `tally + systeme.io`, la première
page de Google est faite de sept plateformes d'automatisation et de rien
d'autre. Même schéma sur Typeform, Jotform, Google Forms, Interact.
Aucune page en français. C'est le seul endroit du web où quelqu'un se
demande, exactement à cet instant, comment faire arriver un formulaire
dans Systeme.io.

**LA RÈGLE QUI LES REND SOLIDES : chaque page résout vraiment le problème
posé, y compris quand la réponse est "prends Zapier".** La page Tally
explique la méthode gratuite avec du code AVANT de parler de nous. Une
page d'intégration qui n'explique pas l'intégration est une page de vente
déguisée, et ça se voit en dix secondes.

**Ce qui est en ligne :** le hub (`/integrations`), Zapier, Tally,
Typeform. Google Forms, Jotform et Interact sont MONTRÉS dans le
comparatif du hub, sans lien : une ligne manquante se lit comme un oubli,
mais un lien vers une page non écrite, c'est cinq 404 dans un pied de
page (drame du centre d'aide, 24 août). Le test l'exige dans les deux
sens.

### AUCUN PRIX N'EST ÉCRIT À LA MAIN

Le document de départ annonçait "Zapier Professional 19,99 $/mois", à dix
endroits. **La capture fournie le même jour affiche "À partir de
29,99 $/mois"** sur la page de tarifs française. Écrire 19,99 au dessus
d'une image qui dit 29,99 détruit la page en dix secondes.

`ZAPIER.professionnelParMois` (`lib/site/integrations.ts`) porte donc ce
que la capture MONTRE, et le prix de Tiquiz vient du CATALOGUE
(`OWNER_CATALOG`), c'est à dire de ce que le bon de commande encaisse.
C'est la leçon de `faitsProgramme.ts` : un montant recopié est un montant
faux au premier changement de tarif, et ici il vit dans un tableau de
comparaison, donc à l'endroit exact où un lecteur le vérifie.

Le test refuse tout `\d,\d\d $` dans ce qui S'AFFICHE. Il ignore les
COMMENTAIRES, où l'écart avec le document est expliqué : une exemption
sans raison écrite à côté est une exemption que le prochain passage prend
pour un oubli.

### LES TABLEAUX SONT DE VRAIES BALISES `<table>`

Jamais une capture. Une image n'est ni extraite par un moteur, ni
sélectionnable, ni lisible sur un téléphone : elle rate les trois d'un
coup. `Tableau` (`components/site/Integrations.tsx`) rend un `<table>`
dans une boîte `overflow-x-auto` : c'est le tableau qui défile, jamais la
page.

### LE FAIT QUI PORTE TOUTES CES PAGES, ET IL EST VÉRIFIÉ

**Tiquiz CRÉE le tag Systeme.io quand il manque.** Ce n'est pas une
formule commerciale : `app/api/quiz/[quizId]/public/route.ts` fait
`POST /tags` sur un nom introuvable avant de le poser sur le contact.
C'est exactement ce que ni Zapier (qui ne propose que les tags déjà
créés) ni un webhook maison (qui doit chercher l'ID, pas le nom) ne font.

**À NE PAS CONFONDRE avec `poserTagParNom`** (les ventes et la
newsletter), qui ne crée JAMAIS un tag : celui-là tourne avec la clé de
Béné, et un nom mal orthographié se retrouverait en double dans SA liste
(règle du 22 août). Deux chemins, deux clés, deux comportements opposés,
et c'est voulu.

### LA CAPTURE DE ZAPIER PORTAIT SON ADRESSE EMAIL

Le champ "Account" de la capture fournie affichait `blagardette@gmail.com`
en clair. Floutée avant conversion, vérifiée illisible dans le WebP
publié.

**Règle : une capture fournie se REGARDE avant d'être publiée**, champ
par champ. Une adresse, un identifiant de compte ou une clé d'API se
lisent très bien sur une image, et une page publique est indexée pour
toujours. C'est la même règle que "un visuel se place en le regardant,
jamais d'après son nom".

### Le pied de page a une cinquième colonne, donc une grille imbriquée

Une seule grille pour la marque ET les colonnes de liens obligeait à
recompter les colonnes à chaque page ajoutée : la 5e aurait écrasé les
autres. Les colonnes de liens vivent maintenant dans leur propre grille et
passent à la ligne toutes seules.

**Endroits à respecter :** `lib/site/integrations.ts` (pur, il porte les
chiffres et les deux constructeurs de JSON-LD),
`components/site/Integrations.tsx`, `app/(site)/integrations/`,
`lib/site/pagesPubliques.ts` (sitemap + llms.txt) et `lib/site/nav.ts`
(le pied de page). Test : `tests/logic/hub-integrations.test.mts`,
vérifié en rejouant un prix en dur et une capture absente (il rougit).

### Google Forms et Interact, et les logos officiels (1er septembre, le soir)

**LA PAGE INTERACT EST LA SEULE DU HUB DONT TOUT L'ARGUMENT EST LA PAROLE
D'UN CONCURRENT.** Ses trois citations ont donc été relevées sur la page
d'aide EN LIGNE, pas recopiées du document de départ :

- « A Zapier Pro account » (section « Before you start ») ;
- « You must create a tag in Systeme.io for each quiz result you want to
  use, or it won't appear as a selectable option in Zapier. » ;
- « Repeat this Zap setup for each quiz result tag you want to apply in
  Systeme.io (one Zap per result tag). »

L'adresse est affichée sous la citation, et le test exige que les deux
phrases restent MOT POUR MOT. Une citation approchée est indéfendable, et
c'est la page qu'un concurrent lira en premier.

**L'exception « étiquette » de cette page est OBLIGATOIRE.** La capture
de leur documentation est traduite par le navigateur : elle affiche
"étiquette" là où nous écrivons "tag". Sans une légende qui le dit, le
lecteur croit lire deux notions différentes. Le test tolère le mot sur
CETTE page seulement, et seulement si la légende dit "traduite par le
navigateur". Même forme que l'aide de l'éditeur qui doit montrer
"cher·e".

**LA CAPTURE MOBILE DE GOOGLE FORMS PORTAIT ENCORE SON ADRESSE EMAIL.**
Le compte Google connecté s'affiche au dessus du formulaire intégré.
Floutée avant conversion, vérifiée illisible dans le WebP publié.
Deuxième fois en deux jours : **une capture fournie se REGARDE champ par
champ, à chaque livraison**, pas seulement la première.

**LA PAGE GOOGLE FORMS N'A PAS DE TABLEAU, ET C'EST VOULU.** Elle répond
à deux questions distinctes (afficher le formulaire, envoyer les
réponses), elle ne compare pas des outils. Le test porte donc sur
`PAGES_QUI_COMPARENT` : exiger un tableau partout en ferait poser un qui
ne dit rien.

**UN LOGO EST UN MOT, PAS UNE ICÔNE CARRÉE.** Le document demandait du
96 x 96 : "Typeform" y serait écrasé et "Google Forms" étiré. `Logo`
(`components/site/Integrations.tsx`) borne la HAUTEUR et laisse
`width: auto`, avec les dimensions naturelles sur la balise pour que le
navigateur réserve la place. C'est la règle des images de réponse d'un
quiz (4 août), et le test l'exige.

**Zapier n'est PAS dans `OUTILS`.** Le hub compare des outils de
FORMULAIRE ; Zapier est le TRANSPORT que presque tous exigent. Le mettre
dans le tableau reviendrait à comparer un camion à des colis : sa carte
est posée à la main, et son logo vit dans `LOGO_ZAPIER`.

**Un fichier livré ne dit pas ce qu'il contient**, une fois de plus :
`tryinteract.com.png` ne montre pas Interact, c'est le visuel Tiquiz
"le tag se règle directement sur le profil". Placé en le REGARDANT.

### Jotform, et la relecture du 1er septembre au soir

**JOTFORM EST LE SEUL CAS OÙ L'INTÉGRATION EXISTE... SUR LE PAPIER**, et
c'est ce qui rend la page utile. Trois faits, mesurés et pas recopiés :

1. le bouton « Use this integration » de `jotform.com/integrations/
   systemeio` mène à `jotform.com/build/?integration=Zapier&app=
   systeme.io&clientID=...` (relevé sur la page en ligne) ;
2. le schéma de LEUR page fait passer la connexion par une pastille
   "zapier" entre Jotform et systeme.io ;
3. l'écran Intégrations de leur constructeur ouvre un panneau **ZAPIER**
   qui demande de connecter un compte Zapier avant de proposer ses
   modèles.

La deuxième est la plus solide des trois : elle vient d'eux et elle se
lit sans connaître Zapier. **Et l'`alt` fourni avec la capture disait
autre chose** (« ouvre une adresse contenant integration=Zapier », qui
n'est pas visible sur l'image) : un texte alternatif décrit ce qu'on
VOIT, pas ce qu'on sait.

**On ne dit pas que Jotform ment.** Le raccourci fait vraiment gagner la
configuration du Zap ; il ne fait pas gagner l'abonnement. C'est la
règle « ne pas retirer les passages qui reconnaissent ce que les
concurrents font mieux ».

### LES TITRES : sa relecture en annonçait deux trop longs, il y en avait quatre

Mesuré, suffixe « · Tiquiz » compris (le gabarit du site l'ajoute) :

| Page | Avant | Après |
|---|---|---|
| le hub | 69 | **54** |
| Interact | 67 | **56** |
| Typeform | 63 | **53** |
| Zapier | 61 | 61, laissé tel quel |

Les deux premiers étaient dans sa liste. Typeform n'y était pas et
dépassait quand même : "Connecter" saute plutôt que le mot clé, et la
forme rejoint celle des titres Interact et Jotform.

**LA BORNE DU TEST EST À 62, PAS À 60, ET LA RAISON EST ÉCRITE À CÔTÉ.**
Le titre Zapier tombe à 61, et "autour de 60" n'est pas un couperet :
raccourcir de deux caractères une phrase validée pour gagner un pixel
serait une réécriture, pas une correction. Le contrôle attrape ce qui
dépasse VRAIMENT.

### Le blog ne pointait PAS vers le hub, et il le contredisait

La consigne demandait des liens entrants « dans le CORPS des deux
articles cités », et le document de suivi les annonçait comme posés.
**Mesuré : aucun des dix articles ne contenait la chaîne
`/integrations`.** Une page liée seulement depuis le pied de page dépend
de la patience d'un robot.

**Et le paragraphe où il fallait poser le lien était faux trois fois**
(`comment-creer-quiz-systeme-io`) : « Typeform Plus à 50 €/mois, plus
Zapier à 217 €/mois. Total : 717 €/mois. Sur 5 ans, près de 5 000 €. »

- **50 + 217 = 267**, pas 717 : l'addition était fausse à l'écran ;
- **aucun des deux totaux ne donne 5 000 € sur 5 ans** (717 x 60 =
  43 020), et « 450 € au lieu de 5 000 € » est faux des deux côtés
  (170 x 5 = 850) ;
- **217 €/mois contredisait notre propre page Zapier**, qui annonce
  29,99 $. Poser le lien depuis ce paragraphe aurait mis les deux
  chiffres à un clic l'un de l'autre.

C'est le drame de la FAQ de la rente (31 août) dans un autre article :
une passe corrige les PRIX et laisse les CALCULS faits avec les anciens.
`lib/blog/liensIntegrations.ts` CALCULE les montants (Typeform Plus à
79 $/mois relevé sur `typeform.com/pricing`, Zapier lu dans `ZAPIER`,
Tiquiz lu dans `OWNER_CATALOG`) et pose les trois liens sur des ANCRES
DE TEXTE, jamais sur un index de bloc. `motif()` est désormais exporté
par `faitsProgramme.ts` : deux constructions de motif finiraient par ne
plus être d'accord, et c'est le contrôle qui mentirait le premier.

**Les devises ne se convertissent pas.** Typeform et Zapier facturent en
dollars, Tiquiz en euros : convertir demanderait un taux de change
inventé, faux le lendemain.

### Le schéma du hub inclut Jotform depuis le 1er septembre au soir

Nouvelle version fournie par Béné (1586 x 992). Les coins sont arrondis
et TRANSPARENTS : les aplatir sans rogner sortait quatre angles sombres,
et échantillonner un coin pour la couleur de fond rendait du noir. On
rogne 6 px, on aplatit sur `rgb(241, 242, 251)` relevé DANS l'image, et
l'`og:image` est en `fit: contain` sur ce même fond, donc la bande ne se
voit pas. L'`alt` nomme maintenant Jotform, Pabbly et n8n : il décrit ce
que le schéma montre.

**Ce qui reste à écrire :** ScoreApp, Outgrow, Riddle, Calendly et une
page sur les tags Systeme.io.

## Une vente d'un AUTRE produit ouvrait un abonnement Tiquiz (1er septembre 2026)

Béné, capture du pilotage à l'appui : "des ventes non identifiées sur le
dashboard c'est des abonnements tiquiz via systeme io **et un autre
abonnement qui n'a rien à voir**".

Elle décrivait un défaut d'affichage. Il y en avait deux, et le second
coûte de l'argent tous les mois.

### 1. LE TABLEAU DE BORD JETAIT UN NOM QU'IL AVAIT SOUS LA MAIN

`buildSioSales` ne lisait le plan tarifaire QUE pour combler un montant
manquant (`const tarif = duPayload == null ? readPricePlan(offre) : null`).
Une vente qui portait sa somme n'était donc jamais nommée : elle sortait
en "Produit non identifié" alors que Systeme.io dit très bien de quoi il
parle ("Le Pacte™ - 24 €/mois"). Le tarif répond à DEUX questions, le
montant et le nom, et une seule était posée.

### 2. ET SURTOUT : CHAQUE ÉCHÉANCE OUVRAIT UN ACCÈS TIQUIZ

Son compte Systeme.io ne vend pas que Tiquiz et l'Atelier. **Relevé dans
son compte le 1er septembre : Le Pacte™ (2502221, mensuel), Hacktube,
Reddit Business, Youtube Influence, Podcast Automation...** Toutes ces
ventes arrivent sur le MÊME webhook, avec le même genre d'événement.

Depuis le 7 août, une vente confirmée sur une offre INCONNUE ouvre un
accès Tiquiz, et cette règle reste juste : "il a payé le client, il doit
recevoir ses accès, point barre". Mais elle a été écrite pour un compte
qui ne vendait que nous. Appliquée à celui là, elle ouvrait un
abonnement Tiquiz à chaque personne qui achète Le Pacte, **et à chaque
échéance**, sans qu'une seule ligne d'erreur ne s'écrive.

**LE REPLI PAR LE MONTANT EST LE PIRE DES DEUX.** Trois de ses autres
produits coûtent EXACTEMENT le prix d'un palier Tiquiz :
`inferPlanFromAmount` ouvrait donc un palier PRÉCIS et FAUX, ce qui
ressemble à un routage réussi. Un repli qui se trompe franchement se
voit ; un repli qui se trompe avec assurance, non.

### La distinction qui décide, et une seule ferme la porte

**"Je n'ai pas trouvé cette offre" et "je SAIS que ce n'est pas Tiquiz"
sont deux réponses différentes** (c'est la règle du 23 août, appliquée à
un catalogue au lieu d'un contrôle).

| L'offre reçue | Ce qu'on fait |
|---|---|
| inconnue | on ouvre, exactement comme depuis le 7 août |
| connue, Tiquiz | on ouvre au bon palier |
| connue, un AUTRE produit | **rien**, et on le DIT dans le journal |

`venteHorsTiquiz()` (`lib/sio/produitVendu.ts`, pur) lit `PRICE_PLANS`,
la table RELEVÉE dans son compte. Le troisième cas n'est pas un refus
déguisé : le client a bien reçu ce qu'il a acheté, chez Systeme.io. Lui
ouvrir Tiquiz en plus n'est pas un cadeau, c'est un compte payant de
plus dans les compteurs et une personne qui reçoit les emails d'un
produit qu'elle n'a pas commandé.

**La garde passe AVANT `createUser`**, pas avant le seul repli : sinon
un acheteur du Pacte se voyait quand même créer un compte Tiquiz vide.
Le test vérifie cet ORDRE dans le fichier.

**Ce module ne vit pas dans `webhookInference.ts`** parce que
`pricePlans.ts` importe déjà son type `TiquizPlan` : l'y mettre
fabriquerait un cycle d'imports pour une décision de trois lignes.

### Tipote n'est PAS concerné, et c'est vérifié

Son webhook Systeme.io (`app/api/systeme-io/webhook/route.ts` là bas)
n'a AUCUN repli : `inferPlanFromOffer` rend `null` sur une offre
inconnue et le profil n'est pas touché ("pas de fallback par nom : c'est
fragile et inutile"). Le trou est propre à Tiquiz, qui a le repli du
7 août. Lu ligne par ligne le 1er septembre, pas supposé.

### Et pour SAVOIR au lieu de déduire

```bash
npm run check:ventes-sio
```

Il LIT `webhook_logs` et imprime, appel par appel : l'identifiant du
plan **et le chemin où il a été trouvé**, le montant et son chemin, le
palier que le routage ouvrirait aujourd'hui, et le produit affiché.

**Ce qu'il existe pour trancher :** "aucun identifiant reçu" et "un
identifiant qu'on ne connaît pas" sont deux pannes différentes, qui ne
se corrigent pas au même endroit (une ligne dans `OFFER_ID_PATHS` d'un
côté, dans `OFFER_TO_PLAN` ou `PRICE_PLANS` de l'autre), et l'écran
d'admin les affiche toutes les deux "offre inconnue". Quand aucun chemin
connu ne répond, il BALAIE le payload entier et dit où l'identifiant se
trouve vraiment. Une liste de chemins qui a cessé de correspondre ne le
dit jamais toute seule : c'est la leçon des 100 tags et des 51 règles
d'automatisation, une liste tronquée ne s'annonce pas.

**Ce qui reste ouvert, et qui n'est pas du code :** `3198235` ("Tiquiz
mensuel" à 9 €) **n'existe plus dans son compte** (mesuré le
1er septembre), alors que des renouvellements à ce tarif continuent
d'arriver. La ligne reste dans `OFFER_TO_PLAN`, elle ne coûte rien et
elle protège l'historique. Pourquoi ces échéances n'arrivent pas avec un
identifiant routable est la question que `check:ventes-sio` existe pour
répondre, sur le serveur, là où le journal vit.

Test : `tests/logic/ventes-hors-tiquiz.test.mts`.

## Pinterest : hors d'un article, il n'y avait RIEN à épingler (1er septembre 2026)

Béné : "le format des images ne me permet pas de les partager sur
pinterest (liste des articles, hub ...) et je manque de la visibilité à
cause de ça."

**Mesuré sur la production avant de toucher au code**, et le défaut
était plus bête que le format :

| Page | Ce qu'elle déclarait |
|---|---|
| `/blog` | **AUCUNE `og:image`**, rien du tout |
| `/blog/rubrique/<x>` | **AUCUNE** non plus |
| `/integrations` | une `og:image` 1200 x 630, donc PAYSAGE |
| un article | l'épingle 1000 x 1500 + `data-pin-media` |

Le travail du 30 août n'avait donc couvert qu'UNE page sur quatre. Le
sommaire du blog et les rubriques ne sortaient même pas sur LinkedIn ou
Facebook : partagées, elles s'affichaient nues.

**Règle : `attributsEpingle()` / `attributsEpinglePour()`
(`lib/blog/partage.ts`), et personne ne recompose ces attributs.**

**`data-pin-url` EST LE MORCEAU QU'ON NE PEUT PAS OUBLIER.** Épinglée
depuis la liste, une carte pointerait sinon vers `/blog` : le lecteur
qui clique atterrit sur un sommaire au lieu de l'article que l'image lui
a promis, et l'épingle ne ramène personne. C'est ce qui distingue une
carte de liste de la page d'un article, où l'adresse de la page est déjà
la bonne.

**Le fond de l'épingle s'assombrit SELON la source, et c'est mesuré.**
`brightness: 0.55` avait été réglé sur ses couvertures d'articles, dont
la luminosité moyenne va de 22 à 40 sur 255. Le schéma du hub est à
236 : le même réglage n'en faisait pas un fond sombre, il en faisait un
fond GRIS, délavé. Le seuil est posé à 120, loin des deux groupes : il
ne départage rien à la limite, il constate un écart qui existe. **Les
dix épingles d'articles sont inchangées à l'octet près**, vérifié.

**Les six pages d'outil (Tally, Typeform, Jotform...) n'ont PAS
d'épingle, et c'est écrit dans le générateur.** Leur `og:image` est une
CAPTURE D'ÉCRAN d'un service tiers : en faire une épingle ferait
circuler la page de tarifs de Zapier sous le nom de Béné. Et on ne peut
pas en dessiner une, parce que ce générateur refuse d'écrire du texte
dans une image (la police dépend de la machine qui construit). Elles
attendent un visuel d'elle, et le script le DIT au lieu de recevoir en
silence une épingle qu'elle n'aurait pas choisie.

### La revendication du domaine

`PINTEREST_DOMAIN_VERIFY` sur le serveur, lue à chaque rendu (aucun
rebuild). Son nom et sa photo s'affichent alors sur chaque épingle qui
vient de `tiquiz.fr`, y compris celles épinglées par quelqu'un d'autre.

**Le code est VALIDÉ, pas cru sur parole** : c'est la règle du 2 août,
un `??` protège du MANQUANT jamais du FAUX. Une balise `p:domain_verify`
mal formée fait échouer la revendication EN SILENCE, ce qui se découvre
des mois plus tard. Valeur absente : aucune balise, et on se tait.
Valeur posée et illisible : aucune balise, et ça CRIE dans `pm2 logs`
(`instrumentation.ts`). Le message dit la LONGUEUR, jamais la valeur.

Le cas le plus probable est prévu : Pinterest met la balise ENTIÈRE dans
le presse papier, donc `codeVerificationPinterest` accepte aussi
`<meta ... content="...">` et en extrait le contenu.

### Ce qui n'était PAS notre bug, et qu'il faut savoir lire

Sa console montrait `429` sur `/resource/PinResource/create/` et
"Impossible de traiter votre demande". **Un 429 est une limite de débit
de Pinterest sur SON compte**, pas un refus de notre image : les
fichiers répondent `200` (vérifié en production avec l'agent de
Pinterest, épingle et couverture). Les `#__PWS_DATA__ was not found in
the DOM` viennent du script de Pinterest lui même, sur leur propre page.

**Un symptôme rapporté est une observation, jamais un diagnostic** (même
leçon que "les champs image ont disparu" du 31 août, qui était un 403).
Ici les deux étaient vrais en même temps : le 429 bloquait ses essais
du moment, ET il n'y avait vraiment rien à épingler hors d'un article.

Test : `tests/logic/epingles-pinterest.test.mts`, vérifié en rejouant la
version d'avant (il rougit).

## Le sitemap existait, le flux non (1er septembre 2026)

Béné : "j'ai un sitemap ? Un feed ? Pour automatiser le flux des
articles ou je sais pas quoi..."

**Mesuré sur la production avant de répondre :**

| Adresse | |
|---|---|
| `/sitemap.xml` | **200**, 29 adresses, les 10 articles dedans |
| `/llms.txt` | **200** |
| `/rss.xml`, `/feed.xml`, `/atom.xml`, `/blog/rss.xml` | **404**, tous |

### Ce qu'un sitemap ne sait pas faire

Un sitemap dit à un MOTEUR quelles pages existent. Il ne porte ni titre,
ni texte, ni image, ni date lisible : **personne ne peut en tirer un
post ou une épingle**. C'est pour ça qu'il ne remplace pas un flux, et
que les deux coexistent partout.

Un flux est la prise sur laquelle se branche ce qui automatise : Zapier,
Make, n8n et Pabbly savent tous surveiller une adresse RSS et fabriquer
quelque chose à chaque nouvel article.

### LA DÉCISION QUI COMPTE : l'image du flux est l'ÉPINGLE

`<enclosure>` porte l'épingle 1000 x 1500, pas la couverture 1200 x 675.
C'est le champ que lisent les automatisations quand elles demandent
"l'image de cet article", et le premier usage de ce flux est de publier
sur Pinterest, où une image en 16/9 ne circule pas.

**La couverture n'est pas perdue** : elle est DANS la description, donc
un lecteur de flux et un aperçu email l'affichent normalement. Chacune à
sa place.

Sans épingle construite, l'article sort SANS `enclosure` plutôt qu'avec
une couverture paysage : une automatisation qui recevrait le mauvais
format publierait une épingle qui ne circule pas, et personne ne verrait
jamais pourquoi.

### Trois détails qui cassent un flux en silence

1. **L'échappement.** Un seul `&` non échappé rend le flux ENTIER
   illisible, et aucun lecteur ne dit quelle ligne l'a cassé.
   L'esperluette s'échappe EN PREMIER, sinon on échappe celles qu'on
   vient d'ajouter (même piège que `echapperMotifLike`).
2. **La date est à MIDI**, jamais à minuit. `publieLe` est une date
   courte sans heure : à minuit UTC, un fuseau à l'ouest fait afficher la
   VEILLE, donc un article du 1er passe pour le 31 chez la moitié des
   lecteurs.
3. **`length="0"` dans l'`enclosure`** est toléré partout, donc personne
   ne le remarque : on lit la vraie taille sur le disque. Le test le
   refuse, c'est le genre de valeur qu'on écrit sans y penser.

### L'adresse porte `.xml`, et le flux s'annonce

`/blog/rss.xml` et pas `/blog/rss` : un flux se colle dans un outil qui
attend un fichier, et beaucoup refusent une adresse sans extension.

Il est déclaré sur le sommaire, les rubriques ET les articles
(`alternates.types`) : un flux qui n'est annoncé nulle part n'existe que
pour qui connaît déjà son adresse. Et dans `llms.txt`, parce que sa liste
d'articles est figée au déploiement alors que le flux dit toujours l'état
du jour.

**AUCUNE base n'est touchée**, et c'est délibéré : le blog s'affiche sans
Supabase (leçon du 30 août, où un `import` de `supabaseAdmin` faisait
répondre 500 à toute la page d'article). Un flux qui tombe le jour d'une
panne de base est un flux sur lequel on ne peut pas compter.

Test : `tests/logic/flux-blog.test.mts`, vérifié en rejouant un mauvais
type de contenu (il rougit).

**TRANCHÉ LE MÊME SOIR, et ça ferme la question :** Béné, "on s'en fout
de vérifier dans systeme io c'est plutôt pour partager sur les réseaux
etc". Le flux sert donc les automatisations de PARTAGE (Zapier, Make,
n8n, Pabbly vers Pinterest et les réseaux), pas l'email. Ce qui n'est
toujours pas vérifié, c'est si Systeme.io sait lire un RSS, et ce n'est
plus une question à se poser.

## La page de vente servie n'était pas la page affichée (2 septembre 2026)

Béné : "je voudrais mettre à jour la page de vente de tiquiz pour
qu'elle reflète sa vraie valeur. [...] je ne veux pas que tu la mettes
directement en ligne, il faut que tu construises une version de travail
en dupliquant la page actuelle et en me montrant ce que tu fais dessus.
Elle ne doit pas être indexée ni rien, je veux juste voir sa version en
ligne pour corriger. [...] La page doit dérouler toutes les infos dans
un ordre logique, agréable à découvrir, devancer les objections, avoir
des enchaînements fluides : il n'est pas question d'empiler les infos à
ajouter de manière aléatoire."

### LA TROUVAILLE, ET ELLE VAUT POUR TOUTE PAGE CAPTURÉE

**Le HTML que nous servons est IGNORÉ.** Les trois fichiers
`/v/tiquiz/*.js` sont le bundle React de l'éditeur Systeme.io
(`webpackChunk_publisher_dist_publisher_sales`), et il RECONSTRUIT la
page depuis `window.__PRELOADED_STATE__`, c'est à dire depuis le modèle,
pas depuis le document.

Mesuré dans un vrai Chromium sur la v2 déjà construite : le navigateur
recevait **23 sections dans le nouvel ordre**, le DOM en rendait **19
dans l'ancien**, sans aucun bloc neuf, avec le popup de la vente bêta
revenu. Aucune erreur visible. Une page qui ignore tout ce qu'on lui
écrit.

**MA PREMIÈRE SONDE AVAIT CONCLU L'INVERSE, et c'est la leçon.** Je
l'avais lancée sur la page D'ORIGINE, dont l'ordre du DOM est par
construction celui du modèle : elle ne pouvait pas distinguer « React ne
touche à rien » de « React réécrit à l'identique ». **Un test qui ne
distingue pas ce qu'il est censé distinguer est pire qu'un test absent**
(leçon des clés Supabase, 22 août), et la sonde qui tranche est celle
qui tourne sur une page DÉLIBÉRÉMENT différente.

**Le bundle est donc retiré de la v2**, et ça ne coûte rien. Comparé
écran par écran, avec et sans : la bascule mensuel / annuel (17 € et
29 € -> 170 € et 290 €), le sélecteur de langue, les 10 ancres du menu
dont aucune morte, les 22 animations au défilement, et la FAQ (1608 px,
4886 caractères, dépliée) sont IDENTIQUES. La FAQ méritait d'être
mesurée : elle n'a jamais été un accordéon, ni avec le bundle ni sans,
et le supposer aurait fait renoncer pour une régression imaginaire.

Deux choses s'améliorent : **1429 Ko -> 669 Ko**, et **22 erreurs React
-> 0**. Le prix à payer est un aller simple : une page sans son modèle
ne se rouvre plus dans l'éditeur Systeme.io. Ce n'est pas un problème,
elle est servie par nous, mais ça se dit au lieu de se faire en silence.

### UN CHANTIER EXIGE LA CLÉ, MÊME SUR LE DOMAINE PUBLIC

`isSalesOpen` répond OUI à tout ce qui arrive sur un hôte de vente :
c'est voulu, `tiquiz.fr` doit servir sa page sans clé. Mais la route
d'aperçu sert N'IMPORTE QUEL slug de `PAGES` : ajouter `tiquiz-v2` à
cette table aurait publié le chantier sur `tiquiz.fr`, indexable, avec
la mesure d'audience et les données de marque. Et ça se serait vu à
quoi ? À rien.

`lib/sales/chantier.ts` nomme donc les CHANTIERS, pas les pages
publiques : **un oubli laisse une page fermée**, ce qui est le sens sûr
de l'erreur. Retirer un slug de cette liste est le geste qui le publie.

### LA PAGE SE CONSTRUIT, ELLE NE SE RETOUCHE PAS

```bash
npm run vente:v2               # construit content/sales/tiquiz-v2.html
npm run vente:v2 -- --verifie  # dit ce qu'il ferait, n'ecrit rien
```

`content/sales/tiquiz.html` fait 1,4 Mo d'une traite : une retouche à la
main dedans ne se relit pas et se perd à la prochaine capture. Le plan
vit dans `lib/sales/planV2.ts` (pur, testé), les blocs neufs dans
`content/sales/v2/*.html`, et le script REFUSE de finir en silence : une
section absente du plan, un id disparu, un bloc manquant, une correction
qui ne mord pas, le popup ou le bundle introuvables -> il s'arrête.

**Ce qui rend le réordonnancement possible est mesuré, pas supposé :**
les 19 sections sont des frères, chacun dans exactement la même
enveloppe `<div class="sc-iHGNWg iintFh">`. On les déplace ENTIÈRES : le
CSS de la page cible des `#section-<id>`, et couper dedans casserait la
mise en page sans qu'un test puisse le voir.

### CE QUI A CHANGÉ DANS L'ORDRE, ET POURQUOI

Le défaut n'était pas le contenu, c'était la PROGRESSION. Le visiteur
lisait six blocs de bénéfices avant de savoir COMMENT l'outil marche :
le mécanisme (les 4 étapes) vivait au 11e rang, enfoui dans le plus gros
bloc de la page. Et cinq bénéfices à la suite, tous de la même forme
(visuel, texte, bouton), font un plateau : on décroche au troisième.

Le mécanisme remonte donc au 5e rang, juste après la douleur, et les
blocs neufs coupent le plateau. Le test fige les deux règles : le
mécanisme passe devant tous les bénéfices, et la qualification passe
entre la preuve et le prix.

### LES QUATRE BLOCS NEUFS, ET LEUR SOURCE

| Bloc | Ce qu'il ferme | Vérifié dans |
|---|---|---|
| le funnel quiz | chacun repart vers SON offre | `lib/quiz/resultCta.ts`, `lib/quizScoring.ts` |
| où vit ton quiz | « je suis sur WordPress », « je n'ai pas de site » | `lib/quiz/urlPublique.ts`, l'embed |
| quand ça tourne | pixels, automatisation, affiliés, générateurs | `lib/effectivePixels.ts`, `lib/automatisation/planSysteme.ts`, `lib/quiz/affiliateRelay.ts`, `lib/generateurs/` |
| c'est pour toi si | la qualification, avant le prix | trois refus VRAIS, dont l'examen noté qui n'existe pas |

**Chaque bloc porte sa justification en commentaire, et le test
l'exige.** Sans elle, le prochain passage prend une affirmation vérifiée
pour une formule commerciale et la réécrit.

**Et « 100+ langues » était faux.** Compté dans `lib/quizLanguages.ts` :
le catalogue porte EXACTEMENT 100 entrées, qui couvrent 83 langues
distinctes plus leurs variantes régionales. « 100+ » sur-compte d'une
unité, « 100 langues » sur-compte les langues distinctes de 17. La page
dit donc **« 100 langues et variantes »**, et le test compare le chiffre
affiché au module qui le sert.

**L'INTERFACE EST EN 7 LANGUES, PAS 5.** Béné en annonçait 5 dans sa
liste du 1er septembre ; `i18n/config.ts` en porte 7
(fr, en, es, it, ar, pt, pt-BR). La page SOUS-vendait, ce qui est
l'autre façon de mentir.

Test : `tests/logic/page-vente-v2.test.mts`, vérifié en rejouant la
version d'avant (il rougit sur le bundle remis).

### Le deuxième passage (2 septembre, l'après-midi)

Sa relecture a trouvé quatre choses, et l'une d'elles était une
régression que j'avais causée.

**LA FAQ NE S'OUVRAIT PLUS, ET MA MESURE DISAIT LE CONTRAIRE.** Béné :
"je ne peux pas cliquer sur les éléments de la faq". Elle avait raison.
L'accordéon d'origine est piloté par le bundle React ; en le retirant,
je l'ai figé. J'avais pourtant comparé la FAQ avant et après, et écrit
« identique » : hauteur au repos 1608 px, texte 4886 caractères, des
deux côtés. **Je n'avais jamais cliqué.** Refait avec un clic :

```
ORIGINE  1608 px -> 1730 px   ça s'ouvre
V2       1608 px -> 1608 px   immobile
```

Deuxième fois dans le même chantier, sur la même page, qu'un contrôle ne
distingue pas ce qu'il est censé distinguer. La règle est écrite depuis
le 22 août ; ce qui manquait ici, c'est de **mesurer le GESTE, pas
l'état au repos**. Un écran interactif se teste en le touchant.

**La FAQ est refaite en `<details>` natif**, sans une ligne de
JavaScript : elle ne peut plus se casser en retirant un script, elle
s'ouvre au clavier, et Ctrl+F ouvre le bon panneau. Seize questions en
cinq groupes (24 Ko -> 14 Ko).

**ET ELLE EST CONSTRUITE À PARTIR DU JSON-LD.** La page portait déjà un
`FAQPage` avec les 16 questions ; écrire la FAQ visible à côté aurait
donné deux listes, donc Google à qui on raconte autre chose qu'à la
lectrice. Le script LIT les données structurées et fabrique la section
avec. **Ma propre sonde a d'ailleurs attrapé la suite du piège** : le
JSON-LD vivait DANS la section, donc la remplacer l'emportait. Il est
maintenant reconstruit depuis les questions CORRIGÉES et reposé avec
elle.

**Une seule liste d'avantages pour la grille ET le bon de commande.**
`lib/checkout/avantages.ts`. Le bon de commande avait sa propre liste de
six lignes, IDENTIQUE pour les quatre paliers : quelqu'un qui achetait
« mensuel Plus » à 29 € lisait exactement ce que lisait celui qui
achetait « mensuel » à 17 €. Il annonce maintenant ce que Plus ajoute,
et les trois nouveautés (pixels, guide d'automatisation, quiz partagé
par les affiliés) sont dans les six colonnes de tarif ET sur le bon de
commande, depuis la même source. Le test interdit qu'un texte y soit
recopié à la main.

**« C'est pour toi » est devenu un quiz de trois questions.** Béné :
"on avait un quiz rapide en 3 questions à l'époque, ce serait plus
logique non ?". Elle a raison : la page qui vend des quiz doit en faire
vivre un. Trois questions, un verdict qui sait dire NON, et **zéro
script** (radios + CSS `:has()`), parce que c'est un script qui vient de
tuer la FAQ. Il ne capture rien et ne prétend pas être un quiz Tiquiz.

**Ce que la relecture a corrigé sur la forme :** le padding des blocs
neufs (70 px alors que toute la page est à 100 px, mesuré), et leurs
boutons (trois familles de boutons sur une page, ramenées à celle de la
page : #5A6EF6, rayon 999px, animation `tqButtonPulse`).

### Le troisième passage (2 septembre, le soir) : quatre reproches, quatre causes

"Le logo en bas il descend sur les liens et les icônes sur les boutons
sont chelou partout. Pareil pour les listes à puces. Peut être qu'on peut
modifier ou supprimer la partie sur le premier outil de quiz connecté à
Systeme io ?" Plus, séparément : "les liens légaux doivent toujours
s'ouvrir dans une nouvelle page, on ne veut pas que le visiteur perde la
page ni le bon de commande aussi."

**1. LES ICÔNES : j'avais enfreint ma propre règle du matin même.** En
retirant Font Awesome, les 144 icônes de la CAPTURE ont été dessinées en
SVG. Mes DEUX blocs neufs, eux, posaient encore des caractères Unicode
en `content` : `\2713` (la coche) et `\2192` (la flèche). Les deux
rendent très bien dans Inter et Open Sans sur MA machine, et dans aucune
des deux sur la sienne : ces glyphes n'existent dans ni l'une ni l'autre,
donc le navigateur va les chercher où il peut, et sur Windows il rend le
carré vide.

**Un caractère qui dépend des polices installées n'est pas une icône,
c'est un pari.** Le test vise donc les `content` qui portent un point de
code dans TOUS les blocs neufs, pas la présence d'un masque : c'est la
faute qu'on refait, pas la correction qu'on oublie.

**2. LE LOGO DU PIED DE PAGE : un `width` est une PLACE RÉSERVÉE, pas la
taille d'un fichier.** L'étape des portraits réécrivait `width` avec la
largeur du fichier réduit, sous ce commentaire : "un `width` qui ment sur
la taille reelle est exactement ce qu'un controle finit par relever".
C'était faux en HTML, et ça a coûté exactement ce que Béné a vu.

| | déclaré | rendu |
|---|---|---|
| capture | `width="108"`, aucune hauteur | 108 x 56 |
| avant correction | `width="324" height="167"` | **108 x 167** |
| après | `width="108" height="56"` | 108 x 56 |

Sa classe le borne à 108 px : le CSS gagnait sur la largeur, l'attribut
restait seul sur la hauteur, donc le logo était ÉTIRÉ sur 167 px au lieu
de 56 et recouvrait les liens légaux sur 92 px. MESURÉ dans Chromium :
2 images sur 104. Après correction, le bas du logo tombe à 25565 et les
liens commencent à 25584.

**ET MA PREMIÈRE SONDE EN ACCUSAIT UNE TROISIÈME.** Elle lisait les
largeurs CSS sans écarter les MEDIA QUERIES, donc elle comparait
l'attribut d'une image à sa largeur MOBILE. Septième fois de la semaine
qu'un contrôle ne distingue pas ce qu'il est censé distinguer, et la
première où je l'ai vu avant de corriger un fichier innocent. Le test
retire les blocs `@media` avant de lire quoi que ce soit.

**J'avais aussi commencé par écrire la mauvaise correction** : faire lire
au poseur de dimensions la largeur du CSS. Mesuré ensuite : **zéro image
de la page est dans ce cas** (aucune n'a une largeur CSS sans attribut
`width`). C'était donc une branche que rien n'exerce, c'est à dire le
piège que ce fichier décrit ailleurs (`simuler()`, 31 août). Retirée, et
la vraie cause corrigée à sa place.

**3. LE WIDGET « 1er outil quiz connecté à Systeme.io » : on retire le
spectacle, pas le différenciateur.** `#tqz-scoop-widget` faisait 18,1 Ko
à lui seul (cinq scènes animées, dix-huit confettis en CSS, un script de
boucle) et racontait le parcours que la page explique DÉJÀ trois fois
autour de lui : la section qui le porte EST le mécanisme, "où vit ton
quiz" dit où le quiz est servi, "quand ça tourne" dit ce qui part chez
Systeme.io tag par tag.

`content/sales/v2/mention-systeme-io.html` garde la PHRASE : "connecté à
Systeme.io" est la requête la plus rentable du produit (elle porte le
`<title>` et tout le hub `/integrations`), et c'est le seul argument que
ni Tally, ni Typeform, ni Interact ne peuvent écrire.

**On remplace le CONTENU du bloc `#rawhtml-21bf9dec`, jamais la
section** : la retirer emporterait le comparatif et les 4 étapes, c'est à
dire ce que Béné dit justement être bien expliqué. Et **la boucle
d'animation part avec** : la garder laisserait un
`getElementById("tqz-scoop-widget")` qui rend `null` pour toujours. Elle
est COMPTÉE dans `SCRIPTS_RETIRES.widget`, pas ignorée : le contrôle qui
vérifie qu'aucun de ses scripts n'a été perdu compare un nombre, et un
nombre qu'on ajuste à la main le jour où il rougit ne protège plus rien.

**4. LES LIENS LÉGAUX : une TROISIÈME moitié de la règle du 24 août.**
Celle là portait deux moitiés (le sanitizer pour le texte riche, nos
liens écrits en dur). La page de vente n'était couverte par AUCUNE des
deux : elle est CAPTURÉE, et on ne réécrit que ses adresses au moment de
la servir.

MESURÉ sur la page construite : **10 ancres légales, 6 en
`target="_self"`, 4 sans rien, ZÉRO en `_blank`.**

**Et le premier jet n'en aurait corrigé que 4 sur 10.** Il gardait tout
`target` déjà écrit, "parce que la capture pourrait en porter un que
quelqu'un a choisi". C'était une SUPPOSITION, et le relevé la contredit :
`_self` est ce que l'éditeur de Systeme.io écrit mécaniquement sur chaque
lien, ce n'est le choix de personne. `_self` se remplace donc ; un
`target` NOMMÉ (`_parent`, `_top`, un nom de fenêtre) reste, lui,
puisqu'il ne s'obtient pas par défaut.

**`ouvrirLiensLegauxDansUnOnglet` tourne HORS du `if (opts.siteLinks)`.**
Sur un chantier relu derrière la clé d'aperçu, `siteLinks` vaut null,
donc les liens portent encore les adresses de Systeme.io : ils font
quitter la page encore plus sûrement. `estLienLegal` les reconnaît, et
la liste se DÉDUIT de `SALES_SITE_LINKS` (toute clé dont la destination
est une de nos pages légales) : une deuxième liste écrite à la main
finirait par ne plus dire la même chose que la première.

**TROUVÉ AU PASSAGE, ET C'ÉTAIT UN 404 :** le bandeau cookies pointait
sur `/politique-de-cookies`, le chemin de Systeme.io. Nos pages
s'appellent `/legal`, `/terms`, `/terms-of-use`, `/privacy` et
`/cookies` : ce lien répondait 404, sur l'encart où on demande justement
au visiteur de faire confiance. C'est le drame du centre d'aide du
24 août, à un lien près. `rewriteSiteLinks` ne pouvait rien : il ne
connaît que les adresses ABSOLUES, et celle ci est écrite en relatif dans
la configuration JavaScript du bandeau.

Tests : les 4 cas ajoutés à `tests/logic/page-vente-v2.test.mts` et les
5 de `tests/logic/liens-legaux.test.mts`, vérifiés en rejouant les trois
versions d'avant (l'ancien garde sur `_self`, la coche Unicode, la
largeur du fichier) : les trois rougissent.

### Ce que la mesure a trouvé en plus, sur le référencement

**La page servait DEUX `<h1>`, tous les deux VISIBLES en même temps**, à
1280 px comme à 390 px. Ce ne sont pas les versions large et mobile d'un
même titre : ce sont les deux moitiés d'une phrase (« Booste ton
trafic » et « Grâce aux quiz interactifs ») découpées en deux titres de
niveau 1. Un moteur ne sait alors plus quel est le sujet de la page. La
deuxième moitié devient un paragraphe, et garde exactement sa taille et
sa couleur (elles viennent du conteneur, pas de la balise).

**65 images sur 105 passent en chargement différé**, les huit premières
exceptées : différer une image du premier écran la fait arriver plus
tard, donc dégrade exactement la mesure qu'on cherche à améliorer.
Mesuré : 1585 Ko d'images téléchargées au chargement, contre 280 Ko
après.

### 🚨 J'AI ANNONCÉ « 2552 Ko de CSS, de loin le premier poste de
lenteur ». C'ÉTAIT FAUX, et je l'ai écrit ici comme un fait.

`performance.getEntriesByType("resource")` range sous
`initiatorType: "css"` **tout ce qu'une feuille de style va CHERCHER**,
polices et images de fond comprises. J'ai lu ce total comme le poids du
CSS. Mesuré autrement, la page porte **316 Ko de CSS en ligne et 13 Ko
liés**, et la couverture CDP (`CSS.startRuleUsageTracking`) dit que
**100 % des 2428 règles suivies servent**. Il n'y avait rien à
dégraisser.

**Le poids était ailleurs, et il a été retiré :**

| Poste | Avant | Après |
|---|---|---|
| 5 « SVG » de fond (chacun embarque 4 bitmaps en base64) | 1638 Ko | **260 Ko** en WebP |
| polices Font Awesome, pour 4 icônes | 911 Ko téléchargés (1769 Ko déclarés en 15 `@font-face`) | **0**, les icônes sont dessinées |
| images du premier chargement | 1585 Ko | **280 Ko** (65 différées sur 105) |
| **la page entière** | **8551 Ko, 72 requêtes, 2708 ms** | **1556 Ko, 21 requêtes, 544 ms** |

**La leçon est celle du 22 août, refaite dans un autre outil : un
chiffre lu dans un outil n'est pas une mesure tant qu'on n'a pas
vérifié ce qu'il COMPTE.** Et j'ai accusé un fichier innocent pendant
deux jours, exactement comme la clé anon en août.

**Les 4 icônes sont DESSINÉES À LA MAIN** (`lib/sales/iconesV2.ts`,
24x24, un cercle, une coche, une flèche, une caméra) et posées en
`mask-image`. Recopier les tracés de Font Awesome serait recopier du
code sous licence pour éviter d'en charger la police. Le test borne la
longueur de chaque tracé : un tracé importé se voit à sa longueur.

**Un masque CSS ne lit que le canal ALPHA.** Ma coche blanche par
dessus le disque était OPAQUE, donc elle faisait partie du masque : les
106 coches de la grille de tarifs sont sorties en pastilles pleines. La
coche est DÉCOUPÉE dans le disque par un `<mask>` SVG, et le test
l'exige (`<mask>` présent, aucun `stroke="#fff"`).

**Et la grille de tarifs écrit ses classes en guillemets SIMPLES**
(`class='fas fa-check-circle'`). Mon marquage ne lisait que les doubles :
38 icônes sur 128. Les deux formes sont lues, et le test le fige.

**Les 104 images portent toutes un texte alternatif**
(`lib/sales/altImagesV2.ts`, 34 fichiers classés en les REGARDANT sur
une planche-contact). 18 portent un texte, 18 sont déclarées
décoratives, et **un `alt` vide est une décision ÉCRITE** : sans la
raison à côté, le prochain passage prend le vide pour un oubli. On
n'écrase JAMAIS un `alt` existant. Le logo du pied de page annonçait
« Logo Tipote » : c'est le logo Tiquiz, et il double le nom écrit à côté,
donc son texte est vide.

**79 images sur 105 portent leurs dimensions**, lues dans les premiers
octets par `lib/blog/dimensionsImage.ts`. Les 25 illisibles sont
laissées telles quelles : inventer une taille déformerait l'image au
lieu de réserver sa place. Le test refuse une moitié de dimensions
(`width` sans `height`), qui déforme à coup sûr.

## Le quiz de la démo se retrouve dans le compte (Béné, 2 septembre 2026)

"Il faut qu'ils génèrent un beau quiz, super pertinent, qui donne envie
d'aller plus loin, et qu'ils le retrouvent derrière, comme la plupart
des saas le font : un aperçu gratuit alléchant qui demande de créer un
compte pour continuer."

Et la remarque qui a débloqué la chose : "ça doit être beaucoup plus
simple maintenant que la page de vente est aussi sur notre serveur."
Elle a raison, et c'est exactement ce qui rend le correctif possible.

### CE QUI SE PASSAIT, ET C'EST MESURÉ

Le quiz n'était pas perdu : `/api/embed/quiz/generate` crée une VRAIE
ligne dans `quizzes`, sans propriétaire, marquée du jeton de session, et
aucun cron ne la purge. Ce qui se perdait, c'était le JETON, et il
voyageait par deux chemins qui fuyaient tous les deux.

**1. Le `localStorage` écrit DANS l'iframe.** MESURÉ dans Chromium 141,
deux domaines distincts, comme sur la vraie page :

```
réglages par défaut     écrit "abc123"        relu "abc123"
cookies tiers bloqués   écrit SecurityError   relu null
```

Dès que les cookies tiers sont bloqués (**le défaut de Safari et de
Firefox**), l'iframe n'a PAS le droit d'écrire, et le `try/catch` autour
avale l'erreur : personne ne le sait, à commencer par nous.

**2. Le `?tq_session=` collé sur l'URL du bon de commande.** Sauf que
cette adresse était `www.tipote.fr/tiquiz`, un tunnel Systeme.io, qui ne
transmet pas la query. C'est la raison même du rapatriement des 8
destinations affiliées (25 août), reproduite ici sans que personne ne
fasse le rapprochement. Et même arrivé chez nous, `tq_session` n'était
lu qu'à UN endroit, le tableau de bord.

Donc : Chrome par défaut, ça marchait. Safari et Firefox, la personne
repartait de zéro dans son compte alors que son quiz existait en base,
complet, à côté.

### LA RÈGLE : le jeton voyage par une NAVIGATION, le rattachement se
fait CÔTÉ SERVEUR

`lib/embed/reprise.ts` (pur, testé) décide où l'on envoie quelqu'un qui
veut garder son quiz : **notre inscription, sur le domaine où il est
déjà**. Le jeton part dans une navigation de PREMIER NIVEAU, donc plus
aucune dépendance au stockage du navigateur, donc plus aucune différence
entre Chrome, Safari et Firefox.

`lib/embed/rattacherQuiz.ts` fait le transfert, et **il n'y en a qu'un**.
`/api/auth/signup` l'appelle (le chemin normal désormais) et
`/api/embed/quiz/claim` aussi (le filet du tableau de bord). Deux
endroits qui transféreraient chacun de leur côté finiraient par se
contredire : c'est le défaut sorti six fois dans ce dépôt, et ici la
contradiction se compte en quiz perdus.

**Quatre choses à ne pas défaire :**

1. **Les adresses sont RELATIVES** (`/embed/preview`, `/signup`). La
   page de vente est servie sur `tiquiz.fr` en public ET sur le domaine
   de l'app quand on relit un chantier avec la clé d'aperçu : une
   adresse absolue serait juste dans un cas et fausse dans l'autre, et
   l'erreur ne se verrait qu'en cliquant.
2. **L'iframe n'est plus TIERS.** Il pointait sur `quiz.tipote.com`
   depuis `tiquiz.fr` ; il pointe maintenant sur la même origine. Ce
   n'est pas ce qui répare le trou (le jeton ne dépend plus du
   stockage), mais ça retire la cause qui l'avait créé.
3. **Le rattachement passe APRÈS la création du compte**, best-effort,
   et il ne jette jamais : un transfert qui échoue ne doit pas priver
   quelqu'un de son inscription. Même règle que `rattacherInscrit`.
4. **Le transfert pose le propriétaire AVANT de marquer la session.**
   Marquer d'abord laisserait une session "réclamée" dont le quiz n'a
   toujours pas de propriétaire, c'est à dire un quiz que plus aucun
   appel ne peut rattraper (le filet refuse une session déjà réclamée).
   C'est la règle des lots de versement du 25 août : on crée la pièce
   avant de la solder.

**Le cas "j'ai déjà un compte" ne rattache RIEN**, et c'est voulu : une
adresse déjà inscrite ne prouve pas qu'elle appartient à la personne
devant l'écran. Le lien de connexion porte donc le jeton
(`urlConnexionReprise`), vise le domaine de l'APP (le tableau de bord
n'existe pas sur le domaine de vente), et c'est `EmbedAutoClaim` qui
rattache une fois la session ouverte. Ce composant reste, mais il n'est
plus le chemin principal : c'est le filet.

**Le bouton s'appelle "Garder mon quiz", plus "Débloquer Tiquiz"** : le
geste se nomme par ce qu'il fait pour la personne, pas par ce qu'il nous
rapporte.

### TROUVÉ AU PASSAGE, ET C'EST UN VRAI TROU

**Le `?redirect=` de la connexion était poussé tel quel.** Une valeur du
genre `https://ailleurs.example` emmenait la personne hors de chez nous
**juste après son mot de passe**, c'est à dire à la seconde exacte où
une fausse page de connexion est rentable. `redirectionSure` n'accepte
qu'un chemin interne, et refuse le **double slash** : `//ailleurs.example`
est une adresse ABSOLUE pour le navigateur, et elle commence bien par
`/`. C'est le cas qu'on rate toujours, et le test le rejoue.

**Et la démo écrivait avec un budget PLUS PETIT que l'app.**
`max_tokens` valait 6000 côté embed et 8000 côté app, alors que l'embed
laisse demander jusqu'à 10 questions et 5 profils. Un quiz qui touchait
le plafond revenait TRONQUÉ, donc `JSON.parse` échouait, donc le
visiteur lisait **"JSON IA invalide"** sur l'écran même qui doit lui
donner envie. Le budget vit maintenant dans le module qui porte le
prompt (`QUIZ_GENERATION_MAX_TOKENS`), et le cas restant DIT quoi faire
au lieu d'accuser le format. Le prompt, lui, était déjà le même des deux
côtés : c'est vérifié, pas supposé.

### ET LA FAUTE QUE J'AI FAITE EN ÉCRIVANT LE TEST

Mon contrôle "le cas tronqué est traité AVANT la lecture du JSON"
cherchait `JSON.parse` dans le fichier ENTIER. Il tombait sur ma propre
explication écrite juste au dessus du contrôle, et sortait **rouge sur
un fichier parfaitement correct**. Un contrôle qui ne distingue pas ce
qu'il est censé distinguer est pire qu'un contrôle absent, et c'est la
cinquième fois de la semaine. Les tests qui mesurent un ORDRE dans un
fichier retirent d'abord les commentaires.

**Endroits à respecter :** `lib/embed/reprise.ts` (pur),
`lib/embed/rattacherQuiz.ts` (les écritures, aucune décision),
`app/api/auth/signup/route.ts`, `app/api/embed/quiz/claim/route.ts`,
`app/signup/page.tsx` + `components/auth/SignupForm.tsx`,
`components/auth/LoginForm.tsx`, `components/dashboard/EmbedAutoClaim.tsx`,
`public/embed/bridge.js`, et la correction de l'iframe dans
`lib/sales/planV2.ts`. Test :
`tests/logic/reprise-quiz-embed.test.mts`, vérifié en rejouant les trois
versions d'avant (elles rougissent).

**Ce chantier n'a PAS de jumeau chez Tipote** : il n'a ni page de vente
capturée, ni `embed_quiz_sessions`. Vérifié, pas supposé.

## La connexion Google, et les trois choses qu'elle aurait fait perdre (2 septembre 2026)

Béné : "on pourra bosser sur l'optin et login via Google ?", puis "sans
rien casser ni perdre de ce qui existe, je ne veux pas de mauvaise
surprise."

### LE PIÈGE, ET IL ÉTAIT ENTIER

`supabase.auth.signInWithOAuth` crée le compte **DANS Supabase**, sans
passer par `/api/auth/signup`. Or c'est cette route, et elle seule, qui
faisait les trois choses qui comptent après une inscription :

| | Ce qu'un bouton branché naïvement aurait coûté |
|---|---|
| `rattacherInscrit` | l'affiliée qui a amené la personne n'est JAMAIS rattachée, donc jamais payée sur la vente qui suit |
| `poserTagPlan(email, "free")` | aucun contact chez Systeme.io, donc **aucune campagne** : la personne s'inscrit et ne reçoit rien |
| le rattachement du quiz | le quiz de la démo reste orphelin en base |

**Aucun des trois ne produit d'erreur visible.** C'est exactement la
forme de panne que ce dépôt paie le plus cher, et c'est pour ça que
`POST /api/auth/accueil` a été écrite AVANT que le bouton n'existe : les
trois effets vivent au même endroit, quel que soit le chemin d'entrée.

### CE QUI NE BOUGE PAS D'UNE LIGNE

L'accueil est appelé **uniquement sur la branche `?code=`** du callback,
c'est à dire le retour d'un fournisseur. Les liens email (`verifyOtp`,
le hash implicite, la récupération de mot de passe) ne sont pas touchés,
et `/api/auth/signup` garde ses propres effets de bord : l'accueil
s'ajoute, il ne remplace rien. Le test compte les appels et exige qu'il
n'y en ait qu'un.

### ELLE NE TOURNE QU'UNE FOIS, ET JAMAIS `free` SUR UN COMPTE QUI PAIE

Le marqueur vit dans `app_metadata` (Supabase) : **aucune migration**, et
c'est le bon endroit pour un fait que le serveur écrit sur un compte et
que la personne ne peut pas modifier.

**Le marqueur est posé AVANT les appels réseau.** Deux onglets, ou un
rechargement pendant que ça tourne, feraient sinon deux accueils, sur un
chemin qui décide QUI est payé.

Et ce marqueur n'existait pas avant ce chantier : **un compte DÉJÀ
inscrit qui se connecte par Google passera donc ici une fois.** Reposer
`tiquiz-free` sur une abonnée la sortirait du seul segment qui compte
pour les relances de Béné, et ça ne se verrait sur AUCUN écran.
`tagPlanPourAccueil` rend donc `null` dès que le plan n'est pas gratuit.
C'est le garde-fou le plus important de ce chantier, et le test le
rejoue sur les six paliers.

### L'ALLER-RETOUR QUITTE NOTRE DOMAINE : ce qui survit, et comment

Deux choses doivent être encore là au retour, et **aucune ne peut
voyager dans l'URL** : Supabase ajoute son `?code=` à l'adresse de
retour, et je n'ai aucun moyen de vérifier d'ici ce que leur serveur
fait d'une query déjà présente. On ne construit pas sur une supposition.

- **le `?ref=` affilié** vit déjà dans le cookie `tq_ref`, posé par le
  middleware pour un an : il survit sans qu'on fasse rien ;
- **le quiz de la démo** n'a pas de cookie : le bouton lui en pose un
  (`tq_reprise`) juste avant de partir.

**MESURÉ dans Chromium, sur le trajet exact d'un aller-retour OAuth**
(notre domaine -> un site tiers -> retour chez nous en premier niveau) :

```
au retour de premier niveau : tq_reprise=abc123
sur une requête tierce      : (aucun)
```

`SameSite=Lax` est donc à la fois ce qui le ramène et ce qui le protège :
il n'est jamais envoyé quand un autre site déclenche une requête vers
nous en arrière plan.

**Et `Secure` n'est posé qu'en https** : en développement local, un
cookie `Secure` sur http est jeté par le navigateur en silence, et le
jeton disparaîtrait sans que rien ne le dise.

### ON REVIENT SUR L'ORIGINE D'OÙ L'ON EST PARTI

`urlRetourGoogle(origine)`. Partir de `tiquiz.fr` et revenir sur
`quiz.tipote.com` sont **deux sites différents** : le cookie posé avant
de partir serait perdu, et le quiz avec. C'est déjà ce que fait
`resolveAppUrl` pour les liens d'email depuis le 2 août, et une origine
qui n'est pas à nous (ou une adresse locale) retombe sur le domaine
canonique.

**Et le jeton se lit AUSSI dans le `?redirect=` de la connexion**
(`jetonDansRedirection`). Quelqu'un qui avait déjà un compte arrive sur
`/login?redirect=/dashboard?tq_session=...` : sans cette lecture, un clic
sur Google depuis cet écran repartirait sans son quiz, parce que
l'aller-retour OAuth ne rapporte pas le `redirect`.

### CE QUI RESTE À FAIRE, ET CE N'EST PAS DU CODE

Le bouton ne peut rien tant que le fournisseur n'est pas déclaré. Trois
réglages, tous chez Béné, et **aucun ne se devine depuis le code** :

1. un identifiant OAuth chez Google Cloud, avec
   `https://<projet>.supabase.co/auth/v1/callback` comme URI de
   redirection autorisée ;
2. les deux valeurs collées dans Supabase, Authentication > Providers >
   Google ;
3. `https://quiz.tipote.com/auth/callback` **et**
   `https://tiquiz.fr/auth/callback` dans les Redirect URLs de Supabase.
   Les deux : on revient sur l'origine du départ, et l'inscription est
   servie sur les deux domaines.

Tant que ce n'est pas fait, le bouton s'affiche et échoue proprement
avec sa phrase, le formulaire juste en dessous continue de marcher.

Test : `tests/logic/connexion-google.test.mts`, vérifié en rejouant les
trois versions naïves (le tag posé pour tout le monde, le retour toujours
canonique, l'accueil jamais appelé) : les trois rougissent.

### « PKCE code verifier not found in storage » : on échangeait le code DEUX fois (retour Béné, 2 septembre 2026)

"J'ai réessayé avec mon mail 20mn après avoir supprimé ce compte de mon
supabase et j'ai la même erreur : PKCE code verifier not found in
storage. [...] Peut être parce que google n'a pas encore validé l'app ?
Toujours url `https://quiz.tipote.com/auth/callback` et pas d'erreur
dans la console."

**Non, Google n'y était pour rien, et la session était OUVERTE.** Le
message accuse le navigateur ("storage was cleared", "a different
browser or device"), donc il envoie chercher très loin de la cause, qui
est chez nous et tient en quatre lignes de `node_modules`.

**MESURÉ dans `@supabase/ssr` et `@supabase/auth-js`, pas déduit :**

```
createBrowserClient.js:40  detectSessionInUrl: … ?? isBrowser()   -> true
GoTrueClient.js:283        au montage, si ?code= est là -> _getSessionFromURL()
GoTrueClient.js:654/666    …qui échange le code ET RETIRE le `-code-verifier`
GoTrueClient.js:2221       getSession() attend d'abord initializePromise
```

Le client échange donc le code **tout seul**, au montage, et consomme le
vérificateur au passage. Notre `exchangeCodeForSession` explicite
arrivait forcément APRÈS (il attend la même initialisation) et ne
trouvait plus rien.

**Ce n'était pas une course : c'était déterministe**, et c'est ce qui
colle exactement à son "la même erreur à chaque essai". Une vraie course
donne un résultat une fois sur deux.

**Règle : on demande la SESSION d'abord, on n'échange qu'en repli.**
`getSession()` attend l'initialisation, donc il rend la session que la
détection automatique vient d'ouvrir. L'échange manuel reste là pour le
jour où `detectSessionInUrl` serait coupé : le retirer marcherait
aujourd'hui et casserait ce jour là.

**Et la leçon dépasse Supabase : deux morceaux de code qui consomment la
MÊME ressource à usage unique finissent toujours par se marcher
dessus.** Ici la bibliothèque faisait déjà le travail, correctement, et
on le refaisait par dessus. Le symptôme n'était pas "ça ne marche pas",
c'était "ça marche et on affiche une erreur", ce qui est pire.

### `tiquiz-free` ne se repose pas sur quelqu'un qui l'a déjà (Béné, 2 septembre 2026)

"Pour tiquiz-free pose un garde fou sinon systeme io va renvoyer toute
la campagne tiquiz free."

Elle a raison, et le trou était réel : `POST /api/auth/accueil` ne tourne
qu'une fois par compte (marqueur dans `app_metadata`), mais **ce marqueur
n'existait pas avant le 2 septembre**. Tous les comptes gratuits DÉJÀ
inscrits passent donc par l'accueil à leur première connexion Google, et
`poserTagPlan` reposait le tag qu'ils portent déjà. Chez elle, une règle
`tag_added` écoute `tiquiz-free` : reposer le tag **relance la
campagne entière** sur quelqu'un qui l'a lue il y a six mois.

**Règle : `siDejaPose` est un PARAMÈTRE** (`"reposer" | "ignorer"`), et
l'accueil passe `"ignorer"`. Les webhooks de vente gardent `"reposer"` :
là, reposer un tag est sans conséquence et ne rien reposer serait un
accès qui n'ouvre pas.

**Ça ne coûte AUCUN appel de plus, et c'est ce qui rend le garde-fou
gratuit :** `GET /contacts?email=` renvoie DÉJÀ le tableau complet des
tags du contact (mesuré dans son compte, son propre contact porte
`tiquiz-free`, id 1962973). On lisait cette réponse pour n'en garder que
l'`id`. `trouverContact` rend maintenant `{ id, tags }`, et la
comparaison se fait en MINUSCULES : Systeme.io n'impose aucune casse.

Nouvelle raison `deja_pose`, distincte de `ok` : le journal dit "le tag
était déjà là" au lieu de laisser croire qu'on vient de la poser. C'est
la règle du 31 août, un booléen ne dit jamais où chercher.

**VÉRIFIÉ EN PRODUCTION LE 3 SEPTEMBRE**, sur son propre compte, après
une vraie connexion Google :

```
[sio/tag] tiquiz-free est deja pose pour blagardette@gmail.com, on ne le repose pas.
[rattacher] benebottet@gmail.com : rattache sa0007878317200141bbe3de2b...
[rattacher] mareineethique@gmail.com : rattache_a_un_autre sa443cbc...
```

Les trois lignes prouvent trois choses d'un coup : le garde-fou tient,
le `?ref=` survit à l'aller-retour Google, et le premier rattachement
gagne sur une vraie inscrite.

### ET LE SUCCÈS D'UNE POSE NE LAISSAIT AUCUNE TRACE

Pour répondre à « est-ce que cette personne recevra sa campagne ? », il
a fallu raisonner par ÉLIMINATION : pas de refus, pas de « déjà posé »,
donc c'est passé. Seuls l'échec, le refus et le « déjà posé » étaient
journalisés. **Sur le chemin qui décide si quelqu'un entre dans ses
séquences email, une déduction n'est pas une mesure**, et un journal
muet sur le cas NORMAL oblige à deviner le jour où ça cloche.
`poserTagParNomDetaille` écrit donc `<tag> pose pour <adresse>.`

**Et les quatre journaux de ce fichier disaient encore "étiquette"**,
avec ses accords au féminin (« est deja posee »), c'est à dire le mot
banni le 1er septembre, dans les lignes que Béné LIT quand elle
diagnostique. `tests/logic/on-dit-tag.test.mts` ne balayait que
`messages/*.json` : il couvre maintenant `lib/sio/`.

**On cible le DOSSIER `lib/sio/`, jamais la sous-chaîne "sio"** :
filtrer les chemins qui la contiennent ramène `dimenSIOn`, `sesSIOn` et
`commisSIOn`. C'est le faux positif que ce même test raconte déjà pour
"conver-sio-ne", et il se refait tout seul.

**MES DEUX FAUTES EN L'ÉCRIVANT, et ce sont les 8e et 9e de la
semaine :**

1. mon contrôle du log de succès cherchait `console.log(\`[sio/tag]...pose`,
   qui matche AUSSI le message « est deja pose » du garde-fou juste au
   dessus. Retirer le log de succès laissait le test VERT. Il vise
   désormais le journal situé ENTRE `pose_refusee` et `raison: "ok"`,
   et il rougit quand on le retire ;
2. `apres-paiement.test.mts` exigeait la chaîne littérale `"l'etiquette"`
   pour prouver que le code explique pourquoi il n'a rien posé. **Un
   garde-fou qui fige une FORMULATION empêche de corriger la
   formulation** : il a rougi sur une correction juste. Il vise
   maintenant le FAIT (`n'existe pas chez Systeme.io`).

### La politique de confidentialité dit ce que Google nous donne (2 septembre 2026)

Béné, capture de la Google Auth Platform à l'appui : "il dit que mon app
doit être validée [...] et il ne valide pas ma privacy apparemment."

**MESURÉ avant d'écrire une ligne :** `tiquiz.fr/privacy` répond 200,
610 mots, RGPD complet (finalités, bases légales, durées, droits,
sous-traitants). Le mot "Google" y apparaissait **une seule fois**, pour
Google Analytics. **La page ne décrivait donc nulle part la connexion
Google**, ce qui est exactement ce que leur relecture cherche.

Une section 12 (« Connexion avec Google ») a été ajoutée dans les 5
langues, et les sections 12 à 15 renumérotées 13 à 16. Elle dit les six
choses que Google veut lire, et **aucune n'est une formule** :

- c'est OPTIONNEL, le mot de passe reste possible ;
- Google nous envoie EXACTEMENT trois choses : l'adresse email, le nom
  affiché, l'identifiant unique du compte ;
- elles servent à créer le compte, ouvrir la session et reconnaître au
  retour, rien d'autre ;
- **aucun autre accès** : ni Gmail, ni Drive, ni Agenda, ni Contacts, ni
  Photos, aucune permission d'écriture ou de publication, et jamais le
  mot de passe Google ;
- jamais vendu, loué, utilisé pour de la publicité, ni partagé au delà
  des sous-traitants de la section 7 ;
- révocable sur `myaccount.google.com/permissions`, et le compte Tiquiz
  survit à la révocation.

**La liste des trois données n'est pas une promesse commerciale :** c'est
ce que renvoie le scope `openid email profile`, le seul demandé. Écrire
moins serait vague (donc refusé), écrire plus serait faux.

**Ce qui reste chez Béné :** la carte « Accès aux données » de son écran
dit que la validation n'est PAS requise pour ces scopes. Le bouton
fonctionne donc dès aujourd'hui ; c'est l'écran de consentement qui
affiche encore un avertissement tant que la relecture de marque n'est
pas passée.

## Le déploiement fantôme : le serveur reconstruisait l'ANCIEN code (2 septembre 2026)

Béné : "ton code ne marche pas, il bloque ici et plus rien :
`Username for 'https://github.com':`. Mais si je fais mon code et que je
clique entrée entrée entrée ça finit par avancer. Du coup je fais quoi
bordel ??" Et, dans le même message : "je ne vois pas de modif sur les
pages légales envoyées à Google. C'est le code qui ne part pas en prod ?"

**Oui. Et ça durait avant la chaîne `&&`, sans que rien ne le dise.**

### Les trois mesures qui tranchent

| Question | Réponse |
|---|---|
| `main` porte-t-il la section Google ? | **OUI** (`25e270d3`, `lastUpdated` au 02/09/2026) |
| que sert `tiquiz.fr/privacy` ? | **22/04/2026**, aucune section "Connexion avec Google" |
| le dépôt est-il privé ? | **NON**, `"visibility": "public"` (lu par l'API GitHub, pas par un `git ls-remote`) |

Le code était donc à sa place ; c'est le SERVEUR qui ne l'avait pas.

### MA PREMIÈRE MESURE ÉTAIT INVALIDE, ET C'EST LA LEÇON

J'ai lancé `git ls-remote https://github.com/BenGOaff/tiquiz.git`, obtenu
le HEAD, et écrit ici : « le dépôt ne demande aucun identifiant, donc
l'URL du serveur est cassée ». **Les deux moitiés étaient fausses.**

L'environnement d'où je mesure est AUTHENTIFIÉ en tant que `BenGOaff`
(`api.github.com/user` le dit), et il porte un
`url.https://github.com/.insteadOf` qui réécrit les adresses. Mon test
ne pouvait donc pas distinguer « ce dépôt est public » de « ce dépôt est
privé et je suis connecté ». **Un test qui ne distingue pas ce qu'il est
censé distinguer est pire qu'un test absent** (leçon des clés Supabase,
22 août), et je l'ai refaite dans l'outil même qui servait à trancher.

Béné a passé un aller-retour à corriger une adresse qui était déjà
juste. La sortie le disait, mot pour mot :

```
origin  https://github.com/BenGOaff/tiquiz.git (fetch)
--- corrigé ---
origin  https://github.com/BenGOaff/tiquiz.git (fetch)
```

**Ce qui tranche vraiment la visibilité, c'est l'API** (`private`,
`visibility`), pas une commande git lancée depuis une machine dont on ne
connaît pas la configuration. Et avant de conclure quoi que ce soit
depuis ici : `curl -sS https://api.github.com/user`.

### LA CAUSE, TROUVÉE À LA SIXIÈME MESURE : git parlait en HTTP/2

J'ai avancé quatre causes avant celle là (l'URL du remote, un dépôt
privé, un jeton périmé, une limite de débit) et **les quatre étaient
fausses**. Aucune n'était mesurée avant d'être annoncée. Ce qui a fini
par trancher, c'est une suite de mesures qui ÉLIMINENT, chacune en une
commande :

| La mesure | Ce qu'elle a éliminé |
|---|---|
| `git config --list --name-only` | rien n'est configuré : ni credential, ni proxy, ni insteadOf |
| `curl` sur l'URL exacte de git -> **200** | GitHub sert bien le dépôt à ce serveur |
| la trace `GIT_TRACE_CURL` | la 1re requête reçoit **200**, la 2e reçoit **401** |
| `git ls-remote https://github.com/git/git.git` -> **échoue pareil** | ce n'est pas notre dépôt, c'est git sur cette machine |
| dans la trace : `HTTP/2` chez elle, `HTTP/1.1` chez moi | la seule différence entre une machine qui marche et une qui échoue |

**`git -c http.version=HTTP/1.1 pull` a débloqué instantanément.**

Sur ce serveur, git en HTTP/2 obtient un 200 sur `info/refs` puis un
401 sur la requête suivante, sur N'IMPORTE QUEL dépôt public. curl
passe, parce qu'il ne négocie pas la même chose. Le message
`Username for 'https://github.com'` ne parlait donc ni de droits, ni du
dépôt : c'est ce que git affiche quand il reçoit un 401 qu'il ne
comprend pas.

**Le réglage est POSÉ, pas répété dans la commande :**

```bash
git config --global http.version HTTP/1.1
```

Une fois, pour les trois apps du serveur. Un drapeau recopié dans une
commande de déploiement est un drapeau qu'on oublie au prochain
copier-coller.

**La méthode qui a marché, et c'est elle qu'il faut retenir : chaque
commande devait ÉLIMINER une moitié, pas confirmer une intuition.**
« curl passe » élimine GitHub. « git/git échoue aussi » élimine le
dépôt. « HTTP/2 contre HTTP/1.1 » est la dernière différence qui reste.
Quatre allers-retours ont été perdus à proposer des causes plausibles
avant de commencer à éliminer.

### LA CHAÎNE `&&` N'A RIEN CASSÉ : ELLE A RÉVÉLÉ

C'est le point à ne pas inverser, et c'est ce que Béné a vécu comme une
panne. Avec ses commandes sur des LIGNES SÉPARÉES, le `git pull`
échouait, et `npm ci`, `npm run build` et `pm2 restart` tournaient quand
même. Tout avait l'air de marcher : aucune ligne rouge, PM2 redémarrait,
le site répondait. **Et il servait l'ancien code.**

**Règle : une étape de déploiement qui échoue sans arrêter la chaîne
fabrique un déploiement fantôme**, c'est à dire le pire des symptômes :
la correction est absente, tout le reste est vert, et on va chercher le
bug dans le code au lieu du transport. Même famille que le webhook dont
le réessai ne pouvait pas repasser (24 août) et que les images en 403
(31 août) : le geste était juste, il n'atteignait pas sa cible.

### Et le contrôle qui manquait

```bash
npm run check:deploye
```

Il compare le commit que le SERVEUR a en main avec celui de `main` sur
GitHub, et **il distingue les trois cas** (leçon des clés Supabase du
22 août) : à jour, pas à jour, ou "je n'ai pas pu joindre GitHub" (avec
la commande de réparation du remote imprimée à côté). Un contrôle qui
répondrait "à jour" quand le fetch échoue serait pire que pas de
contrôle.

Il dit aussi ce qu'il ne peut PAS savoir : que le code soit tiré ne veut
pas dire qu'il soit CONSTRUIT. Le build et le redémarrage restent à
vérifier à l'écran.

## Google refuse le branding : ce qu'il regarde vraiment (2 septembre 2026)

Béné : "google ne valide toujours pas tu as lu les règles en vigueur ?"
avec ses deux reproches à l'écran.

**Non, je ne les avais pas lues.** J'avais ajouté une section « Connexion
avec Google » de cinq phrases en supposant que décrire la connexion
suffisait. Leurs deux pages d'aide (13806988 et 13807376) sont
explicites, et elles demandent autre chose.

### Reproche 1 : « ne contient pas suffisamment de contenu »

Google exige que la politique **divulgue de façon exhaustive** comment
l'app ACCÈDE aux données utilisateur Google, les UTILISE, les STOCKE, les
PROTÈGE, les PARTAGE et les CONSERVE (avec la politique de suppression),
plus la clause d'**usage limité** (Google API Services User Data Policy,
Limited Use). Mesuré : la page servait **805 mots visibles**, et la
section Google en couvrait trois axes sur six.

La section 12 traite maintenant les six, nommés un par un, dans les
5 langues, avec les scopes demandés (`openid email profile`), la liste
de ce à quoi on n'accède PAS (Gmail, Drive, Agenda, Contacts, Photos,
YouTube, écriture, publication), et la clause d'usage limité.

**Ce qui n'est PAS écrit est aussi important :** rien sur un hébergement
« dans l'Union européenne » (l'article 8 dit l'inverse), aucun délai de
suppression inventé (on renvoie aux articles 9 et 10). Une politique qui
promet ce que la page dément juste au dessus est pire qu'une politique
courte.

### CE QUE LA MESURE A TROUVÉ EN PLUS : Cloudflare masquait les emails

**4 adresses sur 4** de la page étaient servies en
`<span class="__cf_email__">[email&nbsp;protected]</span>`, y compris
celle de l'article « Contact » et celle de l'article « Vos droits ».
C'est l'option « Email Address Obfuscation » de Cloudflare, et elle
s'applique au HTML SERVI, donc elle est invisible depuis le code.

Un lecteur qui n'exécute pas le JavaScript (le validateur de Google, un
robot, un lecteur d'écran dégradé) lit donc une politique de
confidentialité **sans aucune adresse de contact**. `SansObfuscationEmail`
(`components/legal/LegalPageView.tsx`) pose les marqueurs
`<!--email_off-->` / `<!--email_on-->`, la directive officielle de
Cloudflare pour laisser une zone intacte.

**Ça ne se voyait que sur la page RENDUE**, jamais dans le dépôt : c'est
la leçon du 22 août, appliquée à un intermédiaire qu'on oublie parce
qu'il ne nous appartient pas.

### Reproche 2 : « votre page d'accueil n'est accessible que via une page de connexion »

**Celui là était PÉRIMÉ, et l'écran le disait :** « Problèmes détectés
lors de la tentative de validation PRÉCÉDENTE ». Mesuré le même jour
avec l'agent de Googlebot, sans cookie :

| | |
|---|---|
| `tiquiz.fr/` | **200**, aucune redirection, **5325 mots visibles** |
| lien vers la politique | présent (`/privacy`, `/legal`, `/terms`, `/cookies`) |

**ET J'AI INVENTÉ UNE EXPLICATION.** J'ai écrit que le reproche datait
du moment où la page d'accueil déclarée était `quiz.tipote.com`. Béné :
« je n'ai JAMAIS mis ça, j'ai mis tiquiz.fr depuis le début ». C'était la
QUATRIÈME cause inventée dans la même journée, après l'URL du remote, le
dépôt privé et le jeton périmé.

**Ce qui est mesuré s'arrête donc là :** `tiquiz.fr` répond 200 à
l'agent de Googlebot, sans redirection, avec 5325 mots et le lien vers
la politique. Pourquoi leur validateur a vu autre chose, **je ne le sais
pas**, et je n'en propose pas de cause.

**Règle, et c'est la leçon de la journée : sur une panne qu'on ne
reproduit pas, une cause plausible n'est pas une cause.** Quatre fois de
suite, une explication qui collait à l'histoire a envoyé Béné corriger
quelque chose qui n'avait rien. « Je ne sais pas encore, voici ce que je
mesure » coûte une minute ; une cause inventée coûte un aller-retour et
la confiance.

Ce qui reste utile sur cet écran : il dit « tentative PRÉCÉDENTE ». Un
rapport d'échec n'est pas un état courant, et relancer la validation
après un correctif est le seul moyen de savoir ce qui tient encore.

Test : `tests/logic/politique-google.test.mts` (9 tests), vérifié en
rejouant les versions d'avant : 8 rougissent.

## Les robots d'IA bloqués par Cloudflare : ce que ça coûte VRAIMENT (3 septembre 2026)

J'avais alerté que le blocage de `Google-Extended` "contredit tout le
travail GEO". Béné : "pas compris t'es sûr de toi ?" **Elle avait
raison de douter : mon alerte était trop forte.**

**Ce qui est bloqué, mesuré sur les quatre domaines** (le bloc Cloudflare
« Managed robots.txt » arrive AVANT notre robots.txt applicatif) :
`Google-Extended`, `GPTBot`, `ClaudeBot`, `CCBot`, `Bytespider`,
`Amazonbot`, `Applebot-Extended`, `meta-externalagent`. **Ce sont tous
des robots d'ENTRAÎNEMENT.**

**Ce qui n'est PAS bloqué, et c'est ce qui compte :**

| | |
|---|---|
| `Googlebot` | le référencement classique, intact |
| `OAI-SearchBot` | ce qui CITE le site dans la recherche ChatGPT |
| `ChatGPT-User` | quelqu'un pose une question, ChatGPT va lire la page |
| `Claude-User`, `Claude-SearchBot` | pareil côté Claude |

**Vérifié aux sources, pas de mémoire.** Google écrit noir sur blanc que
`Google-Extended` "does not impact a site's inclusion in Google Search
nor is it used as a ranking signal". OpenAI et Anthropic documentent
chacun trois agents SÉPARÉS : entraînement d'un côté, recherche et
navigation à la demande de l'autre.

**Le `llms.txt`, les 33 textes alternatifs et le flux RSS servent donc
exactement les robots qui PASSENT.** Décision : on ne touche à rien.
Béné garde sa visibilité dans les réponses d'IA et refuse que son
contenu entraîne gratuitement des modèles.

**La leçon est la mienne : "un bot d'IA est bloqué" ne dit RIEN tant
qu'on n'a pas regardé LEQUEL.** Entraînement et citation portent des
noms différents chez les trois fournisseurs, et les confondre transforme
un réglage sain en fausse alerte. C'est la règle du 22 août appliquée à
un nom d'agent : une liste ne dit pas ce qu'elle contient tant qu'on ne
l'a pas lue.
