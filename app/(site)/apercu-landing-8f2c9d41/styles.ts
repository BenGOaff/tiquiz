// app/(site)/apercu-landing-8f2c9d41/styles.ts
//
// LE SYSTÈME VISUEL DE LA LANDING, RELEVÉ DANS SA PAGE DE VENTE.
//
// Béné, 4 septembre 2026 : "on est à peine à 20 % de ce que je veux.
// Rapproche-toi beaucoup plus de ma page d'origine."
//
// Ce fichier est le résultat d'une LECTURE de sa page servie dans un
// navigateur, section par section, pas d'une lecture de son CSS. Ce qui
// manquait au premier jet, et que la capture montre :
//
//   1. le SURLIGNEUR pâle derrière un fragment de titre, avec le trait
//      vertical de curseur au bout. C'est sa signature la plus visible ;
//   2. les SCINTILLES : une dispersion de points bleus et cyan au
//      dessus du bouton principal ;
//   3. la RASSURANCE sous chaque bouton ("Gratuit à vie", "Pas besoin
//      de CB"), avec une coche dessinée ;
//   4. le BANDEAU DÉFILANT de fonctionnalités ;
//   5. les pastilles "ÉTAPE n" en cyan, et des lignes qui ALTERNENT
//      texte / visuel ;
//   6. de vraies MAQUETTES de produit dans ces lignes ;
//   7. les cartes de tarif à RUBAN coloré, et l'interrupteur
//      mensuel / annuel avec sa pastille "2 mois offerts" ;
//   8. le BANDEAU DÉGRADÉ de fin, blanc sur bleu.
//
// -- SUR L'APLAT DE COULEUR SOUS DU TEXTE ----------------------------
//
// La règle du 31 août ("aucun aplat sous du texte, NULLE PART") a été
// écrite pour le BLOG et pour les pages qui se LISENT, après trois
// remontées sur des pavés bleus saturés portant du texte blanc.
//
// Deux endroits d'ici en portent quand même, et les deux sont SON geste
// sur SA page, relevés dedans :
//   - le surligneur du titre : une TEINTE pâle sous du texte à l'encre,
//     pas un pavé saturé sous du blanc ;
//   - le bandeau dégradé de fin, où rien ne se lit longtemps, comme le
//     pied de page du site.
// Ne pas les "corriger" au prochain passage : ils sont voulus, et la
// raison est ici.
//
// -- LES VALEURS SONT MESURÉES ---------------------------------------
//
// Fonte, palette, rayons, ombres et rythme viennent de `.tq-site`
// (globals.css), qui porte depuis le 4 septembre les couleurs de la
// page de vente. Ce fichier n'en recopie AUCUNE : il les lit.

