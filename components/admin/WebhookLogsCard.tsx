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
  planNow: string | null;
};

/** Un appel qui n'a PAS ouvert d'accès mérite l'oeil. */
function estProblematique(r: Row): boolean {
  return r.status === "refused" || r.status === "error" || !!r.error;
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

  const affiches = problemesSeuls ? rows.filter(estProblematique) : rows;
  const nbProblemes = rows.filter(estProblematique).length;

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
          n&apos;est pas reconnu.
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
                  <th className="py-1 pr-3 font-medium">Plan reconnu</th>
                  <th className="py-1 font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {affiches.map((r) => {
                  const ko = estProblematique(r);
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
                      <td className="py-1.5 pr-3">
                        {/* Ce que le routage répondrait AUJOURD'HUI. Sur une
                            ligne refusée hier, ça dit si le correctif déployé
                            depuis suffit, sans refaire un achat. */}
                        {r.planNow ? (
                          <span className="text-emerald-700">{r.planNow}</span>
                        ) : (
                          <span className="text-destructive">non reconnu</span>
                        )}
                      </td>
                      <td className="py-1.5">
                        <span
                          className={`inline-flex items-center gap-1 ${ko ? "text-destructive" : "text-emerald-700"}`}
                          title={r.error ?? ""}
                        >
                          {ko ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {r.status ?? "-"}
                        </span>
                        {r.error && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 max-w-[220px] truncate">
                            {r.error}
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
