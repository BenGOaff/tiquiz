// lib/site/apercuLandingV2.ts
//
// LA MAQUETTE DE BÉNÉ, DÉCOUPÉE POUR Y POSER LE VRAI GÉNÉRATEUR.
//
// Version du 19 septembre 2026, deuxième envoi : "Je te renvoie une
// landing page à jour, place bien notre quiz à nous à la place du truc
// du html de ce modèle. Mais applique bien le nouveau style il est cool."
//
// Ce qu'elle a corrigé entre les deux envois, et qui était le point que
// je lui avais signalé : la page porte maintenant **16 liens vers les
// pages `/fonctionnalites/<slug>`** (le premier envoi n'en avait aucun,
// compté). Ce sont celles qui commencent à ranker.
//
// -- SON HTML EST GARDÉ À L'OCTET PRÈS --------------------------------
//
// Découpé par script, jamais à la main. Le retranscrire en JSX, c'est
// 230 Ko de copie où chaque faute de frappe devient une différence
// qu'elle prendrait pour une décision de design.
//
// C'est un APERÇU, en `noindex`. Le jour où elle valide, ce style
// rejoint `components/landing/styles.ts` : une feuille de plus sur le
// domaine serait un troisième système visuel (sa règle du 4 septembre).
//
// -- CE QUI A CHANGÉ, ET RIEN D'AUTRE ---------------------------------
//
// 1. LA SECTION DE DÉMO EST RETIRÉE, ET REDESSINÉE EN JSX à l'identique
//    (son titre, son chapeau, sa vidéo, mot pour mot), avec le VRAI
//    générateur à la place du faux formulaire. Celui ci renvoyait sur
//    `/generateur-de-quiz` : on promettait "fais-en un, là, maintenant"
//    et on faisait changer de page.
//
//    Pourquoi la section entière et pas le seul formulaire : couper au
//    milieu laisserait des balises ouvertes des deux côtés du découpage
//    (voir HAUT).
//
// 2. LES IMAGES DEVIENNENT DES FICHIERS. Le logo était collé deux fois
//    en base64. Et ça coûte DOUBLE : un composant serveur sérialise son
//    contenu une fois en HTML et une fois dans la charge RSC.
//
// 3. LES SCRIPTS SORTENT. Un `<script>` posé par `innerHTML` ne
//    s'exécute JAMAIS : il serait là, inerte, et les blocs `.rv`
//    resteraient à `opacity:0`. Une page BLANCHE, que rien dans le code
//    ne laisse voir.

