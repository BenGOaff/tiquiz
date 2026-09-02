// lib/sales/planV2.ts
//
// LE PLAN DE LA VERSION DE TRAVAIL DE LA PAGE DE VENTE.
//
// Béné, 2 septembre 2026 : "La page doit dérouler toutes les infos dans
// un ordre logique, agréable à découvrir, devancer les objections, avoir
// des enchaînements fluides : il n'est pas question d'empiler les infos
// à ajouter de manière aléatoire."
//
// -- POURQUOI UN MODULE ET PAS UNE RETOUCHE À LA MAIN -----------------
//
// `content/sales/tiquiz.html` fait 1,4 Mo d'une seule traite. Une
// retouche à la main dedans ne se relit pas, ne se compare pas, et se
// perd à la prochaine capture (`npm run vente:capturer`). Ce fichier EST
// donc la liste des changements : il se lit en une minute, il se teste,
// et `npm run vente:v2` le rejoue à l'identique sur une capture neuve.
//
// -- CE QUI REND LE RÉORDONNANCEMENT POSSIBLE, ET C'EST MESURÉ --------
//
// Les 19 sections de la page sont des FRÈRES, chacun dans exactement la
// même enveloppe :
//
//     <div class="sc-iHGNWg iintFh"><section id="section-xxxx">…</section></div>
//
// Vérifié sur les 19, pas supposé. Ce sont donc des blocs déplaçables,
// et le script les déplace entiers : on ne coupe JAMAIS à l'intérieur
// d'une section (le CSS de la page cible des `#section-<id>`, et couper
// dedans casserait la mise en page sans qu'un test puisse le voir).
//
// Vérifié aussi dans un vrai Chromium : après exécution du bundle
// Systeme.io, le DOM rend les sections dans l'ordre SERVI. La page est
// servie telle quelle, elle n'est pas reconstruite depuis
// `window.__PRELOADED_STATE__`.
//
// -- L'ORDRE, ET LE RAISONNEMENT DERRIÈRE ------------------------------
//
// Le défaut de la page actuelle n'est pas son contenu, c'est sa
// PROGRESSION. Le visiteur lit six blocs de bénéfices avant de savoir
// COMMENT l'outil marche : le mécanisme (les 4 étapes) vit au 11e rang,
// enfoui dans le plus gros bloc de la page. Et cinq blocs de bénéfices
// à la suite, tous de la même forme (visuel, texte, bouton), forment un
// plateau : on décroche au troisième.
//
// La v2 remonte donc le mécanisme juste après le problème, et coupe le
// plateau avec les blocs neufs, qui n'ont ni la même forme ni le même
// sujet.

/** Un bloc de la page : soit une section d'origine, soit un bloc neuf. */
export type BlocV2 =
  /** `section-xxxx` : la section d'origine, déplacée telle quelle. */
  | { readonly genre: "origine"; readonly id: string; readonly role: string }
  /** Un fichier de `content/sales/v2/`, inséré à cette place. */
  | { readonly genre: "neuf"; readonly fichier: string; readonly role: string };

/**
 * L'ordre de la version de travail.
 *
 * `role` n'est pas décoratif : c'est ce qui permet de relire le plan
 * sans ouvrir la page, et de voir d'un coup d'oeil qu'on n'a pas empilé
 * trois fois le même temps.
 */
export const ORDRE_V2: readonly BlocV2[] = [
  { genre: "origine", id: "section-e7a45e23", role: "la promesse (menu + accroche)" },
  { genre: "origine", id: "section-6d61d927", role: "respiration (bandeau défilant)" },
  { genre: "origine", id: "section-e03ca672", role: "montre-moi tout de suite (démo vidéo)" },
  { genre: "origine", id: "section-a4c46954", role: "LA DOULEUR : un visiteur qui repart sans son email" },

  // LE MÉCANISME, remonté du 11e au 5e rang. C'est la seule vraie
  // correction de structure : tant qu'on n'a pas dit COMMENT ça marche,
  // chaque bénéfice annoncé est une promesse en l'air.
  { genre: "origine", id: "section-3fe5bb60", role: "LE MÉCANISME : comparatif, les 4 étapes, la connexion Systeme.io" },

  { genre: "neuf", fichier: "funnel-quiz.html", role: "CE QUE ÇA CHANGE : chacun repart vers SON offre" },

  { genre: "origine", id: "section-52544404", role: "des leads qualifiés, pas des touristes" },
  { genre: "origine", id: "section-c5554325", role: "ton audience te dit quoi vendre" },
  { genre: "origine", id: "section-d572b05d", role: "le quiz devient un mini-tunnel de vente" },
  { genre: "origine", id: "section-8ad090d2", role: "et il tourne tout seul (viralité)" },

  { genre: "origine", id: "section-c935c487", role: "profil ou score : les deux" },
  { genre: "origine", id: "section-0cad8061", role: "sondages et popquiz" },
  { genre: "origine", id: "section-e64b4497", role: "ta marque, tes langues" },

  { genre: "neuf", fichier: "ou-vit-ton-quiz.html", role: "OBJECTION : je suis sur WordPress / je n'ai pas de site" },
  { genre: "neuf", fichier: "quand-ca-tourne.html", role: "APRÈS : mesurer, déléguer aux affiliés, écrire la suite" },

  { genre: "origine", id: "section-734cb5be", role: "essaie maintenant" },
  { genre: "origine", id: "section-f946da0c", role: "démarque-toi" },
  { genre: "origine", id: "section-3a798764", role: "LA PREUVE : ils l'utilisent déjà" },

  { genre: "neuf", fichier: "cest-pour-toi.html", role: "QUALIFICATION : pour qui, et pour qui pas" },

  { genre: "origine", id: "section-518f489a", role: "LE PRIX" },
  { genre: "origine", id: "section-25c05a06", role: "les dernières objections (FAQ)" },
  { genre: "origine", id: "section-ac141c59", role: "le dernier appel" },
  { genre: "origine", id: "section-7ef343bd", role: "pied de page" },
] as const;

