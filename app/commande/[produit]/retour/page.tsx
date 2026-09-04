// app/commande/[produit]/retour/page.tsx
//
// APRÈS LE PAIEMENT : CE QUE L'ACHETEUR VOIT.
//
// Jumeau de la page de l'Atelier, refaite le 20 août ("la page merci est
// aussi éclatée, je veux le même style que la page avec toutes les infos
// de mes pages actuelles"). Même structure, même pied de page légal, et
// les phrases qui évitent un email de support : le délai, les
// indésirables, et surtout "ne te désinscris pas".
//
// -- CETTE PAGE N'OUVRE AUCUN ACCÈS ------------------------------------
//
// Elle affiche, elle ne décide pas. Deux raisons, les deux déjà payées
// ailleurs :
//
//   1. **Cette adresse est une URL comme une autre.** Quelqu'un peut
//      l'ouvrir sans avoir rien payé. Ouvrir un plan parce qu'un
//      navigateur est arrivé ici reviendrait à distribuer Tiquiz à qui
//      connaît l'adresse.
//   2. **Beaucoup d'acheteurs ne la voient jamais.** Paiement sur
//      mobile, onglet fermé, réseau qui coupe au retour : l'argent est
//      encaissé et personne n'arrive ici. Un accès qui dépend de cette
//      page, c'est le drame Ivan reproduit à l'identique.
//
// C'est donc le webhook qui ouvre le plan : il arrive de Stripe, signé,
// il réessaie tout seul, et il n'a pas besoin que l'acheteur soit là.

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { LIENS_LEGAUX, LIEN_SUPPORT } from "@/lib/checkout/brand";
import { findOwnerProduct, formatOwnerPrice, ownerBillingKey } from "@/lib/checkout/catalog";
import { readOwnerPaypal, readOwnerStripe } from "@/lib/checkout/ownerAccount";
import { getOwnerPaypalSubscription } from "@/lib/checkout/paypalOwner";
import { retrieveOwnerSession } from "@/lib/checkout/stripeCheckout";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { isPublicSalesHost } from "@/lib/sales/salesHosts";
import { evenementPurchase } from "@/lib/analytics/conversions";
import ConversionGa4 from "@/components/analytics/ConversionGa4";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

