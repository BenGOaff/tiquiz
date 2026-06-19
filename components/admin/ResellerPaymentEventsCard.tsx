"use client";

// components/admin/ResellerPaymentEventsCard.tsx
//
// Suivi des paiements revendeurs pour Bene : voir ou / comment / pourquoi
// un paiement a echoue, sans ouvrir de console. Affichage interne (FR).

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Event = {
  id: number;
  reseller_id: string | null;
  reseller_name: string | null;
  provider: string | null;
  stage: string;
  event: string;
  ok: boolean;
  email: string | null;
  plan: string | null;
  detail: string | null;
  created_at: string;
};

export default function ResellerPaymentEventsCard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorsOnly, setErrorsOnly] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reseller-payment-events${errorsOnly ? "?errors=1" : ""}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (json.ok) setEvents(json.events ?? []);
    } catch {
      /* silencieux */
    } finally {
      setLoading(false);
    }
  }, [errorsOnly]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold">Suivi des paiements revendeurs</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={errorsOnly}
                onChange={(e) => setErrorsOnly(e.target.checked)}
              />
              Erreurs seulement
            </label>
            <button
              type="button"
              onClick={fetchEvents}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rafraichir
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Aucun evenement de paiement pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Revendeur</th>
                  <th className="px-2 py-2 font-medium">Etape</th>
                  <th className="px-2 py-2 font-medium">Statut</th>
                  <th className="px-2 py-2 font-medium">Client</th>
                  <th className="px-2 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b last:border-0 ${e.ok ? "" : "bg-red-50"}`}
                  >
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-2 py-2">{e.reseller_name ?? "?"}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{e.event}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.stage}
                        {e.provider ? ` - ${e.provider}` : ""}
                        {e.plan ? ` - ${e.plan}` : ""}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {e.ok ? (
                        <Badge className="bg-green-100 text-green-700 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          OK
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Echec
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{e.email ?? "-"}</td>
                    <td className="px-2 py-2 text-muted-foreground max-w-[280px]">
                      {e.detail ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