/**
 * LE POPUP DE LA VENTE BÊTA, RETIRÉ (Béné, 1er septembre 2026 :
 * "rechercher et supprimer notion de vente beta accès à vie : n'existe
 * plus").
 *
 * Ce n'est pas un bandeau, c'est un POPUP posé après le pied de page
 * (`data-testid="popup-6a6a0dd0-…"`), invisible au chargement et ouvert
 * par un déclencheur. Mesuré : `display: none` au repos. Le laisser en
 * place, c'est laisser une offre morte s'ouvrir un jour sur la figure
 * d'un visiteur, avec un bouton vers `tipote.fr/tiquiz-beta`.
 */
export const POPUP_BETA = 'popup-6a6a0dd0-fd5a-49cb-8f05-d3ce938e2d72';

/**
 * LE BUNDLE SYSTEME.IO, RETIRÉ DE LA VERSION DE TRAVAIL.
 *
 * -- CE QUI A ÉTÉ MESURÉ, ET ÇA A FAILLI COÛTER LE CHANTIER ENTIER ----
 *
 * La page servie n'est pas la page affichée. Les trois fichiers
 * `/v/tiquiz/*.js` sont le bundle React de l'éditeur Systeme.io
 * (`webpackChunk_publisher_dist_publisher_sales`), et il RECONSTRUIT la
 * page depuis `window.__PRELOADED_STATE__`, c'est à dire depuis le
 * modèle de la page, pas depuis le HTML.
 *
 * Constaté dans un vrai Chromium sur la v2 déjà construite : le
 * navigateur recevait 23 sections dans le nouvel ordre, et le DOM en
 * rendait 19 dans l'ANCIEN, sans aucun de mes blocs neufs, avec le
 * popup de la vente bêta revenu. Zéro erreur visible pour l'utilisateur,
 * juste une page qui ignore tout ce qu'on lui a écrit.
 *
 * MA PREMIÈRE SONDE AVAIT CONCLU L'INVERSE, et c'est la leçon du jour :
 * je l'avais lancée sur la page D'ORIGINE, dont l'ordre du DOM est par
 * construction celui du modèle. Elle ne pouvait donc pas distinguer
 * « React ne touche à rien » de « React réécrit à l'identique ». Un
 * test qui ne distingue pas ce qu'il est censé distinguer est pire
 * qu'un test absent (leçon des clés Supabase, 22 août). La sonde qui
 * tranche est celle qui tourne sur une page DÉLIBÉRÉMENT différente.
 *
 * -- POURQUOI LE RETIRER EST SANS PERTE, ET C'EST MESURÉ AUSSI --------
 *
 * Ce bundle ne sert QUE la réhydratation : tout l'interactif de cette
 * page est écrit par Béné, en scripts autonomes posés dans les
 * sections. Comparé écran par écran, avec et sans :
 *
 *   la bascule mensuel / annuel   17 € et 29 €  ->  170 € et 290 €   ✓
 *   le sélecteur de langue                                          ✓
 *   les 10 ancres du menu, aucune morte                             ✓
 *   les 22 animations déclenchées au défilement                     ✓
 *   la FAQ : 1608 px, 4886 caractères, dépliée  ->  IDENTIQUE       ✓
 *
 * La FAQ méritait d'être mesurée avant de conclure : elle n'a jamais
 * été un accordéon, ni avec le bundle ni sans. Supposer le contraire
 * aurait fait renoncer à la correction pour une régression imaginaire.
 *
 * Et deux choses s'améliorent : la page passe de 1429 Ko à 669 Ko, et
 * les 22 erreurs React de la console tombent à zéro.
 *
 * -- CE QUE ÇA IMPLIQUE, ET C'EST LA DÉCISION DE BÉNÉ ------------------
 *
 * Une page sans son modèle ne se rouvre plus dans l'éditeur Systeme.io.
 * Ce n'est pas un problème ici : cette page ne vit plus chez eux, elle
 * est servie par nous depuis `content/sales/`. Mais c'est un aller
 * simple, et c'est pour ça que ça se dit au lieu de se faire en
 * silence.
 */
