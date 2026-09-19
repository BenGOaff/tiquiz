// app/apercu-landing-8f2c9d41/page.tsx
//
// LA MAQUETTE DE BÉNÉ, AVEC NOTRE VRAI QUIZ DEDANS.
//
// Béné, 19 septembre 2026 (deuxième envoi) : "Je te renvoie une landing
// page à jour, place bien notre quiz à nous à la place du truc du html
// de ce modèle. Mais applique bien le nouveau style il est cool."
//
// Son HTML vit dans `lib/site/apercuLandingV2.ts`, découpé par script et
// jamais à la main. **Seul le faux formulaire a été retiré** : son titre
// "Tu veux voir à quoi ça ressemble ?", son chapeau et sa vidéo restent
// exactement où ils sont. Ce qui est parti, c'est un champ qui renvoyait
// sur `/generateur-de-quiz`, c'est à dire qu'on promettait "fais-en un,
// là, maintenant" et qu'on faisait changer de page.
//
// -- LE NOUVEAU STYLE EST APPLIQUÉ, PAS APPROCHÉ ----------------------
//
// Le cadre de l'outil est un `.panel` de SA feuille : même fond, même
// `border-radius: 36px`, même ombre `var(--sh)`. Les seules valeurs que
// j'ajoute sont la largeur et le retrait du rembourrage intérieur, et
// elles sont dans `CSS_DEMO`, séparé exprès : là bas c'est son fichier
// à l'octet près, ici c'est ce que la démo agrandie réclame.
//
// -- LA PAGE N'EST PAS DANS `(site)`, ET L'ADRESSE NE BOUGE PAS -------
//
// Sa maquette porte son propre en-tête et son propre pied. Sous
// `SiteShell` il y en aurait eu DEUX, et elle aurait cru à un bug de
// design alors que c'est un bug de rangement. Les parenthèses d'un
// groupe de routes ne comptent jamais dans l'URL.

import type { Metadata } from "next";

import EmbedPreviewClient from "@/components/embed/EmbedPreviewClient";
import { HOTE_VENTE } from "@/lib/publicHost";
import { BAS, CSS_V2, FAQ_JSONLD, HAUT, REVEAL_JS } from "@/lib/site/apercuLandingV2";

/**
 * UN APERÇU NE S'INDEXE PAS.
 *
 * Il reprend mot pour mot des pages qui rankent déjà : indexé, il se
 * ferait concurrence à lui même sur ses propres mots.
 */
export const metadata: Metadata = {
  title: "Aperçu landing Tiquiz",
  robots: { index: false, follow: false },
};

/**
 * LA PORTE ÉCRITE DANS `embed_quiz_sessions`, ET CE N'EST PAS CELLE DE
 * LA VRAIE PAGE.
 *
 * `construireEntonnoirGenerateur` ne compte QUE `page-generateur`. Si
 * l'aperçu écrivait la même valeur, chaque essai fait pendant une
 * relecture gonflerait le seul ratio qu'elle regarde pour juger le
 * générateur, et rien ne le dirait.
 *
 * Symétrique exact du drame de `?source=modeles` (8 septembre) : là des
 * générations disparaissaient de l'entonnoir, ici on en ajouterait des
 * fausses. Les deux rendent le même chiffre faux.
 */
const SOURCE_APERCU = "apercu-landing";

/**
 * CE QUE J'AJOUTE À SA FEUILLE, ET RIEN DE PLUS.
 *
 * Séparé de `CSS_V2` exprès, et un test le vérifie. Son faux panneau
 * était borné à 820 px sur une page de 1236 : le générateur y aurait
 * été illisible, et c'est ce qu'elle avait vu venir.
 *
 * Le cadre GARDE ses jetons à elle (`--r-lg` si elle l'a, sinon les
 * 36 px du `.panel`, et l'ombre `--sh`) : c'est son style, pas un
 * deuxième. Seuls la largeur et le rembourrage changent, parce que
 * l'outil pose déjà le sien et que l'éditeur qui s'ouvre derrière a
 * besoin de place.
 */
const CSS_DEMO = `
#essai .apercu-outil{
  width:min(1180px, 100%);
  margin:0 auto;
  padding:0;
  overflow:hidden;
}
/* L'outil pose son propre fond et ses propres marges : on lui donne le
   cadre, pas une deuxième gouttière. */
#essai .apercu-outil > *{max-width:none}
#essai .apercu-dessous{
  max-width:820px;
  margin:20px auto 0;
  text-align:center;
}
@media (max-width:760px){
  #essai .apercu-outil{border-radius:22px}
}
`;

