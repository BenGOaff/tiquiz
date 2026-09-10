// app/(site)/apercu-landing-8f2c9d41/page.tsx
//
// LA LANDING COURTE, EN RELECTURE.
//
// Béné, 6 septembre 2026 : "la page actuelle fait environ 5 000 mots et
// une quinzaine d'écrans. C'est une page de vente, pas une landing.
// Elle a été écrite pour une audience chaude qui connaît déjà Béné. Le
// trafic à venir est froid : affiliés, SEO, Capterra. Un visiteur froid
// décroche au troisième écran. Rien n'est à jeter. Tout est à déplacer."
//
// -- CINQ ÉCRANS, ET L'ORDRE EST LE SIEN -----------------------------
//
//   1. le haut de page (le mot qui tourne, l'accroche, pour qui)
//   2. la preuve (trois témoignages, le chiffre Interact)
//   3. le tableau des intégrations, remonté au troisième écran
//   4. trois étapes, avec le LOGICIEL dedans
//   5. la démo, puis le mini quiz de qualification
//   6. les objections, le prix en trois lignes, le bandeau
//
// Le tableau des intégrations était à 60 % du scroll : c'est l'argument
// le plus fort du site, et personne ne descendait jusque là.
//
// -- CE QUI EST PARTI AILLEURS, ET OÙ -------------------------------
//
//   les 16 autres témoignages, les 2 autres objections, la grille
//   comparative, la FAQ, la transformation ..... /tarifs
//   la viralité, les sondages et Popquiz, les deux mécaniques, le
//   branding, où vit le quiz, les résultats par profil,
//   la connexion Systeme.io en détail ......... /fonctionnalites/<slug>
//
// -- UN SEUL LIBELLÉ DE BOUTON --------------------------------------
//
// "Créer mon quiz gratuitement", partout, avec "Gratuit, sans carte
// bancaire" dessous. Treize libellés différents, c'était treize
// promesses à tenir et aucune répétition qui s'installe.
//
// -- ELLE N'EST PAS EN LIGNE, ET C'EST SA DÉCISION -------------------
//
// Béné, 6 septembre 2026 : "montre moi la landing sur la page aperçu
// 8f2 etc pas directement en page d'accueil, on la valide d'abord
// ensemble."
//
// `tiquiz.fr/` continue donc de servir sa page de vente actuelle. Cette
// adresse est le CHANTIER : elle porte un slug introuvable, elle n'est
// dans aucun menu, elle n'est ni dans le sitemap ni dans `llms.txt`, et
// elle est en `noindex, nofollow`.
//
// C'est le sens SÛR de l'erreur : un oubli laisse la page fermée. La
// mettre en ligne est un geste explicite, en trois endroits nommés dans
// le message de livraison, pas un effet de bord d'un prochain passage.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { SUPPORTED_LOCALES } from "@/i18n/config";
import { OUTILS, ZAPIER } from "@/lib/site/integrations";
import {
  DEMO_POPQUIZ,
  TEMOIGNAGES,
  contenuLanding,
  noteDesModeles,
  paliersAffiches,
  sansDoublons,
} from "@/lib/site/landing";
import { CSS } from "@/components/landing/styles";
import QuizHero from "@/components/landing/QuizHero";
import { lienDeLaCarte, PROFILS_HERO, quizHero } from "@/lib/site/quizHero";
import { languePubliqueDuTexte } from "@/lib/site/langues";
import { hrefPourLangue } from "@/lib/site/nav";
import { listerArticles } from "@/lib/blog/articles";
import { cheminArticle } from "@/lib/blog/motsDuBlog";

import { tailleCapture } from "@/components/landing/captures";
import Machine from "@/components/landing/Machine";
import { BlocVente } from "@/components/landing/blocsVente";
import { BandeFinale, CtaPrincipal, Rassurances } from "@/components/landing/morceaux";
import { CochePleine, Croix, Fleche } from "@/components/landing/pieces";
import Temoignages from "@/components/landing/Temoignages";
import { AnimVente } from "@/components/landing/anims";
import AnimTag from "@/components/landing/AnimTag";
import DeclencheurAnims from "@/components/landing/DeclencheurAnims";