export const SCRIPTS_RETIRES = {
  /** Les trois morceaux du bundle React de l'éditeur. */
  bundles: ["c676514098d7", "9205ba0d1bd2", "6f503eba3b72"] as const,
  /** Les trois états qu'il relit pour reconstruire la page. */
  etats: ["__PRELOADED_STATE__", "initialI18nStore", "initialLanguage"] as const,
} as const;

/**
 * Les corrections de texte appliquées au HTML d'origine.
 *
 * ELLES SONT EXACTES ET ELLES DOIVENT TOUTES MORDRE : le script échoue
 * si l'une d'elles ne trouve rien. C'est la leçon de `faitsProgramme.ts`
 * (31 août) : une passe qui ne trouve pas sa cible et se tait laisse le
 * contenu faux en annonçant qu'il est propre.
 */
export interface CorrectionV2 {
  readonly cherche: string;
  readonly remplace: string;
  readonly pourquoi: string;
}

export const CORRECTIONS_V2: readonly CorrectionV2[] = [
  {
    cherche: "100+ langues via l'IA",
    remplace: "100 langues et variantes",
    pourquoi:
      "COMPTÉ dans lib/quizLanguages.ts le 2 septembre 2026 : le " +
      "catalogue porte EXACTEMENT 100 entrées, qui couvrent 83 langues " +
      "distinctes plus leurs variantes régionales (fr et fr-CA, pt et " +
      "pt-BR, trois arabes...). « 100+ » est donc faux d'une unité, et " +
      "« 100 langues » sur-compte les langues distinctes de 17. C'est " +
      "exactement le genre de chiffre qu'un acheteur vérifie en " +
      "ouvrant le sélecteur, et le seul endroit où se faire prendre " +
      "coûte plus cher que le chiffre ne rapporte.\n" +
      "La chaîne apparaît 4 fois : deux fois dans le DOM (la version " +
      "large et la version mobile du même bandeau) et deux fois dans " +
      "le modèle de page que relit l'éditeur Systeme.io. Les quatre " +
      "sont corrigées : n'en corriger qu'une ferait revenir l'ancienne " +
      "valeur à la première retouche dans leur éditeur.",
  },
  {
    cherche: '<h1 dir="ltr"><span style="color: rgb(46, 56, 109)">Grâce aux quiz interactifs</span></h1>',
    remplace: '<p dir="ltr" class="tqv-sous-titre"><span style="color: rgb(46, 56, 109)">Grâce aux quiz interactifs</span></p>',
    pourquoi:
      "LA PAGE SERVAIT DEUX <h1>. Mesuré dans le navigateur : les deux " +
      "sont VISIBLES en même temps, à 1280 px comme à 390 px. Ce ne sont " +
      "pas les versions large et mobile d'un même titre, ce sont les deux " +
      "moitiés d'une seule phrase (« Booste ton trafic » et « Grâce aux " +
      "quiz interactifs ») découpées en deux titres de niveau 1.\n" +
      "Un moteur ne sait alors plus quel est le sujet de la page, et sur " +
      "une page qu'on veut faire remonter sur « quiz Systeme.io », c'est " +
      "le seul signal qui ne se rattrape pas ailleurs. La deuxième moitié " +
      "devient un paragraphe : elle garde exactement sa taille et sa " +
      "couleur (elles viennent du conteneur, pas de la balise), et le " +
      "titre de la page redevient unique.",
  },
] as const;

/** Les sections d'origine que le plan replace, dans l'ordre. */
export function sectionsAttendues(): string[] {
  return ORDRE_V2.filter((b) => b.genre === "origine").map((b) => (b as { id: string }).id);
}

/** Les fichiers de bloc neuf que le plan réclame, dans l'ordre. */
export function blocsNeufs(): string[] {
  return ORDRE_V2.filter((b) => b.genre === "neuf").map((b) => (b as { fichier: string }).fichier);
}

/**
 * Le plan est-il complet vis à vis de la page capturée ?
 *
 * AUCUNE SECTION NE SE PERD EN SILENCE. Une section oubliée du plan
 * disparaîtrait de la v2, et personne ne le verrait avant que Béné ne
 * remarque qu'il manque un morceau : elle rend donc `manquantes`, et le
 * script refuse de construire.
 *
 * `enTrop` couvre l'autre sens : un id du plan qui n'existe plus dans la
 * capture (une nouvelle capture où Systeme.io a régénéré les ids).
 */
export function verifierPlan(idsDeLaCapture: readonly string[]): {
  manquantes: string[];
  enTrop: string[];
  ok: boolean;
} {
  const plan = new Set(sectionsAttendues());
  const capture = new Set(idsDeLaCapture);
  const manquantes = idsDeLaCapture.filter((id) => !plan.has(id));
  const enTrop = sectionsAttendues().filter((id) => !capture.has(id));
  return { manquantes, enTrop, ok: manquantes.length === 0 && enTrop.length === 0 };
}
