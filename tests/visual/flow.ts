// tests/visual/flow.ts
//
// Avancer d'un écran du viewer, sans jamais cligner.
//
// -- POURQUOI (1er puis 4 août 2026) ----------------------------------
//
// Deuxième flottement du filet visuel, même famille que le premier. Le
// 1er août, une capture sortait rouge puis verte au retry parce que la
// hauteur de page n'était pas stabilisée ; corrigé par `settle()`. Le
// 4 août, `result-beats-bounds` est sorti rouge puis vert au retry en
// attendant 60 secondes un écran de question qui n'est jamais venu.
//
// La cause est la même à la racine : on agissait sur un écran qui
// n'était pas encore prêt. Ici, le bouton "Commencer le quiz" existe
// dans le HTML rendu côté serveur AVANT que React n'ait attaché son
// gestionnaire de clic. Playwright voit un élément parfaitement
// cliquable, clique... et il ne se passe rien, puisqu'il n'y a encore
// personne à l'écoute. Le test attend alors un écran qui ne viendra
// jamais. Que ça passe ou non dépend de la charge de la machine, donc
// c'est vert en local et rouge une fois sur dix en intégration.
//
// **Un test qui clignote est pire que pas de test** : on prend
// l'habitude de relancer, et le jour où il a raison on relance aussi.
//
// D'où `advance()` : on clique, on vérifie que l'écran suivant est bien
// arrivé, et si non on reclique. Ce n'est pas un `waitForTimeout`
// déguisé : la condition de sortie est l'écran attendu, pas une durée.

import { expect, type Page } from "@playwright/test";

/**
 * Clique sur `label` jusqu'à ce que `nextLabel` apparaisse.
 *
 * Le premier clic peut tomber avant l'hydratation React et rester sans
 * effet ; les suivants n'ont plus ce problème. En régime normal, une
 * seule tentative suffit et la fonction rend la main immédiatement.
 */
export async function advance(page: Page, label: string, nextLabel: string): Promise<void> {
  await expect(page.getByText(label).first()).toBeVisible();
  await expect(async () => {
    await page.getByText(label).first().click({ timeout: 2000 });
    await expect(page.getByText(nextLabel).first()).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
}
