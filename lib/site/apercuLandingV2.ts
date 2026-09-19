// lib/site/apercuLandingV2.ts
//
// LA PAGE QUE BÉNÉ A ENVOYÉE, DÉCOUPÉE POUR Y POSER LE VRAI GÉNÉRATEUR.
//
// Béné, 19 septembre 2026 : "mets à jour la landing page aperçu pour
// reproduire cette page en exemple... Au lieu de 'Écris ton sujet,
// regarde ce qui sort' mets le générateur de quiz qui est actuellement
// sur la page. Plus l'option pour l'importer dans le compte du nouvel
// user. Et agrandis un peu la démo, là elle sera illisible."
//
// -- POURQUOI SON HTML EST GARDÉ TEL QUEL ------------------------------
//
// C'est un APERÇU : il existe pour qu'elle regarde une maquette et
// tranche. Le retranscrire à la main en JSX, c'est 230 Ko de copie où
// chaque faute de frappe devient une différence qu'elle prendrait pour
// une décision de design. On garde donc son fichier à l'octet près, et
// on ne touche QUE ce qu'elle a demandé.
//
// Le jour où elle valide, ce style rejoint `components/landing/styles.ts`
// et les sections deviennent du JSX : une feuille de plus sur le domaine
// serait un troisième système visuel (sa règle du 4 septembre), et c'est
// pour ça que cette page est en `noindex` et reste un aperçu.
//
// -- LES TROIS CHOSES QUI ONT CHANGÉ, ET RIEN D'AUTRE ------------------
//
// 1. LE LOGO REDEVIENT UN FICHIER. Il était en base64 dans l'en-tête ET
//    dans le pied : 68 Ko chacun, 137 Ko sur les 233 Ko de la page, pour
//    une image que le dépôt sert déjà (`/logo-tiquiz.webp`). Les autres
//    images (les visages des témoignages, sa photo) restent en base64 :
//    elles sont petites et on n'a pas les fichiers.
//
// 2. LES DEUX SCRIPTS SORTENT DU CORPS. Un `<script>` injecté par
//    `innerHTML` ne s'exécute JAMAIS. Laissé dedans, il serait là, inerte,
//    et les 112 blocs `.rv` resteraient invisibles pour toujours : une
//    page blanche que rien dans le code ne laisse voir.
//
// 3. LA SECTION "essai" EST RETIRÉE. Elle portait une maquette (un champ
//    qui renvoyait vers `/generateur-de-quiz`). La page la remplace par
//    le VRAI générateur, et il apporte avec lui la reprise du quiz dans
//    le compte du nouvel inscrit.
//
// Découpé par script, pas à la main. `npm run check:apercu-landing`
// rejoue le découpage sur le fichier d'origine et refuse un écart.

