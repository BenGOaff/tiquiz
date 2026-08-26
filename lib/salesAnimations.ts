// lib/salesAnimations.ts
//
// Blocs d'animation de la page de vente (fournis par Bene, repris verbatim
// depuis l'export Systeme.io). Rendus tels quels via <AnimatedBlock> qui
// gere le scroll-reveal + les comportements (typing, compteur, boucle).
// Les <script> d'origine sont retires (portes dans AnimatedBlock), et les
// tirets longs convertis en tirets simples (regle anti-IA).
//
// NB : ce sont des chaines HTML (style + markup), injectees en innerHTML.


export const STATS_DASH = `
<!-- Dashboard anime -->
<div class="tqz-wrap" id="tqz-dash-widget">
<div class="tqz-main">
<div class="tqz-inner">
<div class="tqz-chart">
<svg viewBox="0 0 460 320" preserveAspectRatio="none">
<defs><linearGradient id="tqzG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#20BBE6" stop-opacity="0.35"/><stop offset="100%" stop-color="#20BBE6" stop-opacity="0.02"/></linearGradient></defs>
<path class="tqz-chart-area" d="M0,295 L15,294 L30,292 L50,290 L70,287 L90,284 L110,280 L130,275 L150,270 L170,264 L190,256 L205,250 L220,242 L235,232 L250,220 L265,206 L275,196 L285,184 L295,170 L310,148 L325,124 L340,100 L355,78 L375,52 L395,34 L420,18 L445,8 L460,5 L460,320 L0,320 Z"/>
<path class="tqz-chart-path" d="M0,295 L15,294 L30,292 L50,290 L70,287 L90,284 L110,280 L130,275 L150,270 L170,264 L190,256 L205,250 L220,242 L235,232 L250,220 L265,206 L275,196 L285,184 L295,170 L310,148 L325,124 L340,100 L355,78 L375,52 L395,34 L420,18 L445,8 L460,5"/>
</svg>
</div>
<div class="tqz-pct">+32%</div>
</div>
</div>
<div class="tqz-card tqz-card-visits">
<div class="tqz-lbl"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Nombre de visiteurs</div>
<div class="tqz-val">+4327 visites</div>
</div>
<div class="tqz-card tqz-card-leads">
<div class="tqz-lbl"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="16" y2="12"/></svg>Leads capturés</div>
<div class="tqz-val">+487 leads</div>
</div>
</div>
`;

export const LEADS_LIST = `
<div class="tqz-leads" id="tqz-leads-widget">
<div class="tqz-leads-card">
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb7850acf4.06626377_0_3.png" alt="Fanny Martin">
<div class="tqz-lead-info"><div class="tqz-lead-name">Fanny Martin</div><div class="tqz-lead-time">Capturé il y a 3min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb846b9a99.83374955_0_0.png" alt="Tariq Hanbal Rahal">
<div class="tqz-lead-info"><div class="tqz-lead-name">Tariq Hanbal Rahal</div><div class="tqz-lead-time">Capturé il y a 7min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb8e902ba4.45781059_0_1.png" alt="Patricia Clément">
<div class="tqz-lead-info"><div class="tqz-lead-name">Patricia Clément</div><div class="tqz-lead-time">Capturé il y a 14min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb9850a711.42487041_0_2.png" alt="Luc Grenier">
<div class="tqz-lead-info"><div class="tqz-lead-name">Luc Grenier</div><div class="tqz-lead-time">Capturé il y a 22min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fba25d9742.43582376_0_11.png" alt="Karen Payne">
<div class="tqz-lead-info"><div class="tqz-lead-name">Karen Payne</div><div class="tqz-lead-time">Capturé il y a 31min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fbace74551.65229874_0_21.png" alt="Théodore Guay">
<div class="tqz-lead-info"><div class="tqz-lead-name">Théodore Guay</div><div class="tqz-lead-time">Capturé il y a 45min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
</div>
</div>
`;

export const POLL_PIE = `
<div class="tqz-poll" id="tqz-poll-widget">
  <div class="tqz-poll-card">
    <div class="tqz-poll-inner">
      <div class="tqz-poll-step">Question 4/5</div>
      <div class="tqz-poll-question">Si tu voulais être aidé sur ce sujet, ce serait :</div>
      <svg viewBox="0 0 460 420">
        <path class="tqz-s1" d="M230,235 L230,85 A150,150 0 0,1 310,362 Z"/>
        <path class="tqz-s2" d="M230,235 L310,362 A150,150 0 0,1 202,382 Z"/>
        <path class="tqz-s3" d="M230,235 L202,382 A150,150 0 0,1 134,119 Z"/>
        <path class="tqz-s4" d="M230,235 L134,119 A150,150 0 0,1 230,85 Z"/>
        <polyline class="tqz-conn tqz-c2" points="280,368 330,390 370,390"/>
        <polyline class="tqz-conn tqz-c4" points="175,112 120,78 90,78"/>
        <g class="tqz-lt tqz-lt1"><text x="295" y="205" text-anchor="middle" fill="#fff" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">41%</text><text x="295" y="228" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Formation</text></g>
        <g class="tqz-lt tqz-lt3"><text x="162" y="248" text-anchor="middle" fill="#fff" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">36%</text><text x="162" y="271" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Document écrit</text></g>
        <g class="tqz-lt tqz-lt2"><text x="376" y="385" text-anchor="start" fill="#2B3264" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">12%</text><text x="376" y="403" text-anchor="start" fill="#8890B5" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Coaching</text></g>
        <g class="tqz-lt tqz-lt4"><text x="84" y="72" text-anchor="end" fill="#2B3264" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">11%</text><text x="84" y="90" text-anchor="end" fill="#8890B5" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Challenge</text></g>
      </svg>
    </div>
  </div>
</div>
`;

