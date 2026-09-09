# Passation, 9 septembre 2026

Ce fichier dit **où on s'est arrêté** et **par quoi reprendre**. Il ne
remplace ni `AGENTS.md` (les pannes déjà arrivées, et pourquoi les
règles existent) ni `CHANTIERS.md` (ce qui reste à faire, dans ses mots
à elle). Il est daté : au delà de quelques jours, il se relit avec
méfiance, et **celui qui le corrige le corrige EN PLACE** plutôt que
d'empiler une note de plus.

---

## 1. Où en est le code

Les trois dépôts sont **propres, poussés, rien en attente** :

| Dépôt | Dernier commit poussé |
|---|---|
| `/home/user/tiquiz` | `ea255bd3` la charge du quiz part avec le HTML |
| `/home/user/tipote-app` | `da809349` le domaine perso ne sert que SES quiz |
| `/home/user/formaquiz` | `b9e5db9` le compteur de trafic de l'Atelier |

**La branche de travail CHANGE à chaque session.** Elle est dans la
consigne de session, jamais dans un fichier : celle écrite ici sera
périmée demain. On ne pousse JAMAIS sur `main`.

---

## 2. Les cinq règles qui coûtent le plus cher quand on les oublie

1. **Avant CHAQUE push, sans qu'on le demande** : `npm run test:logic`
   (doit passer), `npx tsc --noEmit` (exit 0), et `npm run test:visual`
   **uniquement si le design ou l'UX bouge** (~7 min, harnais sur le
   port 4123).
2. **Zéro tiret cadratin `—` et zéro tiret demi-cadratin `–` dans tout
   contenu vu par un humain, dans TOUTES les langues.**
   `grep -rn "—\|–" messages` doit rendre zéro. Les commentaires de code
   peuvent en porter.
3. **Toute migration SQL touchée donne un bloc 🚨 visible dans le message
   final**, avec le fichier ET sur QUEL Supabase la passer.
4. **Les fichiers SUPPRIMÉS, et eux seuls, se listent dans le message
   final**, avec leur chemin. Son déploiement est un copier-coller
   manuel : il emporte très bien les fichiers nouveaux, il ne retire
   jamais ce qui a disparu. Ne jamais lister les fichiers nouveaux,
   c'est du bruit qu'elle doit trier.
5. **Béné ne lit pas les dossiers.** Tout ce qu'elle doit faire ou copier
   va dans le message final, une commande à la fois, aucun paramètre à
   remplacer.

**Et la règle qui vaut plus que toutes les autres : ne jamais affirmer
sans avoir mesuré.** Une recherche vide dit "je n'ai pas trouvé", pas
"ça n'existe pas". Une cause plausible n'est pas une cause. Un
commentaire n'est pas une mesure (ce dépôt l'a payé **dix fois**). Un
vert local ne prouve rien sur un rendu ni sur un contrat d'API : la
dernière étape n'est pas de lancer les tests, c'est d'aller chercher
l'URL et de lire ce qui répond.

---

## 3. Ce qui a été fait dans la session qui se termine

Dans l'ordre, et tout est poussé.

- **Le site public en anglais** (8 septembre). Les URL `/en/<chemin>`,
  `hreflang`, une canonique par langue, le meuble traduit, les 10
  articles du blog en anglais, les 6 pages d'outil, `/a-propos`,
  `/newsletter`. Le français ne porte aucun préfixe : ses URL indexées
  ne bougent pas.
- **Le contenu perdu à l'import des articles français est rendu**
  (2 555 mots, dont le tableau des 8 outils du comparatif), la vidéo
  YouTube de `avis-tiquiz`, la fin du cas client de Jocelyne, ses quatre
  liens en cartes, et les FAQ sourcées.
- **Chantier 1, la mesure** (`f741d9b6`) : les cinq événements, une
  seule porte d'envoi avec une file, la durée en base.
- **Chantier 2, la vitesse** (`ea255bd3`) : la charge du quiz part avec
  le HTML, calculée par une seule fonction que la page ET la route
  appellent.

**Trouvé en chemin, et corrigé dans les DEUX dépôts** : le domaine perso
d'une créatrice pouvait servir le quiz de quelqu'un d'autre pendant une
panne de base, parce que le code lisait "je n'ai pas pu vérifier" comme
"il n'y a rien à vérifier".

---

## 4. PAR QUOI REPRENDRE, dans cet ordre

### a) Relever la médiane AVANT le chantier 3, et ça ne peut pas attendre

Elle veut "la durée médiane de génération mesurée **avant et après** le
chantier 3". **Le chiffre "avant" n'existe pas encore** : aucune
génération ne portait de durée avant le 9 septembre, et la médiane rend
`null` sous 10 générations chronométrées.

Donc : la migration `20260909_generateur_duree.sql` doit être passée,
puis il faut laisser passer quelques jours de trafic, **et relever le
chiffre dans `/admin` AVANT de livrer le streaming**. Livrer le
chantier 3 d'abord rend la comparaison impossible pour toujours.

### b) Chantier 3 : le streaming de la génération

C'est celui qu'elle appelle "le chantier qui rapporte le plus". Le
détail complet est dans `CHANTIERS.md`, section 0.3. Ce qu'il faut
savoir avant d'ouvrir un fichier, et qui est MESURÉ :

- la plomberie SSE vers le navigateur **existe déjà**
  (`app/api/embed/quiz/generate/route.ts`) ;
- **l'appel à Anthropic n'est PAS streamé** : `stream: true` est absent ;
- le JSON est lu d'un coup à la fin, et `EmbedPreviewClient` n'affiche
  rien avant l'événement `result`.

