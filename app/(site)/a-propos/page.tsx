// app/(site)/a-propos/page.tsx
//
// LA PAGE AUTEUR. Remplace `tipote.fr/benedicte-lagardette`.
//
// -- D'OÙ VIENT CE TEXTE -----------------------------------------------
//
// De sa page, lue le 30 août 2026. Le premier jet de cette page évitait
// sa biographie faute de source ; elle a répondu que la source était
// dans la liste qu'elle m'avait donnée. Elle avait raison.
//
// **Ses phrases sont gardées telles quelles** partout où elles sont
// fortes. Les reformuler "proprement" aurait produit exactement le
// texte lisse qu'elle repère en trois lignes : c'est sa vie, elle la
// raconte mieux que n'importe quelle reformulation.
//
// Deux corrections de forme, et deux seulement : les tirets cadratins
// de sa page d'origine (sa propre règle les interdit) et les chevrons
// français, remplacés par des guillemets droits.
//
// -- LES DONNÉES STRUCTURÉES ------------------------------------------
//
// Le `sameAs` vient de son propre schema. C'est lui qui permet à un
// moteur de relier "Bénédicte Lagardette" à ses comptes, donc de la
// reconnaître comme la même personne partout : c'est ce qui fait
// remonter une page auteur sur une requête de nom.

import Link from "next/link";
import type { Metadata } from "next";

import { HOTE_VENTE } from "@/lib/publicHost";
import { COMPANY } from "@/lib/legal/company";
import { ATELIER_SALES_URL } from "@/lib/affiliateUrls";
import { AVIS, PAGE_AUTEUR_BLOG, RESEAUX } from "@/lib/site/reseaux";

const TITRE = "Bénédicte Lagardette : d'infirmière à fondatrice de Tiquiz";
const DESCRIPTION =
  "Ex-infirmière, handicapée à 34 ans, elle a repris depuis son lit et code aujourd'hui ses propres logiciels. L'histoire derrière Tiquiz et l'Atelier du Quiz.";
const PORTRAIT = `${HOTE_VENTE}/bene.webp`;

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}/a-propos` },
  openGraph: {
    type: "profile",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}/a-propos`,
    siteName: "Tiquiz",
    locale: "fr_FR",
    images: [{ url: PORTRAIT }],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION, images: [PORTRAIT] },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${HOTE_VENTE}/a-propos#person`,
      name: COMPANY.director,
      alternateName: ["Béné", "Bénédicte Bottet"],
      jobTitle: "Fondatrice de Tiquiz et de l'Atelier du Quiz",
      description: DESCRIPTION,
      url: `${HOTE_VENTE}/a-propos`,
      image: PORTRAIT,
      knowsAbout: [
        "Création de quiz",
        "Génération de leads",
        "Marketing par quiz",
        "Tunnel de vente",
        "Email marketing",
        "Growth hacking",
        "Copywriting",
        "Tiquiz",
        "Atelier du Quiz",
        "Intelligence artificielle",
        "Systeme.io",
      ],
      // Sa page auteur historique fait partie du `sameAs` : c'est ce qui
      // dit au moteur que les deux pages parlent de la MÊME personne,
      // au lieu de les mettre en concurrence.
      sameAs: [
        PAGE_AUTEUR_BLOG,
        ...RESEAUX.map((r) => r.url),
        ...AVIS.map((a) => a.url),
      ],
      worksFor: { "@id": `${HOTE_VENTE}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${HOTE_VENTE}/#organization`,
      name: "Tiquiz",
      url: HOTE_VENTE,
      description:
        "Logiciel de création de quiz connecté à Systeme.io, pour capter et qualifier des leads. Éditeur de l'Atelier du Quiz.",
      founder: { "@id": `${HOTE_VENTE}/a-propos#person` },
      legalName: COMPANY.name,
      vatID: COMPANY.vat,
      address: { "@type": "PostalAddress", streetAddress: COMPANY.address, addressCountry: "FR" },
    },
  ],
};

function Externe({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="tq-pastille">
      {children}
    </a>
  );
}

