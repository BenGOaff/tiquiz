// app/apercu-landing-8f2c9d41/page.tsx
//
// LA MAQUETTE DE BÉNÉ, AVEC LE VRAI GÉNÉRATEUR DEDANS.
//
// Béné, 19 septembre 2026 : "mets à jour la landing page aperçu pour
// reproduire cette page en exemple : fichier joint. Au lieu de 'Écris
// ton sujet, regarde ce qui sort' mets le générateur de quiz qui est
// actuellement sur la page. Plus l'option pour l'importer dans le compte
// du nouvel user. Et agrandis un peu la démo, là elle sera illisible
// avec cette présentation."
//
// -- CE QUI A CHANGÉ DE PLACE, ET POURQUOI -----------------------------
//
// La page vivait dans `app/(site)/`, donc sous `SiteShell`, donc avec
// l'en-tête et le pied du site autour. Sa maquette porte LES SIENS. Les
// deux empilés, elle regarderait deux en-têtes et croirait à un bug de
// design alors que c'est un bug de rangement.
//
// Elle est donc remontée d'un cran, hors du groupe `(site)`. **L'adresse
// ne bouge pas** : les parenthèses d'un groupe de routes ne comptent
// jamais dans l'URL, `/apercu-landing-8f2c9d41` reste
// `/apercu-landing-8f2c9d41`.
//
// -- SON HTML EST GARDÉ À L'OCTET PRÈS ---------------------------------
//
// Il vit dans `lib/site/apercuLandingV2.ts`, découpé par script et pas à
// la main. Le retranscrire en JSX, c'est 230 Ko de copie où chaque faute
// de frappe devient une différence qu'elle prendrait pour une décision
// de design. `npm run check:apercu-landing` rejoue le découpage et
// refuse un écart.
//
// C'est un APERÇU, en `noindex`. Le jour où elle valide, le style rejoint
// `components/landing/styles.ts` : une feuille de plus sur le domaine
// serait un troisième système visuel (sa règle du 4 septembre).
//
// -- LES DEUX SCRIPTS SONT DE VRAIES BALISES ---------------------------
//
// Un `<script>` posé par `dangerouslySetInnerHTML` ne s'exécute JAMAIS.
// Laissé dans le corps, il serait là, inerte, et les 112 blocs `.rv`
// garderaient `opacity:0` : une page BLANCHE, sans rien dans le code qui
// le laisse voir. Ils sont donc rendus à part.

import type { Metadata } from "next";

import EmbedPreviewClient from "@/components/embed/EmbedPreviewClient";
import { HOTE_VENTE } from "@/lib/publicHost";
import { BAS, CSS_V2, FAQ_JSONLD, HAUT, REVEAL_JS } from "@/lib/site/apercuLandingV2";

/**
 * UN APERÇU NE S'INDEXE PAS.
 *
 * Elle reprend mot pour mot des pages qui rankent déjà : indexée, elle
 * se ferait concurrence à elle même sur ses propres mots.
 */
export const metadata: Metadata = {
  title: "Aperçu landing Tiquiz",
  robots: { index: false, follow: false },
};

/**
 * LA PORTE ÉCRITE DANS `embed_quiz_sessions`, ET CE N'EST PAS CELLE DE
 * LA VRAIE PAGE.
 *
 * `construireEntonnoirGenerateur` ne compte QUE les lignes qui portent
 * `page-generateur`. Si l'aperçu écrivait la même valeur, chaque essai
 * fait pendant une relecture gonflerait le seul ratio qu'elle regarde
 * pour juger le générateur, et rien ne le dirait.
 *
 * C'est le symétrique exact du drame de `?source=modeles` (8 septembre) :
 * là, des générations disparaissaient de l'entonnoir ; ici, elles en
 * ajouteraient des fausses. Les deux rendent le même chiffre faux.
 */
const SOURCE_APERCU = "apercu-landing";

/**
 * CE QUE J'AJOUTE À SA FEUILLE, ET RIEN DE PLUS.
 *
 * Séparé de `CSS_V2` exprès : là bas c'est SON fichier, à l'octet près,
 * et un script le vérifie. Ici c'est ce que la démo agrandie réclame, et
 * ça se voit d'un coup d'oeil.
 *
 * `--maxw` vaut 1140 px sur sa page. L'outil prend un peu plus (1260),
 * parce que l'éditeur qui s'ouvre derrière a besoin de place, alors que
 * le texte se lit mieux étroit. Sous 1300 px de fenêtre il redescend à
 * la largeur de la page : déborder serait pire qu'être un peu serré.
 */
