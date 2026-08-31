# Sortir de Systeme.io pour les ventes et l'affiliation

> Béné, 24 août 2026 : "note où on s'arrête et ce qu'il reste à faire
> pour qu'à terme mon système remplace complètement Systeme io pour les
> ventes et l'affiliation sauf pour les emails."
>
> **Les emails restent chez Systeme.io.** Ce n'est pas un renoncement,
> c'est la contrainte qui structure tout ce document : tant que les
> séquences vivent là-bas, notre système doit continuer de leur PARLER,
> et c'est justement là que se trouve le trou le plus coûteux (chantier
> 1).

Ce fichier dit **ce qui est vérifié dans le code**, pas ce qu'on espère.
Chaque point porte le fichier où il se trouve, pour qu'une prochaine
session n'ait pas à re-chercher.

Dernière vérification : 25 août 2026.

**Fait le 25 août :** le contact Systeme.io est créé (chantier 1), le
bouton Rembourser accepte PayPal, les échéances PayPal apparaissent enfin
dans les ventes, l'Atelier émet ses factures, les destinations affiliées
atterrissent sur nos domaines sauf deux, et **le cycle de versement des
affiliés existe** (chantier 2.1).

---

## 1. Où on en est

### Ce qui tourne DÉJÀ chez nous

| | Où | État |
|---|---|---|
| Bon de commande carte | `lib/checkout/stripeCheckout.ts` | vendu, encaissé, adresse et TVA collectées |
| Bon de commande PayPal | `lib/checkout/paypalOwner.ts` | abonnements PayPal, essai gratuit compris |
| Ouverture des accès | les deux webhooks `app/api/commande/**` | signature, verrou d'idempotence, relecture chez le fournisseur |
| Annuler / rembourser | `lib/checkout/cancelSubscriptions.ts` | les deux fournisseurs, fin de période ou immédiat |
| Monter de palier | `lib/checkout/planChange*.ts` | prorata Stripe, abonnement neuf chez PayPal |
| Mois offert | `lib/trial/moisOffert*.ts` | ouvert par un `?ref=`, non cumulable, tricheurs signalés |
| **Factures** | `lib/facture/*` (24 août) | émises pour PayPal, numérotation continue, TVA des 4 régimes |
| Fiche client | `/admin/clients/<email>` | accès, paiements, provenance, tickets, facturation |
| Support | `support_tickets` | file unique, porte commune chez Tipote |
| Liens affiliés | `lib/affiliate/links.ts` (Tipote) | `?ref=`, un lien par canal, clics et conversions comptés |

### Ce qui dépend ENCORE de Systeme.io

| | Pourquoi | Chantier |
|---|---|---|
| Les emails | décision Béné : ils restent | jamais |
| Le contact d'un INSCRIT GRATUIT | l'achat crée le contact depuis le 25 août, pas l'inscription | **1** |
| ~~Le paiement des affiliés~~ | **fait le 25 août** : coordonnées, lot, fichiers SEPA et PayPal | ~~2~~ |
| L'inscription d'un affilié | `affiliates.sa` est la clé primaire | **2** |
| Les pages de vente | 1 page répliquée ; les pages "plan" sont LEURS bons de commande | **3** |
| Les codes de réduction | 54 codes actifs chez eux, 0 chez nous | **4** |
| Les clients payants actuels | tous abonnés chez Systeme.io | **5** |

---

## 2. Chantier 1 : le contact doit EXISTER chez Systeme.io

**FAIT LE 25 AOÛT POUR L'ACHAT. Reste l'inscription gratuite.**

`poserTagAchat` posait l'étiquette qui déclenche les séquences, mais
abandonnait quand le contact n'existait pas là-bas, c'est à dire le cas
NORMAL de quelqu'un qui achète sur notre bon de commande. Il n'entrait
dans AUCUNE séquence email, en silence.

`assurerContact` cherche puis CRÉE (`lib/sio/appliquerTag.ts`), et
re-cherche après un refus : deux webhooks simultanés créent la course, et
Systeme.io refuse le second doublon, ce qui veut dire "il existe" et pas
"ça a raté". L'identité de facturation part avec (société, TVA, adresse) :
ces champs existaient dans sa fiche contact et n'étaient jamais remplis.

**Les slugs sont RELEVÉS, pas devinés** (`GET /contact_fields`, 25 août).
Le nom de famille s'appelle `surname`, pas `last_name` : un slug inventé
est accepté par l'API et IGNORÉ, donc le champ resterait vide pour
toujours, sans erreur.

**CE QUI RESTE :**

1. **L'inscription GRATUITE ne crée pas le contact.** Seul le chemin
   d'achat le fait. Tant que c'est vrai, le tunnel gratuit doit rester
   chez Systeme.io (c'est l'une des deux exceptions du chantier 3.3), et
   quelqu'un qui s'inscrit en direct sur `quiz.tipote.com/signup`
   n'existe pas dans ses séquences.
