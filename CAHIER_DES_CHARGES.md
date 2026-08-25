# CAHIER DES CHARGES Tiquiz

Application web SaaS multilingue de création de contenus interactifs (quiz par profil, quiz noté, sondage, popquiz vidéo) pour la capture et la qualification de leads, avec intégration native Systeme.io et génération par IA.

Tiquiz est le module quiz autonome de la plateforme Tipote. Le périmètre est volontairement focalisé : quiz, sondage, popquiz, IA de génération, intégration Systeme.io. Pas de coach IA, pas de crédits IA à consommer, pas de réseaux sociaux, pas d'automations, pas de constructeur de pages, pas de production de contenu (posts, emails, articles).

Domaine de l'application : `quiz.tipote.com`.

---

## 1. Présentation du produit

### 1.1. Vision

Tiquiz permet à un créateur de fabriquer un lead magnet interactif (le classique « Quel type de X es-tu ? »), de le publier sur une URL courte ou son propre domaine, de capturer des leads et de les synchroniser automatiquement avec Systeme.io (tags, formations, communautés, champ personnalisé). Simple côté utilisateur, complet côté backend.

### 1.2. Fonctionnalités clés

- Trois modes de contenu partageant le même moteur : **quiz par profil**, **quiz scoré (diagnostic, mono ou multi-axes)**, **sondage**.
- **Quiz scoré multi-axes** : score global sur 100 (jauge, affichage en pourcentage ou en libellé bas / moyen / élevé personnalisable), jusqu'à 6 axes thématiques avec barre de score par axe, questions pondérées par axe, résultats par tranches de score à bornes calculées, variables `{score}`, `{label}`, `{score_<axe>}`, `{label_<axe>}` dans les textes et les URL de CTA, tags Systeme.io par tranche (globale et par axe).
- **Module Popquiz** : vidéo avec quiz interactifs incrustés à des timestamps précis, embed iframe.
- Création **manuelle** (choix quiz par profil ou quiz scoré), par **génération IA** (streaming SSE, type par profil ou scoré avec axes et nombre de tranches au choix), par **brainstorm IA conversationnel**, par **import** de document (.txt, .docx, .pdf) ou depuis un **catalogue de 15 templates métier**.
- **Éditeur WYSIWYG live** avec preview temps réel, édition inline, champs rich-text, autosave, détecteur d'ex-aequo (mode profil) et détecteur de couverture des tranches de score (mode scoré : trous, chevauchements, bornes hors de portée signalés avant publication).
- **Système de design complet** : 9 polices Google, couleurs de marque (principale, fond, texte) avec générateur de palette à partir d'une seule couleur, 9 thèmes prêts à l'emploi, 8 dégradés, fond image plein cadre, contraste de texte auto (clair/sombre). Dispositions : accueil en carte ou couverture, questions centrées / à gauche / en deux colonnes (type Typeform), formes de boutons, disposition des réponses (auto / grille / liste), panneau latéral avec motifs. Mise en page responsive centrée sur tous les écrans.
- **Design par défaut du projet** : le créateur enregistre ses réglages de présentation comme modèle ; chaque nouveau quiz démarre déjà à sa marque.
- **Types de questions variés** : choix multiple (mono ou multi-réponses), oui/non, choix par image, échelle de notation, notation en étoiles, réponse libre.
- **Présentation type Typeform** : questions une par une, transitions fluides, navigation clavier et gestuelle mobile.
- **Capture de leads configurable** (email, prénom, nom, téléphone, pays), placement avant ou après les questions, consentement RGPD.
- **Intégration Systeme.io** : tags de capture, de partage, par résultat (plusieurs tags possibles), par réponse, plus inscription formation, ajout communauté, enrichissement contact.
- **Viralité** : étape bonus de partage entre capture et résultats, anti-triche réelle, carte de résultat partageable.
- **Multiprofils** : un compte gère plusieurs projets isolés (contenu, leads, stats, branding, clés Systeme.io).
- **Domaines personnalisés** : servir ses contenus depuis son propre hostname.
- **Analytics** : funnel par contenu, drop-off par question, distribution des leads par résultat, insights et analyse IA.
- **Pixels de tracking** : Meta Pixel, GA4, Google Ads, Meta CAPI (par contenu ou par défaut au niveau projet).
- **Studio visuel** : génération IA d'images de fond et de textes courts pour la promotion.
- **Gamification** : jalons (milestones), mur des réussites, objectif hebdomadaire, confettis.
- **Programme revendeur** : un partenaire revend Tiquiz en gros à ses propres clients (comptes isolés, facturation automatisée).
- **Multilingue à deux niveaux** : interface admin en 7 langues (dont arabe RTL), et contenu de quiz générable dans plus de 100 langues (19 mises en avant), avec formes tu/vous du français et typographie française automatique.
- **Notifications de réponses** : email au créateur à chaque nouveau lead (activable), et masquage optionnel des compteurs de réponses.
- **Masquage de la marque** : les plans payants peuvent remplacer le lien "offert par Tiquiz" par leur propre lien, ou le retirer complètement.
- **Monétisation freemium** pilotée par webhooks Systeme.io, avec changement de plan en un clic.

### 1.3. Périmètre exclu (par rapport à Tipote)

Tiquiz ne comprend pas : coach IA, crédits IA consommables, réseaux sociaux (OAuth, publication, automations), constructeur de pages, production de contenu générique (posts, emails, articles), stratégie et plan d'action, gestion de clients ou d'accompagnements, widgets sociaux, templates Systeme.io, système de pépites. Tiquiz partage en revanche avec Tipote le mécanisme multiprofils et l'analyse IA, sur son périmètre quiz / sondage / popquiz.

---

## 2. Architecture UX

### 2.1. Workflow utilisateur

```
INSCRIPTION (webhook Systeme.io ou signup direct)
  -> LOGIN (mot de passe, magic link, mot de passe oublié)
    -> DASHBOARD (contenus + stats + jalons)
      -> CRÉER (manuel, IA, brainstorm, import, template)
        -> ÉDITER (éditeur WYSIWYG live) -> PUBLIER
          -> PARTAGER (URL courte ou domaine perso)
            -> LEADS capturés -> sync Systeme.io
```

### 2.2. Navigation principale

| Page | URL | Description |
|:-----|:----|:-----------|
| Accueil | `/` | Landing publique |
| Login | `/login` | Connexion (mot de passe + magic link + lien mot de passe oublié) |
| Mot de passe oublié | `/auth/forgot-password` | Demande de reset (email Resend brandé, fallback template Supabase) |
| Nouveau mot de passe | `/auth/reset-password` | Choix du nouveau mot de passe après lien recovery |
| Signup | `/signup` | Inscription |
| Dashboard | `/dashboard` | Vue d'ensemble, onboarding, jalons |
| Mes quiz | `/quizzes` | Liste des quiz (gérer, activer, dupliquer, partager) |
| Nouveau quiz | `/quiz/new` | Création (manuel, IA, brainstorm, import, template) |
| Éditeur quiz | `/quiz/[quizId]` | Éditeur WYSIWYG live |
| Analytics quiz | `/quiz/[quizId]/analytics` | Funnel, drop-off, distribution résultats |
| Quiz public | `/q/[quizId\|slug]` | Page publique du quiz (UUID ou slug) |
| Nouveau sondage | `/survey/new` | Création d'un sondage |
| Popquiz | `/popquizzes`, `/popquiz/new`, `/popquiz/[id]` | Liste, création, édition popquiz |
| Popquiz public | `/p/[popquizId]` | Lecture publique du popquiz |
| Embed popquiz | `/embed/p/[popquizId]` | Iframe embarquable |
| Templates | `/templates`, `/templates/[slug]` | Catalogue et détail des modèles |
| Mes leads | `/leads` | Tous les leads, filtres KPI, resync |
| Statistiques | `/stats` | Analytics agrégés |
| Paramètres | `/settings` | Profil, langue, branding, Systeme.io, domaines, abonnement, pixels |
| Espace revendeur | `/reseller` | Interface partenaire multi-tenant |
| Admin | `/admin` | Back-office (emails whitelistés) |
| Pages catch-all | `/[publicSlug]` | Résolution des URLs propres sur domaine perso |
| Callback auth | `/auth/callback` | OTP / PKCE / implicit |
| Pages légales | `/legal`, `/privacy`, `/terms`, `/cookies` | Mentions, confidentialité, CGU |

Le middleware protège les routes authentifiées (`/dashboard`, `/quiz`, `/settings`, etc.) et applique une politique fail-open sur erreur Supabase pour ne jamais bloquer un utilisateur légitime.

---

## 3. Moteur de contenu

Le même moteur (tables `quizzes`, `quiz_questions`, `quiz_results`, `quiz_leads`) sert trois modes, portés par la colonne `quizzes.mode` :

| Mode | Valeur | Principe |
|:-----|:-------|:---------|
| Quiz par profil | `quiz` | Chaque option pointe vers un résultat ; le profil dominant gagne |
| Quiz scoré | `scoring` | Chaque option porte des `points` ; le score total tombe dans une tranche `min_score`/`max_score` d'un résultat. Optionnel : axes thématiques (`quizzes.scoring_axes`, jusqu'à 6) sur lesquels chaque question pèse avec un poids (`config.axes`, poids 1 à 9) ; chaque lead reçoit un snapshot de scores `{ points, min, max }` global et par axe (`quiz_leads.scores`), figé à la capture et jamais recalculé |
| Sondage | `survey` | Les réponses brutes sont agrégées ; pas de résultat calculé |