const RECURRENCE: Record<string, string> = {
  monthly: "par mois",
  yearly: "par an",
  once: "paiement unique",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  // `session_id` vient de Stripe, `subscription_id` de PayPal : les deux
  // fournisseurs ramènent l'acheteur ici, chacun avec son vocabulaire.
  searchParams: Promise<{ session_id?: string; subscription_id?: string; k?: string }>;
}) {
  const { produit } = await params;
  const { session_id: sessionId, subscription_id: abonnementPaypal, k } = await searchParams;

  // La porte s'ouvre par la cle OU par le domaine public : sur
  // tiquiz.fr le bon de commande doit etre accessible sans rien dans
  // l'URL, c'est tout l'interet d'avoir un domaine.
  const host = (await headers()).get("host");
  if (!isSalesOpen(k, host, process.env)) notFound();
  const product = findOwnerProduct(produit);
  if (!product) notFound();

  const compte = readOwnerStripe(process.env);
  const session =
    compte && sessionId ? await retrieveOwnerSession(compte.key, sessionId) : null;

  // LE RETOUR DE PAYPAL.
  //
  // On relit l'abonnement au lieu de croire l'URL : `?subscription_id=`
  // est un paramètre comme un autre, et quelqu'un qui le change à la
  // main verrait sinon un écran de félicitations sans avoir payé.
  //
  // Ce que cet écran fait, et ce qu'il ne fait PAS : il CONFIRME. Ce qui
  // ouvre l'accès, c'est le webhook, parce que beaucoup d'acheteurs ne
  // voient jamais cette page (paiement sur mobile, onglet fermé).
  const comptePaypal = readOwnerPaypal(process.env);
  const aboPaypal =
    comptePaypal && abonnementPaypal
      ? await getOwnerPaypalSubscription({
          compte: comptePaypal,
          subscriptionId: abonnementPaypal,
        })
      : null;

  // Trois états, trois écrans. Le troisième est celui qu'on oublie
  // toujours, et c'est le seul où l'acheteur a besoin qu'on le rassure.
  const etat = aboPaypal
    ? aboPaypal.actif
      ? "paye"
      : "en_attente"
    : !session
      ? "inconnu"
      : session.paid
        ? "paye"
        : "en_attente";

  // ── ÉTAPE 2 DU TUNNEL : IL A PAYÉ ──
  //
  // Il ne part QUE sur `etat === "paye"`, c'est à dire quand le
  // fournisseur vient de confirmer le paiement, relu ci dessus. Cette
  // adresse est une URL comme une autre : quelqu'un peut l'ouvrir sans
  // avoir rien payé, et compter une conversion parce qu'un navigateur
  // est arrivé ici reviendrait à inventer du chiffre d'affaires.
  //
  // La RÉFÉRENCE est l'identifiant du fournisseur, jamais un compteur
  // maison : c'est elle qui permet à GA4 de dédupliquer, donc c'est elle
  // qui empêche qu'un rafraîchissement compte une vente de plus. Sans
  // elle, `evenementPurchase` ne rend rien du tout.
  const referenceVente = aboPaypal ? abonnementPaypal : session ? sessionId : null;
  const conversion =
    etat === "paye"
      ? evenementPurchase({ produitId: product.id, reference: referenceVente })
      : null;

  return (
    <main className="min-h-screen bg-white text-[#2b3264]">
      <ConversionGa4 estHoteDeVente={isPublicSalesHost(host)} evenement={conversion} />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        {etat === "paye" && (
          <>
            <p className="text-center text-4xl" aria-hidden>
              🎉
            </p>
            <h1 className="mt-3 text-center text-3xl font-extrabold sm:text-4xl">
              Félicitations !
            </h1>
            <p className="mt-3 text-center text-[15px] text-[#5b6291]">
              Ton paiement est bien passé. Bienvenue sur Tiquiz.
            </p>

            <div className="mt-8 rounded-2xl border border-[#e4e7f5] bg-[#f3f6fc] px-5 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold">{product.label}</span>
                <span className="text-lg font-extrabold">
                  {formatOwnerPrice(product)}{" "}
                  <span className="text-xs font-semibold text-[#8890b5]">
                    {RECURRENCE[ownerBillingKey(product)]}
                  </span>
                </span>
              </div>
              {session?.email && (
                <p className="mt-2 text-[13px] text-[#8890b5]">
                  Commande confirmée pour {session.email}
                </p>
              )}
            </div>

            <h2 className="mt-8 text-lg font-bold">
              Dans les prochaines minutes tu vas recevoir :
            </h2>
            <ol className="mt-4 space-y-4">
              {[
                {
                  titre: "Un email",
                  detail: session?.email
                    ? `Il arrive à l'adresse ${session.email}.`
                    : "Il arrive à l'adresse que tu viens de renseigner.",
                },
                {
                  titre: "Un lien à cliquer",
                  detail: "Il te permet de choisir un mot de passe sécurisé.",
                },
                {
                  titre: "Tes accès",
                  detail: "Et te voilà dans Tiquiz, avec tout ce qu'il faut pour créer ton premier quiz.",
                },
              ].map((etape, i) => (
                <li key={etape.titre} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5e6dde] text-xs font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-snug">
                    <strong className="font-semibold">{etape.titre}</strong>
                    <span className="block text-[#8890b5]">{etape.detail}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-xl border-l-4 border-[#20bbe6] bg-[#f6fcfe] px-4 py-3">
              <p className="text-sm font-bold">Important</p>
              <p className="mt-1 text-[14px] leading-snug text-[#5b6291]">
                Ne te désinscris pas de mes emails et ne les marque pas comme
                indésirables : c&apos;est par là que passent tes accès et toutes les
                nouveautés.
              </p>
            </div>

            <p className="mt-6 text-[14px] leading-snug text-[#8890b5]">
              Rien reçu au bout de 15 minutes ? Regarde dans tes indésirables et dans
              l&apos;onglet Promotions. Si l&apos;email n&apos;y est pas non plus,{" "}
              <a
                href={LIEN_SUPPORT}
                className="font-semibold text-[#5e6dde] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                contacte le support en cliquant ici
              </a>
              .
            </p>

            <p className="mt-8 text-[15px] font-semibold">À tout de suite,</p>
            <p className="text-[15px] text-[#8890b5]">Béné</p>
          </>
        )}

        {etat === "en_attente" && (
          <>
            <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
              Ton paiement est en cours.
            </h1>
            <p className="mt-4 text-center text-[15px] leading-relaxed text-[#5b6291]">
              Certaines banques prennent quelques minutes à confirmer. Tu n&apos;as rien
              à refaire : dès que c&apos;est validé, ton compte s&apos;ouvre tout seul et
              tu reçois ton email avec le lien pour choisir ton mot de passe.
            </p>
            <p className="mt-6 text-center text-[14px] text-[#8890b5]">
              Pense à regarder tes indésirables, et ne te désinscris pas de mes emails :
              c&apos;est par là que passent tes accès.
            </p>
          </>
        )}

        {etat === "inconnu" && (
          <>
            <h1 className="text-center text-3xl font-extrabold sm:text-4xl">
              On n&apos;a pas retrouvé cette commande.
            </h1>
            <p className="mt-4 text-center text-[15px] leading-relaxed text-[#5b6291]">
              Si tu as été débitée, ton compte s&apos;ouvre quand même : c&apos;est le
              paiement qui commande, pas cette page. Tu recevras ton email avec le lien
              pour choisir ton mot de passe.
            </p>
            <p className="mt-6 text-center text-[14px] text-[#8890b5]">
              Toujours rien d&apos;ici une heure ?{" "}
              <a
                href={LIEN_SUPPORT}
                className="font-semibold text-[#5e6dde] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Écris nous en cliquant ici
              </a>
              .
            </p>
          </>
        )}

        <footer className="mt-14 border-t border-[#e4e7f5] pt-6">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[12px] text-[#8890b5]">
            {LIENS_LEGAUX.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="hover:text-[#5e6dde] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.texte}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[12px] text-[#8890b5]">
            © 2025-2026 Tipote. Le compagnon business qui te guide de zéro à la liberté !
          </p>
        </footer>
      </div>
    </main>
  );
}
