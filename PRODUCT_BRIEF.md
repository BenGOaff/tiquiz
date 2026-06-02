# Brief produit Tiquiz — pour génération de contenu de vente

> Ce document est destiné à un agent IA qui doit produire des landing pages, séquences emails, posts sociaux, scripts vidéo, ads ou pages de vente pour Tiquiz. Il est rédigé pour être consommé directement par une IA générative — structuré, factuel, sans verbiage.
>
> Pour la documentation technique destinée aux développeurs : voir `CAHIER_DES_CHARGES.md` et `docs/INVARIANTS.md`.

---

> **Note de version — Juin 2026** (à intégrer dans toute com produite à partir de cette date) :
>
> - **Multiprofils** : un compte Tiquiz peut désormais gérer plusieurs "projets" (= comptes virtuels). Chaque projet a ses propres quiz, leads, stats, branding, positionnement, clés Systeme.io. **Un nouveau projet démarre VIDE** (stats à zéro, branding vierge à customiser). Disponible sur les nouveaux plans Tiquiz Mensuel+ et Tiquiz Annuel+ (et conservé sur lifetime / beta).
> - **Nouveaux paliers premium** : **Mensuel+ à 29€/mois** et **Annuel+ à 290€/an**, qui débloquent multiprofils + analyse IA des résultats (quiz et sondages) + multi-clés Systeme.io. Les plans Mensuel (9€) et Annuel (90€) restent inchangés sur le périmètre historique.
> - **Analyse IA des résultats** : nouvelle feature premium qui analyse les réponses agrégées (quiz ET sondages).
> - **Switch d'abonnement en 1 clic** : depuis Settings → Abonnement, l'utilisateur change de plan, l'ancien est auto-annulé chez Systeme.io, pas de double-facturation.
> - **15 templates de quiz métier** (au lieu de 8) : 7 nouveaux modèles coachs (mindset, nutrition, sommeil, parentalité, couple, reconversion, finance).
> - **Auto-instanciation post-signup** : à l'inscription, l'utilisateur voit 6 templates phares et publie son premier quiz en 10 secondes au lieu de tomber dans un éditeur vide.
> - **Lifetime 57€ terminé en vente directe** : conservé en récompense early adopters (équivalent Mensuel+ / Annuel+ à vie). Ne plus mettre en avant comme CTA dans les nouveaux contenus.

---

## 1. Identité

- **Nom du produit** : Tiquiz
- **Domaine principal** : quiz.tipote.com (sous-domaine de Tipote, mais vendu comme produit autonome)
- **Tagline courte** : « Le quiz lead-magnet le plus simple à créer »
- **Pitch en une phrase** : Tiquiz est l'outil qui transforme un quiz interactif en machine à leads, intégrée à Systeme.io en un clic.
- **Pitch en trois phrases** : Créer un quiz lead-magnet qui convertit demande normalement 2 jours de boulot et 3 outils branchés ensemble. Avec Tiquiz, tu donnes 3 mots à l'IA, tu as un quiz complet en 30 secondes, branché à Systeme.io en automatique. Et tes prospects qui partagent leur résultat te ramènent leurs amis taggés.
- **Positionnement vis-à-vis de Tipote** : Tiquiz est le **module quiz autonome** de la plateforme Tipote. Pour les créateurs qui ne veulent QUE du quiz (pas de stratégie, pas de réseaux sociaux, pas de pages), Tiquiz est l'offre dédiée — moins cher, focalisé.

## 2. Public cible

### 2.1. Cible principale (persona prioritaire)

- **Solopreneur francophone** (FR / BE / CH / CA), 25-50 ans, déjà sur Systeme.io
- Vend des **prestations de service** (coaching, conseil, formations) ou anime une **communauté payante**
- A déjà essayé : Typeform, Tally, Outgrow, ScoreApp, AnswerThePublic — soit trop cher, soit trop tech, soit pas connecté à Systeme.io
- A besoin d'un **lead magnet renouvelable** (quiz « Quel type de X es-tu ? ») pour son funnel d'acquisition
- Niveau technique : **non-tech**. Doit pouvoir créer + publier en 5 minutes sans tutoriel

