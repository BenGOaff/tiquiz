// components/landing/blocsVente.tsx
//
// SES BLOCS DE LA PAGE V2, SERVIS SUR LA LANDING.
//
// Béné, 5 septembre 2026 : "'c'est pas pour toi si' -> on a créé un
// mini quiz pourquoi tu ne le reprends pas ??"
//
// Elle a raison : le mini quiz de qualification existe depuis le
// 2 septembre (`content/sales/v2/cest-pour-toi.html`), elle l'a relu
// trois fois, il pose UNE question à la fois, il sait dire non, et il
// ne porte AUCUN script. La landing, elle, avait une liste à puces à
// la place. Une liste, ce n'est pas un quiz.
//
// -- DEUX CORRECTIONS, ET LE FICHIER LES EXIGE ------------------------
//
// Le bloc a été écrit pour SA page, donc il porte deux choses qui n'ont
// pas de sens ici. On les corrige au moment de le lire, et la lecture
// REFUSE si une correction ne trouve rien : une correction qui ne mord
// pas est une correction qu'on croit appliquée (leçon de la FAQ,
// 4 septembre).
//
// -- ET IL N'EXISTE QU'EN FRANÇAIS ------------------------------------
//
// C'est sa page, elle est écrite en français. La landing, elle, se sert
// en deux langues. On ne traduit donc PAS le bloc (ce serait une
// deuxième version à tenir, qui divergerait) : la version anglaise
// garde la liste écrite dans `lib/site/landing.ts`. Le jour où elle
// veut la landing anglaise complète, c'est une décision, pas un oubli.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Ce qu'on réécrit dans le bloc, et pourquoi.
 *
 * `cherche` doit être trouvé, sinon la lecture s'arrête : le bloc a
 * bougé et personne ne l'aurait su.
 */
const CORRECTIONS: readonly { cherche: string; remplace: string; pourquoi: string }[] = [
  {
    // Sur sa page, les deux boutons du verdict mènent à l'ancre de sa
    // section tarifs. Cette ancre n'existe pas sur la landing : le lien
    // ne ferait rien du tout, sur l'écran qui vient de dire oui.
    cherche: '#section-518f489a',
    remplace: "#tarifs",
    pourquoi: "l'ancre des tarifs de sa page n'existe pas sur la landing",
  },
  {
    // Sa règle du 4 septembre : au moins 100 px en haut et en bas de
    // chaque section, y compris sur téléphone. Son bloc descend à 60.
    cherche: "tqv-pt-sec{padding:60px 16px}",
    remplace: "tqv-pt-sec{padding:100px 16px}",
    pourquoi: "sa règle des 100 px de haut et de bas, mobile compris",
  },
];

const cache = new Map<string, string>();

export function BlocVente({ nom }: { nom: "cest-pour-toi" }) {
  let html = cache.get(nom);
  if (html === undefined) {
    html = readFileSync(join(process.cwd(), "content/sales/v2", `${nom}.html`), "utf8");
    for (const c of CORRECTIONS) {
      if (!html.includes(c.cherche)) {
        throw new Error(
          `Le bloc ${nom} ne porte plus "${c.cherche}" : ${c.pourquoi}. ` +
            "Relire content/sales/v2 avant de retirer la correction.",
        );
      }
      html = html.split(c.cherche).join(c.remplace);
    }
    cache.set(nom, html);
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