const CSS_DEMO = `
#essai .apercu-outil{
  width:min(1260px, 100%);
  margin:0 auto;
  border:1px solid var(--border);
  border-radius:20px;
  background:#fff;
  overflow:hidden;
  box-shadow:0 18px 50px rgba(20,24,48,.10);
}
/* L'outil pose son propre fond et ses propres marges : on ne lui en
   ajoute pas, on lui donne juste le cadre. */
#essai .apercu-outil > *{max-width:none}
#essai .reassure.center{text-align:center}
#essai .apercu-video h3{font-size:1.18rem}
#essai .apercu-video{text-align:center}
#essai .apercu-video .videoframe{margin-left:auto;margin-right:auto}
@media (max-width:760px){
  #essai .apercu-outil{border-radius:14px}
}
`;

export default function ApercuLandingV2Page() {
  return (
    <>
      <style>{CSS_V2}</style>
      <style>{CSS_DEMO}</style>

      {/* Tout ce qui précède la démo : son fichier, inchangé. */}
      <div dangerouslySetInnerHTML={{ __html: HAUT }} />

      {/* ══ LA DÉMO : LE VRAI GÉNÉRATEUR, PAS UNE MAQUETTE ══ */}
      {/*
          Sa maquette posait ici un champ qui renvoyait sur
          `/generateur-de-quiz`. C'est à dire : on promettait "fais-en un,
          là, maintenant", et on faisait changer de page.

          Le générateur est donc POSÉ ICI, et c'est le même composant que
          la vraie page, pas une deuxième version. Une copie finirait par
          ne plus dire la même chose que l'originale, et c'est le piège
          sorti six fois dans ce dépôt (un aperçu qui recalcule au lieu
          d'appeler).
      */}
      <section id="essai">
        <div className="wrap">
          <div className="narrow center">
            <span className="eyebrow rv in">Avant de me croire</span>
            <h2 className="rv in">
              Tu veux voir à quoi ça ressemble ?<br />
              <span className="grad">Fais-en un. Là, maintenant.</span>
            </h2>
            <p className="lead mt24 rv in">
              Pas de compte à créer, pas d&apos;adresse à laisser. Tu décris ton sujet en une
              phrase, l&apos;IA écrit le quiz, et tu lis le résultat.
            </p>
          </div>

          {/*
              PLEINE LARGEUR, ET C'EST LA DEMANDE.

              Sa maquette mettait la démo dans `.try`, une grille de deux
              colonnes : sur 1140 px, ça donne 555 px par colonne. Le
              générateur y aurait été illisible, et c'est exactement ce
              qu'elle a vu venir ("agrandis un peu la démo, là elle sera
              illisible avec cette présentation").

              Il prend donc toute la largeur, et un peu plus que le reste
              de la page : l'éditeur qui s'ouvre derrière a besoin de
              place, alors que le texte, lui, se lit mieux étroit.
          */}
          <div className="apercu-outil mt48 rv in">
            <EmbedPreviewClient
              // Pas de reprise de session sur un aperçu : il sert à
              // regarder l'outil, pas à continuer un quiz commencé.
              initialSessionToken=""
              // La maquette est en français, et elle seule.
              locale="fr"
              source={SOURCE_APERCU}
              // Le repli du bon de commande n'est lu que par la page
              // hôte d'une iframe, et il n'y en a pas. La prop est
              // requise, donc il est passé.
              checkoutUrl={`${HOTE_VENTE}/`}
              // HORS IFRAME : le bouton NAVIGUE vers l'inscription en
              // emportant le jeton du quiz, il n'envoie pas un message à
              // un parent qui n'existe pas.
              //
              // C'EST LUI, "L'OPTION POUR L'IMPORTER DANS LE COMPTE DU
              // NOUVEL USER" : `remisePourLeBouton("page", jeton)` rend
              // `/signup?tq_session=…`, et l'inscription rattache le quiz
              // au compte qui vient de naître. Rien à coder de plus, et
              // surtout rien à recoder : un deuxième chemin de reprise
              // finirait par perdre des quiz que le premier sait garder.
              contexte="page"
            />
          </div>

          <p className="reassure center">
            Quelques secondes, aucune inscription. Le quiz reste à toi : en créant ton compte
            gratuit, tu le retrouves dedans, déjà écrit.
          </p>

          {/* La vidéo garde sa place, sous l'outil et non plus à côté. */}
          <div className="apercu-video narrow mt48 rv in">
            <h3>Ou regarde-moi le faire en entier</h3>
            <p className="lead mt16" style={{ fontSize: ".97rem" }}>
              Je crée un quiz, j&apos;écris les profils de résultats, je le connecte à mon
              autorépondeur, et je te montre le contact arriver avec son tag posé dessus.
            </p>
            <div className="videoframe mt24">
              <div className="playbtn" />
              <span>Démonstration · compte réel</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tout ce qui suit : son fichier, inchangé. */}
      <div dangerouslySetInnerHTML={{ __html: BAS }} />

      {/* Les questions fréquentes, pour Google. Une vraie balise : posée
          par `innerHTML`, elle ne serait pas lue. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSONLD }} />
      {/* L'apparition au défilement. SANS ELLE LA PAGE EST BLANCHE. */}
      <script dangerouslySetInnerHTML={{ __html: REVEAL_JS }} />
    </>
  );
}
