// app/(site)/generateur-de-quiz/page.tsx
//
// LE GÉNÉRATEUR DE QUIZ, SUR SA PAGE.
//
// Béné, 8 septembre 2026 : "le générateur de quiz sur une page dédiée,
// optimisée seo, dans le style du blog et des pages de ventes etc."
//
// -- POURQUOI DU TEXTE AUTOUR DE L'OUTIL, ET PAS SEULEMENT L'OUTIL ----
//
// C'est la leçon du 7 septembre, mesurée sur le viewer public : une page
// dont tout le contenu est monté par le NAVIGATEUR ne dit RIEN à un
// moteur. Le générateur est 100 % côté client par nature (il streame la
// réponse du modèle), donc une page qui ne serait QUE lui servirait un
// titre et un formulaire vide, et rankerait sur rien.
//
// Tout ce qui suit est donc rendu par le SERVEUR, et le générateur est
// l'outil posé dedans. Le texte vit dans `lib/site/generateurQuiz.ts`,
// pur et testé : les chiffres y sont LUS dans le code qui les applique,
// jamais recopiés.
//
// -- LE STYLE EST CELUI DE LA PAGE DE VENTE, PAS UN DEUXIÈME ---------
//
// `.tql` et sa feuille (`components/landing/styles.ts`), les mêmes que
// la landing et `/tarifs`. Écrire une troisième feuille donnerait un
// troisième système visuel sur le même domaine, c'est à dire "trois
// sites empilés" (Béné, 4 septembre).
//
// -- ET L'OUTIL NE DEVINE PAS OÙ IL EST -------------------------------
//
// `contexte="page"` : hors iframe, `window.parent` EST `window`, donc le
// message que le bouton envoyait ne serait entendu par personne et le
// bouton serait MORT. Le paramètre est obligatoire, le compilateur le
// refuse quand on se tait. Voir `lib/embed/remise.ts`.

import type { Metadata } from "next";
import Link from "next/link";

import EmbedPreviewClient from "@/components/embed/EmbedPreviewClient";
import { CSS } from "@/components/landing/styles";
import { BandeFinale } from "@/components/landing/morceaux";
import { Chevron, Croix, Fleche } from "@/components/landing/pieces";
import { HOTE_VENTE } from "@/lib/publicHost";
import { contenuLanding } from "@/lib/site/landing";
import {
  CE_QUE_LIA_ECRIT,
  CE_QUIL_NE_FAIT_PAS,
  CHEMIN_GENERATEUR,
  ETAPES,
  FAQ,
  applicationJsonLd,
  faqJsonLd,
} from "@/lib/site/generateurQuiz";

const TITRE = "Générateur de quiz gratuit par IA";
const DESCRIPTION =
  "Décris ton sujet, l'IA écrit les questions, les réponses et les profils de résultat. Sans compte, sans carte bancaire, et tu gardes ton quiz.";

