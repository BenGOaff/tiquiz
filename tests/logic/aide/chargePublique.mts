// tests/logic/aide/chargePublique.mts
//
// OU VIT LE CHARGEMENT PUBLIC D'UN QUIZ, CHERCHE ET PAS RECOPIE.
//
// Trois tests figeaient le chemin `app/api/quiz/[quizId]/public/route.ts`
// pour y verifier des FAITS qui n'ont rien a voir avec ce fichier : que
// la colonne du jour vit dans le select qui peut echouer, que la reponse
// passe par la reecriture des images. Le 9 septembre 2026 cette logique a
// demenage dans `lib/quiz/chargerQuizPublic.ts` pour que la page publique
// et la route appellent LA MEME fonction, et les trois tests sont sortis
// ROUGES sur une correction juste.
//
// C'est la lecon deja payee par `pageDuSite.mts` : **un chemin sur disque
// n'est pas un fait**. On CHERCHE donc le module qui porte le
// chargement, et on refuse les deux cas qui comptent : introuvable (il a
// vraiment disparu), ou trouve deux fois (deux implementations, donc deux
// reponses possibles pour le meme quiz).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const RACINE = fileURLToPath(new URL("../../..", import.meta.url));

/** Le marqueur : la fonction qui construit ce qu'un visiteur recoit. */
const MARQUEUR = "export async function chargerQuizPublic(";

function fichiers(dossier: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dossier)) {
    if (e === "node_modules" || e === ".next" || e === ".git") continue;
    const p = join(dossier, e);
    if (statSync(p).isDirectory()) fichiers(p, acc);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

function trouver(): string {
  const candidats = [join(RACINE, "lib"), join(RACINE, "app")]
    .flatMap((d) => fichiers(d))
    .filter((p) => readFileSync(p, "utf8").includes(MARQUEUR));
  if (candidats.length === 0) {
    throw new Error(
      `Aucun module ne porte "${MARQUEUR}" : le chargement public d'un quiz a disparu ou a ete renomme.`,
    );
  }
  if (candidats.length > 1) {
    throw new Error(
      `DEUX implementations du chargement public : ${candidats.join(", ")}. ` +
        "Deux calculs pour le meme quiz finissent toujours par ne plus dire la meme chose.",
    );
  }
  return readFileSync(candidats[0], "utf8");
}

/** La source du module qui construit la charge publique d'un quiz. */
export const SOURCE_CHARGE_PUBLIQUE = trouver();