export const COMPARISON = `
<div class="tqz-cmp" id="tqz-cmp-table">
  <div class="tqz-cmp-desktop">
    <div class="tqz-cmp-lw"><div class="tqz-cmp-lw-spacer"></div><div class="tqz-cmp-lw-card">
      <div class="tqz-cmp-cell tqz-cell-label">Viral</div><div class="tqz-cmp-cell tqz-cell-label">Connexion avec l'audience</div><div class="tqz-cmp-cell tqz-cell-label">Interactions / Engagement</div><div class="tqz-cmp-cell tqz-cell-label">Facile à créer</div><div class="tqz-cmp-cell tqz-cell-label">Faible coût d'acquisition</div><div class="tqz-cmp-cell tqz-cell-label">Prospects qualifiés</div><div class="tqz-cmp-cell tqz-cell-label">Fonctionne en automatique</div>
    </div></div>
    <div class="tqz-cmp-col tqz-col-tiquiz"><div class="tqz-cmp-head"><span>Tiquiz</span></div>
      <div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div>
    </div>
    <div class="tqz-cmp-col tqz-col-other"><div class="tqz-cmp-head">Ebook</div>
      <div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div>
    </div>
    <div class="tqz-cmp-col tqz-col-other"><div class="tqz-cmp-head">Formation offerte</div>
      <div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div><div class="tqz-cmp-cell"><span class="tqz-dash">-</span></div><div class="tqz-cmp-cell"><div class="tqz-check"><svg viewBox="0 0 14 14"><path d="M2 7.5 L5.5 11 L12 3"/></svg></div></div>
    </div>
  </div>
</div>
`;

export const TESTIMONIALS = `
<div class="tqz-tm"><div class="tqz-tm-track">
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93e6d54227_avis-tipote10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jeremy B.</div><div class="tqz-tm-role">Entrepreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un véritable couteau suisse pour générer des leads avec des quiz. Que tu sois débutant ou non, tu automatises tout ou presque. Je recommande à 1000% !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9b9e3404de_503499461_122237150750193885_1174529389704311732_n.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Eric L.</div><div class="tqz-tm-role">Infopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz est une révolution pour ceux qui veulent segmenter leur audience avec des quiz connectés à Systeme.io. Je recommande à 1000%.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69aa866919724_photo_2026-02-11_18-47-10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jean Bernard R.</div><div class="tqz-tm-role">Créateur de contenu</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">J'ai testé la génération de quiz et le résultat est incroyable. Les CTA personnalisés pour chaque profil fonctionnent parfaitement.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fce5610b_avis-tipote7.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Bernard C.</div><div class="tqz-tm-role">Consultant</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz m'a vraiment aidé à qualifier mes prospects. Mes leads sont taggés automatiquement dans Systeme.io, un vrai gain de temps.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9411e3efd3_avis-tipote1.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Gwenn</div><div class="tqz-tm-role">Solopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Enfin un outil de quiz parfaitement pensé marketing, relié directement à Systeme.io pour récupérer et taguer les leads, sans Zapier ni Make.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://ifs-association.com/wp-content/uploads/avatars/219/6233a3867d402-bpfull.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Adeline</div><div class="tqz-tm-role">Thérapeute</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Super outil ! Très simple d'utilisation, et surtout c'est le meilleur lead magnet aujourd'hui. Je suis fan. Merci Béné pour ce bijou !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9402fdf69d_avis-tipote8.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Evelyne G.</div><div class="tqz-tm-role">Coach</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un travail de dingue pour mettre autant de fonctionnalités dans un outil aussi simple. Tout est bien organisé, les automatisations sont top.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fa9b2e22_avis-tipote9.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Maulisio T.</div><div class="tqz-tm-role">Marketeur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Meilleur outil de quiz pour segmenter et convertir. La connexion directe avec Systeme.io change tout. Plus besoin de bidouiller.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93e6d54227_avis-tipote10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jeremy B.</div><div class="tqz-tm-role">Entrepreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un véritable couteau suisse pour générer des leads avec des quiz. Que tu sois débutant ou non, tu automatises tout ou presque. Je recommande à 1000% !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9b9e3404de_503499461_122237150750193885_1174529389704311732_n.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Eric L.</div><div class="tqz-tm-role">Infopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz est une révolution pour ceux qui veulent segmenter leur audience avec des quiz connectés à Systeme.io. Je recommande à 1000%.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69aa866919724_photo_2026-02-11_18-47-10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jean Bernard R.</div><div class="tqz-tm-role">Créateur de contenu</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">J'ai testé la génération de quiz et le résultat est incroyable. Les CTA personnalisés pour chaque profil fonctionnent parfaitement.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fce5610b_avis-tipote7.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Bernard C.</div><div class="tqz-tm-role">Consultant</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz m'a vraiment aidé à qualifier mes prospects. Mes leads sont taggés automatiquement dans Systeme.io, un vrai gain de temps.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9411e3efd3_avis-tipote1.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Gwenn</div><div class="tqz-tm-role">Solopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Enfin un outil de quiz parfaitement pensé marketing, relié directement à Systeme.io pour récupérer et taguer les leads, sans Zapier ni Make.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://ifs-association.com/wp-content/uploads/avatars/219/6233a3867d402-bpfull.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Adeline</div><div class="tqz-tm-role">Thérapeute</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Super outil ! Très simple d'utilisation, et surtout c'est le meilleur lead magnet aujourd'hui. Je suis fan. Merci Béné pour ce bijou !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9402fdf69d_avis-tipote8.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Evelyne G.</div><div class="tqz-tm-role">Coach</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un travail de dingue pour mettre autant de fonctionnalités dans un outil aussi simple. Tout est bien organisé, les automatisations sont top.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fa9b2e22_avis-tipote9.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Maulisio T.</div><div class="tqz-tm-role">Marketeur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Meilleur outil de quiz pour segmenter et convertir. La connexion directe avec Systeme.io change tout. Plus besoin de bidouiller.</p></div>
</div></div>
`;

