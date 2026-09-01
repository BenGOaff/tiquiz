// components/site/Integrations.tsx
//
// LES BRIQUES COMMUNES DES SIX PAGES `/integrations`.
//
// Une page d'intégration a toujours la même charpente : un fil
// d'Ariane, un encadré "En bref", un tableau, des captures qui servent
// de PREUVE, et une FAQ. Écrire ça six fois, c'est six occasions
// d'oublier un `alt` ou un `loading="lazy"`, et ce dépôt a déjà payé
// six fois la règle recopiée dans chaque composant.
//
// -- CE QUE CES COMPOSANTS IMPOSENT ------------------------------------
//
// - le `alt` est OBLIGATOIRE dans le type : ces images sont des
//   preuves, pas de la décoration, et un `alt` vide les retire de la
//   page pour une lectrice aveugle comme pour un moteur ;
// - `width` et `height` sont obligatoires aussi : sans eux la page
//   saute au chargement, ce qui coûte cher au classement ;
// - AUCUN aplat de couleur sous du texte (règle du 31 août, sortie
//   trois fois). L'encadré est blanc, bordé, avec un FILET HORIZONTAL
//   à la couleur de marque. Un filet vertical déplacerait le texte.
// - le tableau SCROLLE dans sa boîte : sans ça, c'est la page entière
//   qui part en travers sur un téléphone.

import Link from "next/link";

/** Le fil d'Ariane visible, doublé d'un JSON-LD par la page. */
export function FilDAriane({ etapes }: { etapes: readonly { nom: string; chemin?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="tq-doux text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {etapes.map((e, i) => (
          <li key={e.nom} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {e.chemin ? (
              <Link href={e.chemin} className="underline underline-offset-2">
                {e.nom}
              </Link>
            ) : (
              <span aria-current="page">{e.nom}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * L'ENCADRÉ "EN BREF", PREMIER ÉLÉMENT APRÈS LE H1.
 *
 * C'est le bloc que les moteurs et les assistants citent, et c'est ce
 * qui permet de répondre à la question sans faire descendre le lecteur.
 * Il passe donc AVANT la première image, toujours.
 */
export function EnBref({ children }: { children: React.ReactNode }) {
  return (
    <aside className="tq-lire mt-8 rounded-2xl border border-[var(--tq-bord)] bg-white p-6">
      <div className="h-1 w-12 rounded-full bg-[var(--tq-bleu)]" aria-hidden />
      <p className="tq-etiquette mt-4">En bref</p>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </aside>
  );
}

/**
 * Une capture d'écran, à la largeur du texte.
 *
 * `premiere` retire le `loading="lazy"` : l'image en haut de page est
 * celle que le visiteur voit tout de suite, la différer la fait
 * apparaître après coup.
 */
export function Capture({
  src,
  alt,
  largeur,
  hauteur,
  legende,
  premiere = false,
  epingle,
}: {
  src: string;
  alt: string;
  largeur: number;
  hauteur: number;
  legende?: string;
  premiere?: boolean;
  /**
   * Les attributs `data-pin-*` de la page, quand elle a une épingle
   * verticale. Une capture en 16/9 ne circule pas dans un flux
   * Pinterest : c'est ce que ces attributs servent à corriger, en
   * désignant l'image 1000 x 1500 à sa place.
   */
  epingle?: Record<string, string>;
}) {
  return (
    <figure className="tq-lire mt-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={largeur}
        height={hauteur}
        loading={premiere ? "eager" : "lazy"}
        decoding="async"
        className="w-full rounded-xl border border-[var(--tq-bord)]"
        {...(epingle ?? {})}
      />
      {legende ? <figcaption className="tq-doux mt-3 text-sm">{legende}</figcaption> : null}
    </figure>
  );
}

/**
 * LE LOGO OFFICIEL D'UN OUTIL, À SON FORMAT.
 *
 * `height` fixe, `width: auto` : un logo est un MOT, pas une icône
 * carrée. Le forcer dans un carré de 96 écraserait "Typeform" et
 * étirerait "Google Forms". C'est la règle des images de réponse d'un
 * quiz (4 août), appliquée ici.
 *
 * Les dimensions naturelles sont posées sur la balise pour que le
 * navigateur réserve la place : sans elles, la ligne saute au moment où
 * le logo arrive.
 */
export function Logo({
  logo,
  nom,
  hauteur = 24,
}: {
  logo: { src: string; largeur: number; hauteur: number };
  nom: string;
  hauteur?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt={`Logo ${nom}`}
      width={logo.largeur}
      height={logo.hauteur}
      loading="lazy"
      decoding="async"
      style={{ height: hauteur, width: "auto" }}
      className="max-w-full"
    />
  );
}

/**
 * Un tableau de comparaison.
 *
 * VRAIE BALISE `<table>`, jamais une image : c'est le format que les
 * moteurs extraient le plus volontiers, il se sélectionne, et il reste
 * lisible sur un téléphone. Une capture d'écran ne fait aucun des trois.
 */
export function Tableau({
  entetes,
  lignes,
  legende,
}: {
  entetes: readonly string[];
  lignes: readonly (readonly React.ReactNode[])[];
  legende?: string;
}) {
  return (
    <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--tq-bord)]">
      <table className="w-full min-w-[38rem] border-collapse text-left text-[0.95rem]">
        {legende ? <caption className="sr-only">{legende}</caption> : null}
        <thead>
          <tr className="bg-[var(--tq-panneau)]">
            {entetes.map((e) => (
              <th key={e} scope="col" className="px-4 py-3 font-semibold">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} className="border-t border-[var(--tq-bord)] align-top">
              {l.map((c, j) => (
                <td key={j} className="px-4 py-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** La FAQ, VISIBLE sur la page (et déclarée en JSON-LD par la page). */
export function Faq({ questions }: { questions: readonly { q: string; r: string }[] }) {
  return (
    <section className="tq-large mt-20">
      <h2 className="text-[2rem]">Questions fréquentes</h2>
      <dl className="tq-lire mt-8 space-y-8">
        {questions.map((x) => (
          <div key={x.q}>
            <dt className="text-[1.05rem] font-bold">{x.q}</dt>
            <dd className="tq-doux mt-2 leading-relaxed">{x.r}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