2. **Les autres moments de vie.** Résiliation, remboursement, montée de
   palier : rien n'est étiqueté. Une séquence "ton abonnement se termine"
   ne peut pas exister si l'étiquette n'est jamais posée.
   *Décision Béné du 25 août : sur une montée de palier on AJOUTE la
   nouvelle étiquette sans retirer l'ancienne.* C'est déjà le
   comportement, et le contrôle d'écart le tolère explicitement.

**Ne jamais défaire :** on ne CRÉE pas d'étiquette manquante (une
étiquette créée par nous avec une faute se retrouverait en double, et ses
automatisations continueraient de pointer l'ancienne), et
`assurerContact` ne s'appelle QUE depuis un chemin d'achat (créer un
contact fait entrer quelqu'un dans sa liste).

## 3. Chantier 2 : payer les affiliés

C'est le plus gros, et il se découpe en trois.

### 3.1 Le cycle de versement (FAIT le 25 août)

Béné : "on doit proposer le choix aux affiliés : Paypal ou virement
bancaire." Et : export SEPA, virement à la main.

Ce qui existe maintenant : l'affiliée choisit sa méthode et saisit ses
coordonnées (`/paiement`), les commissions mûrissent en `approved` après
21 jours, un lot mensuel les fige, et l'admin télécharge le fichier
`pain.001.001.03` pour la banque ou la liste à tabulations pour PayPal
(`/admin/versements`).

**AUCUN ARGENT NE PART D'UN ÉCRAN** : on produit un fichier, elle le
dépose, sa banque exécute.

**À poser sur le serveur** : `SEPA_DEBTOR_IBAN` (et `SEPA_DEBTOR_BIC` si
la banque l'exige). Sans elle, le fichier SEPA n'est pas produit et
l'écran le DIT. La liste PayPal se télécharge sans ça.

### 3.1 bis L'autofacturation (FAIT le 25 août)

Béné : "je veux le même truc que systeme io : l'affilié complète ses
infos, son numéro de TVA et siren s'il a, ses coordonnées, son mode
paiement et tous les mois on génère sa facture pour sa compta, il peut
la télécharger et nous on peut le payer via cette facture qu'on a
générée pour lui."

C'est fait, dans le dépôt TIPOTE (l'affiliation y vit) :
`lib/affiliate/fiscal.ts`, `lib/affiliate/autofacture.ts`,
`supabase/migrations/20260825_autofacturation.sql`, la pièce imprimable
`/facture-affilie/<numero>`. Chaque lot mensuel émet une facture par
affilié, série `AFF-`, numérotation continue.

**La distinction qu'elle a écrite elle même, et qui structure tout :**
les factures qu'on crée pour nos ACHETEURS (série `TQ-` ici, `AQ-` pour
l'Atelier) vont dans le sens inverse de celles qu'on crée à la place de
nos AFFILIÉS. Sur une vente nous sommes le vendeur et le prix est TTC,
la TVA se calcule dedans ; sur une autofacture l'affilié est le vendeur,
la commission est nette, et la TVA s'AJOUTE. Recopier l'une sur l'autre
ferait des factures fausses des deux côtés.

Sans mandat accepté, on n'émet pas, donc on ne paie pas : le lot écarte
avec la raison `profil-fiscal`, distincte de `coordonnees`. Le détail
vit dans l'`AGENTS.md` de Tipote.

### 3.1 ter L'audit du 26 août : ce qui pouvait partir en trop

Trois trous d'argent, trouvés en auditant les trois chaînes de vente.
Tant que Systeme.io payait, ils ne coûtaient rien : c'est eux qui
arbitraient. Depuis le 25 août c'est NOUS qui virons.

1. **Une vente remboursée payait quand même.** `cancelled_at` existait
   depuis le 25 mai et aucune ligne de code ne l'écrivait. Fermé : les
   trois webhooks (Stripe, PayPal, et les deux de l'Atelier) annulent
   la commission, et une commission DÉJÀ VERSÉE est signalée au lieu
   d'être réécrite (l'argent est parti, et la facture qui le justifie
   est chez un comptable).
2. **L'impayé n'était écouté nulle part.** `charge.dispute.*` est
   maintenant traité : on ferme sur `funds_withdrawn` (l'argent est
   vraiment parti), jamais sur `created` (une contestation se conteste).
3. **La commission est RÉCURRENTE, et elle ne l'était pas.** Béné, le
   26 : "on paye bien 40% chaque mois où [le client] reste abonné, pas
   une seule fois... on arrête de payer s'il se barre c'est tout."
   PayPal commissionnait à l'ACTIVATION (donc une fois, et avant le
   premier euro sur un mois offert) ; Stripe au CHECKOUT (donc une
   fois, et jamais du tout sur un mois offert, où le montant vaut zéro).
   **On commissionne désormais chaque ENCAISSEMENT**, avec la clé du
   PAIEMENT (la facture Stripe, la vente PayPal) et non de l'abonnement.
   Trois cas se règlent alors tout seuls : le mois offert (facture à 0,
   donc pas de commission), l'arrêt de l'abonnement (plus d'échéance,
   donc plus de commission) et la montée de palier (la facture suivante
   porte le nouveau montant).

