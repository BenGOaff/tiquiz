// app/commande/[produit]/page.tsx
//
// LE BON DE COMMANDE TIQUIZ, PLEINE PAGE.
//
// Jumeau de celui de l'Atelier, refait le 20 août après le retour de
// Béné sur celui là : "il est ultra moche, je veux un design plus
// accordé au design de la page tout en restant sobre, des tailles
// adaptées à tous les écrans, tout est sur fond clair, pas de fond
// foncé." Le sien n'était pas encore ouvert, mais deux bons de commande
// jumeaux qui ne se ressemblent pas, c'est le même défaut qu'on répare
// deux fois.
//
// -- CE QUE LE PREMIER JET AVAIT RATÉ ----------------------------------
//
// Il empruntait les jetons de couleur de l'APP (`text-muted-foreground`,
// `border-primary`), qui sont ceux du tableau de bord de la créatrice.
// Or cette page est vue par quelqu'un qui n'a pas encore de compte et
// qui vient de lire la page de vente. Une rupture visuelle au moment de
// sortir sa carte se paie en abandons. Les couleurs viennent donc de
// `lib/checkout/brand.ts`, relevées dans `content/sales/tiquiz.html`.
//
// -- LE FOND FONCÉ N'ÉTAIT PAS LE NÔTRE --------------------------------
//
// Le panneau bleu nuit vu sur l'Atelier était le formulaire de Stripe,
// rendu dans une iframe de `js.stripe.com`. Notre CSS ne le traverse
// pas. Il se règle par `branding_settings` sur la session, cf. `brand.ts`.
//
// -- DEUX DIFFÉRENCES AVEC L'ATELIER, ET ELLES SE VOIENT ---------------
//
// 1. **Ce sont des abonnements**, donc la page dit la récurrence et le
//    fait qu'on arrête quand on veut. Un prix mensuel affiché comme un
//    prix unique, ce sont des demandes de remboursement le mois suivant.
// 2. **Il y a quatre paliers**, donc les trois autres sont accessibles
//    en bas. Quelqu'un qui voulait l'annuel ne doit pas avoir à revenir
//    en arrière pour le trouver.
//
// Le prix vient du catalogue et n'est JAMAIS réécrit ici : un prix
// affiché à un endroit et facturé à un autre est la faute la plus
// coûteuse qu'une page de commande puisse commettre.

import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  OWNER_CATALOG,
  OWNER_PRODUCT_ORDER,
  findOwnerProduct,
  formatOwnerPrice,
  ownerBillingKey,
} from "@/lib/checkout/catalog";
import {
  readOwnerPaypal,
  readOwnerStripe,
  readOwnerStripePublishable,
} from "@/lib/checkout/ownerAccount";
import { isSalesOpen } from "@/lib/sales/previewGate";
import { isPublicSalesHost } from "@/lib/sales/salesHosts";
import { evenementBeginCheckout } from "@/lib/analytics/conversions";
import ConversionGa4 from "@/components/analytics/ConversionGa4";
import { pickRef, REF_COOKIE } from "@/lib/affiliate/refLien";
import { JOURS_MOIS_OFFERT_ANNONCE } from "@/lib/trial/moisOffert";
import CommandeClient from "./CommandeClient";
import { AVANTAGES_NOUVEAUX, AVANTAGES_PLUS, estPalierPlus } from "@/lib/checkout/avantages";

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

