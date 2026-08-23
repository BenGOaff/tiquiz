"use client";

// components/facturation/MesInfosFacturation.tsx
//
// LE CLIENT VOIT SES INFOS ET SES FACTURES, ET IL LES MET À JOUR.
//
// Béné, 24 août : "lui aussi doit avoir ces infos et pouvoir les mettre
// à jour."
//
// -- CE QUE L'ÉCRAN DOIT DIRE, ET QUE PERSONNE NE DIT JAMAIS -----------
//
// Qu'une modification vaut pour les factures À VENIR. Sans cette phrase,
// quelqu'un qui corrige son adresse s'attend à voir ses anciennes
// factures changer, ne voit rien changer, et conclut que le bouton ne
// marche pas (exactement le scénario de Jocelyne sur la taille de
// police, 1er août : le menu affichait la nouvelle valeur, l'écran
// gardait l'ancienne).
//
// -- LES FACTURES STRIPE NE SONT PAS ICI, ET ON LE DIT ------------------
//
// Stripe émet les siennes et les garde dans son portail client, qui est
// déjà branché juste au dessus. Les recopier chez nous donnerait deux
// numérotations pour une seule comptabilité. Cette liste est donc celle
// des factures QU'ON A ÉMISES : les ventes PayPal, et les pièces créées
// à la main.

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import ChampsFacturation, {
  ACHETEUR_FORM_VIDE,
  type ChampsAcheteur,
} from "@/components/facturation/ChampsFacturation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LigneFactureVue {
  numero: string;
  genre: "facture" | "avoir";
  libelle: string;
  currency: string;
  totalCents: number;
  issuedAt: string;
}

export default function MesInfosFacturation() {
  const t = useTranslations("facturation");
  const locale = useLocale();
  const [valeur, setValeur] = useState<ChampsAcheteur>(ACHETEUR_FORM_VIDE);
  const [factures, setFactures] = useState<LigneFactureVue[]>([]);
  const [manquants, setManquants] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/compte/mes-infos");
      const j = (await r.json()) as {
        ok?: boolean;
        facturation?: ChampsAcheteur | null;
        manques?: string[];
        factures?: LigneFactureVue[];
      };
      if (j.ok) {
        setValeur(j.facturation ?? ACHETEUR_FORM_VIDE);
        setManquants(j.manques ?? []);
        setFactures(j.factures ?? []);
      }
    } catch {
      // Un écran vide vaut mieux qu'un écran qui ment : on ne remplit
      // rien plutôt que d'afficher des cases fausses.
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer() {
    setEnvoi(true);
    try {
      const r = await fetch("/api/compte/mes-infos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facturation: valeur }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; manques?: string[] };
      // Un `ok: false` produit TOUJOURS quelque chose à l'écran (3 août).
      if (!j.ok) {
        toast.error(t("saveFailed"));
        return;
      }
      setManquants(j.manques ?? []);
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setEnvoi(false);
    }
  }

  const argent = (cents: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: (currency || "eur").toUpperCase(),
    }).format(cents / 100);

  const jour = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "-"
      : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div>
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* CE QUI MANQUE SE DIT AVANT, PAS APRÈS.
            Une facture émise sans adresse n'est plus rattrapable sans
            avoir : autant demander pendant que la personne est là. */}
        {!chargement && manquants.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {t("incomplete")}
          </p>
        )}

        {chargement ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <>
            <ChampsFacturation valeur={valeur} onChange={setValeur} locale={locale} montrerEmail />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void enregistrer()} disabled={envoi}>
                {envoi ? t("saving") : t("save")}
              </Button>
              {/* LA PHRASE QUI ÉVITE LE MALENTENDU. */}
              <p className="text-xs text-muted-foreground">{t("futureOnly")}</p>
            </div>
          </>
        )}

        <div className="border-t pt-4">
          <h4 className="mb-2 text-sm font-semibold">{t("invoicesTitle")}</h4>
          {factures.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("invoicesEmpty")}</p>
          ) : (
            <ul className="divide-y text-sm">
              {factures.map((f) => (
                <li key={f.numero} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="font-mono">{f.numero}</span>
                  <span className="text-muted-foreground">{jour(f.issuedAt)}</span>
                  <span className="flex-1 truncate">{f.libelle}</span>
                  <span className="font-semibold">{argent(f.totalCents, f.currency)}</span>
                  {/* Nouvel onglet : partir lire une facture ne doit pas
                      faire perdre ce qu'on est en train de modifier
                      au dessus (règle du 24 août). */}
                  <a
                    href={`/facture/${encodeURIComponent(f.numero)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("invoiceOpen")}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("invoicesStripeNote")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