/** La feuille de style de la maquette, telle qu'elle est arrivée. */
export const CSS_V2 = `:root{
  --ink:#2E386E; --ink-soft:#6B7093; --ink-faint:#8D92AE;
  --primary:#5D6CDB; --primary-dark:#4A57C4; --turq:#20BBE6;
  --bg:#FFFFFF; --card:#F4F5FA; --card-2:#EEF0F8; --soft:#EEF0FD;
  --border:#E7E9F0; --border-strong:#D7DBE8;
  --gold:#B8860B; --gold-bg:#FEF6E0; --gold-border:#F3DFA8;
  --grad:linear-gradient(135deg,#5D6CDB 0%,#20BBE6 100%);
  --r:12px; --r-lg:18px; --r-xl:26px;
  --sh-soft:0 1px 2px rgba(96,105,130,.05),0 1px 3px rgba(96,105,130,.07);
  --sh-card:0 1px 2px rgba(96,105,130,.05),0 6px 16px rgba(96,105,130,.10);
  --sh-hi:0 2px 4px rgba(96,105,130,.06),0 14px 34px rgba(96,105,130,.16);
  --maxw:1140px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{
  font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  background:var(--bg); color:var(--ink);
  font-size:17px; line-height:1.65; -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}
img{max-width:100%;display:block}
a{color:inherit}
.wrap{width:100%;max-width:var(--maxw);margin:0 auto;padding:0 20px}
.narrow{max-width:760px;margin-left:auto;margin-right:auto}
section{padding:clamp(56px,7vw,104px) 0}
.alt{background:var(--card)}

/* ---------- typographie ---------- */
h1,h2,h3{line-height:1.15;letter-spacing:-.022em;font-weight:800}
h1{font-size:clamp(2.1rem,5.4vw,3.6rem)}
h2{font-size:clamp(1.75rem,4vw,2.65rem)}
h3{font-size:clamp(1.15rem,2.2vw,1.4rem);font-weight:700;letter-spacing:-.012em}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.eyebrow{
  display:inline-block;font-size:.76rem;font-weight:700;letter-spacing:.13em;
  text-transform:uppercase;color:var(--primary);
  background:var(--soft);padding:7px 14px;border-radius:999px;margin-bottom:18px;
}
.lead{font-size:clamp(1.02rem,1.7vw,1.18rem);color:var(--ink-soft)}
p+p{margin-top:16px}
.punch{font-size:clamp(1.2rem,2.5vw,1.55rem);font-weight:700;letter-spacing:-.015em;line-height:1.35}
.small{font-size:.87rem;color:var(--ink-faint)}
.center{text-align:center}
.mt8{margin-top:8px}.mt16{margin-top:16px}.mt24{margin-top:24px}
.mt32{margin-top:32px}.mt48{margin-top:48px}

/* ---------- boutons ---------- */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;
  font-family:inherit;font-size:1.02rem;font-weight:700;letter-spacing:-.01em;
  padding:16px 30px;border-radius:999px;border:0;cursor:pointer;
  text-decoration:none;transition:transform .18s ease,box-shadow .18s ease,background .18s ease;
}
.btn-p{background:var(--grad);color:#fff;box-shadow:0 8px 22px rgba(93,108,219,.30)}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(93,108,219,.40)}
.btn-o{background:#fff;color:var(--primary);border:1.5px solid var(--border-strong)}
.btn-o:hover{border-color:var(--primary);background:var(--soft)}
.btn-w{background:#fff;color:var(--primary);box-shadow:0 8px 22px rgba(20,25,60,.20)}
.btn-w:hover{transform:translateY(-2px)}
.btn-sm{padding:11px 20px;font-size:.92rem}
.reassure{font-size:.88rem;color:var(--ink-faint);margin-top:14px}
.linkish{
  display:inline-flex;align-items:center;gap:7px;color:var(--primary);
  font-weight:600;font-size:.96rem;text-decoration:none;border-bottom:1.5px solid transparent;
}
.linkish:hover{border-bottom-color:var(--primary)}

/* ---------- barre d'annonce + entête ---------- */
.annonce{background:var(--grad);color:#fff;font-size:.9rem;font-weight:500}
.annonce .wrap{display:flex;align-items:center;justify-content:center;gap:14px;
  flex-wrap:wrap;padding-top:11px;padding-bottom:11px;text-align:center}
.annonce b{font-weight:700}
.annonce a{
  color:#fff;text-decoration:none;font-weight:700;white-space:nowrap;
  border:1.5px solid rgba(255,255,255,.55);border-radius:999px;padding:4px 14px;
  transition:background .18s ease;
}
.annonce a:hover{background:rgba(255,255,255,.18)}
header.site{
  position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);
  backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--border);
}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;
  padding-top:13px;padding-bottom:13px;gap:16px}
header.site img{height:34px;width:auto}

/* ---------- cartes ---------- */
.card{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);
  padding:26px;box-shadow:var(--sh-soft)}
.alt .card{background:#fff}
.grid{display:grid;gap:20px}
.g2{grid-template-columns:repeat(auto-fit,minmax(330px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.pain{transition:transform .2s ease,box-shadow .2s ease}
.pain:hover{transform:translateY(-3px);box-shadow:var(--sh-card)}
.pain .ico{font-size:1.9rem;line-height:1;margin-bottom:14px;display:block}
.pain h3{margin-bottom:9px}
.pain p{color:var(--ink-soft);font-size:.97rem}

/* ---------- avis ---------- */
.avis{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);
  padding:24px;box-shadow:var(--sh-soft);display:flex;flex-direction:column;gap:16px}
.avis .txt{font-size:.98rem;color:var(--ink);line-height:1.6}
.avis .who{display:flex;align-items:center;gap:12px;margin-top:auto}
.avis .who img,.avis .who .ini{width:44px;height:44px;border-radius:999px;flex:0 0 44px;object-fit:cover}
.avis .who .ini{background:var(--grad);color:#fff;display:flex;align-items:center;
  justify-content:center;font-weight:700;font-size:1rem}
.avis .nom{font-weight:700;font-size:.95rem;line-height:1.3}
.avis .job{font-size:.82rem;color:var(--ink-faint);line-height:1.3}
.stars{color:#F5A623;font-size:.95rem;letter-spacing:2px;line-height:1}

/* ---------- encadrés ---------- */
.callout{border-radius:var(--r-xl);padding:clamp(26px,4vw,40px);
  background:var(--soft);border:1px solid #DCE0FA}
.callout .ico{font-size:2rem;line-height:1;display:block;margin-bottom:14px}
.callout h3{margin-bottom:14px;font-size:clamp(1.25rem,2.4vw,1.55rem)}
.callout p{color:var(--ink-soft)}
.gift{background:var(--gold-bg);border-color:var(--gold-border)}
.gift h3{color:#8A6508}
.gift ul{list-style:none;margin-top:6px}
.gift li{padding:9px 0 9px 32px;position:relative;color:#5E4A12;font-size:1rem;
  border-bottom:1px dashed rgba(184,134,11,.25)}
.gift li:last-child{border-bottom:0}
.gift li::before{content:"✓";position:absolute;left:0;top:9px;color:var(--gold);font-weight:800}

/* ---------- stat ---------- */
.stat{display:grid;grid-template-columns:auto 1fr;gap:clamp(20px,4vw,40px);
  align-items:center;border-radius:var(--r-xl);padding:clamp(26px,4vw,42px);
  background:#fff;border:1px solid var(--border);box-shadow:var(--sh-card)}
.stat .num{font-size:clamp(3rem,8vw,4.8rem);font-weight:800;letter-spacing:-.04em;line-height:1}

/* ---------- tableaux ---------- */
.tablebox{overflow-x:auto;border:1px solid var(--border);border-radius:var(--r-lg);
  background:#fff;box-shadow:var(--sh-soft);-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:.94rem}
th,td{padding:15px 16px;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}
thead th{background:#1F2757;color:#fff;font-weight:700;font-size:.84rem;
  letter-spacing:.03em;text-transform:uppercase;border-bottom:0}
thead th:first-child{border-top-left-radius:var(--r-lg)}
thead th:last-child{border-top-right-radius:var(--r-lg)}
tbody tr:last-child td{border-bottom:0}
tbody tr:nth-child(even){background:#FAFBFE}
td.hi{color:var(--primary);font-weight:700}
td:first-child{font-weight:600}
.tag{display:inline-block;background:var(--soft);color:var(--primary);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;
  font-weight:600;padding:4px 10px;border-radius:7px;white-space:nowrap}
.scrollhint{font-size:.82rem;color:var(--ink-faint);margin-top:10px}

/* ---------- étapes ---------- */
.step{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);
  padding:28px 26px;box-shadow:var(--sh-soft);position:relative;overflow:hidden}
.step::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:var(--grad)}
.step .n{width:42px;height:42px;border-radius:999px;background:var(--grad);color:#fff;
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;
  margin-bottom:16px}
.step h3{margin-bottom:10px}
.step p{color:var(--ink-soft);font-size:.97rem}
.step .badge{display:inline-block;margin-top:16px;font-size:.8rem;font-weight:700;
  color:var(--primary);background:var(--soft);padding:6px 13px;border-radius:999px}

/* ---------- essai ---------- */
.try{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:24px}
.try-col{background:#fff;border:1px solid var(--border);border-radius:var(--r-xl);
  padding:clamp(24px,3.4vw,34px);box-shadow:var(--sh-card);display:flex;flex-direction:column}
.field{width:100%;font-family:inherit;font-size:1rem;color:var(--ink);
  padding:15px 17px;border:1.5px solid var(--border-strong);border-radius:var(--r);
  background:#FCFCFE;transition:border-color .18s ease,box-shadow .18s ease}
.field:focus{outline:0;border-color:var(--primary);box-shadow:0 0 0 4px rgba(93,108,219,.14)}
.field::placeholder{color:#A3A8C2}
.videoframe{position:relative;width:100%;aspect-ratio:16/9;border-radius:var(--r);
  background:linear-gradient(135deg,#232B5C,#3A4693);display:flex;align-items:center;
  justify-content:center;overflow:hidden;border:1px solid var(--border)}
.playbtn{width:68px;height:68px;border-radius:999px;background:rgba(255,255,255,.95);
  display:flex;align-items:center;justify-content:center;box-shadow:0 8px 26px rgba(0,0,0,.28)}
.playbtn::after{content:"";border-left:19px solid var(--primary);border-top:12px solid transparent;
  border-bottom:12px solid transparent;margin-left:5px}
.videoframe span{position:absolute;bottom:14px;left:16px;color:rgba(255,255,255,.72);
  font-size:.8rem;font-weight:500}

.outlist{list-style:none;margin-top:20px;border-top:1px solid var(--border);padding-top:16px}
.outlist li{position:relative;padding:7px 0 7px 26px;font-size:.93rem;color:var(--ink-soft)}
.outlist li::before{content:"→";position:absolute;left:0;top:7px;color:var(--primary);font-weight:700}

/* ---------- tarifs ---------- */
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
  gap:22px;align-items:start}
.plan{background:#fff;border:1px solid var(--border);border-radius:var(--r-xl);
  padding:30px 26px;box-shadow:var(--sh-soft);display:flex;flex-direction:column;height:100%}
.plan.feat{border:2px solid var(--primary);box-shadow:var(--sh-hi);position:relative}
.plan .ribbon{position:absolute;top:-13px;left:50%;transform:translateX(-50%);
  background:var(--grad);color:#fff;font-size:.74rem;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;padding:6px 16px;border-radius:999px;white-space:nowrap}
.plan .pname{font-size:1.05rem;font-weight:700}
.plan .price{font-size:2.3rem;font-weight:800;letter-spacing:-.035em;margin:8px 0 2px}
.plan .per{font-size:.9rem;color:var(--ink-faint)}
.plan ul{list-style:none;margin:20px 0 24px}
.plan li{position:relative;padding:8px 0 8px 27px;font-size:.95rem;color:var(--ink-soft)}
.plan li::before{content:"✓";position:absolute;left:0;top:8px;color:var(--primary);font-weight:800}
.plan .intro{font-size:.9rem;font-weight:600;color:var(--ink);margin-top:18px}
.plan .btn{width:100%;margin-top:auto}
.offert{background:var(--gold-bg);border:1px solid var(--gold-border);color:#7A5806;
  font-size:.86rem;font-weight:700;border-radius:var(--r);padding:11px 14px;
  margin-bottom:18px;display:flex;gap:9px;align-items:flex-start;line-height:1.4}

/* ---------- objections / faq ---------- */
.obj{background:#fff;border:1px solid var(--border);border-left:4px solid var(--primary);
  border-radius:var(--r);padding:22px 24px;box-shadow:var(--sh-soft)}
.obj .q{font-weight:700;font-size:1.04rem;margin-bottom:9px}
.obj .a{color:var(--ink-soft);font-size:.97rem}
details.faq{background:#fff;border:1px solid var(--border);border-radius:var(--r);
  margin-bottom:12px;overflow:hidden;box-shadow:var(--sh-soft)}
details.faq summary{
  list-style:none;cursor:pointer;padding:19px 56px 19px 22px;font-weight:600;
  font-size:1.02rem;position:relative;transition:background .16s ease}
details.faq summary::-webkit-details-marker{display:none}
details.faq summary:hover{background:#FAFBFE}
details.faq summary::after{content:"";position:absolute;right:24px;top:26px;
  width:9px;height:9px;border-right:2.4px solid var(--primary);
  border-bottom:2.4px solid var(--primary);transform:rotate(45deg);
  transition:transform .22s ease}
details.faq[open] summary::after{transform:rotate(-135deg);top:30px}
details.faq .body{padding:0 22px 21px;color:var(--ink-soft);font-size:.97rem}

/* ---------- sections foncées ---------- */
.dark{background:linear-gradient(150deg,#1D2450 0%,#2C3673 55%,#1E4E77 100%);color:#fff}
.dark h2,.dark h3{color:#fff}
.dark p{color:rgba(255,255,255,.80)}
.dark .eyebrow{background:rgba(255,255,255,.14);color:#fff}
.dark .small{color:rgba(255,255,255,.60)}
.dark .punch{color:#fff}
.dark .gift{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.22)}
.dark .gift h3{color:#FFD87A}
.dark .gift li{color:rgba(255,255,255,.88);border-bottom-color:rgba(255,255,255,.14)}
.dark .gift li::before{color:#FFD87A}
.counter{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:11px 20px;
  font-size:.94rem;font-weight:600;color:#fff}

/* ---------- Béné ---------- */
.bene{display:grid;grid-template-columns:auto 1fr;gap:clamp(22px,4vw,44px);align-items:start}
.bene img{width:clamp(110px,15vw,168px);height:clamp(110px,15vw,168px);border-radius:999px;
  object-fit:cover;box-shadow:var(--sh-hi);border:5px solid #fff}

/* ---------- divers ---------- */
.pills{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.pill{background:#fff;border:1px solid var(--border);border-radius:999px;
  padding:9px 17px;font-size:.9rem;font-weight:600;box-shadow:var(--sh-soft)}
.pill.soon{color:var(--ink-faint);font-weight:500;background:transparent;box-shadow:none;
  border-style:dashed}
footer.site{background:#161C40;color:rgba(255,255,255,.62);
  padding:44px 0;font-size:.88rem;text-align:center}
footer.site img{height:30px;margin:0 auto 18px;opacity:.92}
footer.site a{color:rgba(255,255,255,.82);text-decoration:none}
footer.site a:hover{text-decoration:underline}

/* ---------- apparition ---------- */
.rv{opacity:0;transform:translateY(22px);
  transition:opacity .6s cubic-bezier(.22,.8,.3,1),transform .6s cubic-bezier(.22,.8,.3,1)}
.rv.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .rv{opacity:1;transform:none;transition:none}
  .btn:hover,.pain:hover{transform:none}
}
@media (max-width:640px){
  body{font-size:16px}
  .bene{grid-template-columns:1fr;justify-items:center;text-align:center}
  .stat{grid-template-columns:1fr;text-align:center}
  header.site .btn{display:none}
  .btn{width:100%}
  .hero-cta .btn{width:auto}
}`;

