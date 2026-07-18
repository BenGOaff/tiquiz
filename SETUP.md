# L'Atelier du Quiz : guide de mise en place (côté Béné + côté serveur)

Ce guide te dit, pas à pas, ce que TU prépares et ce que le code attend.
Rien ici n'invente d'URL ni de prix : les valeurs entre crochets sont à
remplir par toi.

---

## Vue d'ensemble

L'Atelier du Quiz est un espace membre séparé (Next.js + Supabase), sur ton VPS,
qui réutilise au maximum Tiquiz : design system, pattern webhook
Systeme.io, brique IA, et ton pipeline vidéo auto-hébergé. Mono-langue
(français), volontairement minimaliste.

Domaine prévu : `quizing.tipote.com` (sous-domaine Cloudflare).

---

## Étape 1 : le projet Supabase (5 min)

1. Crée un NOUVEAU projet Supabase (séparé de Tiquiz/Tipote).
2. Récupère dans Settings > API :
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` -> `SUPABASE_SERVICE_ROLE_KEY` (secret, jamais côté client)
3. Applique le schéma : SQL Editor > colle le contenu de
   `supabase/migrations/0001_quizing_initial.sql` > Run.
4. Charge tout le parcours : SQL Editor > colle `supabase/seed/parcours.sql`
   > Run. (Ce fichier contient la préparation J-3/J0, les 14 jours et le
   bonus. Il remplace l'ancien `day1.sql` partiel.)

🚨 Tant que la migration n'est pas exécutée sur Supabase, l'app ne voit
aucune table.

### Auth Supabase
- Authentication > URL Configuration > Site URL : `https://quizing.tipote.com`
- Redirect URLs : ajoute `https://quizing.tipote.com/auth/callback`
  (et `http://localhost:3000/auth/callback` pour le dev).
- Les comptes élèves sont créés automatiquement par le webhook (invitation
  par email). Pour te tester toi-même tout de suite, voir Étape 6.

---

## Étape 2 : les variables d'environnement

Copie `.env.example`. En dev local : `.env.local`. Sur le VPS prod :
`.env` (convention serveur, comme Tiquiz). Remplis au minimum les 4
variables Supabase + `NEXT_PUBLIC_APP_URL`. Le reste (webhook, IA, vidéo)
peut venir ensuite.

---

## Étape 3 : Cloudflare (le sous-domaine)

1. Dans Cloudflare, sur la zone `tipote.com`, ajoute un enregistrement
   DNS `A` (ou `CNAME`) `quizing` qui pointe vers ton VPS (même IP que
   `quiz.tipote.com`). Proxy activé (nuage orange) comme pour Tiquiz.
2. Côté VPS, ajoute le reverse proxy pour ce host vers le port de
   L'Atelier du Quiz (voir Étape 5), exactement comme tu l'as fait pour Tiquiz.

---

## Étape 4 : Systeme.io (ventes + accès)

Même pattern que le webhook qui upgrade les plans Tiquiz.

