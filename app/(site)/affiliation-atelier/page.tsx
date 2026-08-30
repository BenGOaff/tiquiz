// app/(site)/affiliation-atelier/page.tsx
//
// LE PROGRAMME D'AFFILIATION DE L'ATELIER DU QUIZ.
//
// Remplace `tipote.fr/atelier-du-quiz/affiliation`.
//
// -- UN SEUL PROGRAMME, UN SEUL CODE, DEUX LIENS ----------------------
//
// Le premier jet de cette page disait que l'Atelier tenait son propre
// registre d'affiliés et ne lisait que `?sa=`, donc qu'un lien Tiquiz
// ne payait pas sur l'Atelier. **C'était faux**, et Béné a demandé de
// le vérifier plutôt que de le recopier d'une note d'août.
//
// Vérifié le 30 août 2026, dans le dépôt de l'Atelier :
//
//   1. `atelierduquiz.fr` est un hôte de vente de son app
//      (`lib/sales/salesHosts.ts`), donc son middleware capte le `?ref=`
//      exactement comme celui de Tiquiz ;
//   2. le bon de commande le transporte (`affiliateCode`) jusqu'au
//      webhook de paiement ;
//   3. `commissionnerVente` interroge le REGISTRE CENTRAL de Tipote en
//      PREMIER, avec `affiliate_code`, `source_app: "atelier"` (c'est ce
//      champ qui fixe les 70 %) et `base: "ht"` ;
//   4. le registre historique de l'Atelier n'est plus qu'un repli, pour
//      les élèves affiliés là-bas et pas encore chez Tipote ;
//   5. si Tipote est injoignable, RIEN n'est écrit nulle part et ça
//      crie : deux registres qui paient la même vente, ce serait deux
//      fois le même virement.
//
// Béné, 30 août : "affiliate fait foi, et atelier reprend les chiffres
// d'affiliate. On ne doit pas mettre des données différentes."
//
// Conséquence pour cette page : les chiffres viennent des MÊMES modules
// que la page Tiquiz (`lib/site/programmeAffiliation.ts`), et les règles
// sont LA MÊME liste. Une page qui réécrirait ses propres seuils
// finirait par annoncer un délai ou un minimum différent.

import Link from "next/link";
import type { Metadata } from "next";

import { HOTE_VENTE } from "@/lib/publicHost";
import { AFFILIATE_DASHBOARD_URL } from "@/lib/affiliateUrls";
import { REGLES, TAUX, gainAtelier } from "@/lib/site/programmeAffiliation";

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
  const pourcentTiquiz = Math.round(TAUX.tiquiz * 100);

  return (
    <main>
      <section className="tq-large pt-16 sm:pt-24">
        <p className="tq-etiquette">Affiliation</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.6rem] sm:text-[3.6rem]">
          <span className="tq-surb">{pourcent} %</span>{" "}
          sur l&apos;Atelier du Quiz
        </h1>
        <p className="tq-doux mt-6 max-w-[64ch] text-[1.1rem] leading-relaxed">
          L&apos;Atelier du Quiz est une formation de 7 jours à {prix}. Tu en touches {gain}{" "}
          par
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

      {/* LE POINT QU'IL FAUT DIRE, ET IL EST L'INVERSE DE CE QU'ON
          CROYAIT : c'est le MÊME programme. */}
      <section className="mt-24 bg-[var(--tq-panneau)] py-20">
        <div className="tq-large">
          <h2 className="text-[2rem]">Le même programme, un lien par produit</h2>
          <p className="tq-doux tq-lire mt-4 leading-relaxed">
            Tu n&apos;as pas deux comptes à gérer. C&apos;est le même espace affilié, le même code
            public, le même compteur de filleuls et le même virement. Seul le lien change, parce
            que les deux produits ne vivent pas sur le même domaine.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <p className="tq-etiquette">Pour Tiquiz</p>
              <code className="mt-3 block break-all rounded-lg bg-[var(--tq-panneau)] px-3 py-2.5 text-[0.95rem]">
                tiquiz.fr/?ref=TONCODE
              </code>
              <p className="tq-doux mt-3 text-[0.95rem] leading-relaxed">
                {pourcentTiquiz} % à chaque échéance, tant qu&apos;il reste abonné.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <p className="tq-etiquette">Pour l&apos;Atelier</p>
              <code className="mt-3 block break-all rounded-lg bg-[var(--tq-panneau)] px-3 py-2.5 text-[0.95rem]">
                atelierduquiz.fr/?ref=TONCODE
              </code>
              <p className="tq-doux mt-3 text-[0.95rem] leading-relaxed">
                {pourcent} % une fois, sur la vente à {prix}.
              </p>
            </div>
          </div>
          <p className="tq-doux tq-lire mt-6 leading-relaxed">
            Ton code est le même dans les deux. Prends celui qui correspond à ce dont tu parles :
            un lien Tiquiz posé sous une vidéo qui parle de la formation enverrait les gens au
            mauvais endroit, et c&apos;est la seule façon de perdre une commission ici.
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
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
          Exactement comme sur Tiquiz : c&apos;est le même cycle, le même seuil et le même
          calendrier. Ces règles sont écrites à un seul endroit, pour qu&apos;aucune des deux pages
          n&apos;annonce un délai que l&apos;autre contredit.
        </p>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {REGLES.map((r) => (
            <div key={r.titre}>
              <h3 className="text-[1.05rem]">{r.titre}</h3>
              <p className="tq-doux mt-2 leading-relaxed">{r.texte}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/affiliation" className="tq-bouton">
            Voir aussi l&apos;affiliation Tiquiz
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