/** Tout ce qui précède la démo. */
export const HAUT = `

<!-- ══ BLOC 0 · barre d'annonce ══ -->
<div class="annonce">
  <div class="wrap">
    <span>🎁 <b>L'Atelier du Quiz (47 €) offert</b> si tu passes sur un plan payant dans tes 7 premiers jours.</span>
    <a href="#atelier">J'en profite →</a>
  </div>
</div>

<header class="site">
  <div class="wrap">
    <img src="/logo-tiquiz.webp" alt="Tiquiz" width="360" height="186" style="height:36px;width:auto">
    <a class="btn btn-p btn-sm" href="#tarifs">Créer mon quiz&nbsp;gratuitement</a>
  </div>
</header>

<!-- ══ BLOC 1 · haut de page ══ -->
<section style="padding-top:clamp(44px,6vw,78px)">
  <div class="wrap narrow center">
    <span class="eyebrow rv">Générateur de quiz connecté à ton autorépondeur</span>
    <h1 class="rv">Tu attires des curieux.<br><span class="grad">Il te faut des clients.</span></h1>
    <p class="lead mt24 rv">Tiquiz pose les bonnes questions à ta place. Ton visiteur répond parce que ça parle de lui, il repart avec un résultat qu'il a envie de lire, et toi tu récupères son adresse, son profil et son tag. Directement dans ton autorépondeur (Systeme.io, GoHighLevel, et d'autres à venir).</p>
    <p class="punch mt32 rv">Une liste emails qui grandit et se segmente seule.<br>Pendant que tu fais autre chose.</p>
    <p class="small mt16 rv">Si tu as une offre, un peu de trafic, et une liste qui ne te répond pas, tu es au bon endroit.</p>
    <div class="mt32 hero-cta rv">
      <a class="btn btn-p" href="#tarifs">Créer mon premier quiz&nbsp;gratuitement&nbsp;→</a>
      <p class="reassure">Gratuit · sans carte bancaire · sans limite de durée</p>
      <p class="mt16"><a class="linkish" href="#essai">Voir l'IA écrire un quiz, tout de suite ↓</a></p>
    </div>
  </div>
</section>

<!-- ══ BLOC 2 · la preuve, tout de suite ══ -->
<section style="padding-top:clamp(20px,3vw,36px)">
  <div class="wrap">
    <div class="grid g3">
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« Super outil ! Très simple d'utilisation, et surtout : le quiz punaise mais c'est le meilleur lead magnet aujourd'hui ! Je suis fan, voilà. Merci Béné pour ce bijou ! »</p>
        <div class="who"><img src="/apercu-landing/18b6da36a6e6.jpg" alt=""><div><div class="nom">Adeline</div><div class="job">Thérapeute</div></div></div>
      </div>
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« Les quiz Tiquiz sont puissants et ultra simples à créer. La segmentation automatique des leads, c'est exactement ce dont j'avais besoin. »</p>
        <div class="who"><img src="/apercu-landing/0edc716a3f69.jpg" alt=""><div><div class="nom">Thibault L.</div><div class="job">Consultant</div></div></div>
      </div>
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« Franchement, je suis bluffé. J'ai pris le temps de créer mon premier quiz et le résultat est tout simplement topissime. Bravo ! »</p>
        <div class="who"><img src="/apercu-landing/dbb4fff0778a.jpg" alt=""><div><div class="nom">Sylvère M.</div><div class="job">Entrepreneur</div></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ══ BLOC 3 · l'écran qui remue ══ -->
<section class="alt">
  <div class="wrap">
    <div class="narrow center">
      <span class="eyebrow rv">Le vrai problème</span>
      <h2 class="rv">Ton contenu marche.<br><span class="grad">C'est après que tout part en live.</span></h2>
      <p class="lead mt24 rv">Tu as passé ta soirée sur ce post. Il a bien tourné : des vues, des commentaires, deux personnes qui ont écrit que c'était exactement ce dont elles avaient besoin. Le lendemain matin tu ouvres tes statistiques d'inscription.</p>
      <p class="rv" style="font-size:clamp(3rem,9vw,5rem);font-weight:800;letter-spacing:-.04em;margin:26px 0 18px;line-height:1">Zéro.</p>
      <p class="lead rv">Le trafic est venu. Il n'a rien laissé derrière lui. Et la semaine prochaine, il faudra recommencer, parce que rien de ce que tu as fait hier ne travaille encore pour toi aujourd'hui.</p>
    </div>

    <div class="grid g3 mt48">
      <div class="card pain rv"><span class="ico">🎣</span><h3>Des curieux, pas des clients</h3><p>Ils téléchargent, ils s'inscrivent, ils ne répondent jamais. Tu as des adresses, tu n'as pas d'acheteurs. Et tu n'as aucun moyen de savoir lesquels sont lesquels.</p></div>
      <div class="card pain rv"><span class="ico">📭</span><h3>Une liste qui ne répond plus</h3><p>Tu écris, tu soignes l'objet, tu envoies. Silence. Alors tu te dis que l'email ne marche plus, alors qu'en vrai tu parles à quinze personnes différentes avec la même phrase.</p></div>
      <div class="card pain rv"><span class="ico">📄</span><h3>Le PDF que plus personne ne veut</h3><p>Il y a quelques années, un guide contre une adresse, ça passait. Aujourd'hui ton visiteur sait très bien qu'il ne le lira pas. Alors il ne le prend même plus.</p></div>
      <div class="card pain rv"><span class="ico">🧰</span><h3>La pile d'outils qui te prend tes soirées</h3><p>Un outil pour le formulaire, un autre pour les emails, un troisième au milieu pour les faire se parler. Trois abonnements, des réglages à reprendre à chaque changement, et un mardi soir où ça casse sans prévenir.</p></div>
      <div class="card pain rv"><span class="ico">🌫️</span><h3>Aucune idée d'où ça bloque</h3><p>Du trafic, pas de ventes. C'est la page ? Le formulaire ? L'email ? L'offre ? Tu changes un truc, tu attends une semaine, tu recommences. Au feeling.</p></div>
      <div class="card pain rv"><span class="ico">🕐</span><h3>Et personne à côté de toi</h3><p>Pas d'équipe, pas de développeur, pas de budget pour en payer un. Chaque outil à apprendre, c'est une soirée que tu ne passes pas à vendre. Et des soirées, tu n'en as plus beaucoup.</p></div>
    </div>

    <div class="callout mt48 narrow rv">
      <span class="ico">💡</span>
      <h3>Le problème, ce n'est pas toi.</h3>
      <p>On t'a dit : fais un lead magnet. Tu l'as fait. On t'a dit : mets un formulaire. Tu l'as mis. On t'a dit : connecte-le à ton autorépondeur, il y a un service pour ça, une trentaine de dollars par mois.</p>
      <p>Personne ne t'a dit ce qui manquait vraiment : la pièce qui demande à ton visiteur qui il est, et qui le range au bon endroit sans que tu y touches.</p>
      <p class="punch mt24" style="color:var(--ink)">Ce n'est pas un outil de plus. C'est celui qui en remplace trois.</p>
    </div>
  </div>
</section>

<!-- ══ BLOC 4 · essaie maintenant ══ -->
`;

