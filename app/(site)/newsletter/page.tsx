// app/(site)/newsletter/page.tsx
//
// LA PAGE D'INSCRIPTION À LA PÉPITE DU LUNDI.
//
// Remplace `tipote.fr/newsletter`. Le contenu est CELUI DE BÉNÉ, repris
// de sa page Systeme.io (31 août 2026) : le rendez-vous du lundi, ce
// qu'il y a dedans, les thèmes, ce qu'il n'y a PAS dedans, l'invitation
// à répondre, et sa note de franchise.
//
// -- CE QUI A ÉTÉ ADAPTÉ, ET POURQUOI ---------------------------------
//
// Sa page d'origine posait "Ce qu'il n'y a pas dedans" sur un APLAT
// MARINE avec du texte blanc, et l'entête de la maquette d'email de
// même. **Sa propre règle du 31 août l'interdit** : "supprime
// l'arrière plan bleu sous le texte, j'en veux pas, NULLE PART. Notre
// branding c'est celui des pages de vente." `branding-site.test.mts`
// le refuse d'ailleurs sur les écrans du site public.
//
// Le rythme de sa page est donc conservé (le bloc existe, il se
// distingue, il se lit d'un coup), mais par un CADRE et un filet
// HORIZONTAL, pas par un fond. Un filet vertical déplacerait ce qu'il
// décore (règle du 3 août, mesurée à 20 px).
//
// -- LE LIEN LÉGAL EST LE NÔTRE ----------------------------------------
//
// Sa page renvoyait à `/politique-de-confidentialite`, une adresse de
// Systeme.io. Ici c'est `/privacy`, notre page, et elle s'ouvre dans un
// nouvel onglet : quelqu'un qui a déjà tapé son prénom et son adresse
// ne doit pas les perdre pour aller lire une politique.

import type { Metadata } from "next";

import { adresseExpediteur } from "@/lib/email/tiquizShell";
import { HOTE_VENTE } from "@/lib/publicHost";
import FormulaireNewsletter from "@/components/site/FormulaireNewsletter";

