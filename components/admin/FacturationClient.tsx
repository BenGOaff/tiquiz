"use client";

// components/admin/FacturationClient.tsx
//
// LA FACTURATION D'UN CLIENT, SUR SA FICHE.
//
// Béné, 24 août : "dans la fiche contact de mes clients j'ai aussi
// besoin de savoir : l'entreprise (si concerné), l'adresse, le pays, la
// tva (si concerné), prénom, nom, adresse email (...) et que je puisse
// mettre à jour si demande du client."
//
// LES MÊMES CHAMPS QUE LE CLIENT VOIT (`ChampsFacturation`), et c'est
// tout l'intérêt : quand il appelle pour faire corriger son adresse,
// Béné regarde exactement le même formulaire que lui.
//
// CE QUE MODIFIER NE FAIT PAS : ça ne touche aucune facture déjà émise.
// Une facture émise ne se modifie pas ; une erreur se corrige par un
// avoir suivi d'une nouvelle facture. L'écran le DIT, sinon on croit
// avoir corrigé une pièce qui n'a pas bougé.

import { useState } from "react";
import { toast } from "sonner";

import ChampsFacturation, {
  ACHETEUR_FORM_VIDE,
  type ChampsAcheteur,
} from "@/components/facturation/ChampsFacturation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface FactureVue {
  numero: string;
  genre: "facture" | "avoir";
  libelle: string;
  currency: string;
  totalCents: number;
  htCents: number;
  tvaCents: number;
  tvaTauxBp: number;
  issuedAt: string;
  aCompleter: string[];
}

/** Ce qui manque, dit en français. Le serveur renvoie des raisons. */
const MOTS: Record<string, string> = {
  nom: "le nom",
  adresse: "l'adresse",
  ville: "le code postal et la ville",
  pays: "le pays",
  "tva-a-valider-vies": "le numéro de TVA reste à valider sur VIES",
  "tva-numero-invalide": "le numéro de TVA n'a pas la forme attendue pour ce pays",
};

function euros(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format(cents / 100);
}

function jour(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "-"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d);
}

export default function FacturationClient({
  email,
  facturation,
  manques,
  factures,
  onEnregistre,
}: {
  email: string;
  facturation: ChampsAcheteur | null;
  manques: string[];
  factures: FactureVue[];
  onEnregistre?: () => void;
}) {
  const [valeur, setValeur] = useState<ChampsAcheteur>(facturation ?? ACHETEUR_FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  async function enregistrer() {
    setEnvoi(true);
    try {
      const r = await fetch(`/api/admin/clients/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facturation: valeur }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
      if (!j.ok) {
        toast.error(`Enregistrement refusé (${j.reason ?? "raison inconnue"}).`);
        return;
      }
      toast.success("Facturation mise à jour.");
      onEnregistre?.();
    } catch {
      toast.error("La connexion a coupé avant d'enregistrer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Facturation
          </p>
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {ouvert ? "Replier" : "Modifier"}
          </button>
        </div>

        {/* CE QUI MANQUE SE VOIT, sinon on émet des factures incomplètes
            sans jamais le savoir. */}
        {manques.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
            Il manque {manques.map((m) => MOTS[m] ?? m).join(", ")}.
          </p>
        )}

        {!ouvert ? (
          <div className="text-muted-foreground">
            {valeur.societe && <p className="font-medium text-foreground">{valeur.societe}</p>}
            <p>{[valeur.prenom, valeur.nom].filter(Boolean).join(" ") || "Nom non renseigné"}</p>
            {valeur.adresse1 && <p>{valeur.adresse1}</p>}
            {valeur.adresse2 && <p>{valeur.adresse2}</p>}
            <p>{[valeur.codePostal, valeur.ville].filter(Boolean).join(" ")}</p>
            {valeur.pays && <p>{valeur.pays}</p>}
            {valeur.tvaNumero && <p>TVA {valeur.tvaNumero}</p>}
            {valeur.email && valeur.email !== email && <p>Factures envoyées à {valeur.email}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <ChampsFacturation valeur={valeur} onChange={setValeur} montrerEmail />
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={() => void enregistrer()} disabled={envoi}>
                {envoi ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Vaut pour les prochaines factures. Une facture déjà émise ne se modifie pas :
                elle se corrige par un avoir suivi d&apos;une nouvelle facture.
              </p>
            </div>
          </div>
        )}

        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Factures émises
          </p>
          {factures.length === 0 ? (
            <p className="text-muted-foreground">
              Aucune facture émise par nous. Les paiements par carte sont facturés par Stripe :
              ces factures là vivent dans le tableau de bord Stripe.
            </p>
          ) : (
            <ul className="divide-y">
              {factures.map((f) => (
                <li key={f.numero} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="font-mono text-xs">{f.numero}</span>
                  <span className="text-muted-foreground">{jour(f.issuedAt)}</span>
                  <span className="flex-1 truncate">{f.libelle}</span>
                  <span className="font-semibold">{euros(f.totalCents, f.currency)}</span>
                  {f.aCompleter.length > 0 && (
                    <span
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
                      title={f.aCompleter.map((m) => MOTS[m] ?? m).join(", ")}
                    >
                      à vérifier
                    </span>
                  )}
                  <a
                    href={`/facture/${encodeURIComponent(f.numero)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Voir
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
