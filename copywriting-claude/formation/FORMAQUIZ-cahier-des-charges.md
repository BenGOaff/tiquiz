# FormaQuiz : cahier des charges de l'espace membre

> Spec fonctionnelle et technique d'un espace membre codé sur ton serveur. Pensée pour être donnée à ton assistant de code. Pas une formation classique : un parcours sous forme de quiz géant, composé de petits quiz quotidiens qui SONT le contenu.
>
> Conventions à respecter (les tiennes) : tutoiement, zéro tiret long dans tout contenu user-visible, Supabase + RLS, pattern webhook Systeme.io comme sur Tiquiz, migrations SQL avec IF NOT EXISTS + NOTIFY pgrst, ne jamais inventer d'URL. Reprends ton AGENTS.md et tes pitfalls habituels.

---

## 1. Le principe en une phrase

L'élève ne suit pas une formation, il avance dans un FormaQuiz : chaque jour, une page simple avec une vidéo, des ressources, et un quiz dont les questions le font agir sur SON projet. Finir le quiz du jour débloque le suivant. Un coach IA est dispo s'il bloque.

La règle d'or pédagogique : **la vidéo enseigne, le quiz fait agir et débloque.** Jamais de QCM de culture générale. Les questions sont des questions d'action et de décision sur le projet réel de l'élève.

---

## 2. Périmètre

**Ce que c'est :**
- Un espace membre web, authentifié, avec un parcours linéaire de jours (FormaQuiz).
- Un moteur de quiz quotidien dont les réponses sont stockées (elles forment le carnet de bord de l'élève).
- Un déblocage progressif (jour N complété debloque jour N+1).
- Un coach IA en bulle, nourri du contenu du challenge.
- Une gamification basée sur les vrais résultats (leads captés), pas sur des étoiles.

**Ce que ce n'est pas :**
- Ce n'est pas Tiquiz ni Tipote. C'est une app séparée qui s'intègre à Tiquiz (l'élève utilise le vrai Tiquiz pour créer SON quiz lead-magnet pendant les missions) et à Systeme.io (paiement et accès).
- On ne modifie pas le code de Tiquiz. On peut lire ses données (analytics leads) via un endpoint dédié, en lecture seule.

---

## 3. Décision d'architecture : le moteur de quiz

Tu codes l'espace membre, donc tu as deux options pour les quiz quotidiens du parcours. À trancher en connaissance de cause :

**Option A (recommandée) : moteur de quiz natif dans l'espace membre.**
- Tu construis un composant quiz natif. Avantage : contrôle total sur la capture des réponses (le carnet), le déblocage, le contexte donné au coach, la gamification, le tout dans une seule base de données.
- L'expérience "quiz" est préservée (même feeling), et l'élève utilise le VRAI Tiquiz en parallèle pour créer son propre quiz lead-magnet dans les missions.

**Option B : embarquer de vrais quiz Tiquiz (iframe).**
- Dogfooding maximal (l'élève est littéralement dans un quiz Tiquiz pendant qu'il apprend), mais tu dépends des données Tiquiz pour savoir qui a complété quoi et pour récupérer les réponses dans le carnet. Plus de couplage, moins de contrôle.