/** Tout ce qui la suit. */
export const BAS = `<!-- ══ BLOC 5 · la bascule ══ -->
<section class="alt">
  <div class="wrap">
    <div class="narrow center">
      <h2 class="rv">Tu n'as pas besoin de créer plus de contenu.<br><span class="grad">Tu as besoin de poser les bonnes questions.</span></h2>
      <p class="punch mt32 rv">Un PDF parle. Un quiz écoute.</p>
      <p class="lead mt24 rv">Celui qui télécharge ton guide te laisse une adresse et rien d'autre. Tu ne sais pas où il en est, ce qu'il cherche, ni ce que tu pourrais lui vendre. Il entre dans ta liste exactement comme les trois cents autres, et il recevra exactement les mêmes emails qu'eux.</p>
      <p class="lead rv">Celui qui répond à cinq questions te dit tout ça sans que tu aies eu à le lui demander. Son niveau, son blocage, son budget, son urgence. Et il te le dit volontiers, parce qu'il veut son résultat.</p>
      <p class="punch mt32 rv">Le même visiteur. Deux fois plus d'informations.<br>Et cette fois, tu sais quoi lui écrire.</p>
    </div>

    <div class="stat mt48 narrow rv">
      <div class="num grad">44,9 %</div>
      <div>
        <p class="lead">des personnes qui commencent un quiz laissent leur email, dans la catégorie coaching et formation. Va regarder le taux de ta dernière page de capture, et compare. Même trafic, même effort pour l'attirer, et ce n'est pas du tout le même nombre d'adresses à la fin.</p>
        <p class="small mt16">Rapport Interact sur les taux de conversion des quiz. Ce n'est pas un taux de page : c'est le taux mesuré à partir du moment où le quiz est commencé.</p>
      </div>
    </div>
  </div>
</section>

<!-- ══ BLOC 6 · le mécanisme, montré ══ -->
<section>
  <div class="wrap">
    <div class="narrow center">
      <h2 class="rv">Un seul quiz. Trois personnes.<br><span class="grad">Trois chemins différents.</span></h2>
      <p class="lead mt24 rv">Tes prospects n'ont ni le même niveau, ni le même problème, ni la même urgence. Jusqu'ici tu leur envoyais la même chose à tous, parce que tu n'avais aucun moyen de faire autrement. Regarde ce qui se passe avec un quiz.</p>
    </div>

    <div class="tablebox mt48 rv">
      <table>
        <thead><tr><th>Il répond</th><th>Il obtient</th><th>Son bouton l'envoie</th><th>Le tag qui part dans ton autorépondeur</th></tr></thead>
        <tbody>
          <tr><td>« Je démarre tout juste »</td><td>Tu poses les bases</td><td>Vers ton offre d'entrée</td><td><span class="tag">profil-debutant</span></td></tr>
          <tr><td>« Quelques dizaines de contacts »</td><td>Tu as une liste, pas encore de rythme</td><td>Vers ton accompagnement</td><td><span class="tag">profil-liste-tiede</span></td></tr>
          <tr><td>« Plusieurs centaines de contacts »</td><td>Tu as l'audience, il manque l'offre</td><td>Vers ton offre haute</td><td><span class="tag">profil-audience</span></td></tr>
        </tbody>
      </table>
    </div>
    <p class="scrollhint rv">Fais glisser le tableau vers la droite sur mobile.</p>

    <div class="narrow mt32">
      <p class="lead rv">Le tag part avec le contact. Si tu ne l'avais pas créé, Tiquiz le crée. Tes automatisations démarrent toutes seules, chacune sur son profil.</p>
      <p class="punch mt24 rv">Tu n'as ouvert aucun autre outil. Tu n'as rien recopié. Tu n'as rien vérifié.</p>
      <div class="avis mt32 rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« Tiquiz m'a vraiment aidé à clarifier mes idées pour qualifier mes prospects. Mes leads sont tagués automatiquement dans Systeme.io, un vrai gain de temps. »</p>
        <div class="who"><img src="/apercu-landing/c9be02bcfa3a.jpg" alt=""><div><div class="nom">Bernard C.</div><div class="job">Consultant</div></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ══ BLOC 7 · comment ça se passe ══ -->
<section class="alt">
  <div class="wrap">
    <div class="narrow center">
      <span class="eyebrow rv">Trois étapes</span>
      <h2 class="rv">Rien à installer.<br><span class="grad">Si tu sais copier un lien, tu sais publier un quiz.</span></h2>
    </div>
    <div class="grid g3 mt48">
      <div class="step rv"><div class="n">1</div><h3>Tu dis à qui tu parles</h3><p>Ton sujet, ton audience, ce que le quiz doit servir. L'IA écrit les questions, les options et les profils de résultat. Tu relis, tu remplaces deux ou trois formulations par les tiennes, tu mets ton logo et tes couleurs. Et si l'IA ne te tente pas, tu importes un quiz existant ou tu écris tout toi-même.</p><span class="badge">Quelques minutes</span></div>
      <div class="step rv"><div class="n">2</div><h3>Tu le mets là où tes visiteurs passent</h3><p>Un lien à coller dans ta bio, en fin d'article, dans un tunnel, dans ta signature d'email. Ou un embed sur ta page. Ou ton propre nom de domaine, si tu veux qu'il ait l'air d'être chez toi.</p><span class="badge">Une URL, ou un embed</span></div>
      <div class="step rv"><div class="n">3</div><h3>Tu connectes ton système, une fois</h3><p>Tu relies ton compte à ton autorépondeur en suivant un écran qui te tient la main, tu choisis où partent tes leads, et c'est réglé pour tous tes quiz. Tu peux changer de destination quiz par quiz si tu gères plusieurs projets.</p><span class="badge">Une fois, et c'est réglé</span></div>
    </div>
    <div class="center mt48">
      <p class="punch rv">Ensuite, ça tourne. Y compris les jours où tu te reposes,<br>et ceux où tu es à fond sur ton cœur de métier.</p>
      <div class="mt32 rv"><a class="btn btn-p" href="#tarifs">Créer mon premier quiz →</a></div>
    </div>
  </div>
</section>

<!-- ══ BLOC 8 · le comparatif ══ -->
<section>
  <div class="wrap">
    <div class="narrow center">
      <span class="eyebrow rv">Pourquoi pas un autre</span>
      <h2 class="rv">Ils font tous de très bons quiz.<br><span class="grad">La question, c'est ce qui se passe après.</span></h2>
      <p class="lead mt24 rv">Quelqu'un doit créer le contact dans ton autorépondeur et poser le bon tag dessus. Chez les autres, ce quelqu'un est un troisième service, que tu paies, que tu configures, et qui tombe en panne sans te prévenir.</p>
    </div>

    <div class="tablebox mt48 rv">
      <table>
        <thead><tr><th></th><th>Tiquiz</th><th>Typeform</th><th>Interact</th><th>Google Forms, Tally</th></tr></thead>
        <tbody>
          <tr><td>Le lead arrive dans ton autorépondeur</td><td class="hi">En direct</td><td>Via Zapier</td><td>Via Zapier Pro</td><td>Via un intermédiaire</td></tr>
          <tr><td>Le tag est posé tout seul</td><td class="hi">Oui, et créé s'il manque</td><td>Selon ton Zap</td><td>Un Zap et un tag à créer par résultat</td><td>Non</td></tr>
          <tr><td>Le quiz est écrit pour toi</td><td class="hi">Oui, par IA</td><td>Non</td><td>Partiel</td><td>Non</td></tr>
          <tr><td>Interface en français</td><td class="hi">Oui, et six autres langues</td><td>Oui</td><td>Non</td><td>Oui</td></tr>
          <tr><td>Ce que ça coûte par mois</td><td class="hi">17 €</td><td>79 $ plus 29,99 $ de Zapier</td><td>Son prix plus 29,99 $ de Zapier</td><td>0 €, et tout à la main</td></tr>
          <tr><td>Un plan gratuit sans carte</td><td class="hi">Oui, sans limite de durée</td><td>Limité</td><td>Limité</td><td>Oui</td></tr>
        </tbody>
      </table>
    </div>
    <p class="scrollhint rv">Fais glisser le tableau vers la droite sur mobile.</p>

    <div class="narrow mt32">
      <p class="lead rv">La documentation d'Interact le dit elle-même : il faut créer un tag dans Systeme.io pour chaque résultat de quiz, sans quoi il n'apparaît pas comme option dans Zapier. Un quiz à quatre profils, ce sont quatre tags à créer à la main, puis quatre Zaps à monter. Avant d'avoir capturé un seul lead.</p>

      <div class="callout mt32 rv">
        <span class="ico">🧮</span>
        <h3>108,99 $ par mois, ou 17 €.</h3>
        <p>Typeform Plus est à 79 $ par mois, Zapier Professional à 29,99 $ en paiement mensuel. Sur cinq ans, ça fait plus de 6 500 $. Tiquiz en annuel, sur la même durée : 850 €.</p>
        <p>Et l'argent n'est pas le pire. Le pire, c'est la chaîne qui casse un soir sans rien dire, et les leads qui tombent dedans pendant trois jours.</p>
      </div>

      <p class="small mt24 rv">En août 2026, parmi les huit outils comparés, Tiquiz est le seul qui crée le contact et pose les tags tout seul, sans passer par un service en plus.</p>

      <div class="avis mt32 rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« Meilleur outil de quiz pour segmenter et convertir. La connexion directe avec Systeme.io change tout. Plus besoin de bidouiller des intégrations. »</p>
        <div class="who"><img src="/apercu-landing/3eb14d1525bf.jpg" alt=""><div><div class="nom">Maulisio T.</div><div class="job">Marketeur</div></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ══ BLOC 9 · ton autorépondeur à toi ══ -->
<section class="alt">
  <div class="wrap narrow">
    <div class="center">
      <h2 class="rv">Tu n'es sur aucun des deux ?<br><span class="grad">Lis quand même.</span></h2>
    </div>
    <p class="lead mt32 rv">Tiquiz fonctionne tout seul. Tes leads sont dans ton compte, tu les exportes quand tu veux, et tes quiz tournent sans qu'aucun autre outil soit connecté.</p>
    <p class="lead rv">Ce qui change avec une destination connectée, c'est que tu arrêtes d'exporter. Le contact est créé et tagué à la seconde où ton visiteur voit son résultat. Aujourd'hui ça marche avec Systeme.io et avec GoHighLevel, et les noms de tags sont les mêmes des deux côtés : si tu changes d'outil un jour, tes recettes d'automatisation ne changent pas.</p>
    <p class="lead rv">Brevo, ClickFunnels et Podia sont en cours d'ajout, et d'autres suivront. En attendant, tu peux déjà tout faire : tes quiz tournent, tes leads sont dans ton compte, et tu les exportes quand tu veux.</p>
    <div class="pills rv">
      <span class="pill">✅ Systeme.io</span>
      <span class="pill">✅ GoHighLevel</span>
      <span class="pill soon">Brevo · bientôt</span>
      <span class="pill soon">ClickFunnels · bientôt</span>
      <span class="pill soon">Podia · bientôt</span>
    </div>
  </div>
</section>

<!-- ══ BLOC 10 · la preuve, en grand ══ -->
<section>
  <div class="wrap">
    <div class="narrow center">
      <span class="eyebrow rv">Ils s'en servent</span>
      <h2 class="rv">Des gens seuls, avec un ordinateur<br><span class="grad">et une liste à faire grossir.</span></h2>
    </div>
    <div class="grid g3 mt48">
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« J'utilise Tiquiz pour mon quiz de diagnostic client, connecté à System.io avec des séquences emails segmentées par profil. La connexion est propre, les tags s'appliquent automatiquement, et l'interface est suffisamment intuitive pour qu'on configure tout sans développeur. Pour quelqu'un qui opère seul et qui veut un funnel de capture qui tourne sans surveillance, Tiquiz fait exactement ce qu'il promet. »</p>
        <div class="who"><span class="ini">MM</span><div><div class="nom">Maurice Massolin</div><div class="job">Coach pour femmes entrepreneures · Trustpilot</div></div></div>
      </div>
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« As-tu déjà galéré à créer un quiz, à gérer les résultats qui en découlent, à le rattacher à une campagne d'emails ? Moi oui, jusqu'à ce que je découvre Tiquiz. Il fait tout ça. Tu as seulement besoin de lui préciser à qui tu souhaites adresser le quiz, ce à quoi il doit servir et quel résultat tu aimerais obtenir. Et le tour est joué : tu obtiens un quiz qualitatif. Bref, une pépite. Je recommande à 100 % »</p>
        <div class="who"><img src="/apercu-landing/09537be496ce.jpg" alt=""><div><div class="nom">Monique Pulby</div><div class="job">Formatrice · Trustpilot</div></div></div>
      </div>
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« J'ai créé mes deux premiers quizz qui ont donné des résultats que je n'aurais jamais imaginés. Ce qui est fabuleux c'est que Tiquiz comble une lacune de System.io qui ne permet pas de faire des quiz. Ca fonctionne comme un rêve. »</p>
        <div class="who"><span class="ini">C</span><div><div class="nom">Christian</div><div class="job">Trustpilot</div></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ══ BLOC 11 · toi ══ -->
<section class="alt">
  <div class="wrap narrow">
    <div class="bene rv">
      <img src="/apercu-landing/6b1796be39aa.jpg" alt="Béné, créatrice de Tiquiz">
      <div>
        <h2>Derrière Tiquiz,<br><span class="grad">il y a une personne. Moi.</span></h2>
        <p class="lead mt24">Pas un support qui répond en quarante-huit heures avec un lien vers un article d'aide. Quand tu écris, c'est moi qui lis, et c'est moi qui réponds. Si tu trouves un bug, je le corrige. Si tu as une idée qui manque à l'outil, il y a de bonnes chances qu'elle y soit la semaine suivante : c'est comme ça que la moitié de ce que tu vois a été construite.</p>
        <p class="lead">J'ai développé Tiquiz parce que j'avais besoin de l'utiliser. Je m'en sers tous les jours pour mon propre business. Quand quelque chose ne va pas dedans, ça m'embête autant que toi.</p>
      </div>
    </div>
    <div class="grid g2 mt48">
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« Je remercie Béné pour avoir développer Tiquiz, pour sa présence, ses retours à mes questions, sa réactivité pour faire évoluer l'outil. »</p>
        <div class="who"><img src="/apercu-landing/571e518b7b69.jpg" alt=""><div><div class="nom">Eric Legrigeois</div><div class="job">Infopreneur · Trustpilot</div></div></div>
      </div>
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« L'outil s'améliore tous les jours. Les quiz connectés à Systeme.io, c'est exactement ce qu'il manquait. Si j'ai des suggestions, c'est avec plaisir ! »</p>
        <div class="who"><img src="/apercu-landing/fb1fcbe8ea47.jpg" alt=""><div><div class="nom">Alain M.</div><div class="job">Affilié</div></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ══ BLOC 12 · les sept jours ══ -->
<section class="dark" id="atelier">
  <div class="wrap narrow">
    <div class="center">
      <span class="eyebrow rv">Ta première semaine</span>
      <h2 class="rv">Le logiciel, tu l'as en trois minutes.<br>Savoir l'exploiter à fond, c'est une autre affaire.</h2>
    </div>
    <p class="lead mt32 rv" style="color:rgba(255,255,255,.80)">Tiquiz écrit ton quiz à ta place : les questions, les options, les profils de résultat, et dans le palier PLUS la séquence d'emails et le bonus qui vont avec. Ce qu'il ne fait pas à ta place, c'est tout ce qui entoure le quiz : d'où vient le trafic, ce qui s'automatise derrière, comment tu le fais circuler, et ce que tu vends au bout. Ça, c'est L'Atelier du Quiz.</p>
    <p class="lead rv" style="color:rgba(255,255,255,.80)">Sept jours, un par jour, sur ton vrai projet. Tu poses ce que ton quiz doit te rapporter, tu montes les automatisations qui vont accueillir tes leads, tu choisis ton format, tu connectes, tu organises le trafic qui l'alimente, et tu construis la vente qui vient après. Tes réponses se rassemblent au fur et à mesure dans un carnet de bord, si bien qu'au moment de lancer, la matière est déjà là, avec tes mots à toi.</p>
    <p class="lead rv" style="color:rgba(255,255,255,.80)">Et tu n'avances pas seul. Un Coach IA qui connaît ton carnet, ton quiz et ton avancement te débloque en une ligne, sans que tu aies à tout réexpliquer. Le Quiz Doctor passe ton quiz au contrôle technique avant que tu l'envoies au monde.</p>
    <p class="punch mt32 center rv">Tiquiz fait le quiz. L'Atelier fait le système autour.</p>

    <div class="callout gift mt48 rv">
      <span class="ico">🎁</span>
      <h3>L'Atelier du Quiz, 47 €, offert.</h3>
      <ul>
        <li>Les huit jours du parcours, du Jour 0 au Jour 7.</li>
        <li>Le carnet de bord qui s'écrit à partir de tes réponses.</li>
        <li>Le Coach IA qui connaît ton contexte.</li>
        <li>Le Quiz Doctor, qui vérifie ton quiz avant la mise en ligne.</li>
        <li>Les bonus : trafic payant, vendre avec un quiz, exploiter les sondages, exploiter les popquiz, promouvoir par le réseau.</li>
      </ul>
    </div>

    <div class="center mt48">
      <p class="lead rv" style="color:rgba(255,255,255,.88)">Tu passes sur un plan payant dans les sept jours qui suivent la création de ton compte. Peu importe lequel. L'Atelier s'ouvre dans ton espace.</p>
      <p class="small mt16 rv">Au huitième jour, ton plan coûte exactement le même prix. C'est le cadeau qui s'arrête, pas une promotion.</p>
      <p class="mt32 rv"><span class="counter">⏳ Ton compteur démarre à la création de ton compte, pas maintenant.</span></p>
      <div class="mt32 rv"><a class="btn btn-w" href="#tarifs">Créer mon compte et lancer mes&nbsp;7&nbsp;jours&nbsp;→</a></div>
    </div>
  </div>
</section>

<!-- ══ BLOC 13 · les tarifs ══ -->
<section id="tarifs">
  <div class="wrap">
    <div class="narrow center">
      <span class="eyebrow rv">Les formules</span>
      <h2 class="rv">Commence à zéro euro.<br><span class="grad">Monte le jour où ton quiz te rapporte plus qu'il ne coûte.</span></h2>
      <p class="lead mt24 rv">Un seul client signé grâce à ton quiz paie plusieurs mois d'abonnement. Et tant que ce client n'est pas arrivé, tu ne paies rien.</p>
    </div>

    <div class="plans mt48">
      <div class="plan rv">
        <div class="pname">Gratuit à vie</div>
        <div class="price">0 €</div>
        <div class="per">Sans carte bancaire, sans limite de durée</div>
        <ul>
          <li>1 quiz et 1 sondage actifs</li>
          <li>1 Popquiz</li>
          <li>10 réponses visibles sur 30 jours glissants, les suivantes sont capturées et floutées</li>
          <li>La connexion à ton autorépondeur et les tags automatiques, inclus</li>
          <li>Les modèles par métier, dès ce palier</li>
        </ul>
        <a class="btn btn-o" href="#">Créer mon compte</a>
      </div>

      <div class="plan feat rv">
        <span class="ribbon">Le plus choisi</span>
        <div class="pname">Tiquiz</div>
        <div class="price">17 €<span style="font-size:1rem;font-weight:600;color:var(--ink-faint)">/mois</span></div>
        <div class="per">ou 170 € par an</div>
        <div class="intro">Tout le gratuit, et en plus :</div>
        <ul>
          <li>Quiz, sondages et Popquiz illimités</li>
          <li>Réponses illimitées</li>
          <li>Ton quiz sans la mention Tiquiz, et ton propre pied de page</li>
        </ul>
        <div class="offert"><span>🎁</span><span>L'Atelier du Quiz (47 €) offert dans tes 7 premiers jours</span></div>
        <a class="btn btn-p" href="#">Passer à Tiquiz</a>
      </div>

      <div class="plan rv">
        <div class="pname">Tiquiz PLUS</div>
        <div class="price">29 €<span style="font-size:1rem;font-weight:600;color:var(--ink-faint)">/mois</span></div>
        <div class="per">ou 290 € par an</div>
        <div class="intro">Tout Tiquiz, et en plus :</div>
        <ul>
          <li>Multiprofils : un espace par client, sans mélanger les quiz ni les leads</li>
          <li>Analyse IA des résultats : leurs mots à eux, résumés, pour savoir quoi vendre ensuite</li>
          <li>Le compte de chaque client connecté à part, sans te déconnecter</li>
          <li>Les trois générateurs : le bonus, la séquence d'emails, les posts de promo</li>
        </ul>
        <div class="offert"><span>🎁</span><span>L'Atelier du Quiz (47 €) offert dans tes 7 premiers jours</span></div>
        <p class="small" style="margin-bottom:14px">Tu montes les quiz de tes clients ? C'est ce palier.</p>
        <a class="btn btn-o" href="#">Passer à Tiquiz PLUS</a>
      </div>
    </div>

    <p class="center small mt32 rv">Sans engagement · Aucune carte bancaire pour le plan gratuit · Annulation en 1 clic</p>

    <div class="narrow mt32">
      <div class="avis rv">
        <div class="stars">★★★★★</div>
        <p class="txt">« Un véritable couteau suisse pour générer des leads avec des quiz. Que tu sois débutant ou non, tu automatises tout ou presque. Je recommande à 1000% ! »</p>
        <div class="who"><img src="/apercu-landing/3f6be1a65dde.jpg" alt=""><div><div class="nom">Jérémy B.</div><div class="job">Entrepreneur</div></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ══ BLOC 14 · les objections ══ -->
<section class="alt">
  <div class="wrap narrow">
    <div class="center">
      <span class="eyebrow rv">Ce que tu es en train de te dire</span>
      <h2 class="rv">On va les prendre une par une.</h2>
    </div>
    <div class="grid mt48" style="gap:16px">
      <div class="obj rv"><div class="q">« Encore un outil à apprendre. »</div><div class="a">Celui-ci en remplace trois : ton créateur de formulaire, l'intermédiaire qui l'envoie vers ta liste, et le temps que tu passes à recopier. Et tu ne changes rien à ce que tu utilises déjà.</div></div>
      <div class="obj rv"><div class="q">« Moi et la technique, ça fait deux. »</div><div class="a">Rien à installer, aucune ligne de code, aucun réglage à deviner. Tu décris ton sujet, tu relis, tu publies. Le seul moment un peu technique, c'est de relier ton compte à ton autorépondeur, une seule fois, en suivant un écran qui te tient la main. Et il y a une vidéo de deux minutes si tu préfères regarder quelqu'un le faire avant.</div></div>
      <div class="obj rv"><div class="q">« Je n'ai pas assez de trafic pour que ça vaille le coup. »</div><div class="a">C'est quand le trafic est rare qu'il ne faut en perdre aucun. Un quiz ne fabrique pas de visiteurs, il garde ceux que tu as déjà. Avec deux cents visiteurs par mois, l'écart entre une page de capture et un quiz se compte en dizaines d'adresses, tous les mois, sur le même trafic.</div></div>
      <div class="obj rv"><div class="q">« Je ne veux pas faire de marketing agressif. »</div><div class="a">Un quiz ne force personne. Il pose des questions, il rend un résultat utile, et il propose la suite à celui qui la veut. Ton prospect n'a pas l'impression qu'on lui vend quelque chose, il a l'impression qu'on l'a écouté. C'est probablement la façon la plus polie de demander une adresse.</div></div>
      <div class="obj rv"><div class="q">« J'ai déjà testé d'autres trucs, ça n'a rien donné. »</div><div class="a">Alors ne me crois pas sur parole. Tu as généré un quiz plus haut sans même créer de compte. Publie-le, et regarde le nombre d'adresses au bout d'une semaine. C'est le seul argument qui compte, et c'est le tien.</div></div>
    </div>
    <div class="center mt48 rv"><a class="btn btn-p" href="#essai">D'accord, j'essaie →</a></div>
  </div>
</section>

<!-- ══ BLOC 15 · la FAQ ══ -->
<section>
  <div class="wrap narrow">
    <div class="center">
      <span class="eyebrow rv">On répond cash</span>
      <h2 class="rv">Les questions qui reviennent.</h2>
    </div>
    <div class="mt48">
      <details class="faq rv"><summary>Le plan gratuit, c'est un essai qui expire ?</summary><div class="body">Non. Pas de limite de durée, pas de carte bancaire. Tu es limité à un quiz, un sondage, un Popquiz et dix réponses visibles sur trente jours glissants. Au-delà, les réponses continuent d'être capturées et s'affichent floutées jusqu'à ce que tu passes à un plan payant. Rien n'est perdu, tout est en attente.</div></details>
      <details class="faq rv"><summary>Quels autorépondeurs sont connectés ?</summary><div class="body">Systeme.io et GoHighLevel aujourd'hui, en direct, sans intermédiaire. Brevo, ClickFunnels et Podia sont en cours d'ajout, et d'autres suivront. Et si tu utilises autre chose, Tiquiz fonctionne quand même : tes leads sont dans ton compte et tu les exportes quand tu veux.</div></details>
      <details class="faq rv"><summary>Combien de temps pour avoir mon premier quiz en ligne ?</summary><div class="body">Le temps de décrire ton sujet et de relire ce que l'IA a écrit. La partie longue, c'est la relecture, parce que c'est là que tu mets tes mots.</div></details>
      <details class="faq rv"><summary>Et si je ne sais pas quoi mettre dans mon quiz ?</summary><div class="body">C'est exactement ce que L'Atelier du Quiz règle, et c'est pour ça qu'il est offert pendant tes sept premiers jours. Le premier jour sert à définir ta transformation, tes profils de résultats et les mots exacts de ta cible.</div></details>
      <details class="faq rv"><summary>Il n'y a que les quiz ?</summary><div class="body">Il y a aussi les sondages, quand tu veux juste écouter ton audience sur une question précise, et les Popquiz, qui s'incrustent dans une vidéo pour capturer là où l'attention est déjà.</div></details>
      <details class="faq rv"><summary>Est-ce que je peux faire des branchements conditionnels ?</summary><div class="body">Non, et c'est volontaire. Tiquiz reste simple parce que son travail est de capturer et de trier. Si tu as besoin de deux niveaux, tu chaînes deux quiz : le premier capture et tague, puis chaque profil part vers un second quiz différent. L'avantage, c'est que le lead est déjà dans ta liste même s'il abandonne en route.</div></details>
      <details class="faq rv"><summary>Ça marche dans une autre langue que le français ?</summary><div class="body">L'interface existe en sept langues et l'IA écrit tes quiz dans plus de cent, variantes régionales comprises : un quiz en portugais du Brésil ne sort pas en portugais du Portugal. L'arabe s'affiche de droite à gauche.</div></details>
      <details class="faq rv"><summary>Je monte les quiz de plusieurs clients, c'est possible ?</summary><div class="body">Oui, avec le palier PLUS. Un espace par client, des quiz et des leads séparés, le compte de chaque client connecté à part, et tu passes de l'un à l'autre en un clic sans te déconnecter.</div></details>
      <details class="faq rv"><summary>Mes quiz sont-ils à ma marque ?</summary><div class="body">Ton logo, tes couleurs, ta police, ton nom de domaine. Et dès le plan payant, la mention Tiquiz disparaît et tu mets ton propre pied de page.</div></details>
      <details class="faq rv"><summary>Je peux annuler quand je veux ?</summary><div class="body">Oui, en un clic, depuis ton compte. Tu ne perds ni tes quiz ni tes leads, tu retombes sur les limites du plan gratuit.</div></details>
    </div>
  </div>
</section>

<!-- ══ BLOC 16 · la clôture ══ -->
<section class="dark">
  <div class="wrap narrow center">
    <h2 class="rv">Ton prochain visiteur arrive dans quelques minutes.<br>Tu le laisses repartir, ou tu lui poses une question ?</h2>
    <p class="lead mt32 rv" style="color:rgba(255,255,255,.80)">Crée ton compte, publie un quiz cet après-midi, et regarde ce qui arrive dans ta liste cette semaine. Ça ne coûte rien, ça ne demande pas de carte, et si ça ne te plaît pas tu fermes la page sans rien avoir engagé.</p>
    <p class="lead rv" style="color:rgba(255,255,255,.80)">Et si ça te plaît, tu as sept jours pour prendre un plan et repartir avec L'Atelier du Quiz.</p>
    <div class="mt32 rv"><a class="btn btn-w" href="#tarifs">Créer mon quiz&nbsp;gratuitement&nbsp;→</a></div>
    <p class="small mt16 rv">Gratuit · sans carte bancaire · accès immédiat</p>
  </div>
</section>

<footer class="site">
  <div class="wrap">
    <img src="/logo-tiquiz.webp" alt="Tiquiz" width="360" height="186" style="height:36px;width:auto">
    <p>Le quiz qui remplit ta liste et la trie toute seule.</p>
    <p style="margin-top:14px"><a href="https://tiquiz.fr">tiquiz.fr</a></p>
  </div>
</footer>



`;