Trois écarts de calcul fermés au passage : le taux venait d'une
constante à côté du module qui l'annonce (et `affiliate_rate_overrides`
n'était lue nulle part), la base de commission était du HT pour nos
checkouts et du TTC pour les webhooks Systeme.io (~20 % de trop), et
l'anti-auto-affiliation comparait les adresses brutes alors que la règle
qui voit les alias Gmail existait déjà, mais ne gardait que le mois
offert.

**Ce qui reste sur ce chantier :**

1. **Les commissions historiques restent chez Systeme.io.** Deux
   systèmes paient en parallèle pendant la transition ; la page Paiement
   le dit, pour qu'une affiliée sache lequel regarde son argent.
2. **Un passage par son comptable**, une fois, sur trois choix qui sont
   les siens : une seule série `AFF-` pour tous les affiliés, le cas du
   particulier non assujetti, et le fait que la commission soit nette de
   taxe (un affilié assujetti coûte 20 % de trésorerie en plus, qu'on
   récupère, mais qui sortent le mois même).
3. **LES COMMISSIONS DE L'ATELIER NE SONT DANS AUCUN LOT.** Elles
   vivent dans la base de l'Atelier (`profiles.sio_affiliate_id` y tient
   lieu de registre), et `preparerLot` ne lit que celle de Tipote. Une
   vente de l'Atelier prise sur NOTRE bon de commande crée donc une
   commission que Systeme.io ne connaît pas et que notre cycle ne paie
   pas. L'admin les AFFICHE (il interroge les deux bases), ce qui rend
   la dette visible mais ne la solde pas. C'est le verrou 3.2 sous un
   autre angle : tant que les deux registres sont séparés, il faut soit
   les unifier, soit faire remonter les commissions de l'Atelier vers
   Tipote comme Tiquiz le fait déjà.
4. **À VÉRIFIER DANS SES AUTOMATISATIONS SYSTEME.IO**, et ça ne se
   vérifie pas depuis le code : une vente TIQUIZ passée par Systeme.io
   peut être enregistrée DEUX fois, une fois par `/api/affiliate/
   sio-sale` (base de l'Atelier) et une fois par le webhook Systeme.io
   de Tiquiz (base de Tipote). Les deux tables ont chacune leur
   contrainte d'unicité, aucune ne voit l'autre, et l'admin ADDITIONNE
   les deux sources. Le cas est journalisé en clair depuis le 26 août :
   si la ligne "vente TIQUIZ enregistree dans la base de l'Atelier"
   apparaît dans `pm2 logs`, il faut débrancher l'une des deux.

### 3.2 Un affilié doit pouvoir s'inscrire sans compte Systeme.io

`affiliates.sa` est la **clé primaire**, et toutes les tables du
programme y font référence (`affiliate_commissions.sa`,
`affiliate_clicks`, `affiliate_conversions`, `affiliate_links`). La page
d'inscription (`app/affiliate/signup/page.tsx`) attend d'ailleurs un
`?sa=` fourni par un merge tag Systeme.io.

Tant que c'est vrai, **on ne peut pas recruter un affilié qui n'a pas de
compte Systeme.io.** C'est le verrou le plus dur de tout le document.

Migration à écrire : une clé technique (`affiliates.id` en uuid), `sa`
devenu une colonne facultative parmi d'autres, et toutes les clés
étrangères repointées. `ref` reste l'identité publique. À faire d'un
bloc : une moitié de migration laisserait deux registres d'affiliés.

### 3.3 Les liens (FAIT le 25 août, sauf deux)

Les 8 destinations de `lib/affiliate/linkDestinations.ts` (Tipote)
atterrissent sur nos domaines, à deux exceptions nommées dans le code et
tenues par un test. **Le détail est en 4.1**, avec les deux raisons : ne
pas le redire ici, deux endroits qui décrivent le même état finissent
toujours par se contredire.

---

## 4. Chantier 3 : les pages de vente

Une seule page est répliquée chez nous : `content/sales/tiquiz.html`,
servie sur `tiquiz.fr` (`lib/sales/servePage.ts`).

**CE QU'ON A APPRIS LE 25 AOÛT, EN ESSAYANT DE RÉPLIQUER LES AUTRES.**
Les pages `tiquiz-mensuel`, `tiquiz-annuel` et compagnie ne sont PAS des
pages de vente : ce sont les BONS DE COMMANDE de Systeme.io. Elles
portent un `<form id="form-checkout">` sans action, piloté par leur
JavaScript. Les répliquer donnerait un formulaire de paiement mort, et on
ne le verrait qu'à la première vente perdue. Les captures ont été jetées.

Le tunnel GRATUIT a le même problème : son formulaire d'optin crée le
contact et pose le tag chez eux.

**Il reste donc à répliquer des pages qui VENDENT vraiment**, c'est à
dire des pages de contenu dont les boutons mènent à notre bon de
commande. `renderSalesPage` sait déjà réécrire ces boutons
(`SALES_CHECKOUT_TARGETS`), et l'exige comme paramètre obligatoire.

**La méthode est écrite et éprouvée** (19 août) : capture depuis l'URL EN
LIGNE avec `scripts/fetch-sales-page.mjs`, jamais depuis un export fait à
la main, puis vérification dans un navigateur en cliquant les boutons. Un
export SingleFile perd les scripts sans que rien ne le signale.

### 4.1 Les destinations affiliées (fait le 25 août, sauf deux)

Les 4 paliers mènent maintenant à **notre bon de commande**
(`tiquiz.fr/commande/<produit>`), le hub à `tiquiz.fr`. La chaîne du
`?ref=` a été vérifiée bout en bout, et sur `tiquiz.fr` le bon de
commande est ouvert sans clé.

**PLUS AUCUNE EXCEPTION depuis le 27 août 2026.** Les huit destinations
atterrissent sur nos domaines. Les deux dernières sont tombées les 26 et
27 août, et cette section disait le contraire jusqu'au 30.

| Destination | Où elle mène | Depuis |
|---|---|---|
| `tiquiz_direct`, `tiquiz_main` | `https://tiquiz.fr/` | 25 août |
| les 4 paliers | `https://tiquiz.fr/commande/<produit>` | 25 août |
| `atelier` | `https://atelierduquiz.fr/` | 26 août |
| `tiquiz_free` | `https://tiquiz.fr/signup` | 27 août |

**La raison de fond est la même pour les deux, et elle vaut d'être
retenue : depuis que nos liens portent `?ref=` (24 août), un lien qui
atterrit chez Systeme.io ne paie PLUS PERSONNE.** Leur page ignore ce
paramètre, notre middleware ne voit jamais la requête donc ne pose aucun
cookie, et leur webhook ne sait lire qu'un `sa`. Ce n'était plus une
exception qui protégeait quelque chose, c'était un trou.

- **`atelier`** : l'Atelier lit maintenant `?ref=` (son `middleware.ts`
  + `lib/affiliate/refLien.ts`) et remonte ses ventes au registre
  CENTRAL de Tipote, à 70 % (`source_app: "atelier"`). Son registre
  historique (`profiles.sio_affiliate_id`) reste interrogé en REPLI,
  donc un élève affilié là-bas et pas chez Tipote est payé comme avant.