Les trois pièges à ne pas se prendre : le repli n'est **jamais** un
écran blanc ; `prefers-reduced-motion` coupe les apparitions ; et la
question Systeme.io **ne bloque rien**, sa réponse part dans
`generation_reussie` sous la clé `systemeio`.

### c) Chantiers 4, 5, 6

🚨 **LE CHANTIER 4 EST FAIT (9 septembre, `55d6c63f`)**, et cette section
disait qu'il était bloqué. `lib/generateur/prefillUrl.ts` existe, il est
pur, il écrit le lien ET le relit, et le détail vit dans `AGENTS.md`
(section « Le contrat d'URL du générateur »). À retenir sans l'ouvrir :
la PORTE (`page-generateur`) ne se lit plus dans l'URL, sinon les six
cartes de la landing auraient fait disparaître leurs générations de son
entonnoir.

**Le chantier 6 n'est plus bloqué non plus** : `tiquiz-landing.html` est
dans le dépôt, sur `main`, à `copywriting-claude/tiquiz-landing.html`
(1056 lignes, aucun tiret cadratin). Le point à ne pas rater en le
portant : **ses douze liens ne portent NI `source` NI `profil`**, donc
toutes les générations de la landing sortiraient en `"direct"`. Les six
cartes sont `source: "modeles"`, les six boutons de résultat du quiz du
hero `source: "hero"` avec leur profil, et `lienGenerateur` l'exige par
le compilateur.

Reste le chantier 5 (le brouillon 7 jours), qui n'a jamais été bloqué.

---

## 5. Ce qu'il faut lui demander, et qui bloque du travail

🚨 **QUATRE DES CINQ ONT ÉTÉ TRANCHÉES LE 9 SEPTEMBRE**, et cette liste
les posait encore. Corrigé en place plutôt qu'empilé.

| Ce qui était demandé | Sa réponse |
|---|---|
| le code de `prefillUrl.ts` | donné, corrigé, en place |
| `tiquiz-landing.html` | sur `main`, dans `copywriting-claude/` |
| 3 par heure, ou 2 par 24 h ? | **2 par 24 h**, le code ne bouge pas |
| « À qui s'adresse-t-il ? » | **obligatoire et annoncé** |

Reste ouvert, et ça bloque encore :

1. **la validation de la landing** sur `/apercu-landing-8f2c9d41` ;
2. **la migration `20260909_generateur_duree.sql`**, sans laquelle la
   médiane d'avant le chantier 3 ne pourra jamais être relevée.

---

## 6. Les migrations récentes, à vérifier avant toute autre chose

`npm run check:migrations-pending` dit ce qui manque en production. Les
cinq dernières, dans l'ordre :

| Fichier | Sur quel Supabase |
|---|---|
| `20260902_generateurs_contenus.sql` | Tiquiz **et** Tipote |
| `20260903_generateurs_reprise.sql` | Tiquiz **et** Tipote |
| `20260907_trafic_pages_publiques.sql` | Tiquiz **et** l'Atelier |
| `20260908_generateur_usage.sql` | Tiquiz |
| `20260909_generateur_duree.sql` | Tiquiz |

Une migration jamais passée ne casse rien tout de suite : elle fait
perdre des données **en silence**, et ce dépôt a déjà payé 15 jours de
statistiques comme ça.

---

## 7. Un défaut trouvé aujourd'hui et PAS corrigé

**Le générateur public rend ses erreurs en FRANÇAIS, et la page existe
en anglais depuis le 8 septembre.**

`app/api/embed/quiz/generate/route.ts` renvoie des PHRASES ("L'IA a mis
trop de temps. Réessaie.", "JSON IA invalide. Réessaie." : **dix sorties
d'erreur, six phrases françaises distinctes**, plus le message brut
d'une exception)
et `EmbedPreviewClient` fait `setError(payload.error)`, donc il les
affiche telles quelles. Sur `/en/generateur-de-quiz`, une visiteuse
anglophone lit du français au moment exact où quelque chose échoue.

C'est la règle du 3 septembre, déjà appliquée aux onze autres chemins
IA : **le serveur rend une RAISON, l'écran la traduit** (`lib/ia/
echecIa.ts`, `hooks/useEchecIa.ts`, namespace `erreursIa`). Ce chemin là
n'a jamais été repris. À faire en même temps que le chantier 3, qui
touche exactement ce fichier.

---

## 8. Ce qui reste ouvert par ailleurs

Le détail est dans la liste des tâches et dans `CHANTIERS.md`.

- **la génération anonyme n'a AUCUN plafond de dépense.**
  `ANTHROPIC_EMBED_DAILY_BUDGET` est nommée dans un commentaire et lue
  **nulle part**. C'est plus urgent depuis le 8 septembre : le
  générateur public écrit avec le modèle de l'éditeur payant ;
- **les visuels du blog à redessiner** (chiffres périmés, un lien `?sa=`
  vers un tunnel Systeme.io) : un dessin ne se corrige pas en code ;
- **`<html lang>` vaut `en` sur `/blog` et `/support`** alors que le
  contenu est français. Deux chemins possibles, aucun gratuit, c'est sa
  décision ;
- **les trois dépôts GitHub sont PUBLICS** : sa décision ;
- **`git config --global http.version HTTP/1.1` sur le serveur**, pour
  les trois apps ;
- **l'adresse d'expédition de Tipote** : sa décision ;
- **un webhook sortant / une API** pour Make, Zapier, n8n.