export const POPQUIZ = `
<section class="tq-popquiz">
  <div class="tq-popquiz__inner">
    <div class="tq-popquiz__media">
      <svg class="tq-popquiz__mockup" viewBox="0 0 600 720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vidBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2B3264"/><stop offset="100%" stop-color="#1A1F4D"/></linearGradient>
          <linearGradient id="quizBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#F4F7FE"/></linearGradient>
          <linearGradient id="ctaBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5A6EF6"/><stop offset="100%" stop-color="#4F5FE3"/></linearGradient>
          <linearGradient id="chipCyan" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#5DD5F0"/><stop offset="100%" stop-color="#20BBE6"/></linearGradient>
          <linearGradient id="cardLead" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#F4F7FE"/></linearGradient>
          <filter id="leadShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#5A6EF6" flood-opacity="0.18"/></filter>
          <filter id="quizShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.18"/></filter>
        </defs>
        <g transform="translate(30, 30)"><rect width="540" height="48" rx="16" fill="#FFF" filter="url(#leadShadow)"/><rect x="14" y="14" width="20" height="20" rx="4" fill="#FF0000"/><polygon points="22,20 22,28 30,24" fill="#fff"/><text x="44" y="28" fill="#2B3264" font-weight="800" font-size="14" font-family="Open Sans, sans-serif">Vidéo YouTube importée</text><text x="44" y="42" fill="#5C6485" font-size="11" font-family="Open Sans, sans-serif">youtube.com/watch?v=ton-contenu</text><circle cx="510" cy="24" r="12" fill="#20BBE6"/><text x="510" y="29" text-anchor="middle" fill="#fff" font-weight="900" font-size="13" font-family="Open Sans, sans-serif">OK</text></g>
        <rect x="30" y="110" width="540" height="340" rx="18" fill="url(#vidBg)"/>
        <circle cx="170" cy="250" r="45" fill="#3A4378" opacity="0.6"/><circle cx="160" cy="240" r="14" fill="#FFD89C" opacity="0.85"/><path d="M 130 300 Q 170 280 210 300 L 210 330 L 130 330 Z" fill="#3A4378" opacity="0.6"/><rect x="270" y="240" width="180" height="14" rx="7" fill="#5A6EF6" opacity="0.6"/><rect x="270" y="264" width="140" height="10" rx="5" fill="#fff" opacity="0.3"/><rect x="270" y="282" width="160" height="10" rx="5" fill="#fff" opacity="0.3"/>
        <rect x="50" y="430" width="500" height="6" rx="3" fill="#fff" opacity="0.18"/><rect x="50" y="430" width="0" height="6" rx="3" fill="#20BBE6"><animate attributeName="width" values="0;130;130;240;240;380;380;500;500" keyTimes="0;0.15;0.25;0.38;0.5;0.63;0.75;0.88;1" dur="8s" repeatCount="indefinite"/></rect>
        <circle cx="130" cy="433" r="7" fill="#20BBE6"/><circle cx="240" cy="433" r="9" fill="#20BBE6" stroke="#fff" stroke-width="2"><animate attributeName="r" values="9;11;9;9" keyTimes="0;0.5;0.6;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="380" cy="433" r="7" fill="#5A6EF6"/>
        <g filter="url(#quizShadow)"><g><animateTransform attributeName="transform" attributeType="XML" type="translate" values="60,0;0,0;0,0;0,0;60,0" keyTimes="0;0.15;0.85;0.95;1" dur="8s" repeatCount="indefinite"/><g opacity="0"><animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.15;0.85;0.95;1" dur="8s" repeatCount="indefinite"/>
        <rect x="320" y="140" width="240" height="270" rx="18" fill="url(#quizBg)"/><rect x="338" y="160" width="90" height="26" rx="8" fill="url(#chipCyan)"/><text x="383" y="178" text-anchor="middle" fill="#fff" font-weight="800" font-size="12" font-family="Open Sans, sans-serif">QUIZ 2/3</text>
        <text x="338" y="214" fill="#2B3264" font-weight="700" font-size="14" font-family="Open Sans, sans-serif">Quel est ton plus</text><text x="338" y="232" fill="#2B3264" font-weight="700" font-size="14" font-family="Open Sans, sans-serif">gros défi en ce moment ?</text>
        <rect x="338" y="250" width="204" height="30" rx="9" fill="#EBF1FE" stroke="#5A6EF6" stroke-width="2"><animate attributeName="stroke-width" values="2;3;2;2" keyTimes="0;0.4;0.6;1" dur="2s" repeatCount="indefinite"/></rect><text x="350" y="269" fill="#2B3264" font-weight="600" font-size="12" font-family="Open Sans, sans-serif">Plus de trafic</text>
        <rect x="338" y="286" width="204" height="30" rx="9" fill="#F4F7FE"/><text x="350" y="305" fill="#5C6485" font-weight="500" font-size="12" font-family="Open Sans, sans-serif">Mieux qualifier</text>
        <rect x="338" y="322" width="204" height="30" rx="9" fill="#F4F7FE"/><text x="350" y="341" fill="#5C6485" font-weight="500" font-size="12" font-family="Open Sans, sans-serif">Plus de ventes</text>
        <rect x="338" y="362" width="204" height="32" rx="16" fill="url(#ctaBg)"/><text x="440" y="382" text-anchor="middle" fill="#fff" font-weight="800" font-size="13" font-family="Open Sans, sans-serif">Suivant</text>
        </g></g></g>
        <g filter="url(#leadShadow)"><g opacity="0"><animate attributeName="opacity" values="0;0;0;1;1;0" keyTimes="0;0.5;0.7;0.78;0.92;1" dur="8s" repeatCount="indefinite"/><animateTransform attributeName="transform" attributeType="XML" type="translate" values="0,15;0,15;0,15;0,0;0,0;0,15" keyTimes="0;0.5;0.7;0.78;0.92;1" dur="8s" repeatCount="indefinite"/>
        <rect x="60" y="530" width="480" height="86" rx="18" fill="url(#cardLead)"/><circle cx="100" cy="573" r="22" fill="#FF6663"/><text x="100" y="580" text-anchor="middle" fill="#fff" font-weight="900" font-size="20" font-family="Open Sans, sans-serif">S</text>
        <text x="140" y="562" fill="#5C6485" font-size="11" font-weight="700" font-family="Open Sans, sans-serif" letter-spacing="0.08em">NOUVEAU LEAD CAPTURÉ</text><text x="140" y="585" fill="#2B3264" font-size="16" font-weight="800" font-family="Open Sans, sans-serif">Sophie Martin - sophie chez email.com</text><text x="140" y="603" fill="#5C6485" font-size="12" font-weight="500" font-family="Open Sans, sans-serif">+1 tag profil-trafic vers Systeme.io</text><circle cx="510" cy="573" r="16" fill="#20BBE6"/><text x="510" y="580" text-anchor="middle" fill="#fff" font-weight="900" font-size="16" font-family="Open Sans, sans-serif">OK</text>
        </g></g>
      </svg>
    </div>
    <div class="tq-popquiz__content">
      <span class="tq-popquiz__chip">Nouveau - Popquiz</span>
      <h2 class="tq-popquiz__h2">Importe une vidéo, ajoute tes quiz dedans,<br>elle devient une <span>machine à leads</span></h2>
      <p class="tq-popquiz__sub">Tu prends une vidéo (lien YouTube, lien Vimeo ou fichier perso), tu la déposes dans Popquiz, tu places tes quiz aux moments-clés et tu publies. Pendant que ton spectateur regarde, les quiz s'affichent en surimpression. Il répond, son email atterrit taggué dans Systeme io.</p>
      <ul class="tq-popquiz__list">
        <li><span class="tq-popquiz__check">+</span><span>Importe ta vidéo : lien <strong>YouTube</strong>, lien <strong>Vimeo</strong> ou fichier perso jusqu'à <strong>2 Go</strong></span></li>
        <li><span class="tq-popquiz__check">+</span><span>Place tes quiz aux <strong>moments-clés</strong> sur la timeline (a 0:30, a 2:15, comme tu veux)</span></li>
        <li><span class="tq-popquiz__check">+</span><span>Choisis le mode <strong>bloquant</strong> ou <strong>optionnel</strong></span></li>
        <li><span class="tq-popquiz__check">+</span><span>Les leads atterrissent <strong>taggués dans Systeme io</strong> en direct, sans Zapier</span></li>
        <li><span class="tq-popquiz__check">+</span><span>Embed prêt à coller sur ton <strong>blog</strong>, ta page <strong>Systeme io</strong> ou ton site <strong>WordPress</strong></span></li>
      </ul>
      <a class="tq-popquiz__cta" href="#tarifs">C'est parti ! <span class="tq-popquiz__cta-arrow">&#8594;</span></a>
    </div>
  </div>
  <div class="tq-popquiz__cases">
    <div class="tq-popquiz__case"><span class="tq-popquiz__case-icon">&#9654;</span><h3 class="tq-popquiz__case-title">Ta chaîne YouTube réveillée</h3><p class="tq-popquiz__case-desc">Tes anciennes vidéos qui dorment se mettent à capter des leads chaque jour, sans en tourner une seule nouvelle.</p></div>
    <div class="tq-popquiz__case"><span class="tq-popquiz__case-icon">&#9201;</span><h3 class="tq-popquiz__case-title">Ton replay de webinaire qui vend</h3><p class="tq-popquiz__case-desc">Le replay d'1 heure que personne ne regardait jusqu'au bout devient un mini-tunnel qui qualifie chaque spectateur.</p></div>
    <div class="tq-popquiz__case"><span class="tq-popquiz__case-icon">&#9733;</span><h3 class="tq-popquiz__case-title">Une vidéo virale à ton service</h3><p class="tq-popquiz__case-desc">Tu déposes un TED Talk pertinent dans Popquiz, tu glisses tes quiz, et le trafic devient ton trafic.</p></div>
  </div>
</section>
`;

