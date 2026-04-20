# CAHIER DES CHARGES Tiquiz — Version Avril 2026 (État actuel du produit)

Application Web SaaS multilingue (FR/EN/ES/IT/AR) de création de quiz interactifs pour capture de leads, avec intégration Systeme.io et génération IA.

**Tiquiz est la version allégée de Tipote**, focalisée uniquement sur les quiz, l'IA et Systeme.io. Pas de coach IA, pas de crédits IA, pas de réseaux sociaux, pas d'automations, pas de pages builder.

---

## 1. PRÉSENTATION DU PRODUIT

### 1.1. Vision

Tiquiz est un outil de création de quiz lead magnets, ultra simple côté utilisateur mais puissant côté backend. L'utilisateur crée un quiz (manuellement ou via IA), le partage, capture des leads et les synchronise automatiquement avec Systeme.io (tags, formations, communautés).

### 1.2. Fonctionnalités clés

- Création de quiz manuellement ou par **génération IA** (Claude Anthropic, streaming SSE)
- Page publique de quiz responsive (`/q/[quizId]`)
- Capture de leads (email + prénom + nom + téléphone + pays, configurable)
- Résultats personnalisés avec CTA par résultat
- **Intégration Systeme.io** : auto-tagging, inscription formation, ajout communauté, enrichissement contact
- **Viralité** : share bonus avec tag SIO dédié
- Tracking funnel (vues, starts, completions, shares, taux de conversion)
- Dashboard avec stats par quiz
- **5 langues** (FR, EN, ES, IT, AR) + support RTL
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
| Dashboard | /dashboard | Liste des quiz + stats |
| Nouveau quiz | /quiz/new | Création (3 onglets : Manuel, IA, Import) |
| Éditer quiz | /quiz/[quizId] | Édition d'un quiz existant |
| Quiz public | /q/[quizId] | Page publique du quiz (sans auth) |
| Paramètres | /settings | Langue, adresse, privacy, clé SIO |
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

**3 onglets :**

**Onglet Manuel :**

- Métadonnées : titre, introduction, langue, forme d'adresse (tu/vous)
- CTA : texte + URL
- Privacy : URL politique de confidentialité, texte de consentement
- Champs de capture : toggles pour prénom, nom, téléphone, pays
- Viralité : activer share bonus, message de partage, tag SIO share
- Questions : ajout/suppression dynamique de questions et options
- Résultats : profils de résultat avec titre, description, insight, projection, CTA, mapping SIO (tag, course, community)

**Onglet IA :**

- Paramètres : objectif, audience cible, ton, CTA, description bonus
- Langue de génération (5 langues supportées)
- Limites : nombre de questions, nombre de résultats
- Forme d'adresse (tu/vous)
- Génération via streaming SSE (`/api/quiz/generate`)
- Les champs du formulaire se remplissent en temps réel

**Onglet Import :**

- Placeholder (à venir)

### 3.4. Quiz public (/q/[quizId])

Parcours utilisateur en étapes :

1. **Intro** : titre + introduction + bouton "Commencer"
2. **Questions** : navigation multi-étapes (précédent/suivant)
3. **Capture email** : email + champs optionnels configurés
4. **Consentement** : lien privacy + checkbox
5. **Résultat** : titre, description, insight, projection + CTA spécifique
6. **Bonus share** (si viralité activée) : prompt de partage pour débloquer un bonus

**Multilingue :** 7 variantes de traduction (fr, fr_vous, en, es, it, ar, ar_formal)

**Tracking :** vues (page load), starts (clic commencer), completions (soumission lead), shares

### 3.5. Paramètres (/settings)

- **Langue** : sélection locale UI (stocké cookie + DB)
- **Forme d'adresse** : tu/vous par défaut
- **URL Privacy** : lien politique de confidentialité par défaut
- **Clé API Systeme.io** : clé personnelle pour sync leads
- **Nom de la clé** : label pour gestion

---

## 4. INTÉGRATION SYSTEME.IO

### 4.1. Clé API utilisateur

- Chaque utilisateur configure sa propre clé API SIO dans /settings
- Stockée dans `profiles.sio_user_api_key`
- Non-bloquant : si pas de clé, les fonctionnalités SIO dégradent gracieusement

### 4.2. Auto-tagging à la soumission de lead

Quand un lead soumet le quiz :

