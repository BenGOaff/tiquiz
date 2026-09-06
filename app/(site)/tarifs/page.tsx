// app/(site)/tarifs/page.tsx
//
// LA VRAIE PAGE DE VENTE.
//
// Béné, 6 septembre 2026 : "/tarifs = la vraie page de vente (à créer)."
// La landing répond "combien ça coûte" en trois lignes et renvoie ici ;
// c'est ici qu'on choisit, donc c'est ici que vit tout ce qui aide à
// choisir. "Rien n'est à jeter. Tout est à déplacer."
//
// -- SON ORDRE, ET IL N'EST PAS DÉCORATIF ----------------------------
//
//   1. les trois paliers, avec la bascule mensuel / annuel
//   2. la grille complète "ce que tu as dans chaque palier"
//   3. la comparaison de coût (ce que ça remplace)
//   4. les CINQ objections, en entier
//   5. la FAQ argent, et rien d'autre
//   6. les 14 témoignages restants
//   7. le bandeau final
//
// Le prix passe DEVANT, parce que quelqu'un qui arrive ici vient le
// chercher ; tout ce qui suit répond à ce qu'on se dit APRÈS l'avoir vu.
//
// -- CE QUI VIENT D'AILLEURS, ET N'EST PAS RECOPIÉ -------------------
//
//   les prix ................. OWNER_CATALOG (le bon de commande)
//   les limites du gratuit ... FREE_LIMITS
//   les lignes de palier ..... lib/checkout/avantages.ts
//   les coûts comparés ....... lib/blog/liensIntegrations.ts
//   les questions ............ le FAQPage de content/sales/tiquiz.html
//   les témoignages .......... sa page de vente, verbatim
//
// Sept sources, zéro recopie. C'est le défaut que ce dépôt paie en
// boucle depuis juin, et ici il vivrait sur l'écran où quelqu'un sort
// sa carte.

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { SUPPORTED_LOCALES } from "@/i18n/config";
import { HOTE_VENTE } from "@/lib/publicHost";
import {
  TEMOIGNAGES,
  colonnesDeTarif,
  comparaisonDeCout,
  comparatifDesPlans,
  contenuLanding,
  faqArgent,
  temoinsTarifs,
  blocLong,
} from "@/lib/site/landing";
import { CSS } from "@/components/landing/styles";
import { faqDeLaPageDeVente } from "@/components/landing/faq";
import { BandeFinale, BlocComparatif, BlocTarifs } from "@/components/landing/morceaux";
import { Chevron, CochePleine, Fleche } from "@/components/landing/pieces";

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>): Promise<string> {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) return brut;
  return await getLocale();
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuLanding(await resoudreLangue(searchParams));
  return {
    title: t.tarifsMetaTitre,
    description: t.tarifsMetaDescription,
    alternates: { canonical: `${HOTE_VENTE}/tarifs` },
  };
}