export default function ApercuLandingV2Page() {
  return (
    <>
      <style>{CSS_V2}</style>
      <style>{CSS_DEMO}</style>

      {/* Son fichier, inchangé, jusqu'à la section de démo. */}
      <div dangerouslySetInnerHTML={{ __html: HAUT }} />

      {/* ══ SA SECTION DE DÉMO, AVEC NOTRE QUIZ À LA PLACE DU FAUX ══ */}
      {/*
          Redessinée en JSX À L'IDENTIQUE : ses classes, son titre, son
          chapeau, sa vidéo, mot pour mot. Seul le panneau du faux
          formulaire est remplacé.

          POURQUOI LA SECTION ENTIÈRE ET PAS LE SEUL FORMULAIRE : couper
          au milieu laisserait `<section>` et `<div class="wrap">`
          OUVERTS dans la moitié du haut, et le `<div>` qui héberge le
          `innerHTML` les refermerait tout seul. La page s'afficherait,
          de travers, et aucun test logique ne le verrait.
      */}
      <section id="essai">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow rv">Avant de me croire</span>
            <h2 className="rv">
              Tu veux voir à quoi ça ressemble ?{" "}
              <span className="grad">Fais-en un, là, maintenant.</span>
            </h2>
            <p className="lead rv">
              Pas de compte à créer, pas d&apos;adresse à laisser. Tu décris ton sujet en une
              phrase, l&apos;IA écrit le quiz, et tu lis le résultat.
            </p>
          </div>

          {/*
              `panel` : c'est SA classe, donc son fond, son rayon de
              36 px et son ombre. Le nouveau style est appliqué, pas
              imité. Seule la largeur change : son faux panneau était
              borné à 820 px sur une page de 1236, et le générateur y
              aurait été illisible.

              Et c'est le MÊME composant que `/generateur-de-quiz`, pas
              une deuxième version : un aperçu qui recalcule au lieu
              d'appeler finit toujours par mentir, sorti six fois ici.
          */}
          <div className="panel colc rv apercu-outil">
            <EmbedPreviewClient
              // Pas de reprise de session sur un aperçu : il sert à
              // regarder l'outil, pas à continuer un quiz commencé.
              initialSessionToken=""
              // La maquette est en français, et elle seule.
              locale="fr"
              source={SOURCE_APERCU}
              // Le repli du bon de commande n'est lu que par la page
              // hôte d'une iframe, et il n'y en a pas. Prop requise.
              checkoutUrl={`${HOTE_VENTE}/`}
              // HORS IFRAME : le bouton NAVIGUE vers l'inscription en
              // emportant le jeton du quiz.
              //
              // C'EST AUSSI L'IMPORT DANS LE COMPTE DU NOUVEL USER :
              // `remisePourLeBouton("page", jeton)` rend
              // `/signup?tq_session=…`, et l'inscription rattache le
              // quiz au compte qui vient de naître. Rien à recoder : un
              // deuxième chemin de reprise finirait par perdre des quiz
              // que le premier sait garder.
              contexte="page"
            />
          </div>

          {/* Sa phrase, reprise mot pour mot du panneau retiré, plus la
              promesse du quiz gardé. */}
          <p className="reassure rv apercu-dessous">
            Quelques secondes, aucune inscription. Tu récupères cinq questions écrites pour ton
            audience, leurs options de réponse, et trois profils de résultat rédigés. En créant ton
            compte gratuit, tu le retrouves dedans, déjà écrit.
          </p>

          {/* Sa vidéo, à l'identique. */}
          <div className="colc mt56" style={{ maxWidth: "940px" }}>
            <h3 className="rv" style={{ textAlign: "center", marginBottom: "20px" }}>
              Ou regarde-moi le faire en entier
            </h3>
            <div className="vid rv">
              <div className="playbtn" />
              <span>Démonstration · compte réel</span>
            </div>
            <p className="reassure rv">
              Voilà ce que tu peux faire toi-même dès maintenant, en créant ton compte
              gratuitement.
            </p>
          </div>
        </div>
      </section>

      {/* Son fichier, inchangé : sa vidéo, puis tout le reste. */}
      <div dangerouslySetInnerHTML={{ __html: BAS }} />

      {/* Les questions fréquentes, pour Google. Une vraie balise : posée
          par `innerHTML`, elle ne serait pas lue. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSONLD }} />
      {/* L'apparition au défilement. SANS ELLE LA PAGE EST BLANCHE. */}
      <script dangerouslySetInnerHTML={{ __html: REVEAL_JS }} />
    </>
  );
}