1. Le résultat a un `sio_tag_name` configuré
2. Trouve/crée le tag dans SIO
3. Trouve/crée le contact par email
4. Applique le tag au contact
5. Met à jour le champ personnalisé `tiquiz_result` avec le titre du résultat
6. Optionnellement inscrit dans une formation (`sio_course_id`)
7. Optionnellement ajoute à une communauté (`sio_community_id`)

### 4.3. Share tag

Quand un lead partage le quiz, applique le `sio_share_tag_name` au contact.

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

### 6.2. Fichiers de traduction

- `messages/fr.json` (français)
- `messages/en.json` (anglais)
- `messages/es.json` (espagnol)
- `messages/it.json` (italien)
- `messages/ar.json` (arabe)

### 6.3. Clés traduites

Navigation, formulaires auth, quiz builder, dashboard, settings, interface quiz publique, erreurs, notifications.

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

- `profiles` — user_id, email, full_name, first_name, last_name, ui_locale, address_form, privacy_url, sio_user_api_key, sio_api_key_name, plan, product_id, sio_contact_id, responses_used_this_month, responses_reset_at

**Quiz :**

- `quizzes` — user_id, title, introduction, locale, status (draft/active), capture config (heading, subtitle, champs toggles), CTA (text, url), privacy (url, consent_text), virality (enabled, bonus_description, share_message, sio_share_tag_name), og_image_url, analytics counters (views, starts, completions, shares)
- `quiz_questions` — quiz_id, question_text, options (JSONB: `[{ text, result_index }]`)
- `quiz_results` — quiz_id, title, description, insight, projection, cta_text, cta_url, sio_tag_name, sio_course_id, sio_community_id
- `quiz_leads` — quiz_id, email, first_name, last_name, phone, country, result_id, consent_given, has_shared, bonus_unlocked, answers (JSONB), unique(quiz_id, email)

**Logs :**

- `webhook_logs` — source, event_type, payload (JSONB), received_at

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
| `/api/quiz/[quizId]` | PATCH | oui | Met à jour un quiz |
| `/api/quiz/[quizId]` | DELETE | oui | Supprime un quiz (cascade) |
| `/api/quiz/generate` | POST | oui | Génération IA quiz (streaming SSE) |
| `/api/quiz/[quizId]/track` | POST | non | Tracking funnel (start, complete) |
| `/api/quiz/[quizId]/public` | GET | non | Récupère quiz actif (données publiques) |
| `/api/quiz/[quizId]/public` | POST | non | Soumet un lead + sync SIO |
| `/api/quiz/[quizId]/public` | PATCH | non | Enregistre un share + tag SIO |
| `/api/quiz/[quizId]/sync-systeme` | POST | oui | Bulk sync leads vers SIO |
| `/api/profile` | GET | oui | Récupère le profil utilisateur |
| `/api/profile` | PATCH | oui | Met à jour le profil |
| `/api/systeme-io/webhook` | POST | secret | Webhook ventes SIO |
| `/api/systeme-io/free-optin` | POST | secret | Webhook optin gratuit SIO |
| `/api/systeme-io/tags` | GET | oui | Liste les tags SIO de l'utilisateur |
| `/api/settings/ui-locale` | POST | oui | Change la langue UI |

### 8.4. Prompt IA (génération quiz)

- Fichier : `lib/prompts/quiz/system.ts`
- Provider : Claude Anthropic (Sonnet 4)
- Mode : streaming SSE (chunks JSON en temps réel)
- Paramètres : objectif, audience, ton, CTA, bonus, langue, nombre questions/résultats, forme d'adresse
- Output : quiz complet structuré (titre, intro, questions, options, résultats)

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
- Quiz engine (création manuelle + génération IA)
- Quiz public avec funnel complet
- Capture de leads
- Intégration Systeme.io (tags, formations, communautés, contacts)
- Monétisation freemium (plans + quotas)
- i18n 5 langues + RTL
- Dashboard avec stats
- Settings utilisateur
- Email templates Tiquiz (invite, magic link, reset password, confirm signup)
- **Didacticiel interactif** (tour guidé 7 étapes — inspiré de Tipote, adapté Tiquiz)
- **Centre d'aide** mutualisé avec Tipote (catégorie Tiquiz + chatbot + tickets partagés)

### À faire 🔄

- Import de quiz (CSV/JSON) — onglet placeholder
- Analytics détaillés par quiz (graphiques, tendances)
- Mapping offer_id SIO (remplacer les placeholders par les vrais IDs)
- Tests automatisés
- Configuration Nginx pour `quiz.tipote.com` → Tiquiz (port 3001)
