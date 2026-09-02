# Les chantiers décidés par Béné

Ce fichier porte ce qui reste À FAIRE, dit par elle, dans ses mots.
`AGENTS.md` raconte les pannes déjà arrivées ; celui-ci dit où on va.
Deux fichiers, deux questions, et aucune des deux ne répond à l'autre.

**Règle : une ligne se coche quand elle est POUSSÉE, pas quand elle est
écrite** (leçon du 23 août : trois garde-fous décrits comme actifs ici
pendant 24 heures alors qu'ils vivaient sur une branche non fusionnée).

Dernière mise à jour : 2 septembre 2026.

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

Ce qui RESTE À TRANCHER PAR BÉNÉ, et qui n'est pas du code :
- les chiffres **+32 % / +4327 visites / +487 leads** du bloc viralité
  n'ont aucune source écrite nulle part dans les trois dépôts. Ils
  restent tels quels dans la v2 : je ne retire pas un chiffre qui est
  peut être vrai, et je ne peux pas confirmer un chiffre que je n'ai pas
  mesuré. C'est le seul endroit de la page qui promet sans preuve.
- basculer la vraie page sur la v2, une fois relue.


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
