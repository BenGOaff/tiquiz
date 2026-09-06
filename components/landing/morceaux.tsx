// components/landing/morceaux.tsx
//
// LES MORCEAUX PARTAGÉS PAR L'ACCUEIL, LES TARIFS ET LES PAGES DE
// FONCTIONNALITÉS.
//
// Béné, 6 septembre 2026 : "rien n'est à jeter. Tout est à déplacer."
//
// La landing de 5 000 mots se répartit sur trois écrans : `/` (cinq
// blocs), `/tarifs` (la vraie page de vente), et les huit pages de
// détail. Les blocs qui apparaissent sur PLUSIEURS d'entre eux vivent
// ici, en un seul exemplaire.
//
// C'est la règle que ce dépôt paie en boucle depuis juin : deux copies
// d'un même bloc finissent toujours par diverger, et c'est le prix qui
// diverge en premier.

import Link from "next/link";

import type { ColonneTarif, ContenuLanding, GroupeComparatif } from "@/lib/site/landing";
import { CocheFine, CochePleine, Fleche } from "./pieces";

/**
 * LE BOUTON, ET IL N'Y EN A QU'UN LIBELLÉ.
 *
 * Béné, 6 septembre 2026 : "un seul libellé de bouton principal sur
 * toute la page : « Créer mon quiz gratuitement → », avec « Gratuit,
 * sans carte bancaire » dessous. La page actuelle en compte treize
 * différents, c'est à unifier."
 *
 * Le libellé et sa rassurance viennent donc du MÊME objet de langue, et
 * ce composant est le seul endroit qui les assemble : un bouton écrit à
 * la main quelque part rouvrirait la porte aux treize libellés.
 */
export function CtaPrincipal({
  t,
  href = "/signup",
  centre = true,
}: {
  t: ContenuLanding;
  href?: string;
  centre?: boolean;
}) {
  return (
    <div className={`tql-mid${centre ? "" : " tql-mid-g"}`}>
      <Link href={href} className="tql-cta">
        {t.ctaPrincipal}
        <Fleche />
      </Link>
      <p className="tql-mid-r">{t.sousCta}</p>
    </div>
  );
}

/** Les trois preuves sous le bouton du haut de page, avec leur coche. */
export function Rassurances({ items }: { items: readonly string[] }) {
  return (
    <ul className="tql-rassure">
      {items.map((r) => (
        <li key={r}>
          <CocheFine />
          {r}
        </li>
      ))}
    </ul>
  );
}

/** Une cellule de la grille comparative : coche, tiret, ou valeur. */
export function Cellule({ v }: { v: string | boolean }) {
  if (v === true) return <CochePleine />;
  /* UN TIRET, PAS UNE CASE VIDE. Une cellule vide se lit "on a oublié
     de remplir", un tiret se lit "non". */
  if (v === false) return <span className="tql-non">-</span>;
  return <span className="tql-val">{v}</span>;
}

/**
 * LES TROIS COLONNES DE TARIF, AVEC LA BASCULE MENSUEL / ANNUEL.
 *
 * L'interrupteur n'a AUCUN script : deux radios hors écran, les
 * libellés les pilotent, et `:has()` montre le bon prix. C'est un
 * script qui avait figé la FAQ de sa page de vente le 2 septembre.
 */