### 2.2. Cibles secondaires

- **Affiliés Systeme.io** qui veulent un outil dédié et léger pour leurs lead magnets
- **Coachs internationaux** (EN / ES / IT / DE / PT / AR) qui veulent un quiz multilingue clé-en-main
- **Créateurs de contenus YouTube / TikTok** qui veulent embarquer un quiz dans leurs vidéos (cas d'usage Popquiz)
- **Solopreneurs multi-activités** (cible Mensuel+ / Annuel+, juin 2026) : un même créateur qui anime plusieurs marques ou niches en parallèle (ex. coach mindset + coach finance ; consultant B2B + side-project info-produit). Un seul compte Tiquiz, plusieurs projets isolés, plusieurs clés Systeme.io. Persona type : "j'ai 3 audiences différentes et je ne veux pas mélanger leurs tags, leur branding ni leurs stats."

### 2.3. Anti-cible

- Grandes entreprises avec des process de validation marketing complexes
- Agences (qui revendraient — outil pas multi-tenant, multi-marque)
- Marketers qui veulent un constructeur de quiz ultra-personnalisable avec logique conditionnelle complexe (Tiquiz est volontairement simple)

## 3. Promesse principale

**« Un quiz qui capture, qualifie et tague tes leads — créé en 5 minutes. »**

Variations selon le canal :
- *(Email/landing)* : « Crée ton quiz, partage le lien, regarde les leads taggés arriver dans Systeme.io. C'est tout. »
- *(Ads court)* : « Le quiz lead-magnet branché à Systeme.io, 5 min chrono. »
- *(Social)* : « Tu donnes 3 mots à l'IA, tu as un quiz prêt à capturer des leads. »

## 4. Pain points résolus

| Pain | Ressenti | Réponse Tiquiz |
|---|---|---|
| « Typeform, c'est joli mais ça segmente pas mes leads » | Tu collectes des emails sans contexte | Tag Systeme.io différent par résultat de quiz → tu sais qui pense quoi |
| « ScoreApp marche bien mais c'est 60€/mois et c'est anglais » | Cher + barrière de langue | Tiquiz : 9€/mois, FR, intégration Systeme.io native |
| « J'arrive pas à passer le quiz à mes prospects sans copier-coller le lien partout » | Friction de partage | Slug court personnalisé (`/q/mon-quiz`), bouton de partage natif sur le quiz public, viralité via étape « Partage = bonus » |
| « Mes leads sont dans Systeme.io mais je sais pas qui a fait quel quiz » | Aveugle | Tag SIO différent par capture + par share + par option de réponse |
| « Je veux un quiz dans MA langue avec MA marque » | Outils anglais, pas brandable | Tiquiz UI en 5 langues admin + quiz public en 8 variantes (FR/FR-vous/EN/ES/IT/DE/PT/AR) + branding par quiz (police Google + couleur primaire + couleur de fond + logo) |
| « Mes prospects abandonnent à mi-quiz » | Taux de complétion faible | Mode « bonus de partage » (anti-triche réelle, pas du fake), résultats riches avec storytelling personnalisé qui retient |
| « J'ai pas envie de coder un embed sur mon site » | Tech-friction | URL courte + iframe embed prêt à coller (notamment Popquiz vidéo, voir §7) |
| « J'ai 2 marques et tout est mélangé dans le même compte » | Comptes séparés ingérables | **Multiprofils** (juin 2026) : un seul login, plusieurs projets isolés (stats, branding, clés SIO indépendants) — switch en 1 clic depuis le header (plans Mensuel+ / Annuel+) |
| « Mes leads viennent en masse, j'ai pas le temps d'analyser » | Données mortes | **Analyse IA des résultats** (juin 2026) : Claude synthétise les réponses, fait ressortir patterns et segments saillants (plans Mensuel+ / Annuel+) |
| « Je veux changer de plan sans me prendre la tête avec la double facturation » | Friction d'upgrade | Switch en 1 clic depuis Settings → Abonnement : l'ancien sub Systeme.io est auto-annulé, pas de chevauchement |

## 5. Différenciateurs

### vs Typeform
- **Tag Systeme.io natif** par résultat — pas besoin de Zapier
- **5 fois moins cher** (9€/mois vs 25-83€)
- **Génération IA** : tu décris ton quiz en une phrase, l'IA crée tout
- **Mode lead magnet pensé pour ça** : viralité, partage, anti-triche

### vs ScoreApp / Interact
- **Français, intégration Systeme.io native**
- **UI 5 langues + quiz public 8 variantes** (incl. arabe RTL)
- **Module Popquiz vidéo** (vidéo + quiz incrustés à des timestamps) que personne d'autre ne fait

### vs Tally / Google Forms
- **Pas un formulaire, un quiz** : résultats personnalisés, mécaniques de gamification, mémo persistant via cookies
- **Branding par quiz** (police, couleurs, logo) sans toucher au CSS

### vs Tipote (la plateforme parente)
- Tiquiz **N'A PAS** : coach IA, crédits IA, réseaux sociaux, automations, pages builder, stratégie, contenus génériques (post, email, article)
- Tiquiz **A** : tout le module quiz + popquiz, plus simple à appréhender pour qui ne veut QUE du quiz
- Pricing Tiquiz beaucoup plus bas (9€/mois vs 19-99€/mois Tipote)
- Tiquiz hérite aussi du **multiprofils** de Tipote (juin 2026) : même mécanique (nouveau projet = nouveau compte virtuel vide), mais réservée aux paliers + (Mensuel+ 29€/mois, Annuel+ 290€/an)

## 6. Workflow utilisateur (storytelling produit)

### Création d'un quiz (5 min chrono)
1. L'user va sur `/quiz/new` — ou, en arrivant tout juste sur le dashboard sans quiz (juin 2026), choisit directement un des **6 templates phares** affichés en grand sur l'écran d'accueil → quiz pré-rempli en 1 clic
2. Trois choix manuels : **IA** (décrit le quiz en 1 phrase), **Import** (CSV/JSON existant), **Manuel** (vierge), **Templates** (15 modèles métier : coach mindset, nutrition, sommeil, parentalité, couple, reconversion, finance, entrepreneur, yoga, naturo, formation, marketing, photo, immo…)
3. Le mode IA déclenche un brainstorm conversationnel (Claude Haiku) qui pose 3-4 questions ciblées
4. Génération en streaming (~30s) : titre, intro, 5-7 questions, 3-4 résultats avec storytelling personnalisé
5. Édition WYSIWYG inline : tous les textes sont éditables au clic, polices Google, couleurs personnalisables, images
6. Onglet « Partage » : tag SIO par résultat (`quiz-visionnaire`, `quiz-strategique`…), tag share, bonus de viralité, anti-triche
7. Publier en un clic → URL courte personnalisée (`/q/mon-slug`)

### Le visiteur prend le quiz
1. Page publique responsive avec branding du créateur
2. Étape personnalisation (prénom, genre) si activée → injecté dans tous les textes (`{name}`, `{m|f|x}`)
3. Questions une par une, transitions douces
4. Capture email + champs additionnels configurables (prénom / nom / téléphone / pays)
5. Étape « Bonus de partage » optionnelle (« Partage pour débloquer ton bonus ») avec image, mockup ou GIF
6. Résultats personnalisés avec CTA propre par résultat
7. **En coulisses** : tag Systeme.io appliqué automatiquement → déclencheurs d'automatisation chez le créateur

### Création d'un Popquiz (Mai 2026)
1. L'user va sur `/popquiz/new`
2. Importe une vidéo : URL YouTube / Vimeo / upload TUS resumable jusqu'à 2 GB
3. Choisit dans son catalogue de quiz existants ceux à incruster
4. Place les cues sur la timeline (« à 0:30 → quiz X, à 1:15 → quiz Y »)
5. Publie → URL courte + snippet d'embed iframe à coller sur son site
6. Le visiteur regarde la vidéo, à chaque cue le quiz s'affiche par-dessus, la vidéo reprend après réponse
7. **Auto-activation** : à la publication du popquiz, les quiz référencés en brouillon deviennent automatiquement publiés

## 7. Catalogue de fonctionnalités (organisé par bénéfice)

### 7.1. Création
- **3 modes d'entrée** : génération IA / import CSV-JSON / manuel
- **Brainstorm IA conversationnel** pour dégrossir un brief (Claude Haiku, gratuit)
- **Génération complète** via streaming SSE (titre, questions, options, résultats, storytelling)
- **Éditeur WYSIWYG** : édition inline, sidebar 4 onglets (Structure / Design / Paramètres / Partage), preview live
- **Rich text** : gras, italique, soulignement, alignement, listes, liens, images, **color picker** (Mai 2026 — palette de couleurs + custom)
- **Personnalisation dynamique** : `{name}`, `{m|f|x}` injectés à partir des données capturées
- **Brainstorm avant génération** pour éviter de cramer un crédit sur un brief flou

### 7.2. Branding
- Police Google parmi une whitelist (rapide, performant)
- Couleur primaire / couleur de fond
- Logo
- OG image / OG description par quiz
- Footer customisable (texte + URL)
- **Modes d'adresse** par quiz : tu / vous (forme grammaticale française appliquée partout)

### 7.3. Capture & viralité
- **Lead magnet** : email + prénom + nom + téléphone + pays (toggles configurables)
- **Tag Systeme.io capture** + **tag share** + **tag par résultat** + **tag par option de réponse** (« answer tags »)
- **Étape de viralité** : entre capture et résultats, partage sur 6 réseaux (Facebook, X, LinkedIn, WhatsApp, Telegram, email, copy-link)
- **Anti-triche** : navigator.share sur mobile, polling de fenêtre popup sur desktop, dwell time + confirmation pour copy-link → impossible de fake un partage
- **Visuel du bonus** : image ou mockup ou GIF
- **Message bonus personnalisable** (Mai 2026) : texte custom qui remplace le templeté
- **Restart** : bouton pour recommencer le quiz depuis l'étape résultat

### 7.4. Module Popquiz (Mai 2026)
- **Vidéo source** : YouTube / Vimeo / URL directe / upload propre (TUS resumable jusqu'à 2 GB)
- **Cuepoints** : placer un quiz à un timestamp précis sur la timeline
- **Comportement** : bloquant (le visiteur DOIT répondre) ou optionnel (peut skipper)
- **Embed iframe** : snippet copiable pour intégrer le popquiz sur n'importe quel site (WordPress, Systeme.io, etc.)
- **Auto-activation** : publier un popquiz active automatiquement les quiz référencés
- **Thumbnail auto** : extrait de la vidéo (upload) ou oEmbed (YouTube/Vimeo) à la création
- **Branding hérité** du profil créateur (logo + couleur)

### 7.5. Intégration Systeme.io
- **Clé API utilisateur** (chiffrée at rest depuis Mai 2026 sur Tipote, en plain text + masquée UI sur Tiquiz)
- **Auto-tagging** à la conversion : capture + share + résultat + option
- **Création/maj du contact** dans Systeme.io en temps réel
- **Webhook entrant** : ventes Systeme.io qui upgrade automatiquement le plan Tiquiz du créateur (free → lifetime)
- **Documentation in-app** : explication pas-à-pas pour créer les tags + automatisations Systeme.io

### 7.6. Multilingue
- **UI admin** : 5 langues (FR / EN / ES / IT / AR avec RTL)
- **Quiz public** : 8 variantes (fr / fr_vous / en / es / it / de / pt / ar)
- Switch d'adresse tu/vous par quiz indépendamment de la locale système
- Typographie française correcte (NBSP avant `: ; ! ? »`) appliquée à la fois au save et au render

### 7.7. Analytics
- **Funnel par quiz** : vues, démarrages, complétions, partages, conversions
- **Stats dashboard** par période
- **Export CSV** des leads
- **Source tracking** : on sait d'où vient chaque lead (quiz, popquiz, partage)

### 7.8. Sécurité leads (3 couches)
- FK `quiz_leads.result_id` ON DELETE SET NULL au niveau DB
- Snapshot `result_title` avant DELETE des résultats
- NULL-out explicite avant DELETE
- → **Aucun lead ne peut disparaître** quand le créateur re-shuffle ses résultats

### 7.9. Multiprofils (Mensuel+ / Annuel+ — juin 2026)

- **Plusieurs projets dans un seul compte** : chaque projet = compte virtuel autonome (quiz, leads, stats, branding, positionnement, clés Systeme.io 100 % isolés)
- **Switch en 1 clic** : sélecteur de projet dans le header avec identité visuelle (couleur d'accent parmi 10 + emoji parmi 20)
- **Sémantique critique** : un nouveau projet démarre **VIDE** — stats à zéro, branding vierge à customiser, pas d'héritage des réglages des autres projets
- **Filet de sécurité quiz publics** : si un quiz est servi sur un projet sans branding, les valeurs non-NULL du profil par défaut prennent le relais — un quiz en ligne n'est jamais cassé visuellement par un changement de projet actif
- **Multi-clés Systeme.io** : une clé API SIO différente par projet (cas typique : 1 marque = 1 compte SIO)
- **Persistance** : le projet actif est mémorisé entre sessions ; la première session du jour reposition sur le projet par défaut (filet anti-erreur)
- **Suppression sécurisée** : danger-zone avec recopie obligatoire du nom du projet ; les quiz en ligne d'un projet supprimé restent accessibles (passent en projet par défaut)
- **Réservé aux paliers +** : Mensuel+ (29€/mois), Annuel+ (290€/an), Lifetime (57€, terminé), Beta — les plans Mensuel (9€) et Annuel (90€) conservent le comportement mono-compte historique

### 7.10. Analyse IA des résultats (Mensuel+ / Annuel+ — juin 2026)

- **Synthèse automatique** des réponses agrégées par Claude
- Couvre **quiz ET sondages** (Tiquiz inclut le module Sondage en plus du quiz)
- Réservé aux paliers + (cf. §7.9 pour la liste des plans débloqués)
- Cas d'usage : « 200 personnes ont fait mon quiz, qu'est-ce qui ressort vraiment ? » → l'IA dégage les patterns, segments saillants et insights actionnables

### 7.11. Templates de quiz métier (juin 2026 — 15 modèles)

15 templates prêts à publier, chacun structuré en 6 questions × 4 options + 4 résultats, ton chaleureux, tutoiement, pas de jargon coach :

**Coaching & développement personnel**
- Croyance limitante (mindset)
- Rapport à la nourriture (nutrition)
- Fuites d'énergie (sommeil & énergie)
- Style parental (parentalité)
- Schéma amoureux (couple)
- Blocage en reconversion
- Rapport à l'argent (finance)

**Business & créatif**
- Profil entrepreneur
- Moteur intérieur
- Style yoga
- Terrain naturopathie
- Prêt à lancer ta formation
- Levier de croissance marketing
- Style photo
- Prêt pour ton premier achat immo

### 7.12. Switch d'abonnement en 1 clic (juin 2026)

- Settings → Abonnement → "Passer à Mensuel+" (ou tout autre plan) → checkout Systeme.io
- À la confirmation du paiement, l'**ancien abonnement Systeme.io est auto-annulé**
- Pas de double-facturation, pas de chevauchement, pas de besoin de contacter le support
- Couvre tous les sens : free → +, monthly → +, monthly+ → yearly+, downgrades inclus

### 7.13. Domaines personnalisés (Pro+)
- **Connecte ton propre domaine** à Tiquiz : `quiz.ma-marque.com`, `test.mon-business.fr`, n'importe quel sous-domaine que tu contrôles
- **Setup en 2 minutes** : un seul enregistrement CNAME chez ton registrar (Cloudflare, OVH, GoDaddy, Namecheap, Gandi… détecté automatiquement avec instructions sur-mesure), Tiquiz vérifie le DNS dans la foulée et émet ton certif SSL Let's Encrypt sans aucune action supplémentaire
- **URLs propres** sur ton domaine : `ma-marque.com/mon-quiz` au lieu de `quiz.tipote.com/q/mon-quiz` — sans préfixe, sans paraître "hébergé chez Tiquiz"
- **Un seul domaine pour tous tes contenus** : quiz, sondages, popquiz, tout est servi depuis ton hostname. L'éditeur de chaque contenu te laisse choisir entre tes domaines via un dropdown (ton custom est pré-sélectionné puisque tu l'as payé)
- **Sécurité par défaut** : un autre créateur ne peut pas réclamer un domaine déjà connecté chez toi, ni servir son propre contenu via ton hostname (vérification ownership automatique)
- **Backwards-compat** : les URLs déjà partagées (`quiz.tipote.com/q/...`, `/p/...`) continuent de fonctionner — personne ne perd l'accès à un lien existant

## 8. Plans & tarification (mis à jour juin 2026)

### Matrice features par plan

| Feature | Free | Mensuel (9€) | Annuel (90€) | **Mensuel+ (29€)** | **Annuel+ (290€)** | Lifetime / Beta |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Quiz actifs | 1 | illimité | illimité | illimité | illimité | illimité |
| Sondages actifs | 1 | illimité | illimité | illimité | illimité | illimité |
| Popquiz actifs | 1 | illimité | illimité | illimité | illimité | illimité |
| Réponses captées visibles | 10/mois | illimité | illimité | illimité | illimité | illimité |
| Footer custom | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clés Systeme.io | 1 max | **1 max** | **1 max** | illimité | illimité | illimité |
| Multiprofils | ✗ | ✗ | ✗ | **✓** | **✓** | ✓ |
| Analyse IA des résultats (quiz + sondages) | ✗ | ✗ | ✗ | **✓** | **✓** | ✓ |

### Free — 0€
- **1 quiz max** + 1 sondage max + **1 popquiz max**
- 10 réponses (leads) visibles par mois — les suivantes restent capturées mais en flou jusqu'à upgrade
- Auto-reset 30 jours
- Tous les modules de création accessibles (génération IA, embed, partage, Systeme.io)
- **Idéal pour** : tester un premier lead-magnet

### Mensuel — 9€/mois
- Quiz / sondages / popquiz illimités, leads illimités
- 1 clé Systeme.io
- Annulable à tout moment
- **Idéal pour** : un créateur en démarrage qui veut juste un outil de quiz lead-magnet branché à Systeme.io

### Annuel — 90€/an
- Idem Mensuel, économie de 18€/an
- **Idéal pour** : un usage régulier sans s'engager à vie

### Mensuel+ — 29€/mois (juin 2026)
- Tout Mensuel + **multiprofils** + **analyse IA des résultats** + **multi-clés Systeme.io**
- **Idéal pour** : créateurs multi-marques / multi-niches, ou solopreneurs qui veulent l'analyse IA pour exploiter leurs réponses captées
- CTA upsell typique depuis Mensuel : « Débloque les multiprofils + l'analyse IA pour 20€ de plus par mois »

### Annuel+ — 290€/an (juin 2026)
- Tout Mensuel+ en annuel, économie de 58€/an
- **Idéal pour** : créateurs multi-marques installés qui veulent la stabilité d'un engagement annuel

### Lifetime — 57€ (offre terminée en vente directe — conservée pour early adopters)
- **Quiz / sondages / popquiz illimités, leads illimités**
- Inclut multiprofils + analyse IA + multi-clés SIO (équivalent Annuel+)
- Pas d'abonnement, pas de renouvellement
- **Ne plus pousser comme CTA dans les nouveaux contenus** (offre fermée)

### Pricing rationale (à utiliser dans la com)
- Tiquiz est **5 à 7 fois moins cher** que les concurrents anglais (Typeform 25-83€/mois, ScoreApp 60-200€/mois) sur le plan Mensuel — et reste 2 fois moins cher en Mensuel+
- Le palier + à 29€/mois ouvre les usages "agence-light" (plusieurs marques, plusieurs comptes SIO) qui demandent normalement un Pro à 99-300€/mois ailleurs
- Aucun crédit IA — la génération IA reste illimitée à tous les niveaux payants
- **Source de vérité prix dans le code** : `lib/planLimits.ts:PRICING_PLUS` (à ne jamais diverger entre code et com)

## 9. Voix de marque & ton

### Vocabulaire Tiquiz
- **Mots-clés à utiliser** : quiz, lead, capture, partage, tag, simple, vraiment, en un clic, sans coder, branché à Systeme.io
- **Mots à BANNIR** : conversion funnel, lead generation (terme générique), saas, plateforme, solution, expertise
- **Tutoiement obligatoire**
- **Métaphores** : Tiquiz comme un copilote du quiz, comme un mini-Tipote dédié, comme l'extension naturelle de Systeme.io

### Ton
- **Direct, presque sec** : on parle au point, on ne raconte pas la genèse de l'outil
- **Démontrable** : toujours « tu fais X et tu obtiens Y », jamais « tu pourrais imaginer faire X »
- **Humble** : Tiquiz fait UNE chose, bien. Pas un tous-en-un. C'est un argument de vente, pas un défaut
- **Anti-bullshit marketing** : pas de « engagement », pas de « ROI », pas de « scaling »

### Exemples de phrases dans la voix
- ✅ « En 5 minutes tu as un quiz qui tague tes leads dans Systeme.io. C'est tout ce que ça fait. C'est tout ce qu'il faut. »
- ✅ « Tu donnes 3 mots à l'IA, elle te sort 5 questions et 4 résultats. Tu édites ce qui ne te plaît pas. Tu publies. »
- ❌ « Découvrez la solution n°1 de génération de leads par quiz interactifs. »
- ❌ « Boostez votre engagement avec nos quiz IA-driven. »

## 10. Preuves & garanties

### Sécurité
- **Lead safety** : 3 couches indépendantes garantissent qu'aucun lead n'est perdu, même si le créateur efface des résultats par erreur
- **Auth Supabase** + RLS sur toutes les tables
- **Webhook signing** sécurisé pour les événements Systeme.io entrants

### Fiabilité
- 5 langues UI
- 8 variantes pour les quiz publics
- Tests de non-régression documentés (`docs/INVARIANTS.md`)

### Service client
- Centre d'aide + tickets partagés avec Tipote
- Pas de duplication : un seul SAV Tipote/Tiquiz, en français

## 11. Objections fréquentes + réponses

| Objection | Réponse type |
|---|---|
| « Encore un outil de quiz, j'ai déjà Typeform » | Typeform ne tague pas tes leads dans Systeme.io. Tiquiz oui. Et Tiquiz est en français. Et Tiquiz est 5x moins cher. |
| « Pourquoi pas Tipote tant qu'à faire ? » | Tipote a 7 modules. Si tu ne veux QUE du quiz, Tiquiz est moins cher (9€/mois vs 19-99€/mois) et focalisé. Tu peux toujours upgrader vers Tipote plus tard. |
| « Je suis pas tech, je vais pas y arriver » | Onboarding 5 minutes, pas de prompts à écrire, pas d'API à configurer. À l'inscription tu choisis un template parmi 15, ton quiz est prêt en 10 secondes. |
| « Mes leads vont être perdus si vous fermez ? » | Export CSV à tout moment. Et chaque lead est aussi poussé dans Systeme.io en temps réel — donc tu as une copie chez Systeme.io de toute façon. |
| « Le quiz IA va sortir n'importe quoi » | Étape brainstorm conversationnel avant génération pour cadrer. Et tu peux modifier chaque texte inline. La génération est un point de départ, pas un point final. |
| « Pourquoi payer 29€/mois pour Mensuel+ plutôt que rester à 9€ ? » | Si tu n'as qu'une marque, reste à 9€ — c'est conçu pour ça. Le + se justifie dès que tu gères plusieurs marques/audiences (multiprofils = 1 compte SIO différent par projet) ou que tu veux faire parler tes réponses (analyse IA). |
| « Si je passe de 9€ à 29€ je vais être facturé deux fois ? » | Non : le switch est automatique. Tu cliques "Passer à Mensuel+" depuis Settings, le nouveau plan démarre, l'ancien est annulé chez Systeme.io en même temps. Aucun chevauchement. |

## 12. CTAs

### CTAs primaires
- « Créer mon premier quiz gratuitement »
- « Tester l'IA en 30 secondes »
- « Voir un exemple de quiz »

### CTAs secondaires
- « Connecter Systeme.io »
- « Voir le mode Popquiz vidéo »
- « Comparer avec Typeform »

### CTAs upsell (free → payant)
- « Débloquer les leads cachés »
- « Passer à l'illimité — 9€/mois »
- « Annuler à tout moment »

### CTAs upsell (Mensuel/Annuel → +)
- « Débloquer les multiprofils — 29€/mois »
- « Gérer plusieurs marques dans un seul compte »
- « Activer l'analyse IA de mes réponses »
- « Connecter plusieurs comptes Systeme.io »

## 13. Données chiffrées à mentionner

- **10 secondes** pour publier son premier quiz à l'inscription (template + 1 clic)
- **5 minutes** pour créer un quiz custom de A à Z
- **30 secondes** de génération IA
- **5 fois moins cher** que les concurrents anglais (9€/mois vs 25-83€)
- **15 templates métier** prêts à publier (juin 2026)
- **5 langues UI** + **8 variantes quiz public** + RTL arabe
- **20 Go max** par upload vidéo (popquiz, depuis mai 2026)
- **6 réseaux** de partage (Facebook, X, LinkedIn, WhatsApp, Telegram, email)
- **3 couches de sécurité** sur les leads (DB + app + défense)
- **Multiprofils illimités** sur Mensuel+ / Annuel+ (juin 2026)

## 14. Slogans / accroches déjà utilisées (réutilisables)

- « Le quiz lead-magnet le plus simple à créer »
- « Tu donnes 3 mots, l'IA fait le reste »
- « Branché à Systeme.io en un clic »
- « Le quiz que tes prospects partagent vraiment »
- « 5 minutes pour créer, 5 secondes pour publier »

## 15. Ce qu'il NE FAUT PAS faire dans la com

- ❌ Vendre Tiquiz comme un challenger Typeform en frontal — positionnement « la version simple + intégrée Systeme.io » plutôt que « l'alternative »
- ❌ Promettre des taux de conversion garantis (« 80 % de complétion » — dépend du quiz, pas de l'outil)
- ❌ Cacher la limite free (1 quiz / 10 leads) — au contraire mettre en avant que c'est volontaire pour un test honnête
- ❌ Vouvoyer le prospect (B2C tutoiement strict)
- ❌ Comparer en frontal aux outils Tipote concurrents (Tipote = produit cousin, pas concurrent)
- ❌ Faire des promesses « tu vas exploser tes leads » — promesse outil, pas promesse résultat
- ❌ Utiliser des screenshots avec une UI obsolète (UI évolue souvent — vérifier la date des assets)
