# Claude pitfalls + conventions (pense-bête personnel)

> Fichier auto-géré par Claude. Lu à chaque session via AGENTS.md.
> Mis à jour quand un bug remonte plusieurs fois ou qu'une convention
> implicite se révèle après coup. **Si je casse un de ces points, c'est
> un bug régressif évitable.**

---

## ⚠️ Opus 4.7+ rejette `temperature` / `top_p` / `top_k` (1er juin 2026)

Anthropic a RETIRÉ les paramètres de sampling sur Opus 4.7 et 4.8 — les
envoyer renvoie `400 invalid_request_error: "temperature is deprecated
for this model"`. Constaté en prod sur Tipote après bump du tier opus
de 4.7 → 4.8 (même bug porte également côté Tiquiz : génération de quiz
IA + analyse IA des résultats de sondage sont sur le tier opus).

**Source de vérité unique** : `lib/claudeRequest.ts → buildClaudeMessageBody`.
Tous les call-sites qui appellent l'API Anthropic en direct DOIVENT
construire leur body via ce helper plutôt que poser `temperature` à
la main. Détecte Opus 4.7+ via regex et omet les params interdits.

Call-sites Tiquiz concernés (déjà fixés) :
- `app/api/quiz/generate/route.ts` (génération IA des quiz, tier opus)
- `lib/survey/analysis.ts` (analyse IA des résultats sondage, tier opus)

Les autres modèles (sonnet 4.6, haiku 4.5, opus 4.6) acceptent toujours
`temperature` — le helper laisse passer normalement.

## ✅ MULTIPROFILS Tiquiz — chantier LIVRÉ en 7 phases (juin 2026)

**Statut** : entièrement livré sur `claude/busy-wright-501xR` (juin 2026).
Validation prod : `npm run diag:multiprofils` (11/11 ✓),
`npm run check:schema` (9/9 ✓), `npm run smoke:multiprofils` (11/11 ✓).

**Phases livrées** :
1. Fondations DB (`projects` + `project_id` sur quizzes/popquizzes/
   business_events/user_milestones + backfill all-existing-to-default)
2. API CRUD + ProjectSwitcher UI (cookie `tiquiz_active_project`)
3a. INSERT tagués (`resolveProjectIdForInsert` sur tout INSERT)
3b. Lectures filtrées (`getActiveProjectScope`, gate `canUseMultiProjects`)
4. `business_profiles` per-projet (branding + positionnement + pixels)
5. Viewer public + IA branchés (`mergeOwnerBranding` triple-fallback)
6. `sio_api_keys` per-projet (UNIQUE composite user/project/name)
+ alignement Tipote (visual identity, danger-zone delete, SessionResetGate)
+ paliers `monthly_plus` / `yearly_plus` + upsell vers monthly/yearly
+ scripts smoke E2E + diag DB

**Patterns canoniques** quand on ajoute une feature qui doit être
isolée par projet :
- **Écriture** : `lib/projects/scopeFilter.ts:resolveProjectIdForInsert(userId)`
  (lecture cookie + fallback default).
- **Lecture user-facing** : `getActiveProjectScope(userId, email)` (gate
  `canUseMultiProjects` inclus → non-multiprofils voient TOUT comme
  avant, pas de régression).
- **Override branding** : `lib/projects/businessProfile.ts:mergeOwnerBranding(fallback, ownerUserId, projectId)`
  pour les call-sites publics (viewer, IA générative). Override
  non-null + triple safety (gate plan, projet absent, business_profile
  absent, erreur DB) → ZÉRO risque de couper les quiz en ligne.

**Champs qui RESTENT GLOBAUX (compte abonnement)** — ne PAS les passer
per-projet :
- `plan`, `product_id`, `sio_contact_id` (abonnement)
- `full_name`, `first_name`, `last_name`, `email` (identité)
- `ui_locale`, `content_locale`, `address_form` (préférences user)
- `tipote_affiliate_id` (lien unique vers Tipote affiliate)
- `responses_used_this_month`, `responses_reset_at` (compteurs plan)

**Sémantique projet secondaire** (Béné 2 juin) : "Comme un compte
neuf, avec ses spécificités." business_profile créé VIDE
(onboarding_completed=false). Settings UI override TOTAL (l'user voit
les champs vides à remplir). Viewer public override NON-NULL (filet de
sécurité : tant que l'user n'a pas customisé, le quiz reste joli avec
le branding global). `sio_api_keys` NE SONT PAS DUPLIQUÉES (chaque
projet a sa propre intégration SIO à configurer).

**Workflow validation Béné** après chaque déploiement multiprofils :
```bash
set -a; . .env.local; set +a
npm run check:schema       # 9 migrations multiprofils en prod
npm run diag:multiprofils  # 11 invariants DB (intégrité)
# Optionnel avec user beta :
npm run smoke:multiprofils  # E2E workflow Settings + isolation
```

## ⚠️ check:schema — éviter de réintroduire la panne du 2 juin matin

La panne du 2 juin 2026 (404 généralisé sur les quizzes publics
Tipote) venait d'une migration en retard
(`20260603_quizzes_survey_thanks.sql` non appliquée → colonne
manquante → SELECT public KO).

**Plus jamais**. `npm run check:schema` détecte automatiquement.

**À chaque nouvelle migration** qui ajoute une colonne/table critique,
ajouter une entrée dans `EXPECTED` de `scripts/check-schema.mjs`. **Lire
le contenu RÉEL du .sql** (`grep "CREATE TABLE\|ADD COLUMN" file.sql`)
— j'ai généré 2 faux positifs côté Tipote en supposant les noms.
Pattern :
```js
{ migration: "<filename>", table: "<table>", columns: ["c1","c2"] }
```

## ⚠️ Playwright config à la racine = bombe à retardement pour le build prod (2 juin 2026 après-midi)

**Symptôme** : `next build` plante en prod avec
`Failed to type check. Cannot find module '@playwright/test'`
sur `./playwright.config.ts` → pm2 boucle de restart.

**Cause** : Next.js 16 typecheck strict pendant `next build` traverse
TOUS les .ts inclus par tsconfig (par défaut `**/*.ts`). Si
playwright.config.ts est à la racine ET que @playwright/test est en
devDep ET que la prod prune les devDeps → import non résolu → build KO.

**Fix** : ajouter au `tsconfig.json` `exclude` :
```json
"exclude": [
  "node_modules",
  "playwright.config.ts",
  "tests/e2e"
]
```

**Règle absolue** : à chaque ajout d'un fichier .ts à la racine qui
importe une devDep, vérifier que `next build` passe AVANT push. Pas
juste `npx tsc --noEmit` (qui peut être moins strict que le typecheck
embedded de Next.js 16). Tester `npm run build` en local au minimum.

## A) Checklist quand j'ajoute une COLONNE sur `quizzes`

Toujours faire les 7 étapes, dans l'ordre, sinon la feature est cassée silencieusement :

1. **Migration** : `ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS … BOOLEAN/TEXT/JSONB`. Default sensible. Comment.
2. **Schema cache** : finir la migration avec `NOTIFY pgrst, 'reload schema';` (sinon Supabase API → 500 "Could not find column in schema cache").
3. **API PATCH whitelist** : `app/api/quiz/[quizId]/route.ts` → ajouter la colonne dans `allowedFields[]`. Sans ça le save l'ignore.
4. **API public SELECT** : `app/api/quiz/[quizId]/public/route.ts` → ajouter la colonne dans la chaîne SELECT du `admin.from("quizzes").select(…)`. Sans ça le visiteur ne la voit jamais (bug `phone_required` mai 2026).
5. **Editor state** : ajouter `useState` + load depuis autosave snapshot (`s.column_name`) + load depuis DB (`q.column_name ?? default`) + ajouter dans le `autosaveSnapshot` useMemo + ajouter dans la deps array.
6. **Editor save payload** : ajouter dans le body PATCH (le `fetch` dans handleSave). Si c'est une colonne sur `quiz_results` ou `quiz_questions`, vérifier que le mapping `editResults.map(r => ({ … }))` la propage (bug `image_url` mai 2026 où le map n'incluait que `{text, result_index}`).
7. **Visitor type + render** : ajouter dans le type `Quiz` de `PublicQuizClient.tsx`, puis le consommer dans le render.

---

## B) Checklist Storage / images / fichiers

- **Bucket `public-assets`** : path `<topic>/<auth.uid()>/<file>.<ext>`. Le RLS de Supabase Storage est permissif sur ce bucket (tout authenticated peut INSERT). Si on bug "new row violates row-level security policy", c'est qu'une vieille policy restrictive existe : la migration `20260519_public_assets_permissive_reset.sql` reset propre.
- **Pas de redimensionnement** côté visiteur : `w-full h-auto` toujours. Jamais `max-h-* object-cover` sur du contenu user (crop + cap = mauvaise UX, Adeline 18 mai 2026).
- **Drag-and-drop = HTML5 natif** : `<img draggable onDragStart={…}>` + drop-zones avec `onDragOver={e => e.preventDefault()}` + `onDrop={…}`. PAS de "click to position" — Adeline a explicitement rejeté ce pattern.

---

## C) Rich-text / contentEditable

- **`RichTextEdit` rend deux branches** : `if (editing) return …; return …;`. **Toujours rendre les Dialogs hors du branchement** sinon ils ne sont jamais montés quand le bouton est cliqué. Pattern actuel : `const dialogs = (<>…</>); if (editing) return <>…{dialogs}</>; return <>…{dialogs}</>;`
- **Dialog steal le focus** du contentEditable → onBlur → commit() → setEditing(false) → champ démonté avant que `restoreSelection()` ne puisse faire son boulot. Gate via `dialogPausedRef` (set sync AVANT le `setOpen(true)`, reset au close).
- **Entités HTML survivent au strip de tags** : `&nbsp;` n'a pas de `<…>` donc la regex strip-tags le laisse passer. `extractResultLabel` décode maintenant les entités, mais si on duplique cette logique ailleurs il faut décoder aussi (`&nbsp;` → " ", `&quot;` → `"`, `&amp;` en DERNIER pour éviter double-decode).
- **Label admin d'un résultat** : toujours `stripHtml(extractResultLabel(cleanPlaceholdersForLabel(text)))`. Les 3 chaînés. (defense-in-depth : si quelqu'un modifie extractResultLabel, on a quand même la sécurité de stripHtml).
- **contentEditable insère `&nbsp;`** systématiquement à la place d'un espace après ponctuation française (`Mot :` devient `Mot&nbsp;:`). C'est volontaire (typographie FR), il faut juste décoder côté display.