export function BlocTarifs({ t, colonnes }: { t: ContenuLanding; colonnes: ColonneTarif[] }) {
  return (
    <div className="tql-tarifs">
      <input type="radio" name="tql-cadence" id="tql-mois" defaultChecked />
      <input type="radio" name="tql-cadence" id="tql-an" />
      <div className="tql-centre" style={{ display: "flex" }}>
        <div className="tql-bascule">
          <label htmlFor="tql-mois">{t.prixMensuel}</label>
          <label htmlFor="tql-an">
            {t.prixAnnuel}
            <span className="tql-eco">{t.prixEconomie}</span>
          </label>
        </div>
      </div>

      <div className="tql-grille-3">
        {colonnes.map((c, i) => (
          <div key={c.nom} className={i === 1 ? "tql-col tql-col-mise" : "tql-col"}>
            <p className={`tql-ruban-col tql-r${i + 1}`}>{t.prixRubans[i].ruban}</p>
            <div className="tql-col-corps">
              <p className="tql-col-pour">{t.prixRubans[i].pour}</p>
              {/* LE GROS CHIFFRE CHANGE, PAS LA PHRASE : un prix se lit
                  d'un coup d'oeil, une phrase non. */}
              <p className="tql-prix">
                <span className="tql-prix-mois">{c.prix}</span>
                <span className="tql-prix-an">{c.prixAn ?? c.prix}</span>
              </p>
              <p className="tql-cadence">
                <span className="tql-prix-mois">{c.cadence}</span>
                <span className="tql-prix-an">{c.cadenceAn ?? c.cadence}</span>
              </p>
              {c.inclus ? <p className="tql-inclus">{c.inclus}</p> : null}
              <ul className="tql-liste">
                {c.lignes.map((ligne) => (
                  <li key={ligne.texte} className={ligne.limite ? "tql-li-lim" : undefined}>
                    {ligne.limite ? <span aria-hidden className="tql-lim-pt" /> : <CochePleine />}
                    <span>
                      <b>{ligne.texte}</b>
                      {ligne.detail ? <em className="tql-puce-detail">{ligne.detail}</em> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {/* LES DEUX DESTINATIONS SONT RENDUES, et `:has()` montre
                  la bonne. Sans ça, qui choisit l'année atterrit sur le
                  bon de commande du MOIS, et ne le voit qu'en payant. */}
              {c.lienAn ? (
                <>
                  <Link href={c.lien} className="tql-col-cta tql-prix-mois">
                    {c.cta}
                    <Fleche />
                  </Link>
                  <Link href={c.lienAn} className="tql-col-cta tql-prix-an">
                    {c.cta}
                    <Fleche />
                  </Link>
                </>
              ) : (
                /* LE GRATUIT N'A PAS DE CADENCE, donc son bouton ne
                   porte AUCUNE des deux classes : avec elles, il
                   disparaissait dès qu'on passait à l'année. */
                <Link href={c.lien} className="tql-col-cta">
                  {c.cta}
                  <Fleche />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * LA GRILLE COMPARATIVE COMPLÈTE.
 *
 * Une vraie `<table>`, jamais une image : une image n'est ni extraite
 * par un moteur, ni sélectionnable, ni lisible sur un téléphone. Elle
 * défile dans SA boîte, le corps de la page ne défile jamais
 * latéralement.
 */
export function BlocComparatif({
  t,
  colonnes,
  groupes,
}: {
  t: ContenuLanding;
  colonnes: ColonneTarif[];
  groupes: GroupeComparatif[];
}) {
  return (
    <>
      <h3 className="tql-h3 tql-comp-titre">{t.comparatifTitre}</h3>
      <p className="tql-p">{t.comparatifCorps}</p>
      <div className="tql-comp-boite">
        <table className="tql-comp">
          <thead>
            <tr>
              <th />
              {colonnes.map((c) => (
                <th key={c.nom}>{c.nom}</th>
              ))}
            </tr>
          </thead>
          {groupes.map((g) => (
            <tbody key={g.titre}>
              <tr className="tql-comp-groupe">
                <th colSpan={4}>{g.titre}</th>
              </tr>
              {g.lignes.map((l) => (
                <tr key={l.intitule}>
                  <th scope="row">{l.intitule}</th>
                  <td>
                    <Cellule v={l.gratuit} />
                  </td>
                  <td>
                    <Cellule v={l.tiquiz} />
                  </td>
                  <td>
                    <Cellule v={l.plus} />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}

/** Le bandeau dégradé de fin, le seul aplat de couleur de la page. */
export function BandeFinale({ t }: { t: ContenuLanding }) {
  return (
    <section className="tql-bande">
      <div className="tql-large">
        <h2>{t.bandeTitre}</h2>
        <p>{t.bandeCorps}</p>
        <Link href="/signup" className="tql-bande-cta">
          {t.ctaPrincipal}
          <Fleche />
        </Link>
        <Rassurances items={t.rassurances} />
      </div>
    </section>
  );
}
