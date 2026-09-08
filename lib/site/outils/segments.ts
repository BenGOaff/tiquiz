// lib/site/outils/segments.ts
//
// LES DEUX FORMES DE TEXTE QUE LES SIX PAGES D'OUTIL PARTAGENT.
//
// Elles vivent ici et pas dans la page d'un outil : `zapier.ts` importait
// `CaptureTexte` depuis `jotform.ts`, ce qui donnait à une page l'air
// d'être la source de l'autre. Un type partagé se range à un endroit
// neutre, sinon le prochain passage le redéclare dans son propre module
// et les deux divergent (le défaut le plus cher de ce dépôt).

/** Le texte d'une capture : ce qu'une lectrice aveugle entend, et sa légende. */
export interface CaptureTexte {
  readonly alt: string;
  readonly legende: string;
}

/**
 * Un morceau de phrase : du texte, du code, du gras, ou un lien interne.
 *
 * Une phrase est une SUITE de segments, parce que ces pages portent des
 * `<code>` et des `<strong>` AU MILIEU de leurs phrases. Mettre la balise
 * dans la chaîne obligerait à l'injecter en `innerHTML` ; découper en
 * "avant / après" fabriquerait une clé par morceau, donc une traduction
 * impossible à relire.
 */
export type Segment =
  | string
  | { readonly code: string }
  | { readonly gras: string }
  | { readonly lien: string; readonly chemin: string };
