<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Distribution par résultat — RÈGLE UNIQUE (drame Gwenn 7 juin 2026)

Tout endroit qui affiche la distribution des leads par résultat de quiz
DOIT suivre cette règle exacte. La répétition de bugs (entrées
dupliquées, résultats oubliés, anciens noms) vient TOUJOURS d'un
ré-implémentation partielle qui zappe une étape.

**Algorithme obligatoire :**
1. Groupe les leads par `result_id` (clé stable, ON DELETE SET NULL)
2. Résout le titre via `quiz_results.title` (LIVE — répercute les renames),
   fallback sur le snapshot `result_title` du lead (pour les result_ids
   orphans depuis suppression)
3. **MERGE** les buckets avec le même titre résolu (dédoublonne les
   fantômes : ancien nom + nouveau nom après rename, ou 2 result_ids
   distincts qui résolvent au même titre)
4. Filter les zéros, sort par count desc

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

**Si je vois `iterate results.map(r => counts.get(r.id))` quelque part,
c'est CASSÉ** (oublie les leads orphans). Si je vois `groupBy(result_title)`
sans dédup par titre résolu, c'est CASSÉ (anciens noms apparaissent en
double après rename). Toute autre forme = je viole la règle et un user
va remonter un bug. Suis l'algorithme à la lettre.

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
