-- ════════════════════════════════════════════════════════════════
-- QUIZING : insertion des infographies dans le contenu des jours.
-- ════════════════════════════════════════════════════════════════
-- ADDITIF et NON DESTRUCTIF, contrairement a parcours.sql (qui, lui,
-- REMPLACE intro_html en on-conflict). Ce script AJOUTE seulement un
-- shortcode [[figure:cle]] juste avant une ancre (<h2>...</h2>), et
-- uniquement si :
--   - l'ancre existe encore dans le contenu LIVE (donc si Béné a
--     renomme le titre, on ne touche a rien : a inserer via l'admin),
--   - la figure n'est pas deja presente (idempotent, rejouable).
-- Aucun texte existant n'est supprime ni modifie. A rejouer sans risque.
--
-- Placement (bonnes pratiques d'apprentissage : 1 visuel par concept
-- cle, pas de surcharge) :
--   J0 : boucle-apprendre     J1 : quiz-maths, profil-vs-score, trame-resultat
--   J2 : cle-api-pont, chaine-resultat
-- Les figures capture-pic et page-resultat restent dispo dans le
-- selecteur admin (a placer sur J4/J5 selon ton contenu edite).

-- Helper implicite : chaque bloc = 1 figure. On insere le shortcode
-- (enveloppe dans un <p>, que le rendu "deballe" proprement) devant l'ancre.

-- ── J0 : la boucle apprendre en faisant ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Comment marche l'Atelier</h2>$anc$,
  $ins$<p>[[figure:boucle-apprendre]]</p>
<h2>Comment marche l'Atelier</h2>$ins$
)
where day_number = 0
  and position($anc$<h2>Comment marche l'Atelier</h2>$anc$ in intro_html) > 0
  and position('[[figure:boucle-apprendre]]' in intro_html) = 0;

-- ── J1 : maths du quiz (PDF contre quiz) ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Un seul type de quiz compte</h2>$anc$,
  $ins$<p>[[figure:quiz-maths]]</p>
<h2>Un seul type de quiz compte</h2>$ins$
)
where day_number = 1
  and position($anc$<h2>Un seul type de quiz compte</h2>$anc$ in intro_html) > 0
  and position('[[figure:quiz-maths]]' in intro_html) = 0;

-- ── J1 : quiz de profil contre quiz de score ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Tes décisions de départ</h2>$anc$,
  $ins$<p>[[figure:profil-vs-score]]</p>
<h2>Tes décisions de départ</h2>$ins$
)
where day_number = 1
  and position($anc$<h2>Tes décisions de départ</h2>$anc$ in intro_html) > 0
  and position('[[figure:profil-vs-score]]' in intro_html) = 0;

-- ── J1 : la trame d'un resultat qui vend (concept phare) ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Growth hack 2 : copie les mots de tes clients</h2>$anc$,
  $ins$<p>[[figure:trame-resultat]]</p>
<h2>Growth hack 2 : copie les mots de tes clients</h2>$ins$
)
where day_number = 1
  and position($anc$<h2>Growth hack 2 : copie les mots de tes clients</h2>$anc$ in intro_html) > 0
  and position('[[figure:trame-resultat]]' in intro_html) = 0;

-- ── J2 : la cle API, pont Tiquiz - Systeme.io ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Pour toi : automatique. Pour lui : du sur-mesure.</h2>$anc$,
  $ins$<p>[[figure:cle-api-pont]]</p>
<h2>Pour toi : automatique. Pour lui : du sur-mesure.</h2>$ins$
)
where day_number = 2
  and position($anc$<h2>Pour toi : automatique. Pour lui : du sur-mesure.</h2>$anc$ in intro_html) > 0
  and position('[[figure:cle-api-pont]]' in intro_html) = 0;

-- ── J2 : la chaine resultat, tag, segment, offre ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Growth hack 1 : un tag sur une réponse</h2>$anc$,
  $ins$<p>[[figure:chaine-resultat]]</p>
<h2>Growth hack 1 : un tag sur une réponse</h2>$ins$
)
where day_number = 2
  and position($anc$<h2>Growth hack 1 : un tag sur une réponse</h2>$anc$ in intro_html) > 0
  and position('[[figure:chaine-resultat]]' in intro_html) = 0;

-- ══════════════════ Jours 3 a 7 + bonus ══════════════════

-- ── J3 : les 2 moteurs viraux (finir / partager) ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Pour qu'on aille au bout</h2>$anc$,
  $ins$<p>[[figure:deux-moteurs-viraux]]</p>