export const QUIZ_BUILDER = `
<div class="tqz-qb" id="tqz-qb-widget">
  <div class="tqz-qb-phone">
    <div class="tqz-qb-header"><div class="tqz-qb-back"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="tqz-qb-htitle">Mon questionnaire</div></div>
    <div class="tqz-qb-toggle"><div class="tqz-qb-tg-track"><div class="tqz-qb-tg-dot"></div></div><div class="tqz-qb-tg-labels"><span>TU</span><span>VOUS</span></div></div>
    <div class="tqz-qb-textarea"><span class="tqz-qb-typed" id="tqz-qb-typed">Je veux un quiz pour qualifier mes visiteurs prêts à commander ma formation sur l'éducation canine</span><span class="tqz-qb-cursor"></span></div>
    <div style="text-align:center"><button class="tqz-qb-gen"><svg viewBox="0 0 24 24"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z"/></svg>Générer</button></div>
    <div class="tqz-qb-list">
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">1</div><div class="tqz-qb-qtxt">Quel est le plus gros défi avec ton chien au quotidien ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">2</div><div class="tqz-qb-qtxt">Depuis combien de temps as-tu ton chien ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">3</div><div class="tqz-qb-qtxt">As-tu déjà essayé une méthode d'éducation canine ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">4</div><div class="tqz-qb-qtxt">Quel résultat attends-tu d'une formation ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">5</div><div class="tqz-qb-qtxt">Quel budget es-tu prêt(e) à investir pour éduquer ton chien ?</div></div>
    </div>
  </div>
</div>
`;