const LIEN_INSCRIPTION = "/signup";

/**
 * LES TROIS DERNIERS ARTICLES NE SONT PAS CEUX DU DÉPLOIEMENT.
 *
 * Béné, 9 septembre 2026 : "Ajoute export const revalidate = 3600 sinon
 * les 'trois derniers' resteront ceux du build."
 *
 * CE QUI EST MESURÉ, ET IL FAUT LE DIRE DANS CE SENS LÀ : aujourd'hui
 * cette ligne ne change rien. La page lit `searchParams` (l'affordance
 * `?lang=` de la relecture), et la doc de cette version de Next range
 * `searchParams` dans les "Request-time APIs", celles qui font basculer
 * un composant en rendu DYNAMIQUE (`node_modules/next/dist/docs/01-app/
 * 04-glossary.md`). Le sommaire du blog est donc relu à chaque visite,
 * ce qui est plus frais encore que la revalidation.
 *
 * Elle est posée quand même, et ce n'est pas décoratif : le jour où la
 * page prend l'adresse `/` et perd son `?lang=`, elle redevient
 * statique, et c'est CE jour là que les trois derniers articles se
 * figeraient au déploiement. Une ligne posée après coup est une ligne
 * qu'on oublie.
 */
export const revalidate = 3600;

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
    // AUCUNE CANONIQUE VERS `/` TANT QU'ELLE N'EST PAS EN LIGNE : elle
    // désignerait comme faisant autorité une page qui sert encore autre
    // chose, donc elle mentirait à Google sur les deux.
    robots: { index: false, follow: false },
  };
}

/**
 * LA CAPTURE D'UNE ÉTAPE, OU LE NOM DE CELLE QUI MANQUE.
 *
 * Béné : "prévois les emplacements d'image même si les captures
 * arrivent après." Un cadre vide passerait pour un défaut de mise en
 * page ; celui-ci DIT quel écran il faut photographier, donc il se
 * remplit en deux minutes dans un vrai compte.
 */
function CaptureEtape({ capture }: { capture: import("@/lib/site/landing").Etape["capture"] }) {
  if (capture.src === null) {
    return (
      <div className="tql-capture-vide">
        <p className="tql-capture-vide-t">Capture à prendre</p>
        <p>{capture.aPrendre}</p>
      </div>
    );
  }
  const dim = tailleCapture(capture.src);
  return (
    <Image
      className="tql-capture"
      src={capture.src}
      alt={capture.alt}
      width={dim.largeur}
      height={dim.hauteur}
      sizes="(max-width: 900px) 100vw, 560px"
    />
  );
}