/**
 * Les questions fréquentes, pour Google.
 *
 * Rendue dans une vraie balise `<script type="application/ld+json">` :
 * injectée par `innerHTML`, elle ne serait pas lue.
 */
export const FAQ_JSONLD = `{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Le plan gratuit, c'est un essai qui expire ?","acceptedAnswer":{"@type":"Answer","text":"Non. Pas de limite de durée, pas de carte bancaire. Tu es limité à un quiz, un sondage, un Popquiz et dix réponses visibles sur trente jours glissants. Au-delà, les réponses continuent d'être capturées et s'affichent floutées jusqu'à ce que tu passes à un plan payant. Rien n'est perdu, tout est en attente."}},{"@type":"Question","name":"Quels autorépondeurs sont connectés ?","acceptedAnswer":{"@type":"Answer","text":"Systeme.io et GoHighLevel aujourd'hui, en direct, sans intermédiaire. Brevo, ClickFunnels et Podia sont en cours d'ajout, et d'autres suivront. Et si tu utilises autre chose, Tiquiz fonctionne quand même : tes leads sont dans ton compte et tu les exportes quand tu veux."}},{"@type":"Question","name":"Combien de temps pour avoir mon premier quiz en ligne ?","acceptedAnswer":{"@type":"Answer","text":"Le temps de décrire ton sujet et de relire ce que l'IA a écrit. La partie longue, c'est la relecture, parce que c'est là que tu mets tes mots."}},{"@type":"Question","name":"Et si je ne sais pas quoi mettre dans mon quiz ?","acceptedAnswer":{"@type":"Answer","text":"C'est exactement ce que L'Atelier du Quiz règle, et c'est pour ça qu'il est offert pendant tes sept premiers jours. Le premier jour sert à définir ta transformation, tes profils de résultats et les mots exacts de ta cible."}},{"@type":"Question","name":"Il n'y a que les quiz ?","acceptedAnswer":{"@type":"Answer","text":"Il y a aussi les sondages, quand tu veux juste écouter ton audience sur une question précise, et les Popquiz, qui s'incrustent dans une vidéo pour capturer là où l'attention est déjà."}},{"@type":"Question","name":"Est-ce que je peux faire des branchements conditionnels ?","acceptedAnswer":{"@type":"Answer","text":"Non, et c'est volontaire. Tiquiz reste simple parce que son travail est de capturer et de trier. Si tu as besoin de deux niveaux, tu chaînes deux quiz : le premier capture et tague, puis chaque profil part vers un second quiz différent. L'avantage, c'est que le lead est déjà dans ta liste même s'il abandonne en route."}},{"@type":"Question","name":"Ça marche dans une autre langue que le français ?","acceptedAnswer":{"@type":"Answer","text":"L'interface existe en sept langues et l'IA écrit tes quiz dans plus de cent, variantes régionales comprises : un quiz en portugais du Brésil ne sort pas en portugais du Portugal. L'arabe s'affiche de droite à gauche."}},{"@type":"Question","name":"Je monte les quiz de plusieurs clients, c'est possible ?","acceptedAnswer":{"@type":"Answer","text":"Oui, avec le palier PLUS. Un espace par client, des quiz et des leads séparés, le compte de chaque client connecté à part, et tu passes de l'un à l'autre en un clic sans te déconnecter."}},{"@type":"Question","name":"Mes quiz sont-ils à ma marque ?","acceptedAnswer":{"@type":"Answer","text":"Ton logo, tes couleurs, ta police, ton nom de domaine. Et dès le plan payant, la mention Tiquiz disparaît et tu mets ton propre pied de page."}},{"@type":"Question","name":"Je peux annuler quand je veux ?","acceptedAnswer":{"@type":"Answer","text":"Oui, en un clic, depuis ton compte. Tu ne perds ni tes quiz ni tes leads, tu retombes sur les limites du plan gratuit."}}]}`;

/**
 * L'apparition au défilement.
 *
 * Sans elle, les 112 blocs `.rv` gardent `opacity:0` et la page est
 * BLANCHE. Elle a un repli explicite quand `IntersectionObserver`
 * n'existe pas, et c'est exactement le bon sens de repli : tout montrer.
 */
export const REVEAL_JS = `(function(){
  var els = document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){
    for(var i=0;i<els.length;i++){els[i].classList.add('in');}
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  },{rootMargin:'0px 0px -8% 0px',threshold:0.08});
  els.forEach(function(el){ io.observe(el); });
})();`;