export const SHARE_EMBED = `
<div class="tqz-sh" id="tqz-sh-widget">
  <div class="tqz-sh-phone">
    <div class="tqz-sh-section">
      <div class="tqz-sh-head"><div class="tqz-sh-head-left"><div class="tqz-sh-icon"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div><div class="tqz-sh-stitle">Partager avec un lien</div></div><button class="tqz-sh-copy">Copier le lien</button></div>
      <div class="tqz-sh-label">Lien</div>
      <div class="tqz-sh-input"><span id="tqz-sh-url">https://quiz.tipote.com/sandra-costa/formation-canine</span></div>
    </div>
    <div class="tqz-sh-section">
      <div class="tqz-sh-head"><div class="tqz-sh-head-left"><div class="tqz-sh-icon"><svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><div class="tqz-sh-stitle">Ajouter à mon site</div></div><button class="tqz-sh-copy">Copier le code</button></div>
      <div class="tqz-sh-code">
        <div class="tqz-sh-code-line"><span class="tqz-hl-cmt">&lt;!-- Tiquiz begin --&gt;</span></div>
        <div class="tqz-sh-code-line"><span class="tqz-hl-tag">&lt;iframe</span> <span class="tqz-hl-attr">src</span>=<span class="tqz-hl-val">"https://quiz.tipote.com/sandra-costa/formation-canine"</span></div>
        <div class="tqz-sh-code-line">&nbsp;&nbsp;<span class="tqz-hl-attr">style</span>=<span class="tqz-hl-val">"border:0"</span> <span class="tqz-hl-attr">width</span>=<span class="tqz-hl-val">"100%"</span> <span class="tqz-hl-attr">height</span>=<span class="tqz-hl-val">"600"</span></div>
        <div class="tqz-sh-code-line">&nbsp;&nbsp;<span class="tqz-hl-attr">frameborder</span>=<span class="tqz-hl-val">"0"</span><span class="tqz-hl-tag">&gt;&lt;/iframe&gt;</span></div>
        <div class="tqz-sh-code-line"><span class="tqz-hl-cmt">&lt;!-- end Tiquiz --&gt;</span></div>
      </div>
    </div>
  </div>
</div>
`;

export const PHONE_MOCKUP = `
<div class="tqz-mk" id="tqz-mk-widget">
  <div class="tqz-phone tqz-p1">
    <div class="tqz-status"><span>16:17</span><div class="tqz-status-r"><svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg><svg viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg></div></div>
    <div class="tqz-scr">
      <div class="tqz-img-ph"><img src="https://d1yei2z3i6k35z.cloudfront.net/473100/69da1673d0c831.93521721_Designsanstitre15.png" alt=""></div>
      <div class="tqz-s1-title">Pourquoi personne ne te trouve sur Google (et comment y remédier)</div>
      <p class="tqz-s1-text">Tu penses que ton business est visible sur Google ? Mauvaise nouvelle : dans 80% des cas, ce n'est pas le cas.</p>
      <p class="tqz-s1-text">Pire : tes clients cherchent tes services tous les jours mais tombent chez tes concurrents.</p>
      <p class="tqz-s1-text"><b>Fais ce quiz pour évaluer comment te rendre plus visible sans trop d'efforts</b></p>
      <div class="tqz-cta-wrap"><button class="tqz-cta">Fais le quiz</button><svg class="tqz-arrow-left" viewBox="0 0 60 50"><path d="M5,45 Q20,20 50,5"/><polygon points="56,2 51,8 49,2"/></svg></div>
    </div>
  </div>
  <div class="tqz-phone tqz-p2">
    <div class="tqz-status"><span>16:17</span><div class="tqz-status-r"><svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg><svg viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg></div></div>
    <div class="tqz-scr">
      <div class="tqz-img-ph"><img src="https://d1yei2z3i6k35z.cloudfront.net/473100/69da167e22d9e1.20842507_Designsanstitre16.png" alt=""></div>
      <div class="tqz-q-step">Question 4/5</div>
      <div class="tqz-q-title">Aujourd'hui, tes clients viennent surtout de :</div>
      <div>
        <div class="tqz-ans tqz-sel"><span class="tqz-em">&#128269;</span><span>Google</span></div>
        <div class="tqz-ans"><span class="tqz-em">&#129309;</span><span>Un peu Google + bouche-à-oreille</span></div>
        <div class="tqz-ans"><span class="tqz-em">&#128483;</span><span>Principalement bouche-à-oreille</span></div>
        <div class="tqz-ans"><span class="tqz-em">&#129668;</span><span>C'est un miracle s'ils me trouvent</span></div>
      </div>
    </div>
  </div>
  <div class="tqz-phone tqz-p3">
    <div class="tqz-status"><span>16:17</span><div class="tqz-status-r"><svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg><svg viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg></div></div>
    <div class="tqz-scr">
      <div class="tqz-img-ph"><img src="https://d1yei2z3i6k35z.cloudfront.net/473100/69da173e77e933.81017767_Designsanstitre17.png" alt=""></div>
      <div class="tqz-o-badge">Bonus débloqué !</div>
      <div class="tqz-o-title">Félicitation Hugo, tu viens de débloquer une réduction de <span>-50%</span> sur l'optimisation de visibilité !</div>
      <p class="tqz-o-text"><b>Entre le code promo QUIZ</b> sur la page suivante et profite de mon expertise pour <b>49EUR au lieu de 99EUR</b></p>
      <p class="tqz-o-urg">Attention : il n'y a que 20 codes promos disponibles, profite du tien avant les autres !</p>
      <div class="tqz-cta-wrap"><button class="tqz-cta-o">J'en profite maintenant</button><svg class="tqz-arrow-right" viewBox="0 0 70 50"><path d="M65,45 Q50,20 20,5"/><polygon points="14,2 21,2 19,8"/></svg></div>
    </div>
  </div>
</div>
`;

