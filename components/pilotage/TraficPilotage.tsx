"use client";

// components/pilotage/TraficPilotage.tsx
//
// TRAFIC ET VENTES SUR LE MÊME ÉCRAN (Béné, 4 septembre 2026, point 3).
//
// "1. begin_checkout au clic sur un palier ; 2. purchase sur la page de
// remerciement ; 3. seulement après : un écran dans l'admin qui montre
// les deux ensemble."
//
// Les deux chiffres viennent du MÊME appel et de la MÊME période : deux
// appels séparés finiraient par porter deux périodes différentes, et
// l'écran diviserait des pommes par des poires sans que rien ne le dise.
//
// TROIS PHRASES SONT OBLIGATOIRES ICI, et elles disent ce que l'écran
// NE sait pas :
//   - on compte des VUES DE PAGE, pas des visiteurs (aucun cookie) ;
//   - un taux ne s'affiche qu'au dessus d'un seuil de vues ;
//   - le comptage a commencé le 7 septembre, donc une période plus
//     ancienne n'est pas un site désert.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import { OWNER_CATALOG } from "@/lib/checkout/catalog";
import {
  construireEntonnoirGenerateur,
  repartitionParSource,
  MIN_POUR_UN_TAUX_AVAL,
  type LigneGeneration,
} from "@/lib/generateur/entonnoirGenerateur";
import { SOURCE_GENERATEUR } from "@/lib/site/generateurQuiz";
import { TARIFS_MAJ, dollars } from "@/lib/generateur/tarifsIa";
import {
  construireEntonnoir,
  MIN_VUES_POUR_UN_TAUX,
  pagesLesPlusVues,
  sourcesDuTrafic,
  vuesParJour,
  type LigneTrafic,
} from "@/lib/trafic/entonnoir";

/** Le premier jour où le compteur a tourné. Avant, il n'y a rien à lire. */
const DEBUT_DU_COMPTAGE = "2026-09-07";

type Trafic =
  | { lisible: true; lignes: LigneTrafic[]; tronquee: boolean }
  | { lisible: false; raison: string };

type Generateur =
  | { lisible: true; generations: LigneGeneration[]; tronquee: boolean }
  | { lisible: false; raison: string };

type Donnees = {
  periode: { libelle: string; debut: string | null };
  resume: { ventes: number; encaisseCents: number };
  trafic?: Trafic;
  /** Le trafic de l'Atelier, tel que L'ATELIER le compte. */
  traficAtelier?: Trafic | null;
  /**
   * LES VENTES PAR SITE.
   *
   * `resume.ventes` additionne les deux : diviser les vues de tiquiz.fr
   * par ce total gonflerait le taux sans que rien ne le dise. Chaque
   * entonnoir prend SES ventes.
   */
  ventesParSite?: { tiquiz: number; atelier: number };
  /**
   * LE GÉNÉRATEUR PUBLIC : ce qu'il amène, et ce qu'il coûte.
   *
   * Absent = le serveur n'a pas encore la version qui le rend.
   * `lisible: false` = la migration du 8 septembre n'est pas passée.
   * Aucun des deux ne veut dire "aucun quiz généré".
   */
  generateur?: Generateur;
};

