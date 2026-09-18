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
npm run test:visual    # 209 passes + 4 skippes, SI le design ou l'UX bouge
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
| **par quoi reprendre, tout de suite** | **`PASSATION.md`** (daté du 9 septembre) |
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

**ET JAMAIS `. .env` DANS UNE CRONTAB (mesuré le 11 septembre 2026).**
La crontab tourne sous `sh`, pas sous bash, et `sh` ne cherche pas
`.env` dans le dossier courant : `/bin/sh: 1: .: .env: not found`. Les
lignes écrites ainsi (`affiliate-trial-expiry`, `reseller-invoices`,
`churn-ask`, `remise-affilies`, `rejouer-commissions`) n'avaient JAMAIS
tourné. Les commentaires de ces routes montraient cette forme : ils
sont périmés, la crontab du serveur a été réécrite. Une ligne lit la
SEULE clé dont elle a besoin, dans l'ordre que Next utilise :

```bash
curl -fsS -H "Authorization: Bearer $(grep -m1 -h '^CRON_SECRET=' /home/tipote/tiquiz-app/.env.local /home/tipote/tiquiz-app/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"\r')" https://quiz.tipote.com/api/cron/...
```

Le serveur de Tiquiz porte AUSSI un `.env.local` (sans `CRON_SECRET`,
mais avec d'autres clés qui passent devant `.env`). Aucun secret ne
s'écrit en clair dans la crontab.

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
npm run test:visual            # doit passer 209, 4 skippes
```

- Échec = un layout a bougé sans intention -> corriger AVANT de pousser.
- Changement de design VOULU -> `npm run test:visual:update` puis
  committer les nouvelles références AVEC le changement.
- Le harness : `playwright.visual.config.ts` + `tests/visual/` + page
  fixture `/visual-test` (gated `VISUAL_TEST=1`, aucune base requise).
- Couverture, **213 tests** dont 4 skippés (mesuré le 17 septembre 2026 en
  lançant la commande, pas déduit ; c'était 99 le 23 août, le site public et
  le blog sont arrivés depuis) :
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
npm run test:visual    # 209 passes, uniquement si le design/UX bouge
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

## Les interdits qui ne se discutent pas

Ajouté le 18 septembre 2026 en découpant ce fichier. Chaque ligne RÉSUME une
règle écrite en entier dans `AGENTS_HISTORIQUE.md` : avant de toucher au code
concerné, on va lire sa section. Rien ici n'est nouveau.

- **Aucun secret ne s'imprime.** Un contrôle dit "les deux valeurs diffèrent"
  et s'arrête là. Un secret se compare en TEMPS CONSTANT (`safeEqual`), jamais
  avec `!==`, et jamais en clair dans une crontab.
- **Le `.env` se lit DANS UNE PARENTHÈSE**, jamais dans le shell nu, jamais
  `. .env` dans une crontab. `npm run build && pm2 restart <app> --update-env`
  sur UNE ligne : sans le `&&`, un build refusé se déploie quand même.
- **La commission se calcule sur le HT**, avec la taxe de la facture qu'on
  émet, jamais un taux deviné. `base` est un paramètre OBLIGATOIRE.
- **Un refus métier lu par un NAVIGATEUR répond 200 avec `ok: false`** et une
  RAISON, jamais une phrase : Cloudflare remplace le corps d'un 5xx. Les 5xx
  restent dans les webhooks, où un fournisseur doit réessayer.
- **Je ne pousse JAMAIS sur `main`**, seulement sur la branche indiquée dans la
  consigne de session. Ce nom change à chaque fois : jamais recopié d'un fichier.
- **`npm run test:logic` et `npx tsc --noEmit` avant CHAQUE push**, sans qu'on
  le demande. `npm run test:visual` si le design bouge.
- **Une migration SQL touchée = le bloc 🚨 dans le message final.**
- **Les fichiers SUPPRIMÉS, et eux seuls, se signalent** dans le message final.

## Où chercher une règle, et pourquoi elle existe

Les 136 sections chronologiques de ce fichier vivent dans
`AGENTS_HISTORIQUE.md`, **à la racine de ce dépôt**. Elles ne sont plus
relues à chaque tour : elles se lisent À LA DEMANDE, avant de toucher au
code qu'elles décrivent.

**Rien n'a été réécrit ni résumé** : le découpage est mécanique, à l'octet
près, et il est réversible par un `git revert`.

```bash
grep -n '^## ' AGENTS_HISTORIQUE.md          # la liste
grep -n -i 'nbsp\|affilié\|migration' AGENTS_HISTORIQUE.md   # chercher
sed -n '<debut>,<fin>p' AGENTS_HISTORIQUE.md # lire une section
```

**Avant de toucher à un chantier, on lit SA section**, comme avant : le
fichier est le même, il n'est simplement plus recopié dans chaque
conversation.

### OÙ UNE SESSION ÉCRIT SON RÉCIT

**Dans `AGENTS_HISTORIQUE.md`, à la fin. Pas ici.** Ce fichier est
recollé AVANT chacun des messages de Béné, dans toutes ses
conversations : ce qu'on y ajoute, elle le paie à chaque tour, et c'est
comme ça qu'il est passé à 786 625 octets.

On ne touche au socle que pour une règle qui s'applique à CHAQUE tour
(le style, git, les migrations, les tests avant push, l'argent, les
secrets), et **on retire alors ce qu'elle remplace**.

`tests/logic/socle-agents.test.mts` le tient : il borne la taille de ce
fichier, il exige que l'historique existe encore, et il refuse un
`@AGENTS_HISTORIQUE.md` dans `CLAUDE.md` (qui rebrancherait le mégaoctet
d'un coup, sans que ça se voie sur aucun écran). Une consigne écrite
dans un fichier que personne ne relit n'est pas une règle : c'est une
mesure qui le tient, et elle rougit avant le push.

Les sections déplacées, dans l'ordre :

- Distribution par résultat — RÈGLE UNIQUE (drame Gwenn 8 juin 2026)
- Funnel par question - RÈGLE UNIQUE (drame Adeline 1er août 2026)
- Identité stable des questions - RÈGLE UNIQUE (1er août 2026)
- Réponses sans options - à ne pas oublier (retour Jocelyne 1er août 2026)
- Taille de police d'un champ : UNE seule enveloppe (drame Jocelyne 1er août 2026)
- Quiz scoré : les contrôles "profil" ne s'appliquent PAS (drame Véronique 1er août 2026)
- Flèche retour = hiérarchie, jamais l'historique (drame Gwenn 1er août 2026)
- "Ne pas afficher le score" (retour Véronique 1er août 2026)
- Boutons de partage : les réseaux cochés, ou TOUS (retour Béné 1er août 2026)
- Un lien envoyé par email pointe sur NOTRE domaine (drame Véronique 2 août 2026)
- Profil ou score : c'est LA décision qui bloque (Véronique 2 août 2026)
- Mode scoring : le visiteur ne doit JAMAIS voir une page vide
- Un `ok: false` produit TOUJOURS quelque chose à l'écran (3 août 2026)
- Le chrome d'édition n'hérite jamais de l'aperçu (drame Jocelyne 3 août 2026)
- Moins de réponses que de profils (escalade Véronique 3 août 2026)
- Titre et sous-titre partagent UN bord, calculé UNE fois (drame Béné 3 août 2026)
- La page de résultat suit les 4 temps de l'Atelier (3 août 2026)
- Les titres générés s'inspirent des ressources, sans les recopier (3 août 2026)
- Le logo n'est pas un bloc de texte (retour Béné 3 août 2026)
- Titre et sous-titre : la borne est sur le CONTENEUR, jamais sur un champ
- Liste ou colonnes : l'aperçu ignorait le réglage (retour Béné 3 août 2026)
- Le sous-titre du quiz dit un BÉNÉFICE, jamais la fiche technique (retour Béné 3 août 2026)
- Un prompt est du CODE : il se teste (3 août 2026)
- Une nouveauté qu'on ne montre pas n'existe pas (retour Jocelyne 3 août 2026)
- Typographie française : liste NOIRE, et l'espace s'INSÈRE (3 août 2026)
- L'URL de l'Atelier vit à UN endroit (drame Béné 3 août 2026)
- Une chute dans le funnel : sur QUI, et sur QUELLE question (drame Jocelyne 4 août 2026)
- Le mot "quiz" n'est plus interdit comme adresse (retour Béné 4 août 2026)
- Alignement : trois étages, et le plus fort doit pouvoir se taire (4 août 2026)
- L'image d'une réponse garde SON format (retour Béné 4 août 2026)
- Une librairie qui change d'API, et un `as unknown as` qui l'a caché (drame François Xavier, 7 août 2026)
- Un client qui a payé reste en gratuit (drame Ivan, 7 août 2026)
- Partager SON résultat, pas le quiz (retour client, 7 août 2026)
- Un export SingleFile n'a PAS les scripts (19 août 2026)
- Trois causes, un seul message : le 404 muet (19 août 2026)
- Un shell qui garde le `.env` de l'autre app (panne 22 août 2026)
- Ce que l'API de Systeme.io donne, et ce qu'elle ne donne pas (22 août 2026)
- Une fiche par client, et le tiroir qui a disparu (22 août 2026)
- Le bouton Rembourser qui ne pouvait pas exister (22 août 2026)
- Le support : le centre d'aide est chez Tipote, le ticketing chez nous
- Après un paiement pris chez nous (22 août 2026)
- Vérifier DANS QUEL DOSSIER on regarde (ma faute, 22 août 2026)
- Elle a payé, elle n'a pas demandé à se connecter (Béné, 23 août 2026)
- Annuler n'est pas rembourser (Béné, 23 août 2026)
- Un lien légal ne fait JAMAIS quitter la page (Béné, 24 août 2026)
- Une seule file de tickets, une porte commune (Béné, 23 août 2026)
- PayPal sur Tiquiz : des ABONNEMENTS, pas un achat unique (23 août 2026)
- Le mois offert : l'essai du fournisseur, pas un palier prêté (23 août 2026)
- Le mois offert ne s'ouvre QUE sur un lien du système courant (24 août 2026)
- Le lien d'affiliation porte `?ref=`, l'ancien `?sa=` reste lu (24 août 2026)
- L'audit du 24 août : quatre trous dans les chaînes paiement
- Monter de palier : le prorata chez Stripe, un abonnement neuf chez PayPal (23 août 2026)
- Une facture légale, et PayPal n'en émet aucune (Béné, 24 août 2026)
- Sortir de Systeme.io : l'état des lieux vit dans UN fichier
- L'audit du 26 août : le mois offert commissionnait à l'envers
- Le cookie d'affiliation dure UN AN (Béné, 26 août 2026)
- Une inscription gratuite rattache son affilié, à VIE
- Une commission récurrente tenait à la version d'API de Stripe (31 août 2026)
- Équipes dans le PLUS : ce qui est noté, et ce qui bloque (Béné, 29 août 2026)
- Le simulateur d'affiliation répond enfin à la question posée (31 août 2026)
- Le blog vit dans le dépôt, pas dans une base (Béné, 29 août 2026)
- La page d'article du blog, refaite sur le modèle Typeform (Béné, 30 août 2026)
- Les nouvelles couvertures, et le chiffre qui a survécu au dessin (31 août 2026)
- Une vente PayPal paie sur le HT, comme une vente carte (Béné, 31 août 2026)
- Poser un tag chez Systeme.io ne déclenche RIEN (mesuré le 31 août 2026)
- Toutes les images en 403 : le garde-fou était à l'étage du dessous (31 août 2026)
- Le formulaire de la newsletter : 502 muet, et la campagne qui n'est pas abonnée (31 août 2026)
- L'inscription newsletter : TROIS blocages empilés, et aucun n'était celui qu'on croyait (31 août 2026)
- Un 5xx devant un formulaire perd sa raison (mesuré le 31 août 2026)
- Un segment d'URL n'est PAS décodé par Next (31 août 2026)
- Le repli d'expéditeur partait d'un domaine non vérifié (31 août 2026)
- Une clé Resend appartient à un COMPTE, pas au domaine qu'on regarde (31 août 2026)
- Le nom d'un écran s'écrit UNE fois, dans la barre du haut (2 septembre 2026)
- Aide et contact : UNE entrée, et le tour guidé passe en haut
- Mes projets : un aller-retour PAR PROJET, en série (2 septembre 2026)
- Le brouillon d'une question ne suit PAS le visiteur (retour Adeline, 1er septembre 2026)
- Le menu sous une réponse dit le NOM du profil (retour Christian, 1er septembre 2026)
- Deux liens, le même mot, deux gestes opposés (retour Christian, 1er septembre 2026)
- Vérifier que le bouton du quiz porte bien l'identifiant (Béné, 1er septembre 2026)
- Une valeur d'URL n'est pas un motif de recherche (1er septembre 2026)
- Une entité HTML sans balise autour (retour Christian, 1er septembre 2026)
- L'onglet Automatisation : ce qu'il faut créer dans Systeme.io (Béné, 1er septembre 2026)
- Les trois générateurs de contenu (Béné, 1er septembre 2026)
- Les générateurs, deuxième passage (Béné, 2 septembre 2026)
- Le nom d'un fichier ne dit pas ce qu'il y a dedans (1er septembre 2026)
- L'article qui recrute les affiliés ne promet que ce qui est payé (1er septembre 2026)
- Une décoration à gauche n'est pas le seul défaut de mise en page
- Le SEO de tiquiz.fr : quatre défauts qu'on ne voit pas depuis le code (1er septembre 2026)
- Le hub intégrations : capter la recherche entre un concurrent et Systeme.io (Béné, 1er septembre 2026)
- Une vente d'un AUTRE produit ouvrait un abonnement Tiquiz (1er septembre 2026)
- Pinterest : hors d'un article, il n'y avait RIEN à épingler (1er septembre 2026)
- Le sitemap existait, le flux non (1er septembre 2026)
- La page de vente servie n'était pas la page affichée (2 septembre 2026)
- Le quiz de la démo se retrouve dans le compte (Béné, 2 septembre 2026)
- La connexion Google, et les trois choses qu'elle aurait fait perdre (2 septembre 2026)
- Le déploiement fantôme : le serveur reconstruisait l'ANCIEN code (2 septembre 2026)
- Google refuse le branding : ce qu'il regarde vraiment (2 septembre 2026)
- Les robots d'IA bloqués par Cloudflare : ce que ça coûte VRAIMENT (3 septembre 2026)
- Mesurer les conversions : le montant vient du CATALOGUE (4 septembre 2026)
- Le site public s'aligne sur la PAGE DE VENTE (Béné, 4 septembre 2026)
- Le sitemap du domaine de vente oubliait les pages légales (4 septembre 2026)
- Un client anglophone est parti : ce qui était vrai, ce qui ne l'était pas (7 septembre 2026)
- Le trafic et les ventes sur le même écran (Béné, 4 septembre 2026, point 3)
- Le favicon d'une créatrice n'était jamais servi (Béné, 7 septembre 2026)
- Le générateur de quiz a sa page, et le bouton y était MORT (8 septembre 2026)
- L'anglais a enfin une ADRESSE (Béné, 8 septembre 2026)
- Qui entre par le générateur, et ce qu'il devient (Béné, 8 septembre 2026)
- LE CONTENU PERDU À L'IMPORT (Béné, 8 septembre 2026)
- LA VIDÉO D'UN ARTICLE : rien ne part chez Google avant le clic (8 septembre 2026)
- LA FIN DU CAS CLIENT DE JOCELYNE (Béné, 8 septembre 2026)
- Les chevrons n'étaient corrigés par RIEN (8 septembre 2026)
- Une adresse email d'ARTICLE était masquée par Cloudflare (8 septembre 2026)
- Le filet responsive couvre enfin deux articles (8 septembre 2026)
- Le meuble d'un article anglais parlait français (corrigé le 9 septembre)
- Les quatre liens de Jocelyne, en cartes (Béné, 8 septembre 2026)
- UN SVG SUR LE BLOG : ça marche, en FICHIER (Béné, 8 septembre 2026)
- SOURCER LES FAQ (Béné, 8 septembre 2026)
- LA MESURE DU PARCOURS : cinq événements, et pas un de plus (Béné, 9 septembre 2026)
- LA VITESSE : ses deux causes étaient déjà réglées, la vraie était ailleurs (Béné, 9 septembre 2026)
- Le contrat d'URL du générateur, et la porte qu'il allait casser (9 septembre 2026)
- Le quiz gardé 7 jours, et il n'était perdu qu'à un cheveu près (9 septembre 2026)
- Le quiz du haut de page, et les six briefs qu'il partage (Béné, 9 septembre 2026)
- Le quiz s'affiche pendant qu'il s'écrit, et la route rend une RAISON (chantier 3 + tâche #55, 10 septembre 2026)
- Une vente encaissée chez nous prévient Béné par email (11 septembre 2026)
- Deux ventes Systeme.io absentes du tableau de bord : ce qui est établi, ce qui ne l'est pas (11 septembre 2026)
- L'audit du 11 septembre : « est-ce que je peux envoyer mes affiliés dessus sans risque ? »
- Un paiement sans accès prévient Béné, un accès à moitié ouvert aussi (11 septembre 2026, suite)
- Les leads partent vers l'outil CHOISI : Systeme.io ou GoHighLevel, et la vente ne bouge pas (Béné, 14 septembre 2026)
- `&nbsp;` en clair sur la case de consentement (Béné, 15 septembre 2026)
- Le guide GoHighLevel est un pas à pas, et l'éditeur ne dit plus "Tag Systeme.io" (Béné, 15 septembre 2026)
- Un champ personnalisé dans le formulaire de capture (retour client, 16 septembre 2026)
- Les champs personnalisés partent dans la fiche contact (Béné, 16 septembre 2026)
- Le bouton "Publier" est un interrupteur Actif / Désactivé (retour client, 16 septembre 2026)
- `&nbsp;` en clair : la cause était NOTRE PROPRE sanitize (16 septembre 2026)
- TOUT le formulaire de capture est éditable (Béné, 16 septembre 2026)
- Un seul endroit pour TOUT ce qu'on demande au visiteur (Béné, 17 septembre 2026)
- La vente qui n'était identifiée nulle part, et l'affilié qu'on ne pouvait pas rassurer (Béné, 17 septembre 2026)
- Le live de Greg, l'email qui ne disait rien, et /admin qui s'éteint (Béné, 18 septembre 2026)
- Le registre devient opposable, et l'Atelier s'offre dans une fenêtre (Béné, 18 septembre 2026)
- « Mon trafic n'est absolument pas tracké » : Cloudflare répondait avant nous (Béné, 18 septembre 2026)