export default async function AccueilPage({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuLanding(langue);
  // LA LANGUE DES DEUX LISTES, ET CE N'EST PAS LA MÊME QUESTION.
  //
  // `langue` est la locale d'INTERFACE (sept valeurs) ; le site public
  // n'en sert que deux. Le quiz du hero, les liens du générateur et le
  // blog se lisent donc sur `languePublique`, qui retombe sur l'anglais
  // et jamais sur le français : un lecteur espagnol lit l'anglais, il ne
  // se retrouve pas devant du français.
  const languePublique = languePubliqueDuTexte(langue);
  const modeles = quizHero(languePublique).profils;
  // LES TROIS DERNIERS ARTICLES, DANS SA LANGUE. Aucun repli sur une
  // autre : proposer trois articles français à un lecteur anglais est
  // pire que ne rien proposer.
  const articles = listerArticles(languePublique).slice(0, 3);
  // LES DEUX TÉMOIGNAGES QUI SE RESSEMBLENT NE SONT JAMAIS SUR LE MÊME
  // ÉCRAN (sa règle du 6 septembre). Gwenn et Eric Legrigeois partagent
  // une suite de 21 mots d'affilée, mesurée : `sansDoublons` garde le
  // premier de la liste. Sur un carrousel qui montre tout, ce filtre
  // n'est pas optionnel.
  const temoins = sansDoublons([...TEMOIGNAGES]);

  return (
    <main className="tql" lang={t.langue}>
      <style>{CSS}</style>
      {/* AUCUNE DE SES ÎLES LEVÉES SUR CETTE PAGE : les sections
          qu'elles illustraient sont parties sur `/fonctionnalites/<slug>`
          ("rien n'est à jeter, tout est à déplacer"). Le déclencheur
          revient quand même, parce que `AnimTag` en a besoin : c'est
          lui qui pose `tqz-visible`, et sans lui la scène est INERTE
          (mesuré le 5 septembre : 0 élément animé sans déclencheur). */}
      <DeclencheurAnims />

      {/* ── LE BANDEAU : À QUI ÇA S'ADRESSE ──────────────────────── */}
      {/* Béné, 7 septembre 2026, sur la phrase "Pour les entrepreneurs,
          les coachs, les consultants..." : "mets le dans le bandeau
          défilant visible sans scroller, au dessus de la ligne de
          flotaison."

          IL PASSE DONC AVANT LE HAUT DE PAGE, et il ne porte plus des
          noms de fonctionnalités (ils vivent sur /fonctionnalites) mais
          les métiers de ses lecteurs. Le label ne défile pas : sans
          lui, une file de métiers qui glisse ne dit pas à quoi elle
          répond.

          Le lot est écrit DEUX fois et la piste glisse de -50 % : c'est
          ce qui rend la BOUCLE invisible. Un seul lot ferait un saut à
          chaque tour, et ce n'est donc pas le bandeau qui est en
          double, c'est son contenu.

          LA PHRASE ENTIÈRE RESTE DANS LA PAGE, hors écran : un moteur
          et un lecteur d'écran lisent "qui ont une offre et pas assez
          de monde à qui la présenter", que le défilé ne peut pas
          porter. */}
      <div className="tql-ruban tql-ruban-haut">
        <p className="tql-vh">{t.pourQui}</p>
        <p className="tql-ruban-lb">{t.bandeauLabel}</p>
        <div className="tql-ruban-cadre" aria-hidden>
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
      </div>

      {/* ── 1. LE HAUT DE PAGE ─────────────────────────────────── */}
      {/* IL RÉPOND À QUATRE QUESTIONS, DANS CET ORDRE : à quoi ça sert,
          ce que j'y gagne, est-ce pour moi, pourquoi je peux y croire. */}
      <section className="tql-sec tql-hero">
        <span aria-hidden className="tql-blob tql-blob-a" />
        <span aria-hidden className="tql-blob tql-blob-b" />
        {/* UNE SEULE COLONNE, CENTRÉE, ET LE VRAI QUIZ DEDANS.

            Béné, 9 septembre 2026 : "Le hero est centré, une seule
            colonne. Pas de mise en page deux colonnes." Et : "Le quiz
            du hero doit tenir au-dessus de la ligne de flottaison sur
            un écran de 1440x800 : pas de scroll pour voir la première
            question et ses options."

            La maquette DESSINÉE a fait son travail : elle montrait à
            quoi ressemble un quiz. Le vrai quiz le montre en le
            faisant, et il rend en plus les deux premières marches du
            parcours mesurables (`quiz_demarre`, `quiz_termine`, les
            deux seuls des cinq événements qui n'existaient nulle part).

            IL N'Y A PLUS DE BOUTON DANS LE HAUT DE PAGE, et c'est sa
            maquette : le geste du hero EST le quiz. Un bouton posé à
            côté lui prendrait l'attention, et le premier "Créer mon
            quiz gratuitement" arrive plus bas, une fois l'argument
            posé. Reste un lien discret, pour qui sait déjà quoi créer. */}
        <div className="tql-large tql-hero-centre">
          <p className="tql-surtitre">{t.etiquette}</p>
          {/* SON TITRE, EN DEUX LIGNES : la première TOURNE en fondu
              enchaîné (trois angles), la seconde ne bouge pas. Le
              premier mot est rendu par le serveur : c'est lui que lit
              un moteur, et celui qui n'a pas de JavaScript. */}
          <h1 className="tql-h1">
            <Machine mots={t.titreDefilant} />
            <span className="tql-h1-l2">{t.motCle}</span>
          </h1>
          <p className="tql-accroche">{t.accroche}</p>

          <QuizHero langue={languePublique} />

          <div className="tql-hero-sous">
            <Rassurances items={t.rassurances} />
            <p className="tql-preuve">
              <CochePleine />
              <span className="tql-preuve-t">{t.preuve}</span>
            </p>
            {/* LE LIEN PASSE PAR `hrefPourLangue`, jamais par un `/en/`
                écrit à la main : il refuse de préfixer une page qui n'a
                pas la langue, donc il ne peut pas fabriquer un 404. */}
            <a className="tql-hero-direct" href={hrefPourLangue("/generateur-de-quiz", languePublique)}>
              {t.heroDirect}
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. POURQUOI UN QUIZ ────────────────────────────────── */}
      {/* Béné, 7 septembre 2026, sur le 44,9 % : "ça arrive comme un
          cheveu sur la soupe, on peut dire 'et alors??' donc c'est pas
          complet et pas au bon endroit."

          Elle a raison deux fois. Il était posé sous les témoignages,
          sans titre : un pourcentage tout seul ne dit rien à personne.
          Il ouvre maintenant la page, sous son propre titre, et la
          ligne du dessous dit ce que ça CHANGE pour la personne qui
          lit. C'est le seul chiffre externe de tout le site, et il ne
          se reformule jamais : "des personnes qui COMMENCENT un quiz",
          plus la mention que ce n'est pas un taux de page. */}
      <section className="tql-sec">
        <div className="tql-large tql-chiffre-bloc">
          <h2 className="tql-h2">
            {t.chiffreTitre} <span className="tql-surb">{t.chiffreMotCle}</span>
          </h2>
          <div className="tql-carte tql-chiffre-carte">
            <p className="tql-chiffre">{t.chiffre}</p>
            <p className="tql-chiffre-leg">{t.chiffreLegende}</p>
            <p className="tql-chiffre-src">{t.chiffreSource}</p>
          </div>
          <p className="tql-p tql-p-fort">{t.chiffreEtAlors}</p>
          <CtaPrincipal t={t} />
        </div>
      </section>

      {/* ── 3. LA PREUVE : SES TÉMOIGNAGES ─────────────────────── */}
      {/* Béné, 7 septembre 2026 : "c'est mal mis en forme, moche ->
          mets de jolis témoignages avec les photos des users, style
          screenshot comme sur ma page d'origine."

          C'est donc le dessin de SON carrousel `tqz-tm`, avec nos
          portraits locaux et les textes verbatim. Voir le composant :
          il ne peut pas être une île levée, parce qu'elle demande
          d'AJOUTER Maurice, et une île est du HTML figé sans données.

          LES DIX-HUIT DÉFILENT, plus trois choisis à la main : sur une
          landing courte, un mur d'avis coûte un écran entier, un
          carrousel n'en coûte aucun. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">{t.preuveTitre}</h2>
        </div>
        <Temoignages items={temoins} />
      </section>

      {/* ── 3. LE TABLEAU DES INTÉGRATIONS ─────────────────────── */}
      {/* IL MONTE AU TROISIÈME ÉCRAN. C'est l'argument le plus fort du
          site et il était à 60 % du scroll.

          LE TABLEAU SE CONSTRUIT SUR `OUTILS`, la table qui alimente
          déjà les six pages du hub : chaque ligne y est sourcée sur la
          documentation de l'outil. Réécrire ces lignes ici en ferait
          une deuxième liste, donc une divergence, sur l'écran où un
          lecteur vérifie.

          LE REGISTRE RESTE NEUTRE (sa règle du 6 septembre : "aucune
          formule comparative ou polémique"). Le titre dit ce qu'il faut
          installer, il ne dit pas que les autres s'arrêtent. */}
      <section className="tql-sec">
        <div className="tql-large">
          <div className="tql-intro">
            <h2 className="tql-h2">
              {t.outilsTitre} <span className="tql-surb">{t.outilsMotCle}</span>
            </h2>
            <p className="tql-p">{t.outilsCorps}</p>
          </div>
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
          {/* LE PRIX DE L'INTERMÉDIAIRE VIENT DU MODULE, jamais écrit à
              la main : il est relevé sur la page de tarifs de Zapier.
              Les devises ne se convertissent pas. */}
          <p className="tql-p tql-p-fort tql-gain">
            {t.outilsGain.replace("{prix}", ZAPIER.professionnelParMois)}
          </p>
          {/* L'ANIMATION REMPLACE LA MOITIÉ DU PARAGRAPHE (Béné,
              7 septembre : "c'est long, il faut faire un effort pour
              comprendre"). Elle montre le geste, la phrase garde le
              seul fait qu'un dessin ne peut pas porter : le prix. */}
          <AnimTag t={t} />
          <p className="tql-legende">
            <Link href="/integrations">
              {t.outilsLien}
              <Fleche />
            </Link>
          </p>
          <CtaPrincipal t={t} />
        </div>
      </section>

      {/* ── 3bis. ET SANS SYSTEME.IO ────────────────────────────── */}
      {/* Béné, 7 septembre 2026 : "garde tout pour les utilisateurs qui
          n'utilisent pas systeme io : c'est possible aussi. Moins
          simple, mais possible."

          ELLE AVAIT RAISON DE LEVER MON REFUS. J'avais écarté son bloc
          parce qu'il montre douze outils d'emailing concurrents, alors
          que l'argument de la section juste au dessus est la connexion
          NATIVE. Mais refuser le bloc, c'était refuser le PUBLIC : la
          moitié des gens qui liront cette page n'ont pas Systeme.io, et
          la page ne leur disait rien.

          CE QUI EST VRAI, ET MESURÉ LE 7 SEPTEMBRE : aucun webhook
          sortant, aucune intégration native ailleurs que Systeme.io. Le
          seul chemin est l'export CSV de Mes leads, et il porte LE
          PROFIL OBTENU (`app/leads/LeadsShell.tsx`). Le texte dit donc
          les deux temps, et `autresLegende` nomme lequel des deux est
          automatique : sans elle, un visuel qui montre Brevo au dessus
          de "S'abonner à la campagne" promet une connexion qui
          n'existe pas.

          LE VISUEL N'EST PAS DÉCORATIF : ses trois cartes portent de
          vraies phrases (le tag, la campagne, l'accès), donc les
          masquer à un lecteur d'écran retirerait l'argument. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-deux-col">
          {/* LE TEXTE EST PREMIER DANS LE DOM, L ANIMATION PASSE A
              GAUCHE PAR LE CSS. Sur un telephone les deux colonnes
              s empilent dans l ordre du DOM : le titre doit y preceder
              son visuel, sinon l animation arrive sans contexte. */}
          <div className="tql-deux-col-txt">
            <h2 className="tql-h2">
              {t.autresTitre} <span className="tql-surb">{t.autresMotCle}</span>
            </h2>
            {t.autresCorps.map((c) => (
              <p className="tql-p" key={c}>
                {c}
              </p>
            ))}
            <p className="tql-legende">{t.autresLegende}</p>
            <CtaPrincipal t={t} centre={false} />
          </div>
          <div className="tql-visuel-gauche">
            <AnimVente bloc="autres-outils" decoratif={false} />
          </div>
        </div>
      </section>

      {/* ── 4. TROIS ÉTAPES, ET LE LOGICIEL DEDANS ─────────────── */}
      {/* Béné : "c'est le manque numéro un de la page actuelle : on y
          voit beaucoup de quiz, on n'y voit jamais le logiciel." */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.mecaniqueTitre} <span className="tql-surb">{t.mecaniqueMotCle}</span>
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
                <CaptureEtape capture={e.capture} />
              </div>
            </div>
          ))}
          <CtaPrincipal t={t} />
        </div>
      </section>

      {/* ── LES SIX QUIZ DÉJÀ ÉCRITS ───────────────────────────── */}
      {/* Béné, 9 septembre 2026 : "Les six cartes 'Six quiz prêts à
          générer' aussi", à propos du sujet, de l'audience et de
          l'objectif dans l'URL.

          LE BRIEF NE VIT PAS ICI. Les six couples (sujet, audience,
          objectif) sont ceux du quiz du hero, dans `lib/site/quizHero.ts`,
          et les deux écrans lisent la MÊME table. Dans sa maquette ils
          sont écrits deux fois, une fois dans le bouton du résultat et
          une fois dans le `href` de la carte : les recopier ici les
          laisserait diverger, et le générateur s'ouvrirait un jour avec
          un sujet que la carte n'annonçait pas.

          LA SOURCE DIFFÈRE, ELLE, ET C'EST TOUT L'INTÉRÊT : ces cartes
          portent `source=modeles`, le résultat du quiz porte
          `source=hero` plus son profil. C'est ce qui dit laquelle des
          deux portes amène vraiment des générations. */}
      <section className="tql-sec">
        <div className="tql-large">
          <div className="tql-intro">
            <h2 className="tql-h2">
              {t.modelesTitre} <span className="tql-surb">{t.modelesMotCle}</span>
            </h2>
            <p className="tql-p">{t.modelesCorps}</p>
          </div>
          <div className="tql-mgrid">
            {PROFILS_HERO.map((cle) => (
              <article className="tql-m" key={cle}>
                <span className="tql-m-pour">{modeles[cle].pour}</span>
                <b>{modeles[cle].idee}</b>
                <p>{modeles[cle].carte}</p>
                <a className="tql-m-lien" href={lienDeLaCarte(cle, languePublique)}>
                  {t.modelesBouton}
                </a>
              </article>
            ))}
          </div>
          {/* LE COMPTE VIENT DU CATALOGUE. Sa maquette annonce
              "21 modèles par métier" ; mesuré, il y en a 15, et les six
              autres sont les six cartes ci dessus. Sa propre section
              "Un quiz, ce n'est que le début" le dit d'ailleurs juste :
              "Quinze modèles métier et six modèles phares". */}
          <p className="tql-m-note">
            {noteDesModeles(t)}{" "}
            <a className="tql-m-note-lien" href={hrefPourLangue("/templates", languePublique)}>
              {t.modelesVoirTout}
            </a>
          </p>
        </div>
      </section>

      {/* ── 5. LE PRODUIT SE DÉMONTRE TOUT SEUL ────────────────── */}
      {/* La vidéo montre l'expérience, le quiz la fait vivre : les deux
          collés font l'enchaînement le plus fort de la page.

          🚨 CE QUI N'A PAS PU ÊTRE VÉRIFIÉ D'ICI : le RENDU du cadre.
          `curl` répond 200 avec `content-security-policy:
          frame-ancestors *`, donc la page s'affiche depuis n'importe
          quel domaine. Mais le navigateur de ce conteneur n'a AUCUNE
          route vers quiz.tipote.com. À confirmer à l'écran. */}
      <section className="tql-sec" id="demo">
        <div className="tql-large">
          <div className="tql-intro">
            <h2 className="tql-h2">
              {t.demoTitre} <span className="tql-surb">{t.demoMotCle}</span>
            </h2>
            <p className="tql-p">{t.demoCorps}</p>
          </div>
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
              derrière ne s'afficherait. Ce lien, lui, est toujours là. */}
          <p className="tql-legende">
            <a href={DEMO_POPQUIZ} target="_blank" rel="noopener noreferrer">
              {t.demoLien}
            </a>
          </p>
        </div>
      </section>

      {/* SON MINI QUIZ DE QUALIFICATION, SANS MODIFICATION. Il pose une
          question à la fois, il sait dire non, et il n'a aucun script.
          IL N'EXISTE QU'EN FRANÇAIS : le traduire en ferait une
          deuxième version à tenir, qui divergerait de la sienne en une
          semaine. */}
      {t.langue === "fr" ? (
        <BlocVente nom="cest-pour-toi" />
      ) : (
        /* LE REPLI HORS FRANÇAIS, ET IL N'EST PAS DÉCORATIF. Son mini
           quiz n'existe qu'en français : sans ce bloc, la landing
           anglaise ne dirait JAMAIS non, alors que savoir dire non est
           ce qui rend croyable tout le reste (sa règle du 5 septembre).
           Les trois refus sont les mêmes que ceux de son quiz, et
           chacun dit ce que Tiquiz fait à la place. */
        <section className="tql-sec tql-blanc">
          <div className="tql-large tql-lire-bloc">
            <div className="tql-intro">
              <h2 className="tql-h2">
                {t.pasPourToiTitre} <span className="tql-surb">{t.pasPourToiMotCle}</span>
              </h2>
              <p className="tql-p">{t.pasPourToiCorps}</p>
            </div>
            <ul className="tql-non-liste">
              {t.pasPourToi.map((x) => (
                <li key={x}>
                  <Croix />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <p className="tql-legende">{t.pasPourToiFin}</p>
          </div>
        </section>
      )}

      {/* ── 6. OBJECTIONS, PRIX, CTA FINAL ─────────────────────── */}
      {/* TROIS OBJECTIONS ICI, LES CINQ SUR /tarifs. Un bloc qui répond
          à ce que le lecteur pense juste avant de cliquer mesure +28 %
          de clics ; les deux qui partent ("ça va me prendre du temps",
          "je ne suis pas sûr que ça marche dans mon domaine") sont
          celles qu'on se pose une fois le prix vu. */}
      <section className="tql-sec tql-blanc">
        <span aria-hidden className="tql-blob tql-blob-c" />
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">
            {t.objectionsTitre} <span className="tql-surb">{t.objectionsMotCle}</span>
          </h2>
          <div className="tql-objs">
            {t.objections.slice(0, 3).map((o) => (
              <div key={o.q} className="tql-carte tql-obj">
                <p className="tql-obj-q">{o.q}</p>
                <p className="tql-obj-r">{o.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LE PRIX EN TROIS LIGNES, ET LE DÉTAIL EST SUR /tarifs.
          AUCUN MONTANT N'EST ÉCRIT ICI : les trois lignes disent ce que
          le palier CONTIENT, et le prix se lit sur la page qui vend. */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.prixTitre} <span className="tql-surb">{t.prixMotCle}</span>
          </h2>
          {/* LE PRIX VIENT DU CATALOGUE, jamais du texte : c'est le
              montant que le bon de commande encaisse. */}
          <ul className="tql-paliers">
            {paliersAffiches(t).map((p) => (
              <li key={p.nom}>
                <span>
                  <b className="tql-palier-nom">{p.nom}</b>
                  {p.prix ? <b className="tql-palier-prix">{p.prix}</b> : null}
                  {p.cadence ? <i className="tql-palier-cadence">{p.cadence}</i> : null}
                </span>
                <span>{p.resume}</span>
              </li>
            ))}
          </ul>
          <p className="tql-legende">{t.paliersNote}</p>
          <p className="tql-legende">
            <Link href="/tarifs">
              {t.paliersLien}
              <Fleche />
            </Link>
          </p>
          <CtaPrincipal t={t} />
        </div>
      </section>

      {/* ── LES TROIS DERNIERS ARTICLES ────────────────────────── */}
      {/* Béné, 9 septembre 2026 : "La section blog affiche les trois
          derniers articles publiés, filtrés sur la locale, et disparaît
          entièrement (return null) s'il n'y en a aucun. Ajoute
          export const revalidate = 3600 sinon les 'trois derniers'
          resteront ceux du build."

          LES DEUX MOITIÉS COMPTENT. Une section de blog vide, avec son
          titre et sa phrase et rien dessous, se lit comme une panne :
          elle ne s'affiche donc pas du tout. Et sans la revalidation,
          "les trois derniers" seraient figés au déploiement, ce qui est
          faux dès le quatrième article. */}
      {articles.length > 0 && (
        <section className="tql-sec">
          <div className="tql-large">
            <div className="tql-intro">
              <h2 className="tql-h2">
                {t.blogTitre} <span className="tql-surb">{t.blogMotCle}</span>
              </h2>
              <p className="tql-p">{t.blogCorps}</p>
            </div>
            <div className="tql-bgrid">
              {articles.map((a) => (
                <article className="tql-b" key={a.slug}>
                  <span className="tql-b-cat">{t.blogEtiquette}</span>
                  <b>{a.titre}</b>
                  <p>{a.description}</p>
                  <a className="tql-b-lien" href={cheminArticle(a.slug, languePublique)}>
                    {t.blogLire}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <BandeFinale t={t} />
    </main>
  );
}
