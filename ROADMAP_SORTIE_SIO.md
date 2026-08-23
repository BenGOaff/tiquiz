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

Dernière vérification : 24 août 2026.

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
| Le contact et ses étiquettes | on ne CRÉE pas de contact chez eux | **1** |
| Le paiement des affiliés | aucune table, aucun écran, aucun virement chez nous | **2** |
| L'inscription d'un affilié | `affiliates.sa` est la clé primaire | **2** |
| Les pages de vente | 1 page répliquée sur 8+ | **3** |
| Les codes de réduction | 54 codes actifs chez eux, 0 chez nous | **4** |
| Les clients payants actuels | tous abonnés chez Systeme.io | **5** |

---

## 2. Chantier 1 : le contact doit EXISTER chez Systeme.io

**C'est le plus urgent, et il grossit à chaque vente prise chez nous.**

`poserTagAchat` (`lib/sio/appliquerTag.ts`) pose l'étiquette qui
déclenche les séquences. Elle échoue, en silence pour la cliente, quand
le contact n'existe pas là-bas. Le code le dit lui même :

> "Le cas normal d'un client venu de NOTRE bon de commande sans jamais
> passer par un tunnel Systeme.io. On le dit : c'est une personne qui
> sortira de ses séquences."

Autrement dit : **quelqu'un qui achète sur notre bon de commande n'entre
dans aucune séquence email.** Pas de message de bienvenue, pas de
relance, pas de segment. Aujourd'hui ça touche peu de monde parce que
presque tout passe encore par Systeme.io. Le jour où nos ventes
deviennent la norme, ça touche tout le monde, et personne ne le voit
puisque l'accès s'ouvre normalement.

**Ce qu'il faut faire :**

1. `creerContact(email, prenom, nom)` dans `lib/sio/contacts.ts`, qui est
   aujourd'hui en LECTURE SEULE (aucun POST). L'API le permet
   (`POST /contacts`), et notre client `sioUserRequest` sait déjà écrire.
2. `poserTagAchat` crée le contact s'il n'existe pas, puis étiquette.
   Ordre imposé : le contact d'abord, l'étiquette ensuite.
3. Rester **best-effort** : une panne chez eux ne doit jamais bloquer un
   accès payé (règle du 7 août). On journalise fort.
4. Étendre aux autres moments de vie, pas seulement l'achat : passage en
   gratuit, résiliation, remboursement, montée de palier. Une séquence
   "ton abonnement se termine" ne peut pas exister si l'étiquette n'est
   jamais posée.
5. **Ne JAMAIS créer une étiquette manquante** (règle déjà en place) :
   une étiquette créée par nous avec une faute se retrouverait en double
   et ses automatisations continueraient de pointer l'ancienne.

**Décision qui est la sienne :** quelles étiquettes pour quels
événements. La liste vit dans `lib/sio/tags.ts` et doit correspondre à ce
qui existe VRAIMENT dans son compte.

---

## 3. Chantier 2 : payer les affiliés

C'est le plus gros, et il se découpe en trois.

### 3.1 Rien ne paie personne aujourd'hui

Vérifié : `affiliate_commissions` porte bien les statuts
(`pending / approved / paid / cancelled / rejected`) et une colonne
`payout_id`, mais **aucune table `affiliate_payouts` n'existe, et aucun
code ne fait passer une commission d'un statut à l'autre.** Les statuts
sont décoratifs.

Et la page Paiement de l'espace affilié
(`app/affiliate/paiement/page.tsx`, côté Tipote) dit explicitement que
tout se passe chez Systeme.io : c'est là que l'affilié règle son PayPal
ou son IBAN, et c'est là que Béné vire entre le 10 et le 13 du mois.

**Ce qu'il faut :**

1. **Les coordonnées de paiement chez nous.** Les colonnes existent
   (`paypal_email`, `iban_holder`, `iban_number`) mais ont été
   volontairement débranchées en juin, parce qu'elles faisaient croire
   à une configuration qui n'existait pas. Les rebrancher veut dire les
   traiter comme des données bancaires : chiffrement au repos (le
   modèle est déjà là, `lib/sio/keyCrypto.ts`), et aucune lecture par
   une route qui n'en a pas besoin.
