-- ════════════════════════════════════════════════════════════════
-- QUIZING - "La pépite" par jour (nuggets avances et actionnables)
-- ════════════════════════════════════════════════════════════════
-- Persuasion (Blair Warren, Cialdini) + methode Ask + growth hacks,
-- en mots simples et orientes passage a l'action. Glossaire applique
-- ({client}, {audience}, {offre}). Idempotent. A relancer apres modif.
-- Accents respectes, aucun tiret long.

update days set pepite_html =
$$<p>Tes résultats ne décrivent pas, ils retournent gentiment le couteau. La trame qui convertit : encourage le rêve, déculpabilise l'échec passé, apaise la peur, confirme un soupçon, et désigne le vrai coupable (une méthode, un mythe), jamais {client}. Exemple de résultat : "Tu n'es pas désorganisé. On t'a vendu des méthodes faites pour des robots, pas pour toi. Voilà la tienne." Ça vend sans vendre.</p>$$
where day_number = 1;

update days set pepite_html =
$$<p>Un tag n'est pas une étiquette morte, c'est un déclencheur. Poser le tag, c'est démarrer LA bonne séquence. Au lieu d'un email pour tout le monde, tu parles à des seaux : chaque segment reçoit le message qu'il attendait. Tu écris une fois, ça sonne juste pour chacun.</p>$$
where day_number = 2;

update days set pepite_html =
$$<p>Avant de deviner ce que veut {audience}, demande-lui. Le mini-sondage : une seule question ouverte, "quel est ton plus gros défi avec ça en ce moment ?". Tu récoltes leurs mots EXACTS, et ton quiz devient un miroir. On adore ce qui nous ressemble, et c'est ça qui fait répondre jusqu'au bout.</p>$$
where day_number = 3;

update days set pepite_html =
$$<p>Ta première question n'évalue rien : elle fait dire OUI. Un petit oui facile et flatteur, et le cerveau veut finir ce qu'il a commencé. Place l'email JUSTE avant le résultat : la curiosité ouverte par tes questions ne se referme qu'avec l'email. C'est là, précisément, que se jouent la plupart de tes leads.</p>$$
where day_number = 4;

update days set pepite_html =
$$<p>Le hack du résultat qu'on a envie d'afficher. On partage ce qui nous valorise : donne à chaque profil un nom-badge ("L'Architecte", "Le Stratège pragmatique") et une jolie image de partage. Chaque lead devient un panneau publicitaire gratuit. Ajoute l'anti-triche honnête : "partage pour débloquer ton plan détaillé".</p>$$
where day_number = 5;

update days set pepite_html =
$$<p>On ne rejoint pas une liste, on rejoint une identité. Nomme ta communauté d'après le résultat valorisant ("le cercle des Architectes"). On agit pour rester cohérent avec qui on a dit qu'on était : ton quiz donne une identité, ta communauté la fait vivre. C'est là que le lead devient fan, puis client.</p>$$
where day_number = 6;

update days set pepite_html =
$$<p>Ne devine jamais pourquoi ça coince : demande. Sur ta page de résultat ou dans ton premier email, glisse LA question, "qu'est-ce qui a failli t'empêcher d'aller au bout ?". Leurs réponses te donnent ta prochaine version, ton prochain angle, et même {offre} de demain. Ton quiz s'améliore tout seul, avec leurs mots.</p>$$
where day_number = 7;

notify pgrst, 'reload schema';