**Recommandation :** Option A pour les quiz quotidiens du parcours, et UN vrai quiz Tiquiz embarqué au tout début (le quiz de diagnostic d'entrée) pour que l'élève goûte le vrai produit dès la première minute. Le meilleur des deux mondes.

---

## 4. Stack et intégrations

- **App** : ton stack habituel (Next.js + Supabase), sur ton serveur. Nouveau projet séparé.
- **Auth** : Supabase Auth. RLS sur toutes les tables.
- **Paiement et accès** : checkout via Systeme.io (page de vente sur tipote.fr). Webhook entrant Systeme.io vers l'app pour créer/activer l'accès au FormaQuiz, exactement comme le webhook qui upgrade les plans Tiquiz. URL du webhook et domaine à définir, ne pas inventer.
- **Coach IA** : appel à une API LLM (Claude). Base de connaissance = les fichiers de ce dossier formation. Voir section 9.
- **Lecture des résultats Tiquiz** (gamification, v2) : endpoint en lecture seule côté Tiquiz qui renvoie le nombre de leads de l'élève, si l'élève a lié son compte Tiquiz. Lecture uniquement, jamais d'écriture sur les compteurs Tiquiz.

---

## 5. Le parcours apprenant (flow bout en bout)

1. L'élève achète via Systeme.io. Le webhook crée son accès et son compte.
2. Première connexion : le quiz de diagnostic Tiquiz embarqué. Il le segmente (niveau, niche, objectif). Réponses stockées.
3. Il atterrit sur son tableau de bord parcours : sa progression, le jour débloqué, son plan personnalisé issu du diagnostic.
4. Jour 1 : page avec vidéo + ressources + quiz du jour + bulle coach.
5. Il répond au quiz du jour (questions d'action sur son projet). Réponses stockées dans son carnet.
6. Page de résultat du jour : son plan d'action du jour + le bouton qui débloque le jour suivant (drip : disponible le lendemain, ou immédiat selon ton choix, voir section 7).
7. S'il bloque à tout moment, il ouvre la bulle coach.
8. Au fil des jours, son carnet se remplit, ses livrables se génèrent (section 8), ses vrais chiffres montent (section 10).
9. Jour 7 : son quiz lead-magnet est publié sur le vrai Tiquiz. Jour 14 : parcours terminé, bilan, suite proposée.

---

## 6. Anatomie d'une journée (la page type)

Une seule template de page, réutilisée pour les 14 jours, alimentée par les données du jour :

- **En-tête** : numéro du jour, titre, barre de progression du parcours.
- **Vidéo** : le lecteur (la vidéo du jour, hébergée où tu veux). C'est elle qui enseigne.
- **Ressources** : liens et fichiers utiles du jour (templates, swipe file, séquences email).
- **Le quiz du jour** : 3 à 6 questions d'action/décision sur le projet de l'élève. Voir section 7 pour les types.
- **Page de résultat** : récap personnalisé, plan d'action du jour, livrable généré si applicable, bouton "débloquer le jour suivant".
- **Bulle coach IA** : en bas à droite, persistante sur toute la page.

---

## 7. Le moteur de quiz quotidien

**Types de questions autorisés (et seulement ceux-là) :**
- **Action / saisie** : "Colle ici l'angle de ton quiz." (texte libre, stocké dans le carnet)
- **Décision** : "Lequel de ces 3 formats colle à ta cible ?" (choix, oriente la suite)
- **Auto-évaluation** : "Où en es-tu sur cette étape ?" (sert à adapter le coach et le plan)
- **Rappel léger** : une question de compréhension simple, pour ancrer (effet de test). Jamais de piège, jamais de la trivia.

**Interdit :** les QCM de culture générale type "quelle est la définition de X". Ça tue le concept.

**Capture :** chaque réponse est stockée, rattachée à l'élève et au jour. C'est la matière du carnet (section 8).

**Méta-pédagogie (atout unique) :** dans la vidéo, tu peux pointer les questions elles-mêmes comme exemples ("la question que tu viens de lire, c'est exactement le type de question que tu mettras dans TON quiz"). L'élève apprend à faire des quiz en faisant un quiz.

**Logique de déblocage :**
- Compléter le quiz du jour pose un statut "jour N complété" et débloque le jour N+1.
- Drip : tu choisis entre déblocage immédiat (l'élève peut binger) ou déblocage le lendemain (rythme, anti-abandon par surcharge). Recommandation : déblocage le lendemain par défaut, avec une option "tout débloquer" pour les pressés (à toi de voir selon le positionnement).
- L'élève peut toujours revenir sur un jour déjà fait (relecture, modif de ses réponses).
- Déblocage sur complétion, pas sur score. On entraîne, on ne recale pas.

---

## 8. Le carnet de bord (les réponses qui deviennent des livrables)

- Les réponses aux quiz quotidiens alimentent un carnet consultable par l'élève (une page dédiée).
- À des jalons clés, le carnet génère des livrables prêts à coller, à partir des réponses :
  - le brief à 3 couches pour la génération Tiquiz,
  - les 3-4 résultats nommés + tags,
  - les séquences email pré-remplies avec sa niche et son offre.
- La génération de ces livrables se fait via l'API LLM (même brique que le coach, section 9), avec les réponses de l'élève en entrée.
- Résultat : l'élève ne remplit pas des templates vides, son projet s'écrit au fil de ses réponses.

---

## 9. Le coach IA

**Rôle :** répondre aux questions des élèves 24/7 et générer les livrables du carnet.

**Architecture :**
- Appel à une API LLM (Claude).
- Base de connaissance = les fichiers de ce dossier formation (modules 00 à 08, swipe file, séquences, pépites, FAQ à écrire).
- Pour maîtriser le coût et l'hallucination : scope le contexte au contenu du jour courant + une FAQ globale, plutôt que tout balancer à chaque fois. RAG (embeddings) si le volume grandit.
- Le coach connaît le contexte de l'élève : sa niche, son niveau, ses réponses précédentes (passées dans le prompt).

**Garde-fous (non négociables, ta ligne) :**
- Répond uniquement à partir du contenu fourni. S'il ne sait pas : il le dit et renvoie vers toi ou la communauté. Jamais d'invention de méthode ou de chiffre.
- Tutoiement, ton chaleureux et direct, zéro fausse urgence, zéro promesse de résultat chiffré.
- Zéro tiret long dans ses réponses (même règle que ton contenu produit).
- L'IA assiste, elle ne te remplace pas : elle débloque et accélère, tu restes la référence.

**UI :** bulle en bas à droite, historique de conversation par élève, persistante.

**Contrôle des coûts :** limite de messages par jour et par élève (à définir), cache des réponses fréquentes, contexte scopé.

---

## 10. La gamification réelle (anti-vanité)

- Les points ne sont pas des étoiles, ce sont les vrais résultats : leads captés, partages, ventes.
- **MVP** : l'élève saisit ses chiffres (lus dans ses analytics Tiquiz) ou poste une capture. Simple, honnête.
- **v2** : récupération automatique via l'endpoint lecture seule Tiquiz, si l'élève a lié son compte. Lecture uniquement.
- **Jalons / badges** : quiz publié (J7), premier lead, 10 leads, première vente. Liés à des faits réels.
- **Classement communauté** : opt-in, basé sur les vrais chiffres. Pas obligatoire (respect de ceux qui ne veulent pas s'exposer).
- Garde le ton bienveillant : on célèbre les résultats, on ne shame personne.

---

## 11. Modèle de données (point de départ Supabase)

À adapter, mais voici une base saine :

- `users` (via Supabase Auth) : profil, niche, niveau, lien compte Tiquiz optionnel.
- `enrollments` : accès au FormaQuiz, statut, date, source paiement Systeme.io.
- `days` : contenu de chaque jour (numéro, titre, url vidéo, ressources, ordre, règle de drip).
- `questions` : questions d'un jour (type, intitulé, options, ordre).
- `answers` : réponse d'un élève à une question (user_id, day, question_id, valeur, timestamp). C'est le carnet.
- `progress` : statut par jour et par élève (débloqué, en cours, complété, date).
- `deliverables` : livrables générés (user_id, type, contenu, date).
- `coach_threads` et `coach_messages` : historique du coach par élève (avec compteur pour le rate limit).
- `metrics` : chiffres réels de l'élève (leads, partages, ventes), saisis ou importés.
- `badges` : jalons débloqués par élève.

Migrations : IF NOT EXISTS, NOTIFY pgrst en fin, RLS sur tout. Comme d'habitude chez toi.

---

## 12. Pages et écrans

- **Connexion / inscription** (Supabase Auth).
- **Quiz de diagnostic d'entrée** (Tiquiz embarqué).
- **Tableau de bord parcours** : progression, jour débloqué, plan perso, accès carnet et classement.
- **Page du jour** (template unique, section 6).
- **Page de résultat du jour** (récap + plan + déblocage).
- **Carnet de bord** : toutes les réponses + livrables générés.
- **Classement / communauté** (opt-in).
- **Profil** : niche, niveau, lien compte Tiquiz, préférences.
- **Admin (toi)** : créer/éditer les jours, vidéos, questions, ressources ; voir la progression des élèves ; modérer.

---

## 13. Accès et paiement

- Vente via Systeme.io (page tipote.fr). À la confirmation de paiement, webhook entrant vers l'app qui crée l'enrollment et l'accès.
- Réutilise le pattern de webhook signé Systeme.io déjà en place sur Tiquiz (vérification de signature, idempotence).
- Gère les cas : accès accordé, accès révoqué (remboursement), upgrade éventuel.

---

## 14. Sécurité

- Auth Supabase + RLS sur toutes les tables (un élève ne voit que ses données).
- Contenu des jours protégé (pas accessible sans enrollment actif).
- Webhook Systeme.io signé et idempotent.
- Coach IA : rate limit par élève, garde-fous de prompt, pas de données sensibles dans le contexte.
- Endpoint lecture Tiquiz : lecture seule, scoping strict au compte lié, jamais d'écriture.

---

## 15. Phasage MVP puis v2

**MVP (lance la première promo avec ça) :**
- Auth + accès via webhook Systeme.io.
- Quiz de diagnostic d'entrée + segmentation.
- Les 14 jours : page type (vidéo + ressources + quiz natif), déblocage progressif.
- Capture des réponses (carnet brut, sans génération auto).
- Coach IA basique (contexte du jour + FAQ, garde-fous).
- Gamification MVP : saisie manuelle des chiffres + jalons.

**v2 :**
- Génération auto des livrables depuis le carnet.
- Récupération auto des chiffres via l'endpoint Tiquiz.
- Classement communauté.
- RAG pour le coach si le volume l'exige.
- Plan personnalisé avancé (parcours débutant/avancé différenciés).

---

## 16. Garde-fous et conventions (rappel)

- Tutoiement partout.
- Zéro tiret long dans tout contenu user-visible (scan avant chaque commit qui touche au contenu).
- Anti-hallucination du coach strict.
- Pas de promesse de chiffre, promesse de système.
- Ne jamais inventer d'URL (domaines à définir avec toi).
- Reprends tes conventions Supabase, webhook, migrations, sécurité déjà documentées.

---

## 17. Checklist de build (ordre conseillé)

1. Schéma Supabase + RLS + migrations.
2. Auth + webhook Systeme.io (accès).
3. Admin minimal pour créer un jour (vidéo + ressources + questions).
4. Page du jour + moteur de quiz natif + capture des réponses.
5. Déblocage progressif + tableau de bord parcours.
6. Quiz de diagnostic d'entrée (Tiquiz embarqué) + segmentation.
7. Coach IA (API LLM + base de connaissance + garde-fous + bulle UI).
8. Gamification MVP (saisie chiffres + jalons).
9. Tests de bout en bout (achat fictif, parcours complet, coach, déblocage).
10. v2 (génération livrables, import chiffres, classement).

---

## Note finale

Ce que tu construis là n'est pas un espace membre de plus. C'est la démonstration vivante de Tiquiz : tes élèves apprennent les quiz en avançant dans un quiz. Le format porte le message, le message vend le produit, et le produit livre le résultat. Tout est cohérent.

Tout le contenu déjà écrit dans ce dossier s'emboîte : les scripts deviennent les vidéos du jour, les missions deviennent les questions des quiz, les pépites et les hacks restent, les séquences email restent. On ne jette rien.

Prochaine étape : le prototype complet du Jour 1 (la page, la vidéo, les questions exactes du quiz, la page de résultat, les ressources), pour valider le modèle avant de décliner les 14.