2. **Un cycle de versement.** Table `affiliate_payouts`, un lot par
   mois et par affilié, qui fige les commissions `approved` et bascule
   tout en `paid`. Le lot doit être une PIÈCE, pas un calcul refait à
   l'affichage : sinon la somme affichée bouge quand une commission est
   annulée après coup.
3. **Une règle d'approbation, écrite une fois.** Une commission passe
   `pending -> approved` quand le délai de rétractation est écoulé ET
   que la vente n'a pas été remboursée. Aujourd'hui c'est Béné qui le
   fait de tête dans Systeme.io.
4. **Le versement lui même.** Deux voies possibles, et c'est une
   décision :
   - PayPal Payouts (API) : automatique, commission PayPal par envoi ;
   - virement à la main depuis un export SEPA : gratuit, manuel.
   Dans les deux cas il faut **la facture de commission** (l'affilié est
   un prestataire : c'est LUI qui facture, ou on émet un
   autofacturation avec son accord écrit).

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

### 3.3 Les liens pointent encore vers les tunnels Systeme.io

Sur les 8 destinations de `lib/affiliate/linkDestinations.ts` (Tipote),
**7 mènent à des tunnels Systeme.io** (`/part-tiquiz-mensuel`,
`/part-tiquiz-annuel`...). Une seule, `tiquiz_direct`
(`https://tiquiz.fr/`), arrive sur notre domaine.

Or les pages Systeme.io ne nous transmettent pas la query : un `?ref=`
posé dessus n'atteint jamais notre bon de commande. Ces liens
commissionnent toujours, mais **via Systeme.io**, et ils n'ouvrent pas le
mois offert.

Repointer est mécanique. Ce qui ne l'est pas, c'est de décider quel
tunnel bascule chez nous et quand : voir chantier 3.

---

## 4. Chantier 3 : les pages de vente

Une seule page est répliquée chez nous : `content/sales/tiquiz.html`,
servie sur `tiquiz.fr` (`lib/sales/servePage.ts`). Les pages par palier
(`tiquiz-mensuel`, `-annuel`, `-gratuit`, les `-plus`) et toutes les
pages Tipote sont encore chez Systeme.io.

**La méthode est déjà écrite et éprouvée** (19 août) : capture depuis
l'URL EN LIGNE avec `scripts/fetch-sales-page.mjs`, jamais depuis un
export fait à la main, puis vérification dans un navigateur en cliquant
les boutons. Un export SingleFile perd les scripts sans que rien ne le
signale.

Ce qu'il faut, page par page : capturer, servir, réécrire les liens de
commande vers `/commande/<produit>` (`renderSalesPage` l'exige déjà comme
paramètre obligatoire), vérifier le référencement (canonique, titre,
description), et seulement ensuite repointer la destination affiliée.

**Décision qui est la sienne :** l'ordre. Le plus rentable d'abord est
probablement le tunnel gratuit, parce que c'est lui qui alimente tout le
reste.

---

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

1. **Le contact Systeme.io** (chantier 1). Petit, et il empire chaque
   jour où on vend chez nous.
2. **Le bouton Rembourser PayPal** (chantier 4). Une heure, et ça retire
   un aller-retour manuel à chaque geste commercial.
3. **Les factures de l'Atelier** (chantier 7). Portage, la mécanique est
   écrite et testée.
4. **Les pages de vente**, une par une (chantier 3), en repointant la
   destination affiliée juste après chacune.
5. **Les codes de réduction** (chantier 4), avant d'avoir trop de
   clients chez nous : c'est plus simple à poser avant qu'après.
6. **Le paiement des affiliés** (chantier 2), qui est un vrai produit à
   lui seul, et qu'il vaut mieux attaquer quand le reste est stable.
7. **La clé technique des affiliés** (3.2), le jour où elle veut
   recruter quelqu'un qui n'a pas de compte Systeme.io.

**Ce qui ne partira jamais :** les emails, donc le pont vers Systeme.io.
Le but n'est pas de couper le lien, c'est de n'en garder qu'un seul, et
qu'il aille dans un seul sens : nous écrivons chez eux, ils ne décident
plus rien chez nous.

---

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