export const FACEBOOK = `
<div class="tqz-fb" id="tqz-fb-widget">
  <div class="tqz-fb-emo tqz-fb-emo-heart"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
  <div class="tqz-fb-emo tqz-fb-emo-wow">&#x1F62E;</div>
  <div class="tqz-fb-emo tqz-fb-emo-rofl">&#x1F923;</div>
  <div class="tqz-fb-card">
    <div class="tqz-fb-hdr"><img class="tqz-fb-avatar" src="https://cdn8.futura-sciences.com/s480/images/mz.jpg" alt="Mark Zuckerberg"><div class="tqz-fb-hdr-info"><div class="tqz-fb-name">Mark Zuckerberg</div><div class="tqz-fb-time">23min</div></div></div>
    <div class="tqz-fb-txt">J'ai fait le test et c'est carrément moi &#x1F60E;<br><span class="tqz-fb-hashtag">#entrepreneurAcharné</span></div>
    <div class="tqz-fb-preview">
      <div class="tqz-fb-rockets">
        <span class="tqz-fb-rk" style="top:4%;left:3%;animation-delay:0s">&#x1F680;</span>
        <span class="tqz-fb-rk" style="top:2%;left:28%;animation-delay:.3s">&#x1F525;</span>
        <span class="tqz-fb-rk" style="top:8%;left:50%;animation-delay:.7s">&#x1F680;</span>
        <span class="tqz-fb-rk" style="top:3%;left:72%;animation-delay:.15s">&#x1F525;</span>
        <span class="tqz-fb-rk" style="top:20%;left:82%;animation-delay:.5s">&#x1F680;</span>
        <span class="tqz-fb-rk" style="top:58%;left:5%;animation-delay:.8s">&#x1F525;</span>
        <span class="tqz-fb-rk" style="top:72%;left:12%;animation-delay:.4s">&#x1F680;</span>
        <span class="tqz-fb-rk" style="top:68%;left:60%;animation-delay:.35s">&#x1F680;</span>
        <span class="tqz-fb-rk" style="top:88%;left:25%;animation-delay:.85s">&#x1F680;</span>
        <span class="tqz-fb-rk" style="top:85%;left:78%;animation-delay:1.15s">&#x1F525;</span>
      </div>
      <div class="tqz-fb-bubble"><div class="tqz-fb-bubble-txt">Quel type d'entrepreneur<br>êtes-vous ? &#x1F525;</div></div>
    </div>
    <div class="tqz-fb-link"><div class="tqz-fb-link-info"><div class="tqz-fb-link-domain">TIQUIZ.COM</div><div class="tqz-fb-link-title">Quel type d'entrepreneur êtes-vous ?</div></div><button class="tqz-fb-link-btn">En savoir plus</button></div>
    <div class="tqz-fb-reactions"><div class="tqz-fb-react-left"><div class="tqz-fb-react-emojis"><span class="tqz-rlike"><svg width="12" height="12" viewBox="0 0 16 16" fill="#fff"><path d="M1 7.66c0 .56.09 1.12.24 1.67l1.07 3.94c.29 1.07.35 1.09 1.47 1.09h5.4c.38 0 .65-.07.93-.35l4.55-4.55c.25-.25.34-.59.34-.93 0-.74-.59-1.33-1.33-1.33H10c0-1.87.67-3.46.67-4.67C10.67 1.2 10.13.34 8.8.34c-.67 0-.8.67-1.2 1.34L5.07 6H2.33C1.6 6 1 6.6 1 7.33v.33z"/></svg></span><span class="tqz-rheart"><svg width="11" height="11" viewBox="0 0 16 16" fill="#fff"><path d="M8 14s-5.5-3.5-5.5-7.5C2.5 4 4.5 2.5 6.5 2.5c1.12 0 2.13.5 2.8 1.3.67-.8 1.68-1.3 2.8-1.3 2 0 3.9 1.5 3.9 4C16 10.5 8 14 8 14z"/></svg></span></div><span class="tqz-fb-react-count" id="tqz-fb-count">541</span></div><div class="tqz-fb-stats">86 commentaires&nbsp;&nbsp;138 partages</div></div>
    <div class="tqz-fb-actions">
      <div class="tqz-fb-act"><svg viewBox="0 0 24 24" fill="none" stroke="#65676b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M4 22H2a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h2"/></svg>J'aime</div>
      <div class="tqz-fb-act"><svg viewBox="0 0 24 24" fill="none" stroke="#65676b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Commenter</div>
      <div class="tqz-fb-act"><svg viewBox="0 0 24 24" fill="none" stroke="#65676b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>Partager</div>
    </div>
  </div>
</div>
`;

