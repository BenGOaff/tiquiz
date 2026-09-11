// lib/affiliate/filetCommissionStore.ts
//
// LES ÉCRITURES du filet de commission (`commissions_en_attente`) et le
// REJEU. Aucune décision ici : elles vivent dans `filetCommission.ts`,
// pur et testé. Ce module importe `supabaseAdmin`, donc aucun test ne
// peut le charger (règle du 1er août).
//
// Rien ici ne jette : un filet qui ferait échouer le webhook qu'il
// protège serait pire que pas de filet.

import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { alerterAdmins } from "@/lib/email/alerteAdmin";

import {
  alerterALaMiseEnAttente,
  classerEchec,
  cleEnAttente,
  doitRejouer,
  type ActionCommission,
  type LigneEnAttente,
} from "./filetCommission";
import { posterVersTipote } from "./posterTipote";

const TABLE = "commissions_en_attente";

/**
 * Range un appel qui vient d'échouer, pour le rejouer plus tard.
 *
 * `statut` est celui de la réponse de Tipote, `null` quand le réseau a
 * lâché. Une ligne déjà présente pour cette clé voit son compteur
 * monter, jamais son corps changer : c'est l'appel d'ORIGINE qu'on
 * rejoue, pas une version réécrite.
 */
export async function mettreEnAttente(args: {
  action: ActionCommission;
  reference: string;
  corps: unknown;
  statut: number | null;
  detail: string;
}): Promise<void> {
  const cle = cleEnAttente(args.action, args.reference);
  const classe = classerEchec(args.statut);
  const erreur = `${args.statut ?? "reseau"} ${classe.motif} : ${args.detail}`.slice(0, 500);
  try {
    const { data: existante } = await supabaseAdmin
      .from(TABLE)
      .select("tentatives, envoye_le")
      .eq("cle", cle)
      .maybeSingle();
    const deja = (existante ?? null) as { tentatives: number; envoye_le: string | null } | null;
    if (deja?.envoye_le) return; // déjà passée : rien à rejouer
    const tentatives = (deja?.tentatives ?? 0) + 1;
    const { error } = await supabaseAdmin.from(TABLE).upsert(
      {
        cle,
        action: args.action,
        corps: args.corps,
        tentatives,
        rejouable: classe.rejouable,
        derniere_erreur: erreur,
        derniere_tentative: new Date().toISOString(),
        ...(deja ? {} : { cree_le: new Date().toISOString() }),
      },
      { onConflict: "cle" },
    );
    if (error) {
      // La migration n'est peut être pas passée : on le CRIE, avec le
      // corps, pour que la ligne du journal suffise à rejouer à la main.
      console.error(
        `[commission] filet INDISPONIBLE (${error.message}) : ${cle} n'est PAS en attente. ` +
          `Corps : ${JSON.stringify(args.corps).slice(0, 800)}`,
      );
      return;
    }
    console.error(`[commission] ${cle} mise en attente (tentative ${tentatives}) : ${erreur}`);
    if (alerterALaMiseEnAttente(tentatives)) {
      await alerterAdmins({
        subject: `Commission en attente : Tipote n'a pas répondu (${args.reference})`,
        html:
          `<p>L'appel vers le registre d'affiliés de Tipote a échoué sur <strong>${echapper(args.reference)}</strong> ` +
          `(action : ${args.action}).</p>` +
          `<p>Réponse : ${echapper(erreur)}</p>` +
          `<p>Rien n'est perdu : l'appel est rangé dans <code>commissions_en_attente</code> et sera rejoué ` +
          `tel quel toutes les dix minutes, à chaque webhook de paiement et à chaque passage du cron ` +
          `<code>/api/cron/rejouer-commissions</code>. Si ce message revient sur d'autres ventes, ` +
          `c'est Tipote ou son secret qu'il faut regarder, pas cette vente.</p>`,
        text:
          `L'appel vers Tipote a échoué sur ${args.reference} (${args.action}) : ${erreur}. ` +
          `Il est en attente et sera rejoué tel quel.`,
        refId: "commission-en-attente",
      });
    }
  } catch (e) {
    console.error(
      `[commission] filet en panne sur ${cle} : ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/** Une ligne en attente qui vient de passer : on la garde, datée. */
export async function marquerEnvoyee(action: ActionCommission, reference: string): Promise<void> {
  try {
    await supabaseAdmin
      .from(TABLE)
      .update({ envoye_le: new Date().toISOString() })
      .eq("cle", cleEnAttente(action, reference))
      .is("envoye_le", null);
  } catch {
    // Une ligne restée "en attente" après un succès serait rejouée, et
    // Tipote répondrait `duplicate` : sans conséquence.
  }
}

export interface BilanRejeu {
  lisible: boolean;
  raison?: string;
  rejouees: number;
  echecs: number;
  /** Lignes encore en attente après ce passage (rejouables ou non). */
  restantes: number;
}

/**
 * Rejoue les lignes en attente qui sont mûres (`doitRejouer`), au plus
 * `max` par passage. Appelé après chaque webhook de paiement (donc sans
 * cron, tant qu'il y a des ventes) et par `/api/cron/rejouer-commissions`.
 *
 * "Je n'ai pas pu regarder" (`lisible: false`) n'est pas "il n'y a
 * rien" : un écran qui afficherait zéro sur une panne de lecture ferait
 * croire que tout est passé.
 */
export async function rejouerCommissionsEnAttente(args: {
  maintenant?: Date;
  max?: number;
}): Promise<BilanRejeu> {
  const maintenant = args.maintenant ?? new Date();
  const max = args.max ?? 10;
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("cle, action, corps, tentatives, rejouable, derniere_tentative, envoye_le")
      .is("envoye_le", null)
      .order("cree_le", { ascending: true })
      .limit(200);
    if (error) return { lisible: false, raison: error.message, rejouees: 0, echecs: 0, restantes: 0 };
    const lignes = (data ?? []) as unknown as LigneEnAttente[];
    const mures = lignes.filter((l) => doitRejouer(l, maintenant)).slice(0, max);

    let rejouees = 0;
    let echecs = 0;
    for (const ligne of mures) {
      const reponse = await posterVersTipote(ligne.action, ligne.corps);
      if (reponse.ok) {
        rejouees += 1;
        await supabaseAdmin
          .from(TABLE)
          .update({ envoye_le: new Date().toISOString(), tentatives: ligne.tentatives + 1 })
          .eq("cle", ligne.cle);
        console.log(`[commission] rejeu reussi : ${ligne.cle} (${JSON.stringify(reponse.json).slice(0, 200)})`);
        continue;
      }
      echecs += 1;
      const classe = classerEchec(reponse.statut);
      await supabaseAdmin
        .from(TABLE)
        .update({
          tentatives: ligne.tentatives + 1,
          rejouable: classe.rejouable,
          derniere_erreur: `${reponse.statut ?? "reseau"} ${classe.motif} : ${reponse.detail}`.slice(0, 500),
          derniere_tentative: new Date().toISOString(),
        })
        .eq("cle", ligne.cle);
      console.error(`[commission] rejeu echoue : ${ligne.cle} (${reponse.statut ?? "reseau"}) ${reponse.detail}`);
    }
    return { lisible: true, rejouees, echecs, restantes: lignes.length - rejouees };
  } catch (e) {
    return {
      lisible: false,
      raison: e instanceof Error ? e.message : String(e),
      rejouees: 0,
      echecs: 0,
      restantes: 0,
    };
  }
}

function echapper(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
