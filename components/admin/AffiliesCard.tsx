"use client";

// components/admin/AffiliesCard.tsx
//
// QUI VEND, COMBIEN, ET CE QUE TU DOIS SORTIR.
//
// Trois chiffres en haut, la liste des affiliées en dessous, les mois
// derrière. Rien d'autre : "que des trucs utiles et rapides à piloter".
//
// -- AUCUN CALCUL ICI --------------------------------------------------
//
// Les montants, le cycle des commissions et le net vivent dans
// `lib/admin/affiliatePayouts.ts`, testé. Ce fichier affiche.

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  AffiliateLine,
  AffiliateMonth,
  AffiliatePayouts,
} from "@/lib/admin/affiliatePayouts";
import type { SourceReason } from "@/lib/admin/affiliateSources";

/**
 * Pourquoi une moitié manque, en une phrase qui nomme la correction.
 *
 * Le serveur renvoie une RAISON, l'écran sait comment la dire.
 */
const RAISONS: Record<string, string> = {
  not_configured: "PARTNER_SHARED_SECRET n'est pas posé sur le serveur Tiquiz.",
  forbidden: "Les serveurs n'ont pas le même PARTNER_SHARED_SECRET.",
  unreachable: "Le serveur n'a pas répondu.",
  read_failed: "Le serveur a répondu une erreur.",
};

const NOM_SOURCE: Record<string, string> = {
  tiquiz: "Tiquiz",
  atelier: "l'Atelier",
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    (Number(cents) || 0) / 100,
  );
}

function jour(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/** "2026-08" -> "août 2026". */
function moisLisible(cle: string): string {
  const [a, m] = cle.split("-").map((n) => parseInt(n, 10));
  if (!a || !m) return cle;
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(a, m - 1, 1)),
  );
}

interface Reponse extends Partial<AffiliatePayouts> {
  ok?: boolean;
  sources?: Record<string, { reachable?: boolean; reason?: SourceReason; truncated?: boolean }>;
  reason?: string;
}

export default function AffiliesCard() {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/affilies");
      const j = (await res.json()) as Reponse;
      setData(j);
      // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE A L'ECRAN.
      if (!j.ok) toast.error("Les commissions affiliées n'ont pas pu être chargées.");
    } catch {
      setData({ ok: false });
      toast.error("Les commissions affiliées n'ont pas pu être chargées.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const affiliates: AffiliateLine[] = data?.affiliates ?? [];
  const months: AffiliateMonth[] = data?.months ?? [];
  const totals = data?.totals ?? null;
  const manquantes = Object.entries(data?.sources ?? {}).filter(([, s]) => !s?.reachable);
  const moisCourant = months[0] ?? null;

  return (
    <div className="space-y-4">
      {/* ── UNE MOITIÉ MANQUE : ON LE DIT AVANT LES CHIFFRES ──
          Regle du 8 juin : on n'affiche pas un total dont le
          denominateur ment. "Tu dois 240 EUR" alors qu'une moitie
          manque est pire que pas de chiffre : ca a l'air juste, et on le
          provisionne. */}
      {manquantes.length > 0 && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-rose-900">
              <AlertTriangle className="size-4" aria-hidden />
              Les montants ci dessous sont INCOMPLETS
            </p>
            {manquantes.map(([nom, s]) => (
              <p key={nom} className="mt-1 text-xs text-rose-900">
                Les commissions de {NOM_SOURCE[nom] ?? nom} manquent.{" "}
                {RAISONS[s?.reason ?? ""] ?? "La liaison n'a pas abouti."}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── LES TROIS CHIFFRES ── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                À verser
              </p>
              <p className="text-2xl font-bold">{euros(totals?.payableCents ?? 0)}</p>
              <p className="text-xs text-muted-foreground">garantie passée</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Encore sous garantie
              </p>
              <p className="text-lg font-semibold">{euros(totals?.guaranteeCents ?? 0)}</p>
              <p className="text-xs text-muted-foreground">
                30 jours après la vente, peut encore sauter
              </p>
            </div>
            {moisCourant && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Il te reste, sur {moisLisible(moisCourant.key)}
                </p>
                <p className="text-lg font-semibold">{euros(moisCourant.netCents)}</p>
                <p className="text-xs text-muted-foreground">
                  {euros(moisCourant.salesCents)} vendus, {euros(moisCourant.commissionCents)} de
                  commissions
                </p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void charger()}
              disabled={chargement}
              className="ml-auto"
            >
              {chargement ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Rafraîchir
            </Button>
          </div>
          {totals && totals.paidCents > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Déjà versé : {euros(totals.paidCents)}
              {totals.refundedCents > 0 &&
                `  ·  annulé par des remboursements : ${euros(totals.refundedCents)}`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── QUI VEND ── */}
      <Card>
        <CardContent className="py-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Users className="size-4" aria-hidden />
            {totals?.sellers === 1
              ? "1 affiliée a vendu"
              : `${totals?.sellers ?? 0} affiliées ont vendu`}
          </p>

          {affiliates.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {chargement ? "Chargement..." : "Aucune vente affiliée pour l'instant."}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-3 font-semibold">Affiliée</th>
                    <th className="pb-2 pr-3 font-semibold">Ventes</th>
                    <th className="pb-2 pr-3 font-semibold">Encaissé</th>
                    <th className="pb-2 pr-3 font-semibold">À lui verser</th>
                    <th className="pb-2 pr-3 font-semibold">Sous garantie</th>
                    <th className="pb-2 pr-3 font-semibold">Déjà versé</th>
                    <th className="pb-2 font-semibold">Dernière vente</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((a) => (
                    <tr key={a.sa} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-semibold">{a.name || a.email || a.sa}</span>
                        {a.name && a.email && (
                          <span className="block text-xs text-muted-foreground">{a.email}</span>
                        )}
                        <span className="mt-1 flex flex-wrap gap-1">
                          {a.sources.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px]">
                              {NOM_SOURCE[s] ?? s}
                            </Badge>
                          ))}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{a.salesCount}</td>
                      <td className="py-2 pr-3">{euros(a.salesCents)}</td>
                      <td className="py-2 pr-3 font-semibold">{euros(a.payableCents)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {a.guaranteeCents > 0 ? euros(a.guaranteeCents) : "-"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {a.paidCents > 0 ? euros(a.paidCents) : "-"}
                      </td>
                      <td className="py-2 text-muted-foreground">{jour(a.lastSaleAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── LES MOIS, ET CE QU'IL TE RESTE ── */}
      {months.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-bold">Mois par mois</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-3 font-semibold">Mois</th>
                    <th className="pb-2 pr-3 font-semibold">Ventes</th>
                    <th className="pb-2 pr-3 font-semibold">Encaissé</th>
                    <th className="pb-2 pr-3 font-semibold">Commissions</th>
                    <th className="pb-2 font-semibold">Il te reste</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.key} className="border-b last:border-0">
                      <td className="py-2 pr-3">{moisLisible(m.key)}</td>
                      <td className="py-2 pr-3">{m.salesCount}</td>
                      <td className="py-2 pr-3">{euros(m.salesCents)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {euros(m.commissionCents)}
                      </td>
                      <td className="py-2 font-semibold">{euros(m.netCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Ces chiffres ne comptent QUE les ventes venues d&apos;une affiliée. Ton chiffre
              d&apos;affaires complet est plus haut, dans le pilotage.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
