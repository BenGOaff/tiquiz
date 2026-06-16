# L'expérience d'apprentissage du challenge (montée sans toucher au code de Tiquiz)

> Le cahier des charges de ce qui rend la formation novatrice : l'élève apprend les quiz en étant lui-même dans un quiz, guidé par un coach IA, avec ses propres livrables qui se pré-remplissent au fil des modules.
>
> Contrainte respectée : aucune modification du code de Tiquiz. On utilise Tiquiz comme n'importe quel créateur (on crée des quiz), Systeme.io pour héberger et automatiser, et un assistant IA externe pour le coach. On ne parle pas de Tipote ici.
>
> Voix Béné, tutoiement, zéro tiret long.

---

## Le principe en une phrase

L'élève ne regarde pas une formation sur les quiz. Il traverse un quiz funnel pour apprendre, coaché par une IA, et ressort avec son propre quiz déjà aux trois quarts construit à partir de ses réponses.

C'est la démonstration vivante de ton produit : avant la fin du jour 1, il a été capturé, segmenté et a reçu un résultat personnalisé. Il comprend dans sa chair pourquoi un quiz convertit.

---

## Ce qu'on utilise, et ce qu'on ne touche pas

| Brique | Rôle | Modification de code ? |
|---|---|---|
| Tiquiz (en tant que créateur) | Tu crées le quiz de diagnostic et les micro-quiz, exactement comme un utilisateur normal | NON, aucune |
| Systeme.io | Héberge la formation, automatise les emails et le déblocage des modules via les tags | NON, no-code natif |
| Assistant IA externe | Le coach qui répond aux questions et génère les briefs prêts à coller | NON, c'est un outil à part |

Ce qu'on NE fait PAS : modifier Tiquiz, modifier Tipote, coder quoi que ce soit dans tes apps. Tout est du montage no-code avec des outils existants.

---

## Mécanisme 1 : Le parcours-miroir

**Ce que c'est :** le challenge démarre par un quiz Tiquiz de bienvenue. L'élève y répond, est segmenté, et reçoit un parcours personnalisé. Il vit la capture et la segmentation depuis le siège du prospect.

**Comment on le monte (sans code) :**
- Tu crées un quiz Tiquiz "Quel créateur de quiz es-tu ?" (oui, un quiz sur les quiz). Questions : niveau (débutant / intermédiaire / avancé), niche, objectif principal, situation (a une liste email ou pas, vend déjà ou pas).
- Tu configures les tags Systeme.io par réponse : `niveau-debutant`, `niveau-avance`, `niche-coach`, `a-une-liste`, etc. (ce sont les answer tags, déjà dans Tiquiz).
- Dans Systeme.io, ces tags déclenchent : le bon email de bienvenue, et l'affichage du bon parcours (les blocs "si tu débutes" ou "si tu veux pousser" des modules).
- La page de résultat du quiz de diagnostic devient le "plan personnalisé" de l'élève : son point de départ, sa promesse, ses 3 premières actions.

**Ce que l'élève vit :** "J'ai juste répondu à un quiz et j'ai déjà un plan rien que pour moi. Ah, donc c'est ça que mon propre quiz fera à mes prospects." Le déclic, avant la première leçon.

---

## Mécanisme 2 : Le carnet qui se remplit tout seul

**Ce que c'est :** au lieu de templates vides à remplir, l'élève voit son propre quiz se pré-écrire au fil des modules, à partir de ses réponses. Apprendre et construire deviennent le même geste.

**Important (pour lever le malentendu) :** Tiquiz ne génère pas ça tout seul dans le code. C'est le coach IA (mécanisme 4) qui prend les réponses de l'élève et lui ressort ses livrables prêts à coller. L'élève colle ensuite dans la génération IA de Tiquiz et dans Systeme.io.

**Comment on le monte (sans code) :**
- À chaque module, l'élève répond à 3-4 questions (via un mini quiz Tiquiz ou directement dans le coach IA) : sa transformation, sa cible, ses mots volés, ses profils de résultats.
- Le coach IA assemble, à partir de ses réponses :
  - son brief à 3 couches prêt à coller dans la génération Tiquiz,
  - ses 3-4 résultats nommés,
  - sa liste de tags,
  - ses 7 séquences email pré-remplies avec sa niche et son offre.
- L'élève garde tout ça dans un carnet de bord (une page Systeme.io, ou un doc/Notion fourni en template).
- Au module 3, la génération du quiz devient triviale : le brief est déjà écrit pour lui, avec ses propres mots.

**Ce que l'élève vit :** "Je n'ai pas rempli un template générique, j'ai répondu à des questions sur moi et mon quiz s'est écrit au fur et à mesure." C'est ça qui accélère brutalement.

---

## Mécanisme 3 : Les micro-quiz qui débloquent + la gamification réelle

**Ce que c'est :** chaque module finit par un mini-quiz qui valide la compréhension et débloque le jour suivant. Et les points ne sont pas des étoiles, ce sont les leads réels captés.

**Comment on le monte (sans code) :**
- Le micro-quiz de fin de module = un petit quiz Tiquiz (2-3 questions). Le finir pose un tag dans Systeme.io.
- Ce tag déclenche, dans Systeme.io, l'envoi ou l'affichage du module suivant. C'est du déblocage par tag, natif, no-code.
- Garde ça léger : on débloque sur la complétion, pas sur un score parfait. On veut entraîner, pas recaler.
- Pourquoi ça marche : se tester pour avancer fait retenir bien mieux que re-regarder. Et l'élève s'entraîne encore à faire des quiz sans s'en rendre compte.

