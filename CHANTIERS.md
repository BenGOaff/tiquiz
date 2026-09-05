# Les chantiers décidés par Béné

Ce fichier porte ce qui reste À FAIRE, dit par elle, dans ses mots.
`AGENTS.md` raconte les pannes déjà arrivées ; celui-ci dit où on va.
Deux fichiers, deux questions, et aucune des deux ne répond à l'autre.

**Règle : une ligne se coche quand elle est POUSSÉE, pas quand elle est
écrite** (leçon du 23 août : trois garde-fous décrits comme actifs ici
pendant 24 heures alors qu'ils vivaient sur une branche non fusionnée).

Dernière mise à jour : 4 septembre 2026.

---

## 1. La page de vente de Tiquiz

**ÉTAT AU 2 SEPTEMBRE : une version de travail existe, elle attend sa
relecture.** Rien n'est en ligne, rien n'est indexable.

```
https://tiquiz.fr/apercu/vente/tiquiz-v2?k=<SALES_PREVIEW_TOKEN>
```

Elle se construit par `npm run vente:v2` à partir de la capture, jamais
à la main. Le plan (l'ordre, les blocs neufs, les corrections) vit dans
`lib/sales/planV2.ts` ; les quatre blocs neufs dans
`content/sales/v2/*.html`. Le détail et les mesures sont dans
`AGENTS.md`, section « La page de vente servie n'était pas la page
affichée ».

Ce qui est FAIT dans la v2 : les six ajouts ci dessous, le retrait de la
vente bêta, le mécanisme remonté avant les bénéfices, un bloc de
qualification avant le prix, et le bundle Systeme.io retiré (sans lui,
le navigateur ignorait le HTML servi et rejouait la page d'origine).

**Les chiffres du bloc viralité (+32 %, +4327 visites, +487 leads) ne se
touchent PAS.** Béné, 2 septembre : "c'est juste un exemple pour aider à
se projeter, n'y touche pas du tout." Question fermée.

### Ce qui reste ouvert sur cette page

- 🆕 **UNE LANDING EN VRAIE PAGE NEXT EXISTE, pour relecture** (4 septembre) :
  `/apercu-landing-8f2c9d41`, slug introuvable et `noindex`, donc hors
  sitemap, hors `llms.txt` et hors pied de page. Elle démontre les
  trois choses que la capture ne sait pas faire : le MÊME en-tête et le
  MÊME pied que `/blog` et `/integrations`, la TRADUCTION (`?lang=en`
  change toute la page, gabarit des documents légaux), et un HTML rendu
  par le serveur. Le texte vit dans `lib/site/landing.ts`, les prix ET
  les fonctionnalités viennent du code (`OWNER_CATALOG`,
  `lib/checkout/avantages.ts`, `FREE_LIMITS`).
  **Le premier jet était austère, et c'était ma faute** : j'avais
  appliqué à une page de VENTE les règles de sobriété du BLOG. Béné :
  "on est donc passés de ma super jolie page ultra design à ... ça."
  Refaite dans SON système visuel, relevé dans
  `content/sales/v2/funnel-quiz.html` et dans la capture.
  **QUATRIÈME PASSAGE, 5 septembre**, sur ses douze reproches : les
  boutons illisibles (une seule cause, `.tql a{color:inherit}` battait
  toutes les règles de bouton en spécificité), les six avis Trustpilot
  RETIRÉS au profit de "+200 créateurs" et d'un bloc d'objections, plus
  aucun lien qui quitte la page, le haut de page qui vend le RÉSULTAT et
  plus le processus, des puces promesses sur les colonnes payantes, une
  grille comparative des trois paliers, le bénéfice Systeme.io réécrit
  (connexion native, sans Zapier), et un titre plus une légende autour
  de chacune de ses trois animations. Le détail est dans `AGENTS.md`.
  **CINQUIÈME PASSAGE, 5 septembre**, et c'est celui qui compte : le
  quatrième avait répondu à sa LISTE, pas écrit la page. Sa page de
  vente a été extraite en ordre de lecture (545 lignes), et il en
  manquait quatre choses. Son vocabulaire d'audience (les métiers de ses
  quinze témoignages, jamais "créateurs" tout court). Ses QUINZE
  témoignages, sous son titre "Il y a un avant, et un après Tiquiz",
  précédés de la transformation tirée de son persona. Son titre de
  problème, qui dit ce que ça COÛTE, et l'argument de la plateforme qui
  peut sauter. Et sa signature de CTA : un bouton après chaque section,
  à la première personne ("Je veux capturer ces emails"), six au lieu de
  trois. Deux sections de sa page étaient absentes : la viralité et les
  trois formats (quiz, sondage, Popquiz). Le haut de page portait en
  plus un anglicisme que j'avais écrit ("repart avec"), remplacé par son
  insight clé : "Pas besoin de plus de trafic. Juste de savoir qui te
  lit." Le détail est dans `AGENTS.md`.
  **SIXIÈME PASSAGE, 5 septembre**, sur sa question : "en donnant tous
  les arguments au bon moment, pour montrer pourquoi les quiz, et
  pourquoi tiquiz ?" La réponse était non, et il manquait trois blocs.
  Un comparatif des FORMATS (PDF ou ebook, webinaire, quiz) sur cinq
  critères, posé après le problème et avant la démo : la page vendait
  Tiquiz sans jamais vendre le quiz. Un comparatif des OUTILS, lu depuis
  `lib/site/integrations.ts` (jamais recopié), posé juste après la
  section Systeme.io. Et un bloc "ce n'est PAS pour toi si", trois refus
  vrais et vérifiables dans le code, posé avant les tarifs. Aucun
  pourcentage inventé dans le comparatif des formats : on compare ce
  qu'on OBTIENT, pas des taux qu'on ne peut pas sourcer.
  **CE QUI ATTEND SA DÉCISION, en plus des 100 langues :** les quinze
  témoignages viennent de SA page, ils ne sont pas les six avis
  Trustpilot qu'elle a fait retirer le matin même. Si elle n'en veut
  pas non plus, c'est une ligne à retirer.
  **La coquille du site (en-tête et pied) reste en français**, c'est la
  part de chantier 4 qui n'est pas faite.
  **CE QUI ATTEND SA DÉCISION :** son animation `ton-branding` annonce
  "100+ langues via l'IA" alors que le catalogue en porte exactement
  100. C'est SON dessin, levé à l'octet près, et il porte le même
  chiffre sur sa page de vente EN LIGNE : le corriger ici laisserait la
  vraie page fausse.
- 🆕 **LE SITE PUBLIC PORTE MAINTENANT LES COULEURS DE LA PAGE DE
  VENTE** (4 septembre). Béné : "je préfère que tu alignes le blog sur
  ma belle page de vente que l'inverse." `.tq-site` (globals.css) a
  basculé, donc le blog, les 7 pages d'intégrations, les pages légales,
  l'en-tête et le pied ont suivi le même jour sans être touchés. La
  fonte est Open Sans, auto hébergée depuis SES fichiers
  (`/v/tiquiz/*.woff2`), donc aucun appel à Google Fonts. Le détail des
  7 jetons est dans `AGENTS.md`.
  **Ce qui reste à faire de ce côté :** les MISES EN PAGE des pages du
  site sont encore celles du blog (colonnes, rythme vertical). Seules
  les couleurs, la fonte et les boutons ont basculé.
- **basculer la vraie page sur la v2**, une fois relue.
- **La vitesse et les images sont FAITES** (2 septembre). La page passe
  de **8551 Ko, 72 requêtes et 2708 ms** à **1556 Ko, 21 requêtes et
  544 ms**. Les 104 images portent un texte alternatif, 79 portent leurs
  dimensions.
  🚨 **Cette ligne annonçait « 2552 Ko de CSS, le premier poste de
  lenteur ». C'était une erreur de lecture de ma part** :
  `performance.getEntriesByType` range sous `initiatorType: "css"` tout
  ce qu'une feuille va CHERCHER. Le CSS fait 316 Ko en ligne et il est
  utilisé à 100 % (couverture CDP). Le poids était dans 5 fonds « SVG »
  qui embarquent des bitmaps (1638 Ko) et les polices Font Awesome pour 4
  icônes (911 Ko téléchargés). Le détail est dans `AGENTS.md`.
- **La version anglaise, et les autres langues.** Voir le chantier 4.


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
- **Le multilingue, et les DEUX chiffres étaient faux.** Comptés le
  2 septembre, pas repris : l'interface existe en **7 langues**
  (`i18n/config.ts` : fr, en, es, it, ar, pt, pt-BR), pas 5 ; et le
  catalogue de génération porte **exactement 100 entrées**
  (`lib/quizLanguages.ts`), qui couvrent 83 langues distinctes plus
  leurs variantes régionales, donc ni « plus de 100 » ni « 100 langues »
  tout court. La v2 écrit « 100 langues et variantes », et un test
  compare le chiffre affiché au module qui le sert.
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

## 1bis. Mesurer les pages de vente : ce qui existe, et ce qui manque

Béné, 2 septembre : "dans mon admin : je peux tracker les visites sur
nos deux pages de vente ? Mesurer les conversions etc ?"

**Mesuré le 2 septembre, pas déduit :**

| | |
|---|---|
| les VISITES sur `tiquiz.fr` et `atelierduquiz.fr` | **oui**, Google Analytics 4 (`G-N6LQDRDMDB`), posé par `lib/analytics/google.ts`, uniquement sur les domaines de vente |
| les visites dans SON admin | **non**. Elles vivent dans Google Analytics, pas chez nous |
| les CONVERSIONS | **NON, et c'est le vrai trou** |

**Aucun événement de conversion n'est envoyé.** Ni `begin_checkout`
quand quelqu'un clique un palier, ni `purchase` quand il paie : cherché
dans tout le dépôt, il n'y a que le `gtag('config')` de la page vue.
Google voit donc le trafic et ne peut RIEN en faire : impossible de
savoir quelle source, quelle page ou quelle publicité a produit une
vente.

Et les deux moitiés vivent à deux endroits qui ne se parlent pas : le
trafic dans Google Analytics, les ventes dans `/admin` et le centre de
pilotage (elles viennent des webhooks). Rien ne relie les deux.

**Ce qu'il faudrait, dans cet ordre :**
1. ✅ **FAIT le 4 septembre.** `begin_checkout`, avec le produit et le
   montant du catalogue. Il part à l'ARRIVÉE sur
   `/commande/<produit>` : instrumenter les boutons de la page de vente
   voudrait dire patcher un HTML capturé, donc recommencer à chaque
   `npm run vente:v2`. Un clic qui part chez Systeme.io
   (`SALES_LINKS_LEFT_ALONE`) ne comptera donc jamais, et ces ventes là
   se lisent dans `/admin`.
2. ✅ **FAIT le 4 septembre.** `purchase` sur la page de retour, avec la
   référence du fournisseur en `transaction_id`. Il ne part QUE sur un
   paiement confirmé, relu côté serveur : sans référence, un
   rafraîchissement compterait une vente de plus.
3. **RESTE À FAIRE : l'écran dans l'admin** qui montre le trafic et les
   ventes ensemble. C'est le point qui répond vraiment à sa question
   ("dans MON admin") : aujourd'hui le trafic vit dans Google Analytics
   et les ventes dans `/admin`, et rien ne relie les deux.

**Le 1 et le 2 touchent le chemin de paiement**, donc ils se font seuls,
avec leur propre vérification, pas en même temps qu'autre chose.

🚨 **Ce qui n'est PAS mesuré :** aucun de ces deux événements n'a encore
atteint GA4 depuis ce dépôt. Les montants sortent du catalogue au
centime et la forme est celle que Google documente ; qu'une conversion
apparaisse vraiment dans ses rapports se lit dans GA4, pas ici. Le
détail vit dans `AGENTS.md`, section « Mesurer les conversions ».

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

## 4. La page de vente dans toutes les langues

Béné, 2 septembre : "prévois déjà la version EN soit en traduction auto
sur le bouton switch de langue -> même page mais dans toutes les
langues, avec bdc dans toutes les langues, accueil dans toutes les
langues etc (c'est un chantier à part mais il faut commencer à y
penser)". Sa référence : `https://www.tipote.fr/tiquiz-us`.

**Ce que ça implique, et ce n'est pas une traduction :**

- **la page de vente** est un HTML capturé de 669 Ko. Une version par
  langue veut dire soit sept captures (donc sept fichiers à maintenir),
  soit une page dont le TEXTE sort du HTML pour vivre dans des fichiers
  de langue. La deuxième est la bonne, et c'est un vrai chantier ;
- **le bon de commande** est déjà en React, donc traduisible avec
  `next-intl` comme le reste de l'app. C'est le morceau le plus simple,
  et c'est celui qui encaisse ;
- **le sélecteur de langue de la page** existe déjà
  (`tiquiz-lang-floating`, script autonome) mais il ne fait rien
  aujourd'hui : il attend des versions à afficher ;
- **la devise** : le catalogue est en euros seuls (décision du 13 août).
  Une page anglaise qui affiche 17 € n'est pas fausse, mais elle ne
  convertit pas comme une page qui affiche un prix local. À trancher
  avant, pas après.

**Le sens de la marche : le bon de commande d'abord.** Une page de vente
traduite qui mène à un bon de commande français perd la vente au dernier
écran, et c'est le seul écran qu'on ne peut pas rater.

## Ce qui est TRANCHÉ, et qui ferme une question ouverte

**Le flux RSS sert les RÉSEAUX, pas Systeme.io.** Béné, 1er septembre :
"on s'en fout de vérifier dans systeme io c'est plutôt pour partager sur
les réseaux etc". La question ouverte laissée dans `AGENTS.md` le même
jour ("que Systeme.io sache lire un flux RSS") n'a donc pas à être
mesurée : ce n'est pas le sujet.