---

## D) Endpoints publics

- **`/track` ne retourne JAMAIS de 4xx** : analytics endpoint en console = perçu comme bug par le créateur. Retourner 200 avec `{ok: false, reason}` partout. Le client ne lit pas le body (fire-and-forget) donc rien ne casse.
- **Slug ou UUID** : public-facing routes acceptent les deux. Toujours utiliser le pattern `resolveQuizIdFromSlugOrId`. Si je fais `.eq("id", quizId)` direct, ça 404 sur tous les quiz qui ont un slug custom.
- **Bot filtering** : sur les routes qui comptent des vues, blocklist UA (regex `/bot|crawl|spider|googlebot|chatgpt|gpt|ahrefs|semrush|facebookexternalhit|telegrambot|whatsapp/i`).
- **Owner exclusion** : `getSupabaseServerClient().auth.getUser()` puis check `quiz.user_id === user.id` pour skip le tracking sur ses propres previews.

---

## E) i18n namespaces — pièges

- **Tiquiz** : éditeur quiz/sondage utilise `useTranslations("quizEditor")`.
- **Tipote** : éditeur quiz utilise `useTranslations("quizDetail")` (différence historique). **Vérifier le `useTranslations(…)` du composant AVANT d'ajouter des clés**, sinon la clé apparaît raw côté UI (bug fieldPhoneRequired mai 2026).
- **PublicQuizClient** (Tiquiz et Tipote) : utilise des dictionnaires inline (`translations: Record<string, QuizTranslations>` dans le fichier), pas `messages/*.json`. 8 entrées (fr / fr-vous / en / es / de / pt / it / ar). Ajouter dans les 8 quand on touche au visiteur.

---

## F) Compteurs et événements (post-Phase A tracking)

- **Source de vérité = `quiz_events`** (table log time-series). Les compteurs sur `quizzes` (views_count, etc.) sont **auto-bumpés par trigger** `trg_quiz_events_bump_counter`. **Ne JAMAIS UPDATE les compteurs directement** — faire un **INSERT direct dans `quiz_events`** (le trigger bumpe).
- **⚠️ NE PAS appeler la RPC `log_quiz_event`** (bug 26/05 : Démarrages/Complétés/Partages bloqués à 0). Sur Tiquiz, 3 surcharges coexistent (2/3/4 args — migrations 021/022/20260521 sans DROP) → l'appel échoue/est ambigu, et `await rpc(...)` **ne lit jamais `error`** → échec SILENCIEUX → events jamais insérés (`views_count` figé sur sa valeur pré-refonte, starts/completes=0 alors que les leads et `quiz_question_events` — en INSERT direct — marchent). **Fix : INSERT direct dans `quiz_events` partout** (track route + share dans public route), et toujours lire `{ error }`. Vérifier en prod : `SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='log_quiz_event';` + s'assurer que le trigger + la colonne `session_id` existent (migration 20260521).
- **Dedup via cookie session** : cookie `tquiz_visit` HttpOnly 30j, généré server-side au premier load. Le tracking serveur check `(quiz_id, event_type, session_id, created_at > NOW() - 24h)` avant INSERT.
- **Client `trackedRef`** : Set en mémoire pour éviter les doublons IN-tab. Combiné avec le cookie côté serveur, on dédupe correctement même si l'utilisateur ouvre 5 onglets. **DOIT être un `useRef` STABLE** (`useRef<Set>(null)` + `??=`), PAS `useCallback(() => new Set(), [])()` (l'IIFE recrée un Set vide à chaque render → dédup morte → spam de fetchs).
- **Funnel par question** : un SEUL tracker `question_view` (keepalive, déduplé par `trackedQuestionViewsRef`). Le bug 26/05 ("funnel limité aux 4 premières questions") venait d'un 2e tracker redondant qui spammait `quiz_question_events` sur les 1res questions ; combiné à `analytics` triant par `question_index` ASC + `.limit(50000)`, les questions de fin étaient tronquées. La requête analytics trie désormais par `created_at` DESC.

## G) Tracking pixels Meta + Google (post-Phase B)

