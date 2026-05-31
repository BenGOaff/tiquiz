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