- **`tiquiz_free`** : notre `/signup` crée le compte, écrit le
  rattachement À VIE, et crée le contact chez Systeme.io avec
  l'étiquette `tiquiz-free` (`poserTagPlan`). Les séquences email de
  Béné partent comme avant, son workflow écoute cette étiquette.

## 5. Chantier 4 : ce que le bon de commande ne sait pas encore faire

Vérifié dans `lib/checkout/stripeCheckout.ts` et `paypalOwner.ts` :

- **Aucun code de réduction.** Son compte Systeme.io en porte 54 actifs,
  dont certains à 100 %. Chez Stripe c'est un paramètre
  (`allow_promotion_codes`) plus les codes créés dans le tableau de bord ;
  chez PayPal il n'y a pas d'équivalent natif, il faudrait un plan
  tarifaire par remise ou un ajustement à la première échéance.
  **Et le montant remisé doit descendre dans la facture ET dans la
  commission affiliée**, sinon on paie une commission sur un prix que
  personne n'a payé.
- **Aucun order bump, aucun upsell.**
- ~~Le remboursement PayPal n'est pas possible depuis l'admin.~~
  **FAIT le 25 août**, et cette ligne disait le contraire jusqu'au 26 :
  `app/api/admin/ventes/rembourser/route.ts` accepte `provider` valant
  `stripe` OU `paypal` et appelle `refundOwnerPaypalSale`. Une ligne de
  roadmap périmée envoie chercher un bouton qui existe.
- **VIES n'est pas branché** : on vérifie la forme d'un numéro de TVA,
  pas son existence. Une autoliquidation injustifiée est de la TVA à
  notre charge. Les factures concernées sortent marquées.
- **Rien ne produit de déclaration OSS.** On calcule la bonne TVA par
  facture, mais il n'existe aucun export par pays et par trimestre.
  C'est le premier besoin comptable qui arrivera après quelques ventes
  européennes.

---

## 6. Chantier 5 : les clients qui sont déjà là

**Tous les clients payants d'aujourd'hui sont abonnés chez
Systeme.io.** Un abonnement ne se déplace pas : ni Stripe ni PayPal ne
savent reprendre un prélèvement ouvert ailleurs. Les faire passer chez
nous veut dire leur demander de résilier et de reprendre, c'est à dire
risquer de les perdre au passage.

Trois façons de vivre avec, et c'est une décision de fond :

1. **Ne rien faire.** Les anciens finissent chez Systeme.io, les
   nouveaux chez nous. Coût : deux systèmes à maintenir pendant des
   années, et un abonnement Systeme.io qu'on ne peut jamais résilier.