- **Injection des scripts** : via `useEffect` dans `PublicQuizClient` qui crée `<script>` et `appendChild(document.head)` programmatiquement. PAS de composant `<TrackingPixels>` avec next/Script — c'était galère à placer à travers les multiples step branches (intro/quiz/email/result/share).
- **Strict consent gate** : `pixelsConsentGiven = quiz.show_consent_checkbox === false || consent`. Si pas donné → aucun script injecté → fbq/gtag pas définis → fireQuizPixel silencieux.
- **fireQuizPixel(event, config)** dans `lib/clientPixels.ts` : appelé en parallèle de `trackEvent(event)`. Le 1er parle aux pixels externes, le 2e à la DB interne. Les deux systèmes cohabitent — pas de fallback de l'un à l'autre.
- **gtag.js sert GA4 ET Google Ads** sur la même page. On charge un seul `<script src="...gtag/js?id=PRIMARY">` puis on fait `gtag('config', GA4_ID)` ET `gtag('config', ADS_ID)`. Pattern officiel Google.
- **Conversion fire** : `gtag('event', 'conversion', { send_to: 'AW-XXX/LABEL' })` UNIQUEMENT sur le `complete` event (= visiteur a soumis l'email). Pas sur view ou start.
- **Per-quiz + défauts user** : 4 colonnes sur `quizzes` + 4 sur `profiles` (préfixe `default_*`). Bouton "↺ Appliquer mes valeurs par défaut" dans l'éditeur quand le user a configuré ses défauts ET que les champs locaux sont vides.

---

## G) UX / produit (retours utilisateur récurrents)

- **WYSIWYG par défaut** : édition inline dans le preview, pas dans Settings sidebar. Adeline rejette systématiquement les patterns "édit dans réglages" (consent text, 18 mai 2026).
- **Drag-and-drop signifie click + hold + drop** (HTML5), pas click pour cycler positions.
- **Convention SaaS forms** : asterisk rouge sur les champs obligatoires, RIEN sur les optionnels. Ne pas écrire "(optionnel)" en suffixe.
- **Dialogs custom obligatoires** : `window.prompt` / `window.alert` = anti-pattern. Toujours utiliser `<Dialog>` Radix du design-system.
- **Sortie d'un lien dans un quiz** : `target="_blank"` + `rel="noopener noreferrer"`. Le lien ne doit jamais voler le quiz. `RichTextEdit.tsx` pose ces attributs automatiquement après `createLink`.

---

## H bis) Sync UI : nouvelle tab Settings ⇒ UserAvatarMenu

Quand j'ajoute un onglet à `app/settings/SettingsClient.tsx`, je
DOIS aussi l'ajouter dans le dropdown `components/UserAvatarMenu.tsx`
(menu déroulant photo de profil). Adeline (19 mai 2026) a remonté
qu'il manquait des entrées — j'avais ajouté Tracking sans toucher
le menu. Idem si je rename / réordonne / supprime un onglet.

Checklist 2-points : (1) SettingsClient TabsTrigger + TabsContent ;
(2) UserAvatarMenu `menuItems[]` + `header.menu.*` i18n keys × 7 locales.

## H ter) OG metadata : strip HTML sur TOUS les chemins

Chaque page exposant des meta OpenGraph aux previews sociaux (iMessage,
WhatsApp, FB, LinkedIn) doit appliquer `stripHtml` sur title +
description, sinon le rich-text HTML du créateur fuit en `<span style=…>`
dans l'aperçu de partage. Tiquiz a 2 routes qui servent un quiz :
- `/q/[id]/page.tsx` (main host, legacy) — stripHtml ✓ depuis 16 mai
- `/[publicSlug]/page.tsx` (custom domain catch-all) — stripHtml
  ajouté seulement le 19 mai (rapport Adeline)

À chaque nouvelle route publique avec `generateMetadata`, vérifier
que stripHtml est appliqué.

## H quater) i18n nested keys : check le SHAPE avant d'ajouter

Quand j'écris à `header.menu.foo`, je dois d'abord vérifier que
`header.menu` est un DICT, pas un STRING. Sur Tipote pt + pt-BR,
`header.menu` valait `"Menu"` (string raw jamais traduit) — un
`setdefault('menu', {})` retournait alors le string et le `menu[k]=…`
crashait. Python : `isinstance(menu, dict)` avant d'écrire ; ou
réécrire la sous-arbo complète si elle est mal typée.

## I) Typographie française au render — NBSP devant `:;!?»`

`lib/quizPersonalization.ts:interpolateText` cleanait les espaces
ASCII devant TOUTES les ponctuations avant ce fix (Adeline 19 mai
2026). Bug : "reçu?" et "passé:" en français.

Maintenant :
- `,` `.` `)` → strip l'espace devant (anglais & français ok)
- `: ; ! ? »` → REMPLACE l'espace ASCII par U+00A0 (NBSP) — typo
  française. Le NBSP existant déjà reste intouché.

Si je touche à cette fonction, ne PAS revenir au regex unifié
`[ \t]+([.,;:!?»)])` → "$1" — c'est la régression V1.

## H) Placement UI — visibilité, pas hasard

- **Toujours demander la place exacte** quand j'ajoute une section Settings / Paramètres. Adeline (mai 2026) m'a fait déplacer 2× la même Card "Tracking & Pubs" parce que je l'avais collée "à la fin du tab actuel" sans réfléchir.
- **Tabs visuels = navigation principale**. Une nouvelle section logiquement séparée (ex. Tracking ≠ Branding) mérite son propre tab, pas un Cards en bout de tab existant.
- **Tiquiz** : onglet "Tracking" entre Systeme.io et Compte & Tarifs.
- **Tipote** : Card "Tracking & Pubs" sous Systeme.io dans le tab "Connexions" (cohérent : c'est une "connexion à un service externe").

## K) Backfill quiz_events : filtrer `session_id LIKE 'backfill_%'` côté période

Migration backfill (19 mai 2026) synthétise les events historiques
depuis `quizzes.*_count` pour aligner le log avec les compteurs.
Convention : les events synthétiques portent `session_id = 'backfill_<quizId>_<event>_<n>'`
et `created_at = quiz.created_at + N ms` (tous concentrés au moment
de la création du quiz).

**Important** : pour TOUTE query qui filtre `quiz_events` par
période (`30j`, `7j`, etc.), il faut ajouter `.not("session_id",
"like", "backfill_%")` sinon les compteurs historiques se retrouvent
agglutinés dans une fenêtre récente et faussent le rendu temporel.

Le total lifetime continue de les inclure via les compteurs auto-
bumpés sur `quizzes.*_count` — c'est le point de la separation.

Si une nouvelle route consomme `quiz_events` à fin d'agrégat
temporel, **ajouter le filtre dès le SELECT**. Routes actuellement
concernées :
- `app/api/stats/route.ts` (events + prevEvents)

`quiz_question_events` n'est PAS backfillé (pas de compteurs
historiques à recouvrer) → pas de filtre nécessaire.

## J) OG metadata sur custom domain → toujours utiliser `buildCanonicalUrl`

Next.js `metadataBase` dans `app/layout.tsx` est UNE URL statique. Si je
laisse `openGraph.url` non défini, Next utilise metadataBase → l'aperçu
iMessage / WhatsApp affiche `quiz.tipote.com` même quand l'user est sur
son custom domain (rapport mai 2026).

Toute nouvelle route publique (= servie à un visiteur lambda, pas le
dashboard) DOIT :
1. Importer `buildCanonicalUrl` depuis `@/lib/publicUrl`
2. Calculer `const canonical = await buildCanonicalUrl(<chemin actuel>)`
3. Spread `{ url: canonical }` dans `openGraph` ET
   `alternates: { canonical }` au niveau top-level.

Sinon : iMessage / WhatsApp / Slack lisent `og:url` du HTML retourné et
affichent ce hostname sous l'aperçu → l'user a payé pour son custom
domain mais voit l'URL Tiquiz partout. Bug d'image de marque sévère.

Routes concernées actuellement : `/q/[quizId]`, `/p/[popquizId]`,
`/[publicSlug]`.

## M) STATS — `quiz_leads` est la SEULE table de leads, pas `leads`

Deux tables peuvent porter à confusion :
- `quiz_leads` (quiz_id, email, result_title, sio_synced, …) → **utilisée
  en prod par tout le code de capture** (`app/api/quiz/[quizId]/public/route.ts`).
  C'est la source réelle.
- `leads` (user_id, source, source_id, exported_sio, …) → **legacy /
  jamais populée pour les quizzes** côté Tiquiz.

`/api/quiz/[quizId]/analytics` interrogeait à tort `leads` → page affichait
tout à zéro (Gwenn 19 mai 2026). Fix : pointer sur `quiz_leads` avec
`eq("quiz_id", quizId)` directement et mapper `result_title` / `sio_synced`
au lieu de `quiz_result_title` / `exported_sio`.

Avant de coder un nouvel endpoint d'analytics, **toujours grep
`grep -rn "from(\"quiz_leads\")\.insert\|upsert" app/`** pour confirmer
quelle table est populée par le flow capture.

## N) STATS — LIFETIME est la source de vérité pour les KPI affichés

Mix entre données pré-migration (counters auto-bumpés sur `quizzes.*_count`)
et post-migration (events dans `quiz_events`) crée des incohérences si on
affiche du période-filtré sur le dashboard / per-quiz card :
- "Leads (lifetime) 19 > Démarrages (période filtrée) 15" → impossible visuel
- "Vues (période, hors backfill) 0" mais per-quiz card affiche "Vues 34"

**Règle** : les KPI tiles + per-quiz cards affichent TOUJOURS les valeurs
lifetime (`quizzes.*_count` + `COUNT(quiz_leads WHERE quiz_id=…)` sans
filtre). Le filtre période sert uniquement aux **deltas vs période
précédente** et à la **time-series de leads** (qui a un created_at fiable
par ligne).

Conversion = lifetime leads / lifetime starts (ou views si starts=0,
e.g. quiz pré-migration). Cap à 100 % car certains comptes ont plus
de quiz_leads (legacy / import) que de starts trackés.

## L) WORKFLOW DE DÉPLOIEMENT — comprendre où vit vraiment mon code

**Mon code ne va JAMAIS direct en prod.** Il passe par 4 étapes :

1. **Je commit sur ma branche `claude/setup-dev-guidelines-CmXl0`**
   → visible à https://github.com/BenGOaff/tiquiz/tree/claude/setup-dev-guidelines-CmXl0
2. **Ben télécharge mon code en local sur son PC** (Windows,
   `C:\Users\hello\Desktop\tiquiz`) depuis cette branche
3. **Il push sur `main`** via `git add . && git commit && git push origin main`
4. **Il déploie sur le VPS** :
   ```
   cd /home/tipote/tiquiz-app
   git stash && git pull origin main && npm ci && npm run build
   pm2 restart tiquiz-prod --update-env
   ```

**Conséquence critique** : si je viens de pusher 5 commits sur ma branche
en succession, **ils ne sont en prod qu'après les 4 étapes**. Entre
chaque commit que je fais et le moment où ça touche la prod, il peut
s'écouler des heures (Ben doit re-télécharger, re-push main, re-build).

**Quand un user me dit « ton code est sur main » ou « j'ai déployé »** :
- ça veut dire qu'il a fait étape 3 (push main) ET étape 4 (build VPS)
- **mais pas forcément avec MES DERNIERS commits** — il a téléchargé à
  un moment T, mes commits postérieurs à T sont restés sur ma branche
- avant de conclure « mon code marche pas », **toujours vérifier que le
  commit sur lequel je base mon analyse est bien le commit qui tourne
  en prod**. Outils :
  - `curl -sL <url-prod> | grep <truc-spécifique-au-dernier-commit>`
  - demander à Ben de faire `git log origin/main -5 --oneline` pour
    voir le dernier commit sur main
- si mon dernier commit n'est pas en prod, lui rappeler le merge :
  ```
  cd C:\Users\hello\Desktop\tiquiz
  git fetch origin
  git checkout main
  git merge origin/claude/setup-dev-guidelines-CmXl0 -m "merge claude"
  git push origin main
  ```

**Conclusion à appliquer SYSTÉMATIQUEMENT** : quand un fix touche un
truc visible côté visiteur (OG meta, public page, etc.) et que le user
re-teste, et que ça ne marche pas comme prévu → **AVANT** de re-coder
ou de spéculer sur un nouveau bug, **vérifier d'abord avec un curl
direct** que le serveur sert bien la version qui contient mon fix. Si
non, c'est un problème de pipeline déploiement, pas de code.

## I) Quand je vais douter pendant le code

1. **Avant de toucher une colonne SQL** : relire section A.
2. **Avant de toucher RichTextEdit** : relire section C.
3. **Avant de toucher du tracking** : relire section F.
4. **Quand je hot-fix un bug** : poser une note ici si la cause racine est non-évidente.

**Idempotence des migrations** : `IF NOT EXISTS` partout. `DROP POLICY IF EXISTS` avant `CREATE POLICY`. `CREATE OR REPLACE FUNCTION` pour les RPC. **Jamais une migration qui crashe si rejouée**.

**Toujours finir une migration par `NOTIFY pgrst, 'reload schema';`** quand on a touché à des colonnes/policies/RPC.

**Typecheck systématique** avant commit : `npx tsc --noEmit`. Exit 0 ou je fix.

## O) FAVICON — route handler dynamique `/favicon.ico` (22 mai 2026, refactor validé)

**État actuel** : `app/favicon.ico/route.ts` est un route handler qui
sert le favicon adapté au Host de la requête :
- Domaine propre (tiquiz.com, quiz.tipote.com, app.tipote.com, localhost…) :
  lit `public/favicon.ico` et le sert.
- Domaine custom vérifié avec `favicon_url` configuré : fetch ce fichier
  côté supabase storage et le proxie avec Content-Type approprié.
- Domaine custom sans favicon ou fetch échoué : fallback favicon Tiquiz.

**Pourquoi ce refactor** (22 mai 2026, Gwenn cas Firefox) : la solution
"sizes=any" sur la metadata par-page ne suffisait pas. Firefox tab favicon
= sélection imprévisible quand on a plusieurs `<link rel="icon">` même
tous avec sizes=any. Avec un route handler à `/favicon.ico`, la mécanique
d'élection du `<link>` devient non pertinente : peu importe quel link le
navigateur choisit, il finit toujours par requêter `/favicon.ico` en
fallback automatique, et notre handler retourne le bon fichier selon le Host.

**Règles à respecter** :
- NE JAMAIS recréer un fichier `app/favicon.ico` (statique). Ça
  shadowerait le route handler et casserait le multi-tenant.
- `public/favicon.ico` doit rester (utilisé en fallback par le handler).
- Le handler force `dynamic = "force-dynamic"` + runtime nodejs. Sans ça
  Next.js cache la 1ère réponse et la sert à tous les Hosts.
- Le middleware exclut `/favicon.ico` de son matcher (config). Donc le
  handler doit faire SA propre lookup custom_domains (déjà câblé).

**Si la prod sert le mauvais favicon** :
1. `curl -sI https://<host>/favicon.ico` → vérifier Content-Type + taille.
2. `curl -s https://<host>/favicon.ico -o /tmp/f.ico && file /tmp/f.ico` →
   c'est bien une image ICO ou PNG ?
3. Vérifier dans `custom_domains` que `favicon_url` est bien set pour ce host.
4. Test cache : `curl -sI -H "X-Test: 1" https://...` même résultat ? Le
   route handler force-dynamic donc aucun cache Next.js. Si même favicon
   pour 2 hosts différents → bug dans le handler, pas dans le cache.

## P) IFRAME EMBED — ne JAMAIS poser `X-Frame-Options` sur `/q/`, `/p/`, `/embed/` (21 mai 2026)

**Erreur récurrente** : un commit "security headers" pose
`X-Frame-Options: SAMEORIGIN` sur les routes publiques `/q/` et `/p/`
dans `middleware.ts`. Conséquence : les users qui embed leur quiz via
iframe sur leur blog (Systeme.io, WordPress, etc.) cassent. Le
navigateur affiche "`<host>` n'autorise pas la connexion".

**Précédent** : commit `056ddfb1` (Tipote, 9 mai 2026) — JB
(imagelys.com) s'est plaint que ses quiz ne s'affichaient plus sur son
blog. Fix dans commit `8b41d898` (21 mai).

**Règle absolue** : sur les routes publiques d'un quiz/popquiz, **ne
PAS poser `X-Frame-Options`**. Utiliser à la place :
```ts
res.headers.set("Content-Security-Policy", "frame-ancestors *");
res.headers.delete("X-Frame-Options");
```

Si on veut restreindre l'embedding plus tard, le faire par un allowlist
explicite (la liste des domaines des users payants par exemple), pas
par un blocage générique.

**Test de non-régression** : après tout commit qui touche
`middleware.ts`, lancer en local ou sur staging :
```bash
curl -sI https://<host>/q/<un-quiz-actif> | grep -iE 'frame|content-security'
```
Doit retourner `content-security-policy: frame-ancestors *` (ou absent
mais surtout PAS de `x-frame-options: SAMEORIGIN`).

## U) Pixel Meta : server-render obligatoire pour la détection (23 mai 2026)

**Bug Gwenn (23/05)** : extension Pixel Helper affiche "no pixel" sur
toutes les pages de son quiz alors que `meta_pixel_id` est configuré.

**Cause** : l'injection se faisait client-side via useEffect dans
PublicQuizClient, après mount React + gated sur consent. Pixel Helper
scanne au premier paint → ne le voit pas.

**Fix** : `<TrackingPixels>` server-rendered dans la route page,
script dans le HTML envoyé au browser. Détection instantanée.

```tsx
// app/q/[quizId]/page.tsx
import { TrackingPixels } from "@/components/tracking/TrackingPixels";
return (
  <>
    <TrackingPixels
      metaPixelId={meta.meta_pixel_id}
      ga4MeasurementId={meta.ga4_measurement_id}
    />
    <PublicQuizClient quizId={quizId} />
  </>
);
```

**À NE PAS oublier** : retirer l'injection client-side dans
PublicQuizClient (sinon double init) + ne pas re-fire "view" event
côté client (l'init fire déjà PageView).

**Routes couvertes Tiquiz** : `/q/[quizId]` + `/[publicSlug]`.

## V) STATS time-series : TOUJOURS bucketiser par jour LOCAL du créateur (24 mai 2026)

**Bug récurrent (Adeline 24/05)** : 6 leads faits aujourd'hui, mais le
graphe "Leads sur les 30 derniers jours" du quiz affichait ZÉRO pour
aujourd'hui. La liste des leads, elle, montrait bien les 6.

**Cause** : mélange de conventions de fuseau dans le bucketing par jour.
`QuizResultsAnalytics.tsx` générait les clés de jours via
`d.toISOString().slice(0,10)` (= jour UTC) mais bucketisait les leads
via `lead.created_at.slice(0,10)` (jour brut). Décalé d'un cran de
fuseau → les leads d'aujourd'hui ne tombaient dans AUCUN bucket.

**RÈGLE DÉFINITIVE** : tout bucketing par jour des time-series stats
(leads/events sur N jours) se fait selon le **jour LOCAL du créateur
qui regarde**, via les helpers de `lib/dateKeys.ts` :
- Côté client (graphe rendu navigateur) → `localDateKey(date)`.
  L'utiliser pour LES CLÉS DE JOURS *et* pour chaque ligne. Jamais
  `toISOString().slice()` d'un côté et `.slice()` de l'autre.
- Côté serveur (agrégation API) → le client passe
  `&tz=${new Date().getTimezoneOffset()}`, le serveur bucketise via
  `dateKeyForOffset(date, tzOffset)` (+ `parseTzOffset` pour lire le
  param). Voir `/api/stats` et `/api/quiz/[id]/analytics`.

**Checklist quand tu touches une stat datée** :
1. Clés de jours ET lignes bucketisées avec le MÊME helper.
2. Jamais `toISOString().slice(0,10)` pour un bucket affiché à l'user
   (c'est de l'UTC, pas son jour local).
3. Si c'est un endpoint serveur consommé par un client → accepter `tz`.
4. Surfaces existantes à garder cohérentes : QuizResultsAnalytics
   (quiz Résultats), /api/stats (dashboard), /api/quiz/[id]/analytics.

## AH) PROMPT QUIZ/SONDAGE — écriture naturelle 2026 (juin 2026)

`lib/prompts/quiz/system.ts` est quasi identique à celui de Tipote — toute
évolution du style doit être reportée DES DEUX CÔTÉS.

- **NATURAL_WRITING_BLOCK** : constante exportée, injectée dans la génération
  quiz + sondage. Bannit les tics IA (« ce n'est pas X c'est Y », tirets
  cadratins, mots brochure, triades lisses, faux-profond, emojis déco, formules
  de coach) ; exige phrases variées, spécifique/sensoriel, vocabulaire réel,
  point de vue assumé. Synchronisé avec Tipote.
- **Modèle = Opus** pour `quiz/generate` (rédaction fine ; override
  `TIQUIZ_QUIZ_MODEL`). L'embed (`api/embed/quiz/generate`) reste sur haiku mais
  hérite du bloc anti-IA via le prompt partagé.
- Tiquiz n'a PAS `business_profiles` (archi `profiles` : `brand_tone`,
  `target_audience`). Pas de couche "voix de marque" complète comme Tipote pour
  l'instant — seulement le bloc anti-IA + le `brand_tone`/`target` existants.

## AK) Studio d'images porté depuis Tipote (génération IA + GIF + recadrage) (juin 2026)

Port du Visual Studio Tipote (IMAGE SEULE — pas de carrousel). S'applique aux
quiz (couverture + résultats) et aux sondages (images d'options).

- **Déps installées** : `fabric`, `openai`, `jspdf` (jspdf requis car ImageStudio
  importe exportPdf.ts même si le carrousel est désactivé). `openai` installé avec
  `--legacy-peer-deps` (peerOptional zod3 vs zod4 du repo — sans effet, on n'utilise
  pas le helper zod).
- **Fichiers portés** : `lib/visualStudio/*` (sauf brandLoader/networkFormats/
  uploadVisual), `components/visual-studio/{ImageStudio,StudioCanvas}.tsx`,
  `lib/openaiClient.ts`, routes `/api/visual-studio/{generate-copy,generate-background}`.
- **Différences Tiquiz** (NE PAS recopier bêtement Tipote) :
  - `lib/openaiClient.ts` lit `OPENAI_API_KEY` (Tipote = OPENAI_API_KEY_OWNER).
  - `brand-kit/route.ts` RÉÉCRIT pour le schéma `profiles` (brand_color_primary/
    accent, brand_font, brand_logo_url, brand_tone, target_audience) — pas de
    business_profiles/personas/projects.
  - Bouton = `TiquizStudioButton` : PAS de crédits (`onChargeCredit` → toujours
    true ; Tiquiz n'a pas de système de crédits), upload navigateur vers
    `public-assets` (path `studio/<uid>/<ts>.png`), `enableCarousel={false}`,
    `enableStylePrefs={false}` (donc routes styles/vote/charge NON portées).
  - i18n : namespace `visualStudio` (87 clés) copié depuis Tipote dans les 7 locales.
- Le reste (GIF KLIPY + recadrage sharp) = identique à Tipote, cf. section
  équivalente. Recadrage : bucket `public-assets`, `cropped/<uid>/<file>`.

### AK bis) Studio en mode ILLUSTRATION (Tiquiz) (juin 2026)
Les visuels Tiquiz servent à ILLUSTRER (pas de pub stop-scroll) :
- `ImageStudio` a un prop `illustrationMode` : `generateVisual` ne génère QUE le
  fond (pas d'appel /generate-copy, pas de hook/sous-titre/CTA inventés). Le calque
  titre garde `initialText.headline` (titre du résultat) en police de marque.
- `TiquizStudioButton` câble ça : `illustrationMode`, `initialText` avec tous les
  calques vides sauf `headline = titleText`, formats par défaut `["16:9","1:1"]`
  (paysage par défaut, plus de portrait/story).
- Nouveau format `"16:9"` (1920×1080) ajouté dans `StudioFormatId` (types.ts),
  `FORMATS`/`ALL_FORMATS` (presets.ts), `FORMAT_LABEL_KEY`/`FORMAT_ICON`
  (ImageStudio) + clé i18n `visualStudio.formatLandscape` (7 locales). Si on ajoute
  un format, penser à TOUS ces endroits (Record<StudioFormatId> = clés exhaustives).
- Appels : passer `titleText` (titre résultat / texte option / titre quiz) en plus
  d'`intent` (contexte plus riche pour l'image IA).

### AL) Anti-IA : NATURAL_WRITING_BLOCK + sanitizer post-process (30 mai 2026)

Toute génération / réécriture IA doit respecter les règles anti-IA (pas de
tiret cadratin, pas de "ce n'est pas X c'est Y", pas de verbes brochure,
pas d'emojis déco). Deux niveaux :

1. **Prompt** : injecter `NATURAL_WRITING_BLOCK` (`lib/prompts/quiz/system.ts`)
   dans chaque `system` prompt qui produit du texte final visible (génération
   quiz, génération sondage, import quiz, import sondage, rewrite ✨).
2. **Post-process** : `sanitizeAiText(s)` / `sanitizeAiQuizPayload(payload)`
   (`lib/aiTextSanitizer.ts`) — strip em dashes en incise, emojis déco
   leaders, collapse double-spaces. **Belt-and-suspenders** : les prompts
   leakent encore parfois.

Routes actuellement câblées (Tiquiz + Tipote miroir) :
- `/api/quiz/generate` (génération + sondage) → `sanitizeAiQuizPayload`
- `/api/quiz/[id]/rewrite` → `sanitizeAiText` sur chaque proposal
- `/api/embed/quiz/generate` (Tiquiz) → `sanitizeAiQuizPayload`
- `/api/quiz/import` (Tipote) → `sanitizeAiQuizPayload`

Si je crée une **nouvelle route IA qui produit du texte visible** :
1. Importer `NATURAL_WRITING_BLOCK` + l'injecter dans le system prompt.
2. Importer `sanitizeAiText` ou `sanitizeAiQuizPayload` + l'appliquer
   AVANT de renvoyer au client.

Le format CTA est aussi cappé à 3-6 mots dans le system prompt de
génération quiz (le modèle générait sinon des phrases longues qui
débordaient du bouton).

## AM) Bouton submit du formulaire email = WYSIWYG (30 mai 2026)

Colonne `quizzes.capture_submit_text` (rich-text HTML, NULL = fallback
i18n). Visible / éditable dans le preview du quiz à la place du `<button>`
hardcodé "Voir mes résultats" / "Accéder aux résultats".

Migrations :
- Tiquiz : `supabase/migrations/20260530_quizzes_capture_submit_text.sql`
- Tipote : `supabase/migrations/20260603_quizzes_capture_submit_text.sql`

7 endroits touchés (cf. section A) : migration, PATCH whitelist, public
SELECT chain, FR_KEYS interpolation, editor state (load + save +
autosave snapshot deps), visitor render dans `PublicQuizClient.tsx`.

Côté visiteur : si `capture_submit_text` est null/vide → string i18n
par défaut (comportement strict des quiz existants préservé). Sinon →
`<span className="(tipote|tiquiz)-quiz-rich tipote-quiz-rich-inline block w-full">`
avec sanitizeRichText + interp (text-align center / left / right du
RichText utilisateur propagé via `block w-full`).

## AN) CTA résultat : `block w-full` sur le span sinon text-align ignoré (30 mai 2026)

`PublicQuizClient.tsx` rend chaque CTA dans un `<Button>` avec une
`<span className="tiquiz-rich" ...>`. Sans `block w-full`, le span reste
inline → la `text-align: center / left / right` posée par RichTextEdit
dans l'HTML interne (style="text-align: center" sur un `<p>` / `<div>`)
n'a aucun effet, et le visiteur voit toujours le CTA aligné à gauche.

Fix : `<span className="tiquiz-rich block w-full" ...>`. Mêmes locations
sur l'écran de résultat (quiz + sondage) ET pour le bouton submit du
formulaire email.

CSS dans `globals.css` matche déjà `[style*="text-align: center"]`,
donc rien à toucher côté styles.

## AP) AVANT d'écrire `t("...")` : grep la clé dans messages/fr.json (30 mai 2026)

Bug Adeline (30 mai 2026) : screenshot avec "quizEditor.introImageAi" et
"quizEditor.introImageGif" affichés RAW à côté de l'icône cadeau. Cause :
j'ai écrit `label={t("introImageAi")}` côté Tiquiz sans vérifier que la
clé existait dans le namespace `quizEditor` — elle existait sur Tipote
(namespace `quizDetail`) mais pas sur Tiquiz.

**Règle absolue** : avant d'introduire `t("foo.bar")` ou `t("foo")` dans
un composant, faire :
```
grep -n "\"foo\"" messages/fr.json
```
Si la clé n'existe pas → AJOUTER dans **les 7 locales** (fr / en / es /
pt / pt-BR / it / ar) AVANT de commit. Tipote a 7 locales aussi.

Hint visuel : le rendu `quizEditor.foo` (le namespace préfixé) côté UI
est le canari "clé manquante". Si je le vois en preview, je grep
immédiatement.

## AT) Systeme.io strippe les `<script>` — iframe obligatoire (31 mai 2026)

Pour la preuve sociale embarquée sur `tipote.fr/tiquiz` (sales page),
Systeme.io rend le HTML d'un bloc "Code HTML personnalisé" MAIS
supprime / désactive les `<script>` à l'intérieur. Conséquence : un
snippet HTML+JS direct affiche les cartes mais le fetch ne se
déclenche jamais, les chiffres restent en skeleton.

**Symptôme** : aucun appel à `quiz.tipote.com/api/public/stats` dans
le Network du navigateur quand on est sur la sales page, alors qu'un
`fetch('https://quiz.tipote.com/api/public/stats')` tapé direct
dans la console renvoie bien le JSON. Ça veut dire : l'API marche,
CORS OK, c'est le `<script>` qui ne s'exécute pas.

**Workaround officiel** : héberger une page widget standalone côté
Tiquiz et l'embarquer via iframe. C'est ce qu'on a fait pour la
preuve sociale :
- Route : `app/widgets/social-proof/page.tsx` (+ layout minimal et
  Client Component `SocialProofWidget.tsx`)
- Middleware : `app/middleware.ts` ajoute `/widgets/*` à la liste des
  routes iframe-friendly (`Content-Security-Policy: frame-ancestors *`)
- Snippet Systeme.io : juste un `<iframe src="https://quiz.tipote.com/widgets/social-proof">`

**Règle** : toute nouvelle intégration sur Systeme.io qui nécessite
du JS DOIT passer par un iframe, pas par un snippet HTML+JS.

## AR) DOMAINES DE PROD — à connaître par cœur (30 mai 2026)

Adeline m'a remonté plusieurs fois que je mélange les noms de domaine.
Notation définitive :

| Surface | Domaine | Détail |
|---|---|---|
| **App Tiquiz** (dashboard, éditeur, API, quizzes des users) | `https://quiz.tipote.com` | C'est le host primaire de l'app Tiquiz. La marque s'appelle Tiquiz mais le domaine appartient à Tipote. PAS `app.tiquiz.com`, PAS `tiquiz.com`, PAS `app.tipote.com`. |
| **Page de vente Tiquiz** (sales page Systeme.io) | `https://tipote.fr/tiquiz` | Hébergée chez Systeme.io, c'est là qu'on colle les snippets HTML custom (preuve sociale, etc.). |
| **App Tipote** (autopilot) | `https://app.tipote.com` | Repo tipote-app, autre app. |
| **Custom domains des users** | divers | Cf. pitfall H ter et J : OG metadata via `buildCanonicalUrl`, favicon via route handler. |

**Conséquence pratique** :
- Tout snippet/intégration qui fetch l'API Tiquiz doit cibler
  `https://quiz.tipote.com/api/...` — JAMAIS `app.tiquiz.com` ni
  `tiquiz.com`.
- Quand je suggère une URL de prod ou de test, je relis cette ligne
  AVANT de cliquer push.
- `lib/publicUrl.ts` mentionne `tiquiz.com / quiz.tipote.com` —
  le 2e est le bon. Le 1er reste là pour des raisons historiques
  d'aperçu OG mais n'est PAS le host primaire.

## AS) Status d'un quiz "publié" = `'active'`, JAMAIS `'published'` (30 mai 2026)

L'enum `quizzes.status` côté Tiquiz utilise `'active'` pour les quiz
publiés. Le mot `'published'` n'existe pas dans la DB.

**Source de vérité** : `app/api/quiz/[quizId]/public/route.ts` ligne 46 :
```ts
opts.requireActive ? await q.eq("status", "active").maybeSingle() : ...
```

J'ai planté en écrivant `eq("status", "published")` dans
`app/api/public/stats/route.ts` → COUNT retournait toujours 0. Adeline
me l'a remonté.

**Reminder** : avant tout `.eq("status", X)`, grep `status` dans
`app/api/` pour vérifier la valeur attendue. Les autres valeurs
possibles (cf. SurveyDetailClient et autres) : `draft`, `archived`.

## AQ) TOUJOURS porter les corrections Quiz aux Sondages (30 mai 2026)

Les sondages Tiquiz sont des lignes de la table `quizzes` avec
`mode='survey'`. Mais l'éditeur sondage vit dans
`components/quiz/SurveyDetailClient.tsx` (parallèle à `QuizDetailClient.tsx`).
**Toute correction faite côté quiz doit être miroir-portée côté sondage**,
sinon Adeline remonte le bug. Récurrents qu'on a manqué :

- Logo override (`brand_logo_url` + `hide_brand_logo`) : fait sur quiz le
  30/05, oublié sur survey → re-corrigé le même jour suite à retour Adeline.
- Visual Studio + GIF picker pour bonus image : fait sur quiz, à vérifier
  sur survey à chaque évolution.
- Image bonus draggable 4 slots : pareil.
- Submit button WYSIWYG (`capture_submit_text`) : déjà miroir.
- Toute future colonne ajoutée à `quizzes` : touche les 2 clients.

**Checklist quand je modifie QuizDetailClient.tsx** :
1. Le changement concerne aussi le mode survey ? Si oui → port immédiat dans
   SurveyDetailClient.tsx avec le même nom de state, même handler, même UI.
2. Si le changement concerne le rendu visiteur (couverture, logo, bonus,
   submit button) → port aussi dans le rendu visiteur Survey de
   `PublicQuizClient.tsx` (les 2 modes y cohabitent).
3. Si nouvelle clé i18n → namespace `quizEditor` valable pour les 2 modes.

**Convention** : avant de commit une feature quiz, faire un grep miroir :
```
grep -n "<feature-state>" components/quiz/SurveyDetailClient.tsx
```
Si ça remonte rien, je vais devoir porter.

## AO) Logo : override par quiz via quizzes.brand_logo_url + hide_brand_logo (30 mai 2026)

Avant : le logo vivait UNIQUEMENT sur `profiles.brand_logo_url` (Tiquiz)
ou `business_profiles.brand_logo_url` (Tipote) — un seul logo pour tous
les quiz du user. Le bouton "Retirer" du design tab effaçait le logo du
profil → tous les quiz perdaient leur logo en même temps.

Maintenant deux colonnes sur `quizzes` :
- `brand_logo_url` (TEXT, NULL = fallback profil)
- `hide_brand_logo` (BOOLEAN, default FALSE = compat)

Migration Tiquiz : `supabase/migrations/20260530_quizzes_brand_logo_override.sql`
Migration Tipote : `supabase/migrations/20260603_quizzes_brand_logo_override.sql`

Resolver `lib/quizBranding.ts → resolveQuizBranding` :
```ts
logoUrl = quiz.hide_brand_logo ? null : (quiz.brand_logo_url ?? profile.brand_logo_url)
```

Trois états UI dans le design tab :
1. `hideBrandLogo` true → encart "Logo masqué" + bouton réactiver.
2. `quizBrandLogoUrl` set → override visible + boutons "Changer / Revenir
   au profil / Masquer".
3. Logo profil utilisé → boutons "Utiliser un autre logo / Masquer".

Upload : `handleLogoUpload(file, scope: "quiz" | "profile")`. Default
`"quiz"` dans l'éditeur — l'upload vise `logos/<uid>/quiz-<quizId>.<ext>`
et alimente `quizBrandLogoUrl`, sans toucher au profil. Le bouton
SettingsClient garde `scope: "profile"` pour le logo global.

**À ne JAMAIS faire** : remettre un bouton "Retirer" qui appelle
`/api/profile` avec `brand_logo_url: null` depuis l'éditeur quiz. C'est
exactement le bug qu'on a corrigé.

i18n : 8 nouvelles clés `designLogo*` dans `quizEditor` (7 locales :
fr/en/es/pt/pt-BR/it/ar). Tipote utilise des strings inline en FR (pas
de namespace dédié).

## AK ter) Studio : plus de logo auto → overlay image/logo libre (juin 2026)
- Le logo AUTOMATIQUE est désactivé (`showLogo` défaut false, état conservé mais
  plus d'UI position/taille). L'effet logo de StudioCanvas reste dormant.
- Nouvelle méthode `addImage(url)` sur le handle StudioCanvas : ajoute une
  FabricImage `selectable/evented` (poignées coins/bords) = déplaçable au drag +
  redimensionnable. `layerId = overlay-*` (≠ undefined → reportSelection l'affiche,
  la toolbar 🗑 = deleteActive() la supprime ; incluse dans toBlob).
- ImageStudio : boutons "Ajouter une image" (FileReader→dataURL, pas de canvas
  tainted) + "Ajouter le logo" (brandKit.logoUrl). i18n: visualStudio.overlay*
  (overlayLabel/AddImage/AddLogo/Hint) dans les 7 locales.

## Sondages Tiquiz : image de COUVERTURE (parité avec Tipote) (juin 2026)
Les sondages Tiquiz sont des lignes de la table `quizzes` (comme les quiz) →
`intro_image_url`/`intro_image_position` existent DÉJÀ + la PATCH /api/quiz/[id]
les whiteliste (route ligne 201) + /api/quiz/[id]/public les sélectionne (ligne
258) + PublicQuizClient les rend. DONC : aucune migration, aucun code public.
Côté éditeur SurveyDetailClient : state introImageUrl, hydratation (q + draft s),
snapshot autosave (+dep), payload PATCH (intro_image_url + intro_image_position
"top"), et bloc UI couverture dans l'INTRO SECTION (IA illustration + GIF +
recadrage). Position "top" uniquement (le hero sondage est centré).

## profiles.id ≠ auth user id sur Tiquiz (≠ Tipote) — piège de port (1er juin 2026)

**Différence structurelle critique entre les 2 apps** :
- **Tipote** : `profiles.id` EST l'auth user id (PK = auth.users.id).
- **Tiquiz** : `profiles.id` est une PK auto-générée (`gen_random_uuid()`),
  et `profiles.user_id` est l'auth user id (FK vers auth.users, UNIQUE).
  Cf. `supabase/migrations/001_initial_schema.sql`.

Donc tout ce qui matche un user (quizzes.user_id, quiz_leads via quizzes,
business_events.user_id, etc.) doit utiliser **`profiles.user_id`**, JAMAIS
`profiles.id`.

**Bug réel (port rétention, 1er juin 2026)** : le cron
`/api/cron/backfill-milestones` itérait sur `profiles.id` puis appelait
`countOutcomes(profile.id)` → `quizzes.eq("user_id", profile.id)` ne
matchait jamais rien → 0 milestone backfillé sur 84 users. Fix : itérer
sur `profiles.user_id`.

**Règle** : quand je porte du code Tipote→Tiquiz qui lit `profiles`,
TOUJOURS vérifier si le code source utilise `profiles.id` comme user id.
Sur Tiquiz, remplacer par `profiles.user_id`. Pattern de référence : la
route `app/api/leads/route.ts` fait bien `.from("profiles").eq("user_id",
user.id)`.



Audit global du 1er juin 2026 → roadmap rétention dans
`ROADMAP_RETENTION.md` (copie locale, canonique côté `tipote-app/`).
Hors-scope explicite à NE PAS confondre :

- **Lifetime 57€ TERMINÉ depuis longtemps**. Plans actifs Tiquiz :
  Free / Monthly 9€ / Yearly 90€. Lifetime existants grandfathérés à
  vie côté DB. Ne JAMAIS proposer une nouvelle vente lifetime ni
  retirer les lifetime existants.
- **Nouveau pricing à venir** : 19€/mois et 190€/an pour les futurs
  users uniquement. Mécanique = `profiles.pricing_grandfathered_at`
  TIMESTAMPTZ. NULL = nouveau prix, NOT NULL = ancien prix. Backfill
  `now()` au moment du switch pour tous les users existants. Stripe :
  nouveaux Price IDs, anciens gardés actifs pour les grandfathérés.
- **Pas de CTA "upgrade vers Tipote" dans Tiquiz** : Systeme.io a
  bloqué le whitelabel Tipote, donc on ne peut plus vendre Tipote
  depuis l'écosystème actuel. Garder l'archi compatible mais ne rien
  exposer en UI tant que le blocage n'est pas levé.
- **Affiliate (commissions / payouts / leaderboard) = Systeme.io**.
  Aucune mécanique financière côté Tiquiz.
- **Monitoring uptime VPS** : déjà couvert par UptimeRobot côté Béné.
  Pas besoin de re-coder un healthcheck custom.

## Foundation `business_events` — table unique log (planifiée roadmap phase 0)

Quand on attaque la phase 0 de `ROADMAP_RETENTION.md` côté Tiquiz :

- **Une seule helper d'INSERT côté serveur** : `lib/businessEvents.ts →
  logBusinessEvent({userId, kind, payload, source, occurredAt?,
  dedupeKey?})`. INSERT direct, lecture `{ error }`. PAS de RPC.
- **`dedupe_key` UNIQUE partiel** pour idempotence (ex
  `systemeio:order_yyy`). `INSERT … ON CONFLICT (user_id, dedupe_key)
  DO NOTHING WHERE dedupe_key IS NOT NULL`.
- **Bucketing temps via `lib/dateKeys.ts`** (jour LOCAL du créateur,
  jamais UTC pour l'affichage).
- **Trigger AFTER INSERT → `evaluate_milestones(user_id)`** : insère
  dans `user_milestones` UNIQUE `(user_id, milestone_key)`. Pas
  d'UPDATE de compteur direct.
- **Kinds Tiquiz** : `lead_captured`, `quiz_view`, `quiz_start`,
  `quiz_complete`, `quiz_share`, `quiz_published`, `popquiz_published`,
  `account_connected`, `account_disconnected`.
- **RLS** : user lit ses events. Service role bypass.
- **Index** : `(user_id, occurred_at DESC)`, `(user_id, kind,
  occurred_at DESC)`. Sans ça les agrégats Wall of Wins traînent dès
  1000 events / user.

## Milestones toasts : marquage seen AT-MOST-ONCE côté serveur (10 juin 2026)

Retour Gwenn 10 juin : les toasts milestones ("100 quiz complétés",
"Premier visiteur qui finit ton quiz") re-poppaient à CHAQUE connexion.
3ᵉ occurrence du même bug (3 juin, 8 juin, 10 juin) → la cause profonde
était structurelle : le marquage `seen_at` dépendait d'une chaîne fragile
client → POST /seen → client Supabase RLS. Si UN maillon casse (POST
perdu, policy UPDATE absente en prod, ids filtrés), `seen_at` reste NULL
et tout re-pop à la session suivante (sessionStorage vidé).

**Architecture verrouillée (NE PAS revenir en arrière) :**
- `GET /api/milestones/unseen` marque `seen_at = now()` via
  **supabaseAdmin** (service-role) AU MOMENT où il sert le batch,
  y compris les lignes dont la clé a été retirée du catalog (sinon
  elles saturent le limit(20) à vie). At-most-once : un toast servi ne
  peut plus JAMAIS re-popper, même si le client crashe. Le toast perdu
  si l'user quitte la page avant affichage est un trade-off accepté
  par Béné (sous-notifier > sur-notifier).
- `POST /api/milestones/seen` = simple filet idempotent, lui aussi en
  service-role scopé `.eq("user_id", user.id)`.
- Client `MilestoneToastListener` : **localStorage** (PAS sessionStorage,
  qui est vidé à chaque nouvel onglet → ne protège pas entre connexions),
  clé `tiquiz.milestones.shown.v2`, cap 200 ids.
- Rate-limit 1 batch/semaine : `profiles.next_milestone_toast_at`
  (migration `20260611_profiles_milestone_rate_limit.sql`, best-effort
  tant que pas appliquée). Tiquiz : `.eq("user_id", ...)`, Tipote :
  `.eq("id", ...)` (cf. pitfall profiles.id ≠ auth user id).

**Règle générale :** tout flag "déjà montré / déjà envoyé" qui
conditionne une notification user DOIT être écrit en service-role par
la route qui SERT le contenu, jamais en différé par le client.

## Tour guidé : chaque phase tour_* DOIT avoir une ancre sidebar VIVANTE (10 juin 2026)

Retour Gwenn 10 juin : pendant le tour guidé, la page "Mes projets"
était grisée par l'overlay mais AUCUN popup pour continuer → user
bloqué sur un écran gris. Cause : le tour (hooks/useTutorial.ts)
référençait des keys d'items sidebar qui n'existaient plus :
- `tour_quizzes` cherchait l'ancre "quizzes", renommée "projects"
  quand quiz + sondages ont fusionné sous "Mes projets".
- `tour_settings` cherchait "settings", retiré de la sidebar
  (Paramètres vit dans le menu avatar). Étape supprimée du tour,
  migration localStorage : phase sauvée "tour_settings" → écran de
  fin + done.

**Règle structurelle :** les `MENU_ITEMS` keys d'AppSidebar sont la
source de vérité des ancres (`TutorialSpotlight elementId={item.key}`).
TOUTE modif de la sidebar (rename, ajout, retrait d'item) DOIT être
répercutée dans `hooks/useTutorial.ts` :
1. `PHASE_ORDER` (ordre = ordre sidebar) + type `TutorialPhase`
2. `PHASE_TO_URL`
3. `shouldHighlight` (phase → key d'item)
4. `currentTooltip` + clé i18n `tutorial.tooltip*` dans LES 7 LOCALES
5. `TutorialOverlay.isInSpotlight` si l'étape doit griser la page
6. Migration localStorage si une phase disparaît (sinon les users en
   cours de tour retombent sur welcome ou restent bloqués)

Tour actuel (7 étapes, miroir sidebar) : dashboard, create,
createSurvey, projects, popquiz, leads, stats.

Symptôme à reconnaître : "écran grisé sans popup" pendant le tour =
phase sans ancre. Vérif rapide : chaque `tour_x` de shouldHighlight
doit matcher une key de MENU_ITEMS.

## Modèle REVENDEUR : fondation phase 1 (11 juin 2026)

Option A validée par Béné : le revendeur encaisse ses clients sur SES
clés Stripe/PayPal, Béné facture sa commission (phase 2). Ses clients
sont des comptes Tiquiz 100% standards sur l'infra de Béné.

**Architecture (NE PAS dévier) :**
- `resellers` : 1 ligne = 1 revendeur, rattaché à son compte Tiquiz via
  `user_id` (= auth uid, PAS profiles.id). `commission_tiers` JSONB
  stocke le barème dégressif (40/35/30/25/20% selon clients actifs),
  exploité en phase 2.
- `profiles.reseller_id` NULL = client direct Béné (tout l'existant).
  Renseigné = portefeuille revendeur. AUCUN changement de comportement
  du compte : mêmes RLS, mêmes features.
- `reseller_actions` : audit de chaque action revendeur.
- Panel : `/reseller` (gate `getResellerSession()` de lib/reseller.ts,
  status active obligatoire). API `/api/reseller/clients` (GET/POST/
  PATCH), service-role TOUJOURS scopé `reseller_id`.
- Admin Béné : `/api/admin/resellers` + ResellersCard dans
  AdminDashboard (promouvoir/suspendre) + badge indigo portefeuille
  dans la table users.

**Règles de sécurité non négociables :**
1. RGPD : le revendeur ne voit QUE des compteurs (nb quiz/sondages/
   popquiz/leads, dernière connexion). JAMAIS le contenu des quiz ni
   les données des leads de ses clients.
2. Anti-captation : POST création refuse (409 email_taken) tout email
   qui correspond à un compte Tiquiz hors portefeuille. Un revendeur ne
   peut pas s'approprier un client direct de Béné ni d'un autre
   revendeur.
3. Plans attribuables par le revendeur : free/monthly/yearly/
   monthly_plus/yearly_plus. Lifetime (offre terminée) et beta exclus
   (RESELLER_ALLOWED_PLANS dans lib/reseller.ts).
4. Commission uniquement sur clients PAYANTS (isPaidPlan) : "je ne
   touche que s'il touche" (Béné). Les free/désabonnés ne comptent pas.
5. Suspension d'un revendeur = il perd son panel, ses clients
   continuent de fonctionner normalement.

**Précisions Béné 11 juin (après-midi) :**
- LICENCE = compte PAYANT quel que soit le plan (mensuel, annuel, plus
  ou normal). Un compte gratuit n'est PAS une licence. Barème sur le
  nombre de licences, bornes incluses : 1 à 200 -> 40%, 201 à 1000 ->
  35%, 1001 à 2000 -> 30%, 2001 à 3000 -> 25%, 3001+ -> 20%.
  Helper : commissionRateFor() dans lib/reseller.ts.
- Whitelist admin = revendeur : si l'email n'a pas de compte Tiquiz,
  le POST /api/admin/resellers le crée à la volée (magic link envoyé).
- Sidebar : entrée "Admin" (ShieldCheck) vers /reseller, affichée
  UNIQUEMENT si /api/reseller/me renvoie is_reseller true (vérif
  serveur à chaque mount, pas de cache navigateur volontairement).
  Les clients normaux ne voient rien.
- Vue de contrôle Béné : ResellersCard affiche par revendeur comptes /
  licences / gratuits / détail par plan / taux du palier courant.

**Bons de commande revendeur (11 juin, soir) :**
- `resellers.checkout_urls` JSONB : URLs des pages de paiement du
  revendeur (clés monthly/yearly/monthly_plus/yearly_plus), éditées
  dans son panel (carte "Mes bons de commande", PUT
  /api/reseller/settings).
- `/api/billing/checkout-urls` : résout les URLs d'achat du user
  CONNECTÉ. Client direct -> managed=false (BDC tipote.fr par défaut).
  Client de revendeur -> managed=true + URLs du revendeur.
- **RÈGLE CRITIQUE : JAMAIS de fallback vers les BDC tipote.fr pour un
  client de revendeur.** Plan sans URL configurée = pas de CTA du tout
  dans Réglages -> Abonnement. Sinon le client payerait Béné au lieu de
  payer son revendeur. Revendeur suspendu = aucune URL servie.
- SettingsClient : seule surface d'achat in-app (tous les autres CTA
  upgrade renvoient vers /settings). Footer paymentsManagedReseller
  pour les clients gérés (le footer par défaut mentionne Systeme.io).
- Reste ouvert (phase 2/3) : si un client de revendeur paye quand même
  via un BDC tipote.fr (vieux lien), le webhook SIO upgradera son plan
  chez Béné -> détection de mismatch à prévoir dans la réconciliation.

**Phase 3 livrée (11 juin, nuit) : provisioning AUTOMATIQUE.**
- `lib/resellerProvisioning.ts` : activateResellerClient /
  cancelResellerClient. Anti-captation, plan_change_log,
  reseller_actions, idempotent. TOUT canal de provisioning revendeur
  DOIT passer par ces deux fonctions.
- Webhook entrant générique : POST
  `/api/reseller-webhook/<webhook_token>?plan=X&action=activate|cancel`.
  Compatible SIO/Stripe/PayPal/Zapier (extraction email tolérante :
  chemins connus + scan récursif). Token validé = réponse TOUJOURS 200
  (soft fail) pour éviter les retry storms. GET = ping de test.
  Rotation du token depuis le panel.
- Bon de commande hébergé : `/order/<slug>/<plan>` (public). Contenu du
  plan depuis les clés i18n settings (source unique), tarif = texte
  libre du revendeur (resellers.pricing), CTA vers SA page de paiement.
  404 si slug inconnu / suspendu / plan sans URL. Jamais de fallback
  tipote.fr.
- **Garde-fou webhook SIO Béné** : les profiles avec reseller_id sont
  IMMUNISÉS contre le webhook SIO (upgrade ET cancel), même pattern que
  l'immunité lifetime. ⚠️ les selects priorProfile sont passés en
  select("*") versions nominatives : une colonne absente (migration pas
  appliquée) ferait planter tout le branch. NE PAS re-nominaliser.
- Migration `20260611_resellers_v2_automation.sql` : webhook_token,
  slug, pricing + re-ALTER checkout_urls (le CREATE TABLE IF NOT EXISTS
  de la foundation n'ajoute pas les colonnes si la table existait déjà).

**Refonte panel en onglets (12 juin, demande Béné) :**
- 5 onglets (pattern Tabs des Réglages) : Mes clients / Activité /
  Bons de commande / Modes de paiement / Facturation Tipote. Tout est
  expliqué en langage simple (étapes numérotées, zéro jargon).
- ⚠️ `resellers.checkout_urls[plan]` est maintenant un OBJET
  `{ stripe?, paypal?, sio? }` (legacy: string nue = stripe, normalisée
  par normalizePlanPayment de lib/reseller.ts). Le BDC hébergé
  /order/<slug>/<plan> affiche un bouton par moyen connecté (carte +
  PayPal) et 404 si aucun des deux. Pour les clients gérés, le CTA
  d'abonnement résout : sio_url > page hébergée > rien (toujours AUCUN
  fallback tipote.fr).
- Le tarif déclaré (amount_cents) se saisit dans l'onglet Modes de
  paiement, le label affiché dans l'onglet Bons de commande.

**Email d'accès personnalisé par revendeur (12 juin) :**
- `lib/resellerEmail.ts` : sendResellerAccessEmail. Si RESEND_API_KEY
  ET resellers.support_email sont renseignés -> generateLink (magic
  link SANS email Supabase) + envoi Resend (pattern lib/email.ts de
  Tipote, fetch direct) : nom du revendeur dans le corps, reply-to =
  son support_email, bilingue FR+EN (locale client inconnue à la
  création). SINON fallback automatique signInWithOtp (template
  Supabase global signé Béné) : rien ne casse jamais.
- support_email saisi dans l'onglet Mes clients du panel (migration
  20260612_resellers_support_email.sql).
- Env Tiquiz requis pour activer : RESEND_API_KEY (+ optionnel
  RESELLER_FROM_EMAIL, défaut SUPPORT_FROM_EMAIL puis hello@tipote.com,
  le domaine doit être vérifié dans Resend).
- Tous les canaux passent par sendResellerAccessEmail (provisioning
  lib + routes clients). L'admin Béné garde le flux OTP standard.

**Phase 2 livrée (12 juin, nuit) : commission mensuelle automatique.**
- Table `reseller_invoices` (migration 20260611_resellers_v3_invoices) :
  1 facture / revendeur / mois (period YYYY-MM, index unique, montants
  en CENTIMES). Cron idempotent `/api/cron/reseller-invoices`
  (CRON_SECRET, à planifier le 1er du mois) + déclenchement manuel
  depuis l'admin (POST /api/admin/reseller-invoices).
- Calcul : licences par plan x prix DÉCLARÉ mensualisé (annuels /12) x
  taux du palier (commissionRateFor). Prix déclaré =
  resellers.pricing[plan].amount_cents, saisi par le revendeur dans son
  panel. Manquant -> ligne missing_price à 0, signalée des deux côtés.
  0 licence -> pas de facture.
- Paiement de la commission : env `RESELLER_PAYOUT_STRIPE_URL` /
  `RESELLER_PAYOUT_PAYPAL_URL` (pages d'encaissement de Béné, montant
  libre) -> boutons "Payer via..." sur les factures pending du panel.
  À AJOUTER AU .env PROD, sinon pas de bouton de paiement.
- Béné marque payée/à payer dans ResellersCard (PATCH admin).
- Panel : gestion manuelle des plans par client (select, free = fermer)
  via PATCH op:"set_plan" -> lib resellerProvisioning (source "panel",
  actor = revendeur). Le revendeur "garde la main" comme demandé.
- Aperçu BDC pour Béné : /order/preview/<plan> (admin uniquement,
  données d'exemple).

## Quiz public mobile : comportement tactile Typeform/Tally (12 juin 2026)

Retour Béné : sur mobile, des réponses semblaient "préselectionnées"
(surbrillance) sur les quiz. Deux causes cumulées :
1. `commitAnswer` avançait INSTANTANÉMENT à la question suivante : le
   bouton de la nouvelle question se rendait sous le doigt du visiteur
   et récupérait le tap-highlight natif iOS/Android.
2. Aucun `-webkit-tap-highlight-color` dans le CSS : voile gris natif
   du navigateur à chaque tap.
(Le hover collé, 3e cause classique, était déjà réglé par
`future: { hoverOnlyWhenSupported: true }` dans tailwind.config,
Adeline 17 mai.)

**Standard verrouillé (NE PAS revenir en arrière) :**
- Types à UN tap (option simple, oui/non, image, rating, star) : la
  réponse s'affiche sélectionnée pendant ONE_TAP_ADVANCE_DELAY_MS
  (350 ms) PUIS on avance. Re-tap pendant le délai = dernier choix
  gagne (timer resetté, advanceTimerRef). Le tracking question_answer
  part au moment de l'avance, pas du tap.
- Commits via bouton "Suivant" (texte libre, multi-choix) : instantanés.
- `html { -webkit-tap-highlight-color: transparent }` dans globals.css.
- Boutons de réponse : `select-none` partout + `active:scale-[0.98]`
  sur les gros boutons (press feedback).
- Appliqué en MIROIR dans Tipote (même composant PublicQuizClient).

## Titres de blocs résultat personnalisables par profil (Gwenn 13 juin 2026)

Les 2 titres de blocs résultat (insight "Prise de conscience" +
projection "Et si...") sont au niveau du QUIZ
(quizzes.result_insight_heading / result_projection_heading), donc
PARTAGÉS. Gwenn voulait un titre différent par profil tout en gardant
le fill-once quand ils sont identiques.

**Solution : override nullable par résultat** (quiz_results.
insight_heading / projection_heading, migration
20260613_quiz_results_heading_overrides). NULL/vide = titre commun.
Mode "personnalisé" DÉRIVÉ (au moins un override non-null sur le bloc),
pas de flag en base. Activer le mode = pré-remplir chaque profil avec
le titre commun (point de départ). Désactiver = effacer tous les
overrides. Toggle exposé sous chaque titre de bloc dans l'éditeur
("Titre différent pour ce profil" / "Revenir au titre commun"),
block-level même s'il apparaît par profil.

Rendu public : `result.X_heading?.trim() || quiz.result_X_heading?.trim()
|| défaut traduit`. Appliqué AUX 2 emplacements de PublicQuizClient
(résultat principal + breakdown "autres résultats").

Endroits touchés (override sur quiz_results, pas quizzes) : migration,
QuizDetailClient (type QuizResult + handlers + booleans dérivés + 2
blocs UI + payload save), api/quiz/[id]/route.ts (SanitizedResult +
sanitize), api/quiz/[id]/public/route.ts (select + FR passthrough),
PublicQuizClient (type + 4 renders). PORTÉ À L'IDENTIQUE SUR TIPOTE
(InlineEdit au lieu de RichTextEdit, libellés FR en dur, classes
tipote-quiz-rich).

## Liens d'abonnement = tunnels "part" (affiliation SIO) (Béné 14 juin 2026)

Dans Réglages -> Abonnement (SettingsClient PLANS), les CTA d'upgrade
DOIVENT pointer vers les tunnels `part` (tagués affiliation côté SIO),
PAS les tunnels nus (`tiquiz-mensuel`...). Sinon un user free amené par
un affilié qui upgrade depuis son compte ne crédite PERSONNE : les
tunnels nus ne sont pas configurés pour l'affiliation dans SIO.

**Pas de `?sa=` à ajouter** : SIO dépose un cookie / attribue au sponsor
du contact (contact-level) dès le premier clic affilié. Il suffit
d'envoyer sur le bon tunnel `part`. Un user direct (sans sponsor) ->
aucune commission, Béné garde 100%. Donc `part` est safe pour tous.

Mapping officiel (rappel admin affilié, /affiliate/admin/links) :
- Mensuel : `/part-tiquiz-mensuel`
- Annuel : `/part-tiquiz-annuel`
- Mensuel Plus : `/tiquiz-mensuel-plus-part` (ORDRE INVERSE côté SIO)
- Annuel Plus : `/tiquiz-annuel-plus-part` (ORDRE INVERSE)
- Principal/Gratuit : `/part-tiquiz`, `/part-tiquiz-gratuit`

⚠️ Ne touche PAS au flux revendeur : les clients managed gardent les
checkout_urls du revendeur (effectiveCheckoutUrl), les tunnels part ne
s'appliquent qu'aux clients directs Béné (managed=false).

UI abonnement (même date) : toggle Mensuel/Annuel (parité page de vente,
"2 mois offerts"), badges inline "−17%"/"+" supprimés, noms alignés sur
la page de vente (Mensuel/Annuel/Mensuel Plus/Annuel Plus, CTA "Accès
X"), sous-titre "sans engagement". Toggle caché pour lifetime/beta.

---

## Tags sondages — bien les EXPLIQUER (24 juin 2026)

Le tag de capture sondage (`quizzes.sio_capture_tag`, migration
`20260616`) était fonctionnel mais sous-expliqué : un user s'y perdait.
Rappel de la logique à garder cohérente partout :
- Quiz = 1 tag par RÉSULTAT (`quiz_results.sio_tag_name`).
- Sondage = pas de résultat → 1 tag UNIQUE, dans le formulaire de contact
  (`SurveyDetailClient`, visible quand capture activée).

Le tuto Réglages > Systeme.io ne parlait QUE des tags par résultat →
ajout d'une note "sondage" après l'étape 1 (`settings.autoSurveyNote`) +
hint enrichi (`surveyLeadTagHint`). Si on retouche ce tuto, garder le cas
sondage visible : c'est le point qui perdait les users.

## AI) RÉPONSES SONDAGE — formateur type-aware OBLIGATOIRE (drame Béné 26 juin 2026)

Trois bugs simultanés sur les sondages, tous issus d'une lecture des
réponses AVEUGLE au `question_type` :
1. Export CSV anonyme (ne sélectionnait que `created_at, answers`) → Béné
   ne pouvait pas savoir QUI a donné QUELLE réponse (cas : récompenser les
   bonnes réponses).
2. Export affichait `Option 1` au lieu de `Oui`. Les questions `yes_no` ne
   stockent AUCUNE option en base (Oui/Non rendu depuis la locale dans
   PublicQuizClient via `t.yesLabel/noLabel`). Lire `options[idx].text`
   renvoyait vide → fallback `Option N`.
3. Analyse IA "personne n'a répondu" : `aggregateSurvey` construisait les
   compteurs depuis `q.options` → `yes_no` (options vides) = AUCUN chiffre
   envoyé à Claude → il croyait la question vide. Et le texte libre
   n'envoyait que 10 exemples sans le total → "10 sur 25" halluciné.

**Source de vérité unique : `lib/survey/format.ts`**
- `formatSurveyAnswer(question, answer, locale)` : SEUL endroit qui
  transforme une réponse brute en libellé. yes_no → Oui/Non localisé,
  rating/stars → nombre, free_text → texte, choix → `options[i].text`.
- `localizedYesNo(locale)`, `isAnswered(answer)`, `indexAnswers(answers)`.
- TOUTE nouvelle UI/export qui affiche des réponses DOIT passer par ce
  helper. Ne JAMAIS relire `options[idx]` à la main pour un yes_no.

**Modèle de données** (rappel) : réponses dans `quiz_leads.answers`
(JSONB array `{question_index, option_index?|option_indices?|rating?|
stars?|text?}`), sur la MÊME ligne que l'identité (email/prénom/nom/
téléphone). `question_index` = position 0-based dans l'ordre `sort_order`
(= index tableau, comme PublicQuizClient + SurveyTrends). NE PAS keyer sur
`sort_order` brut.

**Agrégat IA** : `aggregateSurvey` calcule `answeredCount` par question, et
les `%` sont sur les répondants à CETTE question (somme = 100% en choix
unique). Le prompt affiche `[N/T ont répondu]` + le total des réponses
libres → garde-fous anti "question vide" / anti "X sur Y". Ne pas
retirer ces garde-fous.

**Vue "Réponses"** : `components/quiz/SurveyResponsesTable.tsx`, sous-onglet
`Synthèse | Réponses` dans l'onglet Tendances (pattern Typeform/Tally).
1 ligne = 1 répondant (identité + réponses), recherche + export CSV.

**Endroits à garder synchrones (Tiquiz ET Tipote)** :
- `lib/survey/format.ts` (helper partagé)
- `lib/survey/analysis.ts` (aggregateSurvey + prompt)
- `app/api/quiz/[quizId]/survey-results/route.ts` (CSV)
- `components/quiz/SurveyResponsesTable.tsx` + branchement SurveyDetailClient