function nombre(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function TraficPilotage() {
  const params = useSearchParams();
  const query = params?.toString() ?? "";
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/pilotage${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (!j?.ok) {
        setErreur("Les chiffres n'ont pas pu être lus.");
        return;
      }
      setD(j as Donnees);
      setErreur(null);
    } catch {
      setErreur("Les chiffres n'ont pas pu être lus.");
    }
  }, [query]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const lignes = useMemo<LigneTrafic[]>(
    () => (d?.trafic?.lisible ? d.trafic.lignes : []),
    [d],
  );
  const lignesAtelier = useMemo<LigneTrafic[]>(
    () => (d?.traficAtelier?.lisible ? d.traficAtelier.lignes : []),
    [d],
  );

  // CHAQUE SITE A SON ENTONNOIR, ET SES PROPRES VENTES.
  //
  // Fusionner les deux donnerait un taux qui ne parle d'aucun des deux :
  // tiquiz.fr et atelierduquiz.fr n'ont ni le même public, ni le même
  // prix, ni le même tunnel. Et `resume.ventes` additionne DÉJÀ les deux
  // sites, donc l'utiliser pour Tiquiz seul gonflerait son taux.
  const entonnoir = useMemo(
    () =>
      construireEntonnoir({
        lignes,
        ventes: d?.ventesParSite?.tiquiz ?? d?.resume.ventes ?? 0,
      }),
    [lignes, d],
  );
  const entonnoirAtelier = useMemo(
    () => construireEntonnoir({ lignes: lignesAtelier, ventes: d?.ventesParSite?.atelier ?? 0 }),
    [lignesAtelier, d],
  );

  if (!d && !erreur) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (erreur || !d) {
    return <p className="text-sm text-muted-foreground">{erreur}</p>;
  }

  const trafic = d.trafic;
  // LA MIGRATION PAS ENCORE PASSÉE N'EST PAS UN SITE DÉSERT.
  const illisible = !trafic || trafic.lisible === false;
  const avantLeComptage = Boolean(d.periode.debut && d.periode.debut < DEBUT_DU_COMPTAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trafic et conversions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Combien de monde arrive, combien achète, et par où ils viennent. {d.periode.libelle}.
        </p>
      </div>

      {illisible ? (
        <div className={`${CARTE} p-5`}>
          <p className="text-sm font-medium">Le comptage du trafic n&apos;a pas pu être lu.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce n&apos;est pas un site sans visite : c&apos;est que la lecture a échoué. Le plus
            probable est que la migration <code>20260907_trafic_pages_publiques.sql</code> ne soit
            pas encore passée sur Supabase.
          </p>
          {trafic && trafic.lisible === false ? (
            <p className="mt-2 text-xs text-muted-foreground">Raison : {trafic.raison}</p>
          ) : null}
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold">tiquiz.fr</h2>
          <Entonnoir e={entonnoir} encaisseCents={d.resume.encaisseCents} />

          {avantLeComptage ? (
            <p className="text-xs text-muted-foreground">
              Le comptage des vues a commencé le 7 septembre 2026. Une période qui remonte plus loin
              montre moins de vues que de réalité, alors que les ventes, elles, remontent à leur
              début.
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Classement
              titre="D&apos;où vient le monde"
              aide="Les navigations d'une de nos pages vers une autre sont écartées : elles n'ont amené personne."
              lignes={sourcesDuTrafic(lignes)}
              total={entonnoir.vues}
            />
            <Classement
              titre="Les pages les plus vues"
              aide="Le chemin exact, pas une famille : c'est ce qui dit quel article ou quelle page amène du monde."
              lignes={pagesLesPlusVues(lignes)}
              total={entonnoir.vues}
            />
          </div>

          <Courbe jours={vuesParJour(lignes)} />

          <AtelierBloc trafic={d.traficAtelier ?? undefined} e={entonnoirAtelier} lignes={lignesAtelier} />

          <GenerateurBloc generateur={d.generateur} lignesTrafic={lignes} />

          <p className="text-xs text-muted-foreground">
            On compte des <strong>vues de page</strong>, jamais des visiteurs : aucun cookie
            n&apos;est posé pour ces chiffres, donc on ne sait pas distinguer une personne qui
            revient d&apos;une nouvelle. En échange, ce compteur voit aussi les gens qui refusent le
            bandeau cookies et ceux qui ont un bloqueur, que Google Analytics ne voit pas.
          </p>
        </>
      )}
    </div>
  );
}

function Entonnoir({
  e,
  encaisseCents,
}: {
  e: ReturnType<typeof construireEntonnoir>;
  /**
   * OPTIONNEL, ET C'EST DÉLIBÉRÉ.
   *
   * `resume.encaisseCents` additionne Tiquiz ET l'Atelier, et je n'ai
   * pas vérifié comment ce total se compose par site (les montants
   * estimés `amountSource: "plan"` sont écartés d'un chiffre d'affaires
   * depuis le 22 août, et je ne l'ai pas remesuré ici).
   *
   * Afficher un montant qu'on n'a pas mesuré est exactement ce qui fait
   * prendre une décision sur un chiffre faux. Le bloc de l'Atelier
   * montre donc ses vues et ses ventes, qui sont exactes, et PAS de
   * montant. Le jour où le partage du chiffre d'affaires est mesuré, ce
   * paramètre le reçoit.
   */
  encaisseCents?: number;
}) {
  const marches = [
    { titre: "Vues du site", valeur: nombre(e.vues), note: "toutes les pages publiques" },
    {
      titre: "Vues d'un bon de commande",
      valeur: nombre(e.vuesCommande),
      note:
        e.tauxVersCommande === null
          ? `pas encore ${MIN_VUES_POUR_UN_TAUX} vues, aucun taux affiché`
          : `${e.tauxVersCommande} % des vues`,
    },
    {
      titre: "Ventes encaissées",
      valeur: nombre(e.ventes),
      note:
        e.tauxCommandeVersVente === null
          ? "pas encore assez de bons de commande vus"
          : `${e.tauxCommandeVersVente} % des bons de commande vus`,
    },
  ];

  return (
    <div className={`${CARTE} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Le parcours, marche par marche</h2>
        <p className="text-sm text-muted-foreground">
          {encaisseCents === undefined ? null : <>{euros(encaisseCents)} encaissés</>}
          {encaisseCents !== undefined && e.tauxGlobal !== null ? " · " : null}
          {e.tauxGlobal === null ? null : <>{e.tauxGlobal} % des vues finissent en vente</>}
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {marches.map((m) => (
          <div key={m.titre} className="rounded-lg border border-border/60 p-4">
            <p className="text-xs text-muted-foreground">{m.titre}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{m.valeur}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Classement({
  titre,
  aide,
  lignes,
  total,
}: {
  titre: string;
  aide: string;
  lignes: { cle: string; vues: number }[];
  total: number;
}) {
  return (
    <div className={`${CARTE} p-5`}>
      <h2 className="text-sm font-semibold">{titre}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{aide}</p>
      {lignes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Aucune vue sur cette période.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {lignes.map((l) => (
            <li key={l.cle} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate" title={l.cle}>
                {l.cle}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {nombre(l.vues)}
                {total > 0 ? <> · {Math.round((l.vues / total) * 100)} %</> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Courbe({ jours }: { jours: { jour: string; vues: number }[] }) {
  const max = jours.reduce((m, j) => Math.max(m, j.vues), 0);
  if (jours.length === 0) return null;
  return (
    <div className={`${CARTE} p-5`}>
      <h2 className="text-sm font-semibold">Les vues, jour par jour</h2>
      <div className="mt-4 flex items-end gap-1" style={{ height: 120 }}>
        {jours.map((j) => (
          <div
            key={j.jour}
            className="flex-1 rounded-t"
            style={{
              // Une barre à zéro reste VISIBLE (1 px) : une colonne
              // absente se lit comme un jour manquant, pas comme un
              // jour sans visite.
              height: max > 0 ? `${Math.max(1, Math.round((j.vues / max) * 100))}%` : "1px",
              background: "var(--pil-tiquiz)",
            }}
            title={`${j.jour} : ${nombre(j.vues)} vues`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {jours[0]?.jour} au {jours[jours.length - 1]?.jour}
      </p>
    </div>
  );
}

/**
 * LE TRAFIC DE L'ATELIER (Béné, 7 septembre 2026 : "il me faut aussi le
 * compteur de l'Atelier").
 *
 * L'Atelier vit dans un autre dépôt, avec sa PROPRE base. Le pilotage
 * vient le lire, exactement comme il lit ses élèves et ses ventes
 * (`fetchAtelier`, 21 août) : c'est lui qui compte chez lui, et une
 * panne de Tiquiz ne lui fait perdre aucune vue.
 *
 * TROIS ÉTATS, ET ILS NE SE CONFONDENT PAS :
 *   - absent   : son serveur n'a pas répondu, OU sa version déployée ne
 *                rend pas encore ce champ. Ce n'est pas zéro visite ;
 *   - illisible: il a répondu, mais sa table n'a pas pu être lue (sa
 *                migration n'est pas passée). Ce n'est pas zéro visite ;
 *   - lisible  : on affiche.
 *
 * Un écran qui rendrait "0 vue" dans les deux premiers cas ferait
 * conclure que la page de vente de l'Atelier n'intéresse personne, et
 * c'est le genre de chiffre qui fait prendre une décision (22 août).
 */
function AtelierBloc({
  trafic,
  e,
  lignes,
}: {
  trafic?: Trafic;
  e: ReturnType<typeof construireEntonnoir>;
  lignes: LigneTrafic[];
}) {
  return (
    <div className="space-y-4 border-t pt-6">
      <h2 className="text-lg font-semibold">atelierduquiz.fr</h2>

      {!trafic ? (
        <div className={`${CARTE} p-5`}>
          <p className="text-sm font-medium">Le trafic de l&apos;Atelier n&apos;est pas encore lisible.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce n&apos;est pas un site sans visite : soit son serveur n&apos;a pas répondu, soit sa
            mise à jour n&apos;est pas encore déployée. Ses ventes, elles, sont bien comptées dans le
            reste du pilotage.
          </p>
        </div>
      ) : trafic.lisible === false ? (
        <div className={`${CARTE} p-5`}>
          <p className="text-sm font-medium">Le comptage de l&apos;Atelier n&apos;a pas pu être lu.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Le plus probable est que sa migration{" "}
            <code>20260907_trafic_pages_publiques.sql</code> ne soit pas encore passée sur SON
            Supabase.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Raison : {trafic.raison}</p>
        </div>
      ) : (
        <>
          <Entonnoir e={e} />
          <div className="grid gap-4 md:grid-cols-2">
            <Classement
              titre="D&apos;où vient le monde"
              aide="Les navigations d'une de ses pages vers une autre sont écartées : elles n'ont amené personne."
              lignes={sourcesDuTrafic(lignes)}
              total={e.vues}
            />
            <Classement
              titre="Les pages les plus vues"
              aide="Le chemin exact, pas une famille."
              lignes={pagesLesPlusVues(lignes)}
              total={e.vues}
            />
          </div>
          <Courbe jours={vuesParJour(lignes)} />
        </>
      )}
    </div>
  );
}

/**
 * CE QUE LE GÉNÉRATEUR PUBLIC AMÈNE (Béné, 8 septembre 2026).
 *
 * "Dans admin, fais moi apparaitre qui entre par le générateur dans mes
 * contacts et dans les stat comment le générateur convertit : visites /
 * inscrits gratos / abonnés et le ROI."
 *
 * ── LE DÉNOMINATEUR PARLE DE LA MÊME PAGE QUE LE NUMÉRATEUR ─────────
 *
 * L'entonnoir ne compte QUE les quiz générés depuis la page dédiée : le
 * générateur est aussi servi dans une iframe sur la page de vente, et
 * personne ne compte les vues de cette iframe. Diviser tous les quiz
 * par les vues de la seule page dédiée gonflerait le taux sans que rien
 * ne le dise (c'est le défaut corrigé le 7 septembre sur l'entonnoir
 * des ventes). Ce que l'iframe apporte se lit en COMPTES, en dessous.
 *
 * ── LE COÛT EST EN DOLLARS, ET IL RESTE À CÔTÉ DES EUROS ────────────
 *
 * Anthropic facture en dollars, Tiquiz encaisse en euros, et on ne
 * convertit pas : un taux de change inventé serait faux le lendemain
 * (règle du 1er septembre). L'écran met donc les deux côte à côte et
 * laisse la comparaison se faire, plutôt que d'afficher un ratio qui
 * mélangerait deux monnaies.
 */
function GenerateurBloc({
  generateur,
  lignesTrafic,
}: {
  generateur?: Generateur;
  lignesTrafic: LigneTrafic[];
}) {
  const lisible = Boolean(generateur && generateur.lisible);
  const generations = generateur && generateur.lisible ? generateur.generations : [];
  const e = construireEntonnoirGenerateur({ lignesTrafic, generations });
  const parSource = repartitionParSource(generations);
  const prixMensuel = OWNER_CATALOG.mensuel.amountCents;

  const marches = [
    {
      titre: "Visites de la page",
      valeur: nombre(e.vues),
      note: "/generateur-de-quiz",
    },
    {
      titre: "Quiz générés",
      valeur: nombre(e.quiz),
      note:
        e.tauxVersQuiz === null
          ? `pas encore ${MIN_VUES_POUR_UN_TAUX} visites, aucun taux affiché`
          : `${e.tauxVersQuiz} % des visites`,
    },
    {
      titre: "Inscrits gratuits",
      valeur: nombre(e.inscrits),
      note:
        e.tauxVersInscription === null
          ? `pas encore ${MIN_POUR_UN_TAUX_AVAL} quiz générés`
          : `${e.tauxVersInscription} % des quiz gardés`,
    },
    {
      titre: "Abonnés",
      valeur: nombre(e.abonnes),
      note:
        e.tauxVersAbonnement === null
          ? `pas encore ${MIN_POUR_UN_TAUX_AVAL} inscrits`
          : `${e.tauxVersAbonnement} % des inscrits`,
    },
  ];

  return (
    <div className="space-y-4 border-t pt-6">
      <h2 className="text-lg font-semibold">Le générateur de quiz public</h2>

      {!generateur ? (
        <div className={`${CARTE} p-5`}>
          <p className="text-sm font-medium">Le générateur n&apos;est pas encore lisible.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce n&apos;est pas un générateur sans visiteur : le serveur n&apos;a pas encore la
            version qui rend ces chiffres.
          </p>
        </div>
      ) : generateur.lisible === false ? (
        <div className={`${CARTE} p-5`}>
          <p className="text-sm font-medium">Les générations n&apos;ont pas pu être lues.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce n&apos;est pas un générateur sans visiteur. Le plus probable est que la migration{" "}
            <code>20260908_generateur_usage.sql</code> ne soit pas encore passée sur Supabase.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Raison : {generateur.raison}</p>
        </div>
      ) : (
        <>
          <div className={`${CARTE} p-5`}>
            <h3 className="text-sm font-semibold">
              De la visite à l&apos;abonnement, sur la page dédiée
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {marches.map((m) => (
                <div key={m.titre} className="rounded-lg border border-border/60 p-4">
                  <p className="text-xs text-muted-foreground">{m.titre}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{m.valeur}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Seuls les quiz générés depuis <code>/generateur-de-quiz</code> sont comptés ici. Le
              générateur tourne aussi dans une iframe sur la page de vente, et personne ne compte
              les vues de cette iframe : ce qu&apos;elle amène est en dessous, en nombres, sans
              pourcentage.
            </p>
          </div>

          <div className={`${CARTE} p-5`}>
            <h3 className="text-sm font-semibold">Ce que ça coûte en IA</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-xs text-muted-foreground">Total sur la période</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {dollars(e.coutMillicents)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">page dédiée seulement</p>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-xs text-muted-foreground">Par inscrit gratuit</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {e.coutParInscritMillicents === null ? "-" : dollars(e.coutParInscritMillicents)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.coutParInscritMillicents === null ? "personne ne s'est encore inscrit" : "coût d'acquisition d'un contact"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-xs text-muted-foreground">Par abonné</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {e.coutParAbonneMillicents === null ? "-" : dollars(e.coutParAbonneMillicents)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.coutParAbonneMillicents === null
                    ? "aucun abonné venu par là pour l'instant"
                    : `à comparer aux ${euros(prixMensuel)} par mois du palier le moins cher`}
                </p>
              </div>
            </div>
            {e.coutInconnu > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {nombre(e.coutInconnu)} génération{e.coutInconnu > 1 ? "s" : ""} sans coût
                calculable : soit elle est antérieure au 8 septembre 2026 (les jetons
                n&apos;étaient écrits nulle part), soit son modèle n&apos;est pas dans la table de
                tarifs. Ce n&apos;est pas une génération gratuite : le total ci dessus est donc un
                plancher.
              </p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              Le coût est une <strong>estimation</strong> : il se calcule à partir des jetons
              réellement consommés et de la table de tarifs relevée le {TARIFS_MAJ}. Il est en
              dollars parce qu&apos;Anthropic facture en dollars, et on ne convertit pas : un taux
              de change inventé serait faux le lendemain. Compare donc les deux à la main.
            </p>
          </div>

          <div className={`${CARTE} p-5`}>
            <h3 className="text-sm font-semibold">Par où le générateur a été ouvert</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              <code>{SOURCE_GENERATEUR}</code> est la page dédiée, <code>tiquiz-fr</code> l&apos;iframe
              de la page de vente. Aucun pourcentage : on ne mesure les vues que de la page dédiée.
            </p>
            {parSource.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Aucun quiz généré sur cette période.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 text-right font-medium">Quiz</th>
                      <th className="pb-2 text-right font-medium">Inscrits</th>
                      <th className="pb-2 text-right font-medium">Abonnés</th>
                      <th className="pb-2 text-right font-medium">Coût IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parSource.map((l) => (
                      <tr key={l.source} className="border-t border-border/60">
                        <td className="py-2">
                          <code>{l.source}</code>
                        </td>
                        <td className="py-2 text-right tabular-nums">{nombre(l.quiz)}</td>
                        <td className="py-2 text-right tabular-nums">{nombre(l.inscrits)}</td>
                        <td className="py-2 text-right tabular-nums">{nombre(l.abonnes)}</td>
                        <td className="py-2 text-right tabular-nums">
                          {dollars(l.coutMillicents)}
                          {l.coutInconnu > 0 ? " +" : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {lisible && generateur.tronquee ? (
            <p className="text-xs text-muted-foreground">
              La lecture a été coupée au plafond : les chiffres ci dessus portent sur les
              générations les plus récentes de la période, pas sur toutes.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
