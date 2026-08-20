"use client";

// app/admin/ventes/VentesClient.tsx
//
// LE TABLEAU DES VENTES, ET LE BOUTON QUI REMBOURSE.
//
// -- UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN -----------
//
// Règle du 3 août, et ici elle compte double : Béné clique sur
// Rembourser, et si rien ne se passe elle ne peut pas savoir si l'argent
// est parti ou pas. Elle recommencerait, et rembourserait deux fois.
// Chaque raison du serveur a donc sa phrase, et la plus probable
// (permission manquante sur la clé) dit exactement quoi faire.
//
// -- ON DEMANDE CONFIRMATION ------------------------------------------
//
// Un bouton qui rend de l'argent au premier clic n'a rien à faire dans
// un tableau où les lignes se ressemblent. La confirmation nomme la
// personne et le montant : c'est le seul moment où une erreur de ligne
// peut encore être rattrapée.

import { useCallback, useEffect, useState } from "react";

interface Vente {
  ref: string;
  provider: "stripe" | "paypal";
  email: string | null;
  name: string | null;
  productId: string | null;
  amountCents: number;
  currency: string;
  paidAt: string;
  refundedAt: string | null;
}

/** Les raisons du serveur, traduites ici et nulle part ailleurs. */
const RAISONS: Record<string, string> = {
  forbidden: "Tu n'as pas les droits sur cette page.",
  invalid_body: "Demande illisible.",
  not_configured:
    "Le moyen de paiement n'est pas branché sur ce serveur. Rien n'a bougé.",
  missing_permission:
    "Ta clé Stripe n'a pas le droit de rembourser. Dans Stripe, ouvre ta clé restreinte et passe Remboursements en Écriture. Rien n'a été remboursé.",
  provider_refused:
    "Le fournisseur a refusé le remboursement. Rien n'a été remboursé, regarde le détail dans son tableau de bord.",
  network: "La connexion a coupé. Rien n'a été remboursé.",
  read_failed: "Impossible de lire tes ventes.",
};

function euros(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function jour(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function VentesClient() {
  const [ventes, setVentes] = useState<Vente[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const r = await fetch("/api/admin/ventes");
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        ventes?: Vente[];
        reason?: string;
      };
      if (!data.ok || !data.ventes) {
        setErreur(RAISONS[data.reason ?? ""] ?? "Impossible de lire tes ventes.");
        setVentes([]);
        return;
      }
      setVentes(data.ventes);
    } catch {
      setErreur("La connexion a coupé avant de charger tes ventes.");
      setVentes([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const rembourser = useCallback(
    async (v: Vente) => {
      const qui = v.email ?? v.ref;
      if (
        !window.confirm(
          `Rembourser ${euros(v.amountCents, v.currency)} à ${qui} ?\n\n` +
            `L'accès sera coupé automatiquement et la personne recevra ton email d'au revoir.`,
        )
      ) {
        return;
      }
      setEnCours(v.ref);
      setErreur(null);
      setMessage(null);
      try {
        const r = await fetch("/api/admin/ventes/rembourser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: v.ref, provider: v.provider }),
        });
        const data = (await r.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
        if (!data.ok) {
          setErreur(RAISONS[data.reason ?? ""] ?? "Le remboursement n'a pas pu se faire.");
          return;
        }
        setMessage(
          `Remboursement envoyé à ${qui}. L'accès se coupe et l'email part dans quelques secondes, ` +
            `quand ${v.provider === "stripe" ? "Stripe" : "PayPal"} nous confirme.`,
        );
        await charger();
      } catch {
        setErreur("La connexion a coupé. Rien n'a été remboursé.");
      } finally {
        setEnCours(null);
      }
    },
    [charger],
  );

  if (ventes === null) {
    return <p className="text-sm text-muted-foreground">Chargement de tes ventes...</p>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </p>
      )}
      {erreur && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {erreur}
        </p>
      )}

      {ventes.length === 0 && !erreur && (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune vente pour l&apos;instant. Cette liste se remplit toute seule à partir des
          confirmations de Stripe et de PayPal.
        </p>
      )}

      {ventes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">Client</th>
                <th className="px-4 py-2 font-semibold">Montant</th>
                <th className="px-4 py-2 font-semibold">Moyen</th>
                <th className="px-4 py-2 font-semibold">État</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {ventes.map((v) => (
                <tr key={v.ref} className="border-t align-middle">
                  <td className="whitespace-nowrap px-4 py-3">{jour(v.paidAt)}</td>
                  <td className="px-4 py-3">
                    {v.email ?? <span className="text-muted-foreground">adresse inconnue</span>}
                    {v.productId && (
                      <span className="block text-xs text-muted-foreground">{v.productId}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {euros(v.amountCents, v.currency)}
                  </td>
                  <td className="px-4 py-3">{v.provider === "stripe" ? "Carte" : "PayPal"}</td>
                  <td className="px-4 py-3">
                    {v.refundedAt ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        Remboursé le {jour(v.refundedAt)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                        Payé
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!v.refundedAt && (
                      <button
                        type="button"
                        onClick={() => rembourser(v)}
                        disabled={enCours === v.ref}
                        className="rounded-md border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                      >
                        {enCours === v.ref ? "En cours..." : "Rembourser"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Cette liste est construite à partir des confirmations reçues de Stripe et de PayPal. Une
        vente qui n&apos;y figure pas n&apos;est jamais arrivée jusqu&apos;à nous.
      </p>
    </div>
  );
}
