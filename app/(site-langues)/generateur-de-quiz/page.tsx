// app/(site-langues)/generateur-de-quiz/page.tsx
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
//
// -- LA PAGE VIT DANS `(site-langues)`, ET CE N'EST PAS UN RANGEMENT --
//
// Elle est servie en `fr` ET en `en` (8 septembre), donc elle lit
// `langueCanonique()`, donc elle est DYNAMIQUE. Le groupe `(site)`
// reste statique pour les 8 pages qui n'ont pas de version anglaise :
// un `headers()` dans leur layout commun paierait un rendu par requête
// sur des pages qui commencent justement à ranker.

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import EmbedPreviewClient from "@/components/embed/EmbedPreviewClient";
import { CSS } from "@/components/landing/styles";
import { BandeFinale } from "@/components/landing/morceaux";
import { Chevron, Croix, Fleche } from "@/components/landing/pieces";
import { HOTE_VENTE } from "@/lib/publicHost";
import { contenuLanding } from "@/lib/site/landing";
import { alternatesDeLangue, languePubliqueDuTexte } from "@/lib/site/langues";
import { langueCanonique } from "@/lib/site/langueRequete";
import { hrefPourLangue } from "@/lib/site/nav";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import {
  CHEMIN_GENERATEUR,
  CHROME_GENERATEUR,
  SOURCE_GENERATEUR,
  applicationJsonLd,
  ceQueLIaEcrit,
  ceQuilNeFaitPas,
  etapes,
  faq,
  faqJsonLd,
  urlGenerateur,
} from "@/lib/site/generateurQuiz";

type PageProps = {
  searchParams?: Promise<{ session?: string; source?: string; lang?: string }>;
};

// LA LANGUE DU TEXTE ET CELLE DE L'ADRESSE SONT DEUX QUESTIONS.
//
// Le texte suit la langue résolue (l'URL, sinon un `?lang=` d'aperçu,
// sinon le cookie) ; la canonique suit l'ADRESSE seule. Les confondre
// ferait annoncer deux canoniques pour la même URL selon le visiteur,
// et c'est celle du robot qui compterait (règle du 8 septembre).
async function resoudreLangue(searchParams?: PageProps["searchParams"]) {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) {
    return languePubliqueDuTexte(brut);
  }
  return languePubliqueDuTexte(await getLocale());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const langue = await resoudreLangue(searchParams);
  const t = CHROME_GENERATEUR[langue];
  const canonique = await langueCanonique();
  const alternates = alternatesDeLangue(HOTE_VENTE, CHEMIN_GENERATEUR, canonique);
  return {
    title: t.metaTitre,
    description: t.metaDescription,
    ...(alternates ? { alternates } : {}),
    openGraph: {
      type: "website",
      title: t.metaTitre,
      description: t.metaDescription,
      url: urlGenerateur(canonique),
      siteName: "Tiquiz",
      locale: t.ogLocale,
    },
  };
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const langue = await resoudreLangue(searchParams);
  const t = CHROME_GENERATEUR[langue];
  const landing = contenuLanding(langue);
  // LES LIENS INTERNES PASSENT PAR `hrefPourLangue`, jamais par un
  // préfixe posé à la main : il ne préfixe que les chemins dont la
  // version anglaise est DÉCLARÉE. Sans lui, un `/en/` collé à
  // l'aveugle fabriquerait un 404 au bout d'un lien.
  const lien = (chemin: string) => hrefPourLangue(chemin, langue);

  return (
    <main className="tql" lang={langue}>
      <style>{CSS}</style>
      <script
        type="application/ld+json"
        // Les deux blocs sont construits depuis les MÊMES données que
        // l'écran : écrire une deuxième liste donnerait Google à qui on
        // raconte autre chose qu'à la lectrice (piège du 2 septembre).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationJsonLd(langue)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(langue)) }}
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
              {t.h1} <span className="tql-surb">{t.h1Surb}</span>
            </h1>
            <p className="tql-p">{t.chapo}</p>
          </div>

          <div className="tql-outil">
            <EmbedPreviewClient
              initialSessionToken={sp?.session ?? ""}
              // L'OUTIL SUIT LA LANGUE DE LA PAGE : un générateur en
              // français sous une adresse anglaise est exactement la
              // panne que ce chantier existe pour fermer, et elle ne se
              // verrait sur aucun écran français.
              locale={langue}
              // LA PORTE EST DÉCIDÉE PAR LA ROUTE, JAMAIS PAR L'URL.
              //
              // Ce `source` là est la PORTE (quelle surface héberge le
              // générateur) : il est écrit dans `embed_quiz_sessions`, et
              // `construireEntonnoirGenerateur` ne compte QUE les lignes
              // qui portent `page-generateur`.
              //
              // Il portait `sp?.source ?? …`, et la landing de Béné pose
              // maintenant `?source=modeles` sur ses six cartes : chacune
              // aurait écrit `modeles` dans cette colonne, donc TOUTES ces
              // générations auraient disparu de son entonnoir pendant que
              // les vues de la page, elles, restaient. Le seul ratio
              // qu'elle lit se serait effondré sans que rien ne casse.
              //
              // Le PARCOURS (`hero` / `modeles` / `direct`), lui, se lit
              // sur l'adresse côté client et part dans GA4. Deux questions
              // différentes, deux lectures qui ne se croisent plus.
              source={SOURCE_GENERATEUR}
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
              {t.titreEtapes} <span className="tql-surb">{t.titreEtapesSurb}</span>
            </h2>
            <p className="tql-p">{t.chapoEtapes}</p>
          </div>
          <div className="tql-grille-3">
            {etapes(langue).map((e, i) => (
              <div className="tql-carte" key={e.id}>
                <span className="tql-pastille-etape">
                  {t.etapeMot} {i + 1}
                </span>
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
              {t.titreIa} <span className="tql-surb">{t.titreIaSurb}</span>
            </h2>
            <p className="tql-p">{t.chapoIa}</p>
          </div>
          <div className="tql-grille-2">
            {ceQueLIaEcrit(langue).map((b) => (
              <div className="tql-carte" key={b.id}>
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
            {t.titreRefus} <span className="tql-surb">{t.titreRefusSurb}</span>
          </h2>
          <ul className="tql-non-liste">
            {ceQuilNeFaitPas(langue).map((r) => (
              <li key={r.id}>
                <Croix />
                <span>
                  <span className="tql-val">{r.refus}.</span> {r.alaplace}
                </span>
              </li>
            ))}
          </ul>
          <p className="tql-p">{t.refusFin}</p>
        </div>
      </section>

      {/* ── 5. LA FAQ ──────────────────────────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large tql-lire-bloc">
          <div className="tql-intro">
            <h2 className="tql-h2">{t.titreFaq}</h2>
            <p className="tql-p">{t.chapoFaq}</p>
          </div>
          {faq(langue).map((f) => (
            <details className="tql-faq" key={f.id}>
              <summary>
                {f.q}
                <Chevron />
              </summary>
              <p>{f.r}</p>
            </details>
          ))}
          {/* LE MAILLAGE : d'ici on va voir le détail, ou le prix. */}
          <p className="tql-legende">
            <Link href={lien("/fonctionnalites")}>
              {t.versFonctionnalites}
              <Fleche />
            </Link>
          </p>
        </div>
      </section>

      <BandeFinale t={landing} />
    </main>
  );
}
