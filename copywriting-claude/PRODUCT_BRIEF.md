# Brief produit Tiquiz — pour génération de contenu de vente

> Ce document est destiné à un agent IA qui doit produire des landing pages, séquences emails, posts sociaux, scripts vidéo, ads ou pages de vente pour Tiquiz. Il est rédigé pour être consommé directement par une IA générative — structuré, factuel, sans verbiage.
>
> Pour la documentation technique destinée aux développeurs : voir `CAHIER_DES_CHARGES.md` et `docs/INVARIANTS.md`.

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
| « ScoreApp marche bien mais c'est 60€/mois et c'est anglais » | Cher + barrière de langue | Tiquiz : 17€/mois, FR, intégration Systeme.io native |
| « J'arrive pas à passer le quiz à mes prospects sans copier-coller le lien partout » | Friction de partage | Slug court personnalisé (`/q/mon-quiz`), bouton de partage natif sur le quiz public, viralité via étape « Partage = bonus » |
| « Mes leads sont dans Systeme.io mais je sais pas qui a fait quel quiz » | Aveugle | Tag SIO différent par capture + par share + par option de réponse |
| « Je veux un quiz dans MA langue avec MA marque » | Outils anglais, pas brandable | Tiquiz UI en 5 langues admin + quiz public en 8 variantes (FR/FR-vous/EN/ES/IT/DE/PT/AR) + branding par quiz (police Google + couleur primaire + couleur de fond + logo) |
| « Mes prospects abandonnent à mi-quiz » | Taux de complétion faible | Mode « bonus de partage » (anti-triche réelle, pas du fake), résultats riches avec storytelling personnalisé qui retient |
| « J'ai pas envie de coder un embed sur mon site » | Tech-friction | URL courte + iframe embed prêt à coller (notamment Popquiz vidéo, voir §7) |

## 5. Différenciateurs

### vs Typeform
- **Tag Systeme.io natif** par résultat — pas besoin de Zapier
- **Nettement moins cher** (17€/mois, quand Typeform démarre à 25€)
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
- Pricing Tiquiz beaucoup plus bas (17€/mois vs 19-99€/mois Tipote)

## 6. Workflow utilisateur (storytelling produit)

### Création d'un quiz (5 min chrono)
1. L'user va sur `/quiz/new`
2. Trois choix : **IA** (décrit le quiz en 1 phrase), **Import** (CSV/JSON existant), **Manuel** (vierge)
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

### 7.9. Domaines personnalisés (Pro+)
- **Connecte ton propre domaine** à Tiquiz : `quiz.ma-marque.com`, `test.mon-business.fr`, n'importe quel sous-domaine que tu contrôles
- **Setup en 2 minutes** : un seul enregistrement CNAME chez ton registrar (Cloudflare, OVH, GoDaddy, Namecheap, Gandi… détecté automatiquement avec instructions sur-mesure), Tiquiz vérifie le DNS dans la foulée et émet ton certif SSL Let's Encrypt sans aucune action supplémentaire
- **URLs propres** sur ton domaine : `ma-marque.com/mon-quiz` au lieu de `quiz.tipote.com/q/mon-quiz` — sans préfixe, sans paraître "hébergé chez Tiquiz"
- **Un seul domaine pour tous tes contenus** : quiz, sondages, popquiz, tout est servi depuis ton hostname. L'éditeur de chaque contenu te laisse choisir entre tes domaines via un dropdown (ton custom est pré-sélectionné puisque tu l'as payé)
- **Sécurité par défaut** : un autre créateur ne peut pas réclamer un domaine déjà connecté chez toi, ni servir son propre contenu via ton hostname (vérification ownership automatique)
- **Backwards-compat** : les URLs déjà partagées (`quiz.tipote.com/q/...`, `/p/...`) continuent de fonctionner — personne ne perd l'accès à un lien existant

## 8. Plans & tarification

### Free — 0€
- **1 quiz max** + 1 sondage max + **1 popquiz max**
- 10 réponses (leads) visibles par mois — les suivantes restent capturées mais en flou jusqu'à upgrade
- Auto-reset 30 jours
- Tous les modules accessibles (génération IA, embed, partage, Systeme.io)
- **Idéal pour** : tester un premier lead-magnet

### Lifetime — 57€ (paiement unique)
- **Quiz / sondages / popquiz illimités**
- **Leads illimités**
- Toutes les fonctionnalités
- Pas d'abonnement, pas de renouvellement
- **Idéal pour** : un créateur qui veut un outil propriétaire à vie sans frais récurrents
- **C'est le best-seller**

### Monthly — 17€/mois
- Idem Lifetime mais en mensuel
- Annulable à tout moment
- **Idéal pour** : tester sur 1-3 mois avant de switcher en lifetime, ou pour un usage saisonnier

### Yearly — 170€/an
- Idem, économie de 34€/an vs mensuel (2 mois offerts)
- **Idéal pour** : un usage régulier, sans s'engager à vie

### Pricing rationale (à utiliser dans la com)
- Tiquiz est à 17€/mois quand Typeform démarre à 25€/mois et ScoreApp à 60€/mois (et monte jusqu'à 83€ et 200€)
- L'option **Lifetime à 57€** est unique sur le marché — chez les concurrents c'est ~600€ de lifetime ou pas du tout
- Aucun crédit IA en lifetime — la génération IA reste illimitée

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
| « Pourquoi pas Tipote tant qu'à faire ? » | Tipote a 7 modules. Si tu ne veux QUE du quiz, Tiquiz est moins cher (57€ lifetime vs 19-99€/mois) et focalisé. Tu peux toujours upgrader vers Tipote plus tard. |
| « 57€ lifetime ça paraît louche » | C'est le pricing de la version focalisée d'un outil mature (Tipote en prod depuis 2024). On n'a pas besoin d'abonnement parce qu'on revend déjà sur Tipote. |
| « Je suis pas tech, je vais pas y arriver » | Onboarding 5 minutes, pas de prompts à écrire, pas d'API à configurer. Si tu sais utiliser Systeme.io, tu sais utiliser Tiquiz. |
| « Mes leads vont être perdus si vous fermez ? » | Export CSV à tout moment. Et chaque lead est aussi poussé dans Systeme.io en temps réel — donc tu as une copie chez Systeme.io de toute façon. |
| « Le quiz IA va sortir n'importe quoi » | Étape brainstorm conversationnel avant génération pour cadrer. Et tu peux modifier chaque texte inline. La génération est un point de départ, pas un point final. |

## 12. CTAs

### CTAs primaires
- « Créer mon premier quiz gratuitement »
- « Tester l'IA en 30 secondes »
- « Voir un exemple de quiz »

### CTAs secondaires
- « Connecter Systeme.io »
- « Voir le mode Popquiz vidéo »
- « Comparer avec Typeform »

### CTAs upsell (free → lifetime)
- « Débloquer les leads cachés »
- « Passer à l'illimité — 57€ une seule fois »

## 13. Données chiffrées à mentionner

- **5 minutes** pour créer un quiz fonctionnel
- **30 secondes** de génération IA
- **17€/mois** quand les concurrents anglais démarrent à 25€ et 60€
- **57€ une seule fois** (option lifetime)
- **5 langues UI** + **8 variantes quiz public** + RTL arabe
- **2 GB max** par upload vidéo (popquiz)
- **6 réseaux** de partage (Facebook, X, LinkedIn, WhatsApp, Telegram, email)
- **3 couches de sécurité** sur les leads (DB + app + défense)

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
