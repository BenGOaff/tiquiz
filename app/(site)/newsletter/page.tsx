// app/(site)/newsletter/page.tsx
//
// LA PAGE D'INSCRIPTION À LA NEWSLETTER.
//
// Remplace `tipote.fr/newsletter`. Le contact part chez Systeme.io avec
// le tag `newsletter`, qui est le segment qu'elle adresse : les emails
// restent chez eux, c'est la décision du 24 août.

import type { Metadata } from "next";

import { HOTE_VENTE } from "@/lib/publicHost";
import FormulaireNewsletter from "@/components/site/FormulaireNewsletter";

const TITRE = "La newsletter de Béné : quiz, leads et Systeme.io";
const DESCRIPTION =
  "Ce que je teste, ce qui marche et ce qui rate, dans mes propres quiz. Sans bullshit, et tu te désinscris en un clic.";

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

export default function PageNewsletter() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <p className="tq-etiquette">La newsletter</p>
      <h1 className="mt-3 text-[2.4rem] sm:text-[3.2rem]">
        Ce que je teste, et ce qui <span className="tq-surb">rate aussi</span>
      </h1>
      <p className="tq-doux mt-6 text-[1.1rem] leading-relaxed">
        J&apos;écris quand j&apos;ai quelque chose à dire, pas tous les mardis à 9 h parce
        qu&apos;un calendrier le demande. Dedans : les quiz que je monte, les chiffres qu&apos;ils
        font, les trucs que j&apos;ai essayés et qui n&apos;ont rien donné (ceux-là, personne ne
        les raconte).
      </p>

      <ul className="tq-doux mt-8 space-y-3 leading-relaxed">
        <li>
          Des méthodes que tu peux appliquer le soir même, pas des grands principes.
        </li>
        <li>
          Les coulisses de Tiquiz : ce qu&apos;on construit, pourquoi, et ce qu&apos;on a cassé en
          route.
        </li>
        <li>
          Les retours de vraies personnes qui utilisent leurs quiz pour vendre.
        </li>
      </ul>

      <div className="mt-10">
        <FormulaireNewsletter />
      </div>

      <p className="tq-doux mt-6 text-sm leading-relaxed">
        Je ne revends jamais ton adresse, je ne t&apos;inscris à rien d&apos;autre, et le lien de
        désinscription est en bas de chaque email. Si tu pars, tu pars, je ne t&apos;écrirai pas
        pour te demander pourquoi.
      </p>
      <p className="mt-8 text-sm font-semibold">Béné</p>
    </main>
  );
}
