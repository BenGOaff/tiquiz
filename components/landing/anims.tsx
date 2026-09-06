// components/landing/anims.tsx
//
// SES BLOCS ANIMÉS, LEVÉS DE SA PAGE DE VENTE.
//
// Béné, 4 septembre 2026 : "pourquoi tu ne reprends pas au moins une
// partie des animations de ma page d'origine ? Elles sont super et elles
// montrent bien le fonctionnement !"
//
// Elle a raison, et les redessiner serait absurde : sa page porte
// 234 keyframes, regroupés par bloc, et chaque bloc est une ÎLE
// autonome. `npm run anims:extraire` les lève dans
// `content/sales/anim/`, à l'octet près.
//
// -- POURQUOI `dangerouslySetInnerHTML` EST LE BON OUTIL ICI ----------
//
// Ce HTML vient du DÉPÔT, pas d'un formulaire : c'est sa page, versionnée
// à côté du code, et c'est déjà ce que fait `lib/sales/servePage.ts` pour
// la page entière. Le convertir en JSX perdrait ses `<style>` et donc ses
// animations, c'est à dire exactement ce qu'elle demande de garder.
//
// -- ON NE RE-PRÉFIXE PAS LES CLASSES, ET C'EST MESURÉ ---------------
//
// Le premier jet renommait `.tqvs` en `.tqla-tqvs` pour qu'aucune règle
// ne fuite. Il en laissait 112 sur un bloc : le style et le markup se
// retrouvaient DÉSAPPARIÉS, donc l'animation ne partait plus, et ça ne
// se voit pas dans le fichier. Vérifié avant de renoncer : `tqvs`,
// `tqbr` et `tqpx` n'existent dans AUCUN fichier de code du dépôt.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * LES DEUX CLASSES QUI RÉVÈLENT UN BLOC.
 *
 * Ses règles s'écrivent `.tqvs.tqz-visible .machin{animation:...}` : sans
 * la classe, l'animation ne part pas. Et MESURÉ le 6 septembre, fichier
 * par fichier : les onze îles portent entre 3 et 19 déclarations
 * `opacity:0` dans leur état de départ. Un bloc jamais déclenché ne
 * reste donc pas "figé mais lisible", il reste PARTIELLEMENT VIDE.
 *
 * C'est exactement ce que Béné décrit le 6 septembre : "en scrollant
 * vite, des sections entières restent invisibles."
 *
 * DEUX FAMILLES, PAS UNE : les unes s'animent sur `tqz-visible`, les
 * autres sur `tqz1-visible`. On pose les deux. Une classe qu'un bloc
 * n'utilise pas ne lui coûte rien, une classe manquante lui coûte son
 * animation.
 */
export { DECLENCHEURS } from "@/lib/site/blocsAnimes";

import { DECLENCHEURS } from "@/lib/site/blocsAnimes";

// LES DEUX TABLES VIVENT DANS UN MODULE PUR, et elles sont
// ré-exportées ici pour que les appelants n'aient qu'un import : ce
// fichier lit le disque, donc le runner de tests natif ne peut pas le
// charger, donc une table enfermée dedans ne serait pas testable.
export { BLOCS_ANIMES, BLOCS_EN_ATTENTE } from "@/lib/site/blocsAnimes";
export type { BlocAnime } from "@/lib/site/blocsAnimes";

import { BLOCS_ANIMES as TABLE } from "@/lib/site/blocsAnimes";
type BlocAnime = keyof typeof TABLE;

/**
 * Le fichier est lu UNE FOIS par processus, pas à chaque requête : ces
 * blocs ne changent qu'au prochain `npm run anims:extraire`.
 */
const cache = new Map<string, string>();