2. **Migrer sur incitation.** Un mois offert ou une remise à vie pour
   qui bascule. Coût : de l'argent, et une campagne à écrire.
3. **Migrer à la résiliation.** Quelqu'un qui part chez Systeme.io se
   voit proposer de revenir chez nous. Coût : lent, mais gratuit.

Tant que ce point n'est pas tranché, **`lib/sio/webhookInference.ts` et
la route `/api/systeme-io/webhook` restent indispensables**, et la règle
du 7 août avec : tout plan vendu doit être joignable par un
offer-price-id, et un tarif qui change se répercute à trois endroits
(le prix affiché, l'entrée URL, le nouvel offer-price-id).

---

## 7. Et l'Atelier (dépôt `formaquiz`)

Il a son propre bon de commande (Stripe + PayPal Orders, 47 €), mais
**aucun système de facture** : `lib/facture/` n'y existe pas. La vente
PayPal de l'Atelier est donc exactement dans l'état où était celle de
Tiquiz avant le 24 août : encaissée, sans facture.

Le module est portable presque tel quel. La seule différence de fond :
l'Atelier vend un ACHAT UNIQUE, donc une facture par vente et pas une par
échéance.

---

## 8. L'ordre que je recommande

**Fait le 25 août :** le contact Systeme.io à l'achat, le bouton
Rembourser PayPal, les échéances PayPal dans les ventes, les factures de
l'Atelier, les destinations affiliées sur nos domaines.

Ce qui reste, du plus rentable au plus lourd :

1. **Le contact Systeme.io à l'INSCRIPTION GRATUITE** (chantier 1, moitié
   restante). Tant qu'il manque, le tunnel gratuit ne peut pas quitter
   Systeme.io.
2. **Les codes de réduction** (chantier 4), avant d'avoir trop de clients
   chez nous : plus simple à poser avant qu'après. Et une remise doit
   descendre dans la facture ET dans la commission.
3. **La facture de commission des affiliés** (3.1, ce qui reste).
4. **Les pages qui vendent vraiment** (chantier 3), une par une.
5. **VIES** et **l'export OSS** (chantier 4), quand les ventes
   européennes arrivent.
6. **La clé technique des affiliés** (3.2), le jour où elle veut recruter
   quelqu'un sans compte Systeme.io.
7. **Les clients déjà là** (chantier 5), qui est une décision de fond
   avant d'être du code.

**Ce qui ne partira jamais :** les emails, donc le pont vers Systeme.io.
Le but n'est pas de couper le lien, c'est de n'en garder qu'un seul, et
qu'il aille dans un seul sens : nous écrivons chez eux, ils ne décident
plus rien chez nous.

## 9. Hors sujet, mais noté : alléger le Supabase de Tiquiz

> Béné, 24 août : "il faudra aussi qu'on réfléchisse à alléger le
> supabase de Tiquiz, on frôle les limites et on doit éviter sachant
> qu'on a un super serveur. Note le on en parle demain."

### CE QUI A ÉTÉ FAIT LE 26 AOÛT AU SOIR, ET CE QUE ÇA A CORRIGÉ

**La cause n'était pas le stockage, c'était la BANDE PASSANTE.** Le
bandeau Supabase dit `Cached Egress Exceeded` : **7,27 Go** sur le cycle
précédent, pour 719 Mo d'images. Chaque visiteur de quiz téléchargeait
ces images DEPUIS Supabase, une dizaine de fois par fichier en moyenne.
Le stockage à 73 % était vrai et n'était pas la cause. Le reste de cette
section, écrit avant la mesure, part de la mauvaise hypothèse : la
mécanique décrite (chaque envoi écrit un fichier neuf, rien n'est jamais
supprimé) reste exacte, la CONCLUSION était fausse.

**Fait, dans l'ordre, sur Tiquiz :**

1. audit corrigé (schéma demandé à la base, plus aucune liste de
   colonnes écrite à la main, tous les buckets) ;
2. archive complète sur le serveur, 805 fichiers, 0 échec, avec
   manifeste et empreinte par fichier ;
3. **c'est CADDY qui sert le 443, pas nginx.** Tout `infra/nginx/` décrit
   une réalité morte. Le bloc `location ^~ /assets/` a été écrit puis
   jeté ; ce qui tourne est un `handle @assets_tq` dans le Caddyfile ;
4. les fichiers copiés depuis l'archive (jamais re-téléchargés : ça
   aurait reconsommé la bande passante qu'on essaie d'économiser) ;
5. `NEXT_PUBLIC_ASSETS_BASE_URL=https://videos.quiz.tipote.com/assets`
   posée, l'app reconstruite : les NOUVELLES images vont sur le serveur ;
6. `storage-migrate.mjs` appliqué : **323 lignes réécrites, 0 échec**,
   sur `quizzes`, `quiz_results`, `quiz_questions`, `profiles`,
   `business_profiles`, `custom_domains`. Aucune image manquante, aucune
   table sans clé primaire.