1. Page de vente : sur `tipote.fr` (Systeme.io), comme pour Tiquiz. (Ne
   pas inventer l'URL de vente : tu la crées dans SIO.)
2. Automatisation SIO : sur l'événement "achat confirmé" de l'offre
   L'Atelier du Quiz, appelle le webhook :
   `https://quizing.tipote.com/api/systeme-io/webhook?secret=[SECRET]`
   - `[SECRET]` = la valeur que tu mets dans `SYSTEME_IO_WEBHOOK_SECRET`.
   - Optionnel mais recommandé : configure la signature HMAC et mets le
     même secret dans `SYSTEME_IO_WEBHOOK_SIGNING_SECRET`. Si cette var
     est définie, le webhook EXIGE la signature (plus sûr).
3. Sur remboursement/annulation, fais pointer le même webhook : le code
   détecte CANCEL/REFUND/EXPIR et révoque l'accès automatiquement.
4. Le webhook : crée le compte élève (invitation email pour fixer le mot
   de passe), crée l'enrollment actif, est idempotent (SIO réessaie).

---

## Étape 5 : déploiement VPS (comme Tiquiz)

```bash
# Sur le VPS, dans le dossier de l'app
npm ci
npm run build
# Lance avec pm2 (adapte le nom de process et le port)
pm2 start npm --name quizing-prod -- start
pm2 save
```

Reverse proxy : route `quizing.tipote.com` vers le port de L'Atelier du Quiz
(par défaut 3000 ; mets un port libre distinct de Tiquiz/Tipote).

---

## Étape 6 : te donner accès pour tester (sans passer par SIO)

1. Crée-toi un compte : va sur `https://quizing.tipote.com/login`,
   entre ton email, clique "Recevoir un lien de connexion".
2. Une fois connecté, donne-toi un enrollment actif. Supabase SQL Editor :
   ```sql
   insert into enrollments (user_id, status, source)
   select id, 'active', 'manual' from auth.users where email = '[TON_EMAIL]'
   on conflict (user_id) do update set status = 'active', revoked_at = null;
   ```
3. Recharge le tableau de bord : le Jour 1 est là.

Ton email admin (`blagardette@gmail.com`) est déjà dans
`lib/adminEmails.ts` pour le futur back-office.

---

## Étape 7 : la vidéo (réutilise ton pipeline popquiz)

Ton VPS héberge déjà le pipeline vidéo des popquiz (serveur `tus` +
transcodage HLS + nginx `secure_link`). Il est namespacé par app
(`/srv/popquiz-videos/<app>/...`). L'Atelier du Quiz s'y branche en tant que
nouvelle app `quizing`, SANS toucher à Tiquiz :

1. Dans la config du serveur tus (`/opt/popquiz-tus`), autorise la valeur
   d'app `quizing` (la whitelist qui validait `tiquiz`). C'est le seul
   ajustement VPS nécessaire.
2. Renseigne dans `.env` : `POPQUIZ_TUS_JWT_SECRET` (le MÊME que le
   serveur tus), `QUIZING_TUS_ENDPOINT`, `QUIZING_VIDEO_PLAYBACK_BASE`,
   `QUIZING_VIDEO_SECURE_LINK_SECRET`.
3. En attendant, le lecteur accepte une simple URL YouTube ou un lien
   direct dans le champ `video_url` d'un jour (pratique pour tester).

> L'upload vidéo depuis l'admin et le portage de la lib de signature
> (équivalent `lib/popquiz/playback.ts`) font partie du sprint admin
> (voir ROADMAP ci-dessous).

---

## Étape 8 : le coach IA (sprint suivant)

`ANTHROPIC_API_KEY` dans `.env`. La brique de résolution de modèle
(`lib/anthropicModel.ts`) et de construction de requête
(`lib/claudeRequest.ts`) est déjà portée. Base de connaissance = les
fichiers de `contenu/`. Garde-fous anti-hallucination stricts.

---

## Dev local

```bash
npm install
npm run dev      # http://localhost:3000
npm run typecheck
npm run build
```

---

## Ce qui est déjà codé (sprint 1 : prototype Jour 1)

- Design system L'Atelier du Quiz (indigo Tiquiz centralisé).
- Auth Supabase (mot de passe + lien magique) + protection des routes.
- Schéma complet + RLS + seed du Jour 1 réel.
- Tableau de bord parcours (progression, déblocage immédiat/binge).
- Page du jour : vidéo + contenu + ressources + quiz natif guidé.
- Capture des réponses (le carnet) + page de résultat + déblocage.
- Carnet de bord (toutes les réponses de l'élève).
- Webhook Systeme.io (octroi/révocation d'accès, idempotent).

## Admin back-office (sprint 2, fait)

Accessible sur `/admin` (réservé à ton email, cf. `lib/adminEmails.ts`).
- Vue d'ensemble : élèves actifs, jours publiés/brouillon, complétions.
- Jours : créer, éditer (titre, sous-titre, vidéo, contenu, résultat,
  ressources), réordonner, publier/dépublier, dupliquer, supprimer,
  prévisualiser.
- Questions du quiz : types, intitulé, aide, options + tags, obligatoire,
  ordre.
- Vidéo : coller une URL OU uploader vers ton pipeline VPS (une fois les
  vars vidéo renseignées et l'app `quizing` autorisée côté tus).
- Élèves : liste, recherche, progression, accorder/révoquer l'accès.

> Reste à brancher pour finir la vidéo uploadée : la lecture HLS signée
> (URL de lecture mintée côté serveur, comme les popquiz). En attendant,
> l'URL collée (YouTube ou lien direct) marche partout.

## ROADMAP (sprints suivants)

- Coach IA en bulle (contexte du jour + FAQ, garde-fous, rate limit).
- Quiz de diagnostic d'entrée + segmentation.
- Gamification (saisie des vrais chiffres + jalons/badges).
- Génération des livrables depuis le carnet (v2).
- Les 14 jours complets (déclinaison du gabarit Jour 1).
