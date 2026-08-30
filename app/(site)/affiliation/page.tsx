// app/(site)/affiliation/page.tsx
//
// LE PROGRAMME D'AFFILIATION TIQUIZ.
//
// Remplace `tipote.fr/tiquiz/affiliation`, qui décrivait le programme
// Systeme.io. Ce qui a changé depuis n'est pas cosmétique : le lien
// porte `?ref=`, le cookie dure un an, c'est NOUS qui payons, et
// l'autofacture est émise par nous. Une page qui décrirait encore
// l'ancien fonctionnement enverrait des affiliés chercher leur argent
// au mauvais endroit.
//
// AUCUN CHIFFRE N'EST TAPÉ DANS CE FICHIER : ils viennent de
// `lib/site/programmeAffiliation.ts`, qui les dérive du catalogue.

import Link from "next/link";
import type { Metadata } from "next";

import { HOTE_VENTE } from "@/lib/publicHost";
import { AFFILIATE_DASHBOARD_URL } from "@/lib/affiliateUrls";
import { REGLES, TAUX, gainAtelier, tableauDesGains } from "@/lib/site/programmeAffiliation";

const TITRE = "Programme d'affiliation Tiquiz : 40 % récurrent, à vie";
const DESCRIPTION =
  "Recommande Tiquiz et touche 40 % chaque mois où ton filleul reste abonné. Cookie d'un an, versement dès 20 €, facture éditée par nous. Gratuit et ouvert à tous.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}/affiliation` },
  openGraph: {
    type: "website",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}/affiliation`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function PageAffiliation() {
  const gains = tableauDesGains();
  const atelier = gainAtelier();
  const pourcentTiquiz = Math.round(TAUX.tiquiz * 100);
  const pourcentAtelier = Math.round(TAUX.atelier * 100);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-20">
        <p className="tq-etiquette">Programme d&apos;affiliation</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.6rem] sm:text-[3.6rem]">
          {pourcentTiquiz} % <span className="tq-surb">chaque mois</span>, tant qu&apos;il reste
          abonné
        </h1>
        <p className="tq-doux mt-6 max-w-[64ch] text-[1.1rem] leading-relaxed">
          Tu parles de Tiquiz à quelqu&apos;un, il s&apos;abonne, tu touches {pourcentTiquiz} % de
          son abonnement. Pas une fois : tous les mois, tant qu&apos;il reste client. Le jour où il
          part, ça s&apos;arrête, et c&apos;est normal.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href={AFFILIATE_DASHBOARD_URL} className="tq-bouton" target="_blank" rel="noopener noreferrer">
            Rejoindre le programme
          </a>
          <Link href="/affiliation-atelier" className="tq-bouton tq-bouton-fantome">
            Et l&apos;Atelier du Quiz, à {pourcentAtelier} %
          </Link>
        </div>
        <p className="tq-doux mt-4 text-sm">
          C&apos;est gratuit, il n&apos;y a rien à acheter, et tu n&apos;as pas besoin d&apos;être
          client de Tiquiz pour en parler.
        </p>
      </section>

      {/* CE QUE ÇA RAPPORTE, EN EUROS. */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <h2 className="text-[2rem]">Ce que ça rapporte, précisément</h2>
        <p className="tq-doux mt-3 max-w-[62ch] leading-relaxed">
          Les montants ci-dessous sont calculés sur le prix hors taxes, qui est la base réelle du
          calcul. Autant que tu voies le bon chiffre tout de suite plutôt qu&apos;au premier
          versement.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--tq-bord)]">
                <th className="tq-etiquette py-3 pr-4">Ce qu&apos;il prend</th>
                <th className="tq-etiquette py-3 pr-4">Il paie</th>
                <th className="tq-etiquette py-3">Tu touches</th>
              </tr>
            </thead>
            <tbody>
              {gains.map((l) => (
                <tr key={l.palier} className="border-b border-[var(--tq-bord)]">
                  <td className="py-4 pr-4 font-semibold">{l.palier}</td>
                  <td className="tq-doux py-4 pr-4">{l.prix}</td>
                  <td className="py-4 font-semibold text-[var(--tq-bleu)]">
                    {l.gain}{" "}
                    <span className="tq-doux text-sm font-normal">{l.rythme}</span>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-4 pr-4 font-semibold">L&apos;Atelier du Quiz</td>
                <td className="tq-doux py-4 pr-4">{atelier.prix}</td>
                <td className="py-4 font-semibold text-[var(--tq-bleu)]">
                  {atelier.gain}{" "}
                  <span className="tq-doux text-sm font-normal">
                    une fois ({pourcentAtelier} %)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="tq-doux mt-6 max-w-[62ch] text-sm leading-relaxed">
          Trente filleuls au mensuel, ça fait {gains[0].gain} multiplié par 30 chaque mois, et ça
          continue le mois suivant sans que tu refasses quoi que ce soit. C&apos;est là que
          l&apos;abonnement change tout par rapport à une vente unique.
        </p>
      </section>

      {/* LES RÈGLES. */}
      <section className="mt-24 bg-[var(--tq-panneau)] py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-[2rem]">Les règles, en entier</h2>
          <p className="tq-doux mt-3 max-w-[62ch] leading-relaxed">
            Pas de petites lignes. Si un point te paraît flou, écris-nous, on le précisera sur cette
            page pour tout le monde.
          </p>
          <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {REGLES.map((r) => (
              <div key={r.titre}>
                <h3 className="text-[1.05rem]">{r.titre}</h3>
                <p className="tq-doux mt-2 leading-relaxed">{r.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CE QUI A CHANGÉ. La question que tous les affiliés en place
          vont se poser en arrivant ici. */}
      <section className="mx-auto mt-24 max-w-6xl px-5 sm:px-8">
        <h2 className="text-[2rem]">Tu affilies déjà avec un lien Systeme.io ?</h2>
        <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
          Tes anciens liens restent valides et continuent de te payer, exactement comme avant. Rien
          n&apos;est perdu, rien n&apos;est à refaire.
        </p>
        <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
          Ce qui change, c&apos;est que les liens de ton espace affilié portent maintenant ton code
          public (<code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5">?ref=</code>) au
          lieu de l&apos;identifiant de Systeme.io. Ils passent par notre bon de commande, donc ils
          comptent tes clics, tes inscrits et tes ventes, canal par canal. Les anciens liens ne
          peuvent pas faire ça (leur page ne nous transmet rien).
        </p>
        <p className="tq-doux mt-4 max-w-[64ch] leading-relaxed">
          Et le mois offert à ton filleul ne fonctionne qu&apos;avec les liens de cette
          génération. C&apos;est un argument de vente que tu n&apos;as pas sur un ancien lien, donc
          autant reprendre les nouveaux dans tes contenus quand tu en as l&apos;occasion.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="rounded-3xl bg-[var(--tq-marine)] px-8 py-14 sm:px-14">
          <h2 className="max-w-[22ch] text-[1.9rem] text-white sm:text-[2.4rem]">
            Ton lien est prêt en <span className="tq-surb">deux minutes</span>
          </h2>
          <p className="mt-5 max-w-[54ch] leading-relaxed text-[#b9c3d9]">
            Tu crées ton compte affilié, tu récupères ton lien, tu le mets dans ta bio, sous ta
            vidéo ou dans ton prochain email. Le tableau de bord te dit ensuite lequel de tes canaux
            travaille vraiment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={AFFILIATE_DASHBOARD_URL}
              className="tq-bouton"
              target="_blank"
              rel="noopener noreferrer"
            >
              Créer mon compte affilié
            </a>
            <a
              href="/conditions-generales-affiliation"
              className="tq-bouton bg-transparent !text-white ring-1 ring-white/25 hover:!bg-white/10"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lire les conditions
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
