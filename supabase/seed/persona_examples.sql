-- ════════════════════════════════════════════════════════════════
-- QUIZING - exemples "Pour toi" par persona (encarts par jour)
-- ════════════════════════════════════════════════════════════════
-- Memes jours, memes videos : seuls les exemples changent. Repli neutre
-- si un persona n'a pas d'exemple. Idempotent (upsert sur day_id+persona).
-- Prerequis : migration 0008 (table day_persona_examples) + parcours.sql
-- (les jours doivent exister). A relancer apres modif de contenu.
--
-- Personas : freelance, infopreneur, coach, auteur, createur, affilie, mlm,
-- autre (catch-all : e-commerce, artisan, commerce local, etc. Tout
-- activity_type inconnu, et l'alias "ecommerce", se rabattent sur "autre").
-- Contenu user-visible : accents respectes, aucun tiret long.

with e(day_number, persona, html) as (
  values
  -- ── J1 : penser le quiz, choisir l'objectif, ecrire les profils de resultats ──
  (1, $$freelance$$,   $$<p>Pour un freelance, tes 3 ou 4 profils de résultats peuvent être des types de clients : "Le solo débordé qui doit déléguer", "Le perfectionniste qui veut garder le contrôle", "Le pressé qui veut du clé en main". Chacun appelle une prestation différente.</p>$$),
  (1, $$infopreneur$$, $$<p>Comme infopreneur, segmente par niveau : "Le grand débutant", "Le bloqué qui a déjà essayé", "L'avancé qui veut optimiser". Ton quiz oriente chacun vers le bon module ou la bonne formation.</p>$$),
  (1, $$coach$$,       $$<p>Pour un coach, profile par frein : "Le syndrome de l'imposteur", "La surcharge mentale", "Le manque de clarté". Le résultat nomme le blocage, et ton accompagnement devient la suite logique.</p>$$),
  (1, $$auteur$$,      $$<p>Pour un auteur, profile par type de lecteur : "Le curieux pressé", "Le passionné qui veut tout comprendre", "Le sceptique à convaincre". Chaque profil mène vers le bon livre ou le bon chapitre.</p>$$),
  (1, $$createur$$,    $$<p>Créateur de contenu, profile ta communauté par niveau d'engagement : "Le nouveau venu", "Le fan fidèle", "Le futur client". Tu sauras quel contenu et quelle offre proposer à chacun.</p>$$),
  (1, $$affilie$$,     $$<p>En affiliation, tes profils correspondent à des besoins que ton produit recommandé résout : "Le débutant qui cherche un outil simple", "Le pro qui veut passer à l'échelle". Le résultat recommande le produit adapté à chaque profil.</p>$$),
  (1, $$mlm$$,         $$<p>En marketing de réseau, profile entre futurs clients et futurs partenaires : "Celui qui veut juste le produit", "Celui qui cherche une opportunité". Ton quiz trie les deux automatiquement.</p>$$),

  -- ── J2 : Systeme.io, tags, sequence de bienvenue ──
  (2, $$freelance$$,   $$<p>Crée un tag par type de prestation (par exemple "site vitrine", "refonte", "maintenance") : tu enverras la bonne proposition au bon prospect.</p>$$),
  (2, $$infopreneur$$, $$<p>Tague selon le niveau ou le centre d'intérêt détecté : ta séquence de bienvenue présente alors la formation la plus pertinente.</p>$$),
  (2, $$coach$$,       $$<p>Tague selon le blocage principal du prospect : ta séquence de bienvenue parle directement de SON problème, pas d'un discours générique.</p>$$),
  (2, $$auteur$$,      $$<p>Tague selon le livre ou le thème qui a déclenché l'inscription, pour proposer la suite logique (tome suivant, atelier, newsletter).</p>$$),
  (2, $$createur$$,    $$<p>Tague par centre d'intérêt : tu segmentes ta communauté et tu arrêtes d'envoyer le même email à tout le monde.</p>$$),
  (2, $$affilie$$,     $$<p>Tague selon le produit recommandé à chaque profil : ta séquence pousse le bon lien d'affiliation, sans spammer toute ta liste.</p>$$),
  (2, $$mlm$$,         $$<p>Crée deux tags clés : "client" et "prospect partenaire". Tu adaptes ton suivi : le produit d'un côté, l'opportunité de l'autre.</p>$$),

  -- ── J3 : choisir le format (quiz / sondage / popquiz) ──
  (3, $$freelance$$,   $$<p>Le quiz est ton meilleur allié : il qualifie le prospect avant même le premier appel découverte, tu ne perds plus de temps en rendez-vous mal ciblés.</p>$$),
  (3, $$infopreneur$$, $$<p>Quiz pour capter et segmenter tes futurs élèves. Et garde le popquiz en tête : incrusté dans tes vidéos de valeur, il capte au pic d'attention.</p>$$),
  (3, $$coach$$,       $$<p>Le quiz "diagnostic" est parfait pour toi : il fait prendre conscience du problème, et ton coaching devient la réponse évidente.</p>$$),
  (3, $$auteur$$,      $$<p>Le quiz "quel lecteur es-tu" engage ta communauté ; le sondage t'aide à choisir le sujet de ton prochain livre.</p>$$),
  (3, $$createur$$,    $$<p>Le popquiz dans tes vidéos est ton arme secrète : tu captes des emails là où ton audience est déjà en train de te regarder.</p>$$),
  (3, $$affilie$$,     $$<p>Le quiz "quelle solution te faut-il" diagnostique le besoin et recommande, en résultat, le produit affilié adapté.</p>$$),
  (3, $$mlm$$,         $$<p>Le quiz trie clients et partenaires potentiels ; le sondage te dit ce que ton réseau attend vraiment avant de proposer quoi que ce soit.</p>$$),

  -- ── J4 : creer et connecter (prompt 3 couches, branding) ──
  (4, $$freelance$$,   $$<p>Dans ton prompt, précise ta prestation et ta cible pro (par exemple "j'aide les artisans à avoir un site qui convertit"). L'IA sortira des résultats qui parlent à TES clients.</p>$$),
  (4, $$infopreneur$$, $$<p>Donne à l'IA le sujet de ta formation et le niveau de tes élèves : tes questions et tes profils colleront à ton programme.</p>$$),
  (4, $$coach$$,       $$<p>Indique le type de transformation que tu provoques : l'IA génèrera un quiz qui révèle le blocage que ton accompagnement résout.</p>$$),
  (4, $$auteur$$,      $$<p>Mentionne le thème et le ton de ton livre : ton quiz prolongera ton univers, même style, même voix.</p>$$),
  (4, $$createur$$,    $$<p>Donne ta thématique et ta ligne éditoriale : le quiz ressemblera à ton contenu, tes abonnés se reconnaîtront tout de suite.</p>$$),
  (4, $$affilie$$,     $$<p>Indique le produit recommandé et le problème qu'il résout : l'IA construira un quiz qui mène naturellement à ta reco, sans la forcer.</p>$$),
  (4, $$mlm$$,         $$<p>Précise que tu veux trier clients et partenaires : prévois un embranchement produit / opportunité dans les résultats.</p>$$),

  -- ── J5 : promouvoir gratuitement ──
  (5, $$freelance$$,   $$<p>Mets le lien de ton quiz dans ta signature email et sur ton profil LinkedIn : chaque prospect qui te découvre se qualifie tout seul.</p>$$),
  (5, $$infopreneur$$, $$<p>Place ton quiz sur la page de remerciement de ton lead magnet actuel : tu transformes tes inscrits existants en élèves segmentés.</p>$$),
  (5, $$coach$$,       $$<p>Publie un post par profil de résultat : chaque blocage devient un sujet qui attire les bonnes personnes vers ton quiz.</p>$$),
  (5, $$auteur$$,      $$<p>Glisse le lien à la fin de ton livre et en bio : tes lecteurs entrent dans ta liste et découvrent la suite de ton univers.</p>$$),
  (5, $$createur$$,    $$<p>Épingle ton quiz et mets-le en lien en bio : transforme tes vues en emails au lieu de les laisser filer.</p>$$),
  (5, $$affilie$$,     $$<p>Crée un post par problème résolu par le produit : chaque post envoie vers le quiz qui recommande ta solution.</p>$$),
  (5, $$mlm$$,         $$<p>Partage le quiz dans tes conversations plutôt qu'un lien de vente brut : il engage et trie sans paraître insistant.</p>$$),

  -- ── J6 : creer ta communaute ──
  (6, $$freelance$$,   $$<p>Même en solo, un petit cercle de prospects et de clients nourrit ton autorité et tes recommandations.</p>$$),
  (6, $$infopreneur$$, $$<p>Ta communauté devient le sas d'entrée vers tes formations : on rejoint en gratuit, on achète ensuite, en confiance.</p>$$),
  (6, $$coach$$,       $$<p>Un groupe où tes prospects échangent crée la preuve sociale qui rend ton accompagnement désirable.</p>$$),
  (6, $$auteur$$,      $$<p>Un club de lecteurs autour de ton univers fait vivre tes livres entre deux sorties.</p>$$),
  (6, $$createur$$,    $$<p>Sors tes abonnés des plateformes que tu ne contrôles pas : un espace à toi, où la relation est directe.</p>$$),
  (6, $$affilie$$,     $$<p>Une communauté autour d'un thème te permet de recommander tes produits affiliés dans la durée, avec confiance.</p>$$),
  (6, $$mlm$$,         $$<p>Anime ton réseau dans un espace dédié : tes partenaires et tes clients restent engagés et reviennent.</p>$$),

  -- ── J7 : adapter, suivre, et apres ──
  (7, $$freelance$$,   $$<p>Ton vrai indicateur : combien de prospects qualifiés et d'appels découverte ton quiz t'amène chaque mois.</p>$$),
  (7, $$infopreneur$$, $$<p>Regarde le taux de complétion et les ventes par profil : tu sais quelle formation pousser à quel segment.</p>$$),
  (7, $$coach$$,       $$<p>Suis combien de prospects passent du quiz à un appel ou à une offre : c'est ça, ton funnel de coaching.</p>$$),
  (7, $$auteur$$,      $$<p>Mesure les inscriptions et les ventes de livres déclenchées par le quiz, et relance-le à chaque nouvelle sortie.</p>$$),
  (7, $$createur$$,    $$<p>Compare les emails captés à tes vues : ton quiz transforme-t-il assez ton audience en liste ?</p>$$),
  (7, $$affilie$$,     $$<p>Ton indicateur clé : les clics et les ventes affiliées générés depuis les pages de résultat. Double ce qui marche.</p>$$),
  (7, $$mlm$$,         $$<p>Suis combien de clients et combien de partenaires ton quiz a triés : ajuste le message du résultat selon ce que tu veux plus.</p>$$),

  -- ── Persona "Autre" (catch-all : e-commerce, artisan, commerce local, SaaS...) ──
  (1, $$autre$$, $$<p>Quel que soit ton domaine, tes 3 ou 4 profils de résultats correspondent à des situations clients : "Celui qui débute et hésite", "Celui qui a déjà essayé sans succès", "Celui qui est prêt et cherche le bon choix". Chaque profil appelle une offre ou un conseil différent.</p>$$),
  (2, $$autre$$, $$<p>Crée un tag par grande famille de besoin détectée dans ton quiz (par gamme de produit, par objectif ou par budget) : tu enverras le bon message au bon inscrit, au lieu d'un email unique pour tous.</p>$$),
  (3, $$autre$$, $$<p>Le quiz "diagnostic" te va très bien : il fait prendre conscience d'un besoin et présente ton offre comme la réponse logique. Le sondage, lui, t'aide à savoir ce que ton audience veut avant de le créer.</p>$$),
  (4, $$autre$$, $$<p>Dans ton prompt, décris précisément ton activité et ta clientèle (par exemple "je vends des produits zéro déchet aux familles") : l'IA sortira des questions et des profils qui parlent vraiment à TES clients.</p>$$),
  (5, $$autre$$, $$<p>Mets le lien de ton quiz là où on te découvre déjà : bio, signature email, page de remerciement d'un achat ou d'un téléchargement. Chaque visiteur se qualifie tout seul et entre dans ta liste.</p>$$),
  (6, $$autre$$, $$<p>Un espace à toi (groupe, newsletter, club) garde tes clients et prospects au chaud entre deux offres : la relation directe vaut plus que des abonnés sur une plateforme que tu ne contrôles pas.</p>$$),
  (7, $$autre$$, $$<p>Ton vrai indicateur : combien d'emails qualifiés et de ventes ton quiz t'amène chaque mois. Regarde quel profil de résultat convertit le mieux, et double ce qui marche.</p>$$)
)
insert into day_persona_examples (day_id, persona, examples_html)
select d.id, e.persona, e.html
from e
join days d on d.day_number = e.day_number
on conflict (day_id, persona) do update set
  examples_html = excluded.examples_html,
  updated_at = now();

notify pgrst, 'reload schema';
