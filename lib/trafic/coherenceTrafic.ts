// lib/trafic/coherenceTrafic.ts
//
// UN COMPTEUR À ZÉRO À CÔTÉ DE HUIT VENTES EST UNE PANNE, PAS UN CHIFFRE.
//
// Béné, 18 septembre 2026, devant l'écran : "c'est impossible que je
// n'ai eu aucune visite mais que j'ai vendu quand même."
//
// Elle a raison, et c'est exactement le point : **cette phrase, le code
// pouvait la dire tout seul.** Le compteur était mort depuis le 7
// septembre (Cloudflare servait les pages depuis son cache, voir
// `vueNavigateur.ts`), l'écran affichait "0" avec l'aplomb d'une mesure,
// et il a fallu onze jours et une cliente en colère pour l'apprendre.
//
// Un tableau de bord n'a pas le droit d'afficher un zéro qu'il ne peut
// pas défendre. Quand les ventes contredisent les vues, c'est la MESURE
// qui est fausse, jamais la réalité : on ne vend pas à des gens qui ne
// sont jamais venus.
//
// C'est la règle du 22 août, retournée : "un chiffre gonflé dans un
// tableau de bord est pire qu'une absence de chiffre, il fait prendre
// des décisions". Un chiffre EFFONDRÉ fait prendre les mêmes décisions,
// à l'envers : arrêter un canal qui marche, croire que le référencement
// ne donne rien, refaire une page qui convertissait.
//
// Module PUR, donc testé, donc il ne peut pas dériver.

/** Ce que l'écran doit dire de sa propre mesure. */
export type VerdictCoherence =
  /** Les deux chiffres se tiennent : on affiche normalement. */
  | { etat: "coherent" }
  /** Des ventes, aucune vue : la mesure est cassée, et on le DIT. */
  | { etat: "mesure_cassee"; ventes: number }
  /** Rien à mesurer encore : ce n'est pas une panne, c'est un début. */
  | { etat: "rien_encore" };

/**
 * LES VUES ET LES VENTES SE CONTREDISENT-ELLES ?
 *
 * Les deux chiffres sont des PARAMÈTRES : cette fonction ne va rien
 * chercher, elle ne fait que confronter. C'est ce qui la rend testable,
 * et c'est ce qui fait qu'elle dira la même chose sur les deux sites.
 *
 * `ventes` est le nombre de ventes DE CE SITE, jamais le total des deux
 * (règle déjà posée dans l'écran : diviser les vues d'un domaine par les
 * ventes des deux gonfle le taux sans que rien ne le dise).
 */
export function coherenceTrafic(args: { vues: number; ventes: number }): VerdictCoherence {
  const vues = Number(args.vues);
  const ventes = Number(args.ventes);
  // `Number.isFinite` et pas `??` : un `??` protège du MANQUANT, jamais
  // du FAUX, et un `NaN` traverserait les deux comparaisons ci-dessous
  // sans rien déclencher.
  const v = Number.isFinite(vues) && vues > 0 ? vues : 0;
  const s = Number.isFinite(ventes) && ventes > 0 ? ventes : 0;

  if (v > 0) return { etat: "coherent" };
  // Zéro vue ET zéro vente : un site qui vient d'ouvrir, ou une période
  // vide. Crier ici ferait rougir l'écran pour rien, et un garde-fou qui
  // crie pour rien finit ignoré (leçon du test de genre, 24 août).
  if (s === 0) return { etat: "rien_encore" };
  return { etat: "mesure_cassee", ventes: s };
}

/**
 * LA PHRASE AFFICHÉE, ÉCRITE ICI ET PAS DANS LE COMPOSANT.
 *
 * Une phrase enfermée dans du JSX n'est pas testable, donc elle n'est
 * pas testée, donc elle peut redevenir rassurante sans que personne ne
 * le voie. Celle ci doit rester une ALERTE.
 *
 * Aucun tiret long : c'est du texte que Béné lit.
 */
export function phraseCoherence(v: VerdictCoherence): string | null {
  if (v.etat !== "mesure_cassee") return null;
  const pluriel = v.ventes > 1 ? "ventes encaissées" : "vente encaissée";
  return (
    `${v.ventes} ${pluriel} et aucune vue mesurée : c'est la MESURE qui est cassée, ` +
    `pas le trafic. On ne vend pas à des gens qui ne sont jamais venus. ` +
    `Ne prends aucune décision sur ce chiffre tant que ce bandeau est là.`
  );
}