<h2>Pour qu'on aille au bout</h2>$ins$
)
where day_number = 3
  and position($anc$<h2>Pour qu'on aille au bout</h2>$anc$ in intro_html) > 0
  and position('[[figure:deux-moteurs-viraux]]' in intro_html) = 0;

-- ── J4 : publier une v1 imparfaite ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>L'erreur à éviter</h2>$anc$,
  $ins$<p>[[figure:v1-imparfaite]]</p>
<h2>L'erreur à éviter</h2>$ins$
)
where day_number = 4
  and position($anc$<h2>L'erreur à éviter</h2>$anc$ in intro_html) > 0
  and position('[[figure:v1-imparfaite]]' in intro_html) = 0;

-- ── J5 : la boucle d'auto-viralite ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>5 growth hacks pour ramener du monde</h2>$anc$,
  $ins$<p>[[figure:boucle-viralite]]</p>
<h2>5 growth hacks pour ramener du monde</h2>$ins$
)
where day_number = 5
  and position($anc$<h2>5 growth hacks pour ramener du monde</h2>$anc$ in intro_html) > 0
  and position('[[figure:boucle-viralite]]' in intro_html) = 0;

-- ── J6 : l'echelle de confiance ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Où la créer : 4 maisons possibles</h2>$anc$,
  $ins$<p>[[figure:echelle-confiance]]</p>
<h2>Où la créer : 4 maisons possibles</h2>$ins$
)
where day_number = 6
  and position($anc$<h2>Où la créer : 4 maisons possibles</h2>$anc$ in intro_html) > 0
  and position('[[figure:echelle-confiance]]' in intro_html) = 0;

-- ── J7 : le funnel en 5 etapes ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Laisse l'IA de Tiquiz le faire pour toi (plan Plus)</h2>$anc$,
  $ins$<p>[[figure:funnel-5-etapes]]</p>
<h2>Laisse l'IA de Tiquiz le faire pour toi (plan Plus)</h2>$ins$
)
where day_number = 7
  and position($anc$<h2>Laisse l'IA de Tiquiz le faire pour toi (plan Plus)</h2>$anc$ in intro_html) > 0
  and position('[[figure:funnel-5-etapes]]' in intro_html) = 0;

-- ── Bonus 101 : l'offre auto-liquidante ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Le test minimal et le retargeting</h2>$anc$,
  $ins$<p>[[figure:offre-auto-liquidante]]</p>
<h2>Le test minimal et le retargeting</h2>$ins$
)
where day_number = 101
  and position($anc$<h2>Le test minimal et le retargeting</h2>$anc$ in intro_html) > 0
  and position('[[figure:offre-auto-liquidante]]' in intro_html) = 0;

-- ── Bonus 102 : page de resultat en 4 temps ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Les 3 façons de vendre (choisis-en une)</h2>$anc$,
  $ins$<p>[[figure:page-resultat]]</p>
<h2>Les 3 façons de vendre (choisis-en une)</h2>$ins$
)
where day_number = 102
  and position($anc$<h2>Les 3 façons de vendre (choisis-en une)</h2>$anc$ in intro_html) > 0
  and position('[[figure:page-resultat]]' in intro_html) = 0;

-- ── Bonus 103 : quiz contre sondage ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Le sondage pré-quiz : reprends leurs mots, à la source</h2>$anc$,
  $ins$<p>[[figure:quiz-vs-sondage]]</p>
<h2>Le sondage pré-quiz : reprends leurs mots, à la source</h2>$ins$
)
where day_number = 103
  and position($anc$<h2>Le sondage pré-quiz : reprends leurs mots, à la source</h2>$anc$ in intro_html) > 0
  and position('[[figure:quiz-vs-sondage]]' in intro_html) = 0;

-- ── Bonus 104 : capture au pic (cliffhanger) ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Le popquiz qui remplace un webinaire</h2>$anc$,
  $ins$<p>[[figure:capture-pic]]</p>
<h2>Le popquiz qui remplace un webinaire</h2>$ins$
)
where day_number = 104
  and position($anc$<h2>Le popquiz qui remplace un webinaire</h2>$anc$ in intro_html) > 0
  and position('[[figure:capture-pic]]' in intro_html) = 0;

-- ── Bonus 105 : la regle des 7 contacts ──
update days set intro_html = replace(
  intro_html,
  $anc$<h2>Le guide réseau par réseau</h2>$anc$,
  $ins$<p>[[figure:regle-7-contacts]]</p>
<h2>Le guide réseau par réseau</h2>$ins$
)
where day_number = 105
  and position($anc$<h2>Le guide réseau par réseau</h2>$anc$ in intro_html) > 0
  and position('[[figure:regle-7-contacts]]' in intro_html) = 0;
