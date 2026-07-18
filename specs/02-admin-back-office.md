# L'Atelier du Quiz : spec de l'admin / back-office

> Tout ce que l'admin (Béné) doit pouvoir faire sans toucher au code ni redéployer. Le contenu vit dans la base de données, l'admin l'édite via une interface. Complète la spec technique `01-cahier-des-charges.md`.
>
> Conventions : tutoiement, zéro tiret long dans le contenu user-visible, RLS, accès admin protégé.

---

## Principe

Béné doit pouvoir tout créer et tout modifier elle-même, à la main, depuis une interface d'admin. Aucun contenu n'est codé en dur. Un déploiement ne doit jamais être nécessaire pour changer une vidéo, une question ou un texte.

Accès admin réservé à son compte (rôle admin), protégé, séparé de l'espace élève.

---

## 1. Gestion des jours du parcours

CRUD complet sur les jours :
- Créer, éditer, dupliquer, supprimer un jour.
- Champs d'un jour : numéro, titre, sous-titre, vidéo, contenu texte (intro, sections), liste de ressources, règle de déblocage (drip), statut (brouillon / publié), ordre dans le parcours.
- Réordonner les jours par glisser-déposer.
- Prévisualiser un jour comme le verrait un élève avant publication.

## 2. Upload et gestion des vidéos

- Charger une vidéo par jour depuis l'admin (la fonctionnalité la plus demandée par Béné).
- Remplacer une vidéo sans casser le jour.
- Voir l'état d'upload et de traitement.
- Option de mettre une miniature, un titre, une durée.

**Hébergement vidéo (à décider, voir recommandations) :**
- Recommandé : un service de streaming vidéo dédié (par exemple Bunny Stream, Mux, ou Cloudflare Stream) avec upload depuis l'admin et lecteur embarqué protégé. Meilleur pour le streaming, la protection du contenu et les gros fichiers.
- Plus simple mais limité : Supabase Storage, acceptable pour démarrer si les vidéos restent légères.
- Le choix final revient à Béné. Ne pas coder en dur un fournisseur sans validation.

## 3. Gestion des questions du quiz de chaque jour

CRUD complet sur les questions :
- Ajouter, éditer, réordonner, supprimer une question dans le quiz d'un jour.
- Types de questions (rappel de la règle d'or, pas de QCM trivia) :
  - Action / saisie libre (ex : "colle ici ton angle").
  - Décision / choix (oriente la suite, peut taguer l'élève).
  - Auto-évaluation (où en es-tu).
  - Rappel léger (ancrage, sans piège).
- Pour les questions à choix : définir les options, et le cas échéant le tag ou la conséquence associée.
- Marquer une question comme obligatoire ou optionnelle pour le déblocage.

## 4. Gestion des résultats / pages de fin de jour

- Éditer le texte de la page de résultat du jour (récap, plan d'action, message).
- Définir le livrable généré s'il y en a un (voir le carnet dans la spec technique).
- Personnalisation dynamique : pouvoir insérer le prénom de l'élève et des éléments de ses réponses.

## 5. Gestion des ressources

- Ajouter des ressources par jour : fichiers à télécharger (PDF, docs) ou liens.
- Les ressources de départ sont dans `contenu/ressources-eleves/` (swipe file, séquences email, pépites).
- Réordonner, renommer, supprimer.

## 6. Gestion des élèves

- Liste des élèves avec recherche et filtres.
- Voir pour chaque élève : sa progression (jour atteint, jours complétés), sa date d'inscription, sa source (Systeme.io), son statut d'accès.
- Voir son carnet de bord (ses réponses) et ses livrables générés.
- Voir ses chiffres réels (leads, partages, ventes) saisis ou importés.
- Actions : accorder ou révoquer un accès manuellement (cas de remboursement ou d'offre manuelle), réinitialiser une progression si besoin.
- Respect de la vie privée : ces données restent privées, accès admin uniquement.

## 7. Gestion du quiz de diagnostic d'entrée

- Pouvoir éditer le quiz de diagnostic (le quiz Tiquiz embarqué au début) ou, s'il est natif, ses questions et la logique de segmentation.
- Définir les segments (niveau, niche, objectif) et le plan personnalisé associé à chaque segment.

## 8. Gestion du coach IA

- Éditer la base de connaissance du coach (les documents qu'il utilise).
- Éditer son instruction / sa personnalité (dans la voix de Béné, garde-fous).
- Voir les conversations des élèves avec le coach (pour repérer les points de blocage récurrents et améliorer le contenu).
- Régler les limites (nombre de messages par élève et par jour).

## 9. Gestion de la gamification

- Définir les jalons et badges (quiz publié, premier lead, 10 leads, première vente).
- Voir le classement et pouvoir le modérer.
- Activer ou désactiver le classement public.

## 10. Tableau de bord admin (vue d'ensemble)

- Nombre d'élèves actifs, taux de complétion par jour, points de décrochage.
- Jours les plus consultés, questions où les élèves bloquent.
- Sert à améliorer le parcours dans le temps.

---

## Sécurité de l'admin

- Rôle admin strict, vérifié côté serveur, jamais déduit du seul front.
- RLS : un élève ne peut jamais accéder aux routes ni aux données admin.
- Journalisation des actions sensibles (révocation d'accès, suppression de contenu).

---

## Note d'implémentation

Le contenu (jours, questions, résultats, ressources) est stocké en base et rendu dynamiquement. L'admin est l'outil d'édition de ce contenu. Penser le modèle de données (voir spec technique, section modèle de données) pour que tout soit éditable sans redéploiement.
