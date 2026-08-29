// app/pilotage/affilies/page.tsx
//
// QUI RECOMMANDE QUOI, ET COMBIEN JE LEUR DOIS.
//
// Cette route STATIQUE gagne sur la route dynamique `[section]` : la
// section "à venir" disparaît d'elle même, sans qu'on retire une ligne
// là-bas. C'est ce qui permet de remplacer les anciens écrans un par un
// sans jamais laisser un trou.

import type { Metadata } from "next";

import { lireAffiliesDistants } from "@/lib/pilotage/affilies";
import { TableauAffilies } from "@/components/pilotage/TableauAffilies";

export const metadata: Metadata = { title: "Affiliés" };
export const dynamic = "force-dynamic";

export default async function PilotageAffiliesPage() {
  const { lignes, etat } = await lireAffiliesDistants();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Affiliés</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qui recommande quoi, et combien je leur dois.
        </p>
      </div>
      <TableauAffilies lignes={lignes} etat={etat} />
    </div>
  );
}
