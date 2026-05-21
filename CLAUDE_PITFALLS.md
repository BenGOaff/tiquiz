# Claude pitfalls + conventions (pense-bête personnel)

> Fichier auto-géré par Claude. Lu à chaque session via AGENTS.md.
> Mis à jour quand un bug remonte plusieurs fois ou qu'une convention
> implicite se révèle après coup. **Si je casse un de ces points, c'est
> un bug régressif évitable.**

---

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

- **Source de vérité = `quiz_events`** (table log time-series). Les compteurs sur `quizzes` (views_count, etc.) sont **auto-bumpés par trigger** `trg_quiz_events_bump_counter`. **Ne JAMAIS UPDATE les compteurs directement** — utiliser `log_quiz_event` RPC ou INSERT direct dans `quiz_events`.
- **Dedup via cookie session** : cookie `tquiz_visit` HttpOnly 30j, généré server-side au premier load. Le tracking serveur check `(quiz_id, event_type, session_id, created_at > NOW() - 24h)` avant INSERT.
- **Client `trackedRef`** : Set en mémoire pour éviter les doublons IN-tab. Combiné avec le cookie côté serveur, on dédupe correctement même si l'utilisateur ouvre 5 onglets.

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

## O) FAVICON — NE JAMAIS supprimer `app/favicon.ico` (21 mai 2026)

**Erreur faite** : j'ai supprimé `app/favicon.ico` pour résoudre un bug
de priorité de `<link rel="icon">` sur les pages publiques custom
domain (le favicon static écrasait celui du branding via le `sizes`
attribute). Résultat : sur l'app Tiquiz elle-même, plus de favicon
custom, retour au triangle Next.js par défaut.

**Règle absolue** : `app/favicon.ico` est la source du favicon Tiquiz
historique pour TOUTES les routes non-brandées (login, dashboard,
settings, etc.). Le supprimer = perdre l'identité visuelle de l'app.

**Si je veux fixer le conflit sur custom domains**, NE PAS toucher ce
fichier. Solutions acceptables uniquement :
- Émettre le brand favicon avec `sizes="any"` (wildcard) via
  generateMetadata sur les pages publiques.
- Convertir vers un route handler dynamique (`app/icon.tsx` ou
  `app/favicon.ico/route.ts`) qui sert le bon favicon selon le Host
  header — mais ce refactor doit être validé par Béné avant d'être fait.

**Si la prod sert le mauvais favicon** : ne PAS spéculer, vérifier
d'abord :
1. `ls -la app/favicon.ico` sur le VPS — le fichier existe-t-il ?
2. `curl -sI https://<host>/favicon.ico` → status 200 et taille
   attendue ?
3. `curl -sL https://<host>/ | grep "rel=\"icon\""` → quels `<link>` ?

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