Le cœur du scoring vit dans `lib/quizScoring.ts` (fichier identique dans Tipote) : calcul du snapshot, pourcentage `(points - min) / (max - min)`, tranches bas / moyen / élevé, variables de score, analyse de couverture des tranches, normalisation d'un quiz scoré généré par l'IA (`finalizeAiScoringQuiz` : points bornés 0-3, tranches contiguës calculées à partir de la plage atteignable), validation serveur du snapshot.

### 3.1. Types de questions

Portés par `quiz_questions.question_type`, avec configuration par type dans `quiz_questions.config` (JSONB) :

- `multiple_choice` (choix multiple, comportement historique)
- `rating_scale` (échelle de notation)
- `star_rating` (notation en étoiles)
- `free_text` (réponse libre)
- `image_choice` (choix par images)
- `yes_no` (oui / non)

Le choix multiple peut être passé en **multi-réponses** par question (`config.multi_select`), le scoring et la détection d'ex-aequo en tiennent compte.

En mode scoring, une note choisie (rating / star) compte comme points ; en mode profil elle est collectée sans influencer le résultat. Les réponses libres, échelles et étoiles ne déterminent jamais le profil.

### 3.2. Modes de création

Page `/quiz/new` (et `/survey/new` pour les sondages), onglets : Créer manuellement, Générer avec l'IA, Importer.

- **Manuel** : le clic ouvre un choix en deux cartes, Quiz par profil ou Quiz scoré, puis crée un quiz vierge du mode choisi (le scoré démarre avec la jauge activée).
- **Génération IA** : `/api/quiz/generate` en streaming SSE remplit le formulaire en temps réel à partir d'un brief (objectif, audience, ton, CTA, bonus, nombre de questions et de résultats, forme d'adresse, langue). Le créateur choisit le type : **par profil** ou **scoré (diagnostic)**, avec pour le scoré ses axes optionnels et le nombre de résultats (1 par tranche de score, 2 à 5). Principe : l'IA fait la sémantique (questions, intensités de réponses 0 à 3, textes de tranches ordonnés sans bornes chiffrées), le code fait l'arithmétique (`finalizeAiScoringQuiz` calcule des tranches contiguës qui couvrent exactement la plage atteignable ; le bandeau de couverture ne doit jamais apparaître sur un quiz généré).
- **Brainstorm IA** : `/api/quiz/idea-chat` (Claude Haiku), chat conversationnel borné (quelques tours) qui cadre une idée floue avant de lancer la génération complète.
- **Import** : `/api/quiz/import-extract` extrait le texte d'un fichier `.txt`, `.docx` ou `.pdf` côté serveur (max 10 Mo, 50 000 caractères ; les PDF scannés sont détectés avec un message d'aide), puis alimente la génération IA en mode import.
- **Templates** : catalogue de 15 modèles métier prêts à publier (cf. §14).
- **Génération embarquée anonyme** : `/api/embed/quiz/generate` permet de générer un quiz sans compte via un token de session ; l'utilisateur peut ensuite le revendiquer (`claim`) en s'inscrivant.

### 3.3. Éditeur WYSIWYG live (`/quiz/[quizId]`)

Sidebar à onglets (Structure, Design, Paramètres, Partage) avec preview live à droite, bascule mobile / desktop en temps réel. Édition inline directement dans la preview via `InlineEdit` et `RichTextEdit`. Autosave via `/api/quiz/[quizId]/autosave`.

- **Structure** : arborescence Intro, Questions (drag-and-drop), Prise d'informations, Demande de partage, Résultats (drag-and-drop) ; scroll-to-section.
- **Design** : 9 polices Google, couleurs de marque (principale, fond, texte) avec générateur de palette à partir d'une seule couleur, logo et favicon. Présentation : fond uni / dégradé (8) / image, 9 thèmes prêts à l'emploi, disposition d'accueil (carte ou couverture), disposition des questions (centrée / gauche / deux colonnes), disposition des réponses (auto / grille / liste), forme des boutons, panneau latéral à motifs. Le créateur peut enregistrer ses réglages comme design par défaut du projet, appliqué automatiquement aux nouveaux quiz.
- **Paramètres** : formulaire de capture (activation par champ prénom, nom, téléphone, pays), placement de la capture (avant ou après les questions), bloc bonus (description, visuel image / mockup / GIF, message de partage, tag Systeme.io post-partage), CTA par défaut, fermeture du quiz, affichage ou masquage des compteurs de réponses. En mode scoré, panneau **Score visuel et axes** : jauge activable, affichage en pourcentage ou en libellé (bas / moyen / élevé personnalisables), gestion des axes (ajout, renommage, suppression ; l'identifiant d'un axe est figé à la création, un renommage ne casse ni variables ni tags), option tags Systeme.io par tranche.
- **Spécifique au mode scoré, sur chaque question** : pastilles de rattachement aux axes avec poids 1 à 9, points par option, rappel de la règle d'arbitrage en cas d'égalité, et bandeau de couverture des tranches (trous, chevauchements, bornes hors de la plage atteignable, calculée en tenant compte du multi-réponses).
- **Réponse libre** : le texte d'invite (placeholder) s'édite dans la preview avec le même éditeur riche que les autres textes (taille, police, couleur, alignement, variables), rendu fidèle côté visiteur ; longueur maximale réglable.
- **Disposition deux colonnes** : un taquet entre l'image et le contenu règle la largeur du panneau (20 à 60 %, double-clic pour revenir au défaut), preview fidèle au rendu public y compris en bascule mobile.
- **Partage** : slug personnalisé, sélecteur de domaine de partage, sélecteur de réseaux, image et description OG, footer personnalisable (remplacer le lien "offert par Tiquiz" par son propre lien, ou le masquer complètement, sur les plans payants), QR code téléchargeable, snippet iframe.

Les champs rich-text (introduction, description / insight / projection de chaque résultat) sont assainis côté client et côté serveur via `sanitizeRichText`. L'éditeur inclut un color picker, un inséreur de variables de personnalisation, un sélecteur de GIF (via KLIPY), le recadrage d'image et la génération de variantes grammaticales (`/api/quiz/gender-variants`).

Outils IA dans l'éditeur : réécriture d'un texte (`/api/quiz/[quizId]/rewrite`, Haiku), rééquilibrage des résultats (`/api/quiz/[quizId]/rebalance`, Sonnet), duplication d'un quiz (`/api/quiz/[quizId]/duplicate`).

### 3.4. Personnalisation dynamique

Interpolation dans les textes du parcours, à partir des données capturées :

- `{name}` : prénom du visiteur (repli propre si absent).
- `{m|f|x}` : variante grammaticale masculin / féminin / inclusif, choisie selon le genre du visiteur. Libellés adaptés par langue (Il/Elle/Iel, He/She/They, etc.).
- `{a|b}`, `{a|b|c}`, `{L}` : autres formes de variantes gérées par `lib/quizPersonalization.ts`.
- **Variables de score** (quiz scoré) : `{score}` et `{label}` (global), `{score_<axe>}` et `{label_<axe>}` par axe, insérables en un clic depuis le menu de variables dans les textes de résultat ET dans l'URL du CTA (valeurs encodées ; jamais l'email dans une URL).

Les variantes de genre peuvent être générées par l'IA sur un champ (bouton ✨) ou sur tout le quiz d'un coup. Le contenu peut être produit dans plus de 100 langues (cf. §17.3).

---

### 3.5. Partager un quiz à un autre compte

Bouton **Partager ce quiz** sur la carte d'un projet (`/quizzes`). Il fabrique un lien (`/partage/<jeton>`) qui INSTALLE une copie du quiz dans le compte de celui qui l'ouvre : textes, images, questions, points, profils de résultat, couleurs et mise en page. Le quiz d'origine n'est ni déplacé, ni publié, ni modifié.

**La règle, en une ligne : les textes voyagent, les destinations et les identifiants restent.** `lib/quiz/partage.ts` porte la liste de ce qui ne traverse jamais : clé et tags Systeme.io, pixels Meta / GA4 / Google Ads, `cta_url`, `privacy_url`, pied de page, redirections de fermeture, `hide_branding`, plus l'identité et les compteurs. Chacun de ces champs, copié tel quel, produit un bug invisible à l'installation et découvert des semaines plus tard sur les données de vrais visiteurs : les leads du destinataire déclencheraient les automatisations de l'expéditeur, et ses visiteurs atterriraient sur le site de l'expéditeur.

`aPersonnaliser()` rend la liste de ce qui a été retiré, mais **uniquement ce que l'expéditeur avait vraiment rempli** : l'écran d'installation l'affiche, et une liste qui contient du bruit ne se lit plus.

**Les images sont RECOPIÉES** dans le dossier de stockage du destinataire (`lib/quiz/partageImages.ts`). Garder les URL de l'expéditeur afficherait tout correctement, jusqu'au jour où il fait le ménage dans son stockage : le quiz de son client se viderait de ses images des mois plus tard. On reconnaît une image à sa FORME (une URL de notre bucket public), n'importe où dans la ligne y compris au fond d'un JSONB, jamais par une liste de colonnes qui oublierait la prochaine. Une copie qui échoue garde l'URL d'origine, qui s'affiche encore, et l'écran dit combien de fichiers n'ont pas suivi.

