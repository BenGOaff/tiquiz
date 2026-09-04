// app/(site)/apercu-landing-8f2c9d41/anims.tsx
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

/** Les blocs levés, et ce que chacun MONTRE. */
export const BLOCS_ANIMES = {
  "opt-in-vs-quiz": "Un PDF qu'on ne lit pas contre un quiz auquel on répond.",
  "opt-in-vs-quiz-mobile": "La même chose, sa variante mobile.",
  "ton-branding": "Le même quiz qui prend les couleurs et le logo de la créatrice.",
  "ton-branding-mobile": "La même chose, sa variante mobile.",
  "tes-pixels": "Les pixels Meta, Analytics et Ads qui se posent sur le quiz.",
  "tes-pixels-mobile": "La même chose, sa variante mobile.",
} as const;

export type BlocAnime = keyof typeof BLOCS_ANIMES;

/**
 * Le fichier est lu UNE FOIS par processus, pas à chaque requête : ces
 * blocs ne changent qu'au prochain `npm run anims:extraire`.
 */
const cache = new Map<string, string>();

function lire(bloc: BlocAnime): string {
  const deja = cache.get(bloc);
  if (deja !== undefined) return deja;
  const html = readFileSync(join(process.cwd(), "content/sales/anim", `${bloc}.html`), "utf8");
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
export function AnimVente({ bloc }: { bloc: BlocAnime }) {
  return <div aria-hidden data-anim-vente={bloc} dangerouslySetInnerHTML={{ __html: lire(bloc) }} />;
}