/** Ce que Tiquiz fait, dans les mots de la page de vente. */
// CE QUE TOUS LES PALIERS CONTIENNENT, raconté plutôt que listé.
//
// Béné, 2 septembre 2026 : "tu n'as pas ajouté les nouvelles
// fonctionnalités dans les blocs tarifs il me semble (pense aussi à les
// ajouter sur les bons de commande)."
//
// LES TROIS DERNIÈRES VIENNENT DE `lib/checkout/avantages.ts`, la MÊME
// source que la grille tarifaire de la page de vente. Les réécrire ici
// donnerait deux listes de la même chose, donc deux listes qui
// divergent, et la divergence vivrait sur l'écran où quelqu'un sort sa
// carte. C'est le défaut le plus répété de ce dépôt (les prix du blog
// contre le catalogue, `PRICING_PLUS` contre `OWNER_CATALOG`).
const INCLUS: readonly { titre: string; detail: string }[] = [
  { titre: "Le quiz parfait à partir d'un prompt", detail: "Généré par l'IA, importé, ou créé à la main. Comme tu veux." },
  { titre: "Des leads qualifiés, pas des touristes", detail: "Chaque réponse te dit qui est la personne en face." },
  { titre: "Des mini-tunnels de vente", detail: "Une page de résultat par profil, avec ton offre au bout." },
  { titre: "Des quiz qui te ressemblent", detail: "Ton logo, tes images, tes couleurs, et ton propre domaine." },
  { titre: "Aussi des sondages et des popquiz", detail: "Le même moteur, trois formats, sans rien réapprendre." },
  { titre: "Des chiffres qui disent quoi réparer", detail: "Où tes visiteurs décrochent, question par question." },
  ...AVANTAGES_NOUVEAUX.map((a) => ({ titre: a.texte, detail: a.detail ?? "" })),
];

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ produit: string }>;
  searchParams: Promise<{ k?: string; ref?: string }>;
}) {
  const { produit } = await params;
  const { k, ref: refUrl } = await searchParams;

  // La porte s'ouvre par la cle OU par le domaine public : sur
  // tiquiz.fr le bon de commande doit etre accessible sans rien dans
  // l'URL, c'est tout l'interet d'avoir un domaine.
  const host = (await headers()).get("host");
  if (!isSalesOpen(k, host, process.env)) notFound();

  const product = findOwnerProduct(produit);
  if (!product) notFound();

  const cle = String(k ?? "");
  const autres = OWNER_PRODUCT_ORDER.filter((id) => id !== product.id).map(
    (id) => OWNER_CATALOG[id],
  );

  // Les deux clés doivent parler du MÊME monde. Une clé secrète live avec
  // une clé publiable test (ou l'inverse) donne un formulaire qui refuse
  // la session sans dire pourquoi : moitié de configuration, écran muet.
  const publiable = readOwnerStripePublishable(process.env);
  const secrete = readOwnerStripe(process.env);
  const modesDiscordants = !!publiable && !!secrete && publiable.mode !== secrete.mode;

  // PayPal a son propre sort : une clé Stripe manquante ne doit pas
  // faire disparaître le bouton PayPal, sinon l'acheteur arrive sur une
  // page sans aucun moyen de payer alors qu'il en reste un qui marche.
  const paypalDisponible = !!readOwnerPaypal(process.env);

  // ── LES 30 JOURS OFFERTS, ANNONCÉS UNIQUEMENT SUR UN LIEN AFFILIÉ ──
  //
  // Béné : "uniquement sur les liens affiliés n'oublie pas, c'est pas
  // pour celui qui tombe sur la page de vente tout seul". Annoncer un
  // cadeau que le serveur refusera ensuite serait pire que de ne rien
  // annoncer : l'acheteuse verrait le prix plein au moment de payer.
  //
  // La règle ne demande plus aucun marqueur depuis le 24 août : nos
  // liens portent `?ref=`, les anciens tunnels Systeme.io portent
  // `?sa=`. Venir par un `?ref=` SUFFIT donc à dire que le lien est
  // d'ici. L'URL gagne sur le cookie (même règle que l'attribution) :
  // au premier chargement, le cookie que le middleware vient de poser
  // n'est pas encore relisible, et s'en remettre à lui ferait une page
  // muette exactement sur le lien qui offre.
  const boite = await cookies();
  const moisOffertAnnonce =
    !!pickRef(refUrl, boite.get(REF_COOKIE)?.value) && ownerBillingKey(product) !== "once";

  return (
    // Le fond clair est posé ici, pas hérité : cette page est publique et
    // ne doit rien devoir au thème de celui qui l'ouvre.
    <main className="min-h-screen bg-white text-[#2b3264]">
      {/* ── ÉTAPE 1 DU TUNNEL : IL EST ENTRÉ DANS LE BON DE COMMANDE ──
          Béné, 2 septembre : "mesurer les conversions etc ?". Il n'y
          avait aucun événement, donc Google voyait le trafic sans
          pouvoir dire quelle source ou quelle publicité produisait une
          vente. Le montant vient du CATALOGUE (`conversions.ts`),
          jamais d'ici, et le composant repasse par la même porte que la
          balise : domaine de vente, chemin, ET consentement. */}
      <ConversionGa4
        estHoteDeVente={isPublicSalesHost(host)}
        evenement={evenementBeginCheckout(product.id)}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* ---------------- Ce qu'on achète ---------------- */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5e6dde]">
              Résumé de ta commande
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
              {product.label}
            </h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                {formatOwnerPrice(product)}
              </span>
              <span className="text-sm font-semibold text-[#8890b5]">
                {RECURRENCE[ownerBillingKey(product)]}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#8890b5]">
              Aucun frais caché. Tu arrêtes quand tu veux, tes quiz et tes leads
              restent à toi.
            </p>

            {moisOffertAnnonce && (
              <div className="mt-4 rounded-xl border border-[#c9d3ff] bg-[#eef2ff] px-4 py-3">
                <p className="text-sm font-bold text-[#2b3264]">
                  {JOURS_MOIS_OFFERT_ANNONCE} jours offerts sur cette formule
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[#5a6390]">
                  Tu es venu par un lien de parrainage : rien n'est prélevé
                  pendant {JOURS_MOIS_OFFERT_ANNONCE} jours. Ensuite,{" "}
                  {formatOwnerPrice(product)} {RECURRENCE[ownerBillingKey(product)]}.
                  Tu peux arrêter avant la fin des {JOURS_MOIS_OFFERT_ANNONCE} jours
                  sans rien payer.
                </p>
              </div>
            )}

            <ul className="mt-6 space-y-2.5">
              {INCLUS.map((item) => (
                <li key={item.titre} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f3f6fc] text-[11px] font-bold text-[#5e6dde]"
                  >
                    ✓
                  </span>
                  <span className="text-[13px] leading-snug sm:text-sm">
                    <strong className="font-semibold">{item.titre}</strong>{" "}
                    <span className="text-[#8890b5]">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            {estPalierPlus(product.id) && (
              <div className="mt-6 rounded-xl border border-[#c9d3ff] bg-[#eef2ff] px-4 py-4">
                <p className="text-sm font-bold text-[#2b3264]">
                  Et parce que c&apos;est une formule Plus
                </p>
                <ul className="mt-3 space-y-2.5">
                  {AVANTAGES_PLUS.map((a) => (
                    <li key={a.texte} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#5e6dde]"
                      >
                        ✓
                      </span>
                      <span className="text-[13px] leading-snug sm:text-sm">
                        <strong className="font-semibold">{a.texte}</strong>{" "}
                        <span className="text-[#5a6390]">{a.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {autres.length > 0 && (
              <div className="mt-6 rounded-xl border border-[#e4e7f5] bg-[#f3f6fc] px-4 py-3">
                <p className="text-sm font-bold">Les autres formules</p>
                <ul className="mt-2 space-y-1 text-[13px]">
                  {autres.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/commande/${a.id}?k=${encodeURIComponent(cle)}`}
                        className="font-semibold text-[#5e6dde] underline"
                      >
                        {a.label}
                      </Link>{" "}
                      <span className="text-[#8890b5]">
                        {formatOwnerPrice(a)} {RECURRENCE[ownerBillingKey(a)]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ---------------- Le paiement ---------------- */}
          <section className="lg:sticky lg:top-8">
            <div className="rounded-2xl border border-[#e4e7f5] bg-white p-3 shadow-[0_8px_30px_rgba(43,50,100,0.06)] sm:p-4">
              <CommandeClient
                paypalDisponible={paypalDisponible}
                produit={product.id}
                cle={cle}
                clePublique={modesDiscordants ? null : (publiable?.key ?? null)}
                modesDiscordants={modesDiscordants}
              />
            </div>
            <p className="mt-3 text-center text-xs text-[#8890b5]">
              {paypalDisponible ? "Paiement sécurisé par Stripe ou PayPal. Accès immédiat." : "Paiement sécurisé par Stripe. Accès immédiat. Facture envoyée par email."}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
