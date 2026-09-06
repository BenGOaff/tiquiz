// components/landing/faq.ts
//
// LA FAQ DE SA PAGE DE VENTE, LUE SUR LE DISQUE.
//
// Béné, 4 septembre 2026 : "et la FAQ bordel tu as déjà tout sur la page
// de vente : pourquoi tu ne reproduis pas ??"
//
// `npm run faq:extraire` lit le `FAQPage` en données structurées de
// `content/sales/tiquiz.html` et les cinq groupes de `lib/sales/faqV2.ts`,
// puis écrit `content/faq-vente.json`. Ce module le sert.
//
// -- POURQUOI `fs` ET PAS UN `import` DE JSON -----------------------
//
// `import faq from "...json"` compile très bien avec Next, et le runner
// de tests natif le REFUSE : Node exige `with { type: "json" }`. Le test
// de la landing est sorti rouge là dessus. On lit donc le fichier, une
// fois par processus.
//
// -- ET POURQUOI ICI, PAS DANS `lib/site/landing.ts` ----------------
//
// Un module qui touche au disque n'est plus chargeable par le runner,
// donc plus testé (règle du 1er août). `lib/site/landing.ts` reste PUR
// et gardé par `tests/logic/landing.test.mts` ; la lecture vit ici, à
// côté de `anims.tsx` qui lit déjà des fichiers.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { GroupeQuestions } from "@/lib/site/landing";

let cache: readonly GroupeQuestions[] | null = null;

export function faqDeLaPageDeVente(): readonly GroupeQuestions[] {
  if (cache) return cache;
  const brut = readFileSync(join(process.cwd(), "content/faq-vente.json"), "utf8");
  const doc = JSON.parse(brut) as {
    groupes: { titre: string; questions: { q: string; r: string }[] }[];
  };
  cache = doc.groupes;
  return cache;
}