export const CSS = `
.tql{--e:var(--tq-encre);--c:var(--tq-encre-douce);--b:var(--tq-bleu);--cy:var(--tq-cyan);
  --pale:var(--tq-creme);--pill:var(--tq-panneau);--bord:var(--tq-bord);
  color:var(--e);background:var(--pale)}
.tql *{box-sizing:border-box}
/* LE :not([class]) N'EST PAS COSMETIQUE, il repare deux bugs qu'elle a
   vus le 5 septembre : "texte fonce sur fond fonce : illisible" sur le
   bouton du haut de page, et "texte blanc sur bouton blanc" sur celui du
   bandeau de fin. UNE seule cause, et elle est arithmetique.
   La regle .tql a vaut 0,1,1 en specificite (une classe + un element) ;
   .tql-cta, .tql-col-cta et .tql-bande-cta valent 0,1,0. L'heritage
   gagnait donc sur TOUS les boutons de la page : l'encre sombre sur le
   bleu, le blanc sur le blanc du bandeau.
   Un lien NU herite du texte autour, c'est ce qu'on voulait ; un lien qui
   porte une classe a deja choisi sa couleur. INTERDIT : revenir a
   .tql a nu, et INTERDIT de poser un !important par dessus, qui
   masquerait la cause au lieu de la retirer.
   (Aucun accent grave dans ce commentaire : il vit DANS le litteral de
   gabarit, et un accent grave le terminerait. Troisieme fois.) */
.tql a:not([class]){color:inherit}

/* ── LE RYTHME ───────────────────────────────────────────────────── */
/* AU MOINS 100 PX EN HAUT ET EN BAS, SUR CHAQUE SECTION, Y COMPRIS EN
   MOBILE. Béné, 4 septembre 2026 : "un truc sur lequel toutes les IA se
   plantent : les paddings hauts et bas. Je veux au moins 100px en haut
   et 100px en bas pour chaque section sauf le hero si pas adapté."
   Mesuré avant : le hero était à 72/84, la FAQ à 70/70, le bandeau de
   fin à 96/96, et TOUT tombait à 60 en dessous de 900 px.
   "tests/visual/landing-paddings.spec.ts" MESURE les valeurs calculées :
   un "padding" raboté par un futur passage le fait rougir. */
.tql-sec{position:relative;overflow:hidden;padding:100px 20px;background:var(--pale)}
.tql-blanc{background:#fff}

.tql-large{position:relative;width:100%;max-width:1120px;margin:0 auto}
.tql-lire-bloc{max-width:840px}

/* Les flous décoratifs : aucun texte dessus, donc hors de la règle du
   31 août. Ils portent la profondeur que sa page a et que la mienne
   n'avait pas. */
.tql-blob{position:absolute;border-radius:999px;filter:blur(80px);opacity:.5;pointer-events:none}
.tql-blob-a{width:380px;height:380px;background:#9BB4FF;top:-120px;right:-90px}
.tql-blob-b{width:280px;height:280px;background:#8FE3F7;bottom:-140px;left:-110px}
.tql-blob-c{width:460px;height:320px;background:#A9BEFF;top:-160px;left:50%;transform:translateX(-50%)}

/* ── TITRES, ET LE SURLIGNEUR ────────────────────────────────────── */
.tql-surtitre{font-size:13px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  color:var(--b);margin:0 0 14px}
.tql-surtitre-c{text-align:center}
.tql-h1{font-size:46px;line-height:1.14;font-weight:800;margin:0 0 22px;letter-spacing:-.02em;
  text-wrap:balance}
.tql-h2{font-size:38px;line-height:1.2;font-weight:700;margin:0 0 16px;text-align:center;letter-spacing:-.012em}
.tql-h2-g{text-align:left}
.tql-h3{font-size:19px;font-weight:700;line-height:1.35;margin:0 0 8px}

/* SON SURLIGNEUR : une teinte pâle derrière le fragment, et le trait
   vertical de curseur au bout, comme si le titre venait d'être tapé.
   Le "box-decoration-break" garde la teinte propre quand le fragment
   passe sur deux lignes : sans lui, la deuxième ligne perd son fond. */
.tql-surb{color:var(--cy);position:relative;padding:0 .12em;
  background:linear-gradient(180deg,rgba(32,187,230,.14) 0%,rgba(90,110,246,.13) 100%);
  border-radius:6px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.tql-curseur{display:inline-block;width:3px;height:.95em;margin-left:.12em;border-radius:2px;
  background:var(--b);vertical-align:-.08em;animation:tqlClign 1.1s step-end infinite}
@keyframes tqlClign{0%,100%{opacity:1}50%{opacity:.15}}

.tql-accroche{font-size:19px;line-height:1.6;color:var(--c);margin:0 0 30px;max-width:560px}
.tql-p{font-size:17px;line-height:1.65;color:var(--c);max-width:720px;margin:0 auto 20px;text-align:center}
.tql-p-g{text-align:left;margin-left:0}
.tql-corps{font-size:15px;line-height:1.6;color:var(--c);margin:0}
.tql-legende{font-size:14px;color:#6B7291;text-align:center;margin:26px 0 0}

/* LE BOUTON DE FIN DE SECTION, ET SA RASSURANCE.
   Sa page en pose un apres presque chaque section. La landing n'en
   avait que trois en tout, donc il fallait scroller jusqu'aux tarifs
   pour trouver un bouton. */
.tql-mid{text-align:center;margin:52px auto 0}
.tql-mid-r{display:flex;justify-content:center;align-items:center;gap:8px;
  margin:16px 0 0;font-size:14px;color:#6B7291}

/* CE QUI CHANGE APRES : les quatre lignes viennent de son persona. */
.tql-apres{list-style:none;padding:0;margin:34px auto 0;max-width:860px;
  display:grid;gap:16px}
.tql-apres li{display:flex;align-items:flex-start;gap:14px;
  font-size:17px;line-height:1.6;color:#3B3B3B;text-align:left}
.tql-apres li svg{flex:0 0 auto;margin-top:4px}

/* LES QUINZE TEMOIGNAGES DE SA PAGE.
   Colonnes en macon (CSS multi-colonnes) et pas une grille : les
   temoignages n'ont pas la meme longueur, et une grille alignerait
   toutes les cartes sur la plus haute, donc du vide sous les courtes. */
.tql-temoins{margin:44px 0 0;columns:3;column-gap:22px}
.tql-temoin{break-inside:avoid;margin:0 0 22px;padding:24px;
  background:#fff;border:1px solid #E4E8F3;border-radius:16px;
  box-shadow:0 2px 10px rgba(43,50,100,.05)}
.tql-temoin blockquote{margin:0;font-size:15px;line-height:1.65;color:#3B3B3B}
.tql-temoin figcaption{margin:14px 0 0;font-size:14px;color:#6B7291}
.tql-temoin figcaption b{color:#2B3264}
.tql-temoin figcaption span::before{content:", "}

/* ── BOUTONS, SCINTILLES, RASSURANCE ─────────────────────────────── */
.tql-boutons{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.tql-centre{justify-content:center;text-align:center}
.tql-cta{display:inline-flex;align-items:center;gap:9px;background:var(--b);color:#fff;font-weight:700;
  font-size:18px;padding:14px 30px;border-radius:999px;box-shadow:0 9px 24px rgba(90,110,246,.435);
  animation:tqlPulse 1.4s ease-in-out infinite}
.tql-cta-2{display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--e);font-weight:700;
  font-size:17px;padding:13px 26px;border-radius:999px;border:1px solid #D8DEEE}
.tql-cta-2:hover{border-color:var(--b);color:var(--b)}
.tql-fleche-b{display:inline-flex;margin-top:1px}

/* L'animation du bouton, recopiée à l'identique de sa page de vente. */
@keyframes tqlPulse{
  0%{transform:scale(1);box-shadow:0 4px 14px rgba(90,110,246,.28),0 0 0 0 rgba(32,187,230,0)}
  30%{transform:scale(1.04);box-shadow:0 10px 30px rgba(90,110,246,.45),0 0 0 6px rgba(32,187,230,.12)}
  60%{transform:scale(1.015);box-shadow:0 7px 22px rgba(90,110,246,.35),0 0 0 14px rgba(32,187,230,0)}
  100%{transform:scale(1);box-shadow:0 4px 14px rgba(90,110,246,.28),0 0 0 0 rgba(32,187,230,0)}
}
@media (prefers-reduced-motion:reduce){
  .tql-cta{animation:none}.tql-curseur{animation:none}.tql-ruban-piste{animation:none}
}

.tql-avec-scint{position:relative;display:inline-block}
.tql-scint{position:absolute;left:-52px;right:-52px;top:-58px;height:62px;pointer-events:none}
.tql-pt{position:absolute;border-radius:999px}
.tql-pt-b{background:var(--b);opacity:.5}
.tql-pt-c{background:var(--cy);opacity:.65}

.tql-rassure{display:flex;flex-wrap:wrap;gap:6px 20px;margin:18px 0 0;padding:0;list-style:none}
.tql-rassure li{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:#6B7291}
.tql-coche-fine{display:inline-flex;color:var(--cy)}

/* ── LA BARRE DE PREUVE TRUSTPILOT ───────────────────────────────── */
.tql-preuve{display:inline-flex;align-items:center;gap:12px;margin:26px 0 0;padding:10px 18px;
  background:#fff;border:1px solid var(--bord);border-radius:999px;box-shadow:0 6px 18px rgba(35,40,80,.07)}
.tql-preuve-t{font-size:14px;font-weight:700}
.tql-preuve .tql-coche{color:var(--b);flex:none}
/* A QUI CA S'ADRESSE, sous l'accroche. Un visiteur doit savoir en dix
   secondes si la page parle de lui : c'est la premiere des quatre
   questions du haut de page. */
.tql-pourqui{font-size:15px;line-height:1.6;color:var(--c);margin:0 0 38px;font-weight:600}

/* ── LE HAUT DE PAGE ─────────────────────────────────────────────── */
/* LE HERO EST LA SEULE EXCEPTION ADMISE (Béné : "sauf le hero si pas
   adapté"), et il n'en profite pas : 100 en haut sous l'en-tête collant,
   110 en bas pour que la maquette respire avant le bandeau. */
.tql-hero{padding-top:100px;padding-bottom:110px}
.tql-hero-grille{display:grid;grid-template-columns:1.12fr .88fr;gap:52px;align-items:center}

/* ── LA MAQUETTE ─────────────────────────────────────────────────── */
.tql-maq{background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(35,40,80,.16);overflow:hidden}
.tql-maq-tete{display:flex;align-items:center;gap:6px;padding:12px 16px;background:#F7F9FE;
  border-bottom:1px solid var(--bord)}
.tql-maq-pt{width:9px;height:9px;border-radius:999px;background:#D5DCEC}
.tql-maq-url{margin-left:12px;font-size:12px;color:#8A90AE;font-weight:600}
.tql-maq-corps{padding:26px 26px 24px}
.tql-maq-barre{height:6px;border-radius:999px;background:var(--pill);overflow:hidden}
.tql-maq-barre span{display:block;height:100%;border-radius:999px;
  background:linear-gradient(90deg,var(--cy),var(--b))}
.tql-maq-prog{font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  color:#8A90AE;margin:12px 0 14px}
.tql-maq-q{font-size:20px;font-weight:700;line-height:1.35;margin:0 0 18px}
.tql-maq-r{display:flex;align-items:center;gap:11px;font-size:15px;line-height:1.45;color:var(--c);
  border:1px solid #E4E8F3;border-radius:14px;padding:13px 15px;margin:0 0 10px;background:#fff}
.tql-maq-puce{flex:none;width:16px;height:16px;border-radius:999px;border:2px solid #C9D0E6}
.tql-maq-r-on{border-color:var(--b);background:#F5F7FF;color:var(--e);font-weight:600}
.tql-maq-r-on .tql-maq-puce{border-color:var(--b);background:var(--b);box-shadow:inset 0 0 0 3px #fff}

/* LE BRIEF DESSINÉ */
.tql-brief-champ{border:1px solid #E4E8F3;border-radius:12px;padding:11px 14px;margin:0 0 10px}
.tql-brief-lab{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  color:#8A90AE;margin:0 0 4px}
.tql-brief-val{font-size:15px;font-weight:600;color:var(--e);margin:0}
.tql-brief-b{display:block;text-align:center;background:var(--b);color:#fff;font-weight:700;font-size:15px;
  padding:12px 16px;border-radius:12px;margin:16px 0 0}

/* ── LE BANDEAU DÉFILANT ─────────────────────────────────────────── */
.tql-ruban{border-top:1px solid var(--bord);border-bottom:1px solid var(--bord);background:#fff;
  padding:16px 0;overflow:hidden;position:relative}
.tql-ruban::before,.tql-ruban::after{content:"";position:absolute;top:0;bottom:0;width:90px;z-index:2}
.tql-ruban::before{left:0;background:linear-gradient(90deg,#fff,rgba(255,255,255,0))}
.tql-ruban::after{right:0;background:linear-gradient(270deg,#fff,rgba(255,255,255,0))}
.tql-ruban-piste{display:flex;width:max-content;animation:tqlDefile 34s linear infinite}
.tql-ruban-lot{display:flex;flex:none}
.tql-ruban-lot span{display:flex;align-items:center;gap:12px;padding:0 26px;font-size:14px;
  font-weight:700;color:#6B7291;white-space:nowrap}
.tql-ruban-lot span::after{content:"";width:5px;height:5px;border-radius:999px;background:var(--cy)}
@keyframes tqlDefile{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ── CARTES ET GRILLES ───────────────────────────────────────────── */
.tql-carte{background:#fff;border-radius:18px;padding:26px 24px;box-shadow:0 10px 30px rgba(35,40,80,.08)}
.tql-deux{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:center}
.tql-grille-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:stretch;margin-top:40px}
.tql-grille-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:32px}
.tql-bento{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:40px}
.tql-bento .tql-carte{padding:24px 22px}
.tql-picto{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;
  border-radius:12px;background:var(--pale);color:var(--b);margin-bottom:14px}

/* ── LES ÉTAPES, EN LIGNES QUI ALTERNENT ─────────────────────────── */
.tql-etape{display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:center;margin-top:64px}
.tql-etape:nth-child(even) .tql-etape-txt{order:2}
.tql-pastille-etape{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;color:#fff;background:var(--cy);border-radius:999px;padding:5px 12px;margin-bottom:14px}
.tql-etape-txt h3{font-size:26px;line-height:1.25;font-weight:700;margin:0 0 12px}
.tql-etape-txt p{font-size:16px;line-height:1.65;color:var(--c);margin:0}

/* ── LE CHIFFRE ──────────────────────────────────────────────────── */
.tql-chiffre-carte{text-align:center}
.tql-chiffre{font-size:68px;line-height:1;font-weight:800;margin:0 0 14px;letter-spacing:-.03em;
  background:linear-gradient(135deg,var(--b),var(--cy));-webkit-background-clip:text;
  background-clip:text;color:transparent}
.tql-chiffre-leg{font-size:16px;line-height:1.55;color:var(--e);font-weight:600;margin:0 0 14px}
.tql-chiffre-src{font-size:13px;line-height:1.55;color:#6B7291;margin:0}

/* ── LE FUNNEL ───────────────────────────────────────────────────── */
.tql-carte-flux{display:flex;flex-direction:column}
.tql-cite{font-size:15px;line-height:1.5;color:var(--c);font-style:italic;margin:0 0 14px;padding:12px 14px;
  background:var(--pale);border-radius:12px;min-height:70px;display:flex;align-items:center}
.tql-fleche-bas{display:block;text-align:center;color:var(--cy);margin:0 0 12px}
.tql-bouton-faux{display:block;text-align:center;background:var(--b);color:#fff;font-weight:700;font-size:15px;
  padding:12px 16px;border-radius:12px;margin:auto 0 12px}
.tql-tag{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--e);
  background:var(--pill);border-radius:999px;padding:6px 12px;align-self:flex-start}
.tql-tag b{color:var(--b);font-weight:700}

/* ── LE LIEN ET LE CODE ──────────────────────────────────────────── */
.tql-champ{display:flex;align-items:center;gap:10px;margin-top:16px;padding:10px 12px;
  background:var(--pale);border:1px solid var(--bord);border-radius:12px}
.tql-champ-url{flex:1;font-size:13px;color:#6B7291;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tql-champ-b{flex:none;font-size:12px;font-weight:700;color:#fff;background:var(--b);border-radius:8px;padding:6px 12px}
.tql-code{margin:16px 0 0;padding:16px 18px;background:#1D2450;color:#C9D6FF;border-radius:12px;
  font-size:12.5px;line-height:1.6;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  overflow-x:auto;white-space:pre}

/* ── LES AVIS ────────────────────────────────────────────────────── */
/* ── LES OBJECTIONS ─────────────────────────────────────────────── */
/* Elles remplacent les six avis. UNE COLONNE, pas une grille : on les
   lit dans l'ordre, et chacune doit se lire en entier avant la
   suivante. Une grille en ferait un mur qu'on survole. */
.tql-objs{display:flex;flex-direction:column;gap:14px;margin-top:30px}
.tql-obj{display:flex;flex-direction:column;gap:8px}
/* LA QUESTION EST EN ITALIQUE : c'est la voix du LECTEUR, pas la
   notre. Sans cette difference, les deux paragraphes se lisent comme un
   seul bloc de notre argumentaire, et le bloc perd tout son interet.
   PAS DE GUILLEMETS EN PSEUDO-ELEMENT : ils seraient les memes dans les
   sept langues, alors que le francais ecrit des chevrons et l'anglais
   des guillemets courbes. Le style suffit. */
.tql-obj-q{font-size:17px;font-style:italic;font-weight:700;line-height:1.4;margin:0;color:var(--e)}
.tql-obj-r{font-size:15.5px;line-height:1.65;color:var(--c);margin:0}

/* ── LES TARIFS ──────────────────────────────────────────────────── */
/* L'INTERRUPTEUR N'A AUCUN JAVASCRIPT : deux boutons radio et ":has()",
   la technique de son bloc "c'est pour toi" du 2 septembre. C'est un
   script qui avait figé la FAQ de sa page de vente ce jour là ; un bloc
   qui n'a besoin de rien ne peut pas se casser quand on retire
   quelque chose. */
.tql-tarifs input{position:absolute;opacity:0;pointer-events:none}
.tql-bascule{display:inline-flex;align-items:center;gap:6px;margin:0 auto 8px;padding:5px;
  background:#fff;border:1px solid var(--bord);border-radius:999px}
.tql-bascule label{cursor:pointer;font-size:14.5px;font-weight:700;color:#6B7291;padding:8px 18px;border-radius:999px}
.tql-tarifs:has(#tql-mois:checked) label[for="tql-mois"],
.tql-tarifs:has(#tql-an:checked) label[for="tql-an"]{background:var(--b);color:#fff}
.tql-eco{display:inline-flex;align-items:center;font-size:11.5px;font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;color:#fff;background:var(--cy);border-radius:999px;padding:5px 11px;margin-left:6px}
.tql-tarifs:has(#tql-an:checked) .tql-prix-mois,
.tql-tarifs:has(#tql-mois:checked) .tql-prix-an{display:none}

.tql-col{background:#fff;border-radius:18px;box-shadow:0 12px 34px rgba(35,40,80,.09);overflow:hidden;
  display:flex;flex-direction:column}
.tql-col-mise{box-shadow:0 20px 50px rgba(90,110,246,.24);border:2px solid var(--b)}
.tql-ruban-col{font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#fff;
  text-align:center;padding:9px 12px}
.tql-r1{background:var(--cy)}
.tql-r2{background:var(--b)}
.tql-r3{background:linear-gradient(90deg,var(--b),#7C4DFF)}
.tql-col-corps{padding:24px 22px 22px;display:flex;flex-direction:column;flex:1}
.tql-col-pour{font-size:13px;color:#8A90AE;margin:0 0 12px}
.tql-prix{font-size:42px;font-weight:800;line-height:1;margin:0;letter-spacing:-.025em;color:var(--b)}
.tql-cadence{font-size:13px;color:#8A90AE;margin:6px 0 0}
/* LA PHRASE QUI INTRODUIT UNE ANIMATION. Levee toute seule, une
   animation ne dit rien a qui la decouvre : sur SA page chacune vit
   sous un titre qui dit ce qu'on regarde. */
.tql-anim-leg{text-align:center;font-size:17px;font-weight:700;color:var(--e);margin:0 0 22px}
.tql-p-fort{font-weight:700;color:var(--e)}
.tql-liste{list-style:none;margin:18px 0 22px;padding:18px 0 0;border-top:1px solid #E9ECF6;flex:1}
.tql-liste li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.55;color:var(--c);margin:0 0 10px}
.tql-liste li:last-child{margin:0}
.tql-coche-pleine{flex:none;color:var(--b);margin-top:1px;display:inline-flex}
.tql-col-cta{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--b);color:#fff;
  font-weight:700;font-size:15.5px;padding:13px 18px;border-radius:999px}
.tql-col-cta:hover{background:var(--tq-bleu-fonce)}
/* ── LA PUCE PROMESSE ───────────────────────────────────────────── */
/* Le benefice en gras, sa consequence concrete dessous. Les deux
   viennent de avantages.ts : le bon de commande affiche exactement les
   memes lignes. */
.tql-liste li b{display:block;font-weight:700;color:var(--e)}
.tql-puce-detail{display:block;font-style:normal;font-size:13.5px;line-height:1.5;color:#7A8098;margin-top:3px}
/* "Tout le gratuit, plus :" au dessus des puces. L'echelle se DIT. */
.tql-inclus{font-size:13px;font-weight:700;color:var(--b);margin:18px 0 -8px;text-transform:uppercase;letter-spacing:.04em}

/* ── LA GRILLE COMPARATIVE ──────────────────────────────────────── */
/* Une vraie table, dans SA boite qui defile : la page ne defile jamais
   laterallement. */
.tql-comp-titre{text-align:center;margin:70px 0 10px;font-size:24px}
.tql-comp-boite{overflow-x:auto;margin-top:26px;border:1px solid var(--bord);border-radius:18px;background:#fff}
.tql-comp{width:100%;border-collapse:collapse;min-width:640px;font-size:14.5px}
.tql-comp th,.tql-comp td{padding:13px 16px;text-align:left;border-bottom:1px solid #EEF1F8}
.tql-comp thead th{font-size:15px;font-weight:800;color:var(--e);background:var(--pill);white-space:nowrap}
.tql-comp thead th:first-child{width:46%}
.tql-comp tbody th{font-weight:500;color:var(--c);line-height:1.45}
.tql-comp td{text-align:center;width:18%}
.tql-comp-groupe th{font-size:12.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
  color:var(--b);background:var(--pale);padding-top:16px;padding-bottom:16px}
.tql-comp tbody tr:last-child th,.tql-comp tbody tr:last-child td{border-bottom:0}
/* UN TIRET, PAS UNE CASE VIDE : une case vide se lit "on a oublie". */
.tql-non{color:#B9BFD4;font-weight:700}

/* LES DEUX TABLEAUX D'ARGUMENTS.
   Ils reprennent la boite et les bordures de la grille de tarifs, mais
   leurs cellules portent des PHRASES : centrer et brider a 18 % comme
   une colonne de coches donnerait des lignes de trois mots. */
.tql-comp-txt td{text-align:left;width:auto;color:var(--c);line-height:1.5}
.tql-comp-txt thead th:first-child{width:26%}
.tql-comp-txt tbody th{font-weight:700;color:var(--e)}
/* La colonne qui nous concerne est TEINTEE, jamais un aplat sous du
   texte : c'est la regle du 31 aout.

   LES SELECTEURS SONT PREFIXES PAR LE TABLEAU, ET CE N'EST PAS
   DECORATIF : sans ce prefixe, la regle d'en tete du tableau (une
   classe, deux elements) bat la classe de colonne (une classe seule),
   donc la teinte sautait sur la ligne d'en tete et la colonne se
   lisait en deux morceaux. Exactement l'arithmetique du bug de boutons
   du 5 septembre.

   (Aucun accent grave dans ce commentaire : il vit DANS le litteral de
   gabarit, et un accent grave le terminerait. Quatrieme fois.) */
.tql-comp td.tql-col-nous,
.tql-comp thead th.tql-col-nous{background:#F1F5FE}
.tql-comp tbody tr.tql-lg-nous th,
.tql-comp tbody tr.tql-lg-nous td{background:#F1F5FE;font-weight:700;color:var(--e)}

/* CE QUI N'EST PAS POUR TOI. Une croix DESSINEE, pas un caractere. */
.tql-non-liste{list-style:none;padding:0;margin:30px 0 0;display:grid;gap:18px}
.tql-non-liste li{display:flex;align-items:flex-start;gap:14px;
  font-size:17px;line-height:1.6;color:#3B3B3B;text-align:left}
.tql-croix{flex:0 0 auto;margin-top:4px;color:#B9BFD4;display:inline-flex}
/* La phrase de fin est collee au dernier refus sans cette marge. */
.tql-non-liste+.tql-p{margin-top:30px}
.tql-val{font-weight:700;color:var(--e)}

/* ── LA DÉMO EN IFRAME ──────────────────────────────────────────── */
/* Le rapport 16/9 est tenu par le padding, pas par une hauteur figée :
   c'est ce qu'elle avait écrit elle même dans son bout de code. */
.tql-demo{position:relative;padding-bottom:56.25%;height:0;max-width:900px;margin:40px auto 0;
  border-radius:16px;overflow:hidden;box-shadow:0 20px 54px rgba(35,40,80,.16);background:#fff}
.tql-demo iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}

/* ── SES BLOCS ANIMÉS, LEVÉS DE SA PAGE ────────────────────────── */
/* On leur donne de la place et on ne touche à RIEN dedans : ils portent
   leur propre style, à l'octet près. */
.tql-anim{margin-top:56px}
.tql-anim>div{max-width:100%;overflow:hidden}

/* ── LA FAQ ──────────────────────────────────────────────────────── */
/* SEIZE QUESTIONS À LA FILE, C'EST UN MUR : le titre de groupe est ce
   qui permet de sauter directement à la sienne. */
.tql-faq-groupe{margin-top:34px}
.tql-faq-titre{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:var(--b);margin:0 0 4px}
.tql-faq{border-bottom:1px solid #E9ECF6}
.tql-faq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;
  list-style:none;font-size:17px;font-weight:700;padding:20px 0;color:var(--e)}
.tql-faq summary::-webkit-details-marker{display:none}
.tql-chev{flex:none;color:var(--b);transition:transform .15s ease}
.tql-faq[open] .tql-chev{transform:rotate(180deg)}
.tql-faq p{font-size:16px;line-height:1.65;color:var(--c);margin:0 0 20px}

/* ── LE BANDEAU DÉGRADÉ DE FIN ───────────────────────────────────── */
/* Le SEUL aplat de couleur sous du texte de la page, et c'est le sien :
   rien ne s'y lit longtemps, comme le pied de page du site. */
.tql-bande{background:linear-gradient(160deg,var(--b) 0%,#4A5FE8 55%,var(--cy) 130%);
  color:#fff;text-align:center;padding:100px 20px}
.tql-bande h2{font-size:40px;line-height:1.2;font-weight:800;margin:0 auto 18px;max-width:760px;letter-spacing:-.015em}
.tql-bande p{font-size:17.5px;line-height:1.6;margin:0 auto 32px;max-width:680px;color:rgba(255,255,255,.9)}
.tql-bande-cta{display:inline-flex;align-items:center;gap:9px;background:#fff;color:var(--b);font-weight:800;
  font-size:18px;padding:15px 32px;border-radius:999px;box-shadow:0 12px 30px rgba(13,20,60,.25)}
.tql-bande .tql-rassure{justify-content:center;margin-top:22px}
.tql-bande .tql-rassure li{color:rgba(255,255,255,.85)}
.tql-bande .tql-coche-fine{color:#fff}

/* ── LA PREUVE SOCIALE PRECOCE ───────────────────────────────────── */
/* Elle demande "immediatement des logos de clients, des notes ou des
   avatars". Ni logo (ils ne nous appartiennent pas) ni note moyenne
   (je ne l'ai pas relevee, et l'inventer est son interdit numero un) :
   trois temoignages nommes, en une bande sobre juste sous le bandeau.

   AUCUN APLAT SOUS DU TEXTE : fond de page, filet en haut de chaque
   citation, encre normale. Regle du 31 aout. */
/* 100px HAUT ET BAS, comme toute section : sa regle du 4 septembre
   ne fait aucune exception pour une bande courte. */
.tql-preuve-tot{padding-top:100px;padding-bottom:100px}
.tql-preuve-nb{margin:0 0 26px;text-align:center;font-weight:800;font-size:17px;color:var(--e)}
.tql-preuve-lignes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.tql-preuve-un{margin:0;padding:20px 0 0;border-top:3px solid var(--b)}
.tql-preuve-un blockquote{margin:0 0 10px;font-size:15px;line-height:1.6;color:var(--c)}
.tql-preuve-un figcaption{font-size:13.5px;font-weight:800;color:var(--e)}
.tql-preuve-un figcaption span{font-weight:600;color:var(--c)}

/* ── LES DEUX COLONNES TEXTE / VISUEL ────────────────────────────── */
/* Le geste de sa page : un bloc qui explique, un visuel qui montre. */
.tql-deux-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:56px;align-items:center}

/* Le flux de captures de leads, dessine. */
.tql-flux{display:grid;gap:10px}
.tql-flux-un{display:flex;align-items:center;gap:12px;margin:0;padding:13px 16px;
  background:#fff;border:1px solid var(--bord);border-radius:14px;
  box-shadow:0 6px 18px rgba(13,20,60,.05)}
.tql-flux-pt{width:9px;height:9px;border-radius:999px;background:var(--cy);flex:0 0 auto}
.tql-flux-nom{font-weight:700;font-size:14.5px;color:var(--e)}
.tql-flux-quand{margin-left:auto;font-size:12.5px;color:var(--c)}

/* Le sondage dessine : sa question, ses quatre reponses chiffrees. */
.tql-sondage{background:#fff;border:1px solid var(--bord);border-radius:18px;
  padding:24px;box-shadow:0 10px 30px rgba(13,20,60,.06)}
.tql-sondage-q{margin:0 0 18px;font-weight:800;font-size:16px;color:var(--e)}
.tql-sondage-l{display:grid;grid-template-columns:44px 1fr;grid-template-areas:"pct barre" ". txt";
  gap:4px 12px;margin:0 0 14px;align-items:center}
.tql-sondage-pct{grid-area:pct;font-weight:800;font-size:14px;color:var(--b)}
.tql-sondage-barre{grid-area:barre;height:9px;border-radius:999px;background:var(--pale);overflow:hidden}
.tql-sondage-barre span{display:block;height:100%;border-radius:999px;
  background:linear-gradient(90deg,var(--b),var(--cy))}
.tql-sondage-txt{grid-area:txt;font-size:13.5px;color:var(--c)}

/* Les puces a coche, quand la liste EST l'argument. */
.tql-puces{list-style:none;padding:0;margin:20px 0 24px;display:grid;gap:11px}
.tql-puces li{display:flex;align-items:flex-start;gap:11px;font-size:15.5px;
  line-height:1.5;color:var(--c)}
.tql-puces .tql-coche-pleine{flex:0 0 auto;margin-top:2px;color:var(--b)}

/* Le comparatif de SA page : sept lignes, une coche ou une croix. */
.tql-comp-oui td{text-align:center}
.tql-comp-oui tbody th{font-weight:700;color:var(--e);text-align:left}
.tql-comp-oui .tql-coche-pleine{color:var(--b)}
.tql-comp-oui .tql-croix{color:#C3C8DB}

/* ── LE LIEN VERS LA PAGE DETAILLEE ──────────────────────────────── */
/* Discret : il ne doit pas concurrencer le bouton juste au dessus, qui
   est le geste qu'on veut. Un lien de lecture, pas un deuxieme CTA. */
.tql-savoir{margin:18px 0 0;text-align:center}
/* SA PROPRE CLASSE, PAS un selecteur .tql-savoir suivi d'un a nu : un
   selecteur qui finit par un a nu vise TOUS les liens de ce bloc, boutons compris, et il les bat
   en specificite (1 classe + 1 element contre 1 classe seule). C'est
   exactement l'arithmetique du bug de boutons illisibles du 5 septembre,
   et le garde-fou l'a attrape avant qu'elle ne le voie. */
.tql-savoir-a{display:inline-flex;align-items:center;gap:7px;font-size:15px;
  font-weight:800;color:var(--b);text-decoration:none}
.tql-savoir-a:hover{text-decoration:underline}
.tql-savoir-a .tql-fleche-b{width:15px;height:15px}

/* ── MOBILE ──────────────────────────────────────────────────────── */
@media (max-width:1000px){
  .tql-bento,.tql-grille-3{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tql-temoins{columns:2}
}
@media (max-width:900px){
  /* Les marges LATÉRALES se resserrent, les VERTICALES ne bougent pas :
     c'est la règle du 4 septembre, et elle ne porte que sur le haut et
     le bas. */
  .tql-sec{padding:100px 16px}
  .tql-hero{padding-top:100px;padding-bottom:100px}
  .tql-bande{padding:100px 16px}
  .tql-hero-grille,.tql-deux,.tql-etape,.tql-grille-2,.tql-deux-col{grid-template-columns:1fr;gap:32px}
  .tql-preuve-lignes{grid-template-columns:1fr;gap:18px}
  /* La verticale ne bouge pas, meme sur cette bande plus courte. */
  .tql-preuve-tot{padding:100px 16px}
  .tql-etape{margin-top:44px}
  .tql-etape:nth-child(even) .tql-etape-txt{order:0}
  .tql-h1{font-size:33px}
  .tql-h2{font-size:28px}
  .tql-bande h2{font-size:28px}
  .tql-accroche{font-size:17px}
  .tql-grille-3,.tql-bento{grid-template-columns:1fr;gap:16px}
  .tql-comp-titre{font-size:21px;margin-top:56px}
  .tql-cite{min-height:0}
  .tql-bouton-faux{margin-top:0}
  .tql-etape-txt h3{font-size:22px}
  .tql-scint{display:none}
  /* Trois colonnes de temoignages sur un telephone donneraient des
     lignes de quatre mots. */
  .tql-temoins{columns:1}
}
"`;