**Le lien.** Table `quiz_shares` : un lien par destinataire, avec son libellé privé (jamais montré au destinataire), son compteur d'installations, sa date d'expiration facultative et son interrupteur. Par défaut il ne sert qu'UNE fois. `etatPartage()` rend la raison exacte d'un refus (`inconnu` / `revoque` / `expire` / `epuise`), jamais un écran muet.

**Les deux portes.** `/api/quiz/[quizId]/partage` (le propriétaire crée et révoque, sous RLS). `/api/partage/[jeton]` : la lecture du quiz source se fait avec la clé de service, parce que le destinataire n'a aucun droit dessus et ne doit pas en gagner ; mais **l'écriture de la copie se fait avec SA session**, donc sous sa propre RLS, avec son `user_id` et son projet. Le plafond du plan gratuit s'y applique comme partout.

**La page `/partage/<jeton>` est PUBLIQUE** : montrer son travail à un prospect ne doit pas commencer par lui demander de s'inscrire. Seule l'installation exige un compte. Sa langue vient de `quizzes.locale`, c'est à dire de la langue DU QUIZ PARTAGÉ (`lib/quiz/partageTextes.ts`, 7 langues, `?lang=` accepté et prioritaire) : celui qui reçoit un quiz anglais lit l'anglais, sinon on ne le lui aurait pas envoyé. **Le contenu du quiz, lui, ne change jamais de langue.**

---

### 3.6. La page de résultat : classique ou en 4 temps

`quizzes.result_layout` vaut `'classic'` par défaut en base, et `resultLayoutMode()` ne rend `'beats'` que sur la valeur explicite : un quiz d'hier est rendu exactement comme hier, colonne absente ou valeur inconnue comprises.

En mode `beats`, la page suit les quatre temps enseignés dans l'Atelier, et `lib/quiz/resultBeats.ts` décide seul quels blocs, dans quel ordre, avec quel titre :

| Temps | Champ | Ce qu'il fait |
|---|---|---|
| le miroir | `title` + `description` | il se reconnaît, donc il continue à lire |
| la cause | `insight` (+ `insight_heading`) | ce qui bloque vraiment, souvent autre chose que ce qu'il croyait |
| le chemin | `projection` (+ `projection_heading`) | les étapes, il voit que c'est faisable |
| le pont | `bridge` (+ `bridge_heading`) | l'offre comme suite logique, pas comme une pub |

Le vocabulaire de la méthode ne sort JAMAIS côté visiteur : il vit dans l'aide de l'éditeur et dans le prompt, sinon le visiteur lit le squelette au lieu du message. Les trois premiers temps sont masquables (`show_result_insight`, `show_result_projection`, `show_result_bridge`), et `beatShown()` est la seule fonction qui en décide, pour le viewer comme pour l'aperçu.

**Aucune décoration qui prenne de la place horizontale** sur ces blocs : ni `pl-*`, ni `px-*`, ni `border-l-*`, ni `mx-*`. Une décoration à gauche déplace forcément ce qu'elle décore, et `tests/visual/result-beats-bounds.spec.ts` mesure les bords gauches et exige qu'ils soient identiques à 1 px près.