**La gamification réelle (anti-vanité) :**
- Les chiffres que l'élève suit sont ses vrais résultats, qu'il lit déjà dans les analytics Tiquiz et dans Systeme.io : leads captés, partages, ventes.
- Le classement de la communauté se fait sur ces vrais chiffres, pas sur des badges creux. Chacun poste ses chiffres.
- Les jalons à célébrer : quiz publié (J7), premier lead, 10 leads, première vente.
- Ça colle à ta ligne : on ne récompense pas le temps passé, on récompense les résultats.

**Ce que l'élève vit :** une progression concrète et honnête. "Je ne gagne pas des points imaginaires, je vois mes vrais leads monter."

---

## Mécanisme 4 : Le coach IA qui répond 24/7

**Ce que c'est :** un assistant IA, séparé de tes apps, nourri du contenu du challenge, qui répond aux questions des élèves à toute heure et génère leurs briefs (mécanisme 2). Il supprime le point d'abandon n°1 : rester coincé seul.

**Comment on le monte (sans code, sans toucher Tiquiz ni Tipote) :**
- Tu choisis une plateforme d'assistant no-code (un GPT personnalisé, un assistant Claude, ou un chatbot embarquable entraîné sur des documents).
- Tu lui donnes comme base de connaissance : les 9 fichiers de modules, le swipe file, les 7 séquences, et une FAQ. Tu as déjà tout ça dans ce dossier.
- Tu écris son instruction (sa personnalité de coach, dans ta voix) avec des garde-fous stricts.
- Tu embarques le lien du coach dans l'espace de formation Systeme.io.

**Ce qu'il fait :**
- Répond aux questions en se basant uniquement sur le contenu du challenge.
- Génère les briefs et livrables pré-remplis à partir des réponses de l'élève.
- Renvoie vers la bonne vidéo ou le bon fichier quand c'est utile.

**Ce que l'élève vit :** un coach dispo à 2h du matin qui le débloque sur sa niche précise. Ta solidarité, démultipliée, sans que tu répondes à 500 personnes.

---

## Le parcours complet de l'élève, bout en bout

1. Il s'inscrit, et tombe sur le quiz de diagnostic Tiquiz (mécanisme 1).
2. Il est segmenté, reçoit son plan personnalisé et son parcours (débutant ou avancé).
3. Chaque jour : une vidéo, puis il répond à quelques questions qui nourrissent son carnet (mécanisme 2).
4. Le coach IA est là dès qu'il bloque, et lui sort ses livrables prêts à coller (mécanisme 4).
5. Fin de module : un micro-quiz qui débloque la suite (mécanisme 3).
6. Il suit ses vrais chiffres et les poste dans la communauté (gamification réelle).
7. Au jour 7 son quiz est publié, monté à partir de ses propres réponses accumulées.

---

## Ordre de mise en place conseillé

1. **Le quiz de diagnostic** (mécanisme 1) dans Tiquiz + les tags + les automations Systeme.io. C'est le socle et c'est rapide.
2. **Le coach IA** (mécanisme 4) : charge les docs, écris l'instruction, teste, embarque le lien. C'est lui qui porte les mécanismes 2 et le déblocage de valeur.
3. **Les micro-quiz** (mécanisme 3) : un petit quiz Tiquiz par module + le déblocage par tag dans Systeme.io.
4. **Le carnet de bord** (mécanisme 2) : la page ou le doc qui centralise les livrables générés.
5. **La gamification réelle** : le classement communauté sur les vrais chiffres.

Tu peux lancer la première promo avec juste les mécanismes 1 et 4, et ajouter le reste à la promo suivante. Le 1 et le 4 portent déjà 80% de l'effet.

---

## Garde-fous (non négociables, dans ta ligne)

- **Anti-hallucination** : le coach répond uniquement à partir du contenu fourni. S'il ne sait pas, il le dit et renvoie vers toi ou la communauté. On ne laisse jamais l'IA inventer une méthode ou un chiffre.
- **Voix et éthique** : tutoiement, ton chaleureux et direct, zéro fausse urgence, zéro promesse de chiffre. Le coach respecte ta charte.
- **Zéro tiret long** dans tout ce que le coach produit (même règle que ton contenu user-visible).
- **L'IA assiste, elle ne remplace pas** : le coach débloque et accélère, mais c'est l'élève qui agit et toi qui restes la référence.

---

## Pourquoi c'est révolutionnaire (et pas un gadget)

- C'est personnalisé : chacun son parcours, ses livrables, ses réponses du coach.
- C'est actif : on fait au lieu d'écouter, et on se teste pour retenir.
- C'est la preuve par l'expérience : l'élève a été client de son propre futur funnel.
- Et ça ne coûte presque rien à monter, parce que ça repose sur des outils que tu as déjà et sur le contenu déjà écrit dans ce dossier.

Prochaine étape possible : je rédige l'instruction complète du coach IA (sa personnalité, ses règles, ses garde-fous, ses prompts de génération de livrables), prête à coller dans la plateforme que tu choisis. C'est la pièce qui débloque le plus de valeur, et la plus rapide à mettre en place.
