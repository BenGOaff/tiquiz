"use client";

// components/landing/QuizHero.tsx
//
// LE QUIZ DU HAUT DE PAGE, ET LES DEUX ÉVÉNEMENTS QU'IL PORTE.
//
// C'est le seul endroit du site qui émet `quiz_demarre` et
// `quiz_termine` : les deux premières marches du parcours qu'elle veut
// mesurer (chantier 1, 9 septembre). Sans eux, le ratio commence à la
// génération et on ne sait pas combien de gens ont seulement joué.
//
// ── LA PREMIÈRE QUESTION EST DANS LE HTML SERVI ──────────────────────
//
// Béné : « le contenu est visible par défaut dans le HTML rendu, l'état
// masqué n'est appliqué qu'après le montage côté client. Sinon une
// section reste blanche quand le JS échoue. »
//
// Ce composant rend l'étape 0 dès son PREMIER rendu, sans effet et sans
// état initial vide : le rendu serveur de Next porte donc la question,
// ses options et la jauge. Ce qui a besoin du navigateur, c'est le clic,
// et un clic n'a jamais rien à faire dans du HTML.
//
// ── `quiz_demarre` NE PART QU'UNE FOIS ───────────────────────────────
//
// Il marque « quelqu'un a commencé », pas « quelqu'un a cliqué ». Le
// poser à chaque réponse le rendrait quatre fois plus gros que le
// nombre de personnes, et le ratio qu'elle lit deviendrait faux dans le
// sens flatteur. « Recommencer » ne le repose pas non plus : c'est la
// même personne, dans la même visite.
//
// ── ET LE RÉSULTAT EST UN LIEN, JAMAIS UN BOUTON ─────────────────────
//
// Sans JavaScript un bouton ne fait RIEN, et ici il porte le seul geste
// qui rapporte. C'est un `<a>` : il s'ouvre dans un nouvel onglet à la
// molette, il se copie, il se partage.

import { useCallback, useMemo, useRef, useState } from "react";

import { envoyerEvenement } from "@/lib/analytics/envoi";
import { evenementQuizDemarre, evenementQuizTermine } from "@/lib/analytics/parcours";
import type { LanguePublique } from "@/lib/site/langues";
import {
  lienDuProfil,
  pointsDesReponses,
  profilGagnant,
  quizHero,
  type CleProfil,
  type Gains,
} from "@/lib/site/quizHero";

function remplir(gabarit: string, valeurs: Record<string, string | number>): string {
  return gabarit.replace(/\{(\w+)\}/g, (tout, cle: string) =>
    cle in valeurs ? String(valeurs[cle]) : tout,
  );
}

export default function QuizHero({ langue }: { langue: LanguePublique }) {
  const t = useMemo(() => quizHero(langue), [langue]);
  const total = t.questions.length;

  const [choisies, setChoisies] = useState<Gains[]>([]);
  const demarreEnvoye = useRef(false);
  const termineEnvoye = useRef<CleProfil | null>(null);

  const etape = choisies.length;
  const fini = etape >= total;

  const repondre = useCallback(
    (gains: Gains) => {
      if (!demarreEnvoye.current) {
        demarreEnvoye.current = true;
        envoyerEvenement(evenementQuizDemarre());
      }
      setChoisies((avant) => (avant.length >= total ? avant : [...avant, gains]));
    },
    [total],
  );

  const recommencer = useCallback(() => setChoisies([]), []);

  // Le profil se recalcule à partir des réponses : aucun état à tenir
  // d'accord avec un autre, donc aucun moyen qu'ils se contredisent.
  const profil = fini ? profilGagnant(pointsDesReponses(choisies)) : null;

  if (fini && profil && termineEnvoye.current !== profil) {
    termineEnvoye.current = profil;
    envoyerEvenement(evenementQuizTermine(profil));
  }

  const avance = fini ? 100 : ((etape + 1) / (total + 1)) * 100;

  return (
    <div className="tqh">
      <div className="tqh-bar">
        <i className="tqh-pt" aria-hidden />
        <i className="tqh-pt" aria-hidden />
        <i className="tqh-pt" aria-hidden />
        <b>{t.titre}</b>
        <span className="tqh-live">{t.mention}</span>
      </div>

      <div className="tqh-corps">
        <div className="tqh-tete">
          <div
            className="tqh-jauge"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={etape}
            aria-label={t.titre}
          >
            <i style={{ width: `${avance}%` }} />
          </div>
          <span className="tqh-cpt">
            {fini
              ? t.compteurResultat
              : remplir(t.compteur, { n: etape + 1, total })}
          </span>
        </div>

        {/* `key` sur l'étape : chaque question rejoue l'apparition, et le
            navigateur remet le focus au début au lieu de le garder sur un
            bouton qui n'existe plus. */}
        {profil ? (
          <div className="tqh-vue tqh-res" key="res">
            <div>
              <span className="tqh-eti">{t.etiquetteResultat}</span>
              <h3>{t.profils[profil].nom}</h3>
              <p>{t.profils[profil].corps}</p>
            </div>
            <div className="tqh-cta">
              <div className="tqh-idee">
                <span>{t.etiquetteIdee}</span>
                <b>{t.profils[profil].idee}</b>
              </div>
              <a className="tql-cta-gen" href={lienDuProfil(profil, langue)}>
                {t.boutonGenerer}
              </a>
              <p className="tqh-rassure">{t.rassurance}</p>
              <button type="button" className="tqh-rejouer" onClick={recommencer}>
                {t.recommencer}
              </button>
            </div>
          </div>
        ) : (
          <div className="tqh-vue" key={etape}>
            <p className="tqh-num">{remplir(t.numero, { n: etape + 1, total })}</p>
            <p className="tqh-q">{t.questions[etape].titre}</p>
            <div className="tqh-opts">
              {t.questions[etape].options.map((o, k) => (
                <button
                  key={k}
                  type="button"
                  className="tqh-opt"
                  onClick={() => repondre(o.gains)}
                >
                  <i aria-hidden />
                  <span>{o.texte}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
