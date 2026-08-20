// app/commande/[produit]/retour/page.tsx
//
// APRÈS LE PAIEMENT : CE QUE L'ACHETEUR VOIT.
//
// CETTE PAGE N'OUVRE AUCUN ACCÈS, et c'est volontaire. Elle affiche, elle
// ne décide pas. Deux raisons, les deux déjà payées ailleurs :
//
//   1. **Cette adresse est une URL comme une autre.** Quelqu'un peut
//      l'ouvrir sans avoir rien payé. Ouvrir un plan parce qu'un
//      navigateur est arrivé ici reviendrait à distribuer Tiquiz à qui
//      connaît l'adresse.
//   2. **Beaucoup d'acheteurs ne la voient jamais.** Paiement sur mobile,
//      onglet fermé, réseau qui coupe au retour : l'argent est encaissé
//      et personne n'arrive ici. Un accès qui dépend de cette page, c'est
//      le drame Ivan reproduit à l'identique.
//
// C'est donc le webhook qui ouvre le plan : il arrive de Stripe, signé,
// il réessaie tout seul, et il n'a pas besoin que l'acheteur soit là.

import Link from "next/link";
import { notFound } from "next/navigation";

import { findOwnerProduct } from "@/lib/checkout/catalog";
import { readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { retrieveOwnerSession } from "@/lib/checkout/stripeCheckout";
import { isSalesPreviewOpen } from "@/lib/sales/previewGate";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  searchParams: Promise<{ session_id?: string; k?: string }>;
}) {
  const { produit } = await params;
  const { session_id: sessionId, k } = await searchParams;

  if (!isSalesPreviewOpen(k, process.env)) notFound();
  const product = findOwnerProduct(produit);
  if (!product) notFound();

  const compte = readOwnerStripe(process.env);
  const session =
    compte && sessionId ? await retrieveOwnerSession(compte.key, sessionId) : null;

  // Trois états, trois écrans. Le troisième est celui qu'on oublie
  // toujours, et c'est le seul où l'acheteur a besoin qu'on lui parle.
  const etat = !session ? "inconnu" : session.paid ? "paye" : "en_attente";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      {etat === "paye" && (
        <>
          <h1 className="text-3xl font-bold">C&apos;est bon, ton compte est ouvert.</h1>
          <p className="mt-4 text-muted-foreground">
            Tu vas recevoir un lien de connexion
            {session?.email ? ` à l'adresse ${session.email}` : ""}. Il arrive dans
            la minute. Pense à regarder tes indésirables s&apos;il se fait
            attendre.
          </p>
          <p className="mt-6">
            <Link href="/" className="font-semibold text-primary underline">
              Aller à Tiquiz
            </Link>
          </p>
        </>
      )}

      {etat === "en_attente" && (
        <>
          <h1 className="text-3xl font-bold">Ton paiement est en cours.</h1>
          <p className="mt-4 text-muted-foreground">
            Certaines banques prennent quelques minutes à confirmer. Tu n&apos;as
            rien à refaire : dès que c&apos;est validé, ton compte s&apos;ouvre
            tout seul et tu reçois ton lien.
          </p>
        </>
      )}

      {etat === "inconnu" && (
        <>
          <h1 className="text-3xl font-bold">On n&apos;a pas retrouvé cette commande.</h1>
          <p className="mt-4 text-muted-foreground">
            Si tu as été débité, ton compte s&apos;ouvre quand même : c&apos;est le
            paiement qui commande, pas cette page. Écris nous si tu n&apos;as rien
            reçu d&apos;ici une heure.
          </p>
        </>
      )}
    </main>
  );
}
