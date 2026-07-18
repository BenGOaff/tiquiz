-- ════════════════════════════════════════════════════════════════
-- QUIZING : seed du parcours condensé (7 jours, J0 à J7) + 5 bonus
--   (101 trafic payant, 102 vendre, 103 sondages, 104 popquiz,
--    105 promouvoir par réseau : module multi-vidéos, une par réseau)
-- ════════════════════════════════════════════════════════════════
--
-- Source : contenu/support-jours/*.md (contenu de page vu par l'élève) et
-- contenu/structure/STRUCTURE-7-jours.md (ordre). Le "Résumé + Points clés
-- + Actions" devient intro_html ; "Le quiz à valider" devient les questions.
-- Règle d'or : questions d'action/décision sur le projet de l'élève.
-- Déblocage à la COMPLÉTION (réponse fournie), jamais sur un score : les
-- questions de rappel servent au feedback, pas à bloquer (required=false).
-- Tutoiement, accents respectés, zéro tiret long.
--
-- Idempotent. Nettoie l'ancienne structure (J-3, J8 à J14, ancien bonus 99).

-- Nettoyage de l'ancienne structure (cascade sur questions/réponses de test).
delete from days where day_number not in (0,1,2,3,4,5,6,7,101,102,103,104,105);

-- ───────────────────────────────────────────────────────────────
-- 1. Les jours (J0 à J7) + bonus (101 à 104)
-- ───────────────────────────────────────────────────────────────
insert into days (day_number, slug, title, subtitle, intro_html, result_html, status, sort_order, resources, is_bonus)
values
(
  0, $s$j0-bienvenue$s$, $t$Bienvenue$t$, $st$Le quizing, comment marche l'Atelier, et ton engagement$st$,
  $html$<p>Bienvenue dans la boucle : ici, tu apprends à faire un quiz... en faisant un quiz. Un quizing, c'est une formation que tu ne regardes pas, tu la fais. Chaque jour, une courte vidéo explique, puis un quiz te fait avancer sur TON projet. En 7 jours, tu repars avec un vrai quiz en ligne, branché à Systeme.io, qui capte des leads tout seul.</p>
<h2>Comment marche l'Atelier</h2>
<ul>
<li>1 jour = 1 courte vidéo, puis 1 quiz qui te fait passer à l'action.</li>
<li>Finir le quiz du jour débloque le jour suivant.</li>
<li>Un coach répond à tes questions, jour et nuit.</li>
<li>Tes réponses ne sont pas un test : elles construisent ton projet, jour après jour.</li>
</ul>
<h2>Ce que tu repars avec dans 7 jours</h2>
<ul>
<li>Un quiz en ligne, prêt à partager.</li>
<li>Branché à ton Systeme.io : tes contacts arrivent tout seuls.</li>
<li>Une méthode claire pour le remplir de monde.</li>
<li>La fierté de l'avoir fait, pas juste regardé.</li>
</ul>
<h2>Growth hack : dis-le à voix haute</h2>
<p>Écris ta promesse devant tout le monde : "je publie mon quiz dans 7 jours". On tient plus facilement parole quand on s'est engagé en public, et ceux qui le disent tout haut finissent beaucoup plus souvent. Va dans le groupe de l'Atelier et écris-la aujourd'hui (tu peux taguer quelqu'un pour qu'il te suive).</p>
<h2>L'erreur à éviter</h2>
<p>Tout regarder d'un coup, façon Netflix, sans rien faire : tu finis avec zéro quiz. La solution : fais la mission de chaque jour avant de passer au suivant. Un petit pas par jour, et c'est gagné.</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Crée ton compte Tiquiz gratuit avec le lien fourni.</li>
<li>Rejoins le groupe et dis bonjour en une phrase.</li>
<li>Écris ta promesse : je publie mon quiz dans 7 jours.</li>
<li>Réponds au quiz ci-dessous pour débloquer le Jour 1.</li>
</ul>$html$,
  $html$<p>Bravo, Jour 0 bouclé. Le pacte est scellé et ton compte est prêt : tu viens de multiplier tes chances d'aller au bout.</p><p>Demain : pourquoi un quiz marche mille fois mieux qu'un PDF, et comment le penser pour qu'il rapporte.</p>$html$,
  $st2$published$st2$, 10, $r$[]$r$::jsonb, false
),
(
  1, $s$j1-pourquoi-penser$s$, $t$Pourquoi un quiz, et comment le penser$t$, $st$Pourquoi le quiz bat le PDF, et tes décisions de départ$st$,
  $html$<p>Le quiz, c'est le chemin. Le client, c'est le but. Aujourd'hui, tu comprends pourquoi un quiz marche tellement mieux qu'un PDF, et tu poses les bases d'un quiz qui rapporte au lieu d'amuser.</p>
<h2>Pourquoi tes lead magnets ne marchent pas</h2>
<ul>
<li>Le PDF gratuit, on le télécharge... et on ne l'ouvre jamais. Tu récupères surtout des prospects froids, qui n'ouvrent même pas tes emails.</li>
<li>Un quiz, on le finit, on le partage, et il te dit qui est la personne en face : tu sais enfin à qui tu parles.</li>
<li>La preuve : le quiz "Quel type de barbu es-tu ?" de Beardbrand a capté 150 000 emails.</li>
</ul>
<h2>Un seul type de quiz compte</h2>
<p>On ne fait pas un quiz pour rigoler, ni pour noter des élèves, ni un quiz hors sujet. On fait un quiz qui attire les bonnes personnes et les transforme en clients. Un quiz révèle une identité, il ne note pas : on bannit la logique bonne ou mauvaise réponse.</p>
<h2>16 objectifs, et ils se combinent</h2>
<p>Un seul quiz peut viser plusieurs objectifs à la fois : capter des emails, savoir qui est ton prospect, ranger tes contacts, faire prendre conscience d'un problème, orienter vers la bonne offre, vendre, devenir viral, nourrir ta communauté, réveiller une liste qui dort... Tu peux en combiner plusieurs (par exemple capter ET segmenter ET vendre).</p>
<h2>Les 2 sortes de quiz</h2>
<ul>
<li>Le quiz de profil range la personne dans un type ("Le Bâtisseur"). Idéal pour être partagé et toucher beaucoup de monde.</li>
<li>Le quiz de score situe la personne sur un niveau (Débutant, Confirmé, Expert). Idéal pour montrer un manque à combler : ça donne envie de progresser, et d'acheter.</li>
</ul>
<h2>Tes décisions de départ</h2>
<ul>
<li>Choisis tes objectifs (tu peux en combiner).</li>
<li>Décide à qui tu parles : ta cible.</li>
<li>Décide l'action voulue à la fin : s'inscrire, télécharger, réserver un appel, prendre un code promo.</li>
<li>Choisis tes 3 à 5 résultats. Ensuite, l'IA de Tiquiz écrit les questions pour toi.</li>
</ul>
<h2>Growth hack 1 : le résultat qui donne envie</h2>
<p>Ton résultat valorise la personne et lui donne la suite (un type ou un niveau). S'il fait plaisir ou montre un progrès possible, on le garde et on le montre ; s'il rabaisse, on le cache et on s'en va. Exemple : au lieu de "niveau 2 sur 5", écris "Tu es Le Régulier : tu tiens sur la durée, mais il te manque de l'explosivité. Voici comment en gagner." La personne se reconnaît, sourit, et veut la suite.</p>
<h2>Growth hack 2 : copie les mots de tes clients</h2>
<p>Reprends mot pour mot les phrases que ta cible emploie déjà (avis Amazon, commentaires) et mets-les dans ton quiz. Le visiteur lit ses propres mots, se dit "c'est exactement moi", finit le quiz et te voit comme la bonne personne pour l'aider. Quand l'IA de Tiquiz te pose ses questions au début, réponds avec ces phrases exactes.</p>
<h2>L'erreur à éviter</h2>
<p>Lancer un quiz sans objectif, juste "pour voir" : tu attires des curieux, pas des clients. Décide au moins un objectif clair, et surtout l'action que tu veux à la fin.</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Choisis tes objectifs (tu peux en combiner).</li>
<li>Profil ou score : ton choix.</li>
<li>L'action voulue à la fin (s'inscrire, télécharger, réserver, code promo...).</li>
<li>Tes 3 ou 4 résultats, avec un nom valorisant chacun.</li>
</ul>$html$,
  $html$<p>Ton angle, tes résultats, les mots de {audience} : la matière de ton quiz est posée.</p><p>Demain, on prépare le tuyau qui range tes contacts tout seul : Systeme.io.</p>$html$,
  $st2$published$st2$, 20, $r$[]$r$::jsonb, false
),
(
  2, $s$j2-prerequis-systemeio$s$, $t$Accueille tes contacts en automatique$t$, $st$Branche Systeme.io : chaque contact arrive rangé et reçoit le bon message$st$,
  $html$<p>Quelqu'un fait ton quiz et te laisse son email. Et après ? Souvent, rien : sans message d'accueil, il t'oublie en deux jours et n'achètera jamais. Aujourd'hui, tu branches le système qui accueille et range chaque contact tout seul. Toi, tu règles une fois ; tes contacts arrivent rangés et reçoivent le bon message.</p>
<h2>3 mots tout simples</h2>
<ul>
<li>Autorépondeur : l'outil qui garde tes contacts et leur envoie des emails tout seul. Le tien, c'est Systeme.io.</li>
<li>Tag : une étiquette qu'on colle sur un contact pour le ranger (ex : "profil Bâtisseur").</li>
<li>Automatisation : une règle "si... alors...". Si le contact reçoit le tag X, alors il reçoit l'email Y, tout seul.</li>
</ul>
<h2>La clé API : le pont entre Tiquiz et Systeme.io</h2>
<p>Une clé API, c'est un code secret qui relie deux outils pour qu'ils se parlent. Ici, elle relie Tiquiz à Systeme.io : chaque contact capté par ton quiz arrive direct dans Systeme.io, tout seul. Tu la trouves dans Systeme.io, tu la colles dans Tiquiz, et c'est branché. Sans elle, tu devras exporter ta liste à la main, c'est pénible. On a choisi Systeme.io pour son rapport qualité-prix : emails, automatisations, tags, pages de vente, tout y est déjà.</p>
<h2>Pour toi : automatique. Pour lui : du sur-mesure.</h2>
<p>Tu règles l'automatisation une seule fois, et ça tourne pour des centaines de personnes. De son côté, ton visiteur reçoit son prénom (si tu l'as capturé) et son profil : il a l'impression que le message est écrit pour lui seul. Le chemin à retenir : résultat du quiz, puis tag, puis groupe de gens, puis le bon email, avec son prénom.</p>
<h2>Growth hack 1 : un tag sur une réponse</h2>
<p>Colle un tag quand quelqu'un répond un truc précis (ex : "je n'ai pas de liste"). Tu sais ce qu'il a répondu, donc tu lui envoies pile le message fait pour lui, et il a l'impression que tu lis dans ses pensées. Dans Tiquiz (onglet Partage), relie une réponse à un tag Systeme.io, puis crée la série d'emails de ce tag.</p>
<h2>Growth hack 2 : l'email qui dit ton résultat</h2>
<p>Ton premier email annonce le résultat exact de la personne, dès le titre, avec son prénom : "Marie, voici ton plan de Visionnaire". Elle se sent vue, donc elle ouvre, elle lit, et souvent elle répond. Beardbrand gagne 9€ pour 1€ dépensé avec ces emails qui parlent du résultat. Dans Systeme.io, crée un email par tag de résultat.</p>
<h2>L'erreur à éviter</h2>
<p>Capter des emails et les laisser dormir, sans aucun message : tes contacts refroidissent et n'achètent jamais. La solution : branche au moins un email de bienvenue automatique dès aujourd'hui. Le reste viendra après.</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Branche ta clé API Systeme.io dans Tiquiz.</li>
<li>Crée tes tags : un par résultat.</li>
<li>Branche ton email de bienvenue automatique (avec le prénom).</li>
</ul>$html$,
  $html$<p>Ta tuyauterie est prête : tes futurs leads seront accueillis et triés tout seuls.</p><p>Demain, on conçoit un quiz qu'on finit et qu'on a envie de partager : le potentiel viral.</p>$html$,
  $st2$published$st2$, 30, $r$[]$r$::jsonb, false
),
(
  3, $s$j3-quiz-viral$s$, $t$Un quiz qu'on finit (et qu'on partage)$t$, $st$Les 2 moteurs viraux : on le finit, on le partage$st$,
  $html$<p>Aujourd'hui, tu conçois un quiz qu'on termine ET qu'on a envie de partager : c'est ça, le potentiel viral. Un quiz qu'on finit te donne l'email ; un quiz qu'on partage t'amène de nouveaux visiteurs, gratuitement.</p>
<h2>Pourquoi les gens abandonnent un quiz</h2>
<p>Un quiz trop long, on le quitte avant la fin. Un quiz qui ressemble à une interro fait peur (peur de la mauvaise réponse), alors on s'en va. Un bon quiz, au contraire, on le finit sans s'en rendre compte, et on a envie de montrer son résultat.</p>
<h2>Les 2 moteurs viraux</h2>
<ul>
<li>On le FINIT : la personne va jusqu'au bout, donc tu récupères son email.</li>
<li>On le PARTAGE : elle montre son résultat à ses amis, qui viennent jouer à leur tour.</li>
</ul>
<p>La preuve : 30 à 40 personnes sur 100 finissent un bon quiz et laissent leur email. Avec un PDF, c'est moins de 3 sur 100.</p>
<h2>Pour qu'on aille au bout</h2>
<ul>
<li>Ton quiz dit qui on est, il ne teste pas ce qu'on sait.</li>
<li>La première question est facile et amusante.</li>
<li>5 à 7 questions, pas plus. Sinon on abandonne.</li>
<li>Un résultat dont on est fier donne envie de le partager.</li>
</ul>
<h2>Growth hack 1 : un quiz qui parle de toi</h2>
<p>Demande "Quel type de X es-tu ?", pas "connais-tu la réponse ?". Parler de soi, c'est agréable, donc on continue ; une interro fait honte, on part. Au début, dis à l'IA de Tiquiz que ton quiz est un "Quel type de X es-tu ?", sans bonne ni mauvaise réponse.</p>
<h2>Growth hack 2 : la question qui accroche au début</h2>
<p>Commence par une question facile et intrigante : si le début est simple et donne envie, le cerveau veut connaître la fin. Exemple d'intro : "La plupart des gens se trompent sur eux-mêmes. Et toi ?", puis une 1ère question facile comme "Tu es plutôt du matin ou du soir ?".</p>
<h2>Growth hack 3 : un résultat dont on est fier</h2>
<p>Un résultat valorisant et un peu surprenant, c'est le genre qu'on a envie de montrer. Quand on est fier de son résultat, on le poste ("Je suis une Visionnaire, et toi ?"), et chaque partage t'amène de nouveaux visiteurs gratuitement. Imagine le résultat dont TES clients seraient fiers : tu l'écriras vraiment dans Tiquiz demain.</p>
<h2>L'erreur à éviter</h2>
<p>Un quiz trop long ou qui ressemble à une interro : les gens partent avant de laisser leur email. La solution : 7 questions maximum, un ton sympa, et zéro bonne ou mauvaise réponse. On s'amuse, on ne juge pas.</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Choisis ton titre "Quel type de X es-tu ?".</li>
<li>Vérifie : 1ère question facile, 5 à 7 questions maximum.</li>
<li>Imagine le résultat dont tes clients seraient fiers.</li>
</ul>$html$,
  $html$<p>Ton quiz est pensé pour être fini et partagé : la base d'un quiz qui se diffuse tout seul.</p><p>Demain, le grand jour : on crée ton quiz pour de vrai et on le met en ligne.</p>$html$,
  $st2$published$st2$, 40, $r$[]$r$::jsonb, false
),
(
  4, $s$j4-creer-connecter$s$, $t$Crée et connecte ton quiz$t$, $st$Aujourd'hui, ton quiz passe en ligne et capte ses premiers contacts$st$,
  $html$<p>Le grand jour : tu génères ton quiz avec l'IA, tu le branches à Systeme.io et tu le publies pour de vrai. Le piège à éviter : peaufiner pendant des semaines sans jamais publier. Un quiz en brouillon ne rapporte rien ; un quiz imparfait, mais en ligne, oui. On publie une première version aujourd'hui, tu l'amélioreras après avec tes vrais chiffres.</p>
<h2>Comment Tiquiz écrit ton quiz (à ta place)</h2>
<p>Tu dis à l'IA ton sujet et à qui tu parles. Elle te pose 2 ou 3 petites questions, et en 30 secondes elle écrit tout : le titre, les questions et les résultats. Toi, tu relis et tu corriges juste ce qui ne te plaît pas, en cliquant sur le texte. Tu ne pars jamais d'une page blanche.</p>
<h2>Les étapes d'aujourd'hui</h2>
<ul>
<li>L'IA écrit le quiz. Toi, tu corriges au clic ce qui ne te ressemble pas.</li>
<li>Tu branches ta clé API Systeme.io (vue hier) et tu choisis tes tags.</li>
<li>Tu publies, puis tu fais le quiz toi-même pour vérifier.</li>
<li>Tu vérifies qu'un contact test arrive bien dans Systeme.io.</li>
</ul>
<p>La preuve que les détails comptent : BedGear a fait +490% de ventes en ajoutant un conseil personnalisé à la fin de son quiz.</p>
<h2>Growth hack : la page de fin qui vend</h2>
<p>À la fin, ne dis pas juste le résultat : propose la bonne solution. Le quiz a déjà trouvé le problème de la personne, donc ta proposition tombe pile et elle dit oui sans se sentir forcée. La trame : le souci (où elle en est), la cause (pourquoi ça bloque, ce n'est pas sa faute), la solution (ce qu'un [profil] doit faire), puis le pont vers ton offre.</p>
<h2>L'erreur à éviter</h2>
<p>Retoucher ton quiz pendant des semaines sans jamais le publier. Publie une première version aujourd'hui : un quiz en ligne qui capte bat un quiz parfait resté dans ta tête.</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Génère ton quiz et corrige au clic ce qui ne te plaît pas (place la capture juste avant le résultat, 1ère question fun, personnalisation au prénom).</li>
<li>Écris ta page de fin (souci, cause, solution, offre).</li>
<li>Branche ta clé API + le tag de capture, et publie.</li>
<li>Fais le quiz toi-même et vérifie le contact dans Systeme.io.</li>
</ul>$html$,
  $html$<p>Ton quiz est PUBLIÉ et il capture des leads en automatique. C'est le jalon, félicitations.</p><p>Demain : on le remplit de monde, sans dépenser un euro.</p>$html$,
  $st2$published$st2$, 50, $r$[]$r$::jsonb, false
),
(
  5, $s$j5-promouvoir-gratos$s$, $t$Promouvoir gratuitement$t$, $st$Remplir ton quiz de monde, sans dépenser un euro$st$,
  $html$<p>Ton quiz est en ligne... mais un quiz sans visiteurs, c'est une belle boutique en plein désert. Bonne nouvelle : pas besoin de pub pour démarrer, tu as déjà des endroits gratuits sous la main. Aujourd'hui, on va chercher du monde, activement, et on rend ton quiz viral.</p>
<h2>3 sources de trafic gratuit</h2>
<ul>
<li>Ce que tu as déjà : ta liste email, ta bio, ta signature, et ta page de remerciement (celle où on arrive après avoir pris ton cadeau gratuit).</li>
<li>Le public des autres : les commentaires sous les gros posts, les partenaires, les podcasts.</li>
<li>Ton propre contenu : un seul quiz te donne des dizaines de posts (un par résultat, par question, par chiffre).</li>
</ul>
<h2>Le partage pour débloquer : la viralité dans ton quiz</h2>
<p>Tiquiz peut bloquer une dernière chose à la fin : un bonus. Pour l'ouvrir, la personne doit partager ton quiz une seule fois (pas de "ramène 3 amis"). Résultat : chaque personne qui veut le bonus envoie ton quiz à son réseau. C'est ta pub, faite gratuitement par tes visiteurs. Pour que ça marche, le bonus doit valoir le coup (le plan d'action lié à son profil, un modèle prêt à l'emploi, une vidéo privée), et tu le présentes clairement : "Ton plan d'action sur-mesure t'attend juste derrière. Partage le quiz pour l'ouvrir."</p>
<h2>La boucle d'auto-viralité</h2>
<p>Un visiteur finit le quiz, veut le bonus, partage une fois, un proche clique, refait le quiz... et ça recommence. Si chaque visiteur en ramène en moyenne plus d'un, ça ne s'arrête jamais : ton quiz devient sa propre source de trafic.</p>
<h2>5 growth hacks pour ramener du monde</h2>
<ul>
<li>La chasse au trésor : "j'ai caché un cadeau dans mon quiz, fais-le pour le trouver". Un jeu donne plus envie qu'une pub, et tu fais un pic de visites le jour même.</li>
<li>Le commentaire malin : sous un gros post de ta niche, ajoute un commentaire vraiment utile, puis "j'ai un quiz qui te dit lequel tu es".</li>
<li>Branche-le là où tu perds déjà du monde : ta page de remerciement, ta bio, ta signature. Ces gens sont chauds, ils cliquent beaucoup plus.</li>
<li>L'échange de quiz entre créateurs : associe-toi à 2-3 créateurs voisins (pas concurrents) et partagez vos quiz mutuellement.</li>
<li>Le résultat qu'on a envie de montrer : soigne l'image de chaque résultat et l'image de partage (OG) pour donner envie de cliquer.</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Publier ton quiz et attendre que les gens le trouvent tout seuls : personne ne vient. Va chercher le trafic activement, en commençant par les endroits gratuits que tu as déjà.</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Mets ton lien à 3 endroits, dont ta page de remerciement.</li>
<li>Active l'étape "partage pour débloquer" avec un vrai bonus.</li>
<li>Écris et publie ton premier post de recyclage.</li>
<li>Contacte 1 créateur pour un échange de quiz.</li>
</ul>$html$,
  $html$<p>Ta viralité est activée et tes premières diffusions sont lancées. Le trafic va monter.</p><p>Demain, on transforme ces visiteurs en communauté qui revient et t'en ramène d'autres.</p>$html$,
  $st2$published$st2$, 60, $r$[]$r$::jsonb, false
),
(
  6, $s$j6-communaute$s$, $t$Crée ta communauté$t$, $st$Transforme tes leads en audience vivante qui revient et rachète$st$,
  $html$<p>Un lead tout seul t'oublie en deux semaines, un email de plus perdu au milieu de 200 autres. Une communauté change tout : un endroit à toi où tes leads te voient régulièrement. Plus ils te voient, plus ils te font confiance. Et on achète à ceux en qui on a confiance.</p>
<h2>Où la créer : 4 maisons possibles</h2>
<p>Une communauté, c'est un endroit à toi où tes contacts se retrouvent et te voient souvent, pas une liste d'emails muette. Tu n'en choisis qu'UNE pour commencer, celle où ton audience est déjà présente :</p>
<ul>
<li>Groupe Facebook : simple, tout le monde y est.</li>
<li>Canal Telegram : tu diffuses, ils reçoivent direct sur leur téléphone.</li>
<li>Groupe WhatsApp : ultra proche, comme entre amis.</li>
<li>Skool : pensé pour les communautés (cours, discussions et classement au même endroit).</li>
</ul>
<h2>À quoi ça sert vraiment</h2>
<ul>
<li>Partager de la valeur exclusive : du contenu et des coulisses réservés à tes membres.</li>
<li>Collecter des retours en groupe : tu poses une question, tu as 20 réponses dans l'heure.</li>
<li>Créer des liens : tes membres se parlent, et toi tu deviens une vraie personne pour eux.</li>
</ul>
<p>La preuve que la fidélité paie : garder seulement 5% de clients en plus augmente le profit de 25 à 95% (Bain & Company). Garder les gens près de toi rapporte plus que courir après du nouveau.</p>
<h2>Comment les faire venir depuis ton quiz</h2>
<p>Sur la page de résultat, ajoute une invitation claire et personnalisée : "Tu es un Bâtisseur ? Rejoins les autres Bâtisseurs ici." C'est le meilleur moment : la personne vient de recevoir un résultat qui la décrit, elle est curieuse, fière et chaude. Reste aussi disponible en privé : une réponse personnelle transforme un curieux en fan, puis en client.</p>
<h2>Growth hacks</h2>
<ul>
<li>L'invitation personnalisée sur le résultat : "Rejoins les autres comme toi". On veut tous appartenir à un groupe qui nous ressemble.</li>
<li>Le rendez-vous qui fait revenir : un rituel fixe (le conseil du lundi, le live du mardi). La régularité bat la perfection.</li>
<li>Les questions des membres = ta machine à contenu : chaque question devient un post, une vidéo, un nouveau quiz. Si une personne la pose, des centaines se la posent en silence.</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Laisser un membre te monopoliser (il t'écrit sans arrêt et attend des réponses longues et gratuites). Pose un cadre : réponds court, renvoie vers le groupe ("super question, je la poste pour que tout le monde en profite"), ou vers ton offre payante pour du suivi individuel.</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Choisis ta maison : Facebook, Telegram, WhatsApp ou Skool.</li>
<li>Crée-la : un nom clair, une phrase qui dit à qui c'est.</li>
<li>Ajoute l'invitation sur ta page de résultat, avec le profil.</li>
<li>Note 3 questions déjà reçues à transformer en contenu.</li>
</ul>$html$,
  $html$<p>Ta communauté démarre, et ton quiz l'alimente. Tu ne fais plus du one-shot.</p><p>Demain, dernier jour : on regarde tes vrais chiffres pour améliorer ton quiz, et on trace ton plan pour la suite.</p>$html$,
  $st2$published$st2$, 70, $r$[]$r$::jsonb, false
),
(
  7, $s$j7-adapter-suivre$s$, $t$Regarde tes chiffres et améliore$t$, $st$Tu pilotes avec tes vrais chiffres, pas au feeling$st$,
  $html$<p>Dernier jour. Avancer au feeling, c'est avancer les yeux fermés : tu crois que ton quiz marche, ou pas, mais tu n'en sais rien, et tu refais les mêmes erreurs. Tes vrais chiffres te disent exactement où ça coince. Pas besoin d'être fort en maths : on lit ça comme une histoire toute simple. Et on célèbre.</p>
<h2>Les 5 chiffres qui comptent</h2>
<ul>
<li>Les vues : combien voient ton quiz.</li>
<li>Les démarrages : combien le commencent vraiment.</li>
<li>Les quiz finis : combien vont jusqu'au résultat.</li>
<li>Les captures : combien te laissent leur email.</li>
<li>Les ventes : combien achètent ensuite.</li>
</ul>
<p>À chaque étape, des gens s'arrêtent, c'est normal. Ton travail : trouver LA marche où tu perds le plus de monde, c'est le seul point à réparer pour l'instant. Beaucoup démarrent mais peu finissent ? Ton quiz est trop long. Beaucoup finissent mais peu laissent leur email ? Ton cadeau ne donne pas assez envie.</p>
<h2>Laisse l'IA de Tiquiz le faire pour toi (plan Plus)</h2>
<p>Tu peux tout lire à la main, mais l'analyse IA de Tiquiz (plan Plus) le fait pour toi : elle lit tes résultats et te dit, en clair, ce qui marche et ce qui coince, qui sont tes visiteurs et quoi améliorer en premier. Tu gagnes des heures et tu ne passes à côté de rien.</p>
<h2>Growth hacks</h2>
<ul>
<li>Répare une seule chose à la fois : change UN truc au point qui coince, attends quelques jours, recompare. Sinon tu ne sais pas ce qui a aidé.</li>
<li>Verse plus là où ça marche déjà : repère ta source n°1 de trafic ou de ventes et double-la (loi du 80/20). Les pros doublent ce qui gagne au lieu de s'acharner sur ce qui rate.</li>
<li>Relance le même quiz : tous les 3 mois, repartage-le avec une nouvelle accroche. Un quiz qui parle des gens reste vrai tout le temps. Beardbrand utilise le même quiz (150 000 leads) depuis des années.</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Ne jamais regarder tes chiffres et avancer au feeling. Bloque 15 minutes par mois pour les lire : un coup d'oeil régulier te montre où agir et t'évite de travailler dans le vide.</p>
<h2>Et après</h2>
<p>Tu as une machine à leads qui tourne. Pour aller plus loin : les bonus (vendre avec ton quiz, le trafic payant, exploiter les sondages et les popquiz) et un parcours de promo pour chaque réseau (Facebook, Instagram, LinkedIn...).</p>
<h2>Ta mission du jour</h2>
<ul>
<li>Repère le point qui coince le plus dans tes chiffres.</li>
<li>Change une seule chose, et note-la.</li>
<li>Lance l'analyse IA si tu es sur le plan Plus.</li>
<li>Écris ton plan pour les 30 prochains jours, et poste ton bilan dans la communauté.</li>
</ul>$html$,
  $html$<p>Tu es parti de zéro il y a 7 jours, et tu as maintenant une machine à leads qui tourne. Sois fier, tu as construit un actif.</p><p>Les bonus t'attendent quand tu veux pour aller plus loin.</p>$html$,
  $st2$published$st2$, 80, $r$[]$r$::jsonb, false
),
(
  101, $s$bonus-trafic-payant$s$, $t$Bonus : Trafic payant$t$, $st$La pub presque sans risque, grâce à un seul mécanisme$st$,
  $html$<p>La pub est le seul levier payant de tout l'Atelier. La peur n°1 : cramer son budget. La vérité : la pub n'invente rien, elle accélère. Si ton quiz capte déjà des leads en gratuit, elle le fait juste plus vite et plus fort. Et un mécanisme la rend presque sans risque : l'offre auto-liquidante.</p>
<h2>La règle d'or : ne jamais payer pour du vide</h2>
<p>Tu ne lances JAMAIS de pub avant d'avoir prouvé que ton quiz transforme les visiteurs en leads, gratuitement. Sinon, la pub ne fait qu'accélérer ta perte : tu paies pour envoyer des gens dans un trou. D'abord le gratuit qui marche (les 7 jours), ensuite seulement l'essence dans le moteur.</p>
<h2>L'offre auto-liquidante : le coeur du système</h2>
<p>Juste après le quiz, tu proposes une petite offre (7 à 27€), ultra ciblée sur le résultat de la personne. But : que ses ventes remboursent ce que tu as dépensé en pub. Tu dépenses 10, l'offre te rend 10. Quand chaque euro de pub te revient, tu en achètes à l'infini sans risque : tes leads se construisent gratuitement, et la pub passe de pari à robinet. La preuve : Dropbox a obtenu des leads à 0,25€ avec le bon mécanisme, contre 200€ et plus en acquisition classique.</p>
<h2>Le test minimal et le retargeting</h2>
<p>Commence petit : 5 à 10€ par jour, une cible simple, pas besoin d'un gros budget pour savoir si ça mord. Le poste le plus rentable : le retargeting des abandonneurs. Tu remontres ton quiz à ceux qui l'ont commencé sans le finir : ils te connaissent déjà et étaient intéressés, donc un tout petit budget suffit et ça convertit très fort.</p>
<h2>Growth hacks</h2>
<ul>
<li>L'offre auto-liquidante : une offre à ~17€ liée au résultat (mini-cours, modèle), proposée juste après le quiz. Ses ventes remboursent ta pub, tes leads deviennent gratuits.</li>
<li>Le retargeting des abandonneurs : crée une audience "a commencé le quiz sans finir" et relance-la pour quelques centimes ("Tu n'as pas fini ? Ton profil t'attend.").</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Lancer de la pub "pour voir", sans offre auto-liquidante et sans avoir prouvé que ton quiz capte. D'abord le gratuit qui marche, ensuite l'offre qui rembourse, ensuite seulement la pub. Jamais dans un autre ordre.</p>
<h2>Ta mission</h2>
<ul>
<li>Vérifie que ton quiz capte déjà des leads en gratuit.</li>
<li>Crée une petite offre (7 à 27€) liée à un résultat.</li>
<li>Prépare une audience de retargeting "quiz commencé non fini".</li>
<li>Si tu testes : 5€/jour, et tu observes les maths.</li>
</ul>$html$,
  $html$<p>Tu as les clés pour amplifier ton quiz sans cramer ton budget. À toi de jouer, quand tu seras prête.</p>$html$,
  $st2$published$st2$, 1010, $r$[]$r$::jsonb, true
),
(
  102, $s$bonus-vendre-avec-un-quiz$s$, $t$Bonus : Vendre avec un quiz$t$, $st$Ta page de résultat devient ta page de vente, sans forcer$st$,
  $html$<p>Capter, c'est la moitié du chemin : un lead qui n'achète jamais ne paie pas tes factures. Bonne nouvelle, ton quiz a déjà fait le plus dur : il a posé un diagnostic. La personne arrive en sachant qu'elle a un problème. Du coup tu ne "vends" pas, tu prescris la solution à un problème qu'elle a reconnu elle-même. Zéro résistance, c'est l'anti-réactance : comme chez le médecin, on ne se braque pas contre le remède qu'on est venu chercher.</p>
<h2>Ta page de résultat = ta page de vente (en 4 temps)</h2>
<ul>
<li>Le miroir : "voici où tu en es, [profil]". La personne se reconnaît.</li>
<li>La cause cachée : "voici pourquoi tu bloques, et ce n'est pas ta faute". Tu enlèves la culpabilité.</li>
<li>Le chemin : "voici ce qu'un [profil] doit faire".</li>
<li>Le pont : "le plus rapide pour y arriver, c'est ça", vers ton offre.</li>
</ul>
<h2>Les 3 façons de vendre (choisis-en une)</h2>
<ul>
<li>Le lien direct sur la page de résultat : un bouton vers l'offre adaptée au profil. Le plus simple pour démarrer.</li>
<li>L'email de vente déclenché par le tag du résultat : ta séquence part toute seule.</li>
<li>Valeur gratuite puis vente : tu donnes d'abord, tu vends ensuite. Le plus doux et le plus éthique.</li>
</ul>
<p>La preuve que le ciblage paie : Beardbrand a fait 964% de retour sur ses emails parce que chaque message tombait pile sur le bon profil.</p>
<h2>Growth hacks</h2>
<ul>
<li>L'aiguilleur de ventes : chaque résultat pointe vers l'offre faite pour ce profil (découverte à 27€ pour le débutant, programme à 197€ pour l'intermédiaire, accompagnement pour l'avancé).</li>
<li>Le coupon-récompense : la page de résultat débloque un code perso ("ton profil te donne -20%, valable 72h pour de vrai"). Une vraie raison d'acheter maintenant, sans fausse urgence.</li>
<li>Valeur gratuite puis vente : 2-3 emails utiles liés au profil, puis l'offre. Quand tu as déjà aidé, l'offre devient évidente.</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Vendre comme un bourrin dès le résultat (fausse urgence, faux compte à rebours, "achète vite") : ça fait fuir et casse la confiance. Laisse le diagnostic faire le travail, donne de la valeur, propose clairement, reste honnête sur tes promos. La confiance vend mieux que la pression.</p>
<h2>Ta mission</h2>
<ul>
<li>Écris ta page de résultat en 4 temps pour un profil.</li>
<li>Choisis UNE façon de vendre pour commencer.</li>
<li>Relie chaque profil à l'offre qui lui correspond.</li>
<li>Crée un coupon-récompense honnête dans Systeme.io.</li>
</ul>$html$,
  $html$<p>Ta page de résultat peut maintenant convertir, proprement. Le diagnostic se confirme, il ne se force pas.</p>$html$,
  $st2$published$st2$, 1020, $r$[]$r$::jsonb, true
),
(
  103, $s$bonus-exploiter-sondages$s$, $t$Bonus : Exploiter les sondages$t$, $st$Connaître ta cible mieux que tes concurrents$st$,
  $html$<p>La plupart des créateurs inventent ce que veut leur audience, dans leur tête, et passent à côté. Le sondage, c'est le petit frère discret du quiz : pas de résultat fun, juste des questions pour récolter la vérité de ta cible. Bien utilisé, il te fait connaître ton audience mieux que tes concurrents, et te donne des idées de contenu et d'offres que tu n'aurais jamais trouvées seul.</p>
<h2>Sondage ou quiz : la différence</h2>
<p>Le quiz donne un résultat à la personne (son profil) : c'est un aimant à leads, fun et viral. Le sondage, lui, te sert TOI : il récolte des réponses pour que tu comprennes ta cible. Le bénéfice est pour toi, pas pour le répondant. Le quiz attire et capte ; le sondage écoute et informe. Ils se complètent.</p>
<h2>Le sondage pré-quiz : reprends leurs mots, à la source</h2>
<p>Avant de créer ou d'améliorer un quiz, lance un court sondage : ses douleurs, ses envies, ses mots exacts. Tu construis ensuite un quiz, et des offres, qui sonnent parfaitement juste, parce qu'ils sont écrits AVEC leurs mots. Tu ne devines plus. La preuve : Ryan Levesque a généré 100 M$ avec la méthode ASK, entièrement bâtie sur des sondages qui font parler la cible avant de créer.</p>
<h2>Faire parler l'ensemble (le flywheel de données)</h2>
<p>Une réponse, c'est anecdotique. 300 réponses, c'est de l'or : des tendances, des segments, le blocage n°1 qui revient. L'analyse IA de Tiquiz (plans supérieurs) sort ces tendances pour toi. Le flywheel : tes réponses nourrissent ton contenu (un post par statistique), ton autorité ("j'ai sondé 300 personnes") et ta prochaine offre (le blocage qui ressort le plus).</p>
<h2>Growth hacks</h2>
<ul>
<li>Le sondage pré-quiz : 3 questions à ta liste, et tu notes les formulations qui reviennent pour écrire ton quiz avec leurs mots.</li>
<li>Une réponse = un contenu : transforme la statistique la plus surprenante en post ("j'ai sondé 300 personnes, voici ce qui ressort"). Autorité + sujets que ta cible veut vraiment.</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Inventer ce que veut ton audience depuis ton bureau, et créer un quiz ou une offre dans le vide. Demande d'abord : un sondage court te donne leurs vrais mots, et tu crées du sur-mesure au lieu de deviner.</p>
<h2>Ta mission</h2>
<ul>
<li>Écris 3 questions de sondage pour ta cible.</li>
<li>Lance-le à ta liste ou ta communauté.</li>
<li>Repère les mots et blocages qui reviennent.</li>
<li>Transforme le plus surprenant en un contenu.</li>
</ul>$html$,
  $html$<p>Tu sais maintenant écouter ton marché à la source. La data devient du contenu et des idées d'offres.</p>$html$,
  $st2$published$st2$, 1030, $r$[]$r$::jsonb, true
),
(
  104, $s$bonus-exploiter-popquiz$s$, $t$Bonus : Exploiter les popquiz$t$, $st$Capter au pic d'attention de tes vidéos$st$,
  $html$<p>Et si ton quiz vivait DANS ta vidéo ? Le popquiz, c'est un quiz incrusté directement dans une vidéo, un format que presque personne ne propose. Au lieu d'envoyer les gens vers un quiz à côté, tu captures pile au moment où ils sont scotchés. Deux usages peuvent te faire gagner des heures : le cliffhanger et le webinaire automatique.</p>
<h2>Un popquiz, c'est quoi exactement ?</h2>
<p>C'est un point d'arrêt (un "cuepoint") placé dans ta vidéo : à un moment choisi, un quiz apparaît par-dessus l'image. Tu peux en mettre plusieurs sur une même vidéo, et choisir s'ils sont bloquants (on doit répondre pour continuer) ou optionnels. Et tu peux l'embarquer (l'embed) sur n'importe quel site : la vidéo et le quiz voyagent ensemble.</p>
<h2>Le popquiz cliffhanger : capte au pic de tension</h2>
<p>Tu places un quiz bloquant juste avant la révélation clé de ta vidéo, le moment que tout le monde attend. Pour avoir la suite, le spectateur doit répondre, donc laisser son email. C'est le moment où l'envie de savoir est la plus forte : le taux de capture explose, parce qu'on ne s'arrête pas si près du but.</p>
<h2>Le popquiz qui remplace un webinaire</h2>
<p>Prends ta meilleure vidéo de valeur et incruste ton quiz à son moment fort : tu obtiens l'effet d'un webinaire (du contenu qui capture et qui vend), mais sans live, 24h/24, en automatique. Et la présence est de 100% : comme c'est asynchrone, personne ne "rate" la session, là où un live perd souvent plus de la moitié des inscrits.</p>
<h2>Growth hacks</h2>
<ul>
<li>Le cliffhanger : coupe ta vidéo juste avant le moment clé avec un popquiz bloquant qui demande l'email ("Réponds pour débloquer l'erreur n°3"). Personne ne lâche si près du but.</li>
<li>Le webinaire automatique : incruste ton quiz dans ta meilleure vidéo de valeur, mets-la sur une page dédiée et laisse-la tourner. Elle capture et vend pendant que tu dors.</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Mettre le popquiz à la fin de la vidéo, quand l'attention est déjà retombée et que les gens sont partis. Place-le au pic, juste avant le moment le plus attendu : c'est là qu'on accepte de laisser son email.</p>
<h2>Ta mission</h2>
<ul>
<li>Choisis ta meilleure vidéo de valeur.</li>
<li>Repère son moment le plus attendu.</li>
<li>Place un popquiz bloquant juste avant.</li>
<li>Embarque la vidéo sur une page dédiée.</li>
</ul>$html$,
  $html$<p>Tes vidéos peuvent désormais capter au pic d'attention, en automatique. Un format que tes concurrents n'ont pas.</p>$html$,
  $st2$published$st2$, 1040, $r$[]$r$::jsonb, true
),
(
  105, $s$bonus-promo-reseaux$s$, $t$Bonus : Promouvoir par réseau$t$, $st$Les bases qui marchent partout, puis le guide de chaque réseau$st$,
  $html$<p>Les réseaux peuvent t'amener un flux constant de visiteurs vers ton quiz, gratuitement, mais pas en postant au hasard. Avant les astuces propres à chaque réseau, il y a des bases qui marchent partout. On les pose une bonne fois (vidéo ci-dessous), puis chaque réseau a sa vidéo et son guide.</p>
[[video:1]]
<h2>Les bases (valables partout)</h2>
<ul>
<li>Ton profil = ta vitrine en 3 secondes : photo nette (un vrai visage, pas un logo flou), bio orientée bénéfice (ce que tu fais POUR les gens, pas ton CV), et un lien, toujours. En pro, zéro polémique politique : tu fermes des portes pour rien.</li>
<li>Ton lien en bio = la porte vers ton quiz : tu n'as souvent qu'UN lien, ne le gâche pas. Il mène à une mini-page (Systeme.io) avec ta photo, une phrase claire et un gros bouton vers ton quiz. Tu importes les templates fournis, tu mets tes mots, c'est prêt.</li>
<li>Quoi poster : 5 types de contenu, en alternance (valeur, preuve sociale, curiosité, vente, gratitude). La plupart du temps tu donnes, de temps en temps tu vends. On suit ceux qui donnent.</li>
<li>Rythme : 3 posts par semaine tenables toute l'année battent 2 par jour pendant 15 jours puis plus rien. La régularité bat l'intensité. Bloque 1h par semaine pour préparer et programmer (outils natifs gratuits : Meta Business Suite, programmation LinkedIn...).</li>
<li>Va 10 fois plus vite avec l'IA : ton quiz (ses questions, profils et résultats) est une mine d'idées de posts. "Voici mon quiz et ses profils, donne-moi 10 idées de posts qui créent la curiosité et mènent à ce quiz, pour [réseau]." Tu gardes la main, l'IA fait le brouillon.</li>
</ul>
<p>La règle des 7 contacts : on doit te voir environ 7 fois avant de te faire confiance et d'agir. D'où l'importance de poster régulièrement. Et le réflexe qui vaut sur tous les réseaux : interagis à la main 15 min AVANT ton post (tu commentes d'autres posts) et 30 min APRÈS (tu réponds à chaque commentaire). L'algo regarde les premières minutes : tu amorces la pompe toi-même.</p>
<h2>Le guide réseau par réseau</h2>
<p>Choisis-EN UN pour commencer, celui où ta cible est déjà. Regarde sa vidéo, applique son guide, puis tu en ajouteras un autre. Inutile d'être partout en même temps.</p>
<h3>Facebook : le réseau des groupes</h3>
[[video:2]]
<p>Facebook n'est pas mort, les conversations ont juste migré dans les groupes, où ta cible se réunit par centaines de milliers (1,8 milliard de personnes utilisent les groupes chaque mois) et pose des questions tous les jours.</p>
<ul>
<li>Rejoins 3 à 5 groupes actifs (regarde les posts par jour, pas seulement le nombre de membres) et deviens la référence qui répond le mieux, sans JAMAIS coller ton lien dans le groupe. Les curieux cliquent sur ton nom, voient ta bio, entrent dans ton quiz.</li>
<li>Écris pour faire commenter (questions, mini-débats, vécu) : l'algo pousse ce qui crée de la conversation et freine les liens sortants. Ton lien va en commentaire épinglé de TON post, jamais dans le texte.</li>
<li>Le hack, la réponse-référence : repère LA question qui revient sans arrêt et écris LA réponse la plus complète du groupe (en 8 étapes s'il le faut). On te tague à chaque fois qu'elle revient, ton profil explose en visites.</li>
<li>Le hack bonus, le post-débat : une question binaire sans effort à commenter ("quiz ou PDF gratuit ?"). L'avalanche de commentaires fait pousser ton post, et ton quiz attend en commentaire épinglé.</li>
<li>À terme, crée ton propre groupe : filtre l'entrée avec ton quiz, et tu obtiens une audience que Facebook ne peut pas t'enlever.</li>
</ul>
<h3>Instagram : le réseau de l'image et des Reels</h3>
[[video:3]]
<p>On y scrolle très vite. Les Reels sont ta plus grosse chance d'être vue par des inconnus, et le lien en bio est ta seule porte de sortie vers ton quiz.</p>
<ul>
<li>Mise sur les Reels (3 à 5 par semaine) : accroche dans la 1ère seconde, sous-titre toujours (beaucoup regardent sans le son), finis par "le quiz est en bio".</li>
<li>Stories quasi quotidiennes avec le sticker lien : c'est le moyen n°1 de faire cliquer vers ton quiz au quotidien.</li>
<li>Le hack, le contenu qu'on sauvegarde et qu'on envoie : Instagram pousse à fond le partage et la sauvegarde, bien plus que les likes. Crée des Reels et carrousels si utiles qu'on a envie de les garder et de les envoyer à un ami.</li>
</ul>
<h3>LinkedIn : le réseau pro où l'autorité se construit</h3>
[[video:4]]
<p>Moins de volume, mais des gens qui achètent. On y vient pour apprendre : un contenu qui enseigne t'amène des leads bien plus qualifiés qu'ailleurs.</p>
<ul>
<li>Soigne ta 1ère ligne (elle décide si on déplie le post), écris aéré, une idée par post : retour d'expérience, conseil actionnable, opinion de métier (jamais politique).</li>
<li>Lien en premier commentaire, et termine par une question ouverte pour lancer la discussion.</li>
<li>Le hack : sois LE meilleur commentaire sous les gros comptes de ton secteur (leur audience découvre ton profil), et publie des carrousels PDF qui démontrent ton expertise, un format que LinkedIn adore.</li>
</ul>
<h3>Reddit : le royaume des communautés de passionnés</h3>
[[video:5]]
<p>La communauté la plus exigeante du web : un lien balancé sans contexte se fait bannir en quelques minutes. Mais bien joué, le trafic est ultra qualifié.</p>
<ul>
<li>Lis les règles de chaque subreddit AVANT de poster, et observe-le quelques jours pour repérer le ton.</li>
<li>Donne énormément, sans lien, pour gagner du karma et de la confiance. Sois vraie et transparente : Reddit déteste le marketing lisse.</li>
<li>Le hack, le post-étude de cas sans filtre : "j'ai testé X, voici mes vrais chiffres et mes ratés". Tu partages ton quiz seulement quand c'est utile et autorisé, jamais en premier réflexe.</li>
</ul>
<h3>Threads : la conversation légère qui monte vite</h3>
[[video:6]]
<p>Le réseau texte de Meta, relié à ton Instagram. Jeune, donc la portée gratuite y est encore généreuse : profites-en maintenant.</p>
<ul>
<li>Parle léger et humain, comme à des potes. Poste souvent et réponds beaucoup : c'est un réseau de conversation, pas de diffusion.</li>
<li>Le hack : l'avis tranché (mais pas méchant) qui lance le débat, et le fil qui raconte une histoire jusqu'à ton quiz.</li>
<li>Rebondis sous les gros comptes : sur un jeune réseau, c'est le moyen le plus rapide de te faire connaître.</li>
</ul>
<h3>X : le temps réel et les fils viraux</h3>
[[video:7]]
<p>Tout va vite, mais un bon contenu peut exploser en quelques heures. Texte court et percutant, fils qui enseignent.</p>
<ul>
<li>Une idée forte par tweet ; mise sur les fils (threads) pour enseigner et durer. Poste souvent, un tweet a une vie très courte.</li>
<li>Le hack, le self-reply : ton contenu de valeur sans lien, puis ton lien de quiz en réponse à ton propre tweet. Portée intacte ET clic offert.</li>
<li>Épingle un tweet qui mène à ton quiz : un fil viral ramène des milliers de visites sur ton profil.</li>
</ul>
<h2>L'erreur à éviter</h2>
<p>Deux pièges. Sauter les bases (profil, lien, régularité) pour foncer sur les astuces d'un réseau : si les fondations sont bâclées, le reste ne sert à rien. Et poster ton lien partout en boucle façon panneau publicitaire : les gens fuient et l'algo te punit. Donne la plupart du temps, place ton lien intelligemment (bio, commentaire épinglé), laisse la curiosité travailler.</p>
<h2>Ta mission</h2>
<ul>
<li>Soigne ton profil (photo, bio bénéfice, un seul lien) et crée ta mini-page de bio vers ton quiz avec les templates.</li>
<li>Choisis UN réseau prioritaire, celui où ta cible est déjà, et regarde sa vidéo.</li>
<li>Prépare et programme 3 posts (valeur, preuve, curiosité) qui mènent à ton quiz.</li>
<li>Repère 5 gros comptes et 3 groupes de ta niche à animer cette semaine.</li>
</ul>$html$,
  $html$<p>Tes réseaux peuvent maintenant alimenter ton quiz en continu, gratuitement. Choisis un réseau, tiens le rythme, et le trafic suit.</p>$html$,
  $st2$published$st2$, 1050, $r$[]$r$::jsonb, true
)
on conflict (day_number) do update set
  slug = excluded.slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  intro_html = excluded.intro_html,
  result_html = excluded.result_html,
  status = excluded.status,
  sort_order = excluded.sort_order,
  is_bonus = excluded.is_bonus,
  updated_at = now();

-- Module réseaux (105) : les 7 slots vidéo ordonnés (Les bases + 6
-- réseaux), référencés par [[video:1..7]] dans l'intro. URLs vides :
-- Béné uploade/colle chaque vidéo depuis l'admin. GARDE anti-écrasement :
-- on ne (re)pose les slots QUE si la liste est encore vide, pour ne
-- jamais effacer une vidéo déjà uploadée lors d'un re-seed.
update days
set videos = $j$[
  {"title":"Les bases (valable partout)","url":null,"video_id":null},
  {"title":"Facebook","url":null,"video_id":null},
  {"title":"Instagram","url":null,"video_id":null},
  {"title":"LinkedIn","url":null,"video_id":null},
  {"title":"Reddit","url":null,"video_id":null},
  {"title":"Threads","url":null,"video_id":null},
  {"title":"X","url":null,"video_id":null}
]$j$::jsonb
where day_number = 105
  and (videos is null or videos = '[]'::jsonb);

-- ───────────────────────────────────────────────────────────────
-- 2. Les questions (la mission devient le quiz). Déblocage à la
--    complétion : required=true bloque, required=false = feedback.
-- ───────────────────────────────────────────────────────────────
create unique index if not exists uniq_questions_day_sort on questions (day_id, sort_order);

with q(day_number, type, prompt, help_text, options, required, sort_order) as (
  values
  -- J0
  (0, $p$action$p$, $p$C'est quoi ta niche ou ton activité, en une phrase ?$p$, $p$Sert à personnaliser la suite et ton coach.$p$, $j$[]$j$::jsonb, true, 1),
  (0, $p$decision$p$, $p$Où en es-tu aujourd'hui ?$p$, $p$Ça adapte ton parcours.$p$, $j$[{"value":"zero","label":"Je pars de zéro"},{"value":"essaye","label":"J'ai déjà essayé des lead magnets"},{"value":"audience","label":"J'ai déjà une audience"}]$j$::jsonb, true, 2),
  (0, $p$decision$p$, $p$As-tu créé ton compte Tiquiz gratuit ?$p$, $p$Si pas encore, le lien est juste au-dessus.$p$, $j$[{"value":"oui","label":"Oui, c'est fait"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 3),
  (0, $p$decision$p$, $p$Le pacte : je m'engage à publier mon quiz d'ici la fin du parcours.$p$, $p$Un engagement à voix haute, c'est ce qui fait aller au bout.$p$, $j$[{"value":"oui","label":"Oui, je m'engage"}]$j$::jsonb, true, 4),
  -- J1
  (1, $p$decision$p$, $p$Quel est l'objectif principal de ton quiz ?$p$, $p$Tu peux en combiner plusieurs (capter ET segmenter ET vendre...). Indique le principal ici.$p$, $j$[{"value":"capter","label":"Capter des emails"},{"value":"qualifier","label":"Qualifier"},{"value":"segmenter","label":"Segmenter"},{"value":"diagnostiquer","label":"Diagnostiquer"},{"value":"orienter","label":"Orienter vers une offre"},{"value":"vendre","label":"Vendre"},{"value":"viralite","label":"Générer de la viralité"},{"value":"donnees","label":"Récolter des données"},{"value":"autorite","label":"Construire mon autorité"},{"value":"communaute","label":"Faire entrer dans ma communauté"},{"value":"autre","label":"Autre"}]$j$::jsonb, true, 1),
  (1, $p$action$p$, $p$Complète : après mon quiz, le prospect réalise que ___.$p$, $p$C'est la boussole de ton quiz.$p$, $j$[]$j$::jsonb, true, 2),
  (1, $p$action$p$, $p$Note 3 phrases que ta cible emploie vraiment.$p$, $p$Volées dans des avis ou commentaires. Ces mots iront dans ton quiz.$p$, $j$[]$j$::jsonb, false, 3),
  (1, $p$action$p$, $p$Écris tes 3 ou 4 profils de résultats, avec un nom valorisant chacun.$p$, $p$Alimente ton carnet et la génération du Jour 4.$p$, $j$[]$j$::jsonb, true, 4),
  (1, $p$decision$p$, $p$Ton quiz sera un quiz de profil ou un quiz de score ?$p$, $p$Profil = un type (partage, portée). Score = un niveau (montre un manque, donne envie d'acheter).$p$, $j$[{"value":"profil","label":"Quiz de profil (un type)"},{"value":"score","label":"Quiz de score (un niveau)"}]$j$::jsonb, true, 5),
  (1, $p$action$p$, $p$Quelle action veux-tu à la fin du quiz ?$p$, $p$S'inscrire, télécharger, réserver un appel, prendre un code promo...$p$, $j$[]$j$::jsonb, true, 6),
  -- J2
  (2, $p$decision$p$, $p$As-tu ton compte Systeme.io et sais-tu où trouver ta clé API ?$p$, $p$Si pas encore, le coach te guide.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore (le coach me guide)"}]$j$::jsonb, true, 1),
  (2, $p$decision$p$, $p$Combien de tags as-tu créés ?$p$, $p$La capture au minimum.$p$, $j$[{"value":"capture","label":"Juste la capture"},{"value":"capture_profils","label":"Capture + un par profil"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 2),
  (2, $p$action$p$, $p$Quel sera le premier email de bienvenue que reçoit ton lead ?$p$, $p$Le coach peut t'aider à l'affiner.$p$, $j$[]$j$::jsonb, false, 3),
  (2, $p$self_eval$p$, $p$Où en es-tu sur la tuyauterie ?$p$, $p$Si tu bloques, le coach intervient.$p$, $j$[{"value":"pret","label":"Tout est prêt"},{"value":"presque","label":"Presque"},{"value":"bloque","label":"Je bloque"}]$j$::jsonb, false, 4),
  -- J3
  (3, $p$decision$p$, $p$Ton titre est-il du type "Quel type de X es-tu ?"$p$, $p$Il parle de la personne, ce n'est pas une interro de connaissances.$p$, $j$[{"value":"oui","label":"Oui, il parle de la personne"},{"value":"a_reformuler","label":"Pas encore, je le reformule"}]$j$::jsonb, true, 1),
  (3, $p$decision$p$, $p$Combien de questions prévois-tu ?$p$, $p$5 à 7 maximum, sinon on abandonne.$p$, $j$[{"value":"5_7","label":"5 à 7 questions"},{"value":"plus","label":"Plus de 7 (je raccourcis)"}]$j$::jsonb, true, 2),
  (3, $p$decision$p$, $p$Ta première question est-elle facile et fun ?$p$, $p$Un début facile et intrigant donne envie d'aller au bout.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"a_revoir","label":"À revoir"}]$j$::jsonb, false, 3),
  (3, $p$action$p$, $p$Décris le résultat dont tes clients seraient FIERS.$p$, $p$Celui qu'on a envie de montrer ("je suis Le Bâtisseur"). Tu l'écriras dans Tiquiz demain.$p$, $j$[]$j$::jsonb, true, 4),
  -- J4
  (4, $p$decision$p$, $p$As-tu généré ton quiz avec le prompt à 3 couches ?$p$, $p$Cible + transformation + ton.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 1),
  (4, $p$decision$p$, $p$Ta capture email est-elle placée juste avant le résultat ?$p$, $p$C'est le réglage qui fait le plus bouger ton taux de leads.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"corrige","label":"Non, je corrige"}]$j$::jsonb, true, 2),
  (4, $p$decision$p$, $p$Ton quiz est-il connecté à Systeme.io avec au moins le tag de capture ?$p$, $p$La preuve que tes leads arriveront bien.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 3),
  (4, $p$action$p$, $p$Colle ici le lien de ton quiz publié.$p$, $p$Preuve de publication et matière pour la communauté.$p$, $j$[]$j$::jsonb, true, 4),
  -- J5
  (5, $p$decision$p$, $p$As-tu activé l'étape bonus de partage avec un bonus désirable ?$p$, $p$Un actif que tu as déjà, qui donne envie.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 1),
  (5, $p$action$p$, $p$Quels canaux vas-tu utiliser pour diffuser ?$p$, $p$Par exemple : réseaux, YouTube, blog, email, partenaires.$p$, $j$[]$j$::jsonb, true, 2),
  (5, $p$decision$p$, $p$Dans combien d'emplacements dormants as-tu mis ton lien ?$p$, $p$Lien en bio, signature, post épinglé...$p$, $j$[{"value":"aucun","label":"Aucun"},{"value":"un_deux","label":"1 ou 2"},{"value":"trois_plus","label":"3 et plus"}]$j$::jsonb, true, 3),
  (5, $p$action$p$, $p$Écris le premier post que tu vas publier pour lancer ton quiz.$p$, $p$Le coach peut l'affiner.$p$, $j$[]$j$::jsonb, true, 4),
  -- J6
  (6, $p$decision$p$, $p$Quelle maison pour ta communauté ?$p$, $p$Celle où ton audience est déjà, et que tu peux animer dans la durée.$p$, $j$[{"value":"facebook","label":"Groupe Facebook"},{"value":"telegram","label":"Canal Telegram"},{"value":"whatsapp","label":"Groupe WhatsApp"},{"value":"skool","label":"Skool"}]$j$::jsonb, true, 1),
  (6, $p$decision$p$, $p$As-tu créé ton espace et ajouté l'invitation sur ta page de résultat ?$p$, $p$Le quiz devient ton moteur d'entrée.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 2),
  (6, $p$action$p$, $p$Écris ton premier message d'accueil pour la communauté.$p$, $p$Le coach peut t'aider.$p$, $j$[]$j$::jsonb, true, 3),
  -- J7
  (7, $p$action$p$, $p$Quel est ton point de fuite n°1 dans ton funnel Tiquiz ?$p$, $p$Là où tu perds le plus de monde.$p$, $j$[]$j$::jsonb, true, 1),
  (7, $p$action$p$, $p$Quel correctif unique appliques-tu ?$p$, $p$Une seule chose à la fois, puis remesure.$p$, $j$[]$j$::jsonb, false, 2),
  (7, $p$action$p$, $p$Écris ton plan des 30 prochains jours.$p$, $p$Prochain quiz, rythme, abo, affiliation.$p$, $j$[]$j$::jsonb, true, 3),
  (7, $p$action$p$, $p$Colle ton bilan : ton quiz et tes premiers chiffres.$p$, $p$Boucle le parcours et nourrit tes témoignages.$p$, $j$[]$j$::jsonb, true, 4),
  -- Bonus 101 : trafic payant
  (101, $p$recall$p$, $p$Pour ancrer : quand peut-on lancer de la pub ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"preuve","label":"Seulement après avoir prouvé que le quiz convertit en gratuit"},{"value":"tout_de_suite","label":"Tout de suite, pour aller plus vite"}]$j$::jsonb, false, 1),
  (101, $p$decision$p$, $p$As-tu une idée d'offre auto-liquidante pour ton quiz ?$p$, $p$Le coach peut t'aider à la trouver.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore (le coach m'aide)"}]$j$::jsonb, false, 2),
  -- Bonus 102 : vendre
  (102, $p$recall$p$, $p$Pour ancrer : pourquoi un quiz vend-il sans forcer ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"diagnostic","label":"Parce qu'il a diagnostiqué, le prospect conclut seul (zéro résistance)"},{"value":"faux_timer","label":"Parce qu'on met un faux compte à rebours"}]$j$::jsonb, false, 1),
  (102, $p$decision$p$, $p$Quelle façon de vendre testes-tu en premier ?$p$, $p$Tu pourras en ajouter d'autres.$p$, $j$[{"value":"cta","label":"CTA direct sur le résultat"},{"value":"email","label":"Email de vente par tag"},{"value":"valeur","label":"Valeur gratuite puis vente"}]$j$::jsonb, false, 2),
  (102, $p$decision$p$, $p$Vas-tu utiliser un coupon-récompense ?$p$, $p$Honnête, relié à ton offre.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"plus_tard","label":"Pas pour l'instant"}]$j$::jsonb, false, 3),
  -- Bonus 103 : sondages
  (103, $p$recall$p$, $p$Pour ancrer : à quoi sert surtout un sondage ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"data","label":"À récolter des données et la voix du client"},{"value":"type","label":"À révéler un type au répondant"}]$j$::jsonb, false, 1),
  (103, $p$decision$p$, $p$Vas-tu lancer un sondage cette semaine ?$p$, $p$Même court, ça rapporte beaucoup.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"plus_tard","label":"Plus tard"}]$j$::jsonb, false, 2),
  -- Bonus 104 : popquiz
  (104, $p$recall$p$, $p$Pour ancrer : qu'est-ce qu'un popquiz cliffhanger ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"bloquant","label":"Un quiz bloquant juste avant la révélation d'une vidéo, à compléter pour la suite"},{"value":"fin","label":"Un quiz qu'on met en fin de page"}]$j$::jsonb, false, 1),
  (104, $p$decision$p$, $p$As-tu une vidéo où incruster un popquiz ?$p$, $p$Ta meilleure vidéo de valeur.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, false, 2),
  -- Bonus 105 : promo par réseau
  (105, $p$decision$p$, $p$Quel réseau attaques-tu en premier ?$p$, $p$Celui où ta cible est déjà présente.$p$, $j$[{"value":"facebook","label":"Facebook"},{"value":"instagram","label":"Instagram"},{"value":"linkedin","label":"LinkedIn"},{"value":"reddit","label":"Reddit"},{"value":"threads","label":"Threads"},{"value":"x","label":"X"}]$j$::jsonb, false, 1),
  (105, $p$decision$p$, $p$Ton profil et ton lien en bio (vers ton quiz) sont-ils prêts ?$p$, $p$Photo nette, bio orientée bénéfice, mini-page Systeme.io.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, false, 2)
)
insert into questions (day_id, type, prompt, help_text, options, required, sort_order)
select d.id, q.type, q.prompt, q.help_text, q.options, q.required, q.sort_order
from q
join days d on d.day_number = q.day_number
on conflict (day_id, sort_order) do update set
  type = excluded.type,
  prompt = excluded.prompt,
  help_text = excluded.help_text,
  options = excluded.options,
  required = excluded.required;

notify pgrst, 'reload schema';