**RIEN N'A ÉTÉ SUPPRIMÉ CHEZ SUPABASE, ET RIEN NE DOIT L'ÊTRE.** Les
719 Mo y restent : si une adresse nous a échappé, l'image s'affiche
encore. Les 420 fichiers que l'audit dit orphelins ne sont pas une
liste de suppression.

**Au passage :** une page de maintenance est servie par Caddy quand une
app ne répond plus (déploiement en cours), sur les quatre sites. Elle
sort en **200** et pas en 5xx, parce que Cloudflare remplace le corps
d'une réponse 5xx par sa propre page d'erreur. Elle vit dans
`/srv/maintenance/index.html`, donc **hors du dépôt**, comme le
Caddyfile : c'est une dette, tout ce qui n'est pas versionné disparaît au
prochain serveur.

---

### CE N'EST PAS LA BASE, CE SONT LES FICHIERS (mesuré le 26 août)

La capture de l'écran d'usage tranche, et elle tranche contre
l'hypothèse de départ :

| | Utilisé | Plan gratuit |
|---|---|---|
| **Stockage (fichiers)** | **0,73 Go (73 %)** | 1 Go |
| Base de données | 0,079 Go (16 %) | 0,5 Go |
| Egress | 0,647 Go (13 %) | 5 Go |
| Utilisateurs actifs | 43 | 50 000 |

La base est à 16 % avec 43 utilisateurs : elle n'est pas le sujet. Le
stockage est à 73 %, et **il ne peut que grossir**, pour deux raisons
qui sont toutes les deux dans le code.

**1. Chaque envoi écrit un fichier NEUF.**

```
const path = `quiz-backgrounds/${user.id}/${quizId}-${Date.now()}.${ext}`;
```

L'horodatage est VOULU et il ne faut pas le retirer : un chemin stable
laissait les navigateurs afficher l'ancien logo pendant la durée de leur
cache, et c'est un bug déjà corrigé. Mais il a une conséquence que
personne n'avait tirée : changer l'image de fond d'un quiz dix fois écrit
DIX fichiers, et les neuf premiers restent. Le `upsert: true` posé à côté
ne remplace jamais rien, puisque le chemin est neuf à chaque fois.

**2. Aucun fichier n'est JAMAIS supprimé.** Ni au remplacement d'une
image, ni à la suppression du quiz qui la portait. `storage.remove()`
n'apparaît nulle part dans le dépôt Tiquiz.

Ce qui est DÉJÀ bon, et qu'il ne faut pas refaire : les images sont
compressées à l'envoi (WebP qualité 92, bord max 2400 px en couverture,
1600 en contenu, 1200 en OG, 900 en logo). Le problème n'est donc pas le
POIDS de chaque fichier, c'est leur NOMBRE.

### Mesurer avant de supprimer