/** Sa feuille de style, telle qu'elle est arrivée. */
export const CSS_V2 = `:root{
  /* encre plus contrastée, relevée sur leur #14142B, teintée de ton bleu */
  --ink:#16193B; --ink-soft:#4E5478; --ink-faint:#858AA8;
  --primary:#5D6CDB; --primary-d:#4A57C4; --turq:#20BBE6;
  --bg:#FFFFFF; --panel:#F7F9FC; --soft:#EEF1FE; --soft-2:#DFE4FC;
  --line:#E9ECF4;
  --gold:#A8760A; --gold-bg:#FDF8EC; --gold-br:#F0E2BC;
  --ok:#0F7D62; --ok-bg:#E3F5EF;
  --grad:linear-gradient(135deg,#5D6CDB 0%,#20BBE6 100%);
  /* rayons relevés chez eux : 48 panneau, 24 carte, 999 pilule */
  --r-panel:48px; --r-card:24px; --r-sm:14px;
  /* une seule ombre douce, jamais de bordure */
  --sh:0 5px 24px rgba(65,67,78,.10);
  --sh-up:0 12px 40px rgba(65,67,78,.16);
  --sh-btn:0 4px 24px rgba(93,108,219,.28),0 2px 6px rgba(93,108,219,.10);
  --glow:drop-shadow(0 0 26px rgba(33,79,207,.30));
  /* échelle verticale : 96 / 144 comme chez eux */
  --gut:48px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);
  color:var(--ink);font-size:18px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img,svg{max-width:100%;display:block}
a{color:inherit}

/* ═══ grille ═══ */
.wrap{width:100%;max-width:1236px;margin:0 auto;padding:0 var(--gut)}
.col,.colc{max-width:760px}
.colc{margin-left:auto;margin-right:auto}
section{padding:clamp(72px,9vw,144px) 0}

/* ═══ le panneau arrondi, leur signature ═══ */
.alt{padding:clamp(10px,2vw,24px) 0}
.alt>.wrap{max-width:1300px;background:var(--panel);border-radius:var(--r-panel);
  padding:clamp(56px,7vw,112px) clamp(24px,5vw,72px)}
.dark{padding:clamp(10px,2vw,24px) 0}
.dark>.wrap{max-width:1300px;border-radius:var(--r-panel);color:#fff;
  padding:clamp(56px,7vw,112px) clamp(24px,5vw,72px);
  background:linear-gradient(155deg,#1A2050 0%,#2B3572 55%,#1D4A72 100%)}

/* ═══ typographie, échelle et approche relevées chez eux ═══ */
h1,h2,h3{font-family:Figtree,Inter,system-ui,sans-serif;font-weight:700;
  letter-spacing:-.04em;line-height:1.14;text-wrap:balance;color:var(--ink)}
h1{font-size:clamp(2.35rem,5.6vw,4.4rem)}
h2{font-size:clamp(1.95rem,4.4vw,3.4rem)}
h3{font-size:clamp(1.22rem,2.2vw,1.65rem);letter-spacing:-.03em;line-height:1.24}
.h3-xl{font-size:clamp(1.6rem,3.4vw,2.55rem)}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.eyebrow{display:inline-block;font-size:.78rem;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;color:var(--primary-d);background:var(--soft);
  padding:9px 18px;border-radius:999px;margin-bottom:26px}
.head{text-align:center;margin-bottom:clamp(44px,6vw,80px)}
.head p{max-width:680px;margin:26px auto 0;text-align:left;color:var(--ink-soft)}
p{color:var(--ink-soft)}
p+p{margin-top:20px}
.lead{font-size:clamp(1.05rem,1.5vw,1.2rem);line-height:1.6}
strong,b{color:var(--ink);font-weight:700}
.punch{font-family:Figtree,Inter,sans-serif;font-size:clamp(1.3rem,2.6vw,1.85rem);
  font-weight:700;color:var(--ink);letter-spacing:-.035em;line-height:1.24;text-wrap:balance}
.small{font-size:.9rem;color:var(--ink-faint);line-height:1.6}
.mt8{margin-top:8px}.mt16{margin-top:18px}.mt24{margin-top:26px}
.mt32{margin-top:36px}.mt40{margin-top:48px}.mt56{margin-top:72px}
.ctrow{text-align:center;margin-top:clamp(40px,5vw,64px)}

/* ═══ boutons ═══ */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;
  font-family:Figtree,Inter,sans-serif;font-size:1.05rem;font-weight:700;letter-spacing:-.015em;
  padding:19px 36px;border-radius:999px;border:0;cursor:pointer;text-decoration:none;
  transition:transform .22s cubic-bezier(.22,.8,.3,1),box-shadow .22s ease,background .22s ease}
.btn-p{background:var(--grad);color:#fff;box-shadow:var(--sh-btn)}
.btn-p:hover{transform:translateY(-3px);box-shadow:0 10px 34px rgba(93,108,219,.40)}
.btn-o{background:#fff;color:var(--primary-d);box-shadow:var(--sh)}
.btn-o:hover{transform:translateY(-3px);box-shadow:var(--sh-up)}
.btn-w{background:#fff;color:var(--primary-d);box-shadow:0 6px 28px rgba(10,15,45,.30)}
.btn-w:hover{transform:translateY(-3px)}
.btn-sm{padding:13px 24px;font-size:.95rem}
.reassure{font-size:.92rem;color:var(--ink-faint);margin-top:18px;text-align:center}
.linkish{display:inline-flex;align-items:center;gap:8px;color:var(--primary-d);
  font-weight:600;font-size:1rem;text-decoration:none}
.linkish:hover{text-decoration:underline}

/* ═══ entête ═══ */
header.site{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);
  backdrop-filter:saturate(180%) blur(16px)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;
  padding-top:18px;padding-bottom:18px;gap:16px}
header.site img{height:36px;width:auto}

/* ═══ cartes : zéro bordure, une ombre ═══ */
.card{background:#fff;border-radius:var(--r-card);padding:36px 30px 30px;box-shadow:var(--sh)}
.grid{display:grid;gap:26px}
.g2{grid-template-columns:repeat(auto-fit,minmax(330px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.g4{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.pain{transition:transform .28s cubic-bezier(.22,.8,.3,1),box-shadow .28s ease}
.pain:hover{transform:translateY(-6px);box-shadow:var(--sh-up)}
.pain .ico{width:62px;height:62px;border-radius:20px;background:var(--soft);
  display:flex;align-items:center;justify-content:center;font-size:1.7rem;
  margin-bottom:22px;box-shadow:0 4px 20px rgba(93,108,219,.14)}
.pain h3{margin-bottom:11px}
.pain p{font-size:1rem}

.avis{background:#fff;border-radius:var(--r-card);padding:32px 28px 26px;box-shadow:var(--sh);
  display:flex;flex-direction:column;gap:18px}
.avis .txt{font-size:1rem;color:var(--ink);line-height:1.6}
.avis .who{display:flex;align-items:center;gap:13px;margin-top:auto}
.avis .who img,.avis .who .ini{width:48px;height:48px;border-radius:999px;flex:0 0 48px;object-fit:cover}
.avis .who .ini{background:var(--grad);color:#fff;display:flex;align-items:center;
  justify-content:center;font-weight:700;font-size:1rem}
.avis .nom{font-weight:700;font-size:.97rem;line-height:1.3;color:var(--ink)}
.avis .job{font-size:.84rem;color:var(--ink-faint);line-height:1.3}
.stars{color:#F0A93B;font-size:.95rem;letter-spacing:2px;line-height:1}

/* ═══ encadrés ═══ */
.callout{border-radius:36px;padding:clamp(32px,4.5vw,56px);background:#fff;box-shadow:var(--sh)}
.alt .callout{background:#fff}
.callout .ico{width:66px;height:66px;border-radius:22px;background:var(--soft);
  display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin-bottom:22px;
  box-shadow:0 4px 20px rgba(93,108,219,.14)}
.callout h3{margin-bottom:18px;font-size:clamp(1.35rem,2.6vw,1.9rem);letter-spacing:-.035em}
.gift{background:var(--gold-bg)}
.gift h3{color:#7A5806}
.gift .ico{background:#F8EBCB;box-shadow:0 4px 20px rgba(168,118,10,.16)}

.benef{list-style:none;margin-top:10px}
.benef li{position:relative;padding:14px 0 14px 40px;font-size:1.02rem;
  color:var(--ink-soft);line-height:1.55;border-bottom:1px solid rgba(20,25,60,.06)}
.benef li:last-child{border-bottom:0}
.benef li::before{content:"";position:absolute;left:0;top:19px;width:19px;height:10px;
  border-left:2.8px solid var(--primary);border-bottom:2.8px solid var(--primary);transform:rotate(-45deg)}
.gift .benef li::before{border-color:var(--gold)}
.gift .benef li{color:#5C4A17;border-bottom-color:rgba(168,118,10,.16)}

.stat{display:grid;grid-template-columns:auto 1fr;gap:clamp(24px,4vw,52px);align-items:center;
  border-radius:36px;padding:clamp(32px,4.5vw,56px);background:#fff;box-shadow:var(--sh)}
.stat .num{font-family:Figtree,sans-serif;font-size:clamp(3.2rem,8vw,5.4rem);
  font-weight:800;letter-spacing:-.05em;line-height:1}

/* ═══ comparatif ═══ */
.cmpbox{border-radius:var(--r-card);overflow:hidden;background:#fff;box-shadow:var(--sh)}
.cmp{width:100%;border-collapse:collapse;font-size:.96rem}
.cmp th,.cmp td{padding:18px 16px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
.cmp thead th{background:#1C2350;color:#fff;font-weight:700;font-size:.8rem;
  letter-spacing:.05em;text-transform:uppercase;border-bottom:0;line-height:1.35}
.cmp thead th.me{background:#3A4590}
.cmp tbody tr:last-child td{border-bottom:0}
.cmp td:first-child{font-weight:600;color:var(--ink)}
.cmp td.me{background:#F6F8FF}
.m{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
  border-radius:999px;font-size:.8rem;font-weight:800;flex:0 0 24px;line-height:1}
.m-y{background:var(--ok-bg);color:var(--ok)}
.m-n{background:#F1F2F6;color:#969BB2}
.m-p{background:#FDF3E0;color:#A8760A}
.cell{display:flex;align-items:center;gap:10px;line-height:1.35}
.cell span.t{font-size:.92rem}
.cmp td.me .cell span.t{color:var(--primary-d);font-weight:700}
@media (max-width:880px){
  .cmpbox{background:transparent;box-shadow:none;overflow:visible}
  .cmp,.cmp tbody,.cmp tr,.cmp td{display:block;width:100%}
  .cmp thead{display:none}
  .cmp tr{background:#fff;border-radius:var(--r-card);margin-bottom:20px;
    padding:8px 24px 16px;box-shadow:var(--sh)}
  .cmp td{border-bottom:1px solid var(--line);padding:13px 0;
    display:flex;justify-content:space-between;gap:16px;align-items:center}
  .cmp td:first-child{font-size:1.08rem;font-weight:700;padding-top:20px;
    border-bottom:2px solid var(--soft-2);display:block}
  .cmp td:not(:first-child)::before{content:attr(data-l);font-size:.86rem;
    color:var(--ink-faint);font-weight:600;flex:0 0 auto}
  .cmp td:not(:first-child) .cell{justify-content:flex-end;flex:1;text-align:right}
  .cmp tr td:last-child{border-bottom:0}
  .cmp td.me{background:transparent;margin:0 -24px;padding-left:24px;padding-right:24px}
}

/* ═══ étapes ═══ */
.step{background:#fff;border-radius:var(--r-card);padding:36px 30px 30px;box-shadow:var(--sh);
  transition:transform .28s cubic-bezier(.22,.8,.3,1),box-shadow .28s ease}
.step:hover{transform:translateY(-6px);box-shadow:var(--sh-up)}
.step .n{width:58px;height:58px;border-radius:20px;background:var(--grad);color:#fff;
  display:flex;align-items:center;justify-content:center;font-family:Figtree,sans-serif;
  font-weight:800;font-size:1.45rem;margin-bottom:22px;box-shadow:0 6px 22px rgba(93,108,219,.30)}
.step h3{margin-bottom:12px}
.step p{font-size:1rem}
.step .badge{display:inline-block;margin-top:22px;font-size:.82rem;font-weight:700;
  color:var(--primary-d);background:var(--soft);padding:8px 16px;border-radius:999px}

/* ═══ fonctionnalités ═══ */
.feat{display:block;background:#fff;border-radius:var(--r-card);padding:32px 28px;
  box-shadow:var(--sh);text-decoration:none;
  transition:transform .28s cubic-bezier(.22,.8,.3,1),box-shadow .28s ease}
.feat:hover{transform:translateY(-6px);box-shadow:var(--sh-up)}
.feat:hover .go{gap:12px}
.feat .ico{width:56px;height:56px;border-radius:18px;background:var(--soft);
  display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:20px;
  box-shadow:0 4px 18px rgba(93,108,219,.14)}
.feat h3{margin-bottom:10px}
.feat p{font-size:.98rem;margin-bottom:18px}
.feat .go{display:inline-flex;align-items:center;gap:7px;font-size:.9rem;font-weight:700;
  color:var(--primary-d);transition:gap .22s ease}

/* ═══ essai ═══ */
.panel{background:#fff;border-radius:36px;padding:clamp(30px,4vw,52px);box-shadow:var(--sh)}
.field{width:100%;font-family:inherit;font-size:1.06rem;color:var(--ink);
  padding:19px 22px;border:0;border-radius:var(--r-sm);background:#F4F6FC;
  transition:box-shadow .2s ease,background .2s ease}
.field:focus{outline:0;background:#fff;box-shadow:0 0 0 3px rgba(93,108,219,.28),var(--sh)}
.field::placeholder{color:#9AA0BC}
.vid{position:relative;width:100%;aspect-ratio:16/9;border-radius:32px;
  background:linear-gradient(135deg,#232B5C,#3A4693);display:flex;align-items:center;
  justify-content:center;overflow:hidden;box-shadow:var(--sh-up);filter:var(--glow)}
.playbtn{width:88px;height:88px;border-radius:999px;background:rgba(255,255,255,.97);
  display:flex;align-items:center;justify-content:center;box-shadow:0 12px 36px rgba(0,0,0,.3);
  transition:transform .26s cubic-bezier(.22,.8,.3,1)}
.vid:hover .playbtn{transform:scale(1.09)}
.playbtn::after{content:"";border-left:24px solid var(--primary);border-top:15px solid transparent;
  border-bottom:15px solid transparent;margin-left:7px}
.vid span{position:absolute;bottom:20px;left:22px;color:rgba(255,255,255,.7);
  font-size:.85rem;font-weight:500}

/* ═══ tarifs ═══ */
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px;align-items:stretch}
.plan{background:#fff;border-radius:var(--r-card);padding:36px 30px;box-shadow:var(--sh);
  display:flex;flex-direction:column;transition:transform .28s cubic-bezier(.22,.8,.3,1),box-shadow .28s ease}
.plan:hover{transform:translateY(-6px);box-shadow:var(--sh-up)}
.plan.feat2{box-shadow:0 14px 48px rgba(93,108,219,.22);transform:translateY(-8px)}
.plan.feat2:hover{transform:translateY(-14px)}
.plan .slot{height:30px;margin-bottom:18px;display:flex;align-items:center}
.plan .ribbon{display:inline-block;background:var(--grad);color:#fff;font-size:.74rem;
  font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:7px 16px;border-radius:999px}
.plan .pname{font-family:Figtree,sans-serif;font-size:1.1rem;font-weight:700;color:var(--ink)}
.plan .price{font-family:Figtree,sans-serif;font-size:2.7rem;font-weight:800;
  letter-spacing:-.045em;margin:10px 0 2px;color:var(--ink)}
.plan .price small{font-size:1.05rem;font-weight:600;color:var(--ink-faint);letter-spacing:0}
.plan .per{font-size:.92rem;color:var(--ink-faint)}
.plan .intro{font-size:.94rem;font-weight:700;color:var(--ink);margin-top:24px}
.plan .benef{margin:12px 0 28px}
.plan .benef li{font-size:.97rem;padding:11px 0 11px 34px}
.plan .benef li::before{top:18px;width:16px;height:9px}
.plan .btn{width:100%;margin-top:auto}
.mini-gift{background:var(--gold-bg);color:#6E4F07;font-size:.88rem;font-weight:600;
  border-radius:var(--r-sm);padding:14px 16px;margin-bottom:22px;line-height:1.45}

/* ═══ objections / faq ═══ */
.obj{background:#fff;border-radius:var(--r-card);padding:28px 30px;box-shadow:var(--sh);
  transition:transform .28s cubic-bezier(.22,.8,.3,1),box-shadow .28s ease}
.obj:hover{transform:translateY(-4px);box-shadow:var(--sh-up)}
.obj .q{font-family:Figtree,sans-serif;font-weight:700;font-size:1.12rem;
  letter-spacing:-.025em;margin-bottom:11px;color:var(--ink)}
.obj .a{font-size:1rem}
details.faq{background:#fff;border-radius:var(--r-card);margin-bottom:16px;
  overflow:hidden;box-shadow:var(--sh)}
details.faq summary{list-style:none;cursor:pointer;padding:24px 66px 24px 28px;
  font-family:Figtree,sans-serif;font-weight:700;font-size:1.08rem;letter-spacing:-.025em;
  position:relative;color:var(--ink);transition:background .18s ease}
details.faq summary::-webkit-details-marker{display:none}
details.faq summary:hover{background:#FAFBFE}
details.faq summary::after{content:"";position:absolute;right:30px;top:31px;width:10px;height:10px;
  border-right:2.6px solid var(--primary);border-bottom:2.6px solid var(--primary);
  transform:rotate(45deg);transition:transform .26s cubic-bezier(.22,.8,.3,1)}
details.faq[open] summary::after{transform:rotate(-135deg);top:36px}
details.faq .body{padding:0 28px 26px;font-size:1rem;color:var(--ink-soft)}

.dark h2,.dark h3,.dark strong{color:#fff}
.dark p{color:rgba(255,255,255,.80)}
.dark .eyebrow{background:rgba(255,255,255,.14);color:#fff}
.dark .small{color:rgba(255,255,255,.62)}
.dark .punch{color:#fff}

.bene{display:grid;grid-template-columns:auto 1fr;gap:clamp(28px,4.5vw,56px);align-items:start}
.bene img{width:clamp(120px,15vw,190px);height:clamp(120px,15vw,190px);border-radius:999px;
  object-fit:cover;box-shadow:var(--sh-up)}

.pills{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.pill{background:#fff;border-radius:999px;padding:12px 22px;font-size:.94rem;
  font-weight:600;color:var(--ink);box-shadow:var(--sh)}
.pill.soon{color:var(--ink-faint);font-weight:500;background:transparent;
  box-shadow:none;border:1.5px dashed var(--soft-2)}

footer.site{background:#131834;color:rgba(255,255,255,.6);padding:72px 0 56px;
  font-size:.92rem;text-align:center}
footer.site img{height:34px;margin:0 auto 22px;opacity:.92}
footer.site a{color:rgba(255,255,255,.82);text-decoration:none}
footer.site a:hover{text-decoration:underline}
footer.site nav{margin-top:26px;display:flex;flex-wrap:wrap;gap:12px 26px;justify-content:center}

/* ═══ schéma du tri ═══ */
.flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.fcard{background:#fff;border-radius:var(--r-card);padding:30px 26px;box-shadow:var(--sh);
  position:relative;overflow:hidden;transition:transform .28s cubic-bezier(.22,.8,.3,1),box-shadow .28s ease}
.fcard:hover{transform:translateY(-6px);box-shadow:var(--sh-up)}
.fcard::before{content:"";position:absolute;inset:0 auto 0 0;width:5px}
.fcard.c1::before{background:#5D6CDB}.fcard.c2::before{background:#2E9BD4}.fcard.c3::before{background:#20BBE6}
.fcard .rep{font-family:Figtree,sans-serif;font-size:1.1rem;font-weight:700;
  letter-spacing:-.025em;color:var(--ink);line-height:1.35}
.fcard .arrow{color:var(--ink-faint);font-size:1.2rem;margin:16px 0;line-height:1}
.fcard .res{font-size:.99rem;color:var(--ink-soft);line-height:1.55}
.fcard .tagline{margin-top:22px;padding-top:18px;border-top:1px solid var(--line);
  display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fcard .tagline em{font-style:normal;font-size:.82rem;color:var(--ink-faint);font-weight:600}
.etq{display:inline-flex;align-items:center;background:var(--soft);color:var(--primary-d);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;font-weight:600;
  padding:7px 13px;border-radius:9px}
.split{margin:0 auto clamp(36px,5vw,56px);max-width:560px}
.split .pulse{animation:dash 2.4s linear infinite}
@keyframes dash{to{stroke-dashoffset:-28}}

/* ═══ PDF contre quiz ═══ */
.vs{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px}
.vs .side{border-radius:var(--r-card);padding:34px 30px;background:#fff;box-shadow:var(--sh)}
.vs .side.no{background:#FBFBFD;box-shadow:0 2px 10px rgba(65,67,78,.06)}
.vs .side h3{margin-bottom:18px;display:flex;align-items:center;gap:13px}
.vs .side .mark{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:1.15rem;font-weight:800;flex:0 0 42px}
.vs .no .mark{background:#F1F1F5;color:#8E93A8}
.vs .yes .mark{background:var(--ok-bg);color:var(--ok)}
.vs .side p{font-size:1rem}
.vs .side ul{list-style:none;margin-top:18px}
.vs .side li{font-size:.99rem;padding:9px 0 9px 26px;position:relative;color:var(--ink-soft)}
.vs .no li::before{content:"–";position:absolute;left:0;color:#B0B4C6;font-weight:700}
.vs .yes li::before{content:"✓";position:absolute;left:0;color:var(--ok);font-weight:800}

/* ═══ apparition au défilement, décalée par rangée ═══ */
.rv{opacity:0;transform:translateY(28px) scale(.985);
  transition:opacity .7s cubic-bezier(.22,.8,.3,1),transform .7s cubic-bezier(.22,.8,.3,1)}
.rv.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .rv{opacity:1;transform:none;transition:none}
  .btn:hover,.pain:hover,.feat:hover,.step:hover,.plan:hover,.obj:hover,.fcard:hover{transform:none}
  .split .pulse{animation:none}
  .plan.feat2{transform:none}
}
@media (max-width:900px){ :root{--gut:24px;--r-panel:32px} }
@media (max-width:640px){
  body{font-size:17px}
  :root{--r-panel:26px;--r-card:20px}
  .bene{grid-template-columns:1fr;justify-items:center;text-align:left}
  .stat{grid-template-columns:1fr}
  header.site .btn{display:none}
  .ctrow .btn{width:100%}
  .plan.feat2{transform:none}
}`;