const TITRE = "La pépite du lundi : une action à tester avant vendredi";
const DESCRIPTION =
  "Deux minutes de lecture, une chose que j'ai testée et qui a marché, et une action précise à essayer dans la semaine. Cet email ne vend rien : il donne.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}/newsletter` },
  openGraph: {
    type: "website",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}/newsletter`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

/** Ce qu'il y a dans chaque envoi. Ses quatre blocs, ses mots. */
const DEDANS = [
  {
    tag: "La pépite",
    titre: "Un truc que j'ai testé",
    texte:
      "Un réglage, une tournure, une source de trafic, une habitude. Quelque chose de précis, expliqué en deux minutes, pas un grand principe.",
  },
  {
    tag: "L'action",
    titre: "À tester avant vendredi",
    texte:
      "Chaque email se termine par une seule action, écrite noir sur blanc. Tu la fais ou tu ne la fais pas, mais tu n'as pas à te demander par où commencer.",
  },
  {
    tag: "Les coulisses",
    titre: "Ce que je fabrique",
    texte:
      "Les nouveautés de Tiquiz et de l'Atelier du Quiz, ce que je viens de changer et pourquoi. Y compris quand j'ai dû revenir en arrière.",
  },
  {
    tag: "Toi",
    titre: "Tu réponds, je lis",
    texte:
      "Chaque email finit par la même invitation, et ce n'est pas une formule : je lis toutes les réponses. Tes questions deviennent souvent la pépite du lundi suivant.",
  },
] as const;

const THEMES = [
  "Copywriting et vente",
  "Contenu et réseaux sociaux",
  "Productivité et organisation",
  "Offres et produits",
  "Titres et accroches",
  "Emails et newsletter",
  "Vidéo et YouTube",
  "Acquisition",
  "Lancements et promos",
] as const;

/** Ce qu'il n'y a PAS dedans. Elle le dit : c'est ce qui fait rester. */
const PAS_DEDANS = [
  {
    fort: "Pas de vente",
    suite:
      ". Le lundi, je donne. Quand j'ai quelque chose à te proposer, je t'écris à un autre moment, et tu verras tout de suite la différence.",
  },
  {
    fort: "Pas de faux compte à rebours",
    suite:
      ", pas de « plus que 3 places » quand il y en a mille. Je ne mens pas, même pour vendre.",
  },
  {
    fort: "Pas de secret ni de méthode magique",
    suite:
      ". Ce que je sais faire, je te l'explique, et tu peux très bien l'appliquer sans rien m'acheter.",
  },
  {
    fort: "Pas de recommandation que je n'ai pas testée",
    suite:
      ". Quand un outil ne me convainc pas, je n'en parle pas, même si on me paie pour.",
  },
  {
    fort: "Pas de remplissage",
    suite:
      ". Deux minutes, une idée, une action. Si je n'ai rien de neuf à te donner, je ne t'écris pas pour tenir un rythme.",
  },
] as const;

export default function PageNewsletter() {
  return (
    <main className="tq-large py-16 sm:py-24">
      {/* ── LE RENDEZ-VOUS DU LUNDI ── */}
      <section className="grid gap-12 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
        <div>
          <p className="tq-etiquette">Le rendez-vous du lundi</p>
          <h1 className="mt-3 text-[2.4rem] leading-[1.07] sm:text-[3.2rem]">
            Une pépite le lundi, une <span className="tq-surb">action avant vendredi</span>.
          </h1>
          <p className="tq-doux mt-6 text-[1.15rem] leading-relaxed">
            Deux minutes de lecture, une chose que j&apos;ai testée et qui a marché, et une
            action précise à essayer dans la semaine. Cet email-là ne vend rien :{" "}
            <strong>il donne</strong>, et il est utile même si tu ne m&apos;achètes jamais rien.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              <>
                <strong>Une action concrète à chaque fois</strong>, pas une idée à méditer. Tu la
                testes avant vendredi ou tu la jettes.
              </>,
              <>
                <strong>Rien que je n&apos;aie essayé moi-même</strong>, avec les chiffres quand
                j&apos;en ai et les ratages quand il y en a eu.
              </>,
              <>
                <strong>Tu te désinscris en un clic</strong>, en bas de chaque message, sans avoir
                à te justifier.
              </>,
            ].map((item, i) => (
              <li key={i} className="tq-doux flex gap-3 leading-relaxed">
                <span
                  aria-hidden
                  className="mt-[7px] h-[7px] w-[7px] flex-none rounded-full bg-[var(--tq-bleu)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* La maquette d'email. Décorative : cachée aux lecteurs d'écran,
            qui liraient sinon un faux message par dessus le vrai texte. */}
        <div
          aria-hidden
          className="overflow-hidden rounded-2xl border border-[var(--tq-bord)] bg-white shadow-[0_18px_44px_rgba(22,24,46,.13)]"
        >
          <div className="flex items-center gap-2 border-b border-[var(--tq-bord)] bg-[var(--tq-panneau)] px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-[var(--tq-bord)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--tq-bord)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--tq-bord)]" />
            <span className="ml-auto text-[11px] font-bold uppercase tracking-[.1em] text-[var(--tq-encre-douce)]">
              Lundi
            </span>
          </div>
          <div className="px-5 pb-6 pt-5">
            <div className="mb-4 flex items-center gap-3 border-b border-[var(--tq-bord)] pb-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--tq-bleu)] text-sm font-extrabold text-white">
                B
              </span>
              <span className="min-w-0 text-sm font-bold leading-tight">
                Béné
                <span className="block break-words text-[12.5px] font-normal text-[var(--tq-encre-douce)]">
                  {adresseExpediteur()}
                </span>
              </span>
            </div>
            <p className="text-[1.15rem] font-extrabold leading-tight">Arrête de publier</p>
            <p className="tq-doux mt-2 text-sm leading-relaxed">
              Ton meilleur post de l&apos;année, la majorité de tes abonnés ne l&apos;ont jamais
              vu. Et ceux qui l&apos;ont vu il y a quatre mois l&apos;ont oublié. Tu as un stock
              qui dort.
            </p>
            <div className="mt-3 rounded-xl border border-[var(--tq-bord)] p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[.06em] text-[var(--tq-bleu-fonce)]">
                Ton action de la semaine
              </p>
              <p className="tq-doux mt-1 text-[13.5px] leading-relaxed">
                Va dans tes stats, repère tes 3 posts au-dessus de ta moyenne, et reprogramme le
                meilleur tel quel pour jeudi.
              </p>
            </div>
            <p className="mt-3 text-[13.5px] text-[var(--tq-encre-douce)]">
              Bonne semaine ! Béné
            </p>
          </div>
        </div>
      </section>

      {/* ── LE FORMULAIRE ── */}
      <section className="mt-16">
        <FormulaireNewsletter contact={adresseExpediteur()} />
      </section>

      {/* ── CE QU'IL Y A DEDANS ── */}
      <section className="mt-20">
        <div className="h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />
        <h2 className="mt-5 text-[1.6rem] sm:text-[1.9rem]">Ce qu&apos;il y a dedans</h2>
        <p className="tq-doux mt-3 max-w-[62ch] text-[1.05rem] leading-relaxed">
          Le format ne bouge pas d&apos;une semaine à l&apos;autre. Tu sais ce que tu ouvres, et
          tu l&apos;as lu avant la fin de ton café.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DEDANS.map((c) => (
            <div key={c.tag} className="rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
              <p className="text-[11.5px] font-extrabold uppercase tracking-[.13em] text-[var(--tq-bleu-fonce)]">
                {c.tag}
              </p>
              <h3 className="mt-3 text-[1.1rem] font-extrabold leading-tight">{c.titre}</h3>
              <p className="tq-doux mt-2 text-[15.5px] leading-relaxed">{c.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LES THÈMES ── */}
      <section className="mt-20">
        <div className="h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />
        <h2 className="mt-5 text-[1.6rem] sm:text-[1.9rem]">Les thèmes que je couvre</h2>
        <p className="tq-doux mt-3 max-w-[62ch] text-[1.05rem] leading-relaxed">
          J&apos;écris sur ce que je pratique tous les jours. Une semaine tu apprends à écrire une
          accroche, la suivante à ranger ta journée, celle d&apos;après à construire une offre.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <li
              key={t}
              className="rounded-full border border-[var(--tq-bord)] bg-white px-4 py-2 text-[14.5px] font-bold"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* ── CE QU'IL N'Y A PAS DEDANS ──
          Sa page d'origine posait ce bloc sur un aplat marine. Sa règle
          du 31 août l'interdit : cadre et filet, jamais de fond. */}
      <section className="mt-20">
        <div className="rounded-3xl border border-[var(--tq-bord)] bg-white p-8 sm:p-10">
          <div className="h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />
          <h2 className="mt-5 text-[1.6rem] sm:text-[1.9rem]">
            Ce qu&apos;il n&apos;y a pas dedans
          </h2>
          <p className="tq-doux mt-3 leading-relaxed">
            C&apos;est peut-être plus important que le reste, parce que c&apos;est ce qui te fera
            rester.
          </p>
          <ul className="mt-6 space-y-3">
            {PAS_DEDANS.map((p) => (
              <li key={p.fort} className="tq-doux flex gap-3 leading-relaxed">
                <span
                  aria-hidden
                  className="mt-[3px] grid h-5 w-5 flex-none place-items-center rounded-full border border-[var(--tq-bord)] text-[11px] font-extrabold text-[var(--tq-bleu-fonce)]"
                >
                  ✕
                </span>
                <span>
                  <strong>{p.fort}</strong>
                  {p.suite}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── RÉPONDS-MOI ── */}
      <section className="mt-16">
        <div className="rounded-3xl border border-[var(--tq-bord)] bg-[var(--tq-panneau)] p-8 sm:p-10">
          <h2 className="text-[1.5rem] sm:text-[1.75rem]">Réponds-moi, vraiment</h2>
          <p className="tq-doux mt-3 leading-relaxed">
            Ce n&apos;est pas une adresse qui n&apos;existe pas. J&apos;adore recevoir des
            réponses, et je les lis toutes (je ne réponds pas toujours le jour même, mais je
            réponds).
          </p>
          <p className="tq-doux mt-3 leading-relaxed">
            Dis-moi si tu as testé la pépite, raconte-moi ce qui coince, envoie-moi ton quiz si tu
            veux un avis. C&apos;est souvent comme ça que je trouve le sujet du lundi suivant.
          </p>
        </div>
      </section>

      {/* ── FRANCHISE ── */}
      <section className="mt-16">
        <div className="rounded-2xl border border-[var(--tq-bord)] p-7">
          <h3 className="text-[1.1rem] font-extrabold">
            Une dernière chose, pour être honnête
          </h3>
          <p className="tq-doux mt-3 leading-relaxed">
            Mes résultats sont le reflet de plusieurs années de travail. Ils ne s&apos;obtiennent
            ni facilement, ni rapidement, et personne ne peut te garantir les tiens. Méfie-toi de
            ceux qui te promettent le contraire.
          </p>
          <p className="tq-doux mt-3 leading-relaxed">
            Ce que je peux te promettre, c&apos;est de te donner ce qui a marché chez moi, avec le
            contexte, pour que tu décides toi-même si ça s&apos;applique à ta situation.
          </p>
          <p className="mt-5 text-sm font-semibold">Béné</p>
        </div>

        <p className="tq-doux mt-6 text-sm leading-relaxed">
          Pour recevoir mes emails, ajoute <strong>{adresseExpediteur()}</strong> à tes contacts, sinon
          le premier message risque d&apos;atterrir dans les indésirables. Ton adresse sert à
          t&apos;envoyer cette newsletter et mes offres, elle n&apos;est ni vendue ni transmise,
          et le lien de désinscription est en bas de chaque message. Le détail est dans ma{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            politique de confidentialité
          </a>
          .
        </p>
      </section>
    </main>
  );
}