/**
 * LE BLOC EST SERVI DÉJÀ RÉVÉLÉ, ET C'EST LA CORRECTION DU 6 SEPTEMBRE.
 *
 * Béné : "le contenu est visible par défaut dans le HTML rendu ; l'état
 * masqué n'est appliqué qu'après le montage côté client, pour que rien
 * ne disparaisse si le JS échoue ou si le scroll est rapide."
 *
 * On pose donc les deux classes sur la RACINE de l'île, dans le HTML que
 * le serveur envoie. Conséquences, dans cet ordre d'importance :
 *
 *   1. sans JavaScript, sans réseau, sur un robot ou un lecteur d'écran,
 *      le bloc s'affiche entier au lieu d'avoir des trous ;
 *   2. les animations finissent visibles quand elles partent tout de
 *      suite (MESURÉ : sur les 11 îles, chaque `animation:` porte
 *      `forwards` ou `infinite`, donc aucune ne revient à `opacity:0`
 *      en s'arrêtant) ;
 *   3. `DeclencheurAnims` retire la classe APRÈS le montage sur les
 *      blocs encore hors de l'écran, et la remet quand ils entrent.
 *
 * LA RACINE EST LE PREMIER `<div class="...">` DU FICHIER. Le `<style>`
 * qui précède n'en contient aucun : c'est du CSS. Et `assurerRevele`
 * REFUSE un fichier où il n'y en a pas, au lieu de servir en silence un
 * bloc qui ne se révélera jamais.
 */
function assurerRevele(bloc: BlocAnime, html: string): string {
  const marque = ` ${DECLENCHEURS.join(" ")}`;
  const i = html.indexOf('<div class="');
  if (i < 0) {
    throw new Error(
      `Bloc animé ${bloc} : aucune racine <div class="..."> trouvée, la classe qui le révèle ne peut pas être posée.`,
    );
  }
  const debut = i + '<div class="'.length;
  const fin = html.indexOf('"', debut);
  const classes = html.slice(debut, fin);
  if (classes.includes(DECLENCHEURS[0])) return html;
  return `${html.slice(0, fin)}${marque}${html.slice(fin)}`;
}

function lire(bloc: BlocAnime): string {
  const deja = cache.get(bloc);
  if (deja !== undefined) return deja;
  const brut = readFileSync(join(process.cwd(), "content/sales/anim", `${bloc}.html`), "utf8");
  const html = assurerRevele(bloc, brut);
  cache.set(bloc, html);
  return html;
}

/**
 * UNE ÎLE ANIMÉE.
 *
 * `data-anim-vente` est le marqueur que `DeclencheurAnims` cherche pour
 * poser `tqz-visible` : sans lui le bloc est INERTE, et ça ne se voit
 * qu'à l'écran (mesuré : 0 élément animé sans déclencheur, 23 avec).
 *
 * ON NE POSE QU'UNE VARIANTE, ET C'EST MESURÉ. Sa page en a deux par
 * bloc, et le premier jet posait les deux en comptant sur ses media
 * queries pour n'en montrer qu'une. Mesuré : à 1280 comme à 390, les
 * DEUX s'affichaient, donc le bloc apparaissait en double. Ce qui les
 * départage sur sa page vit dans un conteneur Systeme.io, hors de
 * l'île. Et la variante grand écran s'adapte très bien au téléphone
 * (mesurée à 358x456 sur un viewport de 390), donc les variantes
 * mobiles restent extraites mais ne sont pas servies.
 */
/**
 * `decoratif` est un PARAMÈTRE, jamais deviné.
 *
 * La plupart de ses blocs sont des dessins qui bougent : le texte
 * autour porte l'argument, donc on les cache aux lecteurs d'écran.
 * Deux d'entre eux, non : son comparatif des formats et son sondage
 * portent de VRAIES phrases et de vrais chiffres, et ils remplacent un
 * tableau que la landing rendait en HTML. Les masquer retirerait
 * l'argument à un lecteur d'écran et à un moteur.
 */
export function AnimVente({
  bloc,
  decoratif = true,
}: {
  bloc: BlocAnime;
  decoratif?: boolean;
}) {
  return (
    <div
      aria-hidden={decoratif || undefined}
      data-anim-vente={bloc}
      dangerouslySetInnerHTML={{ __html: lire(bloc) }}
    />
  );
}
