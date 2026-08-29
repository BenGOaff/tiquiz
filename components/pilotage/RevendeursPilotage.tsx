"use client";

// components/pilotage/RevendeursPilotage.tsx
//
// LES REVENDEURS (Béné, 29 août 2026).
//
// "Il me manque les revendeurs de Tiquiz ? Tu n'as pas pensé à les
// créer ?" Non, et c'était un oubli grossier : un revendeur porte un
// portefeuille de comptes payants et une facture tous les mois.
//
// -- CE QUI DEMANDE UNE ACTION EST EN HAUT ----------------------------
//
// Une facture impayée est de l'argent qui n'est pas rentré, et un
// revendeur à deux licences du palier suivant est un appel à passer.
// L'ordre vient de `trierRevendeurs`, pas d'ici.
//
// -- ET ON N'AGIT PAS ENCORE DEPUIS CET ÉCRAN -------------------------
//
// Promouvoir quelqu'un, suspendre, marquer une facture payée : ça vit
// toujours dans `/admin`, et la carte le DIT. Un bouton absent sans un
// mot se lit comme un bug, et elle a déjà perdu du temps à chercher
// celui de remboursement (22 août).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, Search } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import type { LigneRevendeur, ResumeRevendeurs } from "@/lib/pilotage/revendeurs";
import { estActif } from "@/lib/pilotage/revendeurs";

interface Reponse {
  ok?: boolean;
  lignes?: LigneRevendeur[];
  resume?: ResumeRevendeurs;
  manque?: { factures: boolean; portefeuilles: boolean };
  reason?: string;
}

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function periodeFr(p: string | null): string {
  if (!p) return "aucune facture";
  const [a, m] = p.split("-");
  if (!a || !m) return p;
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(a), Number(m) - 1, 1)));
}

export function RevendeursPilotage() {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/pilotage/revendeurs", { cache: "no-store" });
      setData((await res.json()) as Reponse);
    } catch {
      setData({ ok: false, reason: "unreachable" });
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const lignes = data?.lignes ?? [];
  const r = data?.resume;
  const q = recherche.trim().toLowerCase();
  const vues = q
    ? lignes.filter(
        (l) =>
          String(l.name ?? "").toLowerCase().includes(q) ||
          String(l.email ?? "").toLowerCase().includes(q),
      )
    : lignes;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Revendeurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qui revend Tiquiz, la taille de son portefeuille, son taux, et ce qu&apos;il reste à
          encaisser. Cet écran ne suit pas le filtre de période.
        </p>
      </div>

      {!data?.ok && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Les revendeurs n&apos;ont pas pu être lus.
          {data?.reason === "forbidden"
            ? " Ton compte n'est pas reconnu comme administrateur."
            : " Ce n'est pas parce qu'il n'y en a aucun."}
        </p>
      )}

      {data?.ok && r && (
        <>
          {/* LES QUATRE CHIFFRES. Ce sont la SOMME du tableau, jamais un
              second calcul : deux chiffres calculés séparément finissent
              par se contredire, et c'est celui du haut qu'on croit. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Chiffre titre="Revendeurs actifs" valeur={String(r.actifs)} note={r.suspendus > 0 ? `${r.suspendus} suspendu${r.suspendus > 1 ? "s" : ""}` : undefined} />
            <Chiffre
              titre="Licences"
              valeur={String(r.licences)}
              note={`sur ${r.comptes} compte${r.comptes > 1 ? "s" : ""} au total`}
            />
            <Chiffre
              titre="À encaisser"
              valeur={euros(r.impayeCents)}
              note={
                r.nbImpayees > 0
                  ? `${r.nbImpayees} facture${r.nbImpayees > 1 ? "s" : ""} en attente`
                  : "tout est payé"
              }
              alerte={r.impayeCents > 0}
            />
            <Chiffre titre="Déjà encaissé" valeur={euros(r.encaisseCents)} note="factures réglées" />
          </div>

          {data.manque?.factures && (
            // UN TABLEAU DE FACTURES VIDE parce que la table manque est
            // indiscernable d'un revendeur à jour de tout.
            <p className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Les factures n&apos;ont pas pu être lues : les montants ci-dessus sont à zéro
                parce qu&apos;on n&apos;a rien pu regarder, pas parce que tout est payé.
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Un nom, une adresse"
                aria-label="Chercher un revendeur"
                className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {vues.length} revendeur{vues.length > 1 ? "s" : ""}
            </span>
          </div>

          {vues.length === 0 ? (
            // LE VIDE PARLE : sans un mot, il se lit "c'est cassé".
            <section className={`${CARTE} p-6`}>
              <p className="text-sm font-medium">
                {lignes.length === 0 ? "Aucun revendeur pour le moment." : "Personne ne correspond."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {lignes.length === 0 ? (
                  <>
                    Un revendeur se promeut depuis{" "}
                    <Link href="/admin" className="text-primary underline-offset-2 hover:underline">
                      l&apos;onglet Revendeurs de l&apos;admin
                    </Link>
                    , à partir d&apos;un compte Tiquiz existant.
                  </>
                ) : (
                  "Essaie une autre adresse."
                )}
              </p>
            </section>
          ) : (
            <ul className="space-y-3">
              {vues.map((l) => (
                <li key={l.id} className={`${CARTE} p-4`}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{l.name ?? l.email ?? "Sans nom"}</span>
                    {!estActif(l.status) && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        suspendu
                      </span>
                    )}
                    {l.impayeCents > 0 && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        {euros(l.impayeCents)} à encaisser
                      </span>
                    )}
                    {l.email && (
                      <Link
                        href={`/pilotage/clients/${encodeURIComponent(l.email)}`}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Sa fiche
                      </Link>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      dernière facture : {periodeFr(l.dernierePeriode)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                    <Detail
                      libelle="Licences"
                      valeur={String(l.licenceCount)}
                      note={`${l.freeCount} en gratuit`}
                    />
                    <Detail libelle="Son taux" valeur={`${l.currentRate} %`} />
                    <Detail libelle="Encaissé" valeur={euros(l.encaisseCents)} />
                    <Detail
                      libelle="Prochain palier"
                      valeur={
                        l.prochainPalier
                          ? `${l.prochainPalier.manque} licence${l.prochainPalier.manque > 1 ? "s" : ""}`
                          : "au dernier"
                      }
                      note={
                        l.prochainPalier
                          ? `passerait à ${l.prochainPalier.taux} %`
                          : "plus de palier au dessus"
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* CE QUI SE FAIT ENCORE AILLEURS, ET C'EST DIT. Un bouton
              absent sans un mot se lit comme un bug. */}
          <p className="text-xs text-muted-foreground">
            Promouvoir un revendeur, le suspendre ou marquer une facture payée se fait encore
            dans{" "}
            <Link href="/admin" className="text-primary underline-offset-2 hover:underline">
              l&apos;onglet Revendeurs de l&apos;admin de Tiquiz
              <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

function Chiffre({
  titre,
  valeur,
  note,
  alerte,
}: {
  titre: string;
  valeur: string;
  note?: string;
  alerte?: boolean;
}) {
  return (
    <div className={`${CARTE} p-4`}>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${alerte ? "text-destructive" : ""}`}
      >
        {valeur}
      </p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Detail({ libelle, valeur, note }: { libelle: string; valeur: string; note?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{libelle}</p>
      <p className="font-medium tabular-nums">{valeur}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
