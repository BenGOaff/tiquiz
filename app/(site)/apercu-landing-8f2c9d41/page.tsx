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
  paliersAffiches,
  temoinsAccueil,
  blocLong,
} from "@/lib/site/landing";
import { CSS } from "@/components/landing/styles";
import { tailleCapture } from "@/components/landing/captures";
import Machine from "@/components/landing/Machine";
import { BlocVente } from "@/components/landing/blocsVente";
import { BandeFinale, CtaPrincipal, Rassurances } from "@/components/landing/morceaux";
import { CochePleine, Croix, Fleche, MaquetteQuiz } from "@/components/landing/pieces";

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
  const temoins = temoinsAccueil(TEMOIGNAGES);

  return (
    <main className="tql" lang={t.langue}>
      <style>{CSS}</style>
      {/* AUCUN DE SES BLOCS ANIMÉS SUR CETTE PAGE, ET C'EST SA
          DÉCISION. Les sections qu'ils illustraient sont parties sur
          `/fonctionnalites/<slug>` ("rien n'est à jeter, tout est à
          déplacer"). `DeclencheurAnims` est donc RETIRÉ : monté pour
          rien, il ferait croire au prochain passage qu'il manque des
          blocs à poser ici. Il vit sur les pages qui en portent. */}

      {/* ── 1. LE HAUT DE PAGE ─────────────────────────────────── */}
      {/* IL RÉPOND À QUATRE QUESTIONS, DANS CET ORDRE : à quoi ça sert,
          ce que j'y gagne, est-ce pour moi, pourquoi je peux y croire. */}
      <section className="tql-sec tql-hero">
        <span aria-hidden className="tql-blob tql-blob-a" />
        <span aria-hidden className="tql-blob tql-blob-b" />
        <div className="tql-large tql-hero-grille">
          <div>
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
            <p className="tql-pourqui">{t.pourQui}</p>
            <div className="tql-boutons">
              <Link href={LIEN_INSCRIPTION} className="tql-cta">
                {t.ctaPrincipal}
                <Fleche />
              </Link>
              {/* LE BOUTON SECONDAIRE RESTE SUR LA PAGE : la démo est
                  au cinquième écran, une ancre y descend. Un lien qui
                  part est un visiteur qui ne revient pas. */}
              <a href="#demo" className="tql-cta-2">
                {t.ctaSecondaire}
              </a>
            </div>
            <p className="tql-mid-r tql-sous-cta">{t.sousCta}</p>
            <Rassurances items={t.rassurances} />

            <p className="tql-preuve">
              <CochePleine />
              <span className="tql-preuve-t">{t.preuve}</span>
            </p>
          </div>

          {/* 🚨 LE VISUEL ATTENDU EST UNE VIDÉO, ET ELLE N'EXISTE PAS
              ENCORE. Béné : "une boucle vidéo silencieuse de 8 s
              montrant le générateur en train d'écrire un quiz (prompt à
              gauche, questions qui apparaissent à droite). En attendant
              la vidéo, garde la maquette de quiz actuelle."
              La maquette est DESSINÉE : traduite avec le reste, nette à
              toutes les densités, et elle ne pèse rien. */}
          <MaquetteQuiz m={t.maquette} />
        </div>
      </section>

      {/* ── LE BANDEAU DÉFILANT, UNE SEULE FOIS ────────────────── */}
      {/* Béné, 6 septembre : "le bandeau défilant des fonctionnalités
          apparaît deux fois. Garde-le une seule fois."
          Le lot est écrit DEUX fois et la piste glisse de -50 % : c'est
          ce qui rend la BOUCLE invisible, et ce n'est pas le bandeau qui
          est en double, c'est son contenu. Un seul lot ferait un saut à
          chaque tour. */}
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

      {/* ── 2. LA PREUVE ───────────────────────────────────────── */}
      {/* TROIS TÉMOIGNAGES, NOMMÉS PAR ELLE, verbatim. Les seize autres
          sont sur /tarifs : c'est là qu'on hésite encore, et c'est là
          qu'un mur d'avis sert à quelque chose.

          ET LE CHIFFRE INTERACT NE SE REFORMULE JAMAIS : "des personnes
          qui commencent un quiz", plus la mention que ce n'est pas un
          taux de page. C'est le seul chiffre externe de tout le site. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">{t.preuveTitre}</h2>
          <div className="tql-preuve-lignes">
            {temoins.map((v) => (
              <figure key={v.nom} className="tql-preuve-un">
                <blockquote>{v.texte}</blockquote>
                <figcaption>
                  {v.nom}
                  {v.metier ? <span> · {v.metier}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="tql-carte tql-chiffre-carte tql-chiffre-seul">
            <p className="tql-chiffre">{t.chiffre}</p>
            <p className="tql-chiffre-leg">{t.chiffreLegende}</p>
            <p className="tql-chiffre-src">{t.chiffreSource}</p>
          </div>
        </div>
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
          {/* LE PRIX DE L'INTERMÉDIAIRE VIENT DU MODULE, jamais écrit à
              la main : il est relevé sur la page de tarifs de Zapier.
              Les devises ne se convertissent pas. */}
          <p className="tql-p tql-p-fort tql-gain">
            {t.outilsGain.replace("{prix}", ZAPIER.professionnelParMois)}
          </p>
          <p className="tql-legende">
            <Link href="/integrations">
              {t.outilsLien}
              <Fleche />
            </Link>
          </p>
          <CtaPrincipal t={t} />
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
                <p className={`tql-obj-r${blocLong([o.r]) ? " tql-p-lire" : ""}`}>{o.r}</p>
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

      <BandeFinale t={t} />
    </main>
  );
}