export const SIO_SCOOP = `
<div class="tqz-sc" id="tqz-scoop-widget">
  <div class="tqz-sc-conf tqz-sc-c1"></div>
  <div class="tqz-sc-conf tqz-sc-c2"></div>
  <div class="tqz-sc-conf tqz-sc-c3"></div>
  <div class="tqz-sc-conf tqz-sc-c4"></div>
  <div class="tqz-sc-conf tqz-sc-c5"></div>
  <div class="tqz-sc-conf tqz-sc-c6"></div>
  <div class="tqz-sc-conf tqz-sc-c7"></div>
  <div class="tqz-sc-conf tqz-sc-c8"></div>
  <div class="tqz-sc-conf tqz-sc-c9"></div>
  <div class="tqz-sc-conf tqz-sc-c10"></div>
  <div class="tqz-sc-conf tqz-sc-c11"></div>
  <div class="tqz-sc-conf tqz-sc-c12"></div>
  <div class="tqz-sc-conf tqz-sc-c13"></div>
  <div class="tqz-sc-conf tqz-sc-c14"></div>
  <div class="tqz-sc-conf tqz-sc-c15"></div>
  <div class="tqz-sc-conf tqz-sc-c16"></div>
  <div class="tqz-sc-conf tqz-sc-c17"></div>
  <div class="tqz-sc-conf tqz-sc-c18"></div>
  <div class="tqz-sc-s tqz-sc-s1">
    <div class="tqz-sc-badge">&#9889; Exclusivité Tiquiz</div>
    <div class="tqz-sc-h1">Le 1er outil quiz<br>connecté à <em>Systeme.io</em></div>
    <div class="tqz-sc-sub1">Tes leads atterrissent directement dans ton business. Automatiquement.</div>
  </div>
  <div class="tqz-sc-s tqz-sc-s2">
    <div class="tqz-sc-s2-left">
      <div class="tqz-sc-s2-txt">Un lead remplit<br>ton quiz...</div>
      <div class="tqz-sc-s2-small">Tiquiz capture tout automatiquement</div>
    </div>
    <div class="tqz-sc-mock">
      <div class="tqz-sc-mq">Quel est ton plus grand défi ?</div>
      <div class="tqz-sc-mo"><div class="tqz-sc-md"></div>Trouver des clients</div>
      <div class="tqz-sc-mo tqz-sel"><div class="tqz-sc-md"></div>Automatiser mon business</div>
      <div class="tqz-sc-mo"><div class="tqz-sc-md"></div>Créer du contenu</div>
      <div class="tqz-sc-ml">
        <div class="tqz-sc-mlav"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="tqz-sc-mli">Marie D. - Score: 87/100<span>Tag: prospect-chaud</span></div>
      </div>
    </div>
  </div>
  <div class="tqz-sc-s tqz-sc-s3">
    <div class="tqz-sc-big">Envoyé !</div>
    <div class="tqz-sc-sub3">Lead synchronisé avec Systeme.io</div>
    <div class="tqz-sc-dots"><div class="tqz-sc-dt"></div><div class="tqz-sc-dt"></div><div class="tqz-sc-dt"></div></div>
  </div>
  <div class="tqz-sc-s tqz-sc-s4">
    <div class="tqz-sc-s4h">Tes leads débarquent dans...</div>
    <div class="tqz-sc-cards">
      <div class="tqz-sc-card tqz-sc-cd1">
        <div class="tqz-sc-cav tqz-sc-ca1"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="tqz-sc-cn">Marie D.</div>
        <div class="tqz-sc-ct tqz-sc-ct1">prospect-chaud</div>
      </div>
      <div class="tqz-sc-card tqz-sc-cd2">
        <div class="tqz-sc-cav tqz-sc-ca2"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="tqz-sc-cn">Lucas T.</div>
        <div class="tqz-sc-ct tqz-sc-ct2">quiz-terminé</div>
      </div>
      <div class="tqz-sc-card tqz-sc-cd3">
        <div class="tqz-sc-cav tqz-sc-ca3"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="tqz-sc-cn">Sophie M.</div>
        <div class="tqz-sc-ct tqz-sc-ct3">score-élevé</div>
      </div>
    </div>
    <div class="tqz-sc-arw">&#8595;</div>
    <div class="tqz-sc-tgt">
      <div class="tqz-sc-sio"><img src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://systeme.io&size=128" alt="S"></div>
      <div class="tqz-sc-siot"><b>Systeme.io</b></div>
    </div>
  </div>
  <div class="tqz-sc-s tqz-sc-s5">
    <div class="tqz-sc-s5t">Tout est automatique</div>
    <div class="tqz-sc-feat tqz-sc-f1">
      <div class="tqz-sc-fi tqz-sc-fi1"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>
      Sync en temps réel, zéro manip
    </div>
    <div class="tqz-sc-feat tqz-sc-f2">
      <div class="tqz-sc-fi tqz-sc-fi2"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>
      Tags automatiques sur chaque lead
    </div>
    <div class="tqz-sc-feat tqz-sc-f3">
      <div class="tqz-sc-fi tqz-sc-fi3"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>
      Automatisations depuis Tiquiz
    </div>
    <div class="tqz-sc-csv">Tu n'utilises pas Systeme.io ?<br>Exporte tes leads en <b>1 clic au format CSV</b> vers l'autorépondeur de ton choix.</div>
  </div>
</div>
`;

