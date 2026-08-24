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

**Deux exceptions, nommées dans le code et dans le test :**

- `tiquiz_free` : voir ci-dessus, c'est un optin chez eux.
- `atelier` : **l'Atelier a son PROPRE registre d'affiliés.**
  `attributeQuizingSale` résout le `sa` contre `profiles.
  sio_affiliate_id` dans SA base, pas contre la table `affiliates` de
  Tipote. Une affiliée Tipote qui n'est pas élève de l'Atelier serait
  `affiliate_not_registered`, alors que le tunnel Systeme.io la paie. Et
  l'Atelier ne lit que `?sa=`, jamais `?ref=`. **Repointer ce lien change
  QUI est payé.** Le chantier est : unifier les deux registres, ou porter
  `?ref=` côté Atelier ET accepter que seuls les élèves affiliés soient
  payés.

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
- **Le remboursement PayPal n'est pas possible depuis l'admin.**
  `app/api/admin/ventes/rembourser/route.ts` refuse tout ce qui n'est pas
  `provider === "stripe"`. Une vente PayPal se rembourse aujourd'hui dans
  l'interface PayPal, et le webhook fait le reste correctement (accès
  fermé, abonnement arrêté, avoir émis). C'est le BOUTON qui manque.
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

**À discuter le 25 août. Rien n'est décidé, rien n'a été touché.** Ce qui
suit est un repérage fait dans les migrations, pour ne pas partir de
zéro demain. **Je n'ai pas mesuré la base réelle** : la première chose à
faire est de regarder les tailles réelles, pas de théoriser (leçon du
22 août : un journal se LIT, il ne se déduit pas).

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