/**
 * Tout ce qui précède la section de démo.
 *
 * LA COUPE EST SUR LA SECTION ENTIÈRE, ET C'EST OBLIGATOIRE. Couper au
 * milieu laisserait `<section>` et `<div class="wrap">` OUVERTS : le
 * `<div>` qui héberge le `innerHTML` les refermerait tout seul, et la
 * mise en page se casserait sans qu'aucun test logique ne le voie. Un
 * test vérifie que les deux moitiés sont équilibrées.
 */
export const HAUT = `

<header class="site">
  <div class="wrap">
    <img src="/logo-tiquiz.webp" alt="Tiquiz">
    <a class="btn btn-p btn-sm" href="#tarifs">Créer mon quiz gratuitement</a>
  </div>
</header>

<!-- ══ 1 · haut de page ══ -->
<section style="padding-top:clamp(48px,6vw,86px)">
  <div class="wrap">
  <div class="colc" style="text-align:center">
    <span class="eyebrow rv">Générateur de quiz connecté à ton autorépondeur</span>
    <h1 class="rv">Tu attires des curieux. <span class="grad">Il te faut des clients.</span></h1>
    <p class="lead mt24 rv" style="text-align:left">Tiquiz pose les bonnes questions à ta place. Ton visiteur répond parce que ça parle de lui, il repart avec un résultat qu'il a envie de lire, et toi tu récupères son adresse, son profil et son tag. Directement dans ton autorépondeur.</p>
    <p class="punch mt32 rv">Une liste emails qui grandit et se segmente seule, pendant que tu fais autre chose.</p>
    <div class="mt32 rv">
      <a class="btn btn-p" href="#tarifs">Créer mon premier quiz gratuitement</a>
      <p class="reassure">Gratuit · sans carte bancaire · sans limite de durée</p>
      <p class="mt16"><a class="linkish" href="#essai">Voir l'IA écrire un quiz, tout de suite ↓</a></p>
    </div>
  </div>
</div>
</section>

<!-- ══ 2 · preuve immédiate ══ -->
<section style="padding-top:clamp(16px,2.5vw,32px)">
  <div class="wrap">
    <div class="grid g3">
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« Super outil ! Très simple d'utilisation, et surtout : le quiz punaise mais c'est le meilleur lead magnet aujourd'hui ! Je suis fan, voilà. Merci Béné pour ce bijou ! »</p>
        <div class="who"><img src="/apercu-landing/18b6da36a6e6.jpg" alt=""><div><div class="nom">Adeline</div><div class="job">Thérapeute</div></div></div></div>
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« Les quiz Tiquiz sont puissants et ultra simples à créer. La segmentation automatique des leads, c'est exactement ce dont j'avais besoin. »</p>
        <div class="who"><img src="/apercu-landing/0edc716a3f69.jpg" alt=""><div><div class="nom">Thibault L.</div><div class="job">Consultant</div></div></div></div>
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« Franchement, je suis bluffé. J'ai pris le temps de créer mon premier quiz et le résultat est tout simplement topissime. Bravo ! »</p>
        <div class="who"><img src="/apercu-landing/dbb4fff0778a.jpg" alt=""><div><div class="nom">Sylvère M.</div><div class="job">Entrepreneur</div></div></div></div>
    </div>
  </div>
</section>

<!-- ══ 3 · la douleur ══ -->
<section class="alt">
  <div class="wrap">
    <div class="head">
      <span class="eyebrow rv">Le vrai problème</span>
      <h2 class="rv">Ton contenu marche. <span class="grad">C'est après que tout part en live.</span></h2>
      <p class="lead rv">Tu as passé ta soirée sur ce post. Il a bien tourné : des vues, des commentaires, deux personnes qui ont écrit que c'était exactement ce dont elles avaient besoin. Le lendemain matin tu ouvres tes statistiques d'inscription, et il y a <strong>zéro nouvelle adresse</strong>. Le trafic est venu, il n'a rien laissé derrière lui, et la semaine prochaine il faudra recommencer.</p>
    </div>
    <div class="grid g3">
      <div class="card pain rv"><span class="ico">🎣</span><h3>Des curieux, pas des clients</h3><p>Ils téléchargent, ils s'inscrivent, ils ne répondent jamais. Tu as des adresses, tu n'as pas d'acheteurs, et aucun moyen de savoir lesquels sont lesquels.</p></div>
      <div class="card pain rv"><span class="ico">📭</span><h3>Une liste qui ne répond plus</h3><p>Tu écris, tu soignes l'objet, tu envoies. Silence. Alors tu te dis que l'email ne marche plus, alors qu'en vrai tu parles à quinze personnes différentes avec la même phrase.</p></div>
      <div class="card pain rv"><span class="ico">📄</span><h3>Le PDF que plus personne ne veut</h3><p>Il y a quelques années, un guide contre une adresse, ça passait. Aujourd'hui ton visiteur sait très bien qu'il ne le lira pas. Alors il ne le prend même plus.</p></div>
      <div class="card pain rv"><span class="ico">🧰</span><h3>La pile d'outils qui te prend tes soirées</h3><p>Un outil pour le formulaire, un autre pour les emails, un troisième au milieu pour les faire se parler. Trois abonnements, et un mardi soir où ça casse sans prévenir.</p></div>
      <div class="card pain rv"><span class="ico">🌫️</span><h3>Aucune idée d'où ça bloque</h3><p>Du trafic, pas de ventes. C'est la page ? Le formulaire ? L'email ? L'offre ? Tu changes un truc, tu attends une semaine, tu recommences. Au feeling.</p></div>
      <div class="card pain rv"><span class="ico">🕐</span><h3>Et personne à côté de toi</h3><p>Pas d'équipe, pas de développeur, pas de budget pour en payer un. Chaque outil à apprendre, c'est une soirée que tu ne passes pas à vendre.</p></div>
    </div>
    <div class="callout colc mt56 rv">
      <span class="ico">💡</span>
      <h3>Le problème, ce n'est pas toi.</h3>
      <p>On t'a dit : fais un lead magnet. Tu l'as fait. On t'a dit : mets un formulaire. Tu l'as mis. On t'a dit : connecte-le à ton autorépondeur, il y a un service pour ça, une trentaine d'euros par mois.</p>
      <p>Il manquait la pièce qui demande à ton visiteur qui il est, et qui le range au bon endroit sans que tu y touches.</p>
      <p class="punch mt24">Ce n'est pas un outil de plus. C'est celui qui en remplace trois.</p>
    </div>
  </div>
</section>

<!-- ══ 4 · essaie maintenant ══ -->
`;

