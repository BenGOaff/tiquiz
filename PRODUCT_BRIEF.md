# Brief produit Tiquiz, pour génération de contenu de vente

> Ce document est destiné à un agent IA qui produit des landing pages, séquences emails, posts sociaux, scripts vidéo, ads ou pages de vente pour Tiquiz. Il est rédigé pour être consommé directement par une IA générative : structuré, factuel, sans verbiage.
>
> Pour la documentation technique destinée aux développeurs, voir `CAHIER_DES_CHARGES.md` et `docs/INVARIANTS.md`.

---

## 1. Identité

- **Nom du produit** : Tiquiz
- **Domaine** : quiz.tipote.com (sous-domaine de Tipote, mais vendu comme produit autonome)
- **Tagline courte** : « Le quiz lead-magnet le plus simple à créer »
- **Pitch en une phrase** : Tiquiz transforme un quiz interactif en machine à leads, branchée à Systeme.io en un clic.
- **Pitch en trois phrases** : Créer un quiz lead-magnet qui convertit demande normalement deux jours de travail et trois outils branchés ensemble. Avec Tiquiz, tu donnes trois mots à l'IA, tu as un quiz complet en 30 secondes, branché à Systeme.io en automatique. Et tes prospects qui partagent leur résultat te ramènent leurs amis, déjà taggés.
- **Positionnement vis-à-vis de Tipote** : Tiquiz est le module quiz autonome de la plateforme Tipote. Pour les créateurs qui ne veulent QUE du quiz (pas de stratégie, pas de réseaux sociaux, pas de pages), Tiquiz est l'offre dédiée : moins chère, focalisée.

## 2. Public cible

### 2.1. Cible principale

- **Solopreneur francophone** (FR, BE, CH, CA), 25 à 50 ans, déjà sur Systeme.io.
- Vend des **prestations de service** (coaching, conseil, formations) ou anime une **communauté payante**.
- A déjà essayé Typeform, Tally, Outgrow, ScoreApp : soit trop cher, soit trop technique, soit pas connecté à Systeme.io.
- A besoin d'un **lead magnet renouvelable** (« Quel type de X es-tu ? ») pour son funnel d'acquisition.
- Niveau technique **non-tech** : doit pouvoir créer et publier en 5 minutes sans tutoriel.

### 2.2. Cibles secondaires

