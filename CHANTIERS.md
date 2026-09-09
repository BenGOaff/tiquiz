# Les chantiers décidés par Béné

Ce fichier porte ce qui reste À FAIRE, dit par elle, dans ses mots.
`AGENTS.md` raconte les pannes déjà arrivées ; celui-ci dit où on va.
Deux fichiers, deux questions, et aucune des deux ne répond à l'autre.

**Règle : une ligne se coche quand elle est POUSSÉE, pas quand elle est
écrite** (leçon du 23 août : trois garde-fous décrits comme actifs ici
pendant 24 heures alors qu'ils vivaient sur une branche non fusionnée).

Dernière mise à jour : 9 septembre 2026.

---

## 0. LA MISSION EN COURS : « Tiquiz : landing, générateur, mesure et vitesse » (9 septembre 2026)

C'est son brief le plus récent, et **elle a fixé l'ordre** : "Cinq
chantiers, dans cet ordre. Le point 1 avant tout : sans mesure, on ne
saura pas si le reste a servi."

| | Le chantier | État |
|---|---|---|
| 1 | **la mesure** : cinq événements, pas un de plus | ✅ **POUSSÉ** (`f741d9b6`) |
| 2 | **la vitesse** : sous 1 s sur un quiz public | ✅ **POUSSÉ** (`ea255bd3`), **cible PAS atteinte**, voir plus bas |
| 3 | **les questions qui s'écrivent au fur et à mesure** | ⬜ **À FAIRE, et c'est le suivant** |
| 4 | **le contrat d'URL du générateur** | ⬜ à faire, **il manque son code** |
| 5 | **le quiz gardé 7 jours** | ⬜ à faire |
| 6 | **la landing**, d'après son HTML | ⬜ à faire, et elle porte les 2 événements manquants |

**À la fin, elle veut :** la liste des fichiers créés et modifiés, la
durée médiane de génération mesurée **avant et après** le chantier 3, le
`cf-cache-status` sur trois chargements consécutifs d'un fragment JS, et
la liste des emplacements d'images restés vides.

### 1. La mesure : FAIT, et ce qui n'est pas branché

Les cinq événements vivent dans `lib/analytics/parcours.ts`, l'envoi
dans `lib/analytics/envoi.ts` (une seule porte, avec une file).

🚨 **`quiz_demarre` et `quiz_termine` ne partent de NULLE PART** : ils
viennent du quiz du hero, qui arrive avec le chantier 6. Le ratio
qu'elle lit (`generation_lancee -> compte_cree`) ne les utilise pas,
donc il fonctionne déjà.

**La durée médiane AVANT le chantier 3 n'existe pas encore** : aucune
génération ne portait de durée avant le 9 septembre, et
`mesureDeDuree` rend `null` sous 10 générations chronométrées. Le
chiffre "avant" se relèvera dans `/admin` quelques jours après le
déploiement, **et il faut le relever AVANT de livrer le chantier 3**,
sinon la comparaison qu'elle demande est impossible.

### 2. La vitesse : FAIT, et la cible n'est PAS atteinte

**Ses deux causes nommées étaient déjà réglées, et c'est vérifié** :
Cloudflare sert 20 fragments sur 20 en cache (`HIT` trois fois de
suite), et `cache()` est posé sur les deux lectures Supabase.

**La vraie cause est la troisième vague réseau**, l'appel à
`/api/quiz/<id>/public` (588 à 1150 ms), qui ne pourra JAMAIS être mis
en cache au bord : sa réponse porte un `set-cookie`. La charge part donc
avec le HTML, calculée par `lib/quiz/chargerQuizPublic.ts`, que la page
ET la route appellent.

🚨 **Ne poser AUCUNE Cache Rule sur `/api/quiz/*/public`.**

**RESTE :** les **1146 Ko de JavaScript** devant la première question.
C'est le seul levier qui reste pour la cible "sous 1 s", et il n'est pas
entamé. Et le chiffre d'après se mesure sur son serveur :

```bash
npm run check:vitesse-quiz -- https://quiz.tipote.com/q/rps
```

La ligne « la charge du quiz voyage avec le HTML » dira **oui** une fois
déployé. C'est la preuve que le déploiement a pris.

### 3. Les questions qui s'écrivent au fur et à mesure : LE SUIVANT

Elle l'appelle "le chantier qui rapporte le plus". Aujourd'hui : 20 à
25 secondes avec un spinner.

**Ce qu'elle demande :** streamer l'appel, rendre chaque question dès
qu'elle est complète, dans l'ordre, avec une apparition douce. Le titre
d'abord, puis les questions une par une, puis les profils de résultat.
Respecter `prefers-reduced-motion`.

**Le repli : JAMAIS un écran blanc.** Si le flux échoue, on retombe sur
l'attente actuelle, avec un message et un bouton pour réessayer.

**Occuper l'attente :** sous le quiz qui s'écrit, trois cartes de dix
mots qui tournent, une toutes les 4 secondes.
1. « Ton quiz s'affichera comme ça, à ta marque. »
2. « Le tag partira tout seul dans Systeme.io. »
3. « Et tes leads tomberont ici, déjà rangés. »

**Poser UNE question utile pendant ce temps mort**, à côté du flux :
« Pendant que j'écris ton quiz : tu utilises Systeme.io ? » avec Oui /
Non / Pas encore. **La réponse ne bloque rien.** Oui -> on met en avant
la connexion par clé API ; sinon -> l'export. Elle part dans
`generation_reussie` sous la clé `systemeio` (le constructeur
d'événement l'accepte déjà et l'omet quand elle est absente).

**MESURÉ le 9 septembre, et ça change le travail :** la plomberie SSE
vers le navigateur EXISTE déjà dans
`app/api/embed/quiz/generate/route.ts` (heartbeat toutes les 5 s,
événements `session`, `progress`, `result`, `error`). Ce qui manque est
en trois morceaux :

1. l'appel à Anthropic **n'est pas streamé** (`stream: true` absent) ;
2. rien ne lit le JSON au fur et à mesure : `JSON.parse` tombe une fois,
   à la fin, sur la réponse entière ;
3. `EmbedPreviewClient` attend l'événement `result` et n'affiche rien
   avant.

### 4. Le contrat d'URL du générateur : IL MANQUE SON CODE

`/generateur-de-quiz` ne lit AUCUN paramètre aujourd'hui, donc les six
boutons « Générer ce quiz » de sa landing et le bouton du quiz du hero
ne mèneraient nulle part.

🚨 **Elle avait fourni le code complet de `lib/generateur/prefillUrl.ts`,
les six lignes à poser dans le formulaire et l'enveloppe `Suspense`. Ce
code n'est plus dans le fil : IL FAUT LE LUI REDEMANDER**, plutôt que
d'en réinventer un qui ne correspondrait pas à ce qu'elle a en tête.

**Et il faudra réconcilier les noms de clés** : `CLE_SOURCE` et
`CLE_PROFIL` (`lib/analytics/parcours.ts`) sont MON choix, pas le sien.
Le constructeur de lien et le lecteur doivent écrire le même mot, sinon
toutes les générations sortent en `"direct"` et sans profil, **en
silence**.

**Deux garde-fous en même temps, et ce sont ses mots :**

- **3 générations par heure et par IP.** "La page est publique, un robot
  peut lancer autant d'appels IA qu'il veut et la facture est pour
  nous." 🚨 **Aujourd'hui c'est 2 par 24 h** (`lib/embed/limites.ts`,
  posé le 8 septembre) : les deux règles ne peuvent pas coexister, il
  faut trancher AVEC elle et n'en garder qu'UNE, à un seul endroit ;
- **le champ « À qui s'adresse-t-il ? » est obligatoire sans que rien ne
  le dise.** Soit on le marque obligatoire, soit on le rend facultatif
  et l'IA déduit l'audience du sujet. "Un clic rejeté sur « Générer »
  fait partir des gens."

### 5. Le quiz gardé 7 jours

Aujourd'hui, quelqu'un qui génère un quiz et ferme l'onglet est perdu
pour toujours.

Après `generation_reussie`, enregistrer dans `localStorage` sous
`tiquiz.brouillon`, avec un horodatage. Au retour, si le brouillon a
moins de 7 jours : un bandeau discret « Ton quiz t'attend. » avec
« Le reprendre » et « En créer un nouveau ». Purger au delà de 7 jours.

**Chaque lecture et chaque écriture dans un `try/catch`** : la navigation
privée peut lever.

Quand la souris sort par le HAUT et qu'un brouillon existe : **une seule
ligne discrète, JAMAIS une fenêtre modale**. « Tu pars ? Ton quiz reste
enregistré sur cet appareil pendant 7 jours. » Une fois par session.

**À vérifier avant d'écrire :** le jeton de session du générateur vit
déjà dans un cookie `tq_reprise` et dans l'URL depuis le 2 septembre
(`lib/embed/reprise.ts`). Ce chantier ajoute un brouillon LOCAL, il ne
remplace pas ce mécanisme, et les deux ne doivent pas se contredire.

### 6. La landing, d'après SON HTML

**Le fichier de référence est le sien** : `tiquiz-landing.html`, envoyé
le 9 septembre. "Reprends-le, ne le réinvente pas." Il n'est PAS dans le
dépôt : il faut le lui redemander.

Ses onze points de vigilance :

- le quiz du hero tient **au dessus de la ligne de flottaison** en
  1440x800 ;
- le hero est **centré, une seule colonne** ;
- les options du quiz sur **deux colonnes au dessus de 660 px**, une en
  dessous ;
- le bouton du résultat mène à `/generateur-de-quiz` **avec le sujet,
  l'audience et l'objectif dans l'URL**, et les six cartes « Six quiz
  prêts à générer » aussi ;
- **UN SEUL libellé de bouton principal sur toute la page** :
  « Créer mon quiz gratuitement » ;
- la section blog montre les **trois derniers articles publiés**,
  filtrés sur la locale, et **disparaît entièrement (`return null`)**
  s'il n'y en a aucun, avec `export const revalidate = 3600` ;
- le lien du centre d'aide suit la locale
  (`https://app.tipote.com/support/tiquiz?lang=${locale}`, repli `en`) ;
- les animations d'apparition ont le contenu **visible par défaut** dans
  le HTML rendu, l'état masqué n'étant posé qu'après le montage client ;
- `prefers-reduced-motion` respecté partout ;
- un seul H1, hiérarchie H2/H3, tableaux en `overflow-x: auto` ;
- "tout est pensé pour être multilangue ET responsive".

**Et c'est cette page qui portera `quiz_demarre` et `quiz_termine`**,
les deux événements du chantier 1 qui ne partent de nulle part.

### Ses règles de rédaction, sur tout ce qu'elle signe (verbatim)

Aucun tiret cadratin, jamais : virgule, deux-points ou parenthèses.
Espace insécable avant `: ; ! ? %`. Flèche de CTA `→`, jamais `>>`. On
écrit « connecter » un outil à un autre, jamais « brancher ». Jamais de
féminin par défaut : on reformule pour que la question ne se pose pas.
Aucune formule comparative ou polémique sur un concurrent. **Aucun
chiffre sans source** : le seul chiffre externe autorisé est le 44,9 %
d'Interact, avec sa formulation exacte « des personnes qui commencent un
quiz ». Aucune fausse urgence : pas de compte à rebours, pas de hausse
de tarif annoncée.

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
  **SEPTIÈME PASSAGE, 5 septembre**, sur sa vraie question : "pourquoi
  tu ne reprends pas les mots, la mise en forme, les animations, le
  rythme, les arguments de la page de vente originale ?" Mesuré, section
  par section : 19 chez elle, 11 reproduites ; 19 items de bandeau
  défilant, 8 repris ; et son comparatif à sept critères "Prends 5 ans
  d'avance" existait déjà, j'en avais réinventé un moins bon à côté.
  Trois sections entières manquaient. Son titre de haut de page avait
  été remplacé par le mien. Tout est repris depuis SA page.
  **ET LES 14 PAGES DE FONCTIONNALITÉS, sa deuxième demande** : "sur la
  landing on présente pourquoi cette fonctionnalité + les bénéfices +
  comment ça marche en une phrase. Sur la page détail on détaille
  comment ça marche avec des screenshot etc." `/fonctionnalites` est le
  hub, `/fonctionnalites/<slug>` les 14 pages, et huit blocs de la
  landing portent maintenant un lien "le détail". Une seule source
  (`lib/site/fonctionnalites.ts`) alimente les deux écrans.
  **HUITIÈME PASSAGE, 5 septembre**, sur ses seize reproches : le H1
  DÉFILE en machine à écrire (ses cinq phrases, ses quatre durées,
  levées de sa page), les scintilles du bouton bougent enfin, cinq
  animations de plus sont posées et REMPLACENT mes dessins, sa FAQ est
  restylée en cartes, ses quinze témoignages portent leur portrait, le
  mini quiz "c'est pas pour toi" est repris de sa page v2, un bloc de
  plus de trois lignes s'aligne à gauche, et les tarifs perdent leurs
  ",00" avec le retrait du watermark annoncé sur les paliers payants.
  **CINQ ANIMATIONS SUR DIX SONT REFUSÉES, et la raison est écrite dans
  le script d'extraction** : une publication Facebook FABRIQUÉE au nom
  de Mark Zuckerberg, un écran de FAUSSE RARETÉ ("il n'y a que 20 codes
  promos disponibles"), un domaine qui n'existe pas (`app.tiquiz.com`),
  un bloc qui envoie le tag vers onze outils concurrents, et un bloc
  vide sans son script. **Les trois premiers vivent sur sa page EN
  LIGNE : c'est à elle de trancher si elle les y garde.**
  **ET LE FILET A TROUVÉ UN BLOC FIGÉ POUR TOUJOURS** : trois de ses
  huit animations restaient inertes quand on saute d'un coup jusqu'en
  bas (appui sur Fin, clic sur une ancre, molette jetée). Elles
  s'affichaient très bien, elles ne bougeaient simplement jamais.
  Corrigé, et le test qui l'a trouvé ne descendait pas la page qu'il
  annonçait descendre. Le détail est dans `AGENTS.md`.
  **LES 14 CAPTURES D'ÉCRAN SONT À PRENDRE, et chaque page dit
  laquelle** dans un encadré visible : je ne peux pas les produire d'ici
  (la seule que l'app sait rendre porte un bandeau "Mode aperçu" et un
  quiz de démo sans accents). C'est deux minutes par écran dans un vrai
  compte.
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
  **NEUVIÈME PASSAGE, 6 septembre : la landing est RACCOURCIE, et le
  reste est DÉPLACÉ.** Béné : "la page actuelle fait environ 5 000 mots
  et une quinzaine d'écrans. C'est une page de vente, pas une landing.
  Elle a été écrite pour une audience chaude qui connaît déjà Béné. Le
  trafic à venir est froid : affiliés, SEO, Capterra. Un visiteur froid
  décroche au troisième écran. **Rien n'est à jeter. Tout est à
  déplacer.**" Six blocs sur la landing, `/tarifs` porte la vraie page
  de vente (les 3 paliers, la grille comparative, la comparaison de
  coût, les 5 objections, la FAQ d'argent, les 16 autres témoignages),
  et les 8 pages de fonctionnalités reprennent chacune sa section, avec
  son texte et son visuel. **UN SEUL LIBELLÉ DE BOUTON** sur toute la
  page, contre treize. Le menu gagne Fonctionnalités et Tarifs ; le
  pied perd le doublon "Ce que fait Tiquiz" / "Toutes les
  fonctionnalités". Le bouton qui monte de palier depuis les leads
  floutés mène à `/tarifs` : "le moment où un utilisateur voit sa 11e
  réponse floutée est le moment de conversion le plus fort du produit."
  **ELLE N'EST PAS EN LIGNE, ET C'EST SA DÉCISION** (6 septembre) :
  "montre moi la landing sur la page aperçu 8f2 etc pas directement en
  page d'accueil, on la valide d'abord ensemble." `tiquiz.fr/` sert
  donc encore sa page de vente capturée. La bascule est UNE ligne du
  middleware, et elle se fait une fois qu'elle a validé.
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
3. ✅ **FAIT le 7 septembre.** L'écran dans l'admin qui montre le trafic
   ET les ventes ensemble (`components/pilotage/TraficPilotage.tsx`,
   `lib/trafic/entonnoir.ts`). **On compte nous mêmes**, pas en lisant
   GA4 : GA4 ne voit que ceux qui ont accepté le bandeau, donc diviser
   des ventes exactes par un trafic sous-compté donnerait un taux trop
   beau, affiché comme un fait. La table `trafic_jour` ne porte ni IP,
   ni cookie, ni identifiant : on compte des **vues de page**, jamais
   des visiteurs, et l'écran le dit. Chaque site a SON entonnoir avec
   SES ventes (les fondre donnerait un taux qui ne parle d'aucun des
   deux), et le trafic de l'Atelier voyage dans la porte qui existe
   déjà. Aucun taux ne s'affiche sous 100 vues.
   🚨 Migration : `20260907_trafic_pages_publiques.sql`, sur le Supabase
   de TIQUIZ **et** sur celui de l'ATELIER (le même fichier vit dans les
   deux dépôts).

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
- ✅ **La connexion par Google est FAITE** (2 septembre, vérifiée en
  production le 3 sur son propre compte). `POST /api/auth/accueil` porte
  les trois effets qu'un bouton branché naïvement aurait perdus EN
  SILENCE : le rattachement de l'affiliée, le tag `tiquiz-free` chez
  Systeme.io, et le rattachement du quiz de la démo. Le tag n'est jamais
  REPOSÉ sur quelqu'un qui l'a déjà (sinon sa campagne repart en
  entier), et jamais sur un compte qui paie.
- **La connexion par Systeme.io reste ouverte** : "ce serait le top du
  top". À vérifier AVANT de promettre quoi que ce soit : leur API
  expose-t-elle seulement une identification ? Rien ne dit qu'elle le
  fasse, et ce dépôt a déjà payé deux fois le fait d'écrire qu'un outil
  tiers savait faire quelque chose sans l'avoir regardé.

---

## 3. À améliorer

- ✅ **FAIT le 3 septembre : le menu déroulant des générateurs.** La
  raison d'un projet bloqué y est dite en version COURTE
  (`projet.bloqueCourt`, 3 raisons x 7 langues), parce qu'une `<option>`
  tient sur une ligne. Et le cul-de-sac muet a été fermé au passage :
  l'écran testait ce qui EXISTE alors que la phrase parle de ce qui est
  UTILISABLE, donc une liste entièrement grisée n'aurait rien dit.

**Cette section est vide au 9 septembre.** Ce qui reste à améliorer vit
dans le chantier 0 ci dessus.

---

## 4. La page de vente dans toutes les langues

🚨 **LA MOITIÉ DE CE CHANTIER EST FAITE depuis le 8 septembre**, et cette
section décrivait encore l'état d'avant. Corrigé en place.

**Ce qui est en ligne, en français ET en anglais** : toutes les pages
internes du site (`/tarifs`, `/fonctionnalites` et ses 8 filles,
`/integrations` et ses 6 filles, `/generateur-de-quiz`, `/a-propos`,
`/affiliation`, `/affiliation-atelier`, `/newsletter`), le meuble
(menu, pied de page, libellés d'accessibilité) et **les 10 articles du
blog**. Les adresses sont `/<chemin>` en français et `/en/<chemin>` en
anglais, avec `hreflang` et une canonique par langue. Le détail vit dans
`AGENTS.md`, section « L'anglais a enfin une ADRESSE ».

**Ce qui RESTE de ce chantier, et c'est le morceau dur :**

- **la page de vente `/` elle même**, qui est la capture française de
  669 Ko. C'est exactement le problème décrit ci dessous, et il n'a pas
  bougé. La landing du chantier 0.6 est le chemin de sortie : une vraie
  page Next dont le texte vit dans des objets de langue ;
- **le bon de commande**, toujours en français ;
- **les 5 autres langues de l'interface** (es, it, ar, pt, pt-BR) sur le
  site public. **C'est SA décision, pas un oubli** : 10 articles fois
  7 langues font 70 pages, et chaque correction de chiffre se paierait
  alors sept fois ;
- **la devise**, inchangée : le catalogue est en euros seuls.

Ce qui suit reste vrai et n'a pas été touché.

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
