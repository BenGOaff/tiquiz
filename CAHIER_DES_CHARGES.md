# CAHIER DES CHARGES Tiquiz — Mise à jour Juin 2026

Application Web SaaS multilingue (FR/EN/ES/IT/AR) de création de quiz interactifs pour capture de leads, avec intégration Systeme.io et génération IA.

**Tiquiz est la version allégée de Tipote**, focalisée uniquement sur les quiz, l'IA et Systeme.io. Pas de coach IA, pas de crédits IA, pas de réseaux sociaux, pas d'automations, pas de pages builder.

> **Notes de version Juin 2026** — sprint multiprofils + paliers + + outillage défensif :
>
> - **Multiprofils Tiquiz (7 phases livrées)** : un utilisateur peut désormais gérer plusieurs "projets" (= comptes virtuels isolés). Nouvelle table `projects` (id, user_id, name, is_default, accent_color, icon_emoji, use_branding_logo). Colonne `project_id UUID NULL` ajoutée à `quizzes`, `popquizzes`, `business_events`, `user_milestones` (FK `ON DELETE SET NULL` pour préserver les contenus publiés quand un projet est supprimé). `business_profiles` est désormais per `(user, project)` et porte tout le branding (logo, couleurs, palettes sauvées) + positionnement (ton de marque, audience cible) + pixels par défaut (Meta pixel, GA4, Google Ads, Meta CAPI, share domain, OG site name). `sio_api_keys` étendu avec `project_id` + `UNIQUE(user_id, project_id, name)` + index partiel "1 default par (user, project) WHERE is_default=true". Cookie `tiquiz_active_project` (httpOnly=false pour parité Tipote + lecture client). Sémantique stricte (Béné 2 juin) : **un nouveau projet démarre VIDE** (stats à zéro, branding vierge, pas d'héritage des réglages des autres comptes). Filtrage actif via `getActiveProjectScope(userId, email)` gate par `canUseMultiProjects(plan)` — seuls les paliers premium débloquent l'isolation, le free/monthly/yearly conserve le comportement legacy mono-projet.
> - **Paliers premium "+"** : ajout des plans **monthly_plus (29€/mois)** et **yearly_plus (290€/an)** qui débloquent multiprofils + analyse IA des résultats + multi-clés Systeme.io. Le plan `lifetime` (57€, offre fermée) reste équivalent à monthly_plus / yearly_plus pour récompenser les early adopters. Le plan `beta` est accordé manuellement par Béné et débloque tout. Source de vérité prix : `lib/planLimits.ts:PRICING_PLUS`. Helpers : `isPremiumPlan()` (beta + lifetime + monthly_plus + yearly_plus), `canUseMultiProjects(plan)`, `canUseAIAnalysis(plan)` (anciennement `canUseSurveyAI`, alias conservé), `canConnectMultipleSioKeys(plan)`, `shouldShowPlusUpsell(plan)` (true pour monthly/yearly → affiche CTA upgrade). Migration `20260608_plan_plus_check.sql` étend `profiles_plan_check` pour accepter `monthly_plus`, `yearly_plus`, `beta` (avant : free/monthly/yearly/lifetime uniquement).
> - **Webhook SIO upgrade/downgrade auto (1 clic)** : depuis Settings → Abonnement, l'utilisateur clique "Passer à Mensuel+" → checkout SIO du nouveau plan. Le webhook `ORDER_NEW` upsert `profiles.plan = nouveau`, déclenche un **auto-cancel des anciens subs SIO** via l'API (`cancelSubscription` "Now"), et pose `profiles.expected_sio_cancel_until = NOW() + 24h`. Le `SALE_CANCELED` de l'ancien sub arrive plus tard et est **ignoré** par le webhook tant que le flag est dans le futur (anti double-downgrade). Migration `20260609_profiles_expected_sio_cancel.sql`. Tous les sens couverts (free → +, monthly → +, monthly+ → yearly+, downgrade…). Logique d'inférence dans `lib/sio/webhookInference.ts` (module pur, testable) : **URL d'abord** (source de vérité depuis juin 2026, ex. `tipote.fr/tiquiz-mensuel-plus`), `offer-price-id` en fallback (anciens bons numériques uniques). Tous les nouveaux bons SIO partagent le même `offerprice-dc9c3e75` → matching par URL obligatoire.
> - **Templates v2** : passage de 8 à **15 templates** dans `lib/templates/catalog.ts`. 7 nouveaux modèles coachs : croyance-limitante (mindset), rapport-nourriture (nutrition), fuites-energie (sommeil & énergie), style-parental (parentalité), schema-amoureux (couple), blocage-reconversion, rapport-argent (finance). Format constant : 6 questions × 4 options + 4 résultats, ton chaleureux, tutoiement, pas de jargon coach.
> - **Auto-instanciation post-signup** : nouveau composant `components/dashboard/FirstQuizOnboarding.tsx` affiché dans le dashboard quand `quizzes.length === 0`. 6 templates phares en cartes (emoji + titre + métier + tagline). 1 clic → `POST /api/quiz` avec le payload du template → redirect `/quiz/[id]` en édition. Fallbacks "Voir les 15 modèles" (`/templates`) et "Partir de zéro" (`/quiz/new`). Effet : passage de "signup → éditeur vide intimidant" à "signup → quiz prêt à publier en 10 secondes".
> - **Fix bug stats Gwenn (2 juin)** : `/api/quiz/[id]/analytics/route.ts` recompte désormais `viewsCount` et `completionsCount` **directement depuis `quiz_events`** au lieu de lire `quizzes.views_count` (compteur dénormalisé qui drift dans le temps). Garde-fou : `viewsCount = max(events.view, leadsCount)` pour éviter des ratios > 100% (Gwenn voyait 270 leads pour 34 vues = 794%).
> - **KPI cards cliquables dans `/leads`** : clic sur "Non synchronisés" / "Synchronisés SIO" / "Ce mois" / "Total" filtre la liste. 2e clic enlève le filtre. Ring colorée quand actif.
> - **Hotfix Opus 4.7+ rejette `temperature`** (1er juin) : Anthropic a retiré les sampling params sur Opus 4.7/4.8. Centralisation dans `lib/claudeRequest.ts:buildClaudeMessageBody()` (source unique). Tier Opus bumpé 4.7 → 4.8 dans `lib/anthropicModel.ts`.
> - **Hotfix Playwright build prod (2 juin)** : `tsconfig.json` exclut désormais `playwright.config.ts` et `tests/e2e/**` (sinon `@playwright/test` non installé en prod fait planter `npm run build`). CI Tiquiz lance maintenant `npm run build` complet en plus du typecheck (filet anti-régression).
> - **Renommage `canUseSurveyAI` → `canUseAIAnalysis`** : couvre désormais quiz ET sondages (Béné 2 juin : "Analyse IA c'est pour les sondages ET les quiz"). Alias rétrocompat conservé. Le helper `lib/survey/analysis.ts` est conservé et sera étendu côté quiz prochainement (roadmap).
> - **Outillage défensif (scripts npm)** : `check:schema` (détecte les migrations en retard, 9 migrations multiprofils vérifiées), `diag:multiprofils` (11 invariants DB), `smoke:multiprofils` (11 tests E2E workflow Settings → isolation projets), `test:webhook` (28 cas de routing webhook sans payer 1€), `test:e2e` (Playwright sur `/q/`, `/p/`, `/pq/`), `smoke` (routes publiques legacy bash). Nouvel endpoint admin `POST /api/admin/webhook-dry-run` (header `X-Dry-Run-Secret = SYSTEME_IO_WEBHOOK_SECRET`) pour rejouer un payload SIO sans toucher la DB.
> - **CI GitHub Actions** : `.github/workflows/ci.yml` (typecheck + `npm run build` + smoke syntax scripts à chaque push) ; `.github/workflows/e2e.yml` (Playwright en schedule daily 3h UTC + `workflow_dispatch`). Variables GitHub non-secrets : `SMOKE_QUIZ_ID`, `SMOKE_POPQUIZ_ID`, `SMOKE_PAGE_SLUG`, `BASE_URL`.

> **Notes de version 17 mai 2026** — sprint custom-domains :
>
> - **Domaines personnalisés** : feature livrée production. Les créateurs payants connectent leur propre hostname (`quiz.ma-marque.com`) à Tiquiz, posent un CNAME vers `connect.tipote.com` (même cible que Tipote — un seul Caddy sur le VPS sert les deux apps), Caddy émet le certif Let's Encrypt en on-demand TLS. Table `custom_domains` (hostname unique global, RLS user-bound + lecture publique des `verified`). Settings → Domaine (`/settings?tab=domain`) avec détection registrar automatique (12 fournisseurs supportés : Cloudflare, OVH, Gandi, GoDaddy, Namecheap, Google Domains, Route 53, IONOS, Hetzner, Scaleway, Porkbun, Hostinger) + instructions adaptées + auto-poll de vérification DNS (30 s × 20 tentatives). Plan-gated (paid).
> - **URLs propres** : sur un custom domain, les liens publics perdent le préfixe (`mydomain.com/<slug>` au lieu de `/q/<slug>`, `/p/<slug>`). Sur le main host `quiz.tipote.com`, le préfixe reste (multi-tenant). Nouveau catch-all `app/[publicSlug]/page.tsx` qui résout 2 types (quiz active → popquiz published), filtré par owner du hostname. Backwards-compat sur les anciennes URLs `/q/...`, `/p/...`.
> - **Sélecteur de domaine partage** : hook `useShareDomain()` + composant `ShareDomainPicker` dans les éditeurs quiz / sondage / popquiz. Quand l'user a ≥1 custom domain verified, dropdown au-dessus du champ slug avec son domaine pré-sélectionné. Préférence persistée par user via `profiles.default_share_domain` (`/api/profile/share-domain` GET + PATCH). UI share-link refondue : une seule ligne `prefix + input + Enregistrer + Copier` au lieu de 3 lignes, bouton Copier visible sur le bloc iframe.
> - **Ownership cross-tenant** : les pages `/q/[id]` et `/p/[id]` ajoutent un check ownership quand servies via custom domain (hostname → user_id, quiz/popquiz doit appartenir à ce user). Empêche un créateur de servir le contenu d'un autre sur son propre domaine. No-op sur main host.
> - **Validation slug** : refus de `SLUG_RESERVED` (api, embed, dashboard, robots.txt, _next…) et `SLUG_TAKEN` cross-type (un slug ne peut exister que sur quiz OU popquiz, pas les deux, pour un même user). Indispensable pour la non-ambiguïté du catch-all.
> - **Drive-by bug fix** : les URLs partagées popquiz pointaient sur `/pq/<handle>` (route inexistante côté Tiquiz, le path public réel est `/p/<handle>`). Tous les `${origin}/pq/...` swappés en `${origin}/p/...` ou en `buildPublicUrl("p", handle)` (PopquizEditClient, PopquizNewClient, comments lib/popquiz/*). Aucun lien partagé n'était fonctionnel avant ce fix.
> - **Infra Caddy** : `on_demand_tls.ask` pointé vers un nouveau dispatcher localhost (`127.0.0.1:4000`, code dans le repo Tipote `infra/dispatcher/`) qui fan-out vers les deux apps. Catchall `:443` enveloppé dans un `route { forward_auth ... ; @tipote header X-Dispatch-To tipote ; handle @tipote { reverse_proxy 127.0.0.1:3000 } ; reverse_proxy 127.0.0.1:3001 }`. Default fallback Tiquiz pour préserver les custom domains déjà émis. Caddyfile reste dans `infra/caddy/`.
> - **Sondage IA** : override des libellés de l'overlay `AIGeneratingOverlay` quand on est en flow sondage — auparavant il affichait "L'IA crée ton quiz..." même en sondage (clés communes héritées de quiz). Nouvelles entrées `survey.aiGeneratingTitle` + `survey.aiGeneratingSubtitle` dans les 7 locales avec une copie correcte ("L'IA crée ton sondage...").
> - **i18n housekeeping** : ajout de `common.aiRewriteTitle` (et 3 siblings) sur les 7 locales — alias des mêmes strings que `richTextEditor.*` parce que `rich-text-edit.tsx` lit ces clés depuis la namespace `common` mais elles n'existaient que sous `richTextEditor`. Cassait les pages où le bouton AI-rewrite était visible.

> **Notes de version Mai 2026** — synthèse des évolutions majeures depuis Avril :
> - **Module Popquiz** : nouveau type de contenu — vidéo (YouTube/Vimeo/upload TUS resumable jusqu'à 2 GB) avec quiz interactifs incrustés à des timestamps précis. Routes `/popquiz/new`, `/popquiz/[id]`, `/popquizzes` (liste), `/p/[id]` (page publique de lecture), `/embed/p/[id]` (iframe embed). Sidebar : nouvelle entrée « Popquiz vidéo ». Plan gratuit limité à 1 popquiz. À la publication d'un popquiz, les quiz référencés par ses cues sont auto-activés (Gwenn « le quiz ne s'ouvre pas »).
> - **Sécurité leads (3 couches)** : FK `quiz_leads.result_id` ON DELETE SET NULL, snapshot `result_title` avant DELETE des résultats orphelins, NULL-out explicite avant DELETE. Aucun lead ne peut disparaître quand un créateur re-shuffle ses résultats.
> - **Typographie française** : NBSP appliqué automatiquement avant `: ; ! ? »` à la fois côté save (PATCH du quiz) et côté render (route publique) pour les locales `fr*`. Idempotent. Fix de l'interpolator (`lib/quizPersonalization.ts`) qui arrachait le NBSP avec un regex `\s+` trop greedy : remplacé par `[ \t]+` pour préserver le NBSP.
> - **Quiz éditeur** : color picker dans `RichTextEdit` (palette de swatches + input couleur custom + reset). Fix contraste invisible blanc-sur-blanc en mode édition (text-foreground forcé). Headings `result_insight_heading` / `result_projection_heading` réellement renvoyés au front (SELECT public corrigé — avant ils restaient bloqués sur les défauts « Prise de conscience » / « Et si... »). Word-paste forcé en plain text. Listes UL/OL stylées via `tiquiz-rich`.
> - **Bonus** : nouveau champ `bonus_intro_text` (paragraphe custom qui remplace le templeté de l'étape de partage). `hasBonusFlow` accepte désormais image bonus seule. Bouton « Recommencer » sur l'étape résultat (clear sessionStorage + reload).
> - **Toast** : Sonner réglé à 1.8 s (avant : 4 s) pour ne plus masquer les boutons d'action.
> - **Garde-fous** : `docs/INVARIANTS.md` documente les zones cassables (5 invariants : lead-safety, typo FR, popquiz publié → quiz auto-actifs, lockfile reflète package.json, cue popquiz scopé créateur).

> **Notes de version Mi-Mai 2026** — sprint 7-8 mai (parité Tipote) :
>
> - **Pipeline vidéo Popquiz self-hosted** : sortie de Supabase Storage. Stack tus server Node sur `tus.quiz.tipote.com` (`@tus/server` + JWT HS256, claim `app: 'tiquiz'` pour distinguer des uploads Tipote sur le même serveur partagé) → stockage `/srv/popquiz-videos/tiquiz/raw/<userId>/<videoId>/` → lecture protégée `nginx secure_link` sur `videos.quiz.tipote.com`. **Limite 20 Go par vidéo** (vs 2 Go avant). Migration douce : path `raw/...` legacy = Supabase signed URL ; path `tiquiz/raw/...` = secure_link. Endpoints : `/api/popquiz/upload-token`, `/api/popquiz/playback-url`, `/api/popquiz/[id]/thumbnail`.
> - **Vignette popquiz personnalisable** : composant `ThumbnailPicker` avec crop 16/9 intégré (canvas natif). Toggle vignette auto vs custom. Le revert est instantané (changement de pointeur DB, le fichier auto reste sur disque).
> - **Player popquiz enrichi** : vitesse de lecture (0.5×–2×), skip ±10s, partage (Web Share API + fallback copie-lien), Picture-in-Picture, poster YouTube en HD (maxresdefault → hqdefault fallback). `PosterOverlay` se masque au démarrage de la lecture (fix YouTube/Vimeo iframe).
> - **Quiz analytics par quiz** : nouvelle page `/quiz/[id]/analytics` (cards visiteurs / leads / capture rate / export SIO + chart évolution + pie distribution résultats + funnel par question). Funnel calculé via nouvelle table `quiz_question_events` (event `view` / `answer`, session anonyme côté client). Endpoint `/api/quiz/[id]/track` étendu pour accepter `question_view` / `question_answer`. Bouton 📊 dans `/quizzes`.
> - **JB feedback** : `quizzes.bonus_unlocked_message` (TEXT, optionnel) override le « Bonus unlocked! Check your inbox. » par défaut — utilité : livrer un code promo inline. UI dans QuizDetailClient sous "Message après partage". `ALL_DEFAULT_CONSENTS` étendu : la phrase admin `"En renseignant ton email, tu acceptes notre politique de confidentialité."` (pre-fill historique) est désormais reconnue comme un default → fallback automatique sur la locale du viewer.
> - **Bucket Supabase manquant** : création de `public-assets` (public, 10 Mo, mime types image whitelist + RLS). Avant : tous les uploads de logo + bonus image échouaient silencieusement (bucket inexistant en prod).
> - **Trigger Postgres anti-récurrence onboarding** : `auto_complete_onboarding_when_filled()` flippe `business_profiles.onboarding_completed = true` automatiquement dès qu'une row a niche + au moins une offre. Garde-fou DB pour ne plus jamais avoir un user actif coincé sur l'onboarding (régressions Monique 2026-04 / Flo 2026-05).

---

## 1. PRÉSENTATION DU PRODUIT

### 1.1. Vision

Tiquiz est un outil de création de quiz lead magnets, ultra simple côté utilisateur mais puissant côté backend. L'utilisateur crée un quiz (manuellement ou via IA), le partage, capture des leads et les synchronise automatiquement avec Systeme.io (tags, formations, communautés).

### 1.2. Fonctionnalités clés

- Création de quiz manuellement ou par **génération IA** (Claude Anthropic, streaming SSE)
- **Brainstorm IA conversationnel** (`/api/quiz/idea-chat`, Claude Haiku) pour dégrossir un brief avant génération
- **Multiprofils** (juin 2026 — paliers + uniquement) : 1 user → N projets isolés (quiz, leads, stats, branding, clés SIO indépendants). Switch en 1 clic via header. Voir §4bis
- **Analyse IA des résultats** (juin 2026 — paliers + uniquement) : synthèse Claude des réponses agrégées, quiz + sondages. Helper `lib/survey/analysis.ts`
- **15 templates métier** (`lib/templates/catalog.ts`, juin 2026) : 7 nouveaux modèles coachs (croyance-limitante, rapport-nourriture, fuites-energie, style-parental, schema-amoureux, blocage-reconversion, rapport-argent) + 8 historiques (profil-entrepreneur, moteur-interieur, style-yoga, terrain-naturo, pret-a-lancer-formation, levier-croissance-marketing, style-photo, pret-premier-achat-immo). Format : 6 questions × 4 options + 4 résultats
- **Auto-instanciation post-signup** : dashboard vide → 6 templates phares en cartes → 1 clic publie le premier quiz (composant `components/dashboard/FirstQuizOnboarding.tsx`)
- **Module Popquiz** (Mai 2026) : vidéo (YouTube / Vimeo / upload TUS resumable jusqu'à 20 GB depuis 8 mai) avec quiz interactifs incrustés à des timestamps précis. Embed iframe `/embed/p/{id}` pour intégration externe (WordPress, Systeme.io…). Auto-activation des quiz référencés à la publication du popquiz. Plan gratuit limité à 1 popquiz
- **Éditeur WYSIWYG live** : sidebar multi-onglets (Structure / Design / Paramètres / Partage) + preview temps réel, switch mobile/desktop, édition inline sur tous les textes, champs rich-text (gras, italique, liens, images, alignement) pour intro / description / insight / projection
- **Branding par quiz** : police Google (whitelist), couleur principale, couleur de fond, logo — héritage du profil avec override au niveau du quiz
- **URL courte personnalisée** par quiz (`slug` → `/q/{slug}`, sanitisée + anti-collision avec UUID)
- Page publique de quiz responsive (`/q/{quizId|slug}`)
- Capture de leads configurable (email + prénom + nom + téléphone + pays), avec **tag Systeme.io capture** distinct du tag share
- Résultats personnalisés avec CTA par résultat, plus un CTA par défaut en fallback
- **Answer tags** : chaque option de question peut porter son propre `sio_tag_name` appliqué selon la réponse
- **Intégration Systeme.io** : auto-tagging, inscription formation, ajout communauté, enrichissement contact
- **Viralité** : étape "bonus" dédiée entre capture et résultats, anti-triche (navigator.share mobile, polling popup desktop, dwell + confirmation pour copy-link), visuel du bonus (image / mockup / GIF), sélecteur de réseaux (Facebook, X, LinkedIn, WhatsApp, Telegram, email, copy), tag SIO share dédié
- Partage OG personnalisable par quiz (`og_image_url`, `og_description`) + footer custom (`custom_footer_text`, `custom_footer_url`)
- Tracking funnel (vues, starts, completions, shares, taux de conversion)
- Dashboard avec stats par quiz, pages dédiées `/quizzes`, `/leads`, `/stats`
- **UI en 5 langues** (FR, EN, ES, IT, AR) + support RTL — **quiz public en 8 variantes** (fr, fr_vous, en, es, it, de, pt, ar) avec forme d'adresse tu/vous par quiz
- Back-office admin minimaliste (`/admin` réservé aux emails whitelistés)
- Monétisation freemium via webhooks Systeme.io

### 1.3. Ce que Tiquiz N'A PAS (vs Tipote) — mis à jour juin 2026

- Pas de coach IA
- Pas de crédits IA / consommation
- Pas de réseaux sociaux (OAuth, publication, automations)
- Pas de constructeur de pages
- Pas de contenu (posts, emails, articles, vidéos)
- Pas de stratégie / plan d'action
- Pas de clients / accompagnements
- Pas de widgets (toast, partage social)
- Pas de templates Systeme.io
- Pas de notifications
- Pas de pépites
- Tiquiz hérite désormais (juin 2026) du **multiprofils** (paliers premium uniquement) et d'une **analyse IA des résultats** (paliers premium uniquement) — alignement de feature avec Tipote sur le périmètre quiz/sondage, mais Tiquiz reste focalisé sur le module quiz+popquiz+sondage uniquement (pas de coach, pas de pages, pas de réseaux)
- **Admin backoffice existant** (`/admin` + `/api/admin/users` + `/api/admin/webhook-dry-run`) — réservé aux emails whitelistés

---

## 2. ARCHITECTURE UX

### 2.1. Workflow utilisateur

```
INSCRIPTION (SIO webhook ou signup)
    → LOGIN (email/password ou magic link)
        → DASHBOARD (liste quiz + stats)
            → CRÉER UN QUIZ (manuel ou IA)
                → PARTAGER (lien public /q/[id])
                    → LEADS capturés → sync SIO
```

### 2.2. Navigation

| Page | URL | Description |
|:-----|:----|:-----------|
| Accueil | / | Landing page |
| Login | /login | Connexion (password + magic link) |
| Signup | /signup | Inscription |
| Dashboard | /dashboard | Vue d'ensemble + onboarding |
| Mes quiz | /quizzes | Liste dédiée des quiz (gérer, activer, partager) |
| Nouveau quiz | /quiz/new | Création (Manuel / IA / Brainstorm IA / Import) |
| Éditer quiz | /quiz/[quizId] | Éditeur WYSIWYG live (Structure/Design/Paramètres/Partage) |
| Quiz public | /q/[quizId\|slug] | Page publique du quiz, résolution par UUID ou slug |
| Mes leads | /leads | Toutes les leads capturées sur tous les quiz |
| Statistiques | /stats | Analytics agrégés par quiz (funnel, conversion) |
| Paramètres | /settings | Profil, langue, adresse, privacy, clé SIO, branding global (police/couleur/logo) |
| Admin | /admin | Back-office (emails whitelistés uniquement) |
| Callback auth | /auth/callback | Gestion OTP / PKCE / implicit |

---

## 3. PAGES DE L'APPLICATION

### 3.1. Authentification

- **Login** : email + mot de passe OU magic link (OTP)
- **Signup** : nom + email + mot de passe
- **Callback** : gestion de 3 flows auth Supabase :
  - OTP avec `token_hash` (invitations, magic links)
  - PKCE avec `code` (échange de session)
  - Implicit avec `#access_token` (hash fragment)
- Détection automatique de la langue (Accept-Language → cookie `ui_locale`)
- Redirection post-auth vers `/dashboard`

### 3.2. Dashboard (/dashboard)

Page d'accueil après login.

**Composants :**

- Liste de tous les quiz de l'utilisateur
- Stats par quiz : vues, starts, completions, leads, shares, taux de conversion
- Actions par quiz : copier lien public, éditer, supprimer
- Bouton "Nouveau quiz"
- Accès paramètres + sélecteur de langue
- Bouton déconnexion

### 3.3. Création / Édition de quiz (/quiz/new et /quiz/[quizId])

**Modes de création (page `/quiz/new`) :**

- **Manuel** : formulaire complet
- **Génération IA** : streaming SSE (`/api/quiz/generate`) qui remplit le formulaire en temps réel à partir d'un brief (objectif, audience, ton, CTA, bonus, nombre de questions / résultats, forme d'adresse, langue)
- **Brainstorm IA** : chat conversationnel (`/api/quiz/idea-chat`, Claude Haiku) qui aide l'utilisateur à cadrer son idée en 4–6 tours avant de lancer la génération complète
- **Import** : placeholder (à venir — CSV/JSON)

**Éditeur WYSIWYG live (`/quiz/[quizId]`) :**

L'éditeur a une sidebar à gauche avec 4 onglets + une preview live à droite (switch mobile/desktop en temps réel). Édition inline sur tous les textes (InlineEdit / RichTextEdit) directement dans la preview.

- **Structure** — arborescence : Intro, Questions (drag-and-drop), Prise d'informations, Demande de partage (si viralité activée), Résultats (drag-and-drop) ; scroll-to-section au clic
- **Design** — police (whitelist Google Fonts : Inter, Poppins, Nunito, Montserrat, etc.), couleur principale, couleur de fond, logo de marque (héritage profil → override par quiz)
- **Paramètres** — formulaire de capture (pills activables pour prénom, nom, téléphone, pays), options (toggle "Demande de partage"), bloc bonus (description, visuel image/mockup/GIF uploadable, message de partage pré-rempli, tag SIO post-share), CTA par défaut (fallback pour les résultats qui n'ont pas leur propre CTA)
- **Partage** — slug personnalisé (`/q/{slug}`), sélecteur de réseaux de partage (Facebook, X, LinkedIn, WhatsApp, Telegram, email, copy), OG image + OG description, footer custom (texte + URL)

**Champs rich-text** (HTML sanitizé côté client et serveur via `sanitizeRichText`) : introduction, description / insight / projection de chaque résultat. Supportent gras, italique, liens, images, alignement.

**Champs éditables inline** : titre, bouton "Commencer", questions, options, titres de résultats, CTA par résultat + URL, heading/subtitle de capture.

**Par résultat** : titre, description, insight ("Prise de conscience"), projection ("Et si…"), CTA texte + URL spécifique, mapping SIO (tag, course, community).

**Par option de question** : texte, mapping vers un résultat, `sio_tag_name` optionnel (answer tag appliqué selon la réponse).

### 3.4. Quiz public (/q/[quizId|slug])

Résolution de l'URL : UUID direct OU slug personnalisé (stocké sur `quizzes.slug`, validation case-insensitive, refuse les slugs qui ressemblent à un UUID pour éviter de shadow le fallback direct).

**Parcours utilisateur :**

1. **Intro** — titre, introduction rich-text, bouton "Commencer" (texte éditable, `start_button_text`)
2. **Questions** — navigation multi-étapes (précédent / suivant) avec barre de progression
3. **Capture** — heading + subtitle personnalisés, email + champs optionnels configurés (prénom, nom, téléphone, pays), consentement via `privacy_url` + `consent_text`
4. **Bonus share** (si `virality_enabled` et `bonus_description` renseignés) — étape intermédiaire **avant** les résultats :
   - Heading contextuel tu/vous, description du bonus, visuel optionnel (`bonus_image_url`)
   - Boutons des réseaux sélectionnés (`share_networks`) + bouton "Copier le lien"
   - **Anti-triche** :
     - Mobile → `navigator.share()` natif (ne résout qu'en cas de partage réel)
     - Desktop → `window.open()` + polling `popup.closed` avec durée minimale d'ouverture (`MIN_SHARE_DWELL_MS = 3500ms`)
     - Popup bloqué → fallback via `document.visibilitychange` avec même dwell
     - Copy-link → dwell `MIN_COPY_DWELL_MS = 5000ms` + bouton de confirmation manuelle "J'ai partagé le lien"
   - Déverrouillage bonus = application du `sio_share_tag_name` + incrément `shares_count`
   - Option "Continuer sans bonus" laisse passer au résultat sans tag ni bonus
5. **Résultat** — titre, description rich-text, insight rich-text ("Prise de conscience"), projection rich-text ("Et si…"), CTA spécifique du résultat OU fallback sur le CTA par défaut du quiz
6. **Footer** — logo de marque (ou Tiquiz par défaut) + éventuels `custom_footer_text` / `custom_footer_url`

**Branding runtime** : injection dynamique de la Google Font choisie, application des couleurs (`brand_color_primary` / `brand_color_background`) sur tout le parcours.

**Multilingue public :** 8 variantes de traduction dans `PublicQuizClient` (`fr`, `fr_vous`, `en`, `es`, `it`, `de`, `pt`, `ar`). La variante `fr_vous` est sélectionnée automatiquement si `address_form === "vous"`. Les locales `de` et `pt` ne concernent que le quiz public — l'UI admin reste en 5 langues (cf. §6).

**Tracking funnel :** `increment_quiz_counter(quiz_id, counter_name)` pour `views` (page load), `starts` (clic Commencer), `completions` (soumission lead), `shares` (partage validé).

### 3.5. Paramètres (/settings)

- **Profil** : nom, prénom
- **Langue** : sélection locale UI (stocké cookie `ui_locale` + DB)
- **Forme d'adresse** par défaut : tu/vous (utilisée en fallback quand un quiz ne surcharge pas sa propre forme)
- **URL Privacy** : lien politique de confidentialité par défaut
- **Branding global** : police Google (whitelist), couleur principale, logo uploadé (bucket Supabase `public-assets`) — utilisés par défaut sur tous les nouveaux quiz
- **Clé API Systeme.io** : clé personnelle pour sync leads (`sio_user_api_key`) + label (`sio_api_key_name`)

### 3.6. Mes quiz (/quizzes)

Liste dédiée de tous les quiz de l'utilisateur avec actions rapides : copier le lien public, éditer, activer / archiver, supprimer. Alternative plus focalisée au dashboard.

### 3.7. Mes leads (/leads)

Vue agrégée de toutes les leads capturées, tous quiz confondus. Colonnes : email, prénom, nom, téléphone, pays, résultat, quiz source, date, statut share, statut bonus. Action : forcer une resync Systeme.io via `POST /api/leads`.

### 3.8. Statistiques (/stats)

Analytics agrégés : funnel global, conversion par quiz, comparaison des taux (vues → starts → completions → shares).

### 3.9. Admin (/admin)

Back-office minimaliste réservé aux emails whitelistés (`lib/adminEmails.ts`). Permet de lister les utilisateurs, ajuster leur plan, créer un utilisateur. Utilise `supabaseAdmin` (service role) côté serveur via `/api/admin/users`.

---

## 4. INTÉGRATION SYSTEME.IO

### 4.1. Clé API utilisateur

- Chaque utilisateur configure sa propre clé API SIO dans /settings
- Stockée dans `profiles.sio_user_api_key`
- Non-bloquant : si pas de clé, les fonctionnalités SIO dégradent gracieusement

### 4.2. Auto-tagging à la soumission de lead

Quand un lead soumet le quiz, l'API `POST /api/quiz/[quizId]/public` effectue en fire-and-forget :

1. Trouve/crée le contact SIO par email (enrichit avec prénom, nom, téléphone, pays si fournis)
2. Applique le **tag capture** (`quizzes.sio_capture_tag`) à chaque lead, tous résultats confondus
3. Applique le **tag résultat** (`quiz_results.sio_tag_name`) correspondant au profil obtenu
4. Applique les **answer tags** — chaque option répondue peut porter un `sio_tag_name` (configuré dans `options[i].sio_tag_name`), tous sont appliqués
5. Met à jour le champ personnalisé `tiquiz_result` avec le titre du résultat
6. Optionnellement inscrit dans une formation (`quiz_results.sio_course_id`)
7. Optionnellement ajoute à une communauté (`quiz_results.sio_community_id`)

### 4.3. Share tag

Quand un lead valide un partage (anti-triche passé : navigator.share / popup dwell / copy-confirm), l'API `PATCH /api/quiz/[quizId]/public` applique `quizzes.sio_share_tag_name` au contact, déclenchant l'automation de bonus côté Systeme.io. Le lead est marqué `has_shared = true` et `bonus_unlocked = true`.

### 4.4. Webhooks entrants (mis à jour juin 2026)

**Webhook ventes (`/api/systeme-io/webhook?secret=XXX`) :**

- Événements : `NEW_SALE` (alias `ORDER_NEW`), `SALE_CANCELED`
- `NEW_SALE` :
  1. Inférence du plan via `lib/sio/webhookInference.ts` : URL d'abord (source de vérité), `offer-price-id` en fallback (tous les nouveaux bons partagent `offerprice-dc9c3e75` — voir §5.3)
  2. Crée le compte Supabase (si nouveau) + envoie magic link
  3. Upsert `profiles.plan = nouveau`
  4. **Auto-cancel des anciens subs SIO** du même user via `cancelSubscription("Now")` (anti double-facturation)
  5. Pose `profiles.expected_sio_cancel_until = NOW() + 24h`
- `SALE_CANCELED` :
  - Si `profiles.expected_sio_cancel_until` est dans le futur → **ignoré** (c'est le cancel attendu de l'ancien sub suite à un upgrade en 1 clic, on ne touche pas au plan)
  - Sinon : downgrade selon règles (jamais downgrade `lifetime`, etc.)
- Module `lib/sio/webhookInference.ts` : module pur, testable, 28 cas couverts par `npm run test:webhook` (sans toucher la DB)
- Endpoint admin `POST /api/admin/webhook-dry-run` (header `X-Dry-Run-Secret = SYSTEME_IO_WEBHOOK_SECRET`) pour rejouer un payload SIO sans toucher la DB — utilisé pour reproduire les cas terrain

**Webhook optin gratuit (`/api/systeme-io/free-optin?secret=XXX`) :**

- Crée compte en plan "free" + envoie magic link
- Ne downgrade jamais un utilisateur payant

**Migrations associées :**

- `20260608_plan_plus_check.sql` — étend `profiles_plan_check` pour accepter `monthly_plus | yearly_plus | beta` (avant : `free | monthly | yearly | lifetime` uniquement)
- `20260609_profiles_expected_sio_cancel.sql` — `ALTER TABLE profiles ADD COLUMN expected_sio_cancel_until TIMESTAMPTZ`

### 4.5. Client API SIO

- `lib/sio/userApiClient.ts` : client générique `sioUserRequest()`
- Gestion tags, contacts, formations, communautés
- Retry logic (gère les 422 race conditions)
- Rate limiting (200ms entre les requêtes)

---

## 4bis. MULTIPROFILS (juin 2026)

### 4bis.1. Modèle de données

**Nouvelle table `projects`** (1 row par projet, ≥ 1 par user) :

```sql
projects (
  id          uuid PK default gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  accent_color text,         -- palette 10 couleurs (lib/projects/visualIdentity.ts)
  icon_emoji  text,          -- palette 20 emojis (lib/projects/visualIdentity.ts)
  use_branding_logo boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
-- Index partiel : 1 seul projet par défaut par user
CREATE UNIQUE INDEX projects_one_default_per_user
  ON projects (user_id) WHERE is_default = true;
```

**Colonne `project_id UUID NULL` ajoutée sur** :

- `quizzes`
- `popquizzes`
- `business_events`
- `user_milestones`

FK `ON DELETE SET NULL` — préserve les contenus en ligne quand un projet est supprimé (le quiz repasse sur le projet par défaut sans casser son URL publique).

**`business_profiles`** : devient per `(user_id, project_id)` (UNIQUE composite). Porte désormais tout le branding **et** le positionnement **et** les défauts pixel :

- Branding : `brand_logo_url`, `brand_color_primary`, `brand_color_accent`, `brand_font`, `brand_website_url`, `saved_palettes`
- Positionnement : `brand_tone`, `target_audience`
- Pixels defaults : `default_meta_pixel_id`, `default_ga4_measurement_id`, `default_google_ads_conversion_id`, `default_google_ads_conversion_label`, `default_meta_capi_token`
- Partage : `default_share_domain`, `share_site_name`

**`sio_api_keys`** étendu :

- Nouvelle colonne `project_id`
- `UNIQUE(user_id, project_id, name)`
- Index partiel "1 default par (user, project) WHERE is_default=true"

### 4bis.2. Sémantique critique (Béné 2 juin 2026)

> « Comme sur Tipote — nouveau projet = nouveau compte. Stats à zéro, nouveau branding, nouveau positionnement, etc. Les comptes secondaires ne doivent PAS hériter des réglages des autres comptes. Profil normal VIDE. »

- Settings UI pour un projet multiprofils → **override TOTAL** des champs branding (compte secondaire = vide à customiser)
- Viewer public (`/q/`, `/p/`) → override **NON-NULL** uniquement via `mergeOwnerBranding` (filet de sécurité, un quiz en ligne ne doit jamais perdre son branding visuellement même si le projet associé est vide)

### 4bis.3. Cookie & session

- Cookie : `tiquiz_active_project` (httpOnly=false pour lecture client + parité avec `tipote_active_project`)
- `SessionResetGate` : force le cookie sur le projet `is_default = true` à chaque nouvelle session navigateur (filet anti-erreur — pas de "je me suis trompé de projet hier soir et je travaille dessus sans m'en rendre compte ce matin")

### 4bis.4. UI

- `ProjectSwitcher` dans le header — dropdown avec identité visuelle (`accent_color` + `icon_emoji`)
- `ProjectIdentityBadge` (affichage compact) + `ProjectIdentityEditor` (Dialog "Modifier")
- Palettes : 10 couleurs d'accent + 20 emojis (`lib/projects/visualIdentity.ts`)
- Danger-zone delete : recopie obligatoire du nom du projet

### 4bis.5. API

| Route | Méthode | Description |
|:------|:--------|:------------|
| `/api/projects` | GET | Liste les projets de l'user |
| `/api/projects` | POST | Crée un projet |
| `/api/projects/[projectId]` | PATCH | Rename + visual identity (couleur + emoji) |
| `/api/projects/[projectId]` | DELETE | Supprime (les contenus en ligne passent en projet par défaut) |
| `/api/projects/active` | GET | Renvoie le projet actif (cookie) |
| `/api/projects/active` | POST | Switch projet actif |

### 4bis.6. Helpers

`lib/projects/` :

- `client.ts` — appels API depuis le client
- `activeProject.ts` — lecture/écriture du cookie côté serveur
- `ensureDefaultProject.ts` — garantit qu'un user a toujours au moins 1 projet `is_default`
- `upsertByProject.ts` — patterns d'upsert scopé par projet
- `visualIdentity.ts` — palettes (10 couleurs + 20 emojis)
- `businessProfile.ts` — lecture/écriture du business_profile per (user, project)
- `scopeFilter.ts` — `getActiveProjectScope(userId, email)` : retourne le projet actif gate par `canUseMultiProjects(plan)`. Free/monthly/yearly = comportement legacy (pas de filtrage). Premium = isolation stricte par projet
- `queries.ts` — helpers query Supabase project-aware

### 4bis.7. Gates plan

Seuls les paliers premium débloquent l'isolation multiprofils (cf. §5.2). Les paliers non-premium voient toujours **tous** leurs contenus comme avant (rétrocompat 100%).

### 4bis.8. Diagnostic & smoke

- `npm run diag:multiprofils` — 11 invariants DB :
  - Tous les users ont au moins 1 projet
  - Exactement 1 `is_default = true` par user
  - Tout `quiz.project_id` pointe sur un projet du même user
  - `sio_api_keys` UNIQUE par `(user, project, name)`
  - … (cf. script pour la liste complète)
- `npm run smoke:multiprofils` — 11 tests E2E workflow Settings → isolation projets
- `npm run check:schema` — détecte les migrations en retard (9 migrations multiprofils vérifiées)

---

## 5. MONÉTISATION (mis à jour juin 2026)

### 5.1. Plans

Valeur `profiles.plan` ∈ `{ free, monthly, yearly, monthly_plus, yearly_plus, lifetime, beta }` (CHECK constraint étendu par `20260608_plan_plus_check.sql`).

| Plan | Prix | Quiz / sondages / popquiz | Réponses visibles | Clés SIO | Multiprofils | Analyse IA |
|:-----|:-----|:--------------------------|:------------------|:---------|:-------------|:-----------|
| `free` | 0€ | 1 max chaque | 10/mois (auto-reset 30j) | 1 max | ✗ | ✗ |
| `monthly` | 9€/mois | illimité | illimité | **1 max** | ✗ | ✗ |
| `yearly` | 90€/an | illimité | illimité | **1 max** | ✗ | ✗ |
| `monthly_plus` | **29€/mois** | illimité | illimité | illimité | ✓ | ✓ |
| `yearly_plus` | **290€/an** | illimité | illimité | illimité | ✓ | ✓ |
| `lifetime` | 57€ (offre fermée) | illimité | illimité | illimité | ✓ | ✓ |
| `beta` | accordé manuellement | illimité | illimité | illimité | ✓ | ✓ |

### 5.2. Source de vérité prix (code)

- `lib/planLimits.ts:PRICING_PLUS` — prix affichables (UI Settings → Abonnement, upsells)
- `lib/planLimits.ts:isPremiumPlan(plan)` → `true` pour `beta | lifetime | monthly_plus | yearly_plus`
- `lib/planLimits.ts:canUseMultiProjects(plan)` → équivalent à `isPremiumPlan()`
- `lib/planLimits.ts:canUseAIAnalysis(plan)` → idem (anciennement `canUseSurveyAI`, alias conservé pour rétrocompat)
- `lib/planLimits.ts:canConnectMultipleSioKeys(plan)` → équivalent à `isPremiumPlan()`
- `lib/planLimits.ts:shouldShowPlusUpsell(plan)` → `true` pour `monthly | yearly` (affichage CTA upgrade dans l'UI)

### 5.3. Bons de commande Systeme.io

Tous les bons partagent désormais le même `offer-price-id` (`offerprice-dc9c3e75`) → matching par URL obligatoire :

| URL Systeme.io | Plan cible |
|:---|:---|
| `tipote.fr/tiquiz-gratuit` | `free` |
| `tipote.fr/tiquiz-mensuel` | `monthly` |
| `tipote.fr/tiquiz-annuel` | `yearly` |
| `tipote.fr/tiquiz-mensuel-plus` | `monthly_plus` |
| `tipote.fr/tiquiz-annuel-plus` | `yearly_plus` |

Logique d'inférence dans `lib/sio/webhookInference.ts` (module pur, testable, 28 cas couverts par `npm run test:webhook`) :

1. URL d'abord (source de vérité depuis juin 2026)
2. `offer-price-id` en fallback (anciens bons numériques uniques)

### 5.4. Switch d'abonnement en 1 clic

Depuis Settings → Abonnement, l'utilisateur clique le plan cible → checkout SIO. À réception du `ORDER_NEW` :

1. `profiles.plan = nouveau plan`
2. Auto-cancel des anciens subs SIO du même user via `cancelSubscription("Now")`
3. `profiles.expected_sio_cancel_until = NOW() + 24h` (migration `20260609_profiles_expected_sio_cancel.sql`)
4. Le `SALE_CANCELED` de l'ancien sub arrive plus tard → **ignoré** tant que `expected_sio_cancel_until` est dans le futur (anti double-downgrade)

Tous les sens couverts : free → +, monthly → +, monthly+ → yearly+, downgrade. Pas de double-facturation. Pas de chevauchement.

### 5.5. Quota free

- RPC `increment_response_count()` : incrémente le compteur + vérifie la limite
- RPC `reset_monthly_responses()` : reset admin
- Auto-reset après 30 jours via `responses_reset_at`
- Le plan free est limité à 1 quiz (enforced côté API POST /api/quiz)

---

## 6. INTERNATIONALISATION (i18n)

### 6.1. Architecture

- Bibliothèque : `next-intl` (server + client)
- Locale stockée dans cookie `ui_locale` (set par middleware au premier visit)
- Fallback : Accept-Language header → défaut français
- Support RTL pour l'arabe

### 6.2. UI admin — 5 langues

Fichiers de traduction utilisés pour toute l'interface de création/administration :

- `messages/fr.json` (français)
- `messages/en.json` (anglais)
- `messages/es.json` (espagnol)
- `messages/it.json` (italien)
- `messages/ar.json` (arabe)

### 6.3. Quiz public — 8 variantes

Les textes du parcours public (boutons, placeholders, messages d'erreur, prompts de partage, fallback résultats…) sont gérés **hors `next-intl`** dans `PublicQuizClient.tsx`. Ils couvrent 8 variantes :

- `fr` (tutoiement par défaut)
- `fr_vous` (vouvoiement — sélectionné auto si `quizzes.address_form === "vous"`)
- `en`, `es`, `it`, `de`, `pt`, `ar`

La forme d'adresse tu/vous est gérée par quiz (colonne `quizzes.address_form`), avec fallback sur la préférence profil.

### 6.4. Clés traduites

Navigation, formulaires auth, quiz builder, dashboard, settings, interface quiz publique (8 variantes), erreurs, notifications, didacticiel.

---

## 7. INTERCONNEXIONS DES DONNÉES

### 7.1. Matrice des déclencheurs

| Événement | Déclenche | Mécanisme |
|:----------|:----------|:----------|
| Vente SIO (webhook) | Création compte + profil + magic link | Webhook receiver |
| Annulation SIO (webhook) | Downgrade vers free (sauf lifetime) | Webhook receiver |
| Optin gratuit SIO (webhook) | Création compte free + magic link | Webhook receiver |
| Lead soumis (quiz public) | Insert quiz_leads + sync SIO (tag + contact + formation + communauté) | Fire-and-forget async |
| Share (quiz public) | Incrémente shares_count + bonus unlocked + tag SIO share | PATCH API |
| Quiz créé | Vérification quota plan free (max 1 quiz) | API guard |
| Réponse capturée | Incrémente responses_used_this_month + vérification quota | RPC atomique |

### 7.2. Flux de données

```
Systeme.io (webhook vente/optin) → Supabase Auth + profiles
    → Login (magic link) → Dashboard
        → Créer quiz (manuel ou IA) → Quiz public
            → Lead soumis → quiz_leads + Systeme.io (tag + contact + formation + communauté)
            → Share → quiz_leads.has_shared + Systeme.io (share tag)
```

---

## 8. ARCHITECTURE TECHNIQUE

### 8.1. Stack

| Composant | Technologie |
|:----------|:-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + shadcn/ui (Radix) |
| Styling | TailwindCSS v4 |
| State | Zustand 5 |
| Forms | React Hook Form + Zod |
| Backend | API Routes Next.js |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (PKCE + cookies) |
| IA | Anthropic Claude (Sonnet 4) |
| i18n | next-intl (5 langues) |
| Icons | lucide-react |
| Notifications | sonner (toast) |
| CRM / Paiement | Systeme.io (API + webhooks) |
| Hosting | Hostinger VPS (Ubuntu 24.04) |
| Process Manager | PM2 |
| DNS/CDN | Cloudflare |
| Domaine | quiz.tipote.com |

### 8.2. Tables Supabase

**Profil :**

- `profiles` — user_id, email, full_name, first_name, last_name, ui_locale, address_form, privacy_url, sio_user_api_key, sio_api_key_name, plan (∈ `free | monthly | yearly | monthly_plus | yearly_plus | lifetime | beta`), product_id, sio_contact_id, responses_used_this_month, responses_reset_at, **brand_font, brand_color_primary, brand_logo_url** (branding par défaut utilisé en fallback par les quiz), **expected_sio_cancel_until** (juin 2026, anti double-downgrade lors d'un upgrade 1-clic, cf. §4.4)

**Multiprofils (juin 2026) — cf. §4bis pour le détail :**

- `projects` — id, user_id, name, is_default (unique partial index), accent_color, icon_emoji, use_branding_logo, created_at
- `business_profiles` — UNIQUE`(user_id, project_id)` ; porte branding (brand_logo_url, brand_color_primary/accent, brand_font, brand_website_url, saved_palettes) + positionnement (brand_tone, target_audience) + pixels defaults (default_meta_pixel_id, default_ga4_measurement_id, default_google_ads_conversion_id/label, default_meta_capi_token) + partage (default_share_domain, share_site_name)
- `sio_api_keys` — étendu avec project_id, UNIQUE(user_id, project_id, name), 1 default par (user, project) WHERE is_default=true
- Colonne `project_id UUID NULL` (FK `ON DELETE SET NULL`) sur `quizzes`, `popquizzes`, `business_events`, `user_milestones`

**Quiz :**

- `quizzes` — colonnes principales :
  - Identité : `user_id`, `title`, `slug` (unique, case-insensitive), `introduction` (HTML rich-text), `locale`, `address_form` (tu/vous par quiz, override du profil), `status` (draft/active)
  - Capture : `capture_heading`, `capture_subtitle`, `capture_first_name`, `capture_last_name`, `capture_phone`, `capture_country`
  - Parcours : `start_button_text`
  - CTA par défaut : `cta_text`, `cta_url`
  - Privacy / footer : `privacy_url`, `consent_text`, `custom_footer_text`, `custom_footer_url`
  - Viralité : `virality_enabled`, `bonus_description`, `bonus_image_url`, `share_message`, `share_networks` (JSONB enum filtré), `sio_share_tag_name`
  - Systeme.io : `sio_capture_tag` (appliqué à la soumission du lead, distinct du share tag)
  - SEO / OG : `og_image_url`, `og_description`
  - Branding par quiz (override du profil) : `brand_font`, `brand_color_primary`, `brand_color_background`
  - Analytics : `views_count`, `starts_count`, `completions_count`, `shares_count`
- `quiz_questions` — `quiz_id`, `question_text`, `options` (JSONB : `[{ text, result_index, sio_tag_name? }]` — chaque option peut porter son propre tag SIO), `sort_order`
- `quiz_results` — `quiz_id`, `title`, `description` (rich-text), `insight` (rich-text), `projection` (rich-text), `cta_text`, `cta_url`, `sio_tag_name`, `sio_course_id`, `sio_community_id`, `sort_order`
- `quiz_leads` — `quiz_id`, `email`, `first_name`, `last_name`, `phone`, `country`, `result_id`, `consent_given`, `has_shared`, `bonus_unlocked`, `answers` (JSONB), `created_at`, unique(quiz_id, email)

**Logs :**

- `webhook_logs` — `source`, `event_type`, `payload` (JSONB), `received_at`

**Storage :**

- Bucket Supabase `public-assets` (public-read, écriture authentifiée sous le préfixe `{user_id}/...`) utilisé pour logos de marque, images OG, visuels de bonus. Chemins typiques : `bonus/{user_id}/{quiz_id}-{timestamp}.{ext}`, `logos/{user_id}/...`.

**RLS :** Toutes les tables utilisent Row Level Security. Users gèrent leurs propres données. Accès public aux quiz actifs via API.

**Fonctions RPC :**

- `increment_quiz_counter(quiz_id, counter_name)` — Incrémentation atomique des compteurs
- `increment_response_count(user_id)` — Vérification + incrémentation quota free
- `reset_monthly_responses(user_id)` — Reset admin du quota

### 8.3. Routes API

| Route | Méthode | Auth | Description |
|:------|:--------|:-----|:-----------|
| `/api/quiz` | GET | oui | Liste les quiz de l'utilisateur |
| `/api/quiz` | POST | oui | Crée un quiz (vérifie quota free) |
| `/api/quiz/[quizId]` | GET | oui | Détail quiz + questions + résultats + leads |
| `/api/quiz/[quizId]` | PATCH | oui | Met à jour un quiz (slug, branding, capture, viralité, questions, résultats, etc. + sanitisation rich-text serveur) |
| `/api/quiz/[quizId]` | DELETE | oui | Supprime un quiz (cascade) |
| `/api/quiz/generate` | POST | oui | Génération IA quiz complète (streaming SSE) |
| `/api/quiz/idea-chat` | POST | oui | Brainstorm IA conversationnel (Claude Haiku, max 6 tours utilisateur) |
| `/api/quiz/[quizId]/track` | POST | non | Tracking funnel (start, complete) |
| `/api/quiz/[quizId]/public` | GET | non | Récupère quiz actif (données publiques) — résout UUID ou slug |
| `/api/quiz/[quizId]/public` | POST | non | Soumet un lead + sync SIO (tag capture + result tag + course + community) |
| `/api/quiz/[quizId]/public` | PATCH | non | Enregistre un share validé + tag SIO share |
| `/api/quiz/[quizId]/sync-systeme` | POST | oui | Bulk sync leads vers SIO |
| `/api/leads` | GET | oui | Liste toutes les leads de l'utilisateur (tous quiz confondus) |
| `/api/leads` | POST | oui | Force la resync d'une lead vers SIO |
| `/api/profile` | GET | oui | Récupère le profil utilisateur |
| `/api/profile` | PATCH | oui | Met à jour le profil (branding, SIO, privacy, etc.) |
| `/api/systeme-io/webhook` | POST | secret | Webhook ventes SIO |
| `/api/systeme-io/free-optin` | POST | secret | Webhook optin gratuit SIO |
| `/api/systeme-io/tags` | GET | oui | Liste les tags SIO de l'utilisateur (pour le picker) |
| `/api/settings/ui-locale` | POST | oui | Change la langue UI |
| `/api/admin/users` | GET/POST/PATCH | admin | Liste/crée/met à jour les utilisateurs (emails whitelistés) |
| `/api/admin/webhook-dry-run` | POST | secret | Rejoue un payload SIO sans toucher la DB (header `X-Dry-Run-Secret`) |
| `/api/projects` | GET / POST | oui | Liste / crée un projet multiprofils (juin 2026) |
| `/api/projects/[projectId]` | PATCH / DELETE | oui | Rename + visual identity / supprime |
| `/api/projects/active` | GET / POST | oui | Lit / switch le projet actif (cookie `tiquiz_active_project`) |
| `/api/profile/share-domain` | GET / PATCH | oui | Préférence domaine de partage par défaut (per user, persisté DB) |
| `/api/quiz/[id]/analytics` | GET | oui | Funnel par quiz — depuis juin 2026, recompte `viewsCount`/`completionsCount` directement depuis `quiz_events` avec garde-fou `viewsCount = max(events.view, leadsCount)` (fix bug Gwenn 794%) |

### 8.4. IA et prompts

**Génération quiz complète** (`/api/quiz/generate`)

- Fichier : `lib/prompts/quiz/system.ts`
- Provider : Claude Anthropic (modèle via env `ANTHROPIC_MODEL`, ex. Sonnet 4)
- Mode : streaming SSE (chunks JSON remplis en temps réel dans le formulaire)
- Paramètres : objectif, audience, ton, CTA, bonus, langue, nombre questions/résultats, forme d'adresse
- Output : quiz complet structuré (titre, intro, questions + options, résultats + insight/projection/CTA)

**Brainstorm IA** (`/api/quiz/idea-chat`)

- Fichier : `lib/prompts/quiz/chat.ts`
- Provider : Claude Haiku (env `ANTHROPIC_CHAT_MODEL`, défaut `claude-haiku-4-5-20251001`) — choix économique et rapide
- Mode : conversation structurée, max **6 tours utilisateur**, qui aboutit à un brief structuré consommé ensuite par le générateur principal
- Usage : cadrer une idée floue ("Pas d'idée ?") avant la génération

**Sanitisation rich-text**

- `lib/richText.ts` : `sanitizeRichText(html)` appliqué côté client (éditeur) et serveur (API PATCH quiz, route `/api/quiz/[quizId]`) sur `introduction`, `results.description`, `results.insight`, `results.projection`.

**Centralisation des appels Claude (juin 2026)**

- Source unique : `lib/claudeRequest.ts:buildClaudeMessageBody()` — toutes les routes IA passent par ce helper.
- Hotfix Opus 4.7+ (1er juin 2026) : Anthropic a retiré les sampling params (`temperature`, `top_p`, `top_k`) sur Opus 4.7 / 4.8. Le helper les omet quand le modèle cible est Opus ≥ 4.7. Sinon ils sont passés normalement (Haiku, Sonnet).
- Tier Opus bumpé 4.7 → 4.8 dans `lib/anthropicModel.ts`.

**Analyse IA des résultats (juin 2026 — paliers + uniquement)**

- Helper `lib/survey/analysis.ts` — synthèse Claude des réponses agrégées.
- Renommage `canUseSurveyAI` → `canUseAIAnalysis` car couvre désormais quiz ET sondages (Béné 2 juin : "Analyse IA c'est pour les sondages ET les quiz"). Alias rétrocompat conservé.
- Pas encore branché côté quiz (roadmap) — déjà actif côté sondage.

### 8.5. Système de didacticiel interactif

Tour guidé en **7 étapes** (+ welcome + completion), inspiré du système Tipote mais adapté aux fonctionnalités Tiquiz.

**Architecture :**

- `hooks/useTutorial.ts` — Gestion d'état Context + localStorage (persistance par user)
- `components/tutorial/WelcomeModal.tsx` — Modal d'accueil avec présentation des 4 piliers
- `components/tutorial/TourCompleteModal.tsx` — Modal de fin avec actions clés à faire
- `components/tutorial/TutorialSpotlight.tsx` — Spotlight positionné (tooltip + ring autour de l'élément)
- `components/tutorial/TutorialOverlay.tsx` — Overlay semi-transparent + rendu des modales
- `components/tutorial/HelpButton.tsx` — Bouton flottant pour relancer le tour
- `components/tutorial/TutorialNudge.tsx` — Nudge dans la sidebar pour inviter au tour

**Phases du tour :**

| Phase | Élément | URL cible | Description |
|:------|:--------|:----------|:------------|
| `welcome` | — | — | Modal d'accueil avec 4 étapes visuelles |
| `tour_dashboard` | `dashboard` | `/dashboard` | Tableau de bord : stats, liste quiz |
| `tour_create` | `create` | `/quiz/new` | Créer un quiz : manuel ou IA |
| `tour_quizzes` | `quizzes` | `/quizzes` | Mes quiz : gérer, activer, partager |
| `tour_leads` | `leads` | `/leads` | Mes leads : contacts capturés |
| `tour_stats` | `stats` | `/stats` | Statistiques : performances des quiz |
| `tour_settings` | `settings` | `/settings` | Paramètres : langue, SIO, privacy |
| `tour_complete` | — | `/dashboard` | Modal de fin + actions clés |
| `completed` | — | — | Tour terminé |

**Comportement :**

- Fenêtre de 7 jours après première visite (FIRST_DAYS_WINDOW = 7)
- "Plus tard" = non-définitif (le tour revient à la prochaine visite dans la fenêtre)
- "Ne plus me montrer" = opt-out permanent (done=true, optOut=true)
- Reset possible via HelpButton (bouton flottant bas gauche)
- Step counter affiché dans le spotlight (ex: "3 / 7")
- Smart positioning des tooltips (top/bottom/left/right + clamp viewport)
- Support mobile : repositionnement auto des tooltips
- Traduction complète via `next-intl` (namespace `tutorial`, 5 langues)
- localStorage keys : `tiquiz_tutorial_{phase|optout|done|first_seen_at}_v1_{userId}`

**Gradient Tiquiz :** Les modales utilisent le gradient primaire Tiquiz (blue → turquoise, 135°).

**Modal Welcome (4 piliers) :**

1. Créer ton premier quiz (Sparkles)
2. Capturer des leads qualifiés (Users)
3. Connecter Systeme.io (Link)
4. Partager et faire grandir ta liste (Share2)

**Modal Completion (actions clés) :**

1. Crée ton premier quiz pour tester
2. Configure ta clé API Systeme.io
3. Partage le lien public de ton quiz

### 8.6. Centre d'aide (mutualisé avec Tipote)

Le support est **mutualisé** avec Tipote. Le bouton "Aide" dans la sidebar de Tiquiz redirige vers le centre d'aide Tipote, section Tiquiz (`https://app.tipote.com/support/tiquiz`).

**Contenu Tiquiz dans le support Tipote :**
- Catégorie dédiée "Tiquiz — Quiz & Leads"
- 6 articles multilingues (FR/EN/ES/IT/AR) :
  1. Qu'est-ce que Tiquiz ?
  2. Créer un quiz (manuel ou IA)
  3. Capturer et gérer les leads
  4. Connecter Systeme.io
  5. Activer la viralité (bonus de partage)
  6. Plans et tarifs Tiquiz
- Chatbot IA + système de tickets partagés avec Tipote
- Pas de duplication : un seul centre d'aide, un seul système de tickets

---

## 8bis. TEMPLATES, ONBOARDING & OUTILLAGE (juin 2026)

### 8bis.1. Catalogue de templates

`lib/templates/catalog.ts` — **15 templates** (vs 8 avant juin 2026), format constant : 6 questions × 4 options + 4 résultats, ton chaleureux, tutoiement, pas de jargon coach.

| Slug | Métier | Emoji |
|:---|:---|:---:|
| croyance-limitante | coach mindset | 🧠 |
| rapport-nourriture | coach nutrition | 🥗 |
| fuites-energie | coach sommeil & énergie | ⚡ |
| style-parental | coach parentalité | 👨‍👩‍👧 |
| schema-amoureux | coach couple | 💞 |
| blocage-reconversion | coach reconversion | 🚪 |
| rapport-argent | coach finance | 💸 |
| profil-entrepreneur | (historique) | — |
| moteur-interieur | (historique) | — |
| style-yoga | (historique) | — |
| terrain-naturo | (historique) | — |
| pret-a-lancer-formation | (historique) | — |
| levier-croissance-marketing | (historique) | — |
| style-photo | (historique) | — |
| pret-premier-achat-immo | (historique) | — |

### 8bis.2. Auto-instanciation post-signup

Composant `components/dashboard/FirstQuizOnboarding.tsx` :

- Affiché dans le dashboard quand `quizzes.length === 0`
- 6 templates phares en cartes (emoji + titre + métier + tagline)
- 1 clic → `POST /api/quiz` avec le payload du template → redirect vers `/quiz/[id]` dans l'éditeur
- Fallbacks : « Voir les 15 modèles » (`/templates`), « Partir de zéro » (`/quiz/new`)

Effet mesurable : passage de "signup → éditeur vide intimidant" à "signup → quiz prêt à publier en 10 secondes".

### 8bis.3. KPI cards cliquables dans `/leads`

Les 4 cards en haut de la page leads (Non synchronisés / Synchronisés SIO / Ce mois / Total) sont désormais cliquables — chaque clic filtre la liste sur le critère. 2e clic enlève le filtre. Ring colorée quand le filtre est actif.

### 8bis.4. Scripts npm (outillage défensif)

| Script | Rôle |
|:---|:---|
| `npm run check:schema` | Détecte les migrations en retard (9 migrations multiprofils vérifiées) |
| `npm run diag:multiprofils` | 11 invariants DB (au moins 1 projet par user, exactement 1 is_default par user, `quiz.project_id` pointe sur projet du même user, `sio_api_keys` UNIQUE par (user, project, name), etc.) |
| `npm run smoke:multiprofils` | 11 tests E2E workflow Settings → isolation projets |
| `npm run test:webhook` | 28 cas de routing webhook SIO (sans payer 1€) |
| `npm run test:e2e` | Playwright sur `/q/`, `/p/`, `/pq/` |
| `npm run smoke` | Smoke routes publiques legacy bash |

### 8bis.5. CI GitHub Actions

- `.github/workflows/ci.yml` : à chaque push → `tsc --noEmit` + `npm run build` + smoke syntax des scripts
- `.github/workflows/e2e.yml` : Playwright en schedule daily 3h UTC + `workflow_dispatch`
- Variables GitHub non-secrets : `SMOKE_QUIZ_ID`, `SMOKE_POPQUIZ_ID`, `SMOKE_PAGE_SLUG`, `BASE_URL`

### 8bis.6. Hotfix build prod Playwright (2 juin 2026)

`tsconfig.json` exclut désormais `playwright.config.ts` + `tests/e2e/**`. Sinon `@playwright/test` (non installé en prod) faisait planter `npm run build`. La CI lance maintenant `npm run build` complet (filet anti-régression).

---

## 9. SÉCURITÉ

- Auth Supabase PKCE avec cookies httpOnly
- RLS sur toutes les tables
- Middleware protection des routes `/dashboard`, `/quiz`, `/settings`
- Fail-open sur erreurs Supabase (ne jamais bloquer)
- Webhooks SIO protégés par secret en query string
- Validation Zod sur tous les formulaires
- `emailRedirectTo` dynamique via `NEXT_PUBLIC_APP_URL`

---

## 10. VARIABLES D'ENVIRONNEMENT

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Application
NEXT_PUBLIC_APP_URL=https://quiz.tipote.com

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Systeme.io Webhooks
SYSTEME_IO_WEBHOOK_SECRET=xxx
SYSTEME_IO_FREE_WEBHOOK_SECRET=xxx
```

---

## 11. DÉPLOIEMENT

- **Serveur** : Hostinger VPS Ubuntu 24.04 (IP: 82.25.115.166)
- **Process** : PM2 (`tiquiz-prod`) sur port 3001
- **Reverse proxy** : Nginx (virtual host `quiz.tipote.com` → localhost:3001)
- **DNS** : Cloudflare (même compte que tipote.com)
- **SSL** : Cloudflare Full (Strict)
- **Build** : `npm run build` (output standalone)

**Script de déploiement :**

```bash
cd /home/tipote/tiquiz-app
git stash
git pull origin main
npm ci
npm run build
pm2 restart tiquiz-prod --update-env
```

---

## 12. ÉTAT ACTUEL ET ROADMAP

### Implémenté ✅

- Auth complète (password + magic link + webhooks SIO)
- Quiz engine (création manuelle + génération IA streaming + brainstorm IA conversationnel)
- **Éditeur WYSIWYG live** (sidebar Structure/Design/Paramètres/Partage + preview live mobile/desktop, édition inline, rich-text avec sanitisation client+serveur)
- **Branding par quiz** (police Google, couleurs, logo) avec héritage du profil
- **Slug personnalisé** (`/q/{slug}`) + OG image/description + footer custom
- **Answer tags** (tag SIO par option de question)
- **Étape bonus anti-triche** entre capture et résultats (navigator.share / popup polling / copy-link dwell + confirmation), visuel du bonus, sélecteur de réseaux
- Quiz public avec funnel complet (8 variantes de traduction publique)
- Capture de leads configurable + tag SIO capture distinct du share
- Intégration Systeme.io (tags, formations, communautés, contacts) + picker de tags
- Monétisation freemium (plans + quotas)
- UI en 5 langues + RTL
- Dashboard + pages dédiées `/quizzes`, `/leads`, `/stats`
- Settings utilisateur (profil, branding global, SIO, privacy)
- Back-office admin (`/admin` + `/api/admin/users`)
- Storage Supabase (`public-assets`) pour logos, OG, bonus
- Email templates Tiquiz (invite, magic link, reset password, confirm signup)
- **Didacticiel interactif** (tour guidé 7 étapes — inspiré de Tipote, adapté Tiquiz)
- **Centre d'aide** mutualisé avec Tipote (catégorie Tiquiz + chatbot + tickets partagés)
- **Multiprofils** (juin 2026, paliers + uniquement) — 7 phases livrées : table `projects`, scope DB, business_profiles per (user, project), sio_api_keys per project, ProjectSwitcher UI, SessionResetGate, danger-zone delete
- **Paliers premium "+"** (juin 2026) : `monthly_plus` (29€/mois) + `yearly_plus` (290€/an), migration `profiles_plan_check`, helpers gates dans `lib/planLimits.ts`
- **Switch d'abonnement en 1 clic** (juin 2026) — webhook SIO upgrade/downgrade auto, anti double-facturation via `expected_sio_cancel_until`
- **Templates v2** (juin 2026) — 15 modèles métier dans `lib/templates/catalog.ts`
- **Auto-instanciation post-signup** (juin 2026) — `FirstQuizOnboarding.tsx`
- **Analyse IA des résultats** (juin 2026, sondages — quiz en roadmap) — helper `lib/survey/analysis.ts`
- **Fix bug stats Gwenn** (2 juin 2026) — recompute depuis `quiz_events` + garde-fou ratio
- **KPI cards cliquables** dans `/leads` — filtres rapides
- **Outillage défensif** : `check:schema`, `diag:multiprofils`, `smoke:multiprofils`, `test:webhook`, endpoint admin `/api/admin/webhook-dry-run`
- **CI GitHub Actions** : workflow `ci` (typecheck + build + smoke à chaque push) + workflow `e2e` (Playwright daily)
- **Hotfix Opus 4.7+** : centralisation des appels Claude dans `lib/claudeRequest.ts`, omission des sampling params sur Opus ≥ 4.7
- **Hotfix Playwright build prod** : exclusion des fichiers Playwright du `tsconfig.json`

### À faire 🔄

- Import de quiz (CSV/JSON) — onglet placeholder
- Branchement de l'analyse IA côté quiz (déjà actif côté sondage)
- Configuration Nginx pour `quiz.tipote.com` → Tiquiz (port 3001) — héritée du sprint custom-domains, à valider en prod
