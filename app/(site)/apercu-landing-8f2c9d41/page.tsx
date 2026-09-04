// app/(site)/apercu-landing-8f2c9d41/page.tsx
//
// LA LANDING, DEUXIÈME PASSAGE.
//
// Béné, 4 septembre 2026 : "tu vas vraiment devoir faire des efforts sur
// le design, on est très loin d'un saas premium de 2026... rapproche-toi
// beaucoup plus de ma page d'origine. On est à peine à 20 % de ce que je
// veux."
//
// -- CE QUI A CHANGÉ, ET D'OÙ ÇA VIENT --------------------------------
//
// J'ai SERVI sa page de vente dans un navigateur et je l'ai regardée
// section par section, au lieu d'en relire le CSS. Huit gestes lui
// appartiennent et manquaient tous :
//
//   1. le SURLIGNEUR pâle derrière un fragment de titre, avec le trait
//      vertical de curseur au bout ;
//   2. les SCINTILLES au dessus du bouton principal ;
//   3. la RASSURANCE sous chaque bouton ("Gratuit à vie", "Pas besoin
//      de CB") ;
//   4. le BANDEAU DÉFILANT de fonctionnalités ;
//   5. les pastilles "ÉTAPE n" et des lignes qui ALTERNENT texte /
//      visuel, au lieu d'une grille de quatre cartes plates ;
//   6. de vraies MAQUETTES de produit dans ces lignes ;
//   7. les cartes de tarif à RUBAN coloré, avec l'interrupteur
//      mensuel / annuel et sa pastille "2 mois offerts" ;
//   8. le BANDEAU DÉGRADÉ de fin.
//
// Et deux choses viennent de ce que font les landings qui vendent en
// 2026, pas d'elle : la PREUVE SOCIALE remontée AVANT la première
// fonctionnalité (une barre Trustpilot dès le haut de page), et une
// grille "bento" à la place d'une liste à puces.
//
// -- LES AVIS SONT VRAIS, ET C'EST LE PLUS IMPORTANT ------------------
//
// Béné : "on a ici des avis tous frais sur tiquiz, tu peux les utiliser".
// Les six sont relevés sur `fr.trustpilot.com/review/tiquiz.fr`, mot
// pour mot, avec leur auteur et leur date, dans `lib/site/landing.ts`.
// Ils ne se traduisent JAMAIS : un témoignage traduit n'est plus un
// témoignage. Et la page n'affiche AUCUNE note chiffrée : Trustpilot
// montre 100 % de 5 étoiles ET un TrustScore pondéré de 4,2, et les
// deux côte à côte se liraient comme une erreur.
//
// -- CE QUI RESTE ABSENT, ET POURQUOI ---------------------------------
//
// Aucune capture d'écran du produit : la seule que l'app sait produire
// vient de `/visual-test`, avec un bandeau "Mode aperçu" et un quiz de
// démo écrit SANS ACCENTS. Les maquettes sont DESSINÉES (`pieces.tsx`).
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
import {
  AVIS,
  DEMO_POPQUIZ,
  TRUSTPILOT_URL,
  avantagesPartages,
  colonnesDeTarif,
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
  CocheFine,
  CochePleine,
  Etoiles,
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

export default async function ApercuLandingPage({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuLanding(langue);
  const colonnes = colonnesDeTarif(t);
  const partages = avantagesPartages();
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

            {/* LA PREUVE AVANT LA PREMIÈRE FONCTIONNALITÉ. C'est ce que
                font les landings qui convertissent en 2026, et ici elle
                est vraie et vérifiable en un clic. */}
            <p className="tql-preuve">
              <Etoiles />
              <span className="tql-preuve-t">{t.preuve}</span>
              <a href={TRUSTPILOT_URL} target="_blank" rel="noopener noreferrer">
                {t.preuveLien}
              </a>
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

      {/* ── LA DÉMO : SON VRAI POPQUIZ ─────────────────────────── */}
      {/* Béné, 4 septembre 2026, en donnant l'adresse : "la vidéo démo
          normalement tu as l'url ? C'est un popquiz".
          MESURÉ avant de l'intégrer : la page répond 200 et porte
          `content-security-policy: frame-ancestors *`, donc elle
          s'affiche depuis n'importe quel domaine. Ce n'est pas une
          vidéo : c'est un Popquiz, donc le visiteur RÉPOND pendant
          qu'il regarde, et la page montre le produit au lieu d'en
          parler. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.demoTitre} <span className="tql-surb">{t.demoMotCle}</span>
          </h2>
          <p className="tql-p">{t.demoCorps}</p>
          {/* L'IFRAME EST CELLE QU'ELLE A DONNÉE, aux attributs près
              (`allow`, `allowfullscreen`, le rapport 16/9 tenu par le
              padding). Pas de `loading="lazy"` : son bout de code n'en
              avait pas, et ce bloc est le deuxième de la page.

              🚨 CE QUI N'A PAS PU ÊTRE VÉRIFIÉ D'ICI : le RENDU. `curl`
              répond 200 avec `content-security-policy: frame-ancestors *`,
              donc la page s'affiche depuis n'importe quel domaine. Mais
              le navigateur de ce conteneur n'a AUCUNE route vers
              quiz.tipote.com (ERR_CONNECTION_RESET en direct, rien à
              travers le proxy) : la capture montre un cadre blanc, et
              c'est mon environnement, pas sa page. À confirmer à
              l'écran. */}
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

      {/* ── LE PROBLÈME, ET LE CHIFFRE ─────────────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-deux">
          <div>
            <h2 className="tql-h2 tql-h2-g">{t.problemeTitre}</h2>
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

        {/* SON ANIMATION, LEVÉE DE SA PAGE. Béné : "pourquoi tu ne
            reprends pas au moins une partie des animations de ma page
            d'origine ? Elles sont super et elles montrent bien le
            fonctionnement !" Celle ci montre exactement ce que la
            section dit : un PDF qu'on ne lit pas contre un quiz auquel
            on répond. */}
        <div className="tql-large tql-anim">
          <AnimVente bloc="opt-in-vs-quiz" />
        </div>
      </section>

      {/* ── LES ÉTAPES, EN LIGNES QUI ALTERNENT ────────────────── */}
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
        </div>
      </section>

      {/* ── L'EXCLUSIVITÉ SYSTEME.IO ───────────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large tql-lire-bloc">
          <p className="tql-surtitre tql-surtitre-c">{t.etiquette}</p>
          <h2 className="tql-h2">{t.sioTitre}</h2>
          {t.sioCorps.map((p) => (
            <p key={p} className="tql-p">
              {p}
            </p>
          ))}
          <div className="tql-boutons tql-centre" style={{ marginTop: 30 }}>
            <span className="tql-avec-scint">
              <Scintilles />
              <Link href={LIEN_INSCRIPTION} className="tql-cta">
                {t.ctaSecondaire}
                <Fleche />
              </Link>
            </span>
          </div>
        </div>
      </section>

      {/* ── OÙ VIT TON QUIZ, EN BENTO ──────────────────────────── */}
      <section className="tql-sec tql-blanc">
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

          {/* Le même quiz qui prend ses couleurs et son logo. */}
          <div className="tql-anim">
            <AnimVente bloc="ton-branding" />
          </div>
        </div>
      </section>

      {/* ── LES AVIS, VRAIS ET VÉRIFIABLES ─────────────────────── */}
      <section className="tql-sec">
        <span aria-hidden className="tql-blob tql-blob-c" />
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.avisTitre} <span className="tql-surb">{t.avisMotCle}</span>.
          </h2>
          <p className="tql-p">{t.avisCorps}</p>
          <div className="tql-grille-3">
            {AVIS.map((a) => (
              <article key={a.auteur} className="tql-carte tql-avis">
                <Etoiles />
                <p className="tql-avis-titre">{a.titre}</p>
                <p className="tql-avis-texte">{a.texte}</p>
                <div className="tql-avis-tete">
                  <p className="tql-avis-nom">{a.auteur}</p>
                  <span className="tql-avis-date">{a.date}</span>
                </div>
              </article>
            ))}
          </div>
          <p className="tql-legende">
            <a href={TRUSTPILOT_URL} target="_blank" rel="noopener noreferrer">
              {t.avisSur}
            </a>
          </p>
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
                  <ul className="tql-liste">
                    {c.lignes.map((ligne) => (
                      <li key={ligne}>
                        <CochePleine />
                        <span>{ligne}</span>
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

          {/* CE QUE TOUT LE MONDE A, DIT UNE FOIS. Recopier ces dix
              lignes dans les trois colonnes noierait ce qui les
              distingue, et c'est ce qu'on vient chercher ici. */}
          <div className="tql-carte tql-partage">
            <h3 className="tql-h3">{t.partageTitre}</h3>
            <ul className="tql-liste tql-liste-3">
              {partages.map((ligne) => (
                <li key={ligne}>
                  <CochePleine />
                  <span>{ligne}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── LA FAQ, LES 16 QUESTIONS DE SA PAGE ────────────────── */}
      {/* Béné : "et la FAQ bordel tu as déjà tout sur la page de vente :
          pourquoi tu ne reproduis pas ??" Il n'y avait rien à écrire :
          les questions ET les réponses vivent dans le `FAQPage` de sa
          page, et les cinq groupes dans `lib/sales/faqV2.ts` depuis le
          2 septembre. `npm run faq:extraire` fait le pont.
          SEIZE QUESTIONS À LA FILE, C'EST UN MUR : groupées, on saute
          directement à la sienne. */}
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
