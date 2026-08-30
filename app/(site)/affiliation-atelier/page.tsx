// app/(site)/affiliation-atelier/page.tsx
//
// LE PROGRAMME D'AFFILIATION DE L'ATELIER DU QUIZ.
//
// Remplace `tipote.fr/atelier-du-quiz/affiliation`.
//
// -- LA PRÉCISION QU'IL NE FAUT PAS PERDRE -----------------------------
//
// L'Atelier a son PROPRE registre d'affiliés : `attributeQuizingSale`
// résout le `sa` contre `profiles.sio_affiliate_id` dans SA base, pas
// contre la table `affiliates` de Tipote, et il ne lit que `?sa=`,
// jamais `?ref=`. C'est pour ça que le lien de l'Atelier est resté chez
// Systeme.io alors que tous les autres ont été rapatriés le 25 août.
//
// Conséquence pour cette page, et elle est la raison d'être de sa
// section "comment ça marche" : on ne peut PAS promettre à un affilié
// Tiquiz qu'il touchera sur l'Atelier avec le même lien. Écrire
// l'inverse serait le laisser recommander l'Atelier pendant des mois
// pour zéro commission.

import Link from "next/link";
import type { Metadata } from "next";

import { HOTE_VENTE } from "@/lib/publicHost";
import { AFFILIATE_DASHBOARD_URL } from "@/lib/affiliateUrls";
import { TAUX, gainAtelier } from "@/lib/site/programmeAffiliation";

const TITRE = "Affiliation Atelier du Quiz : 70 % par vente";
const DESCRIPTION =
  "Recommande l'Atelier du Quiz, la formation de 7 jours à 47 €, et touche 70 % sur chaque vente. Comment obtenir ton lien et comment tu es payé.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}/affiliation-atelier` },
  openGraph: {
    type: "website",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}/affiliation-atelier`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function PageAffiliationAtelier() {
  const { prix, gain } = gainAtelier();
  const pourcent = Math.round(TAUX.atelier * 100);

  return (
    <main>
      <section className="tq-large pt-16 sm:pt-24">
        <p className="tq-etiquette">Affiliation</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.6rem] sm:text-[3.6rem]">
          <span className="tq-surb">{pourcent} %</span> sur l&apos;Atelier du Quiz
        </h1>
        <p className="tq-doux mt-6 max-w-[64ch] text-[1.1rem] leading-relaxed">
          L&apos;Atelier du Quiz est une formation de 7 jours à {prix}. Tu en touches {gain} par
          vente. C&apos;est le taux le plus haut des deux programmes, parce que c&apos;est un achat
          unique : il n&apos;y a pas de mois suivant pour rattraper.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href={AFFILIATE_DASHBOARD_URL} className="tq-bouton" target="_blank" rel="noopener noreferrer">
            Récupérer mon lien
          </a>
          <Link href="/affiliation" className="tq-bouton tq-bouton-fantome">
            Voir aussi l&apos;affiliation Tiquiz
          </Link>
        </div>
      </section>

      {/* CE QU'ON VEND VRAIMENT. Un affilié qui ne sait pas ce qu'il y a
          dedans en parle mal, et il en parle une fois. */}
      <section className="tq-large mt-24">
        <h2 className="text-[2rem]">Ce que ton filleul reçoit</h2>
        <p className="tq-doux mt-3 max-w-[62ch] leading-relaxed">
          Sept jours, une étape par jour, et Béné répond du premier au dernier.
        </p>
        <ol className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {[
            "Cadrage : quel quiz créer, et pour qui, avant d'écrire la première question",
            "Questions : celles qui qualifient vraiment, au lieu d'amuser",
            "Capture : les tags Systeme.io, pour ne perdre aucun lead en route",
            "En ligne : le quiz est publié en 1 clic et connecté à Systeme.io",
            "Trafic : envoyer du monde dessus sans payer un euro de publicité",
            "Viralité : le mécanisme qui fait que les participants partagent",
            "Ventes : le générateur qui écrit les emails de vente, profil par profil",
          ].map((etape, i) => (
            <li key={etape} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--tq-bleu)] text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="leading-relaxed">{etape}</span>
            </li>
          ))}
        </ol>
        <p className="tq-doux mt-8 max-w-[62ch] leading-relaxed">
          Avec ça : un coach IA disponible jour et nuit, la communauté, 5 bonus et 36 growth hacks.
          Et la garantie, dans les mots de Béné : tu appliques les méthodes, t&apos;as pas de leads
          en 1 mois, elle te rembourse.
        </p>
      </section>

      {/* LE POINT TECHNIQUE QU'IL FAUT DIRE. */}
      <section className="mt-24 bg-[var(--tq-panneau)] py-16">
        <div className="tq-large">
          <h2 className="text-[2rem]">Le lien de l&apos;Atelier n&apos;est pas celui de Tiquiz</h2>
          <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
            Autant le dire tout de suite, parce que c&apos;est le genre de détail qui coûte des
            commissions : l&apos;Atelier tient son propre registre d&apos;affiliés, et il lit un
            identifiant différent de celui de Tiquiz.
          </p>
          <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
            Concrètement, ton lien Tiquiz ne te fait pas toucher sur l&apos;Atelier, et
            réciproquement. Prends les deux liens dans ton espace affilié, et sers-toi de celui qui
            correspond à ce dont tu parles.
          </p>
          <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
            Le tunnel de vente de l&apos;Atelier est encore servi par Systeme.io. Ça ne change rien
            pour toi : la vente est suivie et la commission tombe. C&apos;est un des derniers
            morceaux qu&apos;on n&apos;a pas encore rapatriés, et ce sera annoncé ici le jour où ça
            bougera.
          </p>
          <div className="mt-8">
            <a
              href={AFFILIATE_DASHBOARD_URL}
              className="tq-bouton"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir mon espace affilié
            </a>
          </div>
        </div>
      </section>

      <section className="tq-large py-24">
        <h2 className="text-[2rem]">Comment tu es payé</h2>
        <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
          Une commission devient versable 30 jours après le paiement, le temps que le délai de
          remboursement passe. Le virement part entre le 10 et le 13 du mois, dès 20 € accumulés,
          sur ton compte PayPal ou ton IBAN. En dessous de 20 €, l&apos;argent reste acquis et part
          au versement suivant.
        </p>
        <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
          Ta facture, on l&apos;écrit pour toi : tu renseignes ton statut et tes coordonnées une
          fois dans ton espace, et l&apos;autofacture est émise chaque mois pour ta comptabilité.
          Tu n&apos;as rien à nous envoyer.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/affiliation" className="tq-bouton">
            Voir le détail des règles
          </Link>
          <a
            href="/conditions-generales-affiliation"
            className="tq-bouton tq-bouton-fantome"
            target="_blank"
            rel="noopener noreferrer"
          >
            Conditions générales
          </a>
        </div>
      </section>
    </main>
  );
}
