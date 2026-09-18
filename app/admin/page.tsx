// app/admin/page.tsx
//
// L'ADMIN DE TIQUIZ N'EXISTE PLUS (Béné, 18 septembre 2026).
//
// "Oui tu peux enlever ça de l'admin, je veux tout suivre dans
// pilotage."
//
// C'était la cible depuis le 29 août, écrite dans `sections.ts` dans
// ses mots : "à terme on supprime les /admin de toutes les app pour
// tout gérer sur pilotage." Le 17 septembre, le suivi des ventes est
// parti ; le 18, les quatre dernières choses qui n'avaient pas
// d'équivalent dans la console l'ont rejointe :
//
//   - inviter quelqu'un et le contrôle des tags -> /pilotage/clients ;
//   - la gestion des revendeurs et leurs factures -> /pilotage/revendeurs ;
//   - la modération du blog -> /pilotage/support.
//
// -- ON N'A RIEN ÉTEINT SANS L'AVOIR REMPLACÉ -------------------------
//
// C'est la règle que `sections.ts` s'était donnée, et elle vaut dans
// les deux sens : une console incomplète ne remplace pas un admin, et
// un admin éteint dont le remplaçant manque laisse sans outil un jour
// où on en a besoin. `tests/logic/admin-tabs.test.mts` exige que chaque
// morceau parti soit ARRIVÉ quelque part.
//
// -- POURQUOI UNE REDIRECTION, ET PAS UNE SUPPRESSION ------------------
//
// Cette adresse est dans ses favoris, elle est citée dans de vieux
// emails d'alerte, et un 404 se lit comme une panne alors que tout
// fonctionne. La redirection est PERMANENTE : le navigateur finit par
// ne plus passer par ici.

import { permanentRedirect } from "next/navigation";

export default function AdminPage(): never {
  permanentRedirect("/pilotage");
}
