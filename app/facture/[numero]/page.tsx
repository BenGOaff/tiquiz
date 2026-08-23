// app/facture/[numero]/page.tsx
//
// LA FACTURE, TELLE QU'ELLE S'IMPRIME.
//
// -- POURQUOI UNE PAGE ET PAS UN PDF -----------------------------------
//
// Une facture électronique n'a pas à être un PDF : ce qui compte, c'est
// son contenu, sa numérotation et le fait qu'elle ne change plus. Cette
// page rend exactement ce qui a été FIGÉ dans la table au moment de
// l'émission, et le navigateur sait l'enregistrer en PDF depuis
// n'importe quel appareil. Ajouter un moteur PDF, c'est une dépendance
// de plus dans `npm ci`, un binaire à embarquer dans la sortie
// standalone, et un chemin de plus qui peut casser en production sans
// casser en local (leçon `pdf-parse`, 7 août).
//
// -- QUI PEUT LA VOIR --------------------------------------------------
//
// La personne dont c'est la facture, et les admins. Le numéro est
// devinable (`TQ-2026-0007`), donc il ne protège rien : la garde est la
// session, jamais l'adresse de la page.

import { notFound, redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/adminEmails";
import { formatMontant } from "@/lib/facture/construire";
import { lignesAdresse, lireAcheteur, type Vendeur } from "@/lib/facture/identite";
import { factureParNumero } from "@/lib/facture/store";
import { formatTaux } from "@/lib/facture/tva";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facture", robots: { index: false, follow: false } };

function jour(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "-"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(d);
}

export default async function FacturePage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { numero } = await params;
  const f = await factureParNumero(decodeURIComponent(numero));
  if (!f) notFound();

  const sienne = f.email_cle === user.email.trim().toLowerCase();
  if (!sienne && !isAdminEmail(user.email)) notFound();

  const acheteur = lireAcheteur(f.acheteur);
  const v = (f.vendeur ?? {}) as Partial<Vendeur>;
  const avoir = f.genre === "avoir";

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-[13px] leading-relaxed text-neutral-900 print:p-0">
      {/* La consigne ne s'imprime pas : elle n'a rien à faire sur la
          pièce. Et c'est une PHRASE, pas un bouton : `window.print()`
          demanderait de passer toute la page en composant client pour
          économiser un raccourci que tout le monde connaît. */}
      <p className="mb-6 text-right text-xs text-neutral-500 print:hidden">
        Pour enregistrer en PDF : Ctrl+P (Cmd+P sur Mac), puis « Enregistrer au format PDF ».
      </p>

      <header className="mb-8 flex items-start justify-between gap-8">
        <div>
          <h1 className="text-xl font-bold">{avoir ? "Avoir" : "Facture"}</h1>
          <p className="mt-1 font-mono text-base">{f.numero}</p>
          <p className="mt-1 text-neutral-600">Émise le {jour(f.issued_at)}</p>
          {f.paid_at && <p className="text-neutral-600">Payée le {jour(f.paid_at)}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold">
            {v.denomination} {v.forme}
          </p>
          <p className="whitespace-pre-line text-neutral-700">{v.adresse}</p>
          <p className="text-neutral-700">Capital {v.capital}</p>
          <p className="text-neutral-700">RCS {v.rcs}</p>
          <p className="text-neutral-700">TVA {v.tva}</p>
          <p className="text-neutral-700">{v.email}</p>
        </div>
      </header>

      <section className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Facturé à
        </p>
        {lignesAdresse(acheteur).map((l, i) => (
          <p key={i}>{l}</p>
        ))}
        {acheteur.tvaNumero && <p className="text-neutral-700">TVA {acheteur.tvaNumero}</p>}
        {acheteur.email && <p className="text-neutral-700">{acheteur.email}</p>}
      </section>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y">
            <th className="py-2 font-semibold">Désignation</th>
            <th className="py-2 text-right font-semibold">Montant HT</th>
            <th className="py-2 text-right font-semibold">TVA</th>
            <th className="py-2 text-right font-semibold">Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-3">{f.libelle}</td>
            <td className="py-3 text-right">{formatMontant(f.ht_cents, f.currency)}</td>
            <td className="py-3 text-right">
              {formatTaux(f.tva_taux_bp)}
              <br />
              <span className="text-neutral-600">{formatMontant(f.tva_cents, f.currency)}</span>
            </td>
            <td className="py-3 text-right font-semibold">
              {formatMontant(f.total_cents, f.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <table className="text-right">
          <tbody>
            <tr>
              <td className="pr-6 py-0.5 text-neutral-600">Total HT</td>
              <td className="py-0.5">{formatMontant(f.ht_cents, f.currency)}</td>
            </tr>
            <tr>
              <td className="pr-6 py-0.5 text-neutral-600">
                TVA {formatTaux(f.tva_taux_bp)}
              </td>
              <td className="py-0.5">{formatMontant(f.tva_cents, f.currency)}</td>
            </tr>
            <tr className="border-t">
              <td className="pr-6 py-1 font-semibold">Total TTC</td>
              <td className="py-1 font-semibold">{formatMontant(f.total_cents, f.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* La mention légale figée avec la facture. Les règles changent, la
          pièce émise ne change pas. */}
      {f.tva_mention && (
        <p className="mt-6 border-t pt-4 text-neutral-700">{f.tva_mention}</p>
      )}

      <footer className="mt-8 border-t pt-4 text-xs text-neutral-600">
        <p>
          {avoir
            ? "Avoir émis en annulation de la facture référencée. Aucun montant n'est dû."
            : "Facture acquittée. Aucun escompte pour paiement anticipé."}
        </p>
        <p className="mt-1">
          Pénalités de retard : trois fois le taux d&apos;intérêt légal. Indemnité forfaitaire
          pour frais de recouvrement : 40 €.
        </p>
      </footer>
    </main>
  );
}