- **Coachs internationaux** (EN, ES, IT, PT, AR) qui veulent un quiz multilingue clé en main.
- **Créateurs de contenus vidéo** (YouTube, TikTok) qui veulent embarquer un quiz dans leurs vidéos (cas d'usage Popquiz).
- **Solopreneurs multi-activités** (cible des paliers premium) : un même créateur qui anime plusieurs marques ou niches en parallèle, veut un seul compte, plusieurs projets isolés, plusieurs clés Systeme.io. Type : « j'ai trois audiences différentes et je ne veux pas mélanger leurs tags, leur branding ni leurs stats. »
- **Revendeurs et partenaires** qui veulent proposer Tiquiz en marque grise à leurs propres clients (programme revendeur en gros).

### 2.3. Anti-cible

- Grandes entreprises avec des process de validation marketing complexes.
- Marketers qui veulent un constructeur de quiz ultra-personnalisable avec logique conditionnelle avancée (Tiquiz est volontairement simple).

## 3. Promesse principale

**« Un quiz qui capture, qualifie et tague tes leads, créé en 5 minutes. »**

Variations selon le canal :
- *(Email, landing)* : « Crée ton quiz, partage le lien, regarde les leads taggés arriver dans Systeme.io. C'est tout. »
- *(Ads court)* : « Le quiz lead-magnet branché à Systeme.io, 5 minutes chrono. »
- *(Social)* : « Tu donnes trois mots à l'IA, tu as un quiz prêt à capturer des leads. »

## 4. Pain points résolus

| Pain | Ressenti | Réponse Tiquiz |
|---|---|---|
| « Typeform c'est joli mais ça segmente pas mes leads » | Tu collectes des emails sans contexte | Tag Systeme.io différent par résultat, par réponse, à la capture et au partage : tu sais qui pense quoi |
| « ScoreApp marche bien mais c'est cher et c'est en anglais » | Prix élevé, barrière de langue | Tiquiz : à partir de 17 €/mois, en français, intégration Systeme.io native |
| « J'arrive pas à faire circuler mon quiz » | Friction de partage | Slug court personnalisé, boutons de partage natifs, étape « partage = bonus », carte de résultat partageable |
| « Mes leads sont dans Systeme.io mais je sais pas qui a fait quoi » | Aveugle | Tag par capture, par partage, par résultat, par option de réponse |
| « Je veux un quiz dans MA langue avec MA marque » | Outils anglais, pas brandables | UI en 7 langues, quiz public multilingue (dont tu/vous et arabe RTL), branding par quiz (police, couleurs, logo, favicon), thèmes et fonds riches |
| « Mes prospects abandonnent à mi-quiz » | Taux de complétion faible | Présentation soignée type Typeform, transitions fluides, mode « bonus de partage » avec anti-triche réelle, résultats riches et personnalisés |
| « J'ai pas envie de coder un embed sur mon site » | Friction technique | URL courte, domaine perso, iframe prête à coller (notamment Popquiz vidéo) |
| « J'ai deux marques et tout est mélangé » | Comptes séparés ingérables | Multiprofils : un seul login, plusieurs projets isolés (stats, branding, clés Systeme.io), switch en un clic (paliers premium) |
| « Mes leads viennent en masse, j'ai pas le temps d'analyser » | Données mortes | Analyse IA des réponses agrégées : Claude fait ressortir patterns et segments (paliers premium) |
| « Je veux changer de plan sans double facturation » | Friction d'upgrade | Changement de plan en un clic : l'ancien abonnement Systeme.io est auto-annulé, aucun chevauchement |
| « Je veux vendre Tiquiz à mes clients sous ma marque » | Pas d'outil de revente | Programme revendeur : comptes isolés, facturation automatisée, taux dégressif au volume |

## 5. Différenciateurs

### vs Typeform
- **Tag Systeme.io natif** par résultat, sans Zapier.
- **Nettement moins cher** (à partir de 17 €/mois).
- **Génération IA** : tu décris ton quiz en une phrase, l'IA crée tout.
- **Pensé lead magnet** : viralité, partage, anti-triche, résultats personnalisés.

### vs ScoreApp, Interact
- **Français, intégration Systeme.io native.**
- **Le scoring multi-axes est inclus** : score sur 100, jauge, barres par axe, tranches, tags par niveau. Pas besoin d'un outil dédié au diagnostic en plus du quiz par profil.
- **UI en 7 langues, quiz public multilingue** (dont arabe RTL).
- **Module Popquiz vidéo** (vidéo avec quiz incrustés à des timestamps) que les concurrents ne proposent pas.

### vs Tally, Google Forms
- **Pas un formulaire, un quiz** : résultats personnalisés, quiz scoré multi-axes, sondage, mécaniques de gamification, mémo persistant.
- **Branding par quiz** sans toucher au CSS : 9 polices, palette générée depuis ta couleur, 9 thèmes, 8 dégradés, image de fond, dispositions variées (carte/couverture, questions centrées/gauche/deux colonnes), design par défaut réutilisable.
- **Contenu généré par l'IA dans plus de 100 langues**, avec variantes de genre et personnalisation au prénom.
- **Détecteur d'ex-aequo** et rééquilibrage IA des résultats : un vrai moteur de quiz, pas juste des champs.

### vs Tipote (la plateforme parente)
- Tiquiz **n'a pas** : coach IA, crédits IA, réseaux sociaux, automations, constructeur de pages, contenus génériques.
- Tiquiz **a** : tout le module quiz, sondage et popquiz, plus simple à appréhender pour qui ne veut QUE du quiz.
- Pricing Tiquiz plus bas.
- Tiquiz partage avec Tipote le multiprofils et l'analyse IA, sur son périmètre.

## 6. Workflow utilisateur (storytelling produit)

### Créer un quiz (5 minutes chrono)
1. À l'inscription, sans quiz existant, l'utilisateur voit six templates phares sur son dashboard et publie son premier quiz en un clic.
2. Sinon, il va sur la page de création et choisit : **IA** (décrit le quiz en une phrase), **Import** (un document .txt, .docx ou .pdf existant), **Manuel** (vierge) ou **Templates** (15 modèles métier).
3. Le mode IA peut déclencher un brainstorm conversationnel qui cadre l'idée avant la génération.
4. Génération en streaming (environ 30 secondes) : titre, intro, questions, résultats avec storytelling personnalisé.
5. Édition WYSIWYG inline : tous les textes sont éditables au clic ; polices Google, couleurs, thèmes, fonds, images.
6. Onglet Partage : tags Systeme.io par résultat, tag de partage, bonus de viralité, anti-triche.
7. Publier en un clic vers une URL courte personnalisée (ou son propre domaine).

### Le visiteur prend le quiz
1. Page publique responsive au branding du créateur (fond, thème, couleurs, logo).
2. Personnalisation (prénom, forme grammaticale) injectée dans les textes si activée.
3. Questions une par une, transitions fluides, navigation clavier et swipe mobile.
4. Capture email et champs additionnels configurables, avant ou après les questions.
5. Étape « bonus de partage » optionnelle (« partage pour débloquer ton bonus »), avec image, mockup ou GIF.
6. Résultat personnalisé, CTA propre par résultat, carte de résultat partageable et confettis.
7. En coulisses : tags Systeme.io appliqués automatiquement, qui déclenchent les automatisations du créateur.

### Créer un Popquiz (vidéo interactive)
1. L'utilisateur va sur la page de création popquiz.
2. Il importe une vidéo (YouTube, Vimeo ou upload propre jusqu'à 20 Go).
3. Il choisit dans son catalogue les quiz à incruster et place les cues sur la timeline.
4. Il publie : URL courte et snippet d'embed iframe à coller sur son site.
5. Le visiteur regarde la vidéo, chaque cue affiche le quiz par-dessus, la vidéo reprend après réponse.
6. Les quiz référencés sont automatiquement activés à la publication.

## 7. Catalogue de fonctionnalités (par bénéfice)

### 7.1. Création
- **Cinq façons de démarrer** : génération IA, import de document (.txt, .docx, .pdf), manuel, template, ou quiz phare en un clic à l'inscription.
- **Brainstorm IA conversationnel** pour cadrer un brief flou.
- **Génération complète** en streaming (titre, questions, options, résultats, storytelling). L'IA génère aussi bien un quiz par profil qu'un quiz scoré complet (axes au choix, tranches de score calculées automatiquement, jamais de trou entre les tranches).
- **Trois formats** : quiz par profil, quiz scoré (diagnostic avec score sur 100, tranches de résultat, et jusqu'à 6 axes thématiques), sondage. À la création manuelle, un choix clair en deux cartes : par profil ou scoré.
- **Quiz scoré, côté visiteur** : grande jauge du score (en pourcentage ou en mots : bas, moyen, élevé), barres de score par axe (ex : sommeil 50/100, alimentation 20/100, émotions 80/100), message de résultat par tranche.
- **Variables de score** : {score}, {label} et leurs variantes par axe s'insèrent en un clic dans les textes de résultat et le lien du bouton.
- **Tags Systeme.io par tranche de score** (option) : segmente tes emails selon le niveau global ou par axe.
- **Types de questions variés** : choix multiple (mono ou multi-réponses), échelle, étoiles, oui/non, choix par image, réponse libre (texte d'invite personnalisable avec l'éditeur riche).
- **Éditeur WYSIWYG** : édition inline, sidebar à onglets, preview live, autosave, taquet de largeur pour la disposition en colonnes.
- **Détecteur d'ex-aequo** (profil) et **détecteur de couverture des tranches** (scoré) : l'éditeur prévient avant publication si un résultat est inatteignable ou si des scores tombent dans un trou.
- **Rich text** : gras, italique, alignement, listes, liens, images, color picker.
- **Outils IA dans l'éditeur** : réécriture d'un texte (3 propositions), rééquilibrage des résultats, variantes grammaticales, duplication.
- **Personnalisation dynamique** : prénom et forme grammaticale injectés dans les textes.
- **Notifications** : email à chaque nouveau lead (activable).

### 7.2. Branding et présentation
- **9 polices Google**, couleur primaire, couleur de fond, couleur de texte, logo, favicon.
- **Générateur de palette** : à partir d'une seule couleur de marque, l'outil dérive une palette cohérente.
- **9 thèmes prêts à l'emploi** et fonds riches : uni, 8 dégradés, ou image plein cadre (avec surface de lecture lisible par-dessus).
- **Dispositions** : accueil en carte ou en couverture plein écran ; questions centrées, à gauche ou en deux colonnes (type Typeform) ; réponses en auto, grille ou liste ; formes de boutons ; panneau latéral à motifs.
- **Design par défaut du projet** : enregistre tes réglages comme modèle, chaque nouveau quiz démarre déjà à ta marque.
- **Responsive** : mise en page centrée et lisible sur tous les écrans (mobile, 16:9, écrans hauts) ; texte qui s'adapte en clair ou sombre selon le fond.
- Image et description OG par quiz ; footer personnalisable (mets ton propre lien, ou retire complètement la mention Tiquiz sur les plans payants).
- **Formes d'adresse** par quiz : tu ou vous.

### 7.3. Capture et viralité
- **Lead magnet** : email, prénom, nom, téléphone, pays (champs activables), capture avant ou après les questions.
- **Tags Systeme.io** : capture, partage, par résultat (plusieurs possibles), par réponse.
- **Étape de viralité** : partage sur Facebook, X, LinkedIn, WhatsApp, Telegram, email, copie de lien.
- **Anti-triche réelle** : partage natif sur mobile, polling de fenêtre sur desktop, durée minimale et confirmation pour la copie de lien.
- **Visuel de bonus** : image, mockup ou GIF ; message de bonus personnalisable.
- **Carte de résultat partageable** et confettis.
- **Recommencer** et **fermeture de quiz** (redirection ou message avec CTA).

### 7.4. Module Popquiz
- Vidéo source YouTube, Vimeo ou upload propre (jusqu'à 20 Go).
- Cuepoints à un timestamp précis, comportement bloquant ou optionnel.
- Embed iframe copiable pour n'importe quel site.
- Auto-activation des quiz référencés à la publication.
- Vignette automatique ou personnalisée, player enrichi (vitesse, saut, Picture-in-Picture).

### 7.5. Intégration Systeme.io
- Clé API utilisateur (une par plan de base, plusieurs sur les paliers premium).
- Auto-tagging à la conversion : capture, partage, résultat, réponse.
- Création et mise à jour du contact en temps réel, inscription formation, ajout communauté.
- Webhook entrant qui gère automatiquement le plan du créateur.
- Documentation in-app pour créer tags et automatisations.

### 7.6. Multilingue
- **UI admin en 7 langues** (FR, EN, ES, IT, AR, PT Portugal, PT Brésil), avec RTL arabe.
- **Contenu de quiz générable dans plus de 100 langues** (19 mises en avant), l'IA produit questions et résultats directement dans la langue choisie.
- **Quiz public multilingue**, dont formes tu et vous du français, et variantes de genre adaptées par langue.
- Typographie française correcte (espaces insécables) appliquée au save et au render.

### 7.7. Analytics
- **Funnel par quiz** : vues, démarrages, complétions, partages, conversions.
- **Drop-off par question** et distribution des leads par résultat.
- **Insights et analyse IA** (paliers premium) sur les réponses agrégées.
- **Export** des leads, filtres KPI sur la page leads, source de chaque lead.

### 7.8. Sécurité des leads
- Trois couches indépendantes garantissent qu'aucun lead ne disparaît, même si le créateur efface des résultats.
- Auth Supabase et RLS sur toutes les tables.
- Webhooks Systeme.io signés (HMAC), secrets sensibles chiffrés at rest.

### 7.9. Multiprofils (paliers premium)
- **Plusieurs projets dans un seul compte** : chaque projet est un espace autonome (quiz, leads, stats, branding, positionnement, clés Systeme.io isolés).
- **Switch en un clic** depuis le header, avec identité visuelle (couleur et emoji).
- **Un nouveau projet démarre vide** : stats à zéro, branding à customiser, pas d'héritage.
- **Multi-clés Systeme.io** : une clé différente par projet.
- **Filet de sécurité** : un quiz en ligne ne perd jamais son branding visuellement.

### 7.10. Analyse IA des résultats (paliers premium)
- Synthèse automatique des réponses agrégées par Claude, sur quiz et sondages.
- Cas d'usage : « 200 personnes ont fait mon quiz, qu'est-ce qui ressort vraiment ? » L'IA dégage patterns, segments et insights actionnables.

### 7.11. Templates métier (15 modèles)
15 templates prêts à publier, chacun structuré en 6 questions de 4 options et 4 résultats, ton chaleureux, tutoiement, pas de jargon :

**Coaching et développement personnel** : croyance limitante (mindset), rapport à la nourriture (nutrition), fuites d'énergie (sommeil et énergie), style parental (parentalité), schéma amoureux (couple), blocage en reconversion, rapport à l'argent (finance).

**Business et créatif** : profil entrepreneur, moteur intérieur, style yoga, terrain naturopathie, prêt à lancer ta formation, levier de croissance marketing, style photo, prêt pour ton premier achat immobilier.

### 7.12. Changement de plan, annulation, remboursement
- **Monter de palier se fait en un clic**, depuis Paramètres. Sur carte, le prorata est calculé par Stripe : ce qui a déjà été payé pour le mois en cours est déduit, et le montant affiché est celui qui sera prélevé. Sur PayPal, un abonnement neuf remplace l'ancien, qui n'est arrêté qu'une fois le nouveau actif.
- **Descendre de palier est refusé, avec sa raison**, et c'est un choix : appliquer la descente tout de suite retirerait des fonctionnalités déjà payées jusqu'à la fin de la période. La sortie est dite à l'écran : arrêter l'abonnement (l'accès tient jusqu'à la date payée) et reprendre le palier voulu.
- **Annuler n'est pas rembourser.** Annuler garde l'accès jusqu'à la fin de la période payée. Rembourser rend l'argent, ferme l'accès et arrête le prélèvement.
- **L'utilisateur peut tout faire seul**, sans écrire au support.
- Ne jamais promettre "changement dans les deux sens en un clic" : la descente passe par une annulation, et le dire est plus honnête que de le laisser découvrir.

### 7.13. Domaines personnalisés
- **Connecte ton propre domaine** : n'importe quel sous-domaine que tu contrôles.
- **Setup rapide** : un seul CNAME chez ton registrar (détecté automatiquement avec instructions sur-mesure), Tiquiz vérifie le DNS et émet le certificat SSL sans action supplémentaire.
- **URLs propres** sur ton domaine, sans préfixe et sans paraître hébergé chez Tiquiz.
- **Un seul domaine pour tous tes contenus** (quiz, sondages, popquiz), avec sélecteur de domaine dans l'éditeur.
- **Sécurité** : un autre créateur ne peut pas réclamer ton domaine ni servir son contenu via ton hostname.
- **Rétrocompatibilité** : les liens déjà partagés continuent de fonctionner.

### 7.14. Studio visuel
- Génération IA d'images de fond et de textes courts pour promouvoir un quiz.
- Formats prêts pour chaque réseau (carré, portrait, story, paysage), canvas d'édition, export PDF, brand kit.

### 7.15. Gamification
- Jalons (premier quiz publié, premier lead, paliers de leads), mur des réussites, objectif hebdomadaire, confettis.

### 7.16. Programme revendeur
- Un partenaire revend Tiquiz en gros à ses propres clients : chaque client a un compte isolé qui connecte son propre Systeme.io.
- Interface revendeur : créer et gérer des accès clients, compteur de comptes actifs, taux de reversement dégressif au volume, estimation de facture.
- Facturation automatisée, paiements via les propres clés Stripe ou PayPal du revendeur.

## 8. Plans et tarification

### Matrice features par plan

| Feature | Free | Mensuel (17 €) | Annuel (170 €) | Mensuel+ (29 €) | Annuel+ (290 €) | Lifetime / Beta |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Quiz actifs | 1 | illimité | illimité | illimité | illimité | illimité |
| Sondages actifs | 1 | illimité | illimité | illimité | illimité | illimité |
| Popquiz actifs | 1 | illimité | illimité | illimité | illimité | illimité |
| Réponses captées visibles | 10/mois | illimité | illimité | illimité | illimité | illimité |
| Footer et branding | limité | complet | complet | complet | complet | complet |
| Clés Systeme.io | 1 | 1 | 1 | plusieurs | plusieurs | plusieurs |
| Multiprofils | non | non | non | oui | oui | oui |
| Analyse IA des résultats | non | non | non | oui | oui | oui |

### Free, 0 €
- 1 quiz, 1 sondage, 1 popquiz.
- 10 réponses visibles par mois ; les suivantes restent captées mais floutées jusqu'à la montée en gamme.
- Auto-reset tous les 30 jours.
- Tous les modules de création accessibles (génération IA, embed, partage, Systeme.io).
- **Idéal pour** : tester un premier lead-magnet.

### Mensuel, 17 €/mois
- Quiz, sondages, popquiz illimités, leads illimités.
- 1 clé Systeme.io. Annulable à tout moment.
- **Idéal pour** : un créateur en démarrage qui veut un outil de quiz lead-magnet branché à Systeme.io.

### Annuel, 170 €/an
- Identique au Mensuel, avec l'économie de l'engagement annuel.
- **Idéal pour** : un usage régulier sans engagement à vie.

### Mensuel+, 29 €/mois
- Tout le Mensuel, plus **multiprofils**, **analyse IA des résultats** et **multi-clés Systeme.io**.
- **Idéal pour** : créateurs multi-marques ou multi-niches, ou solopreneurs qui veulent exploiter leurs réponses par l'IA.
- CTA d'upsell typique : « Débloque les multiprofils et l'analyse IA pour 20 € de plus par mois. »

### Annuel+, 290 €/an
- Tout le Mensuel+ en annuel, avec l'économie de l'engagement.
- **Idéal pour** : créateurs multi-marques installés qui veulent la stabilité de l'annuel.

### Lifetime et Beta
- Le plan Lifetime n'est plus proposé à la vente directe. Il reste équivalent aux paliers premium (multiprofils, analyse IA, multi-clés) pour les comptes qui le détiennent.
- Le plan Beta est accordé manuellement. Ne pas mettre Lifetime ou Beta en avant comme CTA.

### La commission affiliée (à dire juste)
- **Le cookie dure 1 an**, et une inscription gratuite via son lien rattache la personne à l'affilié **à vie**. Celui qui a amené le contact le garde, même si le prospect croise un autre lien plus tard.
- **Versable 30 jours après le paiement du client.** Ne jamais annoncer un autre délai : c'est celui que les affiliés connaissent.
- **40 % sur Tiquiz, versés CHAQUE MOIS** tant que la personne recommandée reste abonnée. Ce n'est pas une prime one-shot : c'est un revenu récurrent, et c'est l'argument principal.
- Le versement s'arrête si la personne arrête son abonnement ou se fait rembourser. Les mois déjà versés restent acquis.
- Le simulateur de l'espace affilié projette sur 12 mois : c'est une fenêtre de calcul, pas une limite de durée. Ne jamais écrire "pendant 12 mois".
- Ne jamais annoncer un montant mensuel garanti : la commission suit ce qui est réellement encaissé (une remise ou un changement de palier la font bouger).

### Le mois offert (argument d'affiliation)
- **30 jours offerts sur le palier choisi**, ouverts uniquement quand la personne arrive par un lien d'affiliation actuel (ceux que l'espace affilié fabrique aujourd'hui). Les anciens liens Systeme.io commissionnent normalement mais n'ouvrent pas le cadeau : un affilié qui partage un ancien lien promettrait un mois que personne ne recevrait, et c'est LUI qui passerait pour un menteur.
- C'est l'essai gratuit du fournisseur sur l'abonnement choisi, pas un palier prêté : la personne choisit son palier, n'est pas prélevée pendant 30 jours, puis paie le prix de CE palier.
- **Un seul par personne**, quelle que soit la porte. On ne peut pas cumuler le mois reçu par un affilié et celui reçu en tant qu'affilié.
- Ne jamais annoncer "sans carte" : la carte est demandée à l'ouverture, c'est le prélèvement qui attend.

### Comment on encaisse (à savoir, pas à mettre en avant)
- **Carte (Stripe) ou PayPal, sur notre propre bon de commande** `tiquiz.fr/commande/<produit>`. Les tunnels Systeme.io historiques continuent de fonctionner en parallèle.
- **La facture** : Stripe émet les siennes, et pour PayPal c'est nous (série `TQ-`), avec les quatre régimes de TVA. Une facture émise ne se modifie plus ; une erreur se corrige par un avoir.
- Ne pas écrire "paiement sécurisé par Systeme.io" sur un tunnel qui passe par nous : c'est faux, et une phrase fausse sur une page de paiement coûte la vente.

### Pricing rationale (à utiliser dans la com)
- Tiquiz est nettement moins cher que les concurrents anglais sur le plan Mensuel, et reste compétitif en Mensuel+.
- Le palier + à 29 €/mois ouvre les usages multi-marques (plusieurs comptes Systeme.io) qui coûtent bien plus cher ailleurs.
- Aucun crédit IA : la génération IA reste illimitée à tous les niveaux payants.
- **Source de vérité prix dans le code** : `lib/planLimits.ts`. Ne jamais faire diverger la com du code.

## 9. Voix de marque et ton

### Vocabulaire
- **Mots-clés à utiliser** : quiz, lead, capture, partage, tag, simple, vraiment, en un clic, sans coder, branché à Systeme.io.
- **Mots à bannir** : conversion funnel, lead generation (terme générique), saas, plateforme, solution, expertise.
- **Tutoiement obligatoire.**
- **Métaphores** : Tiquiz comme un copilote du quiz, comme un mini-Tipote dédié, comme l'extension naturelle de Systeme.io.

### Ton
- **Direct, presque sec** : on va au point, on ne raconte pas la genèse de l'outil.
- **Démontrable** : toujours « tu fais X et tu obtiens Y », jamais « tu pourrais imaginer faire X ».
- **Humble** : Tiquiz fait une chose, bien. C'est un argument de vente, pas un défaut.
- **Anti-bullshit marketing** : pas de « engagement », pas de « ROI », pas de « scaling ».

### Exemples dans la voix
- OUI : « En 5 minutes tu as un quiz qui tague tes leads dans Systeme.io. C'est tout ce que ça fait. C'est tout ce qu'il faut. »
- OUI : « Tu donnes trois mots à l'IA, elle te sort tes questions et tes résultats. Tu édites ce qui ne te plaît pas. Tu publies. »
- NON : « Découvrez la solution numéro 1 de génération de leads par quiz interactifs. »
- NON : « Boostez votre engagement avec nos quiz IA-driven. »

## 10. Preuves et garanties

### Sécurité
- **Lead safety** : trois couches indépendantes garantissent qu'aucun lead n'est perdu, même en cas d'erreur du créateur.
- Auth Supabase et RLS sur toutes les tables.
- Webhooks Systeme.io signés, secrets sensibles chiffrés.

### Fiabilité
- 7 langues UI, quiz public multilingue.
- Tests de non-régression documentés.

### Service client
- Centre d'aide et tickets partagés avec Tipote, en français. Un seul SAV pour les deux produits.

## 11. Objections fréquentes et réponses

| Objection | Réponse type |
|---|---|
| « Encore un outil de quiz, j'ai déjà Typeform » | Typeform ne tague pas tes leads dans Systeme.io. Tiquiz oui. Et Tiquiz est en français, et moins cher. |
| « Pourquoi pas Tipote tant qu'à faire ? » | Tipote a plusieurs modules. Si tu ne veux QUE du quiz, Tiquiz est moins cher et focalisé. Tu peux upgrader vers Tipote plus tard. |
| « Je suis pas tech, je vais pas y arriver » | Onboarding en 5 minutes, pas de prompts à écrire, pas d'API à configurer. À l'inscription tu choisis un template et ton quiz est prêt en un clic. |
| « Mes leads vont être perdus si vous fermez ? » | Export à tout moment. Et chaque lead est aussi poussé dans Systeme.io en temps réel : tu en as une copie de toute façon. |
| « Le quiz IA va sortir n'importe quoi » | Brainstorm conversationnel avant génération pour cadrer, et tu modifies chaque texte inline. La génération est un point de départ, pas un point final. |
| « Pourquoi payer 29 €/mois plutôt que 17 € ? » | Si tu n'as qu'une marque, reste à 17 €. Le + se justifie dès que tu gères plusieurs marques (multiprofils, une clé Systeme.io par projet) ou que tu veux faire parler tes réponses (analyse IA). |
| « Si je passe de 17 € à 29 € je vais être facturé deux fois ? » | Non. Le switch est automatique : le nouveau plan démarre, l'ancien est annulé chez Systeme.io en même temps. Aucun chevauchement. |

## 12. CTAs

### CTAs primaires
- « Créer mon premier quiz gratuitement »
- « Tester l'IA en 30 secondes »
- « Voir un exemple de quiz »

### CTAs secondaires
- « Connecter Systeme.io »
- « Voir le mode Popquiz vidéo »
- « Comparer avec Typeform »

### CTAs upsell (free vers payant)
- « Débloquer les leads cachés »
- « Passer à l'illimité, 17 €/mois »
- « Annuler à tout moment »

### CTAs upsell (Mensuel ou Annuel vers +)
- « Débloquer les multiprofils, 29 €/mois »
- « Gérer plusieurs marques dans un seul compte »
- « Activer l'analyse IA de mes réponses »
- « Connecter plusieurs comptes Systeme.io »

## 13. Données chiffrées à mentionner

- **Un clic** pour publier son premier quiz à l'inscription (template phare).
- **5 minutes** pour créer un quiz custom de A à Z.
- **30 secondes** de génération IA.
- **15 templates métier** prêts à publier.
- **7 langues UI**, contenu de quiz dans **plus de 100 langues**, RTL arabe.
- **9 thèmes**, **8 dégradés**, **9 polices**, palette générée depuis une couleur.
- **20 Go max** par upload vidéo (popquiz).
- **6 réseaux** de partage (Facebook, X, LinkedIn, WhatsApp, Telegram, email).
- **3 couches de sécurité** sur les leads.
- **Multiprofils** sur les paliers Mensuel+ et Annuel+.

## 14. Slogans réutilisables

- « Le quiz lead-magnet le plus simple à créer »
- « Tu donnes trois mots, l'IA fait le reste »
- « Branché à Systeme.io en un clic »
- « Le quiz que tes prospects partagent vraiment »
- « 5 minutes pour créer, 5 secondes pour publier »

## 15. Ce qu'il ne faut pas faire dans la com

- Ne pas vendre Tiquiz comme un challenger frontal de Typeform : positionnement « la version simple et intégrée à Systeme.io » plutôt que « l'alternative ».
- Ne pas promettre de taux de conversion garantis (cela dépend du quiz, pas de l'outil).
- Ne pas cacher la limite free (1 quiz, 10 leads) : au contraire, la présenter comme un test honnête assumé.
- Ne pas vouvoyer le prospect (tutoiement strict).
- Ne pas comparer frontalement aux modules Tipote (produit cousin, pas concurrent).
- Ne pas faire de promesse « tu vas exploser tes leads » : promesse outil, pas promesse résultat.
- Ne pas utiliser de screenshots avec une UI obsolète : vérifier la fraîcheur des assets.
</content>