export default async function TarifsPage({ searchParams }: PageProps) {
  const t = contenuLanding(await resoudreLangue(searchParams));
  const colonnes = colonnesDeTarif(t);
  const comparatif = comparatifDesPlans(t);
  const cout = comparaisonDeCout(t);
  const argent = faqArgent(t, faqDeLaPageDeVente());
  const temoins = temoinsTarifs(TEMOIGNAGES);

  return (
    <main className="tql" lang={t.langue}>
      <style>{CSS}</style>

      {/* ── 1. LES TROIS PALIERS ───────────────────────────────── */}
      <section className="tql-sec tql-hero">
        <span aria-hidden className="tql-blob tql-blob-a" />
        <div className="tql-large">
          <h1 className="tql-h1 tql-centre">
            {t.tarifsTitre} <span className="tql-surb">{t.tarifsMotCle}</span>
          </h1>
          <p className="tql-p">{t.tarifsCorps}</p>
          <BlocTarifs t={t} colonnes={colonnes} />
        </div>
      </section>

      {/* ── 2. LA GRILLE COMPLÈTE ──────────────────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <BlocComparatif t={t} colonnes={colonnes} groupes={comparatif} />
        </div>
      </section>

      {/* ── 3. CE QUE ÇA REMPLACE ──────────────────────────────── */}
      {/* AUCUN MONTANT N'EST ÉCRIT DANS CETTE PAGE : ils viennent tous
          de `comparaisonDeCout`, donc du catalogue et des relevés de
          `liensIntegrations.ts`.
          LE REGISTRE RESTE FACTUEL, sa consigne du 6 septembre : "ne
          dénigre aucun outil". La note le dit en toutes lettres, et les
          deux devises restent séparées. */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.coutTitre} <span className="tql-surb">{t.coutMotCle}</span>
          </h2>
          <p className="tql-p">{t.coutCorps}</p>
          <div className="tql-comp-boite">
            <table className="tql-comp tql-comp-txt">
              <thead>
                <tr>
                  <th />
                  {t.coutColonnes.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cout.map((l, i) => (
                  <tr key={l.intitule} className={i === 0 ? "tql-lg-nous" : undefined}>
                    <th scope="row">{l.intitule}</th>
                    <td>{l.formulaire}</td>
                    <td>{l.intermediaire}</td>
                    <td>
                      <b>{l.total}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tql-legende">{t.coutNote}</p>
        </div>
      </section>

      {/* ── 4. LES CINQ OBJECTIONS, EN ENTIER ──────────────────── */}
      {/* Trois d'entre elles sont sur la landing ; les cinq sont ici,
          parce que les deux qui manquent ("ça va me prendre du temps",
          "je ne suis pas sûr que ça marche dans mon domaine") sont
          celles qu'on se pose une fois le prix vu. */}
      <section className="tql-sec tql-blanc">
        <span aria-hidden className="tql-blob tql-blob-c" />
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">
            {t.objectionsTitre} <span className="tql-surb">{t.objectionsMotCle}</span>
          </h2>
          <div className="tql-objs">
            {t.objections.map((o) => (
              <div key={o.q} className="tql-carte tql-obj">
                <p className="tql-obj-q">{o.q}</p>
                <p className={`tql-obj-r${blocLong([o.r]) ? " tql-p-lire" : ""}`}>{o.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. LA FAQ ARGENT, ET RIEN D'AUTRE ──────────────────── */}
      {/* Trois questions sur quatre viennent de SA page de vente, prises
          telles quelles. La quatrième (changer de palier sans être
          facturé deux fois) n'existait nulle part : elle est écrite dans
          l'objet de langue, et elle est vraie dans `planChange.ts`.

          UNE SÉLECTION QUI NE TROUVE RIEN EST UNE SÉLECTION QU'ON CROIT
          APPLIQUÉE : `faqArgent` rend ce qui manque, et on le dit. */}
      <section className="tql-sec">
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">{t.faqArgentTitre}</h2>
          <p className="tql-p">{t.faqArgentCorps}</p>
          {argent.questions.map((f) => (
            <details key={f.q} className="tql-faq">
              <summary>
                {f.q}
                <Chevron />
              </summary>
              <p>{f.r}</p>
            </details>
          ))}
          {/* LE MAILLAGE : d'ici on va voir ce que chaque
              fonctionnalité fait vraiment, pas revenir au prix. */}
          <p className="tql-legende">
            <Link href="/fonctionnalites">
              {t.tarifsLienFonctionnalites}
              <Fleche />
            </Link>
          </p>
        </div>
      </section>

      {/* ── 6. LES TÉMOIGNAGES RESTANTS ────────────────────────── */}
      {/* LA TRANSFORMATION D'ABORD : son persona bascule à "maintenant,
          imaginons que tout change", et une page qui montre le prix puis
          des avis saute l'étape où le lecteur se projette.

          `temoinsTarifs` retire les trois de la landing ET le doublon :
          deux témoignages quasi identiques sous deux noms ne doivent
          JAMAIS s'afficher sur la même page. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.avisTitre} <span className="tql-surb">{t.avisMotCle}</span>
          </h2>
          <p className="tql-p">{t.avisCorps}</p>
          <ul className="tql-apres">
            {t.apres.map((a) => (
              <li key={a}>
                <CochePleine />
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <div className="tql-temoins">
            {temoins.map((v) => (
              <figure className="tql-temoin" key={v.nom}>
                <figcaption className="tql-temoin-qui">
                  {v.portrait ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="tql-temoin-photo"
                      src={v.portrait}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                    />
                  ) : (
                    <span aria-hidden className="tql-temoin-init">
                      {v.nom.slice(0, 1)}
                    </span>
                  )}
                  <span className="tql-temoin-nom">
                    <b>{v.nom}</b>
                    {v.metier ? <span>{v.metier}</span> : null}
                  </span>
                </figcaption>
                <blockquote>{v.texte}</blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <BandeFinale t={t} />
    </main>
  );
}