export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${HOTE_VENTE}${CHEMIN_GENERATEUR}` },
  openGraph: {
    type: "website",
    title: TITRE,
    description: DESCRIPTION,
    url: `${HOTE_VENTE}${CHEMIN_GENERATEUR}`,
    siteName: "Tiquiz",
    locale: "fr_FR",
  },
};

type PageProps = { searchParams?: Promise<{ session?: string; source?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  // LA PAGE EST EN FRANÇAIS, donc le bandeau de fin aussi. Le module de
  // contenu l'est déjà (même choix assumé que `fonctionnalites.ts` et
  // `avantages.ts`) : lui donner la langue de l'interface ferait une
  // page à moitié traduite, ce qui est pire qu'une page monolingue.
  const t = contenuLanding("fr");

  return (
    <main className="tql" lang="fr">
      <style>{CSS}</style>
      <script
        type="application/ld+json"
        // Les deux blocs sont construits depuis les MÊMES données que
        // l'écran : écrire une deuxième liste donnerait Google à qui on
        // raconte autre chose qu'à la lectrice (piège du 2 septembre).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />

      {/* ── 1. LE TITRE, ET L'OUTIL JUSTE DESSOUS ──────────────── */}
      {/* L'OUTIL EST EN HAUT parce que c'est ce que la visiteuse est
          venue chercher. Le texte qui explique vit dessous : il sert le
          référencement et celle qui hésite, pas celle qui a déjà son
          sujet en tête. */}
      <section className="tql-sec tql-hero">
        <span aria-hidden className="tql-blob tql-blob-a" />
        <div className="tql-large">
          <div className="tql-intro">
            <h1 className="tql-h1 tql-centre">
              Génère ton quiz <span className="tql-surb">en deux minutes</span>
            </h1>
            <p className="tql-p">
              Tu décris ton sujet et à qui tu parles. L&apos;IA écrit les questions,
              leurs réponses et les profils de résultat, dans ta langue. Tu relis, tu
              corriges, et tu gardes ton quiz. Sans compte, sans carte bancaire.
            </p>
          </div>

          <div className="tql-outil">
            <EmbedPreviewClient
              initialSessionToken={sp?.session ?? ""}
              locale="fr"
              source={sp?.source ?? "page-generateur"}
              // Le repli du bon de commande n'est jamais lu ici : c'est
              // la page hôte d'une iframe qui s'en sert, et il n'y a pas
              // d'iframe. Il reste passé parce que la prop est requise.
              checkoutUrl={`${HOTE_VENTE}/`}
              // HORS IFRAME : le bouton NAVIGUE, il n'envoie pas de
              // message à un parent qui n'existe pas.
              contexte="page"
            />
          </div>
        </div>
      </section>

      {/* ── 2. LES TROIS ÉTAPES ────────────────────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <div className="tql-intro">
            <h2 className="tql-h2">
              Comment ça <span className="tql-surb">marche</span>
            </h2>
            <p className="tql-p">
              Suis ces 3 étapes pour créer ton premier quiz interactif.
            </p>
          </div>
          <div className="tql-grille-3">
            {ETAPES.map((e, i) => (
              <div className="tql-carte" key={e.titre}>
                <span className="tql-pastille-etape">Étape {i + 1}</span>
                <h3 className="tql-h3">{e.titre}</h3>
                <p className="tql-p-g">{e.corps}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. CE QUE L'IA ÉCRIT VRAIMENT ──────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large">
          <div className="tql-intro">
            <h2 className="tql-h2">
              Ce que l&apos;IA écrit <span className="tql-surb">à ta place</span>
            </h2>
            <p className="tql-p">
              Tiquiz te donne un quiz déjà optimisé pour attirer tes futurs clients
              et les amener à te confier leur email. Mais tu gardes la main sur
              tout : édite-le à l&apos;infini.
            </p>
          </div>
          <div className="tql-grille-2">
            {CE_QUE_LIA_ECRIT.map((b) => (
              <div className="tql-carte" key={b.titre}>
                <h3 className="tql-h3">{b.titre}</h3>
                {b.corps.map((p) => (
                  <p className="tql-p-g" key={p}>
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. CE QU'IL NE FAIT PAS ────────────────────────────── */}
      {/* Béné, 5 septembre : "savoir dire non est ce qui rend croyable
          tout le reste". Et un refus qui ne dit pas ce qui se passe à la
          place n'est pas un refus, c'est une excuse : chaque ligne porte
          les deux moitiés. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">
            Ce que le générateur <span className="tql-surb">ne fait pas</span>
          </h2>
          <ul className="tql-non-liste">
            {CE_QUIL_NE_FAIT_PAS.map((r) => (
              <li key={r.refus}>
                <Croix />
                <span>
                  <span className="tql-val">{r.refus}.</span> {r.alaplace}
                </span>
              </li>
            ))}
          </ul>
          <p className="tql-p">
            Si l&apos;un des trois est indispensable chez toi, ne prends pas Tiquiz :
            tu perdrais ton temps, et nous aussi.
          </p>
        </div>
      </section>

      {/* ── 5. LA FAQ ──────────────────────────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large tql-lire-bloc">
          <div className="tql-intro">
            <h2 className="tql-h2">Les questions qu&apos;on nous pose</h2>
            <p className="tql-p">
              Sur le générateur, sur ce qu&apos;il coûte, et sur ce que ton quiz
              devient après.
            </p>
          </div>
          {FAQ.map((f) => (
            <details className="tql-faq" key={f.q}>
              <summary>
                {f.q}
                <Chevron />
              </summary>
              <p>{f.r}</p>
            </details>
          ))}
          {/* LE MAILLAGE : d'ici on va voir le détail, ou le prix. */}
          <p className="tql-legende">
            <Link href="/fonctionnalites">
              Tout ce que Tiquiz sait faire
              <Fleche />
            </Link>
          </p>
        </div>
      </section>

      <BandeFinale t={t} />
    </main>
  );
}
