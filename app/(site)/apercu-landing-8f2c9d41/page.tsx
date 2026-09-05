// app/(site)/apercu-landing-8f2c9d41/page.tsx
//
// LA LANDING, QUATRIÈME PASSAGE.
//
// Béné, 5 septembre 2026, douze reproches en un message. Ils tombent en
// trois familles, et la première tenait à UNE ligne de CSS.
//
// -- 1. LES COULEURS : une seule cause pour deux bugs -----------------
//
// "Texte foncé sur fond foncé : illisible" (le bouton du haut de page)
// et "texte blanc sur bouton blanc ? Vraiment ?" (celui du bandeau de
// fin). Les deux venaient de `.tql a{color:inherit}`, qui vaut 0,1,1 en
// spécificité et battait donc `.tql-cta`, `.tql-col-cta` et
// `.tql-bande-cta`, tous à 0,1,0. TOUS les boutons de la page prenaient
// la couleur du texte autour. Corrigé dans `styles.ts`, avec le calcul
// écrit à côté.
//
// -- 2. LA PREUVE SOCIALE ---------------------------------------------
//
// "6 avis trustpilot pas une preuve sociale. Supprime. Tu peux mettre
// +200 utilisateurs (c'est le vrai chiffre)." Et : "'lire les avis' ->
// non, on ne veut pas que les gens quittent la page ... on veut qu'ils
// commandent bordel !"
//
// La section des six avis est SUPPRIMÉE, le lien sortant aussi, et il
// n'y a plus AUCUN lien qui quitte la page. À sa place : le bloc des
// cinq OBJECTIONS, tirées du persona de `copywriting-claude/`. Une
// landing SaaS qui convertit répond à ce que le lecteur pense à cet
// instant ; six témoignages ne le font pas.
//
// -- 3. LE HERO VENDAIT LE COMMENT ------------------------------------
//
// "C'est le COMMENT pas le résultat. On ne vend jamais les 10h de vol,
// on vend la plage avec les cocktails." Elle a raison : l'accroche
// décrivait trois champs et une relecture.
//
// Le haut de page répond maintenant aux questions qu'un visiteur se
// pose en dix secondes, et dans cet ordre : à quoi ça sert (le titre),
// ce qu'il y gagne (l'accroche), si c'est pour lui (`pourQui`), et
// pourquoi il peut faire confiance (le nombre d'utilisateurs). Le
// COMMENT existe toujours, en quatre étapes, mais plus bas : c'est là
// qu'on le lit, pas au premier écran.
//
// -- LA STRUCTURE, ET D'OÙ ELLE VIENT ---------------------------------
//
// Recherchée le 5 septembre, pas improvisée : le cadre PAS
// (problème, agitation, solution) mesure +22 % contre une page qui
// empile des fonctionnalités, et un bloc d'objections en fin de page
// +28 % de clics. Et les 17 déclencheurs de sa propre bibliothèque
// (`copywriting-claude/`) sont posés là où ils comptent : preuve par le
// résultat (la démo), plausibilité (les objections), sécurité (le
// gratuit sans carte), preuve scientifique (le 44,9 % avec sa source).
//
//   haut de page  -> problème -> démo -> mécanique -> funnel
//   -> Systeme.io -> les 2 mécaniques -> où il vit -> ton branding
//   -> objections -> tarifs + grille comparative -> FAQ -> bandeau
//
// -- ZÉRO JAVASCRIPT --------------------------------------------------
//
// L'interrupteur de tarif et la FAQ marchent sans une ligne de script :
// c'est un script qui a figé la FAQ de sa page de vente le 2 septembre.
//
// -- ELLE EST EN `noindex` --------------------------------------------
//
// Deux pages qui prétendent être l'accueil de Tiquiz se feraient
// concurrence sur la même requête. Hors sitemap, hors `llms.txt`, hors
// pied de page.

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { SUPPORTED_LOCALES } from "@/i18n/config";
import { HOTE_VENTE } from "@/lib/publicHost";
import { OUTILS, ZAPIER } from "@/lib/site/integrations";
import {
  DEMO_POPQUIZ,
  TEMOIGNAGES,
  colonnesDeTarif,
  comparatifDesPlans,
  contenuLanding,
} from "@/lib/site/landing";
import { CSS } from "./styles";
import { AnimVente } from "./anims";
import { faqDeLaPageDeVente } from "./faq";
import DeclencheurAnims from "./DeclencheurAnims";
import {
  BlocCode,
  ChampLien,
  Chevron,
  Croix,
  CocheFine,
  CochePleine,
  Fleche,
  FlecheBas,
  MaquetteBrief,
  MaquetteQuiz,
  Picto,
  Scintilles,
} from "./pieces";