export const OPTIN = `
<div class="tqz-opt" id="tqz-opt-widget">
  <div class="tqz-opt-ph">
    <div class="tqz-opt-sb"><span>12:22</span><span style="display:flex;gap:4px;align-items:center"><svg width="14" height="10" fill="none"><rect x="0" y="3.5" width="2.5" height="6.5" rx=".8" fill="#fff" opacity=".35"/><rect x="3.5" y="2.5" width="2.5" height="7.5" rx=".8" fill="#fff" opacity=".55"/><rect x="7" y="1.2" width="2.5" height="8.8" rx=".8" fill="#fff" opacity=".75"/><rect x="10.5" y="0" width="2.5" height="10" rx=".8" fill="#fff"/></svg><svg width="20" height="10" fill="none"><rect x="0" y="1" width="16" height="8" rx="1.8" stroke="#fff" stroke-width="1" fill="none"/><rect x="1.5" y="2.5" width="11" height="5" rx="1" fill="#fff"/><rect x="17" y="3" width="2.5" height="4" rx=".8" fill="#fff" opacity=".5"/></svg></span></div>
    <div class="tqz-opt-il"><svg width="200" height="110" viewBox="0 0 200 110" fill="none"><g transform="translate(100,48)"><rect x="-22" y="-16" width="44" height="34" rx="8" fill="#5E6DDE" opacity=".15"/><circle cx="-9" cy="-4" r="5.5" fill="#20BBE6" opacity=".35"/><circle cx="9" cy="-4" r="5.5" fill="#20BBE6" opacity=".35"/><rect x="-8" y="7" width="16" height="4" rx="2" fill="#5E6DDE" opacity=".2"/></g></svg></div>
    <div class="tqz-opt-fm">
      <div class="tqz-opt-lb">POUR ALLER PLUS LOIN</div>
      <div class="tqz-opt-t">Télécharge gratuitement mes scripts n8n à importer en 1 clic pour lancer 10 bots qui travailleront pour toi dès ce soir :</div>
      <div class="tqz-opt-inp tqz-opt-inp1">Prénom</div>
      <div class="tqz-opt-inp tqz-opt-inp2">Adresse email</div>
      <div class="tqz-opt-rg"><div class="tqz-opt-ck"><svg width="9" height="7" fill="none" viewBox="0 0 9 7"><path d="M1 3.5L3 5.5L8 .5" stroke="#5E6DDE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span>J'accepte de recevoir des emails et confirme avoir lu la <u>politique de confidentialité</u>.</span></div>
      <div class="tqz-opt-btn">Recevoir gratuitement</div>
    </div>
  </div>
  <div class="tqz-opt-lg">
    <div class="tqz-opt-lo tqz-d1"></div>
    <div class="tqz-opt-lo tqz-d2"></div>
    <div class="tqz-opt-lo tqz-d3"></div>
    <div class="tqz-opt-lo tqz-d4"></div>
    <div class="tqz-opt-lo tqz-d5"></div>
    <div class="tqz-opt-lo tqz-d6"></div>
    <div class="tqz-opt-lo tqz-d7"></div>
    <div class="tqz-opt-lo tqz-d8"></div>
    <div class="tqz-opt-lo tqz-d9"></div>
    <div class="tqz-opt-lo tqz-d10"></div>
    <div class="tqz-opt-lo tqz-d11"></div>
    <div class="tqz-opt-lo tqz-d12"></div>
  </div>
  <div class="tqz-opt-ra">
    <svg class="tqz-opt-br" width="44" height="640" viewBox="0 0 44 640" fill="none"><path d="M6 8 C6 8,16 8,16 50 C16 100,16 160,16 230 C16 275,24 305,38 320 C24 335,16 365,16 410 C16 480,16 540,16 590 C16 632,6 632,6 632" stroke="#c8cde0" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="tqz-opt-ac">
      <div class="tqz-opt-card tqz-opt-card1"><div class="tqz-opt-ci"><svg viewBox="0 0 24 24" fill="none" stroke="#5E6DDE" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="#5E6DDE"/></svg></div><div class="tqz-opt-ct">Ajouter un tag</div></div>
      <div class="tqz-opt-plus tqz-opt-plus1"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#5E6DDE" stroke-width="2"><path d="M5.5 1v9M1 5.5h9"/></svg></div>
      <div class="tqz-opt-card tqz-opt-card2"><div class="tqz-opt-ci"><svg viewBox="0 0 24 24" fill="none" stroke="#5E6DDE" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg></div><div class="tqz-opt-ct">S'abonner à la campagne</div></div>
      <div class="tqz-opt-plus tqz-opt-plus2"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#5E6DDE" stroke-width="2"><path d="M5.5 1v9M1 5.5h9"/></svg></div>
      <div class="tqz-opt-card tqz-opt-card3"><div class="tqz-opt-ci"><svg viewBox="0 0 24 24" fill="none" stroke="#5E6DDE" stroke-width="2"><path d="M12 2L2 7v6c0 5.25 3.75 10.74 10 12 6.25-1.26 10-6.75 10-12V7L12 2z"/><path d="M9 12l2 2 4-4"/></svg></div><div class="tqz-opt-ct">Accès à la formation</div></div>
    </div>
  </div>
</div>
`;
