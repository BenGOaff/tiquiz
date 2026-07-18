-- ════════════════════════════════════════════════════════════════
-- QUIZING - base de connaissance du coach : frameworks avances
-- ════════════════════════════════════════════════════════════════
-- Arme le coach IA avec des concepts a haute valeur (persuasion, methode
-- Ask, objectifs de quiz, growth hacks), formules de facon actionnable et
-- non scolaire. Idempotent (insere seulement si le titre n'existe pas).
-- Editable ensuite dans l'admin (Coach). Accents respectes, zero tiret long.

insert into coach_knowledge (title, content, enabled, sort_order)
select 'Persuasion appliquée au quiz (résultats qui convertissent)',
$$Un quiz qui convertit ne décrit pas, il fait ressentir. Applique ces leviers dans les RÉSULTATS et les questions, jamais en mode théorique.

La trame des 5 leviers (Blair Warren). Écris chaque résultat en cochant un maximum de ces points :
- Encourager le rêve : montre que ce qu'il vise est possible pour lui.
- Justifier l'échec passé : "ce n'est pas ta faute, on t'a mal outillé". Tu enlèves la culpabilité.
- Apaiser la peur : nomme-la, puis désamorce-la.
- Confirmer un soupçon : dis tout haut ce qu'il pense tout bas ("tu sentais bien que...").
- Désigner un ennemi commun : pointe le vrai coupable (une méthode, un mythe, un système), jamais le lecteur. Tu te places de SON côté.
Exemple : "Tu n'es pas du genre à abandonner. Si rien n'a marché, c'est que tu as suivi des méthodes pensées pour d'autres que toi. Voilà la tienne."

Cialdini, version actionnable dans un quiz :
- Cohérence et micro-engagement : première question facile = un premier oui. Le cerveau veut finir ce qu'il commence, donc il va au bout et donne son email.
- Preuve sociale : "rejoins les 2 000 qui ont déjà fait le test" (chiffre vrai uniquement).
- Sympathie : utilise les mots exacts de la cible, son humour, son quotidien. On aime qui nous ressemble.
- Rareté honnête : un bonus limité dans le temps, jamais un faux compte à rebours.
- Autorité : un insight précis dans le résultat prouve l'expertise mieux que dix "je suis expert".

Règle d'or : on suggère toujours une suite logique (le CTA), avec empathie mais sans complaisance.$$,
true, 10
where not exists (select 1 from coach_knowledge where title = 'Persuasion appliquée au quiz (résultats qui convertissent)');

insert into coach_knowledge (title, content, enabled, sort_order)
select 'La méthode Ask : sonder avant de deviner',
$$Principe : la cible connaît ses mots mieux que toi. Ton rôle, c'est de les récolter et de les lui renvoyer.

Le mini-sondage Deep Dive (avant de créer ou d'améliorer un quiz) :
- Une seule question ouverte à l'audience : "Quel est ton plus gros défi avec [le sujet] en ce moment ?".
- Lire les réponses, repérer les mots qui reviennent, les formulations exactes, les émotions.
- Ces mots deviennent les questions, les profils de résultats, les titres. Le quiz devient un miroir.

Les seaux (buckets) :
- Les gens ne sont pas au même endroit. Regroupe-les en 3 ou 4 profils de résultats.
- À chaque seau, son message, sa séquence email, son offre. Tu écris une fois, ça parle juste à chacun.
- La chaîne : question = profil = tag = séquence = offre adaptée.

La question qui améliore tout : sur la page de résultat ou dans le premier email, demander "Qu'est-ce qui a failli t'empêcher d'aller au bout ?". Les réponses donnent la prochaine version, le prochain angle, la prochaine offre. Le quiz s'améliore tout seul, avec leurs mots.$$,
true, 20
where not exists (select 1 from coach_knowledge where title = 'La méthode Ask : sonder avant de deviner');

insert into coach_knowledge (title, content, enabled, sort_order)
select 'Les 16 objectifs possibles d''un quiz',
$$Un quiz peut viser bien plus que "capter un email". Aide l'élève à choisir UN objectif principal, puis cale le reste dessus.

Le menu :
- Engager : contenus fun et interactifs.
- Éduquer : transmettre une connaissance.
- Qualifier : évaluer un niveau ou des compétences.
- Sensibiliser : faire prendre conscience.
- Réviser : consolider des acquis.
- Découvrir : explorer un sujet.
- Tester : vérifier des connaissances.
- Classer : positionner dans un niveau.
- Challenger : stimuler la progression.
- Initier : découvrir les bases.
- Perfectionner : approfondir l'existant.
- Diagnostiquer : identifier lacunes et freins.
- Motiver : redonner de l'élan.
- Certifier : valider un niveau.
- Orienter : guider vers une offre ou un choix.
- Recruter : évaluer pour sélectionner.

Pour la capture de leads, les plus rentables sont en général : diagnostiquer, orienter, qualifier, sensibiliser. Choisir UN objectif rend le quiz net.$$,
true, 30
where not exists (select 1 from coach_knowledge where title = 'Les 16 objectifs possibles d''un quiz');

insert into coach_knowledge (title, content, enabled, sort_order)
select 'Pépites growth (à activer concrètement)',
$$Des leviers simples que presque personne n'exploite :
- Le résultat-badge : donne à chaque profil un nom qu'on a envie d'afficher ("L'Architecte", "Le Stratège pragmatique"). On partage ce qui nous valorise, chaque lead devient un panneau publicitaire.
- L'email au pic de curiosité : place la capture juste avant le résultat. La curiosité ouverte par les questions ne se referme qu'avec l'email.
- L'anti-triche honnête : "partage pour débloquer ton plan détaillé". Viralité assumée, pas mendiée.
- Le trafic recyclé : la page de remerciement du freebie actuel est le meilleur gisement de visiteurs gratuits.
- Un quiz = des semaines de contenu : un post par résultat, par question, par statistique récoltée.
- L'identité avant la liste : on ne rejoint pas une newsletter, on rejoint une identité ("le cercle des Architectes"). Nomme la communauté d'après le résultat valorisant.$$,
true, 40
where not exists (select 1 from coach_knowledge where title = 'Pépites growth (à activer concrètement)');

notify pgrst, 'reload schema';
