"use client";

// components/admin/WebhookLogsCard.tsx
//
// LES DERNIERS APPELS DE SYSTEME.IO, LISIBLES SANS OUVRIR SUPABASE.
//
// Drame Ivan (7 août 2026) : un client paie, son compte reste en gratuit,
// et pour comprendre il fallait répondre à UNE question : est-ce que
// l'appel de Systeme.io est arrivé jusqu'à nous ?
//
//   ligne présente et refusée -> le bon de commande n'est pas reconnu,
//     c'est la table de routage qu'il faut compléter ;
//   aucune ligne pour cette vente -> le webhook n'est pas posé sur ce bon
//     de commande, et aucune ligne de code ne peut le rattraper.
//
// Les deux se corrigent à des endroits opposés. Affichage interne, FR.

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  demandeUneAction,
  routageConcerne,
  type CallKind,
  type CallVerdict,
  type ChampNumerique,
} from "@/lib/admin/webhookRows";

type Row = {
  id: string;
  source: string | null;
  eventType: string | null;
  status: string | null;
  error: string | null;
  receivedAt: string;
  email: string | null;
  sourceUrl: string | null;
  offerId: string | null;
  kind: CallKind;
  planNow: string | null;
  verdict: CallVerdict;
  montantCents: number | null;
  montantSource: "payload" | "plan" | "inconnu";
  planNom: string | null;
  champsNumeriques: ChampNumerique[];
};

/**
 * CE QUE CHAQUE VERDICT VEUT DIRE, EN CLAIR.
 *
 * Le serveur rend un code, l'écran écrit la phrase. Et la COULEUR compte
 * autant que le mot : avant le 22 août, tout ce qui portait une trace
 * d'erreur virait au rouge, y compris un paiement refusé chez Systeme.io
 * (la carte du client, pas nous) et un refus corrigé depuis. Un écran où
 * tout est rouge est un écran qu'on arrête de lire.
 */
const VERDICTS: Record<CallVerdict, { mot: string; aide: string; ton: "ok" | "info" | "alerte" }> = {
  ouvert: { mot: "accès ouvert", aide: "", ton: "ok" },
  "palier-a-confirmer": {
    mot: "accès ouvert, palier à confirmer",
    aide: "Le client a ses accès. Le palier vient d'un repli : vérifie s'il a pris l'annuel ou un PLUS.",
    ton: "info",
  },
  "sans-acces": {
    mot: "sans accès",
    aide: "Cette personne attend quelque chose qu'elle n'a pas. Le bon de commande n'est toujours pas reconnu.",
    ton: "alerte",
  },
  "corrige-depuis": {
    mot: "corrigé depuis",
    aide: "Refusé sur le moment, mais le routage d'aujourd'hui sait répondre. Vérifie juste que la personne a bien ses accès.",
    ton: "info",
  },
  "paiement-echoue": {
    mot: "paiement refusé",
    aide: "La carte du client a été refusée chez Systeme.io. Rien à corriger chez nous.",
    ton: "info",
  },
  panne: { mot: "panne", aide: "On a planté sur cet appel.", ton: "alerte" },
  "sans-objet": { mot: "traité", aide: "", ton: "ok" },
};

