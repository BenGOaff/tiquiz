# Les chantiers décidés par Béné

Ce fichier porte ce qui reste À FAIRE, dit par elle, dans ses mots.
`AGENTS.md` raconte les pannes déjà arrivées ; celui-ci dit où on va.
Deux fichiers, deux questions, et aucune des deux ne répond à l'autre.

**Règle : une ligne se coche quand elle est POUSSÉE, pas quand elle est
écrite** (leçon du 23 août : trois garde-fous décrits comme actifs ici
pendant 24 heures alors qu'ils vivaient sur une branche non fusionnée).

Dernière mise à jour : 1er septembre 2026, au soir.

---

## 1. La page de vente de Tiquiz

Sa consigne, mot pour mot : "ajouter sur la page de vente de tiquiz".

La page vit dans `content/sales/tiquiz.html` (une capture de sa page
Systeme.io, servie par `lib/sales/servePage.ts`). Toute modification s'y
fait avec les règles du 1er septembre : les destinations sont NOS routes,
les prix viennent du CATALOGUE, et on traite aussi les liens échappés du
modèle JSON.

### Ce qu'il faut AJOUTER

- **Le suivi Meta et Google est déjà intégré.** Tracker le trafic et la
  publicité sans poser une ligne de code.
- **Un quiz comme lead magnet à offrir à ses affiliés.** Ils ajoutent
  leur identifiant Systeme.io au quiz du vendeur, et leurs contacts leur
  sont attribués chez Systeme.io. (Le mécanisme existe :
  `lib/quiz/affiliateRelay.ts`, vérifié le 1er septembre avec
  `npm run check:cta-affilie`.)
- **La multi-intégration.** Le quiz s'utilise dans Systeme.io, dans
  WordPress, sur une landing, dans un blog, en autonome, ailleurs.
  L'argument est le CONTRASTE : les autres outils forcent leur page et
  leur domaine.
- **Le multilingue, et les deux chiffres ne disent pas la même chose.**
  L'interface Tiquiz existe en 5 langues ; la GÉNÉRATION écrit dans plus
  de 100 langues. Les confondre rendrait la phrase fausse dans un sens
  ou dans l'autre.
- **Le funnel quiz.** Le lead est diagnostiqué et envoyé vers la bonne
  offre selon son profil ou son niveau. "Très à la mode, et c'est ce
  qu'on fait."
- **Ce qui a été livré depuis** : les trois générateurs de contenu, et
  l'onglet Automatisation (le guide des tags Systeme.io).

### Ce qu'il faut RETIRER

**"rechercher et supprimer notion de vente beta accès à vie : n'existe
plus".**

🚨 **ATTENTION, DEUX CHOSES PORTENT CE NOM ET UNE SEULE SE SUPPRIME.**

| | |
|---|---|
| **la VENTE** : le pitch, le bouton, la promesse | **à retirer** |
| **les PALIERS** `beta` et `lifetime` en base | **on n'y touche PAS** |

Des clientes ONT ce palier. `LIFETIME_PLANS` et `lib/checkout/plansAVie.ts`
existent pour que le webhook Systeme.io ne puisse JAMAIS les redescendre
en gratuit. Les retirer ferait perdre son accès à quelqu'un qui a payé.

**Relevé dans `content/sales/tiquiz.html` le 1er septembre, ce qui est à
retirer :**

- le paragraphe "Je te propose un deal avec **un accès à vie** pour une
  bouchée de pain en échange de tes retours pendant que je peaufine
  Tiquiz" ;
- le bouton **"Accès à vie pour 57€"** (`button-cac91260`), présent DEUX
  fois : dans le HTML rendu ET dans le modèle JSON de la page ;
- sa destination `https://www.tipote.fr/tiquiz-beta`, qui est un tunnel
  Systeme.io.

Le texte apparaît aussi dans `messages/*.json` (`lifetimeAccess`,
`lifetimeIncluded`, `lifetimeNote`) : **ces clés là RESTENT**. Elles
s'affichent dans le compte d'une cliente qui a le palier, pour lui dire
ce qu'elle a. Ce n'est pas de la vente.

---

## 2. À discuter, pour l'évolution de Tiquiz

Ce sont des sujets à trancher AVEC elle, pas des tâches.

- **Un webhook sortant / une API**, pour connecter n'importe quel outil
  (Make, Zapier, Notion, n8n) tout en restant nativement connecté à
  Systeme.io. C'est le pendant exact du hub intégrations : nos pages
  expliquent que les autres ont besoin d'un intermédiaire, et Tiquiz
  gagnerait à savoir en parler un aussi, sans rien perdre du direct.
- **La connexion par Google**, au lieu de la simple adresse email. Et
  surtout, **la connexion par Systeme.io** : "ce serait le top du top".
  À vérifier AVANT de promettre quoi que ce soit : leur API expose-t-elle
  seulement une identification ? Rien ne dit qu'elle le fasse, et ce
  dépôt a déjà payé deux fois le fait d'écrire qu'un outil tiers savait
  faire quelque chose sans l'avoir regardé.

---

## 3. À améliorer

- **Les générateurs : un MENU DÉROULANT pour choisir le quiz**, pas une
  longue liste de cartes avec tous les quiz. C'est l'étape 1 (le projet)
  de `app/generateurs/[generateur]/GenerateurClient.tsx`, ligne ~313.
  Le nombre de quiz grandit ; une grille de cartes est agréable à trois
  projets et ingérable à trente. Garder la RAISON d'un projet bloqué
  visible : un projet grisé sans un mot se lit comme un bug (règle du
  22 août).

---

## Ce qui est TRANCHÉ, et qui ferme une question ouverte

**Le flux RSS sert les RÉSEAUX, pas Systeme.io.** Béné, 1er septembre :
"on s'en fout de vérifier dans systeme io c'est plutôt pour partager sur
les réseaux etc". La question ouverte laissée dans `AGENTS.md` le même
jour ("que Systeme.io sache lire un flux RSS") n'a donc pas à être
mesurée : ce n'est pas le sujet.
