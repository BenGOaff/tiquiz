"use client";

// components/pilotage/TableauAffilies.tsx
//
// LE TABLEAU DES AFFILIÉS (Béné, 29 août 2026).
//
// "Je dois voir leur code ref, leur id sa si dispo, le nombre de clics
// qu'ils ont reçu, leur nombre d'affiliés, leurs commissions passées,
// présentes et futures."
//
// -- CE QUE LE HAUT PROMET, LE TABLEAU LE TIENT ------------------------
//
// Les trois montants du bandeau sont la SOMME des colonnes. Deux
// chiffres calculés séparément finissent toujours par se contredire, et
// c'est celui du haut qu'on croit (leçon du tableau des liens, 24 août).
//
// -- SUR MOBILE, DES CARTES ---------------------------------------------
//
// Un tableau de dix colonnes sur un téléphone se fait glisser sans
// jamais voir celle qui compte.
//
// -- ET ON NE MONTRE JAMAIS UN IBAN -------------------------------------
//
// La console dit ce qu'on DOIT à quelqu'un, jamais où l'argent part.

import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import type { EtatLiaison, LigneAffilieDistante } from "@/lib/pilotage/affilies";

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const ETIQUETTE_STATUT: Record<string, string> = {
  active: "actif",
  paused: "en pause",
  banned: "exclu",
};