**CES COMMANDES SE LANCENT SUR LE SERVEUR, PAS SUR TON PC.** Elles
lisent le `.env` de production, qui n'existe que là bas. Sur Windows
elles répondent `Missing script` (le code n'y est pas encore) ou
`Il manque NEXT_PUBLIC_SUPABASE_URL` (pas de `.env`).

```bash
# 1. se connecter au serveur, puis :
cd /home/tipote/tiquiz-app && npm run check:storage
cd /home/tipote/tiquiz-app && npm run check:storage -- --detail   # + les 40 plus gros orphelins
cd /home/tipote/tipote-app && npm run check:storage
```

Et il faut que le code SOIT DÉJÀ DÉPLOYÉ : le script arrive avec le
`git pull`, comme le reste.

`scripts/storage-audit.mjs` liste le bucket, le pèse par dossier, croise
chaque fichier avec les colonnes qui pourraient le citer, et dit combien
pèse ce que plus personne ne référence. **Il ne supprime rien et n'en a
pas le pouvoir** : un fichier effacé par erreur, c'est l'image de
couverture d'une cliente qui disparaît de son quiz en ligne, sans retour
arrière.

Et il REFUSE de rendre un verdict si une seule de ses sources n'a pas pu
être lue : les fichiers qu'elle cite paraîtraient orphelins, et proposer
de les supprimer reviendrait à proposer d'effacer les images de résultat
de tout le monde. Une connaissance partielle ne doit jamais ressembler à
une connaissance complète.

### Les trois corrections, dans l'ordre de rentabilité

1. **Le ménage de l'existant.** Ce que le script mesure. Une seule
   passe, sur ce qui s'est accumulé depuis le lancement.
2. **Supprimer l'ancien fichier au remplacement.** On connaît son
   adresse : c'est la valeur de la colonne qu'on s'apprête à écraser.
   C'est ce qui empêche le problème de revenir.
3. **Supprimer les fichiers d'un quiz supprimé.** Aujourd'hui ils
   survivent à leur quiz pour toujours.

**Aucune des trois n'est écrite** : supprimer des fichiers d'une cliente
est irréversible, et ça se décide avec Béné, script de mesure en main.

### On archive AVANT, on supprime après (et peut-être jamais)

Béné, 26 août : "on ne supprime rien des clients à ce stade. On peut
archiver l'existant quelque part pour le retrouver en cas de besoin ?"

**Sur le serveur, toujours.** L'archive est écrite sur le disque du
serveur (400 Go, dont 47 utilisés), pas sur le PC.

```bash
cd /home/tipote/tiquiz-app && npm run storage:archive
cd /home/tipote/tipote-app && npm run storage:archive
# apres une coupure reseau, ne retelecharge que ce qui manque :
cd /home/tipote/tiquiz-app && npm run storage:archive -- --reprendre
```

L'archive atterrit dans `/srv/storage-archive/<projet>/`, et elle est
donc emportée par la sauvegarde hebdomadaire Hostinger avec le reste du
serveur.

`scripts/storage-archive.mjs` copie le bucket entier sur CE serveur, en
gardant l'arborescence, et écrit un `_manifeste.json` à côté : chemin,
taille, type, date de création, empreinte SHA-256. Sans le manifeste on
aurait un tas de fichiers dont personne ne saurait à quel quiz ils
appartenaient.

**Il ne supprime rien et ne connaît que la lecture.** Il VÉRIFIE la
taille de chaque téléchargement (une réponse tronquée s'écrirait sans
bruit, et l'archive mentirait au moment exact où on lui fait confiance)
et il SORT EN ERREUR si un seul fichier manque : une archive incomplète
qui se croit complète est pire que pas d'archive, parce qu'on
supprimerait ensuite en confiance.

L'empreinte SHA-256 sert deux fois : vérifier plus tard qu'un fichier
n'a pas bougé, et repérer les doublons exacts (le même visuel envoyé dix
fois sous dix noms différents, ce que l'horodatage garantit).

### Servir les images depuis NOTRE serveur

Béné, 26 août : "on a un super serveur quasiment inutilisé : on ne peut
pas l'exploiter davantage ? Histoire de ne pas avoir un abonnement en
plus à payer et d'éviter les futures alertes, sur toutes les app ?"

| | Supabase (gratuit) | Le serveur |
|---|---|---|
| stockage | 1 Go, **à 73 %** | 400 Go, à 47 |
| bande passante | 5 Go | 32 To, à 0,106 |
| CPU | - | à 1 % |

**Et ce chemin est déjà PROUVÉ dans ce dépôt.** Les vidéos de Popquiz
ne sont pas chez Supabase : elles sont sur ce serveur, envoyées par un
serveur TUS et servies par nginx (`infra/nginx/videos.*.conf`,
`lib/popquiz/playback.ts`). La migration a même son garde-fou :
`isSelfHostedPath()` distingue un chemin auto-hébergé d'un ancien chemin
Supabase, et le code sert les deux. **On ne migre rien : les anciennes
adresses continuent de marcher pour toujours, et seuls les NOUVEAUX
envois vont sur le serveur.**

Pour les images c'est plus simple que pour les vidéos, et il faut le
dire pour ne pas recopier la complexité inutilement :

- **Pas de `secure_link`.** Une vidéo est réservée aux élèves, donc son
  URL expire. Une image de quiz est PUBLIQUE : elle s'affiche sur une
  page ouverte et part dans les aperçus de partage. Une URL qui expire
  casserait l'aperçu Facebook d'un quiz partagé trois jours plus tôt.
- **Cache d'un an.** Le nom du fichier porte déjà l'horodatage de
  l'envoi, donc une adresse ne désigne jamais deux contenus différents.
- **Aucune exécution.** Ces fichiers viennent du téléversement d'une
  cliente : tout ce qui n'est pas une image se télécharge au lieu de
  s'afficher, et les extensions exécutables sont refusées.

**La sauvegarde est confirmée** (Béné, 26 août) : Hostinger fait des
snapshots hebdomadaires du serveur entier, stockés séparément. Un
disque mort ne perd donc au pire qu'une semaine d'images téléversées,
et l'archive du bucket vit sur le même disque, donc dans le même
snapshot. C'était le seul argument sérieux en face : il tombe.

### Ce qui est écrit, et comment on l'allume

Le code est là et **il est INERTE tant qu'une variable n'est pas
posée**. Sans `NEXT_PUBLIC_ASSETS_BASE_URL`, tout continue d'aller chez
Supabase, exactement comme avant.

| Pièce | Rôle |
|---|---|
| `lib/storage/cheminAsset.ts` | PUR et testé : quel chemin a le droit d'être écrit, et quelle adresse publique il obtient |
| `app/api/upload/asset/route.ts` | écrit le fichier dans `ASSETS_DIR` |
| `lib/storage/televerser.ts` | **le seul endroit qui décide** entre notre serveur et Supabase |
| `infra/nginx/assets.*.conf` | nginx sert le dossier |

**Les quinze appels recopiés dans les composants ont disparu.** Ils
appelaient tous `supabase.storage.from("public-assets").upload(...)` :
changer de destination demandait quinze modifications, et il suffisait
d'en oublier une pour que la moitié des images parte encore chez
Supabase sans que rien ne le signale. C'est le motif du dépôt depuis
trois mois (les réseaux de partage, le score, l'alignement du
sous-titre, la disposition des réponses).

**Sur le serveur, pour allumer :**

```bash
sudo mkdir -p /srv/public-assets && sudo chown tipote:tipote /srv/public-assets
sudo certbot certonly --nginx -d assets.quiz.tipote.com
sudo cp /home/tipote/tiquiz-app/infra/nginx/assets.quiz.tipote.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/assets.quiz.tipote.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Puis dans le `.env` de l'app, et SEULEMENT une fois que l'adresse
répond :

```
NEXT_PUBLIC_ASSETS_BASE_URL=https://assets.quiz.tipote.com
ASSETS_DIR=/srv/public-assets
```

`NEXT_PUBLIC_*` est gravée au moment du `next build` : il faut donc
reconstruire, pas seulement redémarrer (leçon du 22 août).

**La variable est VALIDÉE, pas seulement lue.** Une valeur vide, en
`http`, ou pointant sur `localhost` est ignorée et tout retombe sur
Supabase. Un `??` ne protège que de la variable absente, jamais de la
variable fausse : ici une base fausse écrirait des adresses MORTES dans
la base de données, sur des quiz publiés, et elles y resteraient après
correction de la variable.

**Et on ne perd jamais l'envoi d'une créatrice.** Si notre serveur
refuse (disque plein, droits, route pas déployée), le navigateur
retombe sur Supabase et le dit dans la console. Une image au mauvais
endroit se déplace ; une image perdue se re-téléverse, et la créatrice
ne sait pas pourquoi ça a raté.

### Le reste, sur la base elle même

**Rien n'est décidé, rien n'a été touché.** Ce qui suit est un repérage
fait dans les migrations. Ce n'est PAS urgent : la base est à 16 %.

```sql
-- À passer dans le SQL Editor de Supabase Tiquiz avant toute décision.
select relname as table,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total,
       pg_size_pretty(pg_relation_size(c.oid))       as donnees,
       pg_size_pretty(pg_indexes_size(c.oid))        as index,
       n_live_tup as lignes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_stat_user_tables s on s.relid = c.oid
 where n.nspname = 'public' and c.relkind = 'r'
 order by pg_total_relation_size(c.oid) desc
 limit 25;
```

### Les suspects, et pourquoi

Ce sont les tables qui grossissent avec le TRAFIC (pas avec le nombre de
clientes), et **aucune n'a de purge** : rien dans `app/api/cron/` ne
supprime quoi que ce soit.

| Table | Ce qu'elle stocke | Pourquoi elle enfle |
|---|---|---|
| `quiz_question_events` | une ligne PAR question VUE et PAR réponse | un quiz de 15 questions = jusqu'à 30 lignes par visiteur |
| `quiz_events` | vue / start / complete / share | une ligne par visiteur et par étape |
| `webhook_logs` | **le payload JSON COMPLET** de chaque appel reçu | le plus lourd par ligne, et il porte des données personnelles |
| `quiz_leads` | les réponses détaillées en JSONB | grossit avec les leads, mais c'est la DONNÉE MÉTIER : on n'y touche pas |
| `affiliate_clicks` | un clic = une ligne | grossit avec la promo des affiliés |

### Les trois pistes, dans l'ordre où je les proposerais

1. **Une rétention sur les événements bruts.** Les statistiques ne se
   lisent presque jamais au delà de 12 mois, et les RPC agrègent déjà.
   Garder le détail 90 ou 180 jours, et **agréger le reste avant de
   supprimer** (une ligne par quiz, par question et par jour). Attention :
   ça touche le funnel, donc `buildLiveFunnel` et `readFunnelSignal`
   doivent continuer à dire la même chose. C'est un chantier avec test,
   pas un `delete`.
2. **Purger `webhook_logs`, mais PAS n'importe comment.** C'est cette
   table qui a tranché le drame Ivan en dix secondes, et c'est elle qui
   porte le verrou d'idempotence des webhooks (`20260824_webhook_lock`).
   On peut vider le `payload` des lignes anciennes en gardant la ligne
   (source, type, statut, date) : on perd le détail, on garde la preuve
   et le verrou. Bonus : c'est aussi la bonne réponse RGPD, ces payloads
   contenant des adresses email et des montants.
3. **Sortir les événements de Supabase.** C'est le sens de sa phrase
   "on a un super serveur". Techniquement possible (Postgres sur le
   serveur, ou un fichier par jour), mais ça veut dire deux bases à
   sauvegarder et un chemin de plus qui peut tomber. **À ne regarder
   qu'après les deux premières pistes** : si la rétention suffit, le
   coût de ce chantier ne se justifie pas.

### Ce qu'il ne faut PAS faire

- Supprimer sans agréger : Adeline et Jocelyne lisent leurs stats, et
  une chute de courbe sans explication vaut un ticket de support.
- Toucher à `quiz_leads` : ce sont les leads de ses clientes, c'est le
  produit.
- Décider avant d'avoir la requête de tailles ci-dessus sous les yeux.