`quiz_results.beat_media` (JSONB, sanitizé par `sanitizeBeatMedia`) porte une image par temps, avec `mode: "with" | "only"` ("only" = l'image remplace le texte).

**La taille du corps de texte de la page de résultat vit dans UNE constante**, `RESULT_BODY_CLASS` (`text-base`, soit 16 px), lue par le viewer ET par les quatre champs de l'éditeur. Avant, le pitch valait 16 px chez le visiteur et 18 px dans l'éditeur, les deux cartes du milieu 14 px des deux côtés, et le pont 16 contre 14 : la créatrice réglait sa page sur un aperçu qui mentait, puis reprenait tout à la main. Une taille choisie à la main dans un champ passe devant (l'enveloppe `.rt-field-fs` porte `!important`), donc changer ce défaut ne touche que les champs jamais réglés.

---

## 4. Quiz public (`/q/[quizId|slug]`)

Résolution de l'URL par UUID direct ou par slug personnalisé (validation case-insensitive ; un slug ressemblant à un UUID est refusé pour ne pas masquer le fallback direct). Sur domaine personnalisé, l'URL perd le préfixe `/q/`.

### 4.1. Parcours visiteur

1. **Intro** : titre, introduction rich-text, bouton de démarrage (`start_button_text`). Disposition en carte ou en couverture plein écran (`intro_layout`).
2. **Questions** : navigation multi-étapes avec barre de progression, transitions directionnelles, navigation au clavier (flèches) et par swipe sur mobile.
3. **Capture** : heading et sous-titre personnalisés, email plus champs optionnels activés, consentement (`privacy_url` + `consent_text`, case optionnelle). Placement avant ou après les questions (`capture_before_questions`).
4. **Bonus de partage** (si `virality_enabled` et bonus renseigné) : étape intermédiaire avant les résultats, avec anti-triche (cf. §6.3), visuel du bonus, boutons des réseaux sélectionnés, option « Continuer sans bonus ».
5. **Résultat** : titre, description, insight, projection (headings personnalisables), CTA spécifique du résultat ou CTA par défaut du quiz. En mode scoré avec jauge activée : grande jauge du score global (pourcentage ou libellé) aux couleurs de marque, et carte des barres par axe quand des axes existent. Carte de résultat partageable générée côté client (`lib/resultCard.ts`) et confettis (`lib/celebrate.ts`). Bouton « Recommencer ».
6. **Footer** : logo de marque (ou Tiquiz par défaut), footer personnalisé sur les plans payants (lien propre en remplacement du "offert par Tiquiz", ou masquage complet via `hide_branding`).

Un quiz peut être **fermé** par le créateur (`close_enabled`) : à la fermeture, les visiteurs sont soit redirigés vers une URL, soit accueillis par un message avec CTA personnalisé (`close_action` = `redirect` ou `message`).

### 4.2. Présentation

- **Fond** : uni, dégradé (`background_gradient`, 8 dégradés fermés) ou image plein cadre (`background_image_url`), avec surface de lecture translucide au-dessus de l'image.
- **Thème** : 9 thèmes prêts à l'emploi mémorisés (`theme_id`), ou réglages manuels (dont palette générée depuis une couleur de marque).
- **Dispositions** : accueil en carte ou couverture (`intro_layout`), questions centrées / à gauche / en deux colonnes (`question_layout`), réponses auto / grille / liste (`answer_layout`), panneau latéral à motifs (`panel_media`, `split_side`, largeur réglable `panel_media.width` 20-60 %, défauts historiques 40 % / 44 % selon le breakpoint).
- **Boutons** : forme pill, arrondie ou carrée (`button_shape`).
- **Responsive** : parcours centré verticalement et lisible sur tous les écrans (mobile, 16:9, écrans hauts), champs de capture à fort contraste sur n'importe quel fond.
- **Branding runtime** : injection dynamique de la Google Font choisie, application des couleurs de marque et bascule automatique du texte clair/sombre selon la luminance du fond.

Toutes les colonnes de présentation sont nullable sans défaut : un quiz qui n'a rien changé est rendu exactement comme le comportement historique.

### 4.3. Tracking public

La fonction `increment_quiz_counter(quiz_id, counter_name)` incrémente les compteurs `views`, `starts`, `completions`, `shares`. Le funnel détaillé (vue et réponse par question) est enregistré via `quiz_question_events` et la fondation `quiz_events`. L'endpoint `/api/quiz/[quizId]/track` accepte les événements de funnel et de question. Les endpoints de tracking répondent toujours en 200 (soft fail via `{ ok: false, reason }`).

---

## 5. Intégration Systeme.io

### 5.1. Clés API utilisateur

Chaque utilisateur configure une ou plusieurs clés API Systeme.io (`sio_api_keys`, scopées par projet). La feature est non bloquante : sans clé, les fonctions Systeme.io se dégradent proprement. Le nombre de clés autorisé dépend du plan (une seule pour free / mensuel / annuel, plusieurs pour les paliers premium).

### 5.2. Auto-tagging à la soumission d'un lead

`POST /api/quiz/[quizId]/public` effectue en fire-and-forget :

1. Trouve ou crée le contact Systeme.io par email (enrichit prénom, nom, téléphone, pays si fournis).
2. Applique le **tag capture** (`quizzes.sio_capture_tag`), tous résultats confondus.
3. Applique le ou les **tags résultat** (`quiz_results.sio_tag_names`, tableau ; fallback sur `sio_tag_name`).
4. Applique les **answer tags** : chaque option répondue peut porter son propre `sio_tag_name`.
5. Met à jour le champ personnalisé `tiquiz_result` avec le titre du résultat.
6. Optionnellement inscrit dans une formation (`sio_course_id`) et ajoute à une communauté (`sio_community_id`).
7. Quiz scoré avec l'option activée (`quizzes.sio_score_tags`) : applique les **tags de tranche** `score-<tranche>` (bas / moyen / élevé global) et `<axe>-<tranche>` par axe, dérivés du snapshot de scores du lead. Pas de champs personnalisés Systeme.io pour le score : les tags par tranche suffisent à segmenter les emails.

La distribution des leads par résultat suit une règle unique et stricte : la source de vérité est l'état courant de `quiz_results` (les profils actuels, y compris ceux à zéro lead), chaque lead est rattaché au titre live via `result_id` ou via le snapshot `result_title` s'il existe encore, sinon exclu silencieusement ; le dénominateur des pourcentages est le total des leads rattachés. Endroits concernés : `app/api/quiz/[quizId]/analytics/route.ts` et `components/quiz/QuizResultsAnalytics.tsx`.

### 5.3. Share tag

`PATCH /api/quiz/[quizId]/public` applique `quizzes.sio_share_tag_name` quand un partage est validé (anti-triche passé), marque le lead `has_shared = true` et `bonus_unlocked = true`, et incrémente `shares_count`.

### 5.4. Webhooks entrants

**Webhook ventes** (`/api/systeme-io/webhook`) :

- Événements `NEW_SALE` (alias `ORDER_NEW`) et `SALE_CANCELED`.
- `NEW_SALE` : inférence du plan via `lib/sio/webhookInference.ts` (URL d'abord, `offer-price-id` en fallback), création du compte Supabase si nouveau et envoi du magic link, upsert du plan, auto-annulation des anciens abonnements Systeme.io du même utilisateur, pose de `profiles.expected_sio_cancel_until = NOW() + 24h`.
- `SALE_CANCELED` : ignoré tant que `expected_sio_cancel_until` est dans le futur (annulation attendue après un changement de plan), sinon downgrade selon les règles (jamais de downgrade d'un plan lifetime).
- Authentification : secret en query string, plus vérification HMAC-SHA256 optionnelle (`lib/sioWebhookSig.ts`, activée dès que `SYSTEME_IO_WEBHOOK_SIGNING_SECRET` est configuré).
- L'inférence est un module pur, testable sans toucher la base. Un endpoint admin `POST /api/admin/webhook-dry-run` rejoue un payload sans écrire en base.

**Webhook optin gratuit** (`/api/systeme-io/free-optin`) : crée un compte en plan free et envoie le magic link ; ne downgrade jamais un utilisateur payant.

### 5.5. Client API

`lib/systemeIoClient.ts` et `lib/sio/userApiClient.ts` fournissent le client générique : gestion des tags, contacts, formations, communautés, avec retry (gestion des 422 en race condition) et rate limiting. Endpoints d'assistance à la configuration : `/api/systeme-io/tags`, `/api/systeme-io/courses`, `/api/systeme-io/communities` (pickers dans l'éditeur).

---

## 6. Capture, viralité et sécurité des leads

### 6.1. Capture configurable

Champs : email (obligatoire), prénom, nom, téléphone, pays (activables). Le placement peut se faire avant ou après les questions. Le libellé du bouton de soumission est personnalisable.

### 6.2. Étape bonus de partage

Étape intermédiaire entre capture et résultats, activée par `virality_enabled` et un bonus renseigné. Elle propose un visuel (image, mockup ou GIF), un message de partage, les réseaux sélectionnés (Facebook, X, LinkedIn, WhatsApp, Telegram, email, copie de lien) et une option pour continuer sans bonus.

### 6.3. Anti-triche

- Mobile : `navigator.share()` natif (ne résout qu'en cas de partage réel).
- Desktop : `window.open()` plus polling de `popup.closed` avec durée minimale d'ouverture.
- Popup bloqué : fallback via `document.visibilitychange` avec la même durée.
- Copie de lien : durée minimale plus bouton de confirmation manuelle.

Le déverrouillage applique le share tag et incrémente le compteur de partages.

### 6.4. Sécurité des leads (trois couches)

Aucun lead ne peut disparaître lors d'un re-shuffle des résultats :

1. FK `quiz_leads.result_id` en `ON DELETE SET NULL` (couche base).
2. Snapshot du `result_title` dans la ligne lead avant DELETE des résultats (couche application).
3. NULL-out explicite du `result_id` avant DELETE (couche défense).

---

## 7. Module Popquiz

Vidéo avec quiz interactifs incrustés à des timestamps précis.

- **Source vidéo** : URL YouTube ou Vimeo, ou upload propre.
- **Upload** : pipeline TUS resumable auto-hébergé, limite 20 Go par vidéo. Lecture protégée par URL signée.
- **Cuepoints** : placement d'un quiz du catalogue à un timestamp donné ; comportement bloquant (réponse obligatoire) ou optionnel.
- **Vignette** : automatique (extrait vidéo ou oEmbed) ou personnalisée avec recadrage 16/9.
- **Player** : contrôle de vitesse, saut avant / arrière, Picture-in-Picture, partage (Web Share API avec fallback copie de lien), poster HD.
- **Embed** : snippet iframe `/embed/p/[id]` à coller sur n'importe quel site (WordPress, Systeme.io, etc.).
- **Auto-activation** : à la publication d'un popquiz, les quiz référencés par ses cues encore en brouillon sont automatiquement activés, garantissant un popquiz jouable de bout en bout. Un cue ne peut pointer que sur un quiz appartenant au créateur.
- **Branding** hérité du profil créateur.

Routes principales : `/api/popquiz` (liste, création), `/api/popquiz/[id]` (détail, PATCH avec auto-activation), `/api/popquiz/[id]/autosave`, `/api/popquiz/[id]/thumbnail`, `/api/popquiz/upload-token`, `/api/popquiz/playback-url`.

---

## 8. Sondage et analyse

Le mode sondage réutilise le moteur quiz mais agrège les réponses brutes au lieu de calculer un résultat. Il supporte tous les types de questions (§3.1) et se termine sur un écran de remerciement (`survey_thanks_*`). La capture peut être placée avant les questions ou désactivée (réponses anonymes). La génération IA de sondage propose 8 objectifs adossés à des méthodologies réelles : NPS, CSAT, étude d'audience, feedback, CES, post-événement, découverte, qualification de lead. Un rapport PDF des réponses est exportable.

- **Résultats du sondage** : `/api/quiz/[quizId]/survey-results` et `SurveyResultsPanel`, `SurveyResponsesTable`, `SurveyTrends`.
- **Agrégation des réponses** : `/api/quiz/[quizId]/aggregate-responses`.
- **Analyse IA** (feature premium) : `/api/quiz/[quizId]/survey-analysis` synthétise les réponses agrégées avec Claude (`lib/survey/analysis.ts`), fait ressortir patterns et segments. Le helper de gate est `canUseAIAnalysis` (couvre quiz et sondage).
- **Modération** : marquage d'un lead ou d'une réponse (`survey-flag`).

---

## 9. Analytics et insights

- **Analytics par quiz** (`/quiz/[quizId]/analytics`, `/api/quiz/[quizId]/analytics`) : cartes visiteurs / leads / taux de capture / export, courbe d'évolution, distribution des résultats (donut selon la règle §5.2), funnel par question (drop-off). Les compteurs de vues et de complétions sont recomptés directement depuis `quiz_events`, avec un garde-fou `viewsCount = max(events.view, leadsCount)` pour éviter des ratios supérieurs à 100 %.
- **Statistiques agrégées** (`/stats`, `/api/stats`) : funnel global, conversion par contenu, agrégats calculés via RPC dédiées.
- **Insights** (`/api/insights/global`, `/api/quiz/[quizId]/insights`, `lib/insights/`) : lecture agrégée et insights IA.
- **Mes leads** (`/leads`) : vue de tous les leads, colonnes complètes (email, identité, résultat, quiz source, date, statut share et bonus), cartes KPI cliquables (Non synchronisés, Synchronisés, Ce mois, Total) qui filtrent la liste, resync manuelle vers Systeme.io.

---

## 10. Multiprofils (projets)

### 10.1. Modèle de données

Table `projects` (au moins un projet par utilisateur) : `id`, `user_id`, `name`, `is_default` (index unique partiel : un seul défaut par utilisateur), `accent_color`, `icon_emoji`, `use_branding_logo`, `created_at`.

Colonne `project_id UUID NULL` (FK `ON DELETE SET NULL`) sur `quizzes`, `popquizzes`, `business_events`, `user_milestones` : les contenus publiés survivent à la suppression d'un projet (ils repassent au projet par défaut sans casser leur URL).

`business_profiles` est unique par `(user_id, project_id)` et porte le branding (logo, couleurs, police, site, palettes sauvegardées), le positionnement (ton de marque, audience cible), les défauts pixel (Meta, GA4, Google Ads, Meta CAPI) et le partage (domaine par défaut, nom du site OG).

`sio_api_keys` porte `project_id`, une contrainte `UNIQUE(user_id, project_id, name)` et un index partiel garantissant une clé par défaut par `(user, projet)`.

### 10.2. Sémantique

Un nouveau projet démarre vide : stats à zéro, branding vierge, pas d'héritage des réglages des autres projets. En viewer public, un filet de sécurité (`mergeOwnerBranding`) applique les valeurs non-nulles du profil par défaut pour qu'un contenu en ligne ne perde jamais son branding visuellement.

### 10.3. Session et UI

Cookie `tiquiz_active_project` (lecture client autorisée). Un `SessionResetGate` repositionne sur le projet par défaut au début de chaque session navigateur. UI : `ProjectSwitcher` dans le header (identité visuelle couleur + emoji), badge et éditeur d'identité, danger-zone de suppression avec recopie obligatoire du nom.

### 10.4. Gate plan et helpers

`lib/projects/scopeFilter.ts` : `getActiveProjectScope(userId, email)` renvoie le projet actif seulement si le plan le permet (`canUseMultiProjects`). Les plans non premium conservent le comportement mono-projet (rétrocompatibilité totale). Autres helpers dans `lib/projects/` : `activeProject`, `ensureDefaultProject`, `upsertByProject`, `visualIdentity` (10 couleurs, 20 emojis), `businessProfile`, `queries`, `client`.

### 10.5. API

| Route | Méthode | Description |
|:------|:--------|:------------|
| `/api/projects` | GET / POST | Liste / crée un projet |
| `/api/projects/[projectId]` | PATCH / DELETE | Renomme et change l'identité / supprime |
| `/api/projects/active` | GET / POST | Lit / change le projet actif |

---

## 11. Domaines personnalisés

Un créateur payant connecte son propre hostname (par exemple `quiz.ma-marque.com`) à Tiquiz.

- Table `custom_domains` : hostname unique global, RLS user-bound plus lecture publique des domaines vérifiés.
- Onglet Paramètres dédié : détection automatique du registrar (Cloudflare, OVH, Gandi, GoDaddy, Namecheap, Route 53, IONOS, Hetzner, Scaleway, Porkbun, Hostinger, etc.) avec instructions adaptées, pose d'un CNAME vers la cible de connexion, auto-poll de vérification DNS, émission du certificat TLS en on-demand.
- **URLs propres** : sur un domaine perso, les liens publics perdent le préfixe (`mondomaine.com/mon-slug`). Un catch-all `app/[publicSlug]/page.tsx` résout le contenu (quiz actif ou popquiz publié) filtré par le propriétaire du hostname. Les anciennes URLs `/q/...` et `/p/...` restent fonctionnelles.
- **Ownership cross-tenant** : sur domaine perso, un check garantit que le contenu servi appartient bien au propriétaire du hostname.
- **Validation slug** : refus des slugs réservés (`api`, `embed`, `dashboard`, etc.) et unicité cross-type (un slug ne peut exister que sur un quiz ou un popquiz, pas les deux, pour un même utilisateur).
- Favicon personnalisable par domaine.

Routes : `/api/custom-domain` (liste, création), `/api/custom-domain/[id]` (détail, suppression), `/api/custom-domain/[id]/verify`, `/api/custom-domain/detect-ns`. Le sélecteur de domaine de partage (`useShareDomain`, `ShareDomainPicker`) et la préférence par défaut (`/api/profile/share-domain`, `profiles.default_share_domain`) sont disponibles dans les éditeurs.

---

## 12. Pixels de tracking

Chaque contenu peut porter des identifiants pixel, avec fallback sur les défauts du profil créateur (`lib/effectivePixels.ts`) : Meta Pixel, GA4, Google Ads. Le côté serveur peut aussi envoyer des conversions Meta via CAPI (`lib/metaCapi.ts`, token `default_meta_capi_token`). Le composant `components/tracking/TrackingPixels.tsx` injecte les pixels sur la page publique. Le fallback render-time garantit qu'un pixel posé dans les réglages s'applique partout sauf override explicite par contenu.

---

## 13. Studio visuel

Génération assistée d'assets de promotion (`components/visual-studio/`, `lib/visualStudio/`, `/api/visual-studio/*`) :

- Génération d'images de fond par IA (`generate-background`, modèle image OpenAI).
- Génération de textes courts (`generate-copy`).
- Styles et presets (formats 1:1, 4:5, 9:16, 16:9 ; polices d'affichage), canvas d'édition, export PDF, brand kit, vote sur les styles.

---

## 14. Templates, onboarding et gamification

### 14.1. Catalogue de templates

`lib/templates/catalog.ts` : 15 modèles métier prêts à publier, format constant 6 questions de 4 options et 4 résultats, ton chaleureux, tutoiement, pas de jargon.

| Slug | Thème |
|:---|:---|
| croyance-limitante | mindset |
| rapport-nourriture | nutrition |
| fuites-energie | sommeil et énergie |
| style-parental | parentalité |
| schema-amoureux | couple |
| blocage-reconversion | reconversion |
| rapport-argent | finance |
| profil-entrepreneur | entrepreneuriat |
| moteur-interieur | motivation |
| style-yoga | yoga |
| terrain-naturo | naturopathie |
| pret-a-lancer-formation | formation |
| levier-croissance-marketing | marketing |
| style-photo | photographie |
| pret-premier-achat-immo | immobilier |

### 14.2. Onboarding post-signup

`components/dashboard/FirstQuizOnboarding.tsx` s'affiche quand l'utilisateur n'a aucun quiz : 6 templates phares en cartes, un clic crée le quiz et redirige vers l'éditeur. Fallbacks vers le catalogue complet ou la création à partir de zéro.

### 14.3. Gamification

- **Jalons** (`lib/milestones/`) : premier quiz publié, premier lead, paliers de leads captés, complétions, etc. Toasts de jalon (`MilestoneToastListener`) et suivi vu / non-vu (`/api/milestones/seen`, `/unseen`).
- **Mur des réussites** (`WallOfWins`, `/api/dashboard/wall-of-wins`).
- **Objectif hebdomadaire** (`lib/weekly-goal.ts`), **achievements** (`lib/achievements.ts`, `SettingsAchievements`).
- **Confettis** zero-dépendance (`lib/celebrate.ts`) déclenchés sur les moments clés.

---

## 15. Programme revendeur

Modèle de revente en gros récurrente (pas d'affiliation) : une org revendeur chapeaute des sous-comptes Tiquiz normaux, chacun connectant son propre Systeme.io.

- **Espace revendeur** (`/reseller`, `components/reseller/`) : créer un accès client (choix du plan et du cycle), suspendre ou réactiver, lister les comptes avec statut et activité, compteur live de comptes actifs, palier de reversement courant, estimation de facture du mois, compteur d'usage IA par compte.
- **Barème whole-volume** : le taux de reversement dépend du nombre total de comptes actifs et s'applique à tous les comptes.
- **Facturation** : cron mensuel qui compte les actifs, applique le taux courant au prix réel de chaque compte et génère la facture B2B (`/api/cron/reseller-invoices`, `/api/reseller/billing`).
- **Paiements** : le revendeur connecte ses propres clés de paiement (Stripe, PayPal) chiffrées at rest (AES-256-GCM, `lib/secretsCrypto.ts`), avec webhooks de paiement dédiés et journal d'événements.
- **Provisioning** : `lib/resellerProvisioning.ts`, jointure partenaire (`/api/partner/*`, `/connect/formaquiz`), octroi d'essai premium (`grant-plus-trial`).

Routes revendeur : `/api/reseller/me`, `/clients`, `/client/change-plan`, `/settings`, `/payment-keys`, `/payment-events`, `/billing`. Routes admin associées : `/api/admin/resellers`, `/reseller-invoices`, `/reseller-payment-events`.

---

## 16. Monétisation

### 16.1. Plans

Valeur `profiles.plan` dans `{ free, monthly, yearly, monthly_plus, yearly_plus, lifetime, beta }` (CHECK constraint étendu par migration).

| Plan | Prix | Quiz / sondage / popquiz | Réponses visibles | Clés Systeme.io | Multiprofils | Analyse IA |
|:-----|:-----|:--------------------------|:------------------|:---------|:-------------|:-----------|
| `free` | 0 € | 1 chaque | 10 / mois (reset glissant 30 j) | 1 | non | non |
| `monthly` | 17 €/mois | illimité | illimité | 1 | non | non |
| `yearly` | 170 €/an | illimité | illimité | 1 | non | non |
| `monthly_plus` | 29 €/mois | illimité | illimité | plusieurs | oui | oui |
| `yearly_plus` | 290 €/an | illimité | illimité | plusieurs | oui | oui |
| `lifetime` | 57 € | illimité | illimité | plusieurs | oui | oui |
| `beta` | accordé manuellement | illimité | illimité | plusieurs | oui | oui |

Le plan lifetime n'est plus proposé à la vente directe ; il reste équivalent aux paliers premium pour les comptes qui le détiennent. Le plan beta est accordé manuellement.

### 16.2. Source de vérité (code)

`lib/planLimits.ts` :

- `PRICING_PLUS` : prix affichables des paliers premium (`29 €/mois`, `290 €/an`).
- `FREE_LIMITS` : 1 quiz et 1 sondage actifs, 1 popquiz, 10 leads visibles par fenêtre glissante de 30 jours.
- `isPremiumPlan(plan)` : vrai pour `beta`, `lifetime`, `monthly_plus`, `yearly_plus`.
- `canUseMultiProjects(plan)`, `canUseAIAnalysis(plan)`, `canConnectMultipleSioKeys(plan)` : équivalents à `isPremiumPlan`, avec allowlist env optionnelle pour tests ciblés.
- `shouldShowPlusUpsell(plan)` : vrai pour `monthly` et `yearly` (affichage du CTA de montée en gamme).
- `isPaidPlan(plan)` : vrai pour tout ce qui n'est pas `free` (permissif par design pour ne jamais verrouiller un payant par accident).
- `canUseSurveyAI` : alias rétrocompatible de `canUseAIAnalysis`.

Le quota free : les leads continuent d'être captés au-delà de la limite mais seule la portion visible est débloquée ; le reste reste flouté jusqu'à la montée en gamme.

### 16.3. Où l'argent rentre

Deux chemins coexistent, et ils ne se confondent jamais.

| | Notre bon de commande | Systeme.io |
|:---|:---|:---|
| adresse | `tiquiz.fr/commande/<produit>` | `tipote.fr/tiquiz-*` |
| encaissement | Stripe (carte) ou PayPal (abonnement) | eux |
| ce qui ouvre le plan | notre webhook, sur le catalogue | leur webhook, par inférence |
| facture | Stripe l'émet ; pour PayPal c'est NOUS (série `TQ-`) | eux |
| commission affiliée | `?ref=` -> Tipote | `?sa=` -> Tipote |

**Le plan vient du CATALOGUE** (`lib/checkout/catalog.ts`), jamais d'une
devinette : c'est toute la différence avec le routage Systeme.io, qui
reçoit un paiement qu'il n'a pas déclenché et doit deviner le palier.

**Inférence Systeme.io**, dans cet ordre : l'`offer-price-id`, puis
l'URL (optins uniquement, une vente n'en porte AUCUNE), puis le MONTANT
en correspondance exacte, puis le palier de base. Une vente confirmée
ouvre TOUJOURS quelque chose : "il a payé le client, il doit recevoir
ses accès, point barre" (Béné, 7 août).

| URL Systeme.io | Plan cible |
|:---|:---|
| `tipote.fr/tiquiz-gratuit` | `free` |
| `tipote.fr/tiquiz-mensuel` | `monthly` |
| `tipote.fr/tiquiz-annuel` | `yearly` |
| `tipote.fr/tiquiz-mensuel-plus` | `monthly_plus` |
| `tipote.fr/tiquiz-annuel-plus` | `yearly_plus` |

### 16.4. Les webhooks de paiement, et leurs quatre garanties

`/api/commande/webhook` (Stripe) et `/api/commande/paypal/webhook`
(PayPal) partagent les mêmes garanties, chacune avec un incident
derrière elle :

1. **la signature**, vérifiée sur le corps BRUT avant tout parsing.
   PayPal ne signe pas avec un secret partagé : on lui REDEMANDE s'il a
   émis l'événement (`PAYPAL_WEBHOOK_ID_OWNER` obligatoire) ;
2. **le verrou d'idempotence**, `(source, event_id)` limité aux statuts
   `processing` / `processed`. Une ligne `error` en SORT, donc un
   réessai peut reprendre : sans ça, une vente dont le premier
   traitement ratait n'ouvrait JAMAIS l'accès ;
3. **on relit la vente chez le fournisseur** : la signature prouve
   l'expéditeur, pas la fraîcheur de l'objet ;
4. **le marquage à toutes les sorties**, exception comprise.

**Ce qui coupe l'accès et ce qui ne le coupe pas :**

| Événement | Effet |
|:---|:---|
| `checkout.session.completed`, `BILLING.SUBSCRIPTION.ACTIVATED` | ouvre le plan |
| `customer.subscription.deleted`, `CANCELLED`, `EXPIRED` | ferme |
| `charge.refunded` TOTAL, `PAYMENT.SALE.REFUNDED` | ferme, arrête l'abonnement, annule la commission |
| `charge.dispute.funds_withdrawn` | ferme, comme un remboursement |
| `charge.dispute.created` | **ne ferme RIEN**, journalisé fort |
| `invoice.payment_failed`, `SUSPENDED` | **ne ferme RIEN** |
| remboursement PARTIEL | **ne ferme RIEN** |

Un geste commercial de 5 € sur un abonnement à 17 € mettrait dehors
quelqu'un qui a payé 12 € pour rester dedans. Une contestation se
conteste : couper l'accès de quelqu'un qui va gagner son litige nous
ferait perdre un client pour rien.

**Rembourser n'est pas annuler** :

| Geste | L'argent | L'accès | L'abonnement |
|:---|:---|:---|:---|
| annuler | reste encaissé | jusqu'à la fin de la période PAYÉE | s'arrête en fin de période |
| rembourser | repart | fermé tout de suite | s'arrête `immediat` |

`lib/checkout/cancelSubscriptions.ts` décide pour les DEUX boutons (le
sien dans les réglages, celui de l'admin sur la fiche client), et
regarde les DEUX fournisseurs : une même personne peut avoir un
abonnement Systeme.io et un abonnement Stripe.

### 16.5. Monter de palier, et pourquoi on ne descend pas

Le SENS du changement se lit sur DEUX axes, jamais sur le prix : le
niveau (base / Plus) et la facturation (mois / année). L'annuel coûte
170 € d'un coup mais revient moins cher au mois, donc un classement par
prix rangerait "mensuel -> annuel" dans les descentes.

- monter de niveau -> MONTÉE ;
- à niveau égal, mois -> année -> MONTÉE ;
- tout le reste -> DESCENTE, **refusée avec sa raison**. L'appliquer
  tout de suite retirerait des fonctionnalités déjà payées. La sortie
  honnête existe : arrêter l'abonnement (l'accès tient jusqu'à la date
  payée) et reprendre le palier voulu.

**Stripe : prorata.** `GET /api/billing/change-plan?produit=` demande à
Stripe la facture qu'il émettrait (`/v1/invoices/create_preview`). Le
montant vient de LUI, jamais d'une soustraction faite par nous, et le
GET ne facture rien (un préchargement de navigateur fait des GET).

**PayPal : abonnement neuf.** Il n'a pas d'équivalent du prorata. On
ouvre le nouveau, et on arrête l'ancien **une fois le nouveau ACTIVÉ** :
arrêter d'abord laisserait sans rien quelqu'un qui n'irait pas au bout
de l'accord PayPal.

Le plan s'ouvre par le WEBHOOK, jamais par la route
(`ouvertureDemandee()`), et rend `null` dès que rien n'a bougé : Stripe
envoie `customer.subscription.updated` pour à peu près tout.

### 16.6. Le mois offert

30 jours, ouverts **uniquement** sur un lien portant `?ref=` (nos liens
actuels). Un `?sa=` vient d'un ancien tunnel Systeme.io : il
commissionne comme avant, il n'ouvre pas le cadeau. Le nom du paramètre
dit à lui seul la génération du lien, donc aucun marqueur à maintenir.

C'est l'ESSAI GRATUIT DU FOURNISSEUR sur le palier choisi
(`trial_period_days` chez Stripe, un cycle `TRIAL` chez PayPal), pas un
palier prêté : il ne réécrit jamais `plan` ni `affiliate_trial_*`.

**Un seul par personne** (`free_month_granted_at`, jamais effacé).
Auto-affiliation REFUSÉE, alias Gmail compris. Même IP : on ACCORDE et
on SIGNALE (une IP partagée, c'est aussi un couple ou deux collègues).
Il se consomme à l'ACHAT, jamais au bon de commande.

### 16.7. Les factures clients

**On n'émet QUE pour PayPal** (série `TQ-<année>-NNNN`) : Stripe émet
les siennes, et émettre des deux côtés donnerait deux factures et deux
numérotations pour une seule vente. L'écran client le DIT au lieu
d'afficher une liste incomplète.

Deux tables, et la différence est la clé de tout :

| | Ce que c'est | Qui l'écrit |
|:---|:---|:---|
| `facturation_clients` | les infos ACTUELLES, pour les factures À VENIR | le client, Béné, le bon de commande, Stripe |
| `factures` | ce qui a été émis, FIGÉ, identité RECOPIÉE dedans | `emettre_facture()`, personne d'autre |

Une facture émise ne se modifie pas : c'est la loi. Une erreur se
corrige par un AVOIR suivi d'une nouvelle facture.

**Numérotation continue** : un compteur, jamais une séquence Postgres
(une séquence saute des numéros dès qu'une transaction est annulée, et
un trou est exactement ce qu'un contrôle cherche). La fonction alloue le
numéro ET insère dans la MÊME transaction, et ne lève jamais sur un
doublon : elle rend la pièce déjà émise.

**Quatre régimes de TVA** (`resoudreTva()`) : France 20 %,
autoliquidation UE avec numéro valide, guichet unique OSS sans numéro,
hors champ hors UE. **Le piège : une entreprise FRANÇAISE avec un numéro
de TVA paie quand même** ; l'autoliquidation n'existe pas entre deux
entreprises du même pays.

On émet TOUJOURS : adresse absente ou pays inconnu donnent une facture
au taux français, avec `a_completer` qui porte ce qui manque.

### 16.8. Quota et RPC

`increment_response_count(user_id)` incrémente le compteur et vérifie la limite ; `reset_monthly_responses(user_id)` réinitialise ; auto-reset après 30 jours via `responses_reset_at`. La création de quiz au-delà du quota free est refusée côté API.

---

## 17. Internationalisation

### 17.1. Architecture

- Bibliothèque `next-intl` (server et client), configuration dans `i18n/`.
- Locale stockée dans le cookie `ui_locale`, posé par le middleware au premier passage, fallback sur l'entête Accept-Language.
- Support RTL pour l'arabe.

### 17.2. UI admin (7 locales)

`SUPPORTED_LOCALES` : `en`, `fr`, `es`, `it`, `ar`, `pt`, `pt-BR`. Locale par défaut : `en`. RTL : `ar`. Fichiers dans `messages/`.

### 17.3. Quiz public

Les textes du parcours public sont gérés hors `next-intl` dans `PublicQuizClient.tsx`, en plusieurs variantes dont les formes tu et vous du français (colonne `quizzes.address_form`, avec fallback sur la préférence profil) et l'arabe RTL.

---

## 18. Architecture technique

### 18.1. Stack

| Composant | Technologie |
|:----------|:-----------|
| Framework | Next.js (App Router) |
| UI | React + shadcn/ui (Radix) |
| Styling | TailwindCSS |
| State | Zustand |
| Formulaires | React Hook Form + Zod |
| Backend | API Routes Next.js |
| Base de données | Supabase (PostgreSQL, RLS) |
| Auth | Supabase Auth (PKCE + cookies) |
| IA texte | Anthropic Claude (Opus / Sonnet / Haiku selon l'usage) |
| IA image | OpenAI (génération d'images) |
| i18n | next-intl |
| Icons | lucide-react |
| Notifications | sonner (toast) |
| GIF | KLIPY |
| Vidéo | Serveur TUS auto-hébergé, lecture par URL signée |
| Encaissement | Stripe et PayPal sur NOTRE bon de commande (`tiquiz.fr/commande/...`) ; Systeme.io sur ses tunnels historiques ; Stripe et PayPal côté revendeur |
| CRM et emails | Systeme.io (API + webhooks). Les emails y restent, donc notre système doit continuer de leur parler |
| Hosting | VPS (Ubuntu) |
| Process manager | PM2 |
| Reverse proxy | Caddy / Nginx (on-demand TLS pour les domaines perso) |
| DNS / CDN | Cloudflare |
| Domaine | quiz.tipote.com |

### 18.2. Appels IA

Tous les appels Claude passent par `lib/claudeRequest.ts:buildClaudeMessageBody()` (source unique). Le helper omet les paramètres de sampling (`temperature`, `top_p`, `top_k`) quand le modèle cible ne les accepte pas, et les passe normalement sinon. La résolution du modèle est centralisée dans `lib/anthropicModel.ts`. Les sorties IA sont nettoyées par `lib/aiTextSanitizer.ts`, avec un rate limiting applicatif (`lib/aiRateLimit.ts`).

Répartition indicative des modèles : génération de quiz sur le tier Opus, réécriture / brainstorm / génération embarquée sur Haiku, rééquilibrage sur Sonnet, analyse de sondage sur Opus, génération d'images sur le modèle image OpenAI.

### 18.3. Tables principales

**profiles** : `user_id`, `email`, `full_name`, `first_name`, `last_name`, `ui_locale`, `address_form`, `privacy_url`, clés Systeme.io, `plan`, `product_id`, `sio_contact_id`, `responses_used_this_month`, `responses_reset_at`, branding par défaut (`brand_font`, `brand_color_primary`, `brand_logo_url`, favicon), défauts pixel, `default_share_domain`, `share_site_name`, `expected_sio_cancel_until`, drapeaux d'essai et de notifications.

**Multiprofils** : `projects`, `business_profiles` (unique par user et projet), `sio_api_keys` (scopées projet), colonne `project_id` sur `quizzes`, `popquizzes`, `business_events`, `user_milestones`.

**quizzes** : identité (`user_id`, `title`, `slug`, `introduction`, `locale`, `address_form`, `status`, `mode`), capture (`capture_enabled`, `capture_heading`, `capture_subtitle`, champs, `capture_submit_text`, `capture_before_questions`), parcours (`start_button_text`), CTA par défaut, privacy et footer, viralité (`virality_enabled`, `bonus_description`, `bonus_heading` (titre de l'écran bonus, éditable, défaut localisé qui suit le tutoiement/vouvoiement), `bonus_image_url`, position d'image bonus, `bonus_intro_text`, `bonus_unlocked_message`, `share_message`, `share_networks`, `sio_share_tag_name`), Systeme.io (`sio_capture_tag`), SEO / OG (`og_image_url`, `og_description`, noindex), branding (`brand_font`, `brand_color_primary`, `brand_color_background`, `brand_color_text`, override logo), présentation (`background_style`, `background_gradient`, `background_image_url`, `intro_layout`, `button_shape`, `theme_id`, image d'intro et largeur), fermeture (`close_enabled`, `close_action`, `close_redirect_url`, `close_message`, `close_cta_text`, `close_cta_url`), affichage (`show_other_results`, breakdown, masquage des compteurs), pixels, thanks de sondage, compteurs (`views_count`, `starts_count`, `completions_count`, `shares_count`).

**Colonnes scoring de `quizzes`** : `scoring_axes` (JSONB `[{ id, label }]`, id figé à la création), `show_score_gauge`, `score_display_mode` (`percent` / `label`), `score_labels` (3 libellés personnalisables), `sio_score_tags` (option tags par tranche).

**quiz_questions** : `quiz_id`, `question_text`, `question_type`, `config` (JSONB : `multi_select`, `maxLength`, `placeholder` (HTML riche de l'invite du texte libre), `axes` `{ axisId: poids }` en mode scoré), `options` (JSONB, `[{ text, result_index, points?, sio_tag_name?, image_url? }]`), `sort_order`.

**quiz_results** : `quiz_id`, `title`, `description`, `insight`, `projection`, headings personnalisés, `cta_text`, `cta_url`, `sio_tag_names` (tableau) et `sio_tag_name` (legacy), `sio_course_id`, `sio_community_id`, `min_score`, `max_score`, image et position, `sort_order`.

**quiz_leads** : `quiz_id`, `email`, identité, `result_id` (`ON DELETE SET NULL`), `result_title` (snapshot), `consent_given`, `has_shared`, `bonus_unlocked`, `answers` (JSONB), `scores` (JSONB, snapshot `{ global: { points, min, max }, axes: { <id>: { points, min, max } } }` figé à la capture, validé serveur, exporté dans le CSV des leads), `created_at`, unicité `(quiz_id, email)`.

**Autres** : `popquizzes` et cues, `quiz_events` et `quiz_question_events` (tracking), `custom_domains`, `webhook_logs`, tables revendeur (resellers, factures, événements de paiement, connexions partenaire), tables milestones et business events.

**Vente chez nous** : `facturation_clients` (les infos ACTUELLES du client, mises à jour par lui, par Béné, par le bon de commande et par Stripe), `factures` + `facture_compteurs` (ce qui a été ÉMIS, figé, série `TQ-`), `support_tickets` (la file unique des trois apps, cf. §19.3), `churn` (les départs consignés, avec le motif que Stripe donne gratuitement). `profiles` porte en plus `stripe_customer_id`, `paypal_subscription_id`, `free_month_granted_at` et `free_month_flag`.

**Storage** : bucket `public-assets` (lecture publique, écriture authentifiée sous le préfixe du user) pour logos, favicons, images OG, visuels de bonus, images d'intro et de résultat, fonds. Bucket vidéo dédié pour les popquiz (upload TUS).

**RPC** : `increment_quiz_counter`, `increment_response_count`, `reset_monthly_responses`, plus les RPC d'agrégats stats et analytics.

### 18.4. Routes API (extrait)

| Route | Méthode | Auth | Description |
|:------|:--------|:-----|:-----------|
| `/api/quiz` | GET / POST | oui | Liste / crée (vérifie quota free) |
| `/api/quiz/[quizId]` | GET / PATCH / DELETE | oui | Détail / mise à jour (sanitisation serveur, typo FR) / suppression |
| `/api/quiz/[quizId]/autosave` | POST | oui | Autosave éditeur |
| `/api/quiz/[quizId]/duplicate` | POST | oui | Duplication |
| `/api/quiz/[quizId]/partage` | GET / POST / PATCH | oui | Liens de partage d'un quiz (lister, créer, révoquer) |
| `/api/partage/[jeton]` | GET / POST | non / oui | Aperçu public d'un quiz partagé, puis installation dans le compte connecté |
| `/api/quiz/[quizId]/rewrite` | POST | oui | Réécriture IA d'un texte |
| `/api/quiz/[quizId]/rebalance` | POST | oui | Rééquilibrage IA des résultats |
| `/api/quiz/generate` | POST | oui | Génération IA (SSE) |
| `/api/quiz/idea-chat` | POST | oui | Brainstorm IA |
| `/api/quiz/import-extract` | POST | oui | Extraction texte d'un document |
| `/api/quiz/gender-variants` | POST | oui | Variantes grammaticales |
| `/api/quiz/[quizId]/public` | GET / POST / PATCH | non | Données publiques / soumission lead / share |
| `/api/quiz/[quizId]/track` | POST | non | Tracking funnel et question |
| `/api/quiz/[quizId]/analytics` | GET | oui | Funnel, drop-off, distribution |
| `/api/quiz/[quizId]/survey-results` | GET | oui | Résultats de sondage |
| `/api/quiz/[quizId]/survey-analysis` | POST | oui | Analyse IA de sondage (premium) |
| `/api/quiz/[quizId]/aggregate-responses` | GET | oui | Agrégation des réponses |
| `/api/quiz/[quizId]/sync-systeme` | POST | oui | Sync groupée des leads |
| `/api/popquiz`, `/api/popquiz/[id]`, ... | divers | oui | Popquiz (cf. §7) |
| `/api/embed/quiz/*` | divers | mixte | Génération et revendication de quiz anonyme |
| `/api/leads` | GET / POST | oui | Liste des leads / resync |
| `/api/profile` | GET / PATCH | oui | Profil |
| `/api/profile/share-domain` | GET / PATCH | oui | Domaine de partage par défaut |
| `/api/projects*` | divers | oui | Multiprofils (cf. §10.5) |
| `/api/custom-domain*` | divers | oui | Domaines personnalisés (cf. §11) |
| `/api/sio-api-keys*` | divers | oui | Clés Systeme.io |
| `/api/systeme-io/webhook` | POST | secret + HMAC | Webhook ventes |
| `/api/systeme-io/free-optin` | POST | secret | Webhook optin gratuit |
| `/api/systeme-io/tags`, `/courses`, `/communities` | GET | oui | Pickers Systeme.io |
| `/api/visual-studio/*` | divers | oui | Studio visuel |
| `/api/insights/*`, `/api/quiz/[id]/insights` | GET | oui | Insights |
| `/api/reseller/*`, `/api/partner/*` | divers | oui / token | Revendeur et partenaires |
| `/api/billing/*`, `/api/order/*`, `/api/payments/*` | divers | mixte | Abonnement, commandes, paiements |
| `/api/cron/*` | POST | secret cron | Tâches planifiées (essais, milestones, factures, réconciliation SIO) |
| `/api/admin/*` | divers | admin | Back-office et dry-run webhook |
| `/api/gifs/search` | GET | oui | Recherche GIF (KLIPY) |
| `/api/settings/ui-locale` | POST | oui | Change la langue UI |

---

## 19. Didacticiel et centre d'aide

### 19.1. Didacticiel interactif

Tour guidé en 7 étapes (plus welcome et completion), inspiré du système Tipote et adapté à Tiquiz. Architecture : `hooks/useTutorial.ts` (état Context + localStorage par user), `components/tutorial/` (WelcomeModal, TourCompleteModal, TutorialSpotlight, TutorialOverlay, HelpButton, TutorialNudge). Fenêtre de première visite de 7 jours, opt-out permanent possible, positionnement intelligent des tooltips, traduction complète via `next-intl` (namespace `tutorial`). Étapes (alignées sur la sidebar) : tableau de bord, créer un quiz, créer un sondage, mes projets, popquiz, prospects, statistiques. L'écran de fin pointe les prochaines étapes, dont la localisation des Paramètres (mot de passe, langue, clé Systeme.io : avatar en haut à droite).

La carte "Besoin d'un coup de main ?" de la sidebar est **fermable d'un clic** (croix, mémorisé par utilisateur) et vit dans la zone scrollable du menu, jamais dans le pied fixe : le menu garde toujours la priorité verticale. Quand la carte est fermée ou le guide désactivé, une entrée "Refaire le tour guidé" apparaît dans le pied de sidebar : le tour reste relançable en permanence.

### 19.2. Centre d'aide

Support mutualisé avec Tipote : le bouton Aide redirige vers le centre d'aide Tipote, section Tiquiz. Catégorie dédiée, articles multilingues, chatbot IA et système de tickets partagés. Un seul SAV pour les deux produits.

---

## 20. Sécurité

- Auth Supabase PKCE avec cookies httpOnly.
- RLS sur toutes les tables ; chaque utilisateur ne voit que ses données ; accès public restreint aux contenus actifs via API.
- Middleware de protection des routes authentifiées, fail-open sur erreur Supabase.
- Webhooks Systeme.io protégés par secret en query string plus vérification HMAC-SHA256 optionnelle.
- Secrets revendeur (clés de paiement) chiffrés at rest en AES-256-GCM.
- Validation Zod sur les formulaires.
- Ownership cross-tenant sur les domaines personnalisés et les cues de popquiz.
- Sécurité des leads en trois couches (cf. §6.4).
- `emailRedirectTo` dynamique via l'URL applicative.
- Webhooks de paiement : signature vérifiée sur le corps BRUT avant tout parsing, et verrou d'idempotence `(source, event_id)` limité aux statuts `processing` / `processed` (une ligne `error` en sort, donc un réessai peut reprendre).
- Toutes les portes partenaires comparent leur secret en temps constant (`safeEqual` / `timingSafeEqual`) : une comparaison naïve s'arrête au premier caractère différent, et son TEMPS raconte combien de caractères sont justes.
- Aucun lien envoyé par email ne vient d'une constante de build seule : `resolveAppUrl()` refuse toute adresse locale et retombe sur l'origine de la requête. Un `??` ne protège que de la variable ABSENTE, jamais de la variable FAUSSE.
- Tout appel sortant depuis un webhook porte un délai maximum : une panne de l'autre app garderait sinon la requête ouverte jusqu'à ce que la plateforme la tue, et le fournisseur ne recevrait jamais sa réponse.

---

## 21. Variables d'environnement (extrait)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Application
NEXT_PUBLIC_APP_URL=https://quiz.tipote.com

# IA
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=...
ANTHROPIC_CHAT_MODEL=...
OPENAI_API_KEY=...

# Systeme.io
SYSTEME_IO_WEBHOOK_SECRET=...
SYSTEME_IO_FREE_WEBHOOK_SECRET=...
SYSTEME_IO_WEBHOOK_SIGNING_SECRET=...   # active la vérif HMAC

# GIF
KLIPY_API_KEY=...

# Encaissement chez nous (Stripe)
STRIPE_SECRET_KEY_OWNER=...              # cle restreinte : Abonnements en ECRITURE, sinon l'annulation repond missing_permission
STRIPE_WEBHOOK_SECRET_OWNER=...          # sans elle le webhook REFUSE tout : 503, et Stripe reessaie

# Encaissement chez nous (PayPal)
PAYPAL_CLIENT_ID_OWNER=...
PAYPAL_CLIENT_SECRET_OWNER=...
PAYPAL_WEBHOOK_ID_OWNER=...              # se pose par `npm run paypal:setup`, jamais a la main
PAYPAL_ENV_OWNER=live                    # ABSENTE vaut BAC A SABLE : des identifiants reels y sont refuses sans dire pourquoi

# Affiliation (les commissions vivent chez Tipote)
AFFILIATE_INTERNAL_SECRET=...            # MEME valeur que sur le serveur Tipote. Absente : AUCUNE vente ne paie personne
TIPOTE_AFFILIATE_ENDPOINT=...            # optionnel, defaut https://app.tipote.com/api/affiliate/attribute-sale

# Support et partenaires
PARTNER_SHARED_SECRET=...                # MEME valeur que sur le serveur Tipote (relais du centre d'aide)

# Images servies par NOTRE serveur (optionnel : absente = tout va chez Supabase)
NEXT_PUBLIC_ASSETS_BASE_URL=https://assets.quiz.tipote.com   # VALIDEE : https, jamais localhost
ASSETS_DIR=/srv/public-assets            # le dossier servi par infra/nginx/assets.*.conf

# Revendeur
RESELLER_SECRETS_KEY=...                 # 32 octets, chiffrement des clés de paiement

# Allowlists de test (optionnel)
TIQUIZ_MULTIPROJECTS_ALLOWLIST=...
TIQUIZ_SURVEY_AI_ALLOWLIST=...
```

Sur le serveur de production, l'application source son environnement depuis `.env`.

---

## 22. Déploiement et outillage

- **Serveur** : VPS Ubuntu, application servie par PM2, reverse proxy Caddy / Nginx avec on-demand TLS pour les domaines personnalisés, DNS et CDN Cloudflare.
- **Build** : `npm run build` (sortie standalone). Typecheck `npx tsc --noEmit` avant chaque commit.
- **Outillage défensif (scripts npm)** : `check:migrations-pending` (liste les migrations non appliquées en prod), `check:schema`, `diag:multiprofils` (invariants DB), `smoke:multiprofils`, `test:webhook` (cas de routing webhook sans paiement), `test:e2e` (Playwright sur `/q/`, `/p/`, `/pq/`), `smoke` (routes publiques), `test:visual` (filet visuel Playwright du viewer public : 5 dispositions x 6 écrans, dont le résultat scoré multi-axes, x 3 viewports = 90 captures de référence, à faire passer avant tout changement design).
- **CI** : workflow de typecheck plus build plus smoke à chaque push, workflow Playwright planifié.
- **Invariants anti-régression** documentés dans `docs/INVARIANTS.md` : sécurité des leads, typographie française appliquée au save et au render, auto-activation des quiz d'un popquiz publié, cohérence lockfile / package.json, ownership des cues de popquiz.

### Typographie française

Le NBSP est appliqué automatiquement avant `: ; ! ? »` pour les locales françaises, à la fois au save (PATCH du quiz) et au render (route publique). La transformation est idempotente et pure (`lib/frenchTypography.ts`).
</content>
</invoke>