const TONS: Record<"ok" | "info" | "alerte", string> = {
  ok: "text-emerald-700",
  info: "text-muted-foreground",
  alerte: "text-destructive",
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function quandFr(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

export default function WebhookLogsCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [problemesSeuls, setProblemesSeuls] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/webhook-logs?limit=60", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setRows(json.rows ?? []);
    } catch {
      /* silencieux : cet écran est un outil de diagnostic, pas un flux critique */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const aRegarder = (r: Row) => demandeUneAction(r.verdict);
  const affiches = problemesSeuls ? rows.filter(aRegarder) : rows;
  const nbProblemes = rows.filter(aRegarder).length;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Webhook className="w-4 h-4 text-primary shrink-0" />
          <h2 className="font-semibold text-sm flex-1">Appels Systeme.io reçus</h2>
          {nbProblemes > 0 && (
            <Badge variant="destructive" className="text-xs">
              {nbProblemes} sans accès ouvert
            </Badge>
          )}
          <button
            type="button"
            onClick={() => setProblemesSeuls((v) => !v)}
            className="text-xs px-2 py-1 rounded border hover:bg-muted"
          >
            {problemesSeuls ? "Tout afficher" : "Problèmes seulement"}
          </button>
          <button
            type="button"
            onClick={charger}
            className="text-xs px-2 py-1 rounded border hover:bg-muted inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Rafraîchir
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Une vente absente de cette liste n&apos;est jamais arrivée jusqu&apos;à Tiquiz : le
          webhook n&apos;est pas posé sur ce bon de commande. Une vente présente mais refusée
          veut dire l&apos;inverse : l&apos;appel arrive, c&apos;est le bon de commande qui
          n&apos;est pas reconnu. Seules les lignes en rouge demandent une action de ta part.
        </p>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-4 h-4 animate-spin inline" />
          </div>
        ) : affiches.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {problemesSeuls ? "Aucun appel en échec." : "Aucun appel reçu pour l'instant."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1 pr-3 font-medium">Reçu</th>
                  <th className="py-1 pr-3 font-medium">Email</th>
                  <th className="py-1 pr-3 font-medium">Événement</th>
                  <th className="py-1 pr-3 font-medium">Tunnel</th>
                  <th className="py-1 pr-3 font-medium">Offre</th>
                  <th className="py-1 pr-3 font-medium">Montant</th>
                  <th className="py-1 pr-3 font-medium">Plan reconnu</th>
                  <th className="py-1 font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {affiches.map((r) => {
                  const v = VERDICTS[r.verdict];
                  const ko = demandeUneAction(r.verdict);
                  return (
                    <tr key={r.id} className="border-t align-top">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{quandFr(r.receivedAt)}</td>
                      <td className="py-1.5 pr-3">{r.email ?? "-"}</td>
                      <td className="py-1.5 pr-3">{r.eventType ?? "-"}</td>
                      <td className="py-1.5 pr-3 max-w-[220px] truncate" title={r.sourceUrl ?? ""}>
                        {r.sourceUrl ?? "-"}
                      </td>
                      <td className="py-1.5 pr-3 max-w-[160px] truncate" title={r.offerId ?? ""}>
                        {r.offerId ?? "-"}
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {/* LE MONTANT, ET CE QU'ON FAIT QUAND IL MANQUE.
                            Un 0,00 € affiché sur une vraie vente est un
                            mensonge : on dit qu'on ne l'a pas reçu, et on
                            montre plus bas les nombres que le payload
                            porte vraiment. */}
                        {r.montantCents == null ? (
                          r.kind === "sale" ? (
                            <span className="text-amber-700">non transmis</span>
                          ) : (
                            "-"
                          )
                        ) : r.montantSource === "payload" ? (
                          euros(r.montantCents)
                        ) : (
                          <span className="text-muted-foreground" title={r.planNom ?? ""}>
                            ~ {euros(r.montantCents)}
                            <span className="block text-[10px]">tarif du plan</span>
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {/* Ce que le routage répondrait AUJOURD'HUI. Sur une
                            ligne refusée hier, ça dit si le correctif déployé
                            depuis suffit, sans refaire un achat.
                            Un optin gratuit ne passe PAS par cette table :
                            lui reprocher un tunnel absent de la liste serait
                            une alerte rouge sur un compte créé normalement. */}
                        {!routageConcerne(r.kind) ? (
                          <span className="text-muted-foreground">sans objet</span>
                        ) : r.planNow ? (
                          <span className="text-emerald-700">{r.planNow}</span>
                        ) : (
                          <span className="text-destructive">non reconnu</span>
                        )}
                      </td>
                      <td className="py-1.5">
                        <span
                          className={`inline-flex items-center gap-1 ${TONS[v.ton]}`}
                          title={v.aide || r.error || ""}
                        >
                          {v.ton === "alerte" ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {v.mot}
                        </span>
                        {ko && v.aide && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
                            {v.aide}
                          </div>
                        )}
                        {r.champsNumeriques.length > 0 && (
                          <div className="text-[11px] text-muted-foreground mt-1 max-w-[260px]">
                            Nombres reçus :{" "}
                            {r.champsNumeriques
                              .map((c) => `${c.chemin}=${c.valeur}`)
                              .join(", ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
