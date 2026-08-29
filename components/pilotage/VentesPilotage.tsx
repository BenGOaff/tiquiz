"use client";

// components/pilotage/VentesPilotage.tsx
//
// "QUI A ACHETÉ QUOI QUAND COMMENT VIA QUI COMBIEN IL PAYE ET QUAND"
// (Béné, 29 août 2026).
//
// Chaque mot de sa phrase est une colonne, et une seule manquait
// vraiment : "via qui", parce que l'affiliation vit sur l'autre base.
//
// -- CETTE PAGE SUIT LA PÉRIODE, l'annuaire des clients non -----------
//
// Une liste de ventes est un relevé : elle DOIT se lire sur un
// intervalle. Un annuaire de personnes, non, sinon il cacherait les
// anciens. Les deux écrans ne se comportent pas pareil, et chacun le
// dit.
//
// -- CE QUI EST REMBOURSÉ RESTE VISIBLE -------------------------------
//
// Marqué, jamais retiré : une vente remboursée a eu lieu, et c'est
// exactement ce qu'on veut voir passer.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import { NOM_PRODUIT, readSaleProduct } from "@/lib/admin/saleProduct";
import type { Sale } from "@/lib/checkout/sales";

type LigneVente = { vente: Sale; email: string; nom: string | null };

type Donnees = {
  resume: { toutesVentes: LigneVente[]; totalVentesPeriode: number; encaisseCents: number; rembourseCents: number };
  periode: { libelle: string };
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function quand(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "2-digit" })
    .format(new Date(t));
}

const MOYEN: Record<string, string> = {
  stripe: "Carte",
  paypal: "PayPal",
  systeme_io: "Systeme.io",
  manual: "À la main",
};

export function VentesPilotage({
  attributions,
  affiliesLisibles,
}: {
  attributions: Record<string, string>;
  affiliesLisibles: boolean;
}) {
  const params = useSearchParams();
  const query = params?.toString() ?? "";
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [combien, setCombien] = useState(50);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/pilotage${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (!j?.ok) {
        setErreur("Les ventes n'ont pas pu être lues.");
        return;
      }
      setD(j as Donnees);
      setErreur(null);
    } catch {
      setErreur("Les ventes n'ont pas pu être lues.");
    }
  }, [query]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const vues = useMemo(() => {
    const lignes = d?.resume.toutesVentes ?? [];
    const q = recherche.trim().toLowerCase();
    if (!q) return lignes;
    return lignes.filter((l) =>
      [l.email, l.nom, l.vente.productId, attributions[l.email.toLowerCase()]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [d, recherche, attributions]);

  if (!d && !erreur) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Ventes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {d ? d.periode.libelle : "Qui a acheté quoi, quand, comment, via qui."}
        </p>
      </div>

      {erreur && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Bandeau titre="Encaissé" valeur={euros(d.resume.encaisseCents)} />
            <Bandeau titre="Remboursé" valeur={euros(d.resume.rembourseCents)} />
            <Bandeau titre="Ventes" valeur={String(d.resume.totalVentesPeriode)} />
          </div>

          {!affiliesLisibles && (
            // ON DIT CE QU'ON N'A PAS PU LIRE. Une colonne vide serait
            // indiscernable de "aucune vente n'est venue d'un affilié".
            <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-2 text-xs dark:bg-amber-950/20">
              L&apos;espace affilié n&apos;a pas répondu : la colonne
              &quot;via&quot; est vide, ce n&apos;est pas la preuve qu&apos;aucune vente ne vient
              d&apos;un affilié.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Une adresse, un produit, un affilié"
                aria-label="Chercher une vente"
                className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {vues.length} ligne{vues.length > 1 ? "s" : ""}
            </span>
          </div>

          {vues.length === 0 ? (
            <section className={`${CARTE} p-6`}>
              <p className="text-sm font-medium">
                {(d.resume.toutesVentes.length ?? 0) === 0
                  ? "Aucune vente sur cette période."
                  : "Aucune vente ne correspond."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {(d.resume.toutesVentes.length ?? 0) === 0
                  ? "Change la période en haut à droite pour regarder ailleurs."
                  : "Essaie une autre adresse, un autre produit."}
              </p>
            </section>
          ) : (
            <>
              <section className={`${CARTE} divide-y`}>
                {vues.slice(0, combien).map((l) => {
                  const via = attributions[l.email.toLowerCase()];
                  return (
                    <div key={`${l.vente.ref}-${l.vente.paidAt}`} className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <Link
                          href={`/pilotage/clients/${encodeURIComponent(l.email)}`}
                          className="min-w-0 truncate text-sm font-medium hover:underline"
                        >
                          {l.nom ?? l.email}
                        </Link>
                        <span
                          className={`shrink-0 text-sm tabular-nums ${l.vente.refundedAt ? "text-muted-foreground line-through" : "font-medium"}`}
                        >
                          {euros(l.vente.amountCents)}
                        </span>
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{NOM_PRODUIT[readSaleProduct(l.vente)]}</span>
                        <span>·</span>
                        <span>{quand(l.vente.paidAt)}</span>
                        <span>·</span>
                        <span>{MOYEN[l.vente.provider] ?? l.vente.provider}</span>
                        {via && (
                          <>
                            <span>·</span>
                            <span className="text-primary">via {via}</span>
                          </>
                        )}
                        {l.vente.amountSource === "plan" && (
                          // Le montant vient du TARIF du plan, pas de la
                          // somme encaissée : une remise ne serait pas
                          // déduite. Le dire est la seule façon qu'un
                          // écart avec la banque ne reste pas mystérieux.
                          <>
                            <span>·</span>
                            <span>montant estimé</span>
                          </>
                        )}
                        {l.vente.refundedAt && (
                          <>
                            <span>·</span>
                            <span className="text-amber-700 dark:text-amber-300">
                              remboursée le {quand(l.vente.refundedAt)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  );
                })}
              </section>

              {vues.length > combien && (
                <button
                  type="button"
                  onClick={() => setCombien((n) => n + 100)}
                  className="w-full rounded-lg border py-2 text-sm hover:bg-accent"
                >
                  Voir 100 de plus ({vues.length - combien} restantes)
                </button>
              )}

              {/* LA LISTE EST BORNÉE, LE COMPTEUR NE L'EST PAS. Une
                  liste coupée en silence fait croire qu'on a tout vu. */}
              {d.resume.totalVentesPeriode > d.resume.toutesVentes.length && (
                <p className="text-xs text-muted-foreground">
                  {d.resume.totalVentesPeriode} ventes sur la période, les{" "}
                  {d.resume.toutesVentes.length} plus récentes sont listées. Les totaux du haut,
                  eux, portent sur toutes.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Bandeau({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className={`${CARTE} p-4`}>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{valeur}</p>
    </div>
  );
}
