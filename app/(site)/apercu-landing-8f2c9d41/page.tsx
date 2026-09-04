// app/(site)/apercu-landing-8f2c9d41/page.tsx
//
// LA LANDING EN VRAIE PAGE NEXT, POUR RELECTURE.
//
// Béné, 4 septembre 2026 : "propose moi une landing (pas besoin d'un
// secret dessus, juste met un slug introuvable) pour que je voie à quoi
// elle pourrait ressembler en vrai next avec la traduction".
//
// -- LE PREMIER JET ÉTAIT AUSTÈRE, ET C'ÉTAIT MA FAUTE ----------------
//
// Béné, le même jour : "on est donc passés de ma super jolie page ultra
// design à ... ça. C'est très décevant."
//
// Elle avait raison. J'avais appliqué à une page de VENTE les règles de
// sobriété du BLOG. La règle du 31 août dit "aucun aplat de couleur
// SOUS DU TEXTE" : elle interdit un pavé bleu derrière un paragraphe,
// elle n'a jamais interdit les visuels, les cartes, les ombres ni la
// couleur. J'avais sorti une page sans une seule image pour vendre un
// outil de quiz.
//
// -- LE SYSTÈME VISUEL EST LE SIEN, MESURÉ ---------------------------
//
// Rien n'est inventé ici. Tout est relevé dans `content/sales/v2/
// funnel-quiz.html`, le bloc qu'elle a relu et corrigé trois fois le
// 2 septembre, et dans la capture `content/sales/tiquiz.html` :
//
//   fonte      Open Sans, les MÊMES fichiers .woff2 que sert sa page
//              de vente (`/v/tiquiz/*.woff2`), donc aucun appel à
//              Google Fonts et aucun rendu différent du sien ;
//   sections   `padding: 100px 20px`, alternance #F3F6FC / #fff ;
//   conteneur  1120px ;
//   titres     38px/1.2/700 centrés, le mot clé en #20BBE6 ;
//   corps      17px/1.65 en #3B3B3B, borné à 720px ;
//   cartes     blanches, rayon 18px, ombre 0 10px 30px rgba(35,40,80,.08) ;
//   CTA        #5A6EF6, rayon 999px, et l'animation `tqButtonPulse`,
//              recopiée à l'identique de sa page ;
//   mobile     rupture à 900px, sections à 60px, titres à 29px.
//
// -- AUCUNE ICÔNE EN CARACTÈRE UNICODE -------------------------------
//
// Leçon du 2 septembre : `\2713` et `\2192` n'existent ni dans Inter ni
// dans Open Sans, donc Windows rend un carré vide. Les pictogrammes
// sont des TRACÉS SVG écrits ici.
//
// -- PAS DE CAPTURE DU PRODUIT, ET C'EST UNE DÉCISION ----------------
//
// La seule capture que l'app sait produire vient de `/visual-test`, la
// fixture des tests visuels : bandeau "Mode aperçu" et quiz de démo
// écrit SANS ACCENTS ("Quel createur de quiz es-tu ?"). La maquette du
// haut de page est donc dessinée en HTML, comme son bloc funnel.
//
// -- PAS DE TÉMOIGNAGE, NON PLUS -------------------------------------
//
// Sa page de vente en porte quinze, avec les portraits. Je n'ai aucun
// moyen de vérifier d'ici qui a dit quoi, et un faux témoignage est son
// interdit numéro un. Ils s'ajoutent quand elle donne les vrais.
//
// -- ELLE EST EN `noindex`, ET CE N'EST PAS QU'UNE PRÉCAUTION --------
//
// Deux pages qui prétendent être l'accueil de Tiquiz se feraient
// concurrence sur la même requête. Elle n'est ni dans le sitemap, ni
// dans `llms.txt`, ni dans le pied de page.
//
// -- LES LIENS MÈNENT À DES PAGES QUI EXISTENT -----------------------
//
// `/embed/preview` est le générateur d'aujourd'hui, `/signup`
// l'inscription gratuite. Poser un lien vers `/generateur-de-quiz`
// avant de l'avoir écrit, ce serait un 404 sur la page qui doit
// inspirer confiance (drame du centre d'aide, 24 août).

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";

import { SUPPORTED_LOCALES } from "@/i18n/config";
import { HOTE_VENTE } from "@/lib/publicHost";
import { avantagesPartages, colonnesDeTarif, contenuLanding } from "@/lib/site/landing";

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