const CHEMIN = "/apercu-landing-8f2c9d41";
const LIEN_GENERATEUR = "/embed/preview";
const LIEN_INSCRIPTION = "/signup";

type PageProps = { searchParams?: Promise<{ lang?: string }> };

async function resoudreLangue(searchParams?: Promise<{ lang?: string }>): Promise<string> {
  const brut = (await searchParams)?.lang;
  if (brut && (SUPPORTED_LOCALES as readonly string[]).includes(brut)) return brut;
  return await getLocale();
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const t = contenuLanding(await resoudreLangue(searchParams));
  return {
    title: t.metaTitre,
    description: t.metaDescription,
    robots: { index: false, follow: false },
    alternates: { canonical: `${HOTE_VENTE}${CHEMIN}` },
  };
}

/** La rassurance sous un bouton. Trois items, une coche dessinée. */
function Rassurances({ items }: { items: readonly string[] }) {
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

/**
 * LE BOUTON DE FIN DE SECTION.
 *
 * Sa page en pose un après presque chaque section, et son libellé est
 * toujours un désir à la première personne : "Je veux capturer ces
 * emails", "Je veux vendre avec un quiz", "Je me lance gratuitement".
 * Ce n'est pas une étiquette, c'est la phrase que le lecteur vient de
 * se dire, et c'est ce qui fait qu'on clique au milieu d'une page.
 *
 * La rassurance dessous est la sienne aussi ("Pas besoin de CB -
 * aucune obligation") : elle ne coûte rien et elle retire la seule
 * raison d'hésiter à ce moment là.
 */
function CtaSection({ libelle, rassurance }: { libelle: string; rassurance: string }) {
  return (
    <div className="tql-mid">
      <Link href={LIEN_INSCRIPTION} className="tql-cta">
        {libelle}
        <Fleche />
      </Link>
      <p className="tql-mid-r">
        <CocheFine />
        {rassurance}
      </p>
    </div>
  );
}

/** Une cellule de la grille comparative : coche, tiret, ou valeur. */
function Cellule({ v }: { v: string | boolean }) {
  if (v === true) return <CochePleine />;
  /* UN TIRET, PAS UNE CASE VIDE. Une cellule vide se lit "on a oublié
     de remplir", un tiret se lit "non". */
  if (v === false) return <span className="tql-non">-</span>;
  return <span className="tql-val">{v}</span>;
}

export default async function ApercuLandingPage({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuLanding(langue);
  const colonnes = colonnesDeTarif(t);
  const comparatif = comparatifDesPlans(t);
  const faq = faqDeLaPageDeVente();

  // Le titre porte son mot clé surligné. On DÉCOUPE au lieu de réécrire
  // le titre en deux morceaux : le fragment doit rester une partie de la
  // phrase, sinon la traduction suivante le perdra.
  const [avantH1, apresH1] = t.titre.split(t.motCle);

  return (
    <main className="tql" lang={t.langue}>
      <style>{CSS}</style>
      <DeclencheurAnims />

      {/* ── LE HAUT DE PAGE ────────────────────────────────────── */}
      {/* IL RÉPOND À QUATRE QUESTIONS, DANS CET ORDRE : à quoi ça sert,
          ce que j'y gagne, est-ce pour moi, pourquoi je peux y croire.
          Il ne dit PLUS comment ça marche : "on ne vend jamais les 10h
          de vol, on vend la plage avec les cocktails". */}
      <section className="tql-sec tql-hero">
        <span aria-hidden className="tql-blob tql-blob-a" />
        <span aria-hidden className="tql-blob tql-blob-b" />
        <div className="tql-large tql-hero-grille">
          <div>
            <p className="tql-surtitre">{t.etiquette}</p>
            <h1 className="tql-h1">
              {avantH1}
              <span className="tql-surb">{t.motCle}</span>
              <span aria-hidden className="tql-curseur" />
              {apresH1}
            </h1>
            <p className="tql-accroche">{t.accroche}</p>
            <p className="tql-pourqui">{t.pourQui}</p>
            <div className="tql-boutons">
              <span className="tql-avec-scint">
                <Scintilles />
                <Link href={LIEN_GENERATEUR} className="tql-cta">
                  {t.ctaPrincipal}
                  <Fleche />
                </Link>
              </span>
              <Link href={LIEN_INSCRIPTION} className="tql-cta-2">
                {t.ctaSecondaire}
              </Link>
            </div>
            <Rassurances items={t.rassurances} />

            {/* LA PREUVE, ET AUCUN LIEN SORTANT. "On ne veut pas que les
                gens quittent la page ... on veut qu'ils commandent." */}
            <p className="tql-preuve">
              <CochePleine />
              <span className="tql-preuve-t">{t.preuve}</span>
            </p>
          </div>

          <MaquetteQuiz m={t.maquette} />
        </div>
      </section>

      {/* ── LE BANDEAU DÉFILANT ────────────────────────────────── */}
      {/* Le lot est écrit DEUX fois et la piste glisse de -50 % : c'est
          ce qui rend la boucle invisible. Un seul lot ferait un saut. */}
      <div className="tql-ruban" aria-hidden>
        <div className="tql-ruban-piste">
          {[0, 1].map((lot) => (
            <div className="tql-ruban-lot" key={lot}>
              {t.bandeau.map((mot) => (
                <span key={mot}>{mot}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── LE PROBLÈME, ET LE CHIFFRE ─────────────────────────── */}
      {/* PAS : le problème, puis ce qu'il coûte, puis la solution. Ce
          cadre mesure +22 % contre une page qui empile des
          fonctionnalités, et c'est aussi l'ordre de SA page. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-deux">
          <div>
            <h2 className="tql-h2 tql-h2-g">
              {t.problemeTitre.split(t.problemeMotCle)[0]}
              <span className="tql-surb">{t.problemeMotCle}</span>
            </h2>
            {t.problemeCorps.map((p) => (
              <p key={p} className="tql-p tql-p-g">
                {p}
              </p>
            ))}
          </div>
          <div className="tql-carte tql-chiffre-carte">
            <p className="tql-chiffre">{t.chiffre}</p>
            <p className="tql-chiffre-leg">{t.chiffreLegende}</p>
            <p className="tql-chiffre-src">{t.chiffreSource}</p>
          </div>
        </div>

        {/* SON ANIMATION, LEVÉE DE SA PAGE, ET ELLE A MAINTENANT SA
            PHRASE. Béné : "ok t'as repris mes animations mais pas comme
            elles sont à l'origine, du coup ça ne veut plus rien dire."
            Sur sa page chaque animation vit sous un titre qui dit ce
            qu'on regarde ; levée toute seule, elle ne dit rien à
            quelqu'un qui la découvre. */}
        <div className="tql-large tql-anim">
          <p className="tql-anim-leg">{t.animLegende}</p>
          <AnimVente bloc="opt-in-vs-quiz" />
        </div>
        <CtaSection libelle={t.ctas.probleme} rassurance={t.ctaRassurance} />
      </section>

      {/* ── POURQUOI UN QUIZ, ET PAS UN PDF DE PLUS ────────────── */}
      {/* Béné, 5 septembre : "pour montrer pourquoi les quiz, et
          pourquoi tiquiz ?" Ce sont DEUX questions, et la page n'en
          traitait qu'une. Celle-ci répond à la première, à l'endroit où
          le lecteur se dit "d'accord, mais j'ai déjà un PDF".

          AUCUN CHIFFRE DE COMPARAISON : le 44,9 % de la carte au dessus
          porte sa source, je n'ai rien d'équivalent pour un PDF ou un
          webinaire. La comparaison porte donc sur ce qu'on OBTIENT, qui
          se constate sans mesurer. */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.formatsLeadTitre} <span className="tql-surb">{t.formatsLeadMotCle}</span>
          </h2>
          <p className="tql-p">{t.formatsLeadCorps}</p>
          <div className="tql-comp-boite">
            <table className="tql-comp tql-comp-txt">
              <thead>
                <tr>
                  {t.formatsLeadColonnes.map((c, i) => (
                    <th key={c || i} className={i === 3 ? "tql-col-nous" : undefined}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.formatsLeadLignes.map((l) => (
                  <tr key={l.critere}>
                    <th scope="row">{l.critere}</th>
                    {l.valeurs.map((v, i) => (
                      <td key={v} className={i === 2 ? "tql-col-nous" : undefined}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tql-legende">{t.formatsLeadNote}</p>
        </div>
      </section>

      {/* ── LA DÉMO : SON VRAI POPQUIZ ─────────────────────────── */}
      {/* LE TITRE NE PROMET PLUS DE TESTER LE GÉNÉRATEUR. Béné : "le
          quiz à tester il est ailleurs, là on teste le fonctionnement.
          Et c'est vraiment un titre qui fait vendre ?" Non : il
          décrivait un écran. Celui-ci dit ce que le visiteur va vivre,
          et c'est la preuve par le résultat, le déclencheur numéro 12
          de sa propre bibliothèque.

          🚨 CE QUI N'A PAS PU ÊTRE VÉRIFIÉ D'ICI : le RENDU. `curl`
          répond 200 avec `content-security-policy: frame-ancestors *`,
          donc la page s'affiche depuis n'importe quel domaine. Mais le
          navigateur de ce conteneur n'a AUCUNE route vers
          quiz.tipote.com : le cadre sort blanc, et c'est mon
          environnement, pas sa page. À confirmer à l'écran. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.demoTitre} <span className="tql-surb">{t.demoMotCle}</span>
          </h2>
          <p className="tql-p">{t.demoCorps}</p>
          <div className="tql-demo">
            <iframe
              src={DEMO_POPQUIZ}
              title="Popquiz Tiquiz"
              allow="autoplay;fullscreen;clipboard-write"
              allowFullScreen
            />
          </div>
          {/* LA SORTIE DE SECOURS. Un cadre qui ne charge pas montre la
              page d'erreur du navigateur DEDANS : aucun repli posé
              derrière ne s'afficherait. Ce lien, lui, est toujours là,
              et il reste sur nos domaines. */}
          <p className="tql-legende">
            <a href={DEMO_POPQUIZ} target="_blank" rel="noopener noreferrer">
              {t.demoLien}
            </a>
          </p>
        </div>
      </section>

      {/* ── LES ÉTAPES, EN LIGNES QUI ALTERNENT ────────────────── */}
      {/* LE COMMENT VIT ICI, et pas au premier écran. Un visiteur veut
          savoir comment ça marche APRÈS avoir compris ce qu'il y gagne,
          jamais avant. */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.mecaniqueTitre} <span className="tql-surb">{t.mecaniqueMotCle}</span> ?
          </h2>
          {t.etapes.map((e, i) => (
            <div className="tql-etape" key={e.titre}>
              <div className="tql-etape-txt">
                <span className="tql-pastille-etape">
                  {t.etapeMot} {i + 1}
                </span>
                <h3>{e.titre}</h3>
                <p>{e.corps}</p>
              </div>
              <div>
                {/* QUATRE ÉTAPES, QUATRE VISUELS. Le premier jet posait
                    la maquette du quiz sur l'étape 1 ET dans le haut de
                    page : le même écran deux fois, ce qui se lit comme
                    un manque de soin. */}
                {i === 0 ? (
                  <MaquetteBrief b={t.brief} />
                ) : i === 1 ? (
                  <MaquetteQuiz m={t.maquette} />
                ) : i === 2 ? (
                  <div className="tql-carte">
                    <h3 className="tql-h3">{t.ouCodeTitre}</h3>
                    <p className="tql-corps">{t.ouCodeCorps}</p>
                    <BlocCode />
                  </div>
                ) : (
                  <div className="tql-carte tql-carte-flux">
                    <p className="tql-cite">{t.funnelProfils[1].reponse}</p>
                    <FlecheBas />
                    <h3 className="tql-h3">{t.funnelProfils[1].profil}</h3>
                    <p className="tql-bouton-faux">{t.funnelProfils[1].offre}</p>
                    <span className="tql-tag">
                      <b>tag</b> {t.funnelProfils[1].tag}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <CtaSection libelle={t.ctas.etapes} rassurance={t.ctaRassurance} />
        </div>
      </section>

      {/* ── LE FUNNEL : CHACUN VERS SON OFFRE ──────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.funnelTitre} <span className="tql-surb">{t.funnelMotCle}</span>.
          </h2>
          <p className="tql-p">{t.funnelCorps}</p>
          <div className="tql-grille-3">
            {t.funnelProfils.map((p) => (
              <div key={p.tag} className="tql-carte tql-carte-flux">
                <p className="tql-cite">{p.reponse}</p>
                <FlecheBas />
                <h3 className="tql-h3">{p.profil}</h3>
                <p className="tql-bouton-faux">{p.offre}</p>
                <span className="tql-tag">
                  <b>tag</b> {p.tag}
                </span>
              </div>
            ))}
          </div>
          <p className="tql-legende">{t.funnelTagLegende}</p>
          <CtaSection libelle={t.ctas.funnel} rassurance={t.ctaRassurance} />
        </div>
      </section>

      {/* ── LA VIRALITÉ ────────────────────────────────────────── */}
      {/* SA PAGE A CETTE SECTION, LA LANDING NON. C'est le seul levier
          qui RAMÈNE des visiteurs au lieu d'en convertir, et il est
          vrai dans le code (`virality_enabled`, le bonus de partage).
          AUCUN chiffre : ceux de sa page portent sur ses propres quiz.
          La note dit la nuance de Jocelyne (4 août) : sur un sujet
          intime, un partage bas n'est pas un défaut du quiz. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">
            {t.viralTitre} <span className="tql-surb">{t.viralMotCle}</span>
          </h2>
          {t.viralCorps.map((p) => (
            <p key={p} className="tql-p">
              {p}
            </p>
          ))}
          <p className="tql-legende">{t.viralNote}</p>
          <CtaSection libelle={t.viralCta} rassurance={t.ctaRassurance} />
        </div>
      </section>

      {/* ── SYSTEME.IO, SANS INTERMÉDIAIRE ─────────────────────── */}
      {/* Le titre annonçait "le tag est posé même s'il n'existe pas
          encore". Béné : "oui ok c'est super, mais NON c'est pas un
          bénéfice qui fait vendre. Le bénéfice c'est que Systeme io est
          connecté nativement, pas besoin de lier zapier, make, pabbly
          ou autre." La création du tag reste écrite : c'est la PREUVE
          de la connexion, ce n'est plus l'argument. */}
      <section className="tql-sec">
        <div className="tql-large tql-lire-bloc">
          <p className="tql-surtitre tql-surtitre-c">{t.etiquette}</p>
          <h2 className="tql-h2">
            {t.sioTitre.split(t.sioMotCle)[0]}
            <span className="tql-surb">{t.sioMotCle}</span>
          </h2>
          {t.sioCorps.map((p) => (
            <p key={p} className="tql-p">
              {p}
            </p>
          ))}
          {/* LE PRIX DE L'INTERMÉDIAIRE VIENT DU MODULE, jamais écrit à
              la main : il est relevé sur la page de tarifs de Zapier, et
              un montant recopié est un montant faux au premier
              changement. Les devises ne se convertissent pas. */}
          <p className="tql-p tql-p-fort">
            {t.sioPrix.replace("{prix}", ZAPIER.professionnelParMois)}
          </p>
          <div className="tql-boutons tql-centre" style={{ marginTop: 30 }}>
            <span className="tql-avec-scint">
              <Scintilles />
              <Link href={LIEN_INSCRIPTION} className="tql-cta">
                {t.ctas.sio}
                <Fleche />
              </Link>
            </span>
          </div>
          <Rassurances items={t.rassurances} />
        </div>
      </section>

      {/* ── POURQUOI TIQUIZ, ET PAS UN AUTRE OUTIL DE QUIZ ─────── */}
      {/* La deuxième question de Béné, et elle était traitée en cinq
          morceaux répartis dans la page, donc nulle part.

          LE TABLEAU SE CONSTRUIT SUR `OUTILS`, la table qui alimente
          déjà les six pages du hub : chaque ligne y est sourcée sur la
          documentation de l'outil, et le lien mène aux preuves.
          Réécrire ces lignes ici en ferait une deuxième liste, donc une
          divergence, sur l'écran où un lecteur vérifie. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.outilsTitre} <span className="tql-surb">{t.outilsMotCle}</span>
          </h2>
          <p className="tql-p">{t.outilsCorps}</p>
          <div className="tql-comp-boite">
            <table className="tql-comp tql-comp-txt">
              <thead>
                <tr>
                  {t.outilsColonnes.map((c, i) => (
                    <th key={c || i}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTILS.map((o) => (
                  <tr key={o.nom} className={o.slug === null ? "tql-lg-nous" : undefined}>
                    <th scope="row">{o.nom}</th>
                    <td>{o.intermediaire}</td>
                    <td>{o.tagParProfil}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tql-legende">
            {t.outilsNote}{" "}
            <Link href="/integrations">{t.outilsLien}</Link>
          </p>
        </div>
      </section>

      {/* ── LES TROIS FORMATS ──────────────────────────────────── */}
      {/* La landing ne vendait QUE le quiz. Les sondages et les Popquiz
          sont dans le même abonnement, ils sont dans la grille de
          tarifs, et aucun écran ne disait ce qu'ils font. Deux produits
          payés et jamais montrés. */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.formatsTitre} <span className="tql-surb">{t.formatsMotCle}</span>
          </h2>
          <p className="tql-p">{t.formatsCorps}</p>
          <div className="tql-grille-3">
            {t.formats.map((c) => (
              <div className="tql-carte" key={c.titre}>
                <h3 className="tql-h3">{c.titre}</h3>
                <p className="tql-corps">{c.corps}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LES DEUX MÉCANIQUES : PROFIL, OU SCORE ─────────────── */}
      {/* SON ANIMATION `tes-pixels` MONTRE EXACTEMENT ÇA, et elle
          dormait dans `content/sales/anim/` sans être servie nulle part.
          Elle répond à l'objection la plus chère du persona : "je ne
          suis pas sûr que ça marche dans mon domaine". */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.modesTitre} <span className="tql-surb">{t.modesMotCle}</span>
          </h2>
          <p className="tql-p">{t.modesCorps}</p>
          <div className="tql-anim">
            <AnimVente bloc="tes-pixels" />
          </div>
          <p className="tql-legende">{t.modesNote}</p>
        </div>
      </section>

      {/* ── OÙ VIT TON QUIZ, EN BENTO ──────────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.ouTitre} <span className="tql-surb">{t.ouMotCle}</span>.
          </h2>
          <p className="tql-p">{t.ouCorps}</p>
          <div className="tql-bento">
            {t.ouCarreaux.map((c, i) => (
              <div key={c.titre} className="tql-carte">
                <Picto i={i} />
                <h3 className="tql-h3">{c.titre}</h3>
                <p className="tql-corps">{c.corps}</p>
              </div>
            ))}
          </div>
          <div className="tql-grille-2">
            <div className="tql-carte">
              <h3 className="tql-h3">{t.ouLienTitre}</h3>
              <p className="tql-corps">{t.ouLienCorps}</p>
              <ChampLien copier={t.copier} />
            </div>
            <div className="tql-carte">
              <h3 className="tql-h3">{t.ouCodeTitre}</h3>
              <p className="tql-corps">{t.ouCodeCorps}</p>
              <BlocCode />
            </div>
          </div>
          <p className="tql-legende">{t.ouNote}</p>
        </div>
      </section>

      {/* ── TON BRANDING ───────────────────────────────────────── */}
      {/* Béné : "ton logo ta marque arrive comme un cheveu sur la soupe,
          sans texte ni contexte, incompréhensible." Elle avait raison :
          l'animation était posée nue au bas d'une autre section. Elle a
          désormais son titre, sa phrase et sa légende, comme sur SA
          page. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.brandingTitre} <span className="tql-surb">{t.brandingMotCle}</span>
          </h2>
          <p className="tql-p">{t.brandingCorps}</p>
          <div className="tql-anim">
            <AnimVente bloc="ton-branding" />
          </div>
          <p className="tql-legende">{t.brandingNote}</p>
          <CtaSection libelle={t.ctas.branding} rassurance={t.ctaRassurance} />
        </div>
      </section>

      {/* ── L'APRÈS, ET CEUX QUI Y SONT DÉJÀ ───────────────────── */}
      {/* LA TRANSFORMATION D'ABORD, LES TÉMOIGNAGES ENSUITE. Son
          persona bascule à "maintenant, imaginons que tout change" :
          une page qui décrit le problème puis l'outil saute l'étape où
          le lecteur se projette, et c'est celle qui fait acheter.

          LES QUINZE TÉMOIGNAGES SONT CEUX DE SA PAGE DE VENTE, sous son
          titre à elle. Ce ne sont pas les six avis Trustpilot qu'elle a
          fait retirer le 5 septembre : ils sont quinze, ils portent un
          prénom et un métier, ils vivent déjà sur sa page, et aucun ne
          fait quitter celle-ci. Ils ne sont ni traduits ni corrigés. */}
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
            {TEMOIGNAGES.map((v) => (
              <figure className="tql-temoin" key={v.nom}>
                <blockquote>{v.texte}</blockquote>
                <figcaption>
                  <b>{v.nom}</b>
                  {v.metier ? <span>{v.metier}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── LES OBJECTIONS ─────────────────────────────────────── */}
      {/* À LA PLACE DES SIX AVIS. Les cinq objections sont celles du
          persona de `copywriting-claude/Persona tiquiz.md`, dans ses
          mots à lui. Un bloc qui répond à ce que le lecteur pense juste
          avant de cliquer mesure +28 % de clics ; six témoignages ne
          répondent à aucune question précise. */}
      <section className="tql-sec">
        <span aria-hidden className="tql-blob tql-blob-c" />
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">
            {t.objectionsTitre} <span className="tql-surb">{t.objectionsMotCle}</span>
          </h2>
          <div className="tql-objs">
            {t.objections.map((o) => (
              <div key={o.q} className="tql-carte tql-obj">
                <p className="tql-obj-q">{o.q}</p>
                <p className="tql-obj-r">{o.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CE QUI N'EST PAS POUR TOI ──────────────────────────── */}
      {/* Béné, 5 septembre : "sans bullshit". Une page qui ne dit que
          du bien se lit comme une page de vente ; une page qui sait
          dire non se lit comme quelqu'un d'honnête, et c'est sa force
          ("c'est pas pour toi, ça va pas t'aider").

          LES TROIS REFUS SONT VRAIS, ce sont ceux du bloc de
          qualification de sa page v2 : le résultat est PRÉÉCRIT par
          profil (`lib/quizScoring.ts`), le parcours est LINÉAIRE, et le
          design suit son branding sans être libre au pixel. Un refus
          inventé pour faire honnête serait du bullshit de plus. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">
            {t.pasPourToiTitre} <span className="tql-surb">{t.pasPourToiMotCle}</span>
          </h2>
          <p className="tql-p">{t.pasPourToiCorps}</p>
          <ul className="tql-non-liste">
            {t.pasPourToi.map((x) => (
              <li key={x}>
                <Croix />
                <span>{x}</span>
              </li>
            ))}
          </ul>
          <p className="tql-p tql-p-fort">{t.pasPourToiFin}</p>
        </div>
      </section>

      {/* ── LES TARIFS ─────────────────────────────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-tarifs">
          <h2 className="tql-h2">
            {t.prixTitre} <span className="tql-surb">{t.prixMotCle}</span>
          </h2>
          <p className="tql-p">{t.prixNote}</p>

          {/* L'INTERRUPTEUR, SANS UNE LIGNE DE SCRIPT. Les deux radios
              sont hors écran, les libellés les pilotent, et `:has()`
              montre le bon prix. */}
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
                  {/* LE GROS CHIFFRE CHANGE, PAS LA PHRASE. Le premier
                      jet affichait "ou 170,00 € par an" en 42 px : un
                      prix se lit d'un coup d'oeil, une phrase non. */}
                  <p className="tql-prix">
                    <span className="tql-prix-mois">{c.prix}</span>
                    <span className="tql-prix-an">{c.prixAn ?? c.prix}</span>
                  </p>
                  <p className="tql-cadence">
                    <span className="tql-prix-mois">{c.cadence}</span>
                    <span className="tql-prix-an">{c.cadenceAn ?? c.cadence}</span>
                  </p>
                  {/* L'ÉCHELLE SE DIT. Sans cette ligne, la colonne à
                      17 € a l'air de contenir DEUX choses là où le
                      gratuit en annonce trois. */}
                  {c.inclus ? <p className="tql-inclus">{c.inclus}</p> : null}
                  <ul className="tql-liste">
                    {c.lignes.map((ligne) => (
                      <li key={ligne.texte}>
                        <CochePleine />
                        <span>
                          <b>{ligne.texte}</b>
                          {/* LA PUCE PROMESSE EN DEUX TEMPS : le
                              bénéfice, puis sa conséquence concrète. Le
                              test de Béné : si on peut répondre "et
                              alors ??" à la fin, la puce est ratée. */}
                          {ligne.detail ? (
                            <em className="tql-puce-detail">{ligne.detail}</em>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {/* LES DEUX DESTINATIONS SONT RENDUES, et `:has()`
                      montre la bonne. L'interrupteur n'a aucun script,
                      donc un lien ne peut pas changer d'adresse : sans
                      ça, qui choisit l'année atterrit sur le bon de
                      commande du MOIS, et ne le voit qu'en payant. */}
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

          {/* ── LA GRILLE COMPARATIVE ────────────────────────── */}
          {/* Béné : "on n'a qu'à rajouter une grille de fonctionnalités
              qui compare tous les plans, comme les vrais saas."
              C'est une vraie `<table>`, jamais une image : une image
              n'est ni extraite par un moteur, ni sélectionnable, ni
              lisible sur un téléphone. Elle défile dans SA boîte, la
              page ne défile jamais latéralement. */}
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
              {comparatif.map((g) => (
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
        </div>
      </section>

      {/* ── LA FAQ, LES 16 QUESTIONS DE SA PAGE ────────────────── */}
      {/* Les questions ET les réponses vivent dans le `FAQPage` de sa
          page de vente, et les cinq groupes dans `lib/sales/faqV2.ts`.
          `npm run faq:extraire` fait le pont. SEIZE QUESTIONS À LA FILE,
          C'EST UN MUR : groupées, on saute directement à la sienne. */}
      <section className="tql-sec">
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">{t.faqTitre}</h2>
          <p className="tql-p">{t.faqCorps}</p>
          {faq.map((g) => (
            <div key={g.titre} className="tql-faq-groupe">
              <p className="tql-faq-titre">{g.titre}</p>
              {g.questions.map((f) => (
                <details key={f.q} className="tql-faq">
                  <summary>
                    {f.q}
                    <Chevron />
                  </summary>
                  <p>{f.r}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── LE BANDEAU DÉGRADÉ DE FIN ──────────────────────────── */}
      <section className="tql-bande">
        <div className="tql-large">
          <h2>{t.bandeTitre}</h2>
          <p>{t.bandeCorps}</p>
          <Link href={LIEN_GENERATEUR} className="tql-bande-cta">
            {t.bandeCta}
            <Fleche />
          </Link>
          <Rassurances items={t.rassurances} />
        </div>
      </section>
    </main>
  );
}