export function TableauAffilies({
  lignes,
  etat,
}: {
  lignes: LigneAffilieDistante[];
  etat: EtatLiaison;
}) {
  const [recherche, setRecherche] = useState("");

  const vues = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return lignes;
    return lignes.filter((l) =>
      [l.email, l.nom, l.ref, l.sa, ...l.alias]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [lignes, recherche]);

  // LA SOMME DU TABLEAU AFFICHÉ, pas un total calculé ailleurs.
  const totaux = useMemo(
    () =>
      vues.reduce(
        (s, l) => ({
          aVerser: s.aVerser + l.aVerserCents,
          sousGarantie: s.sousGarantie + l.sousGarantieCents,
          versees: s.versees + l.verseesCents,
        }),
        { aVerser: 0, sousGarantie: 0, versees: 0 },
      ),
    [vues],
  );

  if (!etat.ok) {
    // UNE PANNE SE DIT. Un tableau vide se lirait "je n'ai aucun
    // affilié", ce qui est faux et décourageant.
    const phrase =
      etat.raison === "not_configured"
        ? "La liaison avec l'espace affilié n'est pas configurée sur ce serveur (PARTNER_SHARED_SECRET)."
        : etat.raison === "forbidden"
          ? "Les deux serveurs n'ont pas le même secret partagé. C'est un réglage, pas une panne."
          : "L'espace affilié n'a pas répondu. Rien n'est perdu, réessaie dans un instant.";
    return (
      <section className={`${CARTE} p-6`}>
        <p className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          Les affiliés ne sont pas lisibles pour le moment
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{phrase}</p>
      </section>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Bandeau titre="À verser" valeur={euros(totaux.aVerser)} note="garantie passée" />
        <Bandeau
          titre="Encore sous garantie"
          valeur={euros(totaux.sousGarantie)}
          note="30 jours après la vente"
        />
        <Bandeau titre="Déjà versé" valeur={euros(totaux.versees)} note="depuis le début" />
      </div>

      {etat.manque.clics && (
        <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-2 text-xs dark:bg-amber-950/20">
          Les clics n&apos;ont pas pu être comptés. La colonne affiche zéro, ce n&apos;est pas
          leur vraie valeur.
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Un nom, une adresse, un code"
            aria-label="Chercher un affilié"
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {vues.length} affilié{vues.length > 1 ? "s" : ""}
        </span>
      </div>

      {vues.length === 0 ? (
        // LE VIDE PARLE : sans un mot, il se lit "c'est cassé".
        <section className={`${CARTE} p-6`}>
          <p className="text-sm font-medium">
            {lignes.length === 0 ? "Aucun affilié pour l'instant." : "Personne ne correspond."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {lignes.length === 0
              ? "Ils apparaîtront ici dès qu'un compte existe dans le programme."
              : "Essaie une autre adresse, un autre nom, ou un identifiant Systeme.io."}
          </p>
        </section>
      ) : (
        <>
          {/* Desktop : le tableau. */}
          <section className={`${CARTE} hidden overflow-x-auto p-1 lg:block`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-normal">Affilié</th>
                  <th className="px-3 py-2 text-right font-normal">Clics</th>
                  <th className="px-3 py-2 text-right font-normal">Inscrits</th>
                  <th className="px-3 py-2 text-right font-normal">Ventes</th>
                  <th className="px-3 py-2 text-right font-normal">À verser</th>
                  <th className="px-3 py-2 text-right font-normal">Sous garantie</th>
                  <th className="px-3 py-2 text-right font-normal">Versé</th>
                </tr>
              </thead>
              <tbody>
                {vues.map((l) => (
                  <tr key={l.sa} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2">
                      <Identite l={l} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.clics.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.filleuls}
                      {l.tauxInscription !== null && (
                        <span className="block text-xs text-muted-foreground">
                          {l.tauxInscription} %
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.ventes}
                      {l.tauxVente !== null && (
                        <span className="block text-xs text-muted-foreground">{l.tauxVente} %</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {l.aVerserCents ? euros(l.aVerserCents) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {l.sousGarantieCents ? euros(l.sousGarantieCents) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {l.verseesCents ? euros(l.verseesCents) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Mobile : des cartes. Un tableau de sept colonnes sur un
              téléphone se fait glisser sans jamais voir celle qui
              compte. */}
          <div className="space-y-3 lg:hidden">
            {vues.map((l) => (
              <section key={l.sa} className={`${CARTE} p-4`}>
                <Identite l={l} />
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <Case cle="Clics" valeur={l.clics.toLocaleString("fr-FR")} />
                  <Case cle="Inscrits" valeur={String(l.filleuls)} />
                  <Case cle="Ventes" valeur={String(l.ventes)} />
                  <Case cle="À verser" valeur={euros(l.aVerserCents)} fort />
                  <Case cle="Sous garantie" valeur={euros(l.sousGarantieCents)} />
                  <Case cle="Versé" valeur={euros(l.verseesCents)} />
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Identite({ l }: { l: LigneAffilieDistante }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{l.nom ?? l.email}</p>
      <p className="truncate text-xs text-muted-foreground">{l.nom ? l.email : ""}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
        {l.ref ? (
          <code className="rounded bg-background px-1.5 py-0.5">?ref={l.ref}</code>
        ) : (
          // SANS CODE PUBLIC, IL N'A AUCUN LIEN UTILISABLE. Le dire est
          // la seule façon que ça se répare : un lien muet se partage,
          // et chaque partage est une vente perdue.
          <span className="font-medium text-amber-700 dark:text-amber-300">
            aucun code public
          </span>
        )}
        {l.statut !== "active" && (
          <span className="rounded-full border px-1.5 py-0.5 text-muted-foreground">
            {ETIQUETTE_STATUT[l.statut] ?? l.statut}
          </span>
        )}
        {l.alias.length > 0 && (
          <span className="text-muted-foreground" title={l.alias.join("\n")}>
            {l.alias.length} ancien identifiant{l.alias.length > 1 ? "s" : ""}
          </span>
        )}
        {l.autresDevises > 0 && (
          <span className="text-amber-700 dark:text-amber-300">
            {l.autresDevises} commission{l.autresDevises > 1 ? "s" : ""} en devise étrangère
          </span>
        )}
      </p>
    </div>
  );
}

function Case({ cle, valeur, fort }: { cle: string; valeur: string; fort?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{cle}</dt>
      <dd className={`tabular-nums ${fort ? "font-medium" : ""}`}>{valeur}</dd>
    </div>
  );
}

function Bandeau({ titre, valeur, note }: { titre: string; valeur: string; note: string }) {
  return (
    <div className={`${CARTE} p-4`}>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valeur}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