/* Les cinq pictogrammes de "ton quiz vit où tu veux", DESSINÉS.
   Jamais un caractère Unicode : il n'existe pas dans la fonte. */
const PICTOS: readonly string[] = [
  // un globe : ton propre domaine
  "M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 2.5 15.6 0 18m0-18c-2.5 2.4-2.5 15.6 0 18M3.5 9h17M3.5 15h17",
  // un entonnoir : une page Systeme.io
  "M3 4h18l-7 8v7l-4 2v-9L3 4z",
  // un bloc de code : intégré dans une page
  "M9 8l-4 4 4 4m6-8l4 4-4 4",
  // un lien : sa propre adresse
  "M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1 1m0 8a5 5 0 01-7.5-.5l-2 2a5 5 0 007 7l1-1",
  // un globe à méridiens : les langues
  "M4 7h16M4 12h16M4 17h16M12 3v18",
];

export default async function ApercuLandingPage({ searchParams }: PageProps) {
  const langue = await resoudreLangue(searchParams);
  const t = contenuLanding(langue);
  const colonnes = colonnesDeTarif(t);
  const partages = avantagesPartages();

  // Le titre porte son mot clé en couleur. On DÉCOUPE au lieu de
  // réécrire le titre en deux morceaux : le fragment doit rester une
  // partie de la phrase, sinon la traduction suivante le perdra.
  const [avant, apres] = t.titre.split(t.motCle);

  return (
    <main className="tql" lang={t.langue}>
      <style>{CSS}</style>

      {/* ── L'ACCROCHE, ET LA MAQUETTE ─────────────────────────── */}
      <section className="tql-sec tql-hero">
        <span aria-hidden className="tql-blob tql-blob-a" />
        <span aria-hidden className="tql-blob tql-blob-b" />
        <div className="tql-large tql-hero-grille">
          <div>
            <p className="tql-surtitre">{t.etiquette}</p>
            <h1 className="tql-h1">
              {avant}
              <span>{t.motCle}</span>
              {apres}
            </h1>
            <p className="tql-accroche">{t.accroche}</p>
            <div className="tql-boutons">
              <Link href={LIEN_GENERATEUR} className="tql-cta">
                {t.ctaPrincipal}
              </Link>
              <Link href={LIEN_INSCRIPTION} className="tql-cta-2">
                {t.ctaSecondaire}
              </Link>
            </div>
            <p className="tql-souscta">{t.sousCta}</p>
          </div>

          {/* La maquette : dessinée, pas photographiée. */}
          <div className="tql-maq" aria-hidden>
            <div className="tql-maq-barre">
              <span style={{ width: "34%" }} />
            </div>
            <p className="tql-maq-prog">{t.maquette.progression}</p>
            <p className="tql-maq-q">{t.maquette.question}</p>
            {t.maquette.reponses.map((r, i) => (
              <p
                key={r}
                className={i === t.maquette.choisie ? "tql-maq-r tql-maq-r-on" : "tql-maq-r"}
              >
                <span className="tql-maq-puce" />
                {r}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── LE PROBLÈME, ET LE CHIFFRE ─────────────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-deux">
          <div>
            <h2 className="tql-h2 tql-h2-gauche">{t.problemeTitre}</h2>
            {t.problemeCorps.map((p) => (
              <p key={p} className="tql-p tql-p-gauche">
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
      </section>

      {/* ── LES 4 ÉTAPES ───────────────────────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">{t.mecaniqueTitre}</h2>
          <div className="tql-grille-4">
            {t.etapes.map((e, i) => (
              <div key={e.titre} className="tql-carte">
                <span className="tql-num">{i + 1}</span>
                <h3 className="tql-h3">{e.titre}</h3>
                <p className="tql-corps">{e.corps}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LE FUNNEL : CHACUN VERS SON OFFRE ──────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">
            {t.funnelTitre} <span>{t.funnelMotCle}</span>.
          </h2>
          <p className="tql-p">{t.funnelCorps}</p>
          <div className="tql-grille-3">
            {t.funnelProfils.map((p) => (
              <div key={p.tag} className="tql-carte tql-carte-flux">
                <p className="tql-cite">{p.reponse}</p>
                <span aria-hidden className="tql-fleche">
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path
                      d="M12 4v15m0 0l-6-6m6 6l6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
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

      {/* ── LE TAG SYSTEME.IO ──────────────────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">{t.sioTitre}</h2>
          {t.sioCorps.map((p) => (
            <p key={p} className="tql-p">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* ── OÙ VIT TON QUIZ ────────────────────────────────────── */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large">
          <h2 className="tql-h2">{t.ouTitre}</h2>
          <p className="tql-p">{t.ouCorps}</p>
          <div className="tql-grille-5">
            {t.ouListe.map((item, i) => (
              <div key={item} className="tql-carte tql-carte-picto">
                <span aria-hidden className="tql-picto">
                  <svg viewBox="0 0 24 24" width="26" height="26">
                    <path
                      d={PICTOS[i % PICTOS.length]}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p className="tql-corps">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LES TARIFS ─────────────────────────────────────────── */}
      <section className="tql-sec">
        <div className="tql-large">
          <h2 className="tql-h2">{t.prixTitre}</h2>
          <p className="tql-p">{t.prixNote}</p>

          {/* TROIS COLONNES, PAS CINQ. Le mensuel et l'annuel d'un même
              palier ne sont pas deux offres : c'est la même chose payée
              autrement. Cinq cartes obligeaient à relire quatre fois les
              mêmes lignes pour trouver ce qui change. */}
          <div className="tql-grille-3">
            {colonnes.map((c, i) => (
              <div key={c.nom} className={i === 1 ? "tql-carte tql-carte-mise" : "tql-carte"}>
                <p className="tql-palier">{c.nom}</p>
                <p className="tql-prix">{c.prix}</p>
                <p className="tql-cadence">{c.cadence}</p>
                {c.prixAn ? <p className="tql-cadence tql-cadence-an">{c.prixAn}</p> : null}
                <ul className="tql-liste">
                  {c.lignes.map((ligne) => (
                    <li key={ligne}>
                      <Coche />
                      <span>{ligne}</span>
                    </li>
                  ))}
                </ul>
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
                  <Coche />
                  <span>{ligne}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── LA FAQ, EN `<details>` NATIF ───────────────────────── */}
      {/* Zéro JavaScript : c'est un script qui a figé la FAQ de la page
          de vente le 2 septembre. Un bloc qui n'a besoin de rien ne peut
          pas se casser quand on retire quelque chose, il s'ouvre au
          clavier, et Ctrl+F ouvre le bon panneau. */}
      <section className="tql-sec tql-blanc">
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">{t.faqTitre}</h2>
          {t.faq.map((f) => (
            <details key={f.q} className="tql-faq">
              <summary>
                {f.q}
                <span aria-hidden className="tql-chev">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      d="M6 9l6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </summary>
              <p>{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── LA SORTIE ──────────────────────────────────────────── */}
      <section className="tql-sec tql-fin">
        <span aria-hidden className="tql-blob tql-blob-c" />
        <div className="tql-large tql-lire-bloc">
          <h2 className="tql-h2">{t.finTitre}</h2>
          <p className="tql-p">{t.finCorps}</p>
          <div className="tql-boutons tql-boutons-centre">
            <Link href={LIEN_GENERATEUR} className="tql-cta">
              {t.ctaPrincipal}
            </Link>
            <Link href={LIEN_INSCRIPTION} className="tql-cta-2">
              {t.ctaSecondaire}
            </Link>
          </div>
          <p className="tql-souscta tql-souscta-centre">{t.sousCta}</p>
        </div>
      </section>
    </main>
  );
}

/** La coche des listes, en TRACÉ. Voir l'en-tête : pas d'Unicode. */
function Coche() {
  return (
    <span aria-hidden className="tql-coche">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path
          d="M4 12.5l5.5 5.5L20 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ── LE SYSTÈME VISUEL, RELEVÉ DANS SA PAGE ─────────────────────── */
const CSS = `

/* LA PALETTE N'EST PAS RECOPIÉE ICI : elle vient des jetons du site
   (globals.css, .tq-site), qui portent depuis le 4 septembre les
   couleurs de la page de vente. Deux copies d'une même palette
   divergent toujours, et la divergence se verrait entre l'en-tête et
   le haut de cette page. La fonte vient du même endroit. */
.tql{--e:var(--tq-encre);--c:var(--tq-encre-douce);--b:var(--tq-bleu);--cy:var(--tq-cyan);
  --pale:var(--tq-creme);--pill:var(--tq-panneau);color:var(--e);background:var(--pale)}
.tql *{box-sizing:border-box}
.tql-sec{position:relative;overflow:hidden;padding:100px 20px;background:var(--pale)}
.tql-blanc{background:#fff}
.tql-large{position:relative;width:100%;max-width:1120px;margin:0 auto}

/* Les flous décoratifs : ils ne portent AUCUN texte, donc ils ne
   tombent pas sous la règle du 31 août. */
.tql-blob{position:absolute;border-radius:999px;filter:blur(70px);opacity:.55;pointer-events:none}
.tql-blob-a{width:340px;height:340px;background:#9BB4FF;top:-90px;right:-70px}
.tql-blob-b{width:260px;height:260px;background:#8FE3F7;bottom:-120px;left:-90px}
.tql-blob-c{width:420px;height:300px;background:#A9BEFF;top:-140px;left:50%;transform:translateX(-50%)}

/* IL N'Y A PLUS DE COUTURE AVEC LA COQUILLE DU SITE : depuis le
   4 septembre l'en-tête et le pied de page portent la MÊME palette,
   celle de la page de vente. Béné : "je préfère que tu alignes le blog
   sur ma belle page de vente que l'inverse." */
.tql-hero{padding-top:76px}
.tql-hero-grille{display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:center}
.tql-surtitre{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--b);margin:0 0 14px}
.tql-h1{font-size:46px;line-height:1.14;font-weight:800;margin:0 0 20px;letter-spacing:-.015em}
.tql-h1 span{color:var(--cy)}
.tql-accroche{font-size:18px;line-height:1.62;color:var(--c);margin:0 0 30px;max-width:560px}
.tql-boutons{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.tql-boutons-centre{justify-content:center}
.tql-cta{display:inline-block;background:var(--b);color:#fff;font-weight:700;font-size:18px;padding:13px 30px;border-radius:999px;
  box-shadow:0 9px 24px rgba(90,110,246,.435);animation:tqlPulse 1.4s ease-in-out infinite}
.tql-cta-2{display:inline-block;background:#fff;color:var(--e);font-weight:700;font-size:17px;padding:12px 26px;border-radius:999px;
  border:1px solid #D8DEEE}
.tql-cta-2:hover{border-color:var(--b);color:var(--b)}
.tql-souscta{font-size:14px;color:#6B7291;margin:16px 0 0}
.tql-souscta-centre{text-align:center}

@keyframes tqlPulse{
  0%{transform:scale(1);box-shadow:0 4px 14px rgba(90,110,246,.28),0 0 0 0 rgba(32,187,230,0)}
  30%{transform:scale(1.04);box-shadow:0 10px 30px rgba(90,110,246,.45),0 0 0 6px rgba(32,187,230,.12)}
  60%{transform:scale(1.015);box-shadow:0 7px 22px rgba(90,110,246,.35),0 0 0 14px rgba(32,187,230,0)}
  100%{transform:scale(1);box-shadow:0 4px 14px rgba(90,110,246,.28),0 0 0 0 rgba(32,187,230,0)}
}
@media (prefers-reduced-motion:reduce){.tql-cta{animation:none}}

/* LA MAQUETTE, dessinée. */
.tql-maq{background:#fff;border-radius:22px;padding:28px 26px 24px;box-shadow:0 18px 50px rgba(35,40,80,.13)}
.tql-maq-barre{height:6px;border-radius:999px;background:var(--pill);overflow:hidden}
.tql-maq-barre span{display:block;height:100%;border-radius:999px;background:var(--cy)}
.tql-maq-prog{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8A90AE;margin:12px 0 14px}
.tql-maq-q{font-size:20px;font-weight:700;line-height:1.35;margin:0 0 18px}
.tql-maq-r{display:flex;align-items:center;gap:11px;font-size:15px;line-height:1.45;color:var(--c);
  border:1px solid #E4E8F3;border-radius:14px;padding:13px 15px;margin:0 0 10px;background:#fff}
.tql-maq-puce{flex:none;width:16px;height:16px;border-radius:999px;border:2px solid #C9D0E6}
.tql-maq-r-on{border-color:var(--b);background:#F5F7FF;color:var(--e);font-weight:600}
.tql-maq-r-on .tql-maq-puce{border-color:var(--b);background:var(--b);box-shadow:inset 0 0 0 3px #fff}

/* TITRES ET CORPS */
.tql-h2{font-size:38px;line-height:1.2;font-weight:700;margin:0 0 16px;text-align:center;letter-spacing:-.01em}
.tql-h2 span{color:var(--cy)}
.tql-h2-gauche{text-align:left}
.tql-p{font-size:17px;line-height:1.65;color:var(--c);max-width:720px;margin:0 auto 20px;text-align:center}
.tql-p-gauche{text-align:left;margin-left:0}
.tql-lire-bloc{max-width:820px}
.tql-h3{font-size:19px;font-weight:700;line-height:1.35;margin:0 0 8px}
.tql-corps{font-size:15px;line-height:1.6;color:var(--c);margin:0}
.tql-legende{font-size:14px;color:#6B7291;text-align:center;margin:26px 0 0}

/* CARTES ET GRILLES */
.tql-carte{background:#fff;border-radius:18px;padding:26px 24px;box-shadow:0 10px 30px rgba(35,40,80,.08)}
.tql-deux{display:grid;grid-template-columns:1.35fr 1fr;gap:44px;align-items:start}
.tql-grille-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:stretch;margin-top:40px}
.tql-grille-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin-top:40px}
.tql-grille-5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin-top:40px}
.tql-num{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;
  background:var(--b);color:#fff;font-weight:800;font-size:15px;margin-bottom:14px}

.tql-chiffre-carte{text-align:center}
.tql-chiffre{font-size:64px;line-height:1;font-weight:800;color:var(--b);margin:0 0 14px;letter-spacing:-.03em}
.tql-chiffre-leg{font-size:16px;line-height:1.55;color:var(--e);font-weight:600;margin:0 0 14px}
.tql-chiffre-src{font-size:13px;line-height:1.55;color:#6B7291;margin:0}

.tql-carte-flux{display:flex;flex-direction:column}
.tql-cite{font-size:15px;line-height:1.5;color:var(--c);font-style:italic;margin:0 0 14px;padding:12px 14px;
  background:var(--pale);border-radius:12px;min-height:70px;display:flex;align-items:center}
.tql-fleche{display:block;text-align:center;color:var(--cy);margin:0 0 12px}
.tql-bouton-faux{display:block;text-align:center;background:var(--b);color:#fff;font-weight:700;font-size:15px;
  padding:12px 16px;border-radius:12px;margin:auto 0 12px}
.tql-tag{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--e);
  background:var(--pill);border-radius:999px;padding:6px 12px;align-self:flex-start}
.tql-tag b{color:var(--b);font-weight:700}

.tql-carte-picto{text-align:center;padding:24px 18px}
.tql-picto{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:999px;
  background:var(--pale);color:var(--b);margin-bottom:14px}

/* TARIFS */
.tql-palier{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--b);margin:0 0 10px}
.tql-prix{font-size:40px;font-weight:800;line-height:1;margin:0 0 6px;letter-spacing:-.02em}
.tql-cadence{font-size:14px;color:#6B7291;margin:0}
.tql-cadence-an{margin-top:2px}
.tql-carte-mise{box-shadow:0 16px 44px rgba(90,110,246,.22);border:2px solid var(--b)}
.tql-liste{list-style:none;margin:20px 0 0;padding:20px 0 0;border-top:1px solid #E9ECF6}
.tql-liste li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.55;color:var(--c);margin:0 0 10px}
.tql-liste li:last-child{margin:0}
.tql-coche{flex:none;color:var(--cy);margin-top:1px}
.tql-partage{margin-top:26px}
.tql-partage .tql-h3{text-align:center;margin-bottom:4px}
.tql-liste-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 26px}

/* FAQ */
.tql-faq{border-bottom:1px solid #E9ECF6;padding:0}
.tql-faq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;
  font-size:17px;font-weight:700;padding:20px 0;color:var(--e)}
.tql-faq summary::-webkit-details-marker{display:none}
.tql-chev{flex:none;color:var(--b);transition:transform .15s ease}
.tql-faq[open] .tql-chev{transform:rotate(180deg)}
.tql-faq p{font-size:16px;line-height:1.65;color:var(--c);margin:0 0 20px}

.tql-fin{text-align:center}
.tql-fin .tql-p{margin-bottom:30px}

@media (max-width:1000px){
  .tql-grille-5{grid-template-columns:repeat(3,minmax(0,1fr))}
  .tql-grille-4{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:900px){
  .tql-sec{padding:60px 16px}
  .tql-hero{padding-top:44px}
  .tql-hero-grille,.tql-deux{grid-template-columns:1fr;gap:34px}
  .tql-h1{font-size:32px}
  .tql-h2{font-size:29px}
  .tql-accroche{font-size:17px}
  .tql-grille-3,.tql-grille-5{grid-template-columns:1fr;gap:16px}
  .tql-liste-3{grid-template-columns:1fr}
  .tql-cite{min-height:0}
  .tql-bouton-faux{margin-top:0}
}
`;
