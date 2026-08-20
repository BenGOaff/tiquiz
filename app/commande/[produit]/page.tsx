// app/commande/[produit]/page.tsx
//
// LE BON DE COMMANDE TIQUIZ, PLEINE PAGE.
//
// Jumeau de celui de l'Atelier. Deux différences, et elles se voient à
// l'écran :
//
// 1. **Ce sont des abonnements**, donc la page dit clairement la
//    récurrence et le fait qu'on peut arrêter quand on veut. Un prix
//    mensuel affiché comme un prix unique est la meilleure façon de
//    récolter des demandes de remboursement le mois suivant.
// 2. **Il y a quatre paliers**, donc la page montre les trois autres en
//    bas. Quelqu'un qui arrive sur le mensuel et voulait l'annuel ne
//    doit pas avoir à revenir en arrière pour le trouver.
//
// Fermé tant que ce n'est pas annoncé : même porte que la page de vente
// (`?k=`). Sans la clé, 404, on ne dit même pas que la page existe.
//
// Le prix vient du catalogue et n'est JAMAIS réécrit ici : un prix
// affiché à un endroit et facturé à un autre est la faute la plus
// coûteuse qu'une page de commande puisse commettre.

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  OWNER_CATALOG,
  OWNER_PRODUCT_ORDER,
  findOwnerProduct,
  formatOwnerPrice,
  ownerBillingKey,
} from "@/lib/checkout/catalog";
import { readOwnerStripe, readOwnerStripePublishable } from "@/lib/checkout/ownerAccount";
import { isSalesPreviewOpen } from "@/lib/sales/previewGate";
import CommandeClient from "./CommandeClient";

export const dynamic = "force-dynamic";

/** Jamais indexé : c'est un tunnel de paiement, pas une page de contenu. */
export const metadata = {
  robots: { index: false, follow: false },
};

/** La récurrence, dite en toutes lettres. */
const RECURRENCE: Record<string, string> = {
  monthly: "par mois, sans engagement",
  yearly: "par an, sans engagement",
  once: "paiement unique",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { produit } = await params;
  const { k } = await searchParams;

  if (!isSalesPreviewOpen(k, process.env)) notFound();

  const product = findOwnerProduct(produit);
  if (!product) notFound();

  const cle = String(k ?? "");

  // Les deux clés doivent parler du MÊME monde. Une clé secrète live avec
  // une clé publiable test (ou l'inverse) donne un formulaire qui refuse
  // la session sans dire pourquoi : moitié de configuration, écran muet.
  const publiable = readOwnerStripePublishable(process.env);
  const secrete = readOwnerStripe(process.env);
  const modesDiscordants = !!publiable && !!secrete && publiable.mode !== secrete.mode;
  const autres = OWNER_PRODUCT_ORDER.filter((id) => id !== product.id).map(
    (id) => OWNER_CATALOG[id],
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ta commande
            </p>
            <h1 className="mt-2 text-3xl font-bold">{product.label}</h1>
            <p className="mt-3 text-4xl font-bold">
              {formatOwnerPrice(product)}{" "}
              <span className="text-base font-medium text-muted-foreground">
                {RECURRENCE[ownerBillingKey(product)]}
              </span>
            </p>
          </div>

          <ul className="space-y-3 text-sm">
            {[
              "Tes quiz en ligne, sur ton domaine, avec ton branding.",
              "Tes leads capturés et envoyés vers ton outil d'emailing.",
              "Les statistiques qui disent où tes visiteurs décrochent.",
            ].map((ligne) => (
              <li key={ligne} className="flex gap-3">
                <span aria-hidden className="mt-0.5 font-bold text-primary">
                  ✓
                </span>
                <span>{ligne}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-dashed px-4 py-3 text-sm">
            <p className="font-semibold">Tu arrêtes quand tu veux</p>
            <p className="mt-1 text-muted-foreground">
              Aucun engagement de durée. Tes quiz et tes leads restent à toi.
            </p>
          </div>

          {autres.length > 0 && (
            <div className="border-t pt-4 text-sm">
              <p className="font-semibold">Les autres formules</p>
              <ul className="mt-2 space-y-1">
                {autres.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/commande/${a.id}?k=${encodeURIComponent(cle)}`}
                      className="text-primary underline"
                    >
                      {a.label}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      {formatOwnerPrice(a)} {RECURRENCE[ownerBillingKey(a)]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <CommandeClient
            produit={product.id}
            cle={cle}
            clePublique={modesDiscordants ? null : (publiable?.key ?? null)}
            modesDiscordants={modesDiscordants}
          />
        </section>
      </div>
    </main>
  );
}
