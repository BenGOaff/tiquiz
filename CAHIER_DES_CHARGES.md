# CAHIER DES CHARGES Tiquiz — Mise à jour Avril 2026

Application Web SaaS multilingue (FR/EN/ES/IT/AR) de création de quiz interactifs pour capture de leads, avec intégration Systeme.io et génération IA.

**Tiquiz est la version allégée de Tipote**, focalisée uniquement sur les quiz, l'IA et Systeme.io. Pas de coach IA, pas de crédits IA, pas de réseaux sociaux, pas d'automations, pas de pages builder.

---

## 1. PRÉSENTATION DU PRODUIT

### 1.1. Vision

Tiquiz est un outil de création de quiz lead magnets, ultra simple côté utilisateur mais puissant côté backend. L'utilisateur crée un quiz (manuellement ou via IA), le partage, capture des leads et les synchronise automatiquement avec Systeme.io (tags, formations, communautés).

### 1.2. Fonctionnalités clés

- Création de quiz manuellement ou par **génération IA** (Claude Anthropic, streaming SSE)
- **Brainstorm IA conversationnel** (`/api/quiz/idea-chat`, Claude Haiku) pour dégrossir un brief avant génération
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

### 1.3. Ce que Tiquiz N'A PAS (vs Tipote)

- Pas de coach IA
- Pas de crédits IA / consommation
- Pas de réseaux sociaux (OAuth, publication, automations)
- Pas de constructeur de pages
- Pas de contenu (posts, emails, articles, vidéos)
- Pas de stratégie / plan d'action
- Pas de clients / accompagnements
- Pas de widgets (toast, partage social)
- Pas d'analytics avancés
- Pas de templates Systeme.io
- Pas d'admin backoffice
- Pas de notifications
- Pas de pépites

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

### 4.4. Webhooks entrants

**Webhook ventes (`/api/systeme-io/webhook?secret=XXX`) :**

- Événements : `NEW_SALE`, `SALE_CANCELED`
- NEW_SALE : crée compte Supabase + profil avec plan + envoie magic link
- SALE_CANCELED : downgrade vers free (sauf lifetime, jamais downgrade)
- Mapping offer_id → plan (à configurer avec les vrais IDs SIO)

**Webhook optin gratuit (`/api/systeme-io/free-optin?secret=XXX`) :**

- Crée compte en plan "free" + envoie magic link
- Ne downgrade jamais un utilisateur payant

### 4.5. Client API SIO

- `lib/sio/userApiClient.ts` : client générique `sioUserRequest()`
- Gestion tags, contacts, formations, communautés
- Retry logic (gère les 422 race conditions)
- Rate limiting (200ms entre les requêtes)

---

## 5. MONÉTISATION

### 5.1. Plans

| Plan | Prix | Limites |
|:-----|:-----|:--------|
| Free | 0€ | 1 quiz max, 10 réponses/mois (auto-reset 30j) |
| Lifetime | 57€ | Illimité |
| Monthly | 9€/mois | Illimité |
| Yearly | 90€/an | Illimité |

### 5.2. Quota free

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

- `profiles` — user_id, email, full_name, first_name, last_name, ui_locale, address_form, privacy_url, sio_user_api_key, sio_api_key_name, plan, product_id, sio_contact_id, responses_used_this_month, responses_reset_at, **brand_font, brand_color_primary, brand_logo_url** (branding par défaut utilisé en fallback par les quiz)

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

### À faire 🔄

- Import de quiz (CSV/JSON) — onglet placeholder
- Analytics détaillés par quiz (graphiques, tendances) au-delà des compteurs bruts
- Mapping offer_id SIO (remplacer les placeholders par les vrais IDs)
- Tests automatisés
- Configuration Nginx pour `quiz.tipote.com` → Tiquiz (port 3001)