/** Tout ce qui la suit, à partir de la section d'après. */
export const BAS = `

<!-- ══ 5 · la bascule ══ -->
<section class="alt">
  <div class="wrap">
    <div class="head">
      <h2 class="rv">Tu n'as pas besoin de créer plus de contenu. <span class="grad">Tu as besoin de poser les bonnes questions.</span></h2>
    </div>
    <div class="vs colc rv" style="max-width:900px">
      <div class="side no">
        <h3><span class="mark">📄</span> Un PDF parle</h3>
        <p>Celui qui télécharge ton guide te laisse une adresse, et rien d'autre.</p>
        <ul>
          <li>Tu ne sais pas où il en est</li>
          <li>Tu ne sais pas ce qu'il cherche</li>
          <li>Tu ne sais pas ce que tu pourrais lui vendre</li>
          <li>Il reçoit les mêmes emails que les trois cents autres</li>
        </ul>
      </div>
      <div class="side yes">
        <h3><span class="mark">✓</span> Un quiz écoute</h3>
        <p>Celui qui répond à cinq questions te dit tout ça sans que tu aies eu à le lui demander.</p>
        <ul>
          <li>Son niveau</li>
          <li>Son blocage</li>
          <li>Son budget et son urgence</li>
          <li>Et il te le dit volontiers, parce qu'il veut son résultat</li>
        </ul>
      </div>
    </div>
    <p class="punch colc mt40 rv" style="text-align:center">Le même visiteur, deux fois plus d'informations. Et cette fois, tu sais quoi lui écrire.</p>

    <div class="stat colc mt56 rv">
      <div class="num grad">44,9 %</div>
      <div>
        <p class="lead">des personnes qui commencent un quiz laissent leur email, dans la catégorie coaching et formation. Va regarder le taux de ta dernière page de capture, et compare. Même trafic, même effort pour l'attirer, et ce n'est pas du tout le même nombre d'adresses à la fin.</p>
        <p class="small mt16">Rapport Interact sur les taux de conversion des quiz. Ce n'est pas un taux de page : c'est le taux mesuré à partir du moment où le quiz est commencé.</p>
      </div>
    </div>
  </div>
</section>

<!-- ══ 6 · le tri, montré ══ -->
<section>
  <div class="wrap">
    <div class="head">
      <h2 class="rv">Trois personnes répondent au même quiz. <span class="grad">Chacune est orientée en fonction de son résultat.</span></h2>
      <p class="lead rv">Quelqu'un qui débute et quelqu'un qui a déjà mille contacts n'ont pas besoin de la même offre. Le quiz leur pose les mêmes questions, et les envoie vers trois endroits différents.</p>
    </div>

    <svg class="split rv" viewBox="0 0 520 170" role="img" aria-label="Un quiz qui répartit les visiteurs vers trois profils">
      <rect x="2" y="58" width="130" height="54" rx="14" fill="#EEF0FD" stroke="#D5D9E8"/>
      <text x="67" y="90" text-anchor="middle" font-family="Inter,sans-serif" font-size="15" font-weight="700" fill="#2E386E">Ton quiz</text>
      <g fill="none" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="7 7" class="pulse">
        <path d="M136 85 C 220 85, 250 30, 340 30" stroke="#5D6CDB"/>
        <path d="M136 85 L 340 85" stroke="#2E9BD4"/>
        <path d="M136 85 C 220 85, 250 140, 340 140" stroke="#20BBE6"/>
      </g>
      <g font-family="Inter,sans-serif" font-size="13.5" font-weight="600" fill="#2E386E">
        <circle cx="352" cy="30" r="9" fill="#5D6CDB"/><text x="372" y="35">Débutant</text>
        <circle cx="352" cy="85" r="9" fill="#2E9BD4"/><text x="372" y="90">Liste tiède</text>
        <circle cx="352" cy="140" r="9" fill="#20BBE6"/><text x="372" y="145">Audience</text>
      </g>
    </svg>

    <div class="flow">
      <div class="fcard c1 rv">
        <div class="rep">« Je démarre tout juste »</div>
        <div class="arrow">↓</div>
        <div class="res">Il lit un résultat qui lui dit par où commencer, et son bouton l'envoie vers ton offre d'entrée.</div>
        <div class="tagline"><em>Part chez toi avec</em><span class="etq">profil-debutant</span></div>
      </div>
      <div class="fcard c2 rv">
        <div class="rep">« Quelques dizaines de contacts »</div>
        <div class="arrow">↓</div>
        <div class="res">Il lit qu'il a une liste mais pas encore de rythme, et son bouton l'envoie vers ton accompagnement.</div>
        <div class="tagline"><em>Part chez toi avec</em><span class="etq">profil-liste-tiede</span></div>
      </div>
      <div class="fcard c3 rv">
        <div class="rep">« Plusieurs centaines de contacts »</div>
        <div class="arrow">↓</div>
        <div class="res">Il lit qu'il a l'audience mais pas l'offre, et son bouton l'envoie vers ton offre haute.</div>
        <div class="tagline"><em>Part chez toi avec</em><span class="etq">profil-audience</span></div>
      </div>
    </div>

    <div class="colc mt40">
      <p class="lead rv">Le tag part avec le contact, dans ton autorépondeur. Si tu ne l'avais pas créé, Tiquiz le crée. Tes automatisations démarrent toutes seules, chacune sur son profil.</p>
      <p class="punch mt24 rv">Tu n'as ouvert aucun autre outil. Tu n'as rien recopié. Tu n'as rien vérifié.</p>
      <div class="avis mt32 rv"><div class="stars">★★★★★</div>
        <p class="txt">« Tiquiz m'a vraiment aidé à clarifier mes idées pour qualifier mes prospects. Mes leads sont tagués automatiquement dans Systeme.io, un vrai gain de temps. »</p>
        <div class="who"><img src="/apercu-landing/c9be02bcfa3a.jpg" alt=""><div><div class="nom">Bernard C.</div><div class="job">Consultant</div></div></div></div>
    </div>
  </div>
</section>

<!-- ══ 7 · trois étapes ══ -->
<section class="alt">
  <div class="wrap">
    <div class="head">
      <span class="eyebrow rv">Trois étapes</span>
      <h2 class="rv">Rien à installer. <span class="grad">Si tu sais copier un lien, tu sais publier un quiz.</span></h2>
    </div>
    <div class="grid g3">
      <div class="step rv"><div class="n">1</div><h3>Tu dis à qui tu parles</h3><p>Ton sujet, ton audience, ce que le quiz doit servir. L'IA écrit les questions, les options et les profils de résultat. Tu relis, tu remplaces deux ou trois formulations par les tiennes, tu mets ton logo et tes couleurs.</p><span class="badge">Quelques minutes</span></div>
      <div class="step rv"><div class="n">2</div><h3>Tu le mets là où tes visiteurs passent</h3><p>Un lien à coller dans ta bio, en fin d'article, dans un tunnel, dans ta signature d'email. Ou intégré dans ta page. Ou sur ton propre nom de domaine, pour qu'il ait l'air d'être chez toi.</p><span class="badge">Une URL, ou six lignes de code</span></div>
      <div class="step rv"><div class="n">3</div><h3>Tu connectes ton compte, une fois</h3><p>Tu relies Tiquiz à ton autorépondeur en suivant un écran qui te tient la main, tu choisis où partent tes leads, et c'est réglé pour tous tes quiz. Tu peux changer de destination quiz par quiz si tu gères plusieurs projets.</p><span class="badge">Une fois, et c'est réglé</span></div>
    </div>
    <p class="punch colc mt40 rv" style="text-align:center">Ensuite, ça tourne. Y compris les jours où tu te reposes, et ceux où tu es à fond sur ton cœur de métier.</p>
    <div class="ctrow rv"><a class="btn btn-p" href="#tarifs">Créer mon premier quiz</a></div>
  </div>
</section>

<!-- ══ 8 · les fonctionnalités ══ -->
<section>
  <div class="wrap">
    <div class="head">
      <span class="eyebrow rv">Ce qu'il y a dedans</span>
      <h2 class="rv">Chaque fonctionnalité, <span class="grad">expliquée en détail.</span></h2>
      <p class="lead rv">Tu veux savoir exactement comment marche telle ou telle partie avant de créer ton compte ? Chaque page ci-dessous te la détaille, captures à l'appui.</p>
    </div>
    <div class="grid g3">
      <a class="feat rv" href="/fonctionnalites/generation-ia"><div class="ico">✨</div><h3>La génération par l'IA</h3><p>Tu décris ton sujet, l'IA écrit les questions, les options et les profils de résultat.</p><span class="go">Voir en détail →</span></a>
      <a class="feat rv" href="/fonctionnalites/connexion-systeme-io"><div class="ico">🔗</div><h3>L'intégration Systeme.io</h3><p>Tes leads arrivent directement dans ton compte Systeme.io, sans intermédiaire au milieu.</p><span class="go">Voir en détail →</span></a>
      <a class="feat rv" href="/fonctionnalites/resultats-par-profil"><div class="ico">🎯</div><h3>Les résultats par profil</h3><p>Un seul quiz, et chacun repart vers le texte, le bouton et l'offre qui le concernent.</p><span class="go">Voir en détail →</span></a>
      <a class="feat rv" href="/fonctionnalites/quiz-profil-ou-score"><div class="ico">🧭</div><h3>Quiz par profil, ou quiz scoré</h3><p>Ton quiz dit à ton visiteur qui il est, ou où il en est. Tu choisis, et l'IA génère les deux.</p><span class="go">Voir en détail →</span></a>
      <a class="feat rv" href="/fonctionnalites/partage-et-viralite"><div class="ico">🚀</div><h3>Le partage et le bonus</h3><p>Ton visiteur partage son résultat pour débloquer un bonus, et ton quiz part chez des gens qui lui ressemblent.</p><span class="go">Voir en détail →</span></a>
      <a class="feat rv" href="/fonctionnalites/sondages-et-popquiz"><div class="ico">💬</div><h3>Les sondages et les Popquiz</h3><p>Tu poses une question à ton audience et tu récoltes ses réponses avec ses mots à elle.</p><span class="go">Voir en détail →</span></a>
      <a class="feat rv" href="/fonctionnalites/branding-et-langues"><div class="ico">🎨</div><h3>Ton branding et tes langues</h3><p>Ton logo, tes couleurs, ton domaine, et un quiz écrit dans la langue de ton audience.</p><span class="go">Voir en détail →</span></a>
      <a class="feat rv" href="/fonctionnalites/ou-placer-son-quiz"><div class="ico">📍</div><h3>Un lien, ou six lignes de code</h3><p>Ton quiz vit sur ton domaine, dans une page Systeme.io, dans WordPress, ou tout seul.</p><span class="go">Voir en détail →</span></a>
    </div>
  </div>
</section>

<!-- ══ 9 · le comparatif ══ -->
<section class="alt">
  <div class="wrap">
    <div class="head">
      <span class="eyebrow rv">Pourquoi pas un autre</span>
      <h2 class="rv">Ils font tous de très bons quiz. <span class="grad">La question, c'est ce qui se passe après.</span></h2>
      <p class="lead rv">Quelqu'un doit créer le contact dans ton autorépondeur et poser le bon tag dessus. Chez la plupart des autres, ce quelqu'un est un troisième service, que tu paies, que tu configures, et qui tombe en panne sans te prévenir.</p>
    </div>

    <div class="cmpbox rv">
      <table class="cmp">
        <thead><tr>
          <th style="width:25%"></th><th class="me" style="width:15%">Tiquiz</th>
          <th style="width:15%">Quizify</th><th style="width:15%">Typeform</th>
          <th style="width:15%">Interact</th><th style="width:15%">Google&nbsp;Forms, Tally</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Le lead arrive dans ton autorépondeur</td>
            <td class="me" data-l="Tiquiz"><div class="cell"><span class="m m-y">✓</span><span class="t">En direct</span></div></td>
            <td data-l="Quizify"><div class="cell"><span class="m m-y">✓</span><span class="t">En direct</span></div></td>
            <td data-l="Typeform"><div class="cell"><span class="m m-n">✗</span><span class="t">Par un service au milieu</span></div></td>
            <td data-l="Interact"><div class="cell"><span class="m m-n">✗</span><span class="t">Par un service au milieu</span></div></td>
            <td data-l="Forms, Tally"><div class="cell"><span class="m m-n">✗</span><span class="t">Par un service au milieu</span></div></td>
          </tr>
          <tr>
            <td>Le tag est créé tout seul s'il n'existe pas</td>
            <td class="me" data-l="Tiquiz"><div class="cell"><span class="m m-y">✓</span></div></td>
            <td data-l="Quizify"><div class="cell"><span class="m m-p">?</span><span class="t">Non vérifié</span></div></td>
            <td data-l="Typeform"><div class="cell"><span class="m m-n">✗</span></div></td>
            <td data-l="Interact"><div class="cell"><span class="m m-n">✗</span><span class="t">À créer à la main</span></div></td>
            <td data-l="Forms, Tally"><div class="cell"><span class="m m-n">✗</span></div></td>
          </tr>
          <tr>
            <td>Le quiz est écrit par l'IA</td>
            <td class="me" data-l="Tiquiz"><div class="cell"><span class="m m-y">✓</span><span class="t">En entier</span></div></td>
            <td data-l="Quizify"><div class="cell"><span class="m m-p">?</span><span class="t">Non vérifié</span></div></td>
            <td data-l="Typeform"><div class="cell"><span class="m m-n">✗</span></div></td>
            <td data-l="Interact"><div class="cell"><span class="m m-p">~</span><span class="t">En partie</span></div></td>
            <td data-l="Forms, Tally"><div class="cell"><span class="m m-n">✗</span></div></td>
          </tr>
          <tr>
            <td>Interface en français</td>
            <td class="me" data-l="Tiquiz"><div class="cell"><span class="m m-y">✓</span><span class="t">Et six autres langues</span></div></td>
            <td data-l="Quizify"><div class="cell"><span class="m m-y">✓</span></div></td>
            <td data-l="Typeform"><div class="cell"><span class="m m-y">✓</span></div></td>
            <td data-l="Interact"><div class="cell"><span class="m m-n">✗</span></div></td>
            <td data-l="Forms, Tally"><div class="cell"><span class="m m-y">✓</span></div></td>
          </tr>
          <tr>
            <td>Un plan gratuit sans carte bancaire</td>
            <td class="me" data-l="Tiquiz"><div class="cell"><span class="m m-y">✓</span><span class="t">Sans limite de durée</span></div></td>
            <td data-l="Quizify"><div class="cell"><span class="m m-y">✓</span><span class="t">1 quiz de 5 questions</span></div></td>
            <td data-l="Typeform"><div class="cell"><span class="m m-p">~</span><span class="t">Limité</span></div></td>
            <td data-l="Interact"><div class="cell"><span class="m m-p">~</span><span class="t">Limité</span></div></td>
            <td data-l="Forms, Tally"><div class="cell"><span class="m m-y">✓</span></div></td>
          </tr>
          <tr>
            <td>Ce que ça coûte par mois</td>
            <td class="me" data-l="Tiquiz">17 €</td>
            <td data-l="Quizify">Non affiché sur leur page</td>
            <td data-l="Typeform">79 $ plus le service au milieu</td>
            <td data-l="Interact">Son prix plus le service au milieu</td>
            <td data-l="Forms, Tally">0 €, et tout à la main</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="colc mt40">
      <p class="lead rv"><strong>Un mot honnête sur Quizify</strong>, parce que c'est le seul autre outil qui se connecte à Systeme.io en direct. Je l'ai testé. Il fait le job, mais il est nettement moins simple à prendre en main : si la technique n'est pas ton truc, tu vas y passer tes soirées. Et je n'ai pas pu vérifier s'il crée les tags manquants ou s'il se contente de ceux qui existent déjà, d'où les deux « non vérifié » du tableau.</p>

      <div class="callout mt32 rv">
        <span class="ico">🧮</span>
        <h3>Plus de 100 € par mois, ou 17 €.</h3>
        <p>Typeform Plus est à 79 $ par mois, et le service qui envoie tes leads vers ta liste tourne autour de 30 $. Sur cinq ans, ça dépasse les 6 000 €. Tiquiz en annuel, sur la même durée : 850 €.</p>
        <p>Et l'argent n'est pas le pire. Le pire, c'est la chaîne qui casse un soir sans rien dire, et les leads qui tombent dedans pendant trois jours.</p>
      </div>

      <p class="small mt24 rv">En août 2026, parmi les huit outils comparés, Tiquiz est le seul qui crée le contact et pose les tags tout seul, sans passer par un service en plus.</p>

      <div class="avis mt32 rv"><div class="stars">★★★★★</div>
        <p class="txt">« Meilleur outil de quiz pour segmenter et convertir. La connexion directe avec Systeme.io change tout. Plus besoin de bidouiller des intégrations. »</p>
        <div class="who"><img src="/apercu-landing/3eb14d1525bf.jpg" alt=""><div><div class="nom">Maulisio T.</div><div class="job">Marketeur</div></div></div></div>
    </div>
  </div>
</section>

<!-- ══ 10 · tes leads t'appartiennent ══ -->
<section>
  <div class="wrap">
  <div class="colc">
    <div class="head">
      <span class="eyebrow rv">Ton outil, pas le mien</span>
      <h2 class="rv">Tes leads sont à toi. <span class="grad">Tiquiz s'adapte à ce que tu utilises déjà.</span></h2>
    </div>
    <p class="lead rv">Chaque réponse est enregistrée dans ton compte Tiquiz, avec son profil et son tag. Tu les exportes quand tu veux, autant de fois que tu veux, et tu les emmènes où tu veux : un autorépondeur du commerce, le système que tu t'es monté, ou celui que tu as fait développer pour toi. Rien à changer à ton installation pour te servir de Tiquiz.</p>
    <p class="lead rv">Et si ton outil fait partie des connexions directes, tu arrêtes d'exporter : le contact est créé et tagué à la seconde où ton visiteur voit son résultat. Les noms de tags sont identiques d'un outil à l'autre, donc le jour où tu changes de crémerie, tes automatisations continuent de tourner telles quelles.</p>
    <p class="lead rv">La liste des connexions directes s'allonge au fil des mois. Voilà où elle en est aujourd'hui :</p>
    <div class="pills rv">
      <span class="pill">✅ Systeme.io</span>
      <span class="pill">✅ GoHighLevel</span>
      <span class="pill soon">Brevo · en cours</span>
      <span class="pill soon">ClickFunnels · en cours</span>
      <span class="pill soon">Podia · en cours</span>
    </div>
    <p class="small mt24 rv">Ton outil n'est pas dans la liste ? Ton quiz fonctionne quand même, et tes leads t'attendent dans ton compte.</p>
  </div>
</div>
</section>

<!-- ══ 11 · la preuve, en grand ══ -->
<section class="alt">
  <div class="wrap">
    <div class="head">
      <span class="eyebrow rv">Ils s'en servent</span>
      <h2 class="rv">Des gens seuls, avec un ordinateur <span class="grad">et une liste à faire grossir.</span></h2>
    </div>
    <div class="grid g3">
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« J'utilise Tiquiz pour mon quiz de diagnostic client, connecté à System.io avec des séquences emails segmentées par profil. La connexion est propre, les tags s'appliquent automatiquement, et l'interface est suffisamment intuitive pour qu'on configure tout sans développeur. Pour quelqu'un qui opère seul et qui veut un funnel de capture qui tourne sans surveillance, Tiquiz fait exactement ce qu'il promet. »</p>
        <div class="who"><span class="ini">MM</span><div><div class="nom">Maurice Massolin</div><div class="job">Coach pour femmes entrepreneures · Trustpilot</div></div></div></div>
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« As-tu déjà galéré à créer un quiz, à gérer les résultats qui en découlent, à le rattacher à une campagne d'emails ? Moi oui, jusqu'à ce que je découvre Tiquiz. Il fait tout ça. Tu as seulement besoin de lui préciser à qui tu souhaites adresser le quiz, ce à quoi il doit servir et quel résultat tu aimerais obtenir. Et le tour est joué : tu obtiens un quiz qualitatif. Bref, une pépite. Je recommande à 100 % »</p>
        <div class="who"><img src="/apercu-landing/09537be496ce.jpg" alt=""><div><div class="nom">Monique Pulby</div><div class="job">Formatrice · Trustpilot</div></div></div></div>
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« J'ai créé mes deux premiers quizz qui ont donné des résultats que je n'aurais jamais imaginés. Ce qui est fabuleux c'est que Tiquiz comble une lacune de System.io qui ne permet pas de faire des quiz. Ca fonctionne comme un rêve. »</p>
        <div class="who"><span class="ini">C</span><div><div class="nom">Christian</div><div class="job">Trustpilot</div></div></div></div>
    </div>
  </div>
</section>

<!-- ══ 12 · toi ══ -->
<section>
  <div class="wrap">
  <div class="colc">
    <div class="bene rv">
      <img src="/apercu-landing/6b1796be39aa.jpg" alt="Béné, créatrice de Tiquiz">
      <div>
        <h2>Derrière Tiquiz, <span class="grad">il y a une personne. Moi.</span></h2>
        <p class="lead mt24">Pas un support qui répond en quarante-huit heures avec un lien vers un article d'aide. Quand tu écris, c'est moi qui lis, et c'est moi qui réponds. Si tu trouves un bug, je le corrige. Si tu as une idée qui manque à l'outil, il y a de bonnes chances qu'elle y soit la semaine suivante : c'est comme ça que la moitié de ce que tu vois a été construite.</p>
        <p class="lead">J'ai développé Tiquiz parce que j'avais besoin de l'utiliser. Je m'en sers tous les jours pour mon propre business. Quand quelque chose ne va pas dedans, ça m'embête autant que toi.</p>
      </div>
    </div>
    <div class="grid g2 mt40">
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« Je remercie Béné pour avoir développer Tiquiz, pour sa présence, ses retours à mes questions, sa réactivité pour faire évoluer l'outil. »</p>
        <div class="who"><img src="/apercu-landing/571e518b7b69.jpg" alt=""><div><div class="nom">Eric Legrigeois</div><div class="job">Infopreneur · Trustpilot</div></div></div></div>
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« L'outil s'améliore tous les jours. Les quiz connectés à Systeme.io, c'est exactement ce qu'il manquait. Si j'ai des suggestions, c'est avec plaisir ! »</p>
        <div class="who"><img src="/apercu-landing/fb1fcbe8ea47.jpg" alt=""><div><div class="nom">Alain M.</div><div class="job">Affilié</div></div></div></div>
    </div>
  </div>
</div>
</section>

<!-- ══ 13 · les tarifs ══ -->
<section class="alt" id="tarifs">
  <div class="wrap">
    <div class="head">
      <span class="eyebrow rv">Les formules</span>
      <h2 class="rv">Commence gratuitement. <span class="grad">Choisis le plan adapté le jour où tu es sûr que ça marche pour toi.</span></h2>
      <p class="lead rv">Un seul client signé grâce à ton quiz paie plusieurs mois d'abonnement. Et tant que ce client n'est pas arrivé, tu ne paies rien.</p>
    </div>

    <div class="plans">
      <div class="plan rv">
        <div class="slot"></div>
        <div class="pname">Gratuit à vie</div>
        <div class="price">0 €</div>
        <div class="per">Sans carte bancaire, sans limite de durée</div>
        <ul class="benef">
          <li>1 quiz et 1 sondage actifs, plus 1 Popquiz</li>
          <li>10 réponses visibles sur 30 jours glissants, les suivantes sont capturées et floutées</li>
          <li>La connexion à ton autorépondeur et les tags automatiques, inclus</li>
          <li>Les modèles par métier, dès ce palier</li>
        </ul>
        <a class="btn btn-o" href="#">Créer mon compte gratuit</a>
      </div>

      <div class="plan feat2 rv">
        <div class="slot"><span class="ribbon">Le plus choisi</span></div>
        <div class="pname">Tiquiz</div>
        <div class="price">17 €<small>/mois</small></div>
        <div class="per">ou 170 € par an</div>
        <div class="intro">Tout le gratuit, et en plus :</div>
        <ul class="benef">
          <li>Quiz, sondages et Popquiz illimités</li>
          <li>Réponses illimitées : tu vois tout, tout le temps</li>
          <li>Ton quiz sans la mention Tiquiz, avec ton propre pied de page</li>
        </ul>
        <div class="mini-gift">🎁 L'Atelier du Quiz (47 €) offert si tu prends ce plan dans tes 7 premiers jours</div>
        <a class="btn btn-p" href="#">Passer à Tiquiz</a>
      </div>

      <div class="plan rv">
        <div class="slot"></div>
        <div class="pname">Tiquiz PLUS</div>
        <div class="price">29 €<small>/mois</small></div>
        <div class="per">ou 290 € par an</div>
        <div class="intro">Tout Tiquiz, et en plus :</div>
        <ul class="benef">
          <li>Un espace par client, sans mélanger les quiz ni les leads</li>
          <li>L'analyse IA des résultats : les mots de tes répondants, résumés, pour savoir quoi vendre ensuite</li>
          <li>Le compte de chaque client connecté à part, sans te déconnecter</li>
          <li>Trois générateurs qui relisent ton quiz et écrivent la suite : le bonus, la séquence d'emails, les posts de promo</li>
        </ul>
        <div class="mini-gift">🎁 L'Atelier du Quiz (47 €) offert si tu prends ce plan dans tes 7 premiers jours</div>
        <a class="btn btn-o" href="#">Passer à Tiquiz PLUS</a>
      </div>
    </div>

    <p class="small mt32 rv" style="text-align:center">Sans engagement · Aucune carte bancaire pour le plan gratuit · Annulation en 1 clic</p>

    <div class="callout gift colc mt56 rv">
      <span class="ico">🎁</span>
      <h3>Et si tu passes payant dans tes 7 premiers jours, L'Atelier du Quiz (47 €) t'est offert</h3>
      <p>Sept jours, une étape par jour, sur ton vrai projet. Voilà ce que tu en sors :</p>
      <ul class="benef">
        <li>Ton quiz est en ligne au jour 4, pas dans trois mois.</li>
        <li>Tu sais quoi envoyer, à qui et quand : ta séquence d'emails s'écrit avec toi.</li>
        <li>Tu fais venir des visiteurs sans payer de publicité, avec une journée entière consacrée au trafic gratuit.</li>
        <li>Tu ne restes jamais bloqué : un Coach IA qui connaît ton projet te débloque à toute heure.</li>
        <li>Tu publies sans te demander si c'est bon : le Quiz Doctor relit ton quiz et te dit quoi corriger avant la mise en ligne.</li>
        <li>Si ça ne te convient pas, tu es remboursé pendant 30 jours.</li>
      </ul>
      <p class="mt24">Au huitième jour, ton plan coûte exactement le même prix. C'est le cadeau qui s'arrête, pas une promotion.</p>
    </div>

    <div class="colc mt40">
      <div class="avis rv"><div class="stars">★★★★★</div>
        <p class="txt">« Un véritable couteau suisse pour générer des leads avec des quiz. Que tu sois débutant ou non, tu automatises tout ou presque. Je recommande à 1000% ! »</p>
        <div class="who"><img src="/apercu-landing/3f6be1a65dde.jpg" alt=""><div><div class="nom">Jérémy B.</div><div class="job">Entrepreneur</div></div></div></div>
    </div>
  </div>
</section>

<!-- ══ 14 · les objections ══ -->
<section>
  <div class="wrap">
  <div class="colc">
    <div class="head">
      <span class="eyebrow rv">Normalement, à ce stade</span>
      <h2 class="rv">Tu te demandes sûrement :</h2>
    </div>
    <div class="grid" style="gap:16px">
      <div class="obj rv"><div class="q">« Encore un outil à apprendre. »</div><div class="a">Celui-ci en remplace trois : ton créateur de formulaire, le service qui l'envoie vers ta liste, et le temps que tu passes à recopier. Et tu ne changes rien à ce que tu utilises déjà.</div></div>
      <div class="obj rv"><div class="q">« Moi et la technique, ça fait deux. »</div><div class="a">Rien à installer, aucune ligne de code, aucun réglage à deviner. Tu décris ton sujet, tu relis, tu publies. Le seul moment un peu technique, c'est de relier ton compte à ton autorépondeur, une seule fois, en suivant un écran qui te tient la main. Et il y a une vidéo de deux minutes si tu préfères regarder quelqu'un le faire avant.</div></div>
      <div class="obj rv"><div class="q">« Je n'ai pas assez de trafic pour que ça vaille le coup. »</div><div class="a">C'est quand le trafic est rare qu'il ne faut en perdre aucun. Un quiz ne fabrique pas de visiteurs, il garde ceux que tu as déjà. Avec deux cents visiteurs par mois, l'écart entre une page de capture et un quiz se compte en dizaines d'adresses, tous les mois, sur le même trafic.</div></div>
      <div class="obj rv"><div class="q">« Je ne veux pas faire de marketing agressif. »</div><div class="a">Un quiz ne force personne. Il pose des questions, il rend un résultat utile, et il propose la suite à celui qui la veut. Ton prospect n'a pas l'impression qu'on lui vend quelque chose, il a l'impression qu'on l'a écouté. C'est probablement la façon la plus polie de demander une adresse.</div></div>
      <div class="obj rv"><div class="q">« J'ai déjà testé d'autres trucs, ça n'a rien donné. »</div><div class="a">Alors ne me crois pas sur parole. Tu as généré un quiz plus haut sans même créer de compte. Publie-le, et regarde le nombre d'adresses au bout d'une semaine. C'est le seul argument qui compte, et c'est le tien.</div></div>
    </div>
    <div class="ctrow rv"><a class="btn btn-p" href="#essai">D'accord, j'essaie</a></div>
  </div>
</div>
</section>

<!-- ══ 15 · la FAQ ══ -->
<section class="alt">
  <div class="wrap">
  <div class="colc">
    <div class="head"><h2 class="rv">Les questions les plus fréquentes</h2></div>
    <div>
      <details class="faq rv"><summary>Le plan gratuit, c'est un essai qui expire ?</summary><div class="body">Non. Pas de limite de durée, pas de carte bancaire. Tu es limité à un quiz, un sondage, un Popquiz et dix réponses visibles sur trente jours glissants. Au-delà, les réponses continuent d'être capturées et s'affichent floutées jusqu'à ce que tu passes à un plan payant. Rien n'est perdu, tout est en attente.</div></details>
      <details class="faq rv"><summary>Est-ce que Tiquiz marche avec mon outil ?</summary><div class="body">Dans tous les cas, oui : tes réponses sont enregistrées dans ton compte Tiquiz avec leur profil et leur tag, et tu les exportes quand tu veux pour les emmener où tu veux, y compris dans un système que tu as monté toi-même. Si ton outil fait partie des connexions directes, tu n'exportes même plus, tout part tout seul. Aujourd'hui ce sont Systeme.io et GoHighLevel ; Brevo, ClickFunnels et Podia sont en cours d'ajout, et la liste continue de s'allonger.</div></details>
      <details class="faq rv"><summary>Combien de temps pour avoir mon premier quiz en ligne ?</summary><div class="body">Le temps de décrire ton sujet et de relire ce que l'IA a écrit. La partie longue, c'est la relecture, parce que c'est là que tu mets tes mots.</div></details>
      <details class="faq rv"><summary>Et si je ne sais pas quoi mettre dans mon quiz ?</summary><div class="body">L'IA écrit une première version complète à partir d'une phrase : les questions, les options et les profils de résultat. Tu pars de quelque chose d'écrit, et tu le corriges. C'est beaucoup plus facile que la page blanche.</div></details>
      <details class="faq rv"><summary>Il n'y a que les quiz ?</summary><div class="body">Il y a aussi les sondages, quand tu veux juste écouter ton audience sur une question précise, et les Popquiz, qui s'incrustent dans une vidéo pour capturer là où l'attention est déjà.</div></details>
      <details class="faq rv"><summary>Est-ce que je peux faire des branchements conditionnels ?</summary><div class="body">Non, et c'est volontaire. Tiquiz reste simple parce que son travail est de capturer et de trier. Si tu as besoin de deux niveaux, tu chaînes deux quiz : le premier capture et tague, puis chaque profil part vers un second quiz différent. L'avantage, c'est que le lead est déjà dans ta liste même s'il abandonne en route.</div></details>
      <details class="faq rv"><summary>Ça marche dans une autre langue que le français ?</summary><div class="body">L'interface existe en sept langues et l'IA écrit tes quiz dans plus de cent, variantes régionales comprises : un quiz en portugais du Brésil ne sort pas en portugais du Portugal. L'arabe s'affiche de droite à gauche.</div></details>
      <details class="faq rv"><summary>Je monte les quiz de plusieurs clients, c'est possible ?</summary><div class="body">Oui, avec le palier PLUS. Un espace par client, des quiz et des leads séparés, le compte de chaque client connecté à part, et tu passes de l'un à l'autre en un clic sans te déconnecter.</div></details>
      <details class="faq rv"><summary>Mes quiz sont-ils à ma marque ?</summary><div class="body">Ton logo, tes couleurs, ta police, ton nom de domaine. Et dès le plan payant, la mention Tiquiz disparaît et tu mets ton propre pied de page.</div></details>
      <details class="faq rv"><summary>Je peux annuler quand je veux ?</summary><div class="body">Oui, en un clic, depuis ton compte. Tu ne perds ni tes quiz ni tes leads, tu retombes sur les limites du plan gratuit.</div></details>
    </div>
  </div>
</div>
</section>

<!-- ══ 16 · la clôture ══ -->
<section class="dark">
  <div class="wrap">
  <div class="colc" style="text-align:center">
    <h2 class="rv">Ton prochain visiteur arrive dans quelques minutes. Tu le laisses repartir, ou tu lui poses une question ?</h2>
    <p class="lead mt32 rv" style="text-align:left">Crée ton compte, publie un quiz cet après-midi, et regarde ce qui arrive dans ta liste cette semaine. Ça ne coûte rien, ça ne demande pas de carte, et si ça ne te plaît pas tu fermes la page sans rien avoir engagé.</p>
    <div class="mt32 rv"><a class="btn btn-w" href="#tarifs">Créer mon quiz gratuitement</a></div>
    <p class="small mt16 rv">Gratuit · sans carte bancaire · accès immédiat</p>
  </div>
</div>
</section>

<footer class="site">
  <div class="wrap">
    <img src="/logo-tiquiz.webp" alt="Tiquiz">
    <p style="color:rgba(255,255,255,.6)">Le quiz qui remplit ta liste et la trie toute seule.</p>
    <nav>
      <a href="/fonctionnalites/generation-ia">Génération par l'IA</a>
      <a href="/fonctionnalites/connexion-systeme-io">Intégration Systeme.io</a>
      <a href="/fonctionnalites/resultats-par-profil">Résultats par profil</a>
      <a href="/fonctionnalites/quiz-profil-ou-score">Profil ou score</a>
      <a href="/fonctionnalites/partage-et-viralite">Partage et bonus</a>
      <a href="/fonctionnalites/sondages-et-popquiz">Sondages et Popquiz</a>
      <a href="/fonctionnalites/branding-et-langues">Branding et langues</a>
      <a href="/fonctionnalites/ou-placer-son-quiz">Où placer son quiz</a>
    </nav>
    <p style="margin-top:20px"><a href="https://tiquiz.fr">tiquiz.fr</a></p>
  </div>
</footer>



`;

