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
import { COMMISSION_MAX_PCT } from "@/lib/site/recompenseAffiliation";
import SimulateurAffiliation from "@/components/site/SimulateurAffiliation";

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
      <section className="tq-large pt-16 sm:pt-24">
        <p className="tq-etiquette">Programme d&apos;affiliation</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.6rem] sm:text-[3.6rem]">
          {/* C'est le TAUX qu'on surligne, pas la phrase. Un bloc bleu de
              six mots en 3,6 rem écrase le reste de la page, et c'est ce
              que Béné a relevé : "c'est trop". Deux caractères suffisent
              à porter le message. */}
          <span className="tq-surb">{pourcentTiquiz} %</span>{" "}
          chaque mois, tant qu&apos;il reste
          abonné
        </h1>
        <p className="tq-doux mt-6 tq-lire text-[1.1rem] leading-relaxed">
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

      {/* LE SIMULATEUR. Il vivait sur sa page Systeme.io et il a disparu
          quand je l'ai remplacée sans l'avoir lue. Il remonte tout en
          haut : c'est la seule question que se pose un affilié, et lui
          seul y répond en chiffres. */}
      <section className="tq-large mt-16">
        <h2 className="text-[2.2rem]">Combien tu touches, concrètement</h2>
        <p className="tq-doux tq-lire mt-4 text-[1.05rem] leading-relaxed">
          {pourcentTiquiz} % sur chaque paiement, et pas seulement sur le premier. Et ta récompense
          monte avec toi : soit un <strong className="text-[var(--tq-encre)]">taux plus élevé</strong>,
          soit une <strong className="text-[var(--tq-encre)]">remise sur ton propre abonnement</strong>.
          Tu prends l&apos;une ou l&apos;autre, jamais les deux, et tu peux changer d&apos;avis.
        </p>
        <div className="mt-8">
          <SimulateurAffiliation />
        </div>
      </section>

      {/* LES DEUX RÉCOMPENSES, EN TOUTES LETTRES. */}
      <section className="tq-large mt-24">
        <h2 className="text-[2rem]">Ta récompense, c&apos;est toi qui la choisis</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border-2 border-[var(--tq-bleu)] bg-white p-7">
            <p className="tq-etiquette">Option 1</p>
            <h3 className="mt-2 text-[1.3rem]">Un taux d&apos;affiliation plus élevé</h3>
            <ul className="tq-doux mt-4 space-y-2.5 leading-relaxed">
              <li>+5 % par marche de 10 filleuls abonnés.</li>
              <li>La première marche s&apos;ouvre dès ton premier filleul : tu passes à 45 %.</li>
              <li>Plafond à {COMMISSION_MAX_PCT} %, atteint à 51 filleuls.</li>
              <li>Le taux s&apos;applique à TOUS tes filleuls, pas seulement aux nouveaux.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-7">
            <p className="tq-etiquette">Option 2</p>
            <h3 className="mt-2 text-[1.3rem]">Une remise sur ton abonnement</h3>
            <ul className="tq-doux mt-4 space-y-2.5 leading-relaxed">
              <li>10 % de remise par marche de 10 filleuls abonnés.</li>
              <li>Elle s&apos;ouvre au 10e filleul : en dessous, elle ne donne rien.</li>
              <li>À 100 filleuls, tu ne paies plus ton abonnement.</li>
              <li>Tu gardes {pourcentTiquiz} % de commission à côté.</li>
            </ul>
          </div>
        </div>
        <p className="tq-doux tq-lire mt-6 leading-relaxed">
          Ton décompte est recalculé une fois par mois. Si des filleuls partent, ton taux ou ta
          remise redescendent, et tu es prévenu avant que ça s&apos;applique. Personne ne découvre
          une hausse de prix sur son relevé.
        </p>
      </section>

      {/* CE QUE ÇA RAPPORTE, EN EUROS. */}
      <section className="tq-large mt-24">
        <h2 className="text-[2rem]">Chaque offre, et ce qu&apos;elle te rapporte</h2>
        <p className="tq-doux tq-lire mt-4 leading-relaxed">
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
        <p className="tq-doux tq-lire mt-6 text-[0.95rem] leading-relaxed">
          Trente filleuls au mensuel, ça fait {gains[0].gain}{" "}
          multiplié par 30 chaque mois, et ça
          continue le mois suivant sans que tu refasses quoi que ce soit. C&apos;est là que
          l&apos;abonnement change tout par rapport à une vente unique.
        </p>
      </section>

      {/* LES RÈGLES. */}
      <section className="mt-24 bg-[var(--tq-panneau)] py-16">
        <div className="tq-large">
          <h2 className="text-[2rem]">Les règles, en entier</h2>
          <p className="tq-doux tq-lire mt-4 leading-relaxed">
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
      <section className="tq-large mt-28">
        <h2 className="text-[2rem]">Tu affilies déjà avec un lien Systeme.io ?</h2>
        <p className="tq-doux mt-4 tq-lire leading-relaxed">
          Tes anciens liens restent valides et continuent de te payer, exactement comme avant. Rien
          n&apos;est perdu, rien n&apos;est à refaire.
        </p>
        <p className="tq-doux mt-4 tq-lire leading-relaxed">
          Ce qui change, c&apos;est que les liens de ton espace affilié portent maintenant ton code
          public (<code className="rounded bg-[var(--tq-panneau)] px-1.5 py-0.5">?ref=</code>) au
          lieu de l&apos;identifiant de Systeme.io. Ils passent par notre bon de commande, donc ils
          comptent tes clics, tes inscrits et tes ventes, canal par canal. Les anciens liens ne
          peuvent pas faire ça (leur page ne nous transmet rien).
        </p>
        <p className="tq-doux mt-4 tq-lire leading-relaxed">
          Et le mois offert à ton filleul ne fonctionne qu&apos;avec les liens de cette
          génération. C&apos;est un argument de vente que tu n&apos;as pas sur un ancien lien, donc
          autant reprendre les nouveaux dans tes contenus quand tu en as l&apos;occasion.
        </p>
      </section>

      <section className="tq-large py-24">
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