export default function PageAPropos() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="tq-large pt-16 sm:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="tq-etiquette">À propos</p>
            <h1 className="mt-3 text-[2.4rem] sm:text-[3.3rem]">
              Moi c&apos;est Béné, et j&apos;ai créé <span className="tq-surb">Tiquiz</span>
            </h1>
            <p className="tq-doux mt-6 max-w-[58ch] text-[1.1rem] leading-relaxed">
              On me connaît pour Tiquiz, mon logiciel de création de quiz, et pour l&apos;Atelier du
              Quiz, où j&apos;apprends aux solopreneurs à transformer un simple quiz en machine à
              trouver des clients.
            </p>
            <p className="tq-doux mt-4 max-w-[58ch] text-[1.1rem] leading-relaxed">
              Mais pour comprendre pourquoi je fais ça, et pourquoi tu peux me croire quand je te
              parle de leads et d&apos;éthique, il faut revenir un peu en arrière.
            </p>
          </div>
          <div className="tq-carte-media max-w-[320px] justify-self-start lg:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bene.webp"
              alt="Bénédicte Lagardette, fondatrice de Tiquiz"
              width={560}
              height={560}
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <section className="tq-large py-20">
        <h2 className="text-[1.8rem]">D&apos;où je viens</h2>
        <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
          <p>
            Je viens d&apos;une famille modeste de vignerons du Beaujolais. Avant les tunnels de
            vente, j&apos;ai vendangé. J&apos;ai aussi été maître-nageuse, chauffeuse-livreuse,
            ambulancière.
          </p>
          <p>
            Puis j&apos;ai passé mon concours d&apos;infirmière à 27 ans, haut la main et sans
            prépa. Et j&apos;ai exercé là où ça compte vraiment : aux urgences en Corse, en
            ambulance en Suisse, dans la lutte contre la tuberculose, avec les pompiers.
          </p>
          <p>
            Mes valeurs, je les tiens de ces années et de mon éducation : prendre soin, pour de
            vrai. Protéger les plus fragiles, partager ce que je sais plutôt que de le garder pour
            moi, donner de mon temps, et tendre la main à celui qui galère. Accueillir chacun tel
            qu&apos;il est, avec son histoire et ses moyens, sans jamais le juger sur son point de
            départ.
          </p>
          <p>
            Mais attention : je suis sympa et j&apos;aide volontiers, ça ne veut pas dire que
            j&apos;encaisse tout et qu&apos;on peut me prendre pour une quiche. J&apos;ai assez
            roulé ma bosse dans ce milieu pour repérer quelqu&apos;un de malhonnête, et ça, je ne le
            supporte plus.
          </p>
        </div>
      </section>

      <section className="bg-[var(--tq-panneau)] py-16">
        <div className="tq-large">
          <h2 className="text-[1.8rem]">Et puis, à 34 ans, tout s&apos;est arrêté</h2>
          <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
            <p>
              Une hernie discale, une opération en urgence, puis deux autres. Je finis handicapée,
              en fauteuil, obèse et incapable de dormir, de tenir debout ou assise.
            </p>
            <p>
              Début 2020, je n&apos;avais plus un centime de revenu. Zéro. Enfin non, pas tout à
              fait : j&apos;ai droit à 387 € de pension d&apos;invalidité (ça paye même pas le
              loyer). Plus aucun but, une santé merdique et un traitement de cheval pour supporter
              la douleur. Et ça a duré pendant des mois.
            </p>
            <p>
              La médecine du travail avait beau dire que j&apos;étais inapte, il était hors de
              question pour moi de ne plus rien apporter à la société, de dépendre des aides
              sociales pour le restant de mes jours.
            </p>
            <p>
              Alors je m&apos;y suis mise, depuis mon lit, malgré la douleur et les insomnies.
              J&apos;ai découvert le marketing digital, l&apos;affiliation, la création de contenu.
              J&apos;ai lancé mon blog, blagardette.com, et j&apos;ai construit une audience en
              partant de rien. Je suis infiniment reconnaissante envers toutes ces personnes qui me
              suivent parfois depuis le début 🙏
            </p>
            <p>
              Pour être sincère : le traitement antalgique de ouf, les douleurs chroniques et les
              effets secondaires, j&apos;en souffrirai toute ma vie. Mais au moins j&apos;ai un but
              maintenant. Et je suis financièrement libre.
            </p>
          </div>
        </div>
      </section>

      <section className="tq-large py-20">
        <h2 className="text-[1.8rem]">L&apos;histoire d&apos;iziquiz, mon plus gros échec</h2>
        <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
          <p>
            J&apos;avais une conviction : le quiz est le meilleur outil pour capter et qualifier des
            leads. Cette intuition s&apos;est largement confirmée quand j&apos;ai étudié les études
            sérieuses sur le sujet et fait mes propres tests. Alors j&apos;ai voulu créer le
            logiciel qui allait avec, connecté à mon outil préféré : Systeme.io. Je l&apos;ai appelé
            iziquiz.
          </p>
          <p>
            Un associé m&apos;a rejointe, et ensemble on a confié le développement à un prestataire.
            Un type qui se vantait d&apos;avoir 30 ans d&apos;expérience, et qui savait bien vendre
            son truc.
          </p>
          <p>
            Deux ans à bosser comme une acharnée, pour rien. Un logiciel promis qui n&apos;arrivait
            jamais. 30 000 € partis en fumée. Une amitié gâchée. Et le pire, pour moi : des
            centaines de clients à qui on avait promis un outil, et qui se retrouvaient sans rien.
          </p>
          <p>
            Cette sensation, je ne l&apos;oublierai jamais. Avoir vendu une promesse sincère, y
            croire à fond, et se retrouver les mains vides devant des gens déçus.
          </p>
          <p>
            Beaucoup auraient tout arrêté là. Pas moi. Abandonner ces clients, mes convictions me
            l&apos;interdisaient : on ne laisse jamais quelqu&apos;un en plan. Encore moins
            quelqu&apos;un qui m&apos;a fait confiance et qui m&apos;a donné son argent durement
            gagné.
          </p>
        </div>

        <blockquote className="mt-10 max-w-[46rem] border-l-[3px] border-[var(--tq-bleu)] pl-5">
          <p className="text-[1.15rem] leading-relaxed">
            &quot;Tu as fait mieux en 2 mois qu&apos;un soi-disant développeur et ses 30 ans
            d&apos;expérience en 2 ans.&quot;
          </p>
          <footer className="tq-doux mt-2 text-sm">
            Mon ex-associé. Et il a raison. Je ne suis pas du genre à me vanter, mais j&apos;ai fait
            mieux, et j&apos;en suis fière.
          </footer>
        </blockquote>
      </section>

      <section className="bg-[var(--tq-panneau)] py-16">
        <div className="tq-large">
          <h2 className="text-[1.8rem]">Ce que j&apos;en ai fait : Tiquiz</h2>
          <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
            <p>
              J&apos;ai repris le projet. Seule. Et cette fois, j&apos;ai codé l&apos;outil moi-même,
              avec l&apos;intelligence artificielle comme copilote. Le résultat, c&apos;est Tiquiz :
              un logiciel meilleur que celui qu&apos;on avait imaginé au départ, connecté à
              Systeme.io (j&apos;ai tout mon business dessus depuis 2020), pensé pour les créateurs
              qui veulent des leads sans usine à gaz.
            </p>
            <p>
              Il y a un avantage que je n&apos;avais pas vu venir : l&apos;agilité. Comme je suis
              seule à la barre, je peux ajouter une fonctionnalité, corriger un bug ou améliorer un
              détail dans la journée, en écoutant directement les gens qui utilisent l&apos;outil.
              Pas de comité de direction, pas d&apos;associé à convaincre, pas de prestataire à
              relancer pendant des semaines.
            </p>
            <p>
              Alors oui, ça m&apos;a pris des mois et j&apos;ai franchement transpiré. J&apos;ai
              douté, je suis revenue en arrière, j&apos;ai perdu des semaines entières à cause
              d&apos;erreurs stupides. Mais j&apos;ai appris, et ce que je propose aujourd&apos;hui
              est aussi solide que n&apos;importe quel outil codé par un développeur avec de
              l&apos;expérience.
            </p>
            <p className="font-semibold text-[var(--tq-encre)]">
              L&apos;échec que je croyais fatal est devenu ma plus grande force.
            </p>
          </div>

          <div className="mt-10 grid max-w-[46rem] gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <h3 className="text-[1.1rem]">Tiquiz</h3>
              <p className="tq-doux mt-2 leading-relaxed">
                Le logiciel pour créer ton quiz et capturer des leads qualifiés, sans usine à gaz.
                Connecté à Systeme.io pour faciliter tout le processus.
              </p>
              <Link href="/" className="tq-bouton mt-5">
                Découvrir Tiquiz
              </Link>
            </div>
            <div className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <h3 className="text-[1.1rem]">L&apos;Atelier du Quiz</h3>
              <p className="tq-doux mt-2 leading-relaxed">
                La méthode en 7 jours pour faire de ton quiz un système fiable qui te ramène des
                clients de manière automatique et prédictible.
              </p>
              <a
                href={ATELIER_SALES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="tq-bouton tq-bouton-fantome mt-5"
              >
                Voir l&apos;Atelier
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="tq-large py-20">
        <h2 className="text-[1.8rem]">Les valeurs que je défends</h2>
        <div className="tq-doux mt-5 max-w-[46rem] space-y-4 leading-relaxed">
          <p>
            Il y a une règle à laquelle je n&apos;ai jamais renoncé : je préfère les gens qui
            partagent mes valeurs à l&apos;argent facile. La solidarité et la bienveillance,
            c&apos;est pas un argument de vente à mes yeux. C&apos;est ce qui m&apos;a sauvée. Alors
            c&apos;est ce que je mets au centre de tout.
          </p>
          <p>
            Dans mon travail, ça se traduit simplement : travail acharné, solidarité, éthique sans
            compromis. Je ne vends jamais de méthode &quot;miracle&quot;. Je code avec l&apos;IA,
            j&apos;adore le growth hacking, je suis passionnée par le copywriting, et je suis
            convaincue qu&apos;on peut réussir sans jamais forcer la main de personne.
          </p>
          <p>
            Ce que je gagne, je veux le mériter. Et je veux que mes clients gagnent aussi. Pour moi,
            un bon business est un business dans lequel tout le monde sort grandi.
          </p>
          <p className="font-semibold text-[var(--tq-encre)]">
            Je ne serai jamais la plus grosse boîte du marché. Mais je serai toujours celle qui est
            là pour de vrai, qui te répond, et qui améliore son outil pour toi, tous les jours.
          </p>
        </div>

        <h2 className="mt-14 text-[1.8rem]">Encore des doutes sur ma sincérité ?</h2>
        <p className="tq-doux mt-4 max-w-[46rem] leading-relaxed">
          Va lire les retours de mes clients sur mes pages Trustpilot. Tout y est.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {AVIS.map((a) => (
            <Externe key={a.url} href={a.url}>
              {a.nom}
            </Externe>
          ))}
        </div>

        <h2 className="mt-14 text-[1.8rem]">Où me suivre</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {RESEAUX.map((r) => (
            <Externe key={r.url} href={r.url}>
              {r.nom}
            </Externe>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/newsletter" className="tq-bouton">
            Recevoir ma newsletter
          </Link>
          <Link href="/blog" className="tq-bouton tq-bouton-fantome">
            Lire le blog
          </Link>
          <Link href="/support" className="tq-bouton tq-bouton-fantome">
            M&apos;écrire
          </Link>
        </div>

        <p className="mt-12 text-sm font-semibold">Béné</p>
        <p className="tq-doux mt-6 max-w-[46rem] text-sm leading-relaxed">
          Tiquiz et l&apos;Atelier du Quiz sont édités par {COMPANY.name} ({COMPANY.form}), dont je
          suis la dirigeante. L&apos;adresse et les mentions complètes sont sur la{" "}
          <a
            href="/mentions-legales"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            page des mentions légales
          </a>
          .
        </p>
      </section>
    </main>
  );
}