/** Les questions fréquentes, pour Google. */
export const FAQ_JSONLD = `{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Le plan gratuit, c'est un essai qui expire ?","acceptedAnswer":{"@type":"Answer","text":"Non. Pas de limite de durée, pas de carte bancaire. Tu es limité à un quiz, un sondage, un Popquiz et dix réponses visibles sur trente jours glissants. Au-delà, les réponses continuent d'être capturées et s'affichent floutées jusqu'à ce que tu passes à un plan payant. Rien n'est perdu, tout est en attente."}},{"@type":"Question","name":"Est-ce que Tiquiz marche avec mon outil ?","acceptedAnswer":{"@type":"Answer","text":"Dans tous les cas, oui : tes réponses sont enregistrées dans ton compte Tiquiz avec leur profil et leur tag, et tu les exportes quand tu veux pour les emmener où tu veux, y compris dans un système que tu as monté toi-même. Si ton outil fait partie des connexions directes, tu n'exportes même plus, tout part tout seul. Aujourd'hui ce sont Systeme.io et GoHighLevel ; Brevo, ClickFunnels et Podia sont en cours d'ajout, et la liste continue de s'allonger."}},{"@type":"Question","name":"Combien de temps pour avoir mon premier quiz en ligne ?","acceptedAnswer":{"@type":"Answer","text":"Le temps de décrire ton sujet et de relire ce que l'IA a écrit. La partie longue, c'est la relecture, parce que c'est là que tu mets tes mots."}},{"@type":"Question","name":"Et si je ne sais pas quoi mettre dans mon quiz ?","acceptedAnswer":{"@type":"Answer","text":"L'IA écrit une première version complète à partir d'une phrase : les questions, les options et les profils de résultat. Tu pars de quelque chose d'écrit, et tu le corriges. C'est beaucoup plus facile que la page blanche."}},{"@type":"Question","name":"Il n'y a que les quiz ?","acceptedAnswer":{"@type":"Answer","text":"Il y a aussi les sondages, quand tu veux juste écouter ton audience sur une question précise, et les Popquiz, qui s'incrustent dans une vidéo pour capturer là où l'attention est déjà."}},{"@type":"Question","name":"Est-ce que je peux faire des branchements conditionnels ?","acceptedAnswer":{"@type":"Answer","text":"Non, et c'est volontaire. Tiquiz reste simple parce que son travail est de capturer et de trier. Si tu as besoin de deux niveaux, tu chaînes deux quiz : le premier capture et tague, puis chaque profil part vers un second quiz différent. L'avantage, c'est que le lead est déjà dans ta liste même s'il abandonne en route."}},{"@type":"Question","name":"Ça marche dans une autre langue que le français ?","acceptedAnswer":{"@type":"Answer","text":"L'interface existe en sept langues et l'IA écrit tes quiz dans plus de cent, variantes régionales comprises : un quiz en portugais du Brésil ne sort pas en portugais du Portugal. L'arabe s'affiche de droite à gauche."}},{"@type":"Question","name":"Je monte les quiz de plusieurs clients, c'est possible ?","acceptedAnswer":{"@type":"Answer","text":"Oui, avec le palier PLUS. Un espace par client, des quiz et des leads séparés, le compte de chaque client connecté à part, et tu passes de l'un à l'autre en un clic sans te déconnecter."}},{"@type":"Question","name":"Mes quiz sont-ils à ma marque ?","acceptedAnswer":{"@type":"Answer","text":"Ton logo, tes couleurs, ta police, ton nom de domaine. Et dès le plan payant, la mention Tiquiz disparaît et tu mets ton propre pied de page."}},{"@type":"Question","name":"Je peux annuler quand je veux ?","acceptedAnswer":{"@type":"Answer","text":"Oui, en un clic, depuis ton compte. Tu ne perds ni tes quiz ni tes leads, tu retombes sur les limites du plan gratuit."}}]}`;

/**
 * L'apparition au défilement.
 *
 * Sans elle, les blocs `.rv` gardent `opacity:0` et la page est BLANCHE.
 * Elle a un repli explicite quand `IntersectionObserver` n'existe pas,
 * et c'est le bon sens de repli : tout montrer.
 */
export const REVEAL_JS = `(function(){
  var els=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){
    for(var i=0;i<els.length;i++){els[i].classList.add('in');}
    return;
  }
  // décalage en cascade : les enfants d'une même grille apparaissent l'un après l'autre
  var parents=new Map();
  els.forEach(function(el){
    var p=el.parentElement;
    if(!parents.has(p)) parents.set(p,0);
    el.__d=parents.get(p); parents.set(p,parents.get(p)+1);
  });
  var io=new IntersectionObserver(function(en){
    en.forEach(function(e){
      if(!e.isIntersecting) return;
      var d=Math.min(e.target.__d||0,5)*90;
      e.target.style.transitionDelay=d+'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  },{rootMargin:'0px 0px -10% 0px',threshold:.06});
  els.forEach(function(el){io.observe(el)});
})();`;
