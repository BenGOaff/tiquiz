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
<style>
.tqz-wrap *{margin:0;padding:0;box-sizing:border-box}
.tqz-wrap{width:100%;max-width:460px;margin:0 auto;padding:30px 16px;position:relative;font-family:'Inter','Open Sans',sans-serif}
.tqz-main{position:relative;background:linear-gradient(160deg,#f0f2fb 0%,#e4e7f5 100%);border-radius:22px;box-shadow:0 12px 40px rgba(43,50,100,0.1);overflow:visible;height:320px}
.tqz-inner{position:absolute;inset:8px;background:#fff;border-radius:16px;overflow:hidden}
.tqz-chart{position:absolute;bottom:0;left:0;right:0;top:0}
.tqz-chart svg{width:100%;height:100%;display:block}
.tqz-chart-path{fill:none;stroke:#20BBE6;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:700;stroke-dashoffset:700}
.tqz-chart-area{fill:url(#tqzG);opacity:0}
.tqz-pct{position:absolute;top:50%;right:80px;background:#5E6DDE;color:#fff;font-size:0.95rem;font-weight:800;padding:7px 16px;border-radius:50px;opacity:0;transform:scale(0.5)}
.tqz-card{position:absolute;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(43,50,100,0.12);opacity:0}
.tqz-card-visits{left:-20px;bottom:50px;padding:18px 22px;transform:translateX(-40px)}
.tqz-card-leads{right:-16px;top:-20px;padding:16px 20px;transform:translateX(40px)}
.tqz-lbl{font-size:0.72rem;font-weight:700;color:#20BBE6;display:flex;align-items:center;gap:6px;margin-bottom:6px;letter-spacing:0.02em}
.tqz-lbl svg{width:16px;height:16px;fill:none;stroke:#20BBE6;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tqz-val{font-size:2rem;font-weight:800;color:#2B3264;line-height:1;letter-spacing:-0.03em}
.tqz-wrap.tqz-visible .tqz-chart-path{animation:tqzDraw 3s ease forwards 0.6s}
.tqz-wrap.tqz-visible .tqz-chart-area{animation:tqzArea 1.5s ease forwards 2.2s}
.tqz-wrap.tqz-visible .tqz-pct{animation:tqzPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards 3s}
.tqz-wrap.tqz-visible .tqz-card-visits{animation:tqzFromLeft 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards 1s,tqzFloat 4s ease-in-out 1.7s infinite}
.tqz-wrap.tqz-visible .tqz-card-leads{animation:tqzFromRight 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards 1.6s,tqzFloatAlt 5s ease-in-out 2.3s infinite}
@keyframes tqzDraw{to{stroke-dashoffset:0}}
@keyframes tqzArea{to{opacity:0.3}}
@keyframes tqzPop{to{opacity:1;transform:scale(1)}}
@keyframes tqzFromLeft{to{opacity:1;transform:translateX(0) translateY(0)}}
@keyframes tqzFromRight{to{opacity:1;transform:translateX(0) translateY(0)}}
@keyframes tqzFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes tqzFloatAlt{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@media(max-width:500px){
.tqz-wrap{max-width:100%;padding:20px 10px}
.tqz-main{height:270px}
.tqz-val{font-size:1.5rem}
.tqz-card-visits{left:-6px;bottom:40px;padding:14px 16px}
.tqz-card-leads{right:-6px;top:-10px;padding:12px 16px}
.tqz-pct{right:40px;font-size:0.82rem;padding:5px 12px}
}
</style>
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
<div class="tqz-lbl"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="16" y2="12"/></svg>Leads captures</div>
<div class="tqz-val">+487 leads</div>
</div>
</div>
`;

export const LEADS_LIST = `
<style>
.tqz-leads *{margin:0;padding:0;box-sizing:border-box}
.tqz-leads{width:100%;max-width:460px;margin:0 auto;padding:30px 16px;position:relative;font-family:'Inter','Open Sans',sans-serif}
.tqz-leads-card{background:#fff;border-radius:22px;box-shadow:0 12px 40px rgba(43,50,100,0.1);overflow:hidden}
.tqz-lead-row{display:flex;align-items:center;gap:14px;padding:18px 22px;border-bottom:1px solid rgba(94,109,222,0.08);opacity:0;transform:translateX(-30px)}
.tqz-lead-row:last-child{border-bottom:none}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(1){animation:tqzRowIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s forwards,tqzRowGlow 6s ease-in-out 2.5s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(2){animation:tqzRowIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.6s forwards,tqzRowGlow 6s ease-in-out 3.5s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(3){animation:tqzRowIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s forwards,tqzRowGlow 6s ease-in-out 4.5s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(4){animation:tqzRowIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.2s forwards,tqzRowGlow 6s ease-in-out 5.5s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(5){animation:tqzRowIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.5s forwards,tqzRowGlow 6s ease-in-out 6.5s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(6){animation:tqzRowIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.8s forwards,tqzRowGlow 6s ease-in-out 7.5s infinite}
.tqz-avatar{width:48px;height:48px;border-radius:50%;flex-shrink:0;object-fit:cover;border:2.5px solid}
.tqz-lead-row:nth-child(1) .tqz-avatar{border-color:#20BBE6}
.tqz-lead-row:nth-child(2) .tqz-avatar{border-color:#5E6DDE}
.tqz-lead-row:nth-child(3) .tqz-avatar{border-color:#20BBE6}
.tqz-lead-row:nth-child(4) .tqz-avatar{border-color:#5E6DDE}
.tqz-lead-row:nth-child(5) .tqz-avatar{border-color:#20BBE6}
.tqz-lead-row:nth-child(6) .tqz-avatar{border-color:#5E6DDE}
.tqz-lead-info{flex:1;min-width:0}
.tqz-lead-name{font-size:1.05rem;font-weight:700;color:#2B3264;line-height:1.2;text-align:left}
.tqz-lead-time{font-size:0.78rem;color:#8890B5;font-weight:500;margin-top:2px;text-align:left}
.tqz-lead-star{flex-shrink:0;width:28px;height:28px;opacity:0;transform:scale(0)}
.tqz-lead-star polygon{fill:#5E6DDE;stroke:#5E6DDE}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(1) .tqz-lead-star{animation:tqzStar 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.6s forwards,tqzStarPulse 3s ease-in-out 1s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(2) .tqz-lead-star{animation:tqzStar 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.9s forwards,tqzStarPulse 3s ease-in-out 1.5s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(3) .tqz-lead-star{animation:tqzStar 0.4s cubic-bezier(0.34,1.56,0.64,1) 1.2s forwards,tqzStarPulse 3s ease-in-out 2s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(4) .tqz-lead-star{animation:tqzStar 0.4s cubic-bezier(0.34,1.56,0.64,1) 1.5s forwards,tqzStarPulse 3s ease-in-out 2.5s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(5) .tqz-lead-star{animation:tqzStar 0.4s cubic-bezier(0.34,1.56,0.64,1) 1.8s forwards,tqzStarPulse 3s ease-in-out 3s infinite}
.tqz-leads.tqz-visible .tqz-lead-row:nth-child(6) .tqz-lead-star{animation:tqzStar 0.4s cubic-bezier(0.34,1.56,0.64,1) 2.1s forwards,tqzStarPulse 3s ease-in-out 3.5s infinite}
@keyframes tqzRowIn{to{opacity:1;transform:translateX(0)}}
@keyframes tqzStar{to{opacity:1;transform:scale(1)}}
@keyframes tqzStarPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:0.8}}
@keyframes tqzRowGlow{0%,100%{background:transparent}50%{background:rgba(32,187,230,0.04)}}
@media(max-width:500px){
.tqz-leads{max-width:100%;padding:20px 10px}
.tqz-lead-row{padding:14px 16px;gap:12px}
.tqz-avatar{width:40px;height:40px}
.tqz-lead-name{font-size:0.92rem}
.tqz-lead-time{font-size:0.72rem}
.tqz-lead-star{width:24px;height:24px}
}
</style>
<div class="tqz-leads" id="tqz-leads-widget">
<div class="tqz-leads-card">
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb7850acf4.06626377_0_3.png" alt="Fanny Martin">
<div class="tqz-lead-info"><div class="tqz-lead-name">Fanny Martin</div><div class="tqz-lead-time">Capture il y a 3min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb846b9a99.83374955_0_0.png" alt="Tariq Hanbal Rahal">
<div class="tqz-lead-info"><div class="tqz-lead-name">Tariq Hanbal Rahal</div><div class="tqz-lead-time">Capture il y a 7min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb8e902ba4.45781059_0_1.png" alt="Patricia Clement">
<div class="tqz-lead-info"><div class="tqz-lead-name">Patricia Clement</div><div class="tqz-lead-time">Capture il y a 14min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fb9850a711.42487041_0_2.png" alt="Luc Grenier">
<div class="tqz-lead-info"><div class="tqz-lead-name">Luc Grenier</div><div class="tqz-lead-time">Capture il y a 22min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fba25d9742.43582376_0_11.png" alt="Karen Payne">
<div class="tqz-lead-info"><div class="tqz-lead-name">Karen Payne</div><div class="tqz-lead-time">Capture il y a 31min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
<div class="tqz-lead-row">
<img class="tqz-avatar" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69d9fbace74551.65229874_0_21.png" alt="Theodore Guay">
<div class="tqz-lead-info"><div class="tqz-lead-name">Theodore Guay</div><div class="tqz-lead-time">Capture il y a 45min</div></div>
<svg class="tqz-lead-star" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
</div>
</div>
</div>
`;

export const POLL_PIE = `
<style>
.tqz-poll *{margin:0;padding:0;box-sizing:border-box}
.tqz-poll{width:100%;max-width:460px;margin:0 auto;padding:30px 16px;font-family:'Inter','Open Sans',sans-serif}
.tqz-poll-card{background:linear-gradient(160deg,#f0f2fb 0%,#e4e7f5 100%);border-radius:22px;box-shadow:0 12px 40px rgba(43,50,100,0.1);padding:8px}
.tqz-poll-inner{background:#fff;border-radius:16px;padding:28px 24px 20px}
.tqz-poll-step{font-size:0.72rem;font-weight:800;color:#20BBE6;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;text-align:left}
.tqz-poll-question{font-size:1.2rem;font-weight:800;color:#2B3264;line-height:1.3;margin-bottom:12px;text-align:left}
.tqz-poll svg{width:100%;height:auto;display:block;overflow:visible}
.tqz-s1{fill:#5E6DDE;opacity:0}
.tqz-s2{fill:#8B95E8;opacity:0}
.tqz-s3{fill:#20BBE6;opacity:0}
.tqz-s4{fill:#dde0f0;opacity:0}
.tqz-conn{stroke:#B0B8D6;stroke-width:1.2;fill:none;stroke-dasharray:100;stroke-dashoffset:100}
.tqz-lt{font-family:'Inter','Open Sans',sans-serif;opacity:0}
.tqz-poll.tqz-visible .tqz-s1{animation:tqzSIn .6s ease forwards .3s,tqzPulse 4s ease-in-out 2.2s infinite}
.tqz-poll.tqz-visible .tqz-s2{animation:tqzSIn .6s ease forwards .7s,tqzPulse 4s ease-in-out 2.7s infinite}
.tqz-poll.tqz-visible .tqz-s3{animation:tqzSIn .6s ease forwards 1.1s,tqzPulse 4s ease-in-out 3.2s infinite}
.tqz-poll.tqz-visible .tqz-s4{animation:tqzSIn .6s ease forwards 1.5s,tqzPulse 4s ease-in-out 3.7s infinite}
.tqz-poll.tqz-visible .tqz-c2{animation:tqzLine .5s ease forwards 1.2s}
.tqz-poll.tqz-visible .tqz-c4{animation:tqzLine .5s ease forwards 2s}
.tqz-poll.tqz-visible .tqz-lt1{animation:tqzSIn .4s ease forwards .9s,tqzFloatLbl 5s ease-in-out 3s infinite}
.tqz-poll.tqz-visible .tqz-lt2{animation:tqzSIn .4s ease forwards 1.5s,tqzFloatLbl 5s ease-in-out 3s infinite}
.tqz-poll.tqz-visible .tqz-lt3{animation:tqzSIn .4s ease forwards 1.7s,tqzFloatLbl 5s ease-in-out 3s infinite}
.tqz-poll.tqz-visible .tqz-lt4{animation:tqzSIn .4s ease forwards 2.3s,tqzFloatLbl 5s ease-in-out 3s infinite}
@keyframes tqzSIn{to{opacity:1}}
@keyframes tqzLine{to{stroke-dashoffset:0}}
@keyframes tqzPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.07)}}
@keyframes tqzFloatLbl{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@media(max-width:500px){.tqz-poll{padding:20px 10px}.tqz-poll-inner{padding:22px 18px 16px}.tqz-poll-question{font-size:1.05rem}}
</style>
<div class="tqz-poll" id="tqz-poll-widget">
  <div class="tqz-poll-card">
    <div class="tqz-poll-inner">
      <div class="tqz-poll-step">Question 4/5</div>
      <div class="tqz-poll-question">Si tu voulais etre aide sur ce sujet, ce serait :</div>
      <svg viewBox="0 0 460 420">
        <path class="tqz-s1" d="M230,235 L230,85 A150,150 0 0,1 310,362 Z"/>
        <path class="tqz-s2" d="M230,235 L310,362 A150,150 0 0,1 202,382 Z"/>
        <path class="tqz-s3" d="M230,235 L202,382 A150,150 0 0,1 134,119 Z"/>
        <path class="tqz-s4" d="M230,235 L134,119 A150,150 0 0,1 230,85 Z"/>
        <polyline class="tqz-conn tqz-c2" points="280,368 330,390 370,390"/>
        <polyline class="tqz-conn tqz-c4" points="175,112 120,78 90,78"/>
        <g class="tqz-lt tqz-lt1"><text x="295" y="205" text-anchor="middle" fill="#fff" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">41%</text><text x="295" y="228" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Formation</text></g>
        <g class="tqz-lt tqz-lt3"><text x="162" y="248" text-anchor="middle" fill="#fff" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">36%</text><text x="162" y="271" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Document ecrit</text></g>
        <g class="tqz-lt tqz-lt2"><text x="376" y="385" text-anchor="start" fill="#2B3264" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">12%</text><text x="376" y="403" text-anchor="start" fill="#8890B5" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Coaching</text></g>
        <g class="tqz-lt tqz-lt4"><text x="84" y="72" text-anchor="end" fill="#2B3264" font-size="26" font-weight="800" font-family="Inter,Open Sans,sans-serif">11%</text><text x="84" y="90" text-anchor="end" fill="#8890B5" font-size="13" font-weight="700" font-family="Inter,Open Sans,sans-serif">Challenge</text></g>
      </svg>
    </div>
  </div>
</div>
`;

export const COMPARISON = `
<style>
.tqz-cmp *{margin:0;padding:0;box-sizing:border-box}
.tqz-cmp{width:100%;max-width:960px;margin:0 auto;padding:20px 12px;font-family:'Inter','Open Sans',system-ui,sans-serif}
.tqz-cmp-desktop{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;align-items:start}
.tqz-cmp-lw{display:flex;flex-direction:column}
.tqz-cmp-lw-spacer{height:70px;flex-shrink:0}
.tqz-cmp-lw-card{background:#fff;border-radius:18px;box-shadow:0 8px 30px rgba(43,50,100,.1);overflow:hidden}
.tqz-cmp-col{border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(43,50,100,.1)}
.tqz-cmp-head{padding:18px 10px;text-align:center;font-size:20px;font-weight:900;height:70px;display:flex;align-items:center;justify-content:center}
.tqz-col-tiquiz .tqz-cmp-head{background:linear-gradient(135deg,#2B3264 0%,#3d4580 100%);color:#fff}
.tqz-col-tiquiz .tqz-cmp-head span{background:linear-gradient(135deg,#20BBE6,#05DFF3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:24px;letter-spacing:-.02em}
.tqz-col-other .tqz-cmp-head{background:#2B3264;color:#fff}
.tqz-cmp-cell{padding:14px 10px;text-align:center;border-top:2px solid #e8eaf3;background:#fff;font-size:22px;height:52px;display:flex;align-items:center;justify-content:center}
.tqz-cmp-cell:first-child,.tqz-cmp-head+.tqz-cmp-cell{border-top:none}
.tqz-cell-label{font-size:14px;font-weight:700;color:#2B3264}
.tqz-check{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#5E6DDE,#20BBE6);display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(0)}
.tqz-check svg{width:14px;height:14px}
.tqz-check svg path{fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.tqz-dash{color:#c5c9db;font-size:22px;font-weight:300;opacity:0}
.tqz-cmp-lw,.tqz-cmp-col{opacity:0;transform:translateY(20px)}
.tqz-cmp.tqz-visible .tqz-cmp-lw{animation:tqzFadeIn .6s ease .1s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-desktop .tqz-cmp-col:nth-child(2){animation:tqzFadeIn .6s ease .25s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-desktop .tqz-cmp-col:nth-child(3){animation:tqzFadeIn .6s ease .4s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-desktop .tqz-cmp-col:nth-child(4){animation:tqzFadeIn .6s ease .55s forwards}
@keyframes tqzFadeIn{to{opacity:1;transform:translateY(0)}}
.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(2) .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(2) .tqz-dash{animation:tqzPopIn .4s ease .7s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(3) .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(3) .tqz-dash{animation:tqzPopIn .4s ease .85s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(4) .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(4) .tqz-dash{animation:tqzPopIn .4s ease 1s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(5) .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(5) .tqz-dash{animation:tqzPopIn .4s ease 1.15s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(6) .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(6) .tqz-dash{animation:tqzPopIn .4s ease 1.3s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(7) .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(7) .tqz-dash{animation:tqzPopIn .4s ease 1.45s forwards}
.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(8) .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-col .tqz-cmp-cell:nth-child(8) .tqz-dash{animation:tqzPopIn .4s ease 1.6s forwards}
@keyframes tqzPopIn{0%{opacity:0;transform:scale(0)}70%{transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
.tqz-cmp-mobile{display:none}
@media(max-width:700px){.tqz-cmp-desktop{gap:8px}.tqz-cmp-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}.tqz-cmp-pair .tqz-cmp-lw,.tqz-cmp-pair .tqz-cmp-col{opacity:0;transform:translateY(20px)}.tqz-cmp.tqz-visible .tqz-cmp-pair .tqz-cmp-lw{animation:tqzFadeIn .6s ease .1s forwards}.tqz-cmp.tqz-visible .tqz-cmp-pair .tqz-cmp-col{animation:tqzFadeIn .6s ease .25s forwards}.tqz-cmp.tqz-visible .tqz-cmp-pair .tqz-check,.tqz-cmp.tqz-visible .tqz-cmp-pair .tqz-dash{animation:tqzPopIn .4s ease .6s forwards}.tqz-cell-label{font-size:12px;padding:14px 6px}.tqz-cmp-head{font-size:17px;padding:18px 6px}.tqz-col-tiquiz .tqz-cmp-head span{font-size:20px}}
</style>
<div class="tqz-cmp" id="tqz-cmp-table">
  <div class="tqz-cmp-desktop">
    <div class="tqz-cmp-lw"><div class="tqz-cmp-lw-spacer"></div><div class="tqz-cmp-lw-card">
      <div class="tqz-cmp-cell tqz-cell-label">Viral</div><div class="tqz-cmp-cell tqz-cell-label">Connexion avec l'audience</div><div class="tqz-cmp-cell tqz-cell-label">Interactions / Engagement</div><div class="tqz-cmp-cell tqz-cell-label">Facile a creer</div><div class="tqz-cmp-cell tqz-cell-label">Faible cout d'acquisition</div><div class="tqz-cmp-cell tqz-cell-label">Prospects qualifies</div><div class="tqz-cmp-cell tqz-cell-label">Fonctionne en automatique</div>
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
<style>
.tqz-tm{max-width:100%;overflow:hidden;position:relative;padding:20px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:left}
.tqz-tm *{box-sizing:border-box}
.tqz-tm-track{display:flex;gap:20px;animation:tqzScroll 50s linear infinite;width:max-content}
.tqz-tm-track:hover{animation-play-state:paused}
.tqz-tm-card{width:320px;flex-shrink:0;background:#fff;border:1px solid #e8e9f0;border-radius:14px;padding:24px;transition:box-shadow .3s ease,transform .3s ease;text-align:left}
.tqz-tm-card:hover{box-shadow:0 8px 30px rgba(43,50,100,.1);transform:translateY(-3px)}
.tqz-tm-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.tqz-tm-av{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #eef0ff}
.tqz-tm-info{flex:1}
.tqz-tm-name{font-size:14px;font-weight:700;color:#2B3264}
.tqz-tm-role{font-size:11px;color:#6b7194;margin-top:1px}
.tqz-tm-stars{color:#FFB800;font-size:13px;letter-spacing:1px;margin-top:2px}
.tqz-tm-txt{font-size:13px;color:#3d4266;line-height:1.55;margin:0}
@keyframes tqzScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.tqz-tm::before,.tqz-tm::after{content:'';position:absolute;top:0;bottom:0;width:60px;z-index:2;pointer-events:none}
.tqz-tm::before{left:0;background:linear-gradient(90deg,#fff 0%,transparent 100%)}
.tqz-tm::after{right:0;background:linear-gradient(270deg,#fff 0%,transparent 100%)}
@media(max-width:600px){.tqz-tm-card{width:270px;padding:18px}.tqz-tm-av{width:40px;height:40px}.tqz-tm-name{font-size:13px}.tqz-tm-txt{font-size:12px}.tqz-tm::before,.tqz-tm::after{width:30px}}
</style>
<div class="tqz-tm"><div class="tqz-tm-track">
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93e6d54227_avis-tipote10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jeremy B.</div><div class="tqz-tm-role">Entrepreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un veritable couteau suisse pour generer des leads avec des quiz. Que tu sois debutant ou non, tu automatises tout ou presque. Je recommande a 1000% !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9b9e3404de_503499461_122237150750193885_1174529389704311732_n.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Eric L.</div><div class="tqz-tm-role">Infopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz est une revolution pour ceux qui veulent segmenter leur audience avec des quiz connectes a Systeme.io. Je recommande a 1000%.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69aa866919724_photo_2026-02-11_18-47-10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jean Bernard R.</div><div class="tqz-tm-role">Createur de contenu</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">J'ai teste la generation de quiz et le resultat est incroyable. Les CTA personnalises pour chaque profil fonctionnent parfaitement.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fce5610b_avis-tipote7.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Bernard C.</div><div class="tqz-tm-role">Consultant</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz m'a vraiment aide a qualifier mes prospects. Mes leads sont tages automatiquement dans Systeme.io, un vrai gain de temps.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9411e3efd3_avis-tipote1.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Gwenn</div><div class="tqz-tm-role">Solopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Enfin un outil de quiz parfaitement pense marketing, relie directement a Systeme.io pour recuperer et taguer les leads, sans Zapier ni Make.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://ifs-association.com/wp-content/uploads/avatars/219/6233a3867d402-bpfull.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Adeline</div><div class="tqz-tm-role">Therapeute</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Super outil ! Tres simple d'utilisation, et surtout c'est le meilleur lead magnet aujourd'hui. Je suis fan. Merci Bene pour ce bijou !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9402fdf69d_avis-tipote8.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Evelyne G.</div><div class="tqz-tm-role">Coach</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un travail de dingue pour mettre autant de fonctionnalites dans un outil aussi simple. Tout est bien organise, les automatisations sont top.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fa9b2e22_avis-tipote9.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Maulisio T.</div><div class="tqz-tm-role">Marketeur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Meilleur outil de quiz pour segmenter et convertir. La connexion directe avec Systeme.io change tout. Plus besoin de bidouiller.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93e6d54227_avis-tipote10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jeremy B.</div><div class="tqz-tm-role">Entrepreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un veritable couteau suisse pour generer des leads avec des quiz. Que tu sois debutant ou non, tu automatises tout ou presque. Je recommande a 1000% !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9b9e3404de_503499461_122237150750193885_1174529389704311732_n.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Eric L.</div><div class="tqz-tm-role">Infopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz est une revolution pour ceux qui veulent segmenter leur audience avec des quiz connectes a Systeme.io. Je recommande a 1000%.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69aa866919724_photo_2026-02-11_18-47-10.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Jean Bernard R.</div><div class="tqz-tm-role">Createur de contenu</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">J'ai teste la generation de quiz et le resultat est incroyable. Les CTA personnalises pour chaque profil fonctionnent parfaitement.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fce5610b_avis-tipote7.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Bernard C.</div><div class="tqz-tm-role">Consultant</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Tiquiz m'a vraiment aide a qualifier mes prospects. Mes leads sont tages automatiquement dans Systeme.io, un vrai gain de temps.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9411e3efd3_avis-tipote1.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Gwenn</div><div class="tqz-tm-role">Solopreneur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Enfin un outil de quiz parfaitement pense marketing, relie directement a Systeme.io pour recuperer et taguer les leads, sans Zapier ni Make.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://ifs-association.com/wp-content/uploads/avatars/219/6233a3867d402-bpfull.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Adeline</div><div class="tqz-tm-role">Therapeute</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Super outil ! Tres simple d'utilisation, et surtout c'est le meilleur lead magnet aujourd'hui. Je suis fan. Merci Bene pour ce bijou !</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a9402fdf69d_avis-tipote8.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Evelyne G.</div><div class="tqz-tm-role">Coach</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Un travail de dingue pour mettre autant de fonctionnalites dans un outil aussi simple. Tout est bien organise, les automatisations sont top.</p></div>
  <div class="tqz-tm-card"><div class="tqz-tm-top"><img class="tqz-tm-av" src="https://d1yei2z3i6k35z.cloudfront.net/473100/69a93fa9b2e22_avis-tipote9.jpg" alt=""><div class="tqz-tm-info"><div class="tqz-tm-name">Maulisio T.</div><div class="tqz-tm-role">Marketeur</div><div class="tqz-tm-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div></div></div><p class="tqz-tm-txt">Meilleur outil de quiz pour segmenter et convertir. La connexion directe avec Systeme.io change tout. Plus besoin de bidouiller.</p></div>
</div></div>
`;

export const POPQUIZ = `
<style>
.tq-popquiz{font-family:'Open Sans',-apple-system,system-ui,sans-serif;padding:90px 24px;background:linear-gradient(180deg,#F4F7FE 0%,#EBF5FF 100%);position:relative;overflow:hidden}
.tq-popquiz__inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;z-index:2}
.tq-popquiz__media{position:relative;order:1}
.tq-popquiz__content{position:relative;order:2}
.tq-popquiz__chip{display:inline-block;background:linear-gradient(180deg,#5DD5F0 0%,#20BBE6 100%);color:#fff;font-weight:800;font-size:13px;letter-spacing:0.08em;padding:6px 14px;border-radius:12px;margin-bottom:18px;text-transform:uppercase}
.tq-popquiz__h2{color:#2B3264;font-size:40px;line-height:1.18;font-weight:700;margin:0 0 18px;letter-spacing:-0.02em;text-align:left}
.tq-popquiz__h2 span{color:#5A6EF6}
.tq-popquiz__sub{color:#5C6485;font-size:17px;line-height:1.55;margin:0 0 28px;text-align:left}
.tq-popquiz__list{list-style:none;padding:0;margin:0 0 32px;text-align:left}
.tq-popquiz__list li{display:flex;align-items:flex-start;gap:12px;padding:10px 0;color:#2B3264;font-size:15.5px;font-weight:500;line-height:1.45;text-align:left}
.tq-popquiz__list li>span:last-child{flex:1;text-align:left}
.tq-popquiz__check{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:#20BBE6;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;margin-top:2px}
.tq-popquiz__cta{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(180deg,#5A6EF6 0%,#4F5FE3 100%);color:#fff !important;text-decoration:none;padding:14px 30px;border-radius:30px;font-weight:700;font-size:16px;box-shadow:0 8px 20px rgba(90,110,246,0.35);transition:transform 0.2s ease,box-shadow 0.2s ease}
.tq-popquiz__cta:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(90,110,246,0.45)}
.tq-popquiz__cta-arrow{background:rgba(255,255,255,0.18);width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px}
.tq-popquiz__cases{margin:60px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:1200px;position:relative;z-index:2}
.tq-popquiz__case{background:#fff;border-radius:18px;padding:24px;box-shadow:0 6px 24px rgba(90,110,246,0.12);border:1px solid rgba(90,110,246,0.08)}
.tq-popquiz__case-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#5A6EF6 0%,#20BBE6 100%);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:20px;margin-bottom:14px;font-weight:900}
.tq-popquiz__case-title{color:#2B3264;font-size:16px;font-weight:800;margin:0 0 8px;line-height:1.3}
.tq-popquiz__case-desc{color:#5C6485;font-size:14px;line-height:1.5;margin:0}
.tq-popquiz__mockup{width:100%;max-width:580px;height:auto;display:block;margin:0 auto;filter:drop-shadow(0 30px 50px rgba(90,110,246,0.22))}
@media(max-width:900px){.tq-popquiz{padding:60px 20px}.tq-popquiz__inner{grid-template-columns:1fr;gap:40px}.tq-popquiz__media{order:1}.tq-popquiz__content{order:2}.tq-popquiz__h2{font-size:32px}.tq-popquiz__cases{grid-template-columns:repeat(2,1fr);gap:18px;margin-top:40px}}
@media(max-width:768px){.tq-popquiz{padding:50px 16px}.tq-popquiz__h2{font-size:26px}.tq-popquiz__h2 br{display:none}.tq-popquiz__sub{font-size:15px}.tq-popquiz__cta{display:flex;width:100%;max-width:320px;margin:0 auto;justify-content:center}.tq-popquiz__cases{grid-template-columns:1fr;gap:14px}}
</style>
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
        <g transform="translate(30, 30)"><rect width="540" height="48" rx="16" fill="#FFF" filter="url(#leadShadow)"/><rect x="14" y="14" width="20" height="20" rx="4" fill="#FF0000"/><polygon points="22,20 22,28 30,24" fill="#fff"/><text x="44" y="28" fill="#2B3264" font-weight="800" font-size="14" font-family="Open Sans, sans-serif">Video YouTube importee</text><text x="44" y="42" fill="#5C6485" font-size="11" font-family="Open Sans, sans-serif">youtube.com/watch?v=ton-contenu</text><circle cx="510" cy="24" r="12" fill="#20BBE6"/><text x="510" y="29" text-anchor="middle" fill="#fff" font-weight="900" font-size="13" font-family="Open Sans, sans-serif">OK</text></g>
        <rect x="30" y="110" width="540" height="340" rx="18" fill="url(#vidBg)"/>
        <circle cx="170" cy="250" r="45" fill="#3A4378" opacity="0.6"/><circle cx="160" cy="240" r="14" fill="#FFD89C" opacity="0.85"/><path d="M 130 300 Q 170 280 210 300 L 210 330 L 130 330 Z" fill="#3A4378" opacity="0.6"/><rect x="270" y="240" width="180" height="14" rx="7" fill="#5A6EF6" opacity="0.6"/><rect x="270" y="264" width="140" height="10" rx="5" fill="#fff" opacity="0.3"/><rect x="270" y="282" width="160" height="10" rx="5" fill="#fff" opacity="0.3"/>
        <rect x="50" y="430" width="500" height="6" rx="3" fill="#fff" opacity="0.18"/><rect x="50" y="430" width="0" height="6" rx="3" fill="#20BBE6"><animate attributeName="width" values="0;130;130;240;240;380;380;500;500" keyTimes="0;0.15;0.25;0.38;0.5;0.63;0.75;0.88;1" dur="8s" repeatCount="indefinite"/></rect>
        <circle cx="130" cy="433" r="7" fill="#20BBE6"/><circle cx="240" cy="433" r="9" fill="#20BBE6" stroke="#fff" stroke-width="2"><animate attributeName="r" values="9;11;9;9" keyTimes="0;0.5;0.6;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="380" cy="433" r="7" fill="#5A6EF6"/>
        <g filter="url(#quizShadow)"><g><animateTransform attributeName="transform" attributeType="XML" type="translate" values="60,0;0,0;0,0;0,0;60,0" keyTimes="0;0.15;0.85;0.95;1" dur="8s" repeatCount="indefinite"/><g opacity="0"><animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.15;0.85;0.95;1" dur="8s" repeatCount="indefinite"/>
        <rect x="320" y="140" width="240" height="270" rx="18" fill="url(#quizBg)"/><rect x="338" y="160" width="90" height="26" rx="8" fill="url(#chipCyan)"/><text x="383" y="178" text-anchor="middle" fill="#fff" font-weight="800" font-size="12" font-family="Open Sans, sans-serif">QUIZ 2/3</text>
        <text x="338" y="214" fill="#2B3264" font-weight="700" font-size="14" font-family="Open Sans, sans-serif">Quel est ton plus</text><text x="338" y="232" fill="#2B3264" font-weight="700" font-size="14" font-family="Open Sans, sans-serif">gros defi en ce moment ?</text>
        <rect x="338" y="250" width="204" height="30" rx="9" fill="#EBF1FE" stroke="#5A6EF6" stroke-width="2"><animate attributeName="stroke-width" values="2;3;2;2" keyTimes="0;0.4;0.6;1" dur="2s" repeatCount="indefinite"/></rect><text x="350" y="269" fill="#2B3264" font-weight="600" font-size="12" font-family="Open Sans, sans-serif">Plus de trafic</text>
        <rect x="338" y="286" width="204" height="30" rx="9" fill="#F4F7FE"/><text x="350" y="305" fill="#5C6485" font-weight="500" font-size="12" font-family="Open Sans, sans-serif">Mieux qualifier</text>
        <rect x="338" y="322" width="204" height="30" rx="9" fill="#F4F7FE"/><text x="350" y="341" fill="#5C6485" font-weight="500" font-size="12" font-family="Open Sans, sans-serif">Plus de ventes</text>
        <rect x="338" y="362" width="204" height="32" rx="16" fill="url(#ctaBg)"/><text x="440" y="382" text-anchor="middle" fill="#fff" font-weight="800" font-size="13" font-family="Open Sans, sans-serif">Suivant</text>
        </g></g></g>
        <g filter="url(#leadShadow)"><g opacity="0"><animate attributeName="opacity" values="0;0;0;1;1;0" keyTimes="0;0.5;0.7;0.78;0.92;1" dur="8s" repeatCount="indefinite"/><animateTransform attributeName="transform" attributeType="XML" type="translate" values="0,15;0,15;0,15;0,0;0,0;0,15" keyTimes="0;0.5;0.7;0.78;0.92;1" dur="8s" repeatCount="indefinite"/>
        <rect x="60" y="530" width="480" height="86" rx="18" fill="url(#cardLead)"/><circle cx="100" cy="573" r="22" fill="#FF6663"/><text x="100" y="580" text-anchor="middle" fill="#fff" font-weight="900" font-size="20" font-family="Open Sans, sans-serif">S</text>
        <text x="140" y="562" fill="#5C6485" font-size="11" font-weight="700" font-family="Open Sans, sans-serif" letter-spacing="0.08em">NOUVEAU LEAD CAPTURE</text><text x="140" y="585" fill="#2B3264" font-size="16" font-weight="800" font-family="Open Sans, sans-serif">Sophie Martin - sophie@email.com</text><text x="140" y="603" fill="#5C6485" font-size="12" font-weight="500" font-family="Open Sans, sans-serif">+1 tag profil-trafic vers Systeme.io</text><circle cx="510" cy="573" r="16" fill="#20BBE6"/><text x="510" y="580" text-anchor="middle" fill="#fff" font-weight="900" font-size="16" font-family="Open Sans, sans-serif">OK</text>
        </g></g>
      </svg>
    </div>
    <div class="tq-popquiz__content">
      <span class="tq-popquiz__chip">Nouveau - Popquiz</span>
      <h2 class="tq-popquiz__h2">Importe une video, ajoute tes quiz dedans,<br>elle devient une <span>machine a leads</span></h2>
      <p class="tq-popquiz__sub">Tu prends une video (lien YouTube, lien Vimeo ou fichier perso), tu la deposes dans Popquiz, tu places tes quiz aux moments-cles et tu publies. Pendant que ton spectateur regarde, les quiz s'affichent en surimpression. Il repond, son email atterrit taggue dans Systeme io.</p>
      <ul class="tq-popquiz__list">
        <li><span class="tq-popquiz__check">+</span><span>Importe ta video : lien <strong>YouTube</strong>, lien <strong>Vimeo</strong> ou fichier perso jusqu'a <strong>2 Go</strong></span></li>
        <li><span class="tq-popquiz__check">+</span><span>Place tes quiz aux <strong>moments-cles</strong> sur la timeline (a 0:30, a 2:15, comme tu veux)</span></li>
        <li><span class="tq-popquiz__check">+</span><span>Choisis le mode <strong>bloquant</strong> ou <strong>optionnel</strong></span></li>
        <li><span class="tq-popquiz__check">+</span><span>Les leads atterrissent <strong>taggues dans Systeme io</strong> en direct, sans Zapier</span></li>
        <li><span class="tq-popquiz__check">+</span><span>Embed pret a coller sur ton <strong>blog</strong>, ta page <strong>Systeme io</strong> ou ton site <strong>WordPress</strong></span></li>
      </ul>
      <a class="tq-popquiz__cta" href="#tarifs">C'est parti ! <span class="tq-popquiz__cta-arrow">&#8594;</span></a>
    </div>
  </div>
  <div class="tq-popquiz__cases">
    <div class="tq-popquiz__case"><span class="tq-popquiz__case-icon">&#9654;</span><h3 class="tq-popquiz__case-title">Ta chaine YouTube reveillee</h3><p class="tq-popquiz__case-desc">Tes anciennes videos qui dorment se mettent a capter des leads chaque jour, sans en tourner une seule nouvelle.</p></div>
    <div class="tq-popquiz__case"><span class="tq-popquiz__case-icon">&#9201;</span><h3 class="tq-popquiz__case-title">Ton replay de webinaire qui vend</h3><p class="tq-popquiz__case-desc">Le replay d'1 heure que personne ne regardait jusqu'au bout devient un mini-tunnel qui qualifie chaque spectateur.</p></div>
    <div class="tq-popquiz__case"><span class="tq-popquiz__case-icon">&#9733;</span><h3 class="tq-popquiz__case-title">Une video virale a ton service</h3><p class="tq-popquiz__case-desc">Tu deposes un TED Talk pertinent dans Popquiz, tu glisses tes quiz, et le trafic devient ton trafic.</p></div>
  </div>
</section>
`;

export const QUIZ_BUILDER = `
<style>
.tqz-qb *{margin:0;padding:0;box-sizing:border-box}
.tqz-qb{width:100%;max-width:420px;margin:0 auto;padding:30px 16px;font-family:'Inter','Open Sans',system-ui,sans-serif}
.tqz-qb-phone{background:#fff;border-radius:32px;box-shadow:0 25px 70px rgba(43,50,100,.18),0 4px 12px rgba(43,50,100,.06);border:3px solid #eaecf5;overflow:hidden;opacity:0;transform:translateY(20px)}
.tqz-qb.tqz-visible .tqz-qb-phone{animation:tqzQbIn .7s cubic-bezier(.22,1,.36,1) .15s forwards}
@keyframes tqzQbIn{to{opacity:1;transform:translateY(0)}}
.tqz-qb-header{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid #f0f1f7}
.tqz-qb-back{width:32px;height:32px;border-radius:50%;background:#f4f5fb;display:flex;align-items:center;justify-content:center}
.tqz-qb-back svg{width:16px;height:16px;fill:none;stroke:#2B3264;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.tqz-qb-htitle{font-size:16px;font-weight:800;color:#2B3264}
.tqz-qb-toggle{display:flex;align-items:center;gap:8px;padding:14px 20px 0}
.tqz-qb-tg-track{width:44px;height:24px;border-radius:12px;background:linear-gradient(135deg,#5E6DDE,#20BBE6);position:relative;cursor:pointer}
.tqz-qb-tg-dot{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:3px;right:3px;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.tqz-qb-tg-labels{display:flex;gap:4px;font-size:11px;font-weight:800;letter-spacing:.06em;color:#8890B5}
.tqz-qb-tg-labels span:last-child{color:#5E6DDE}
.tqz-qb-textarea{margin:14px 20px 0;background:#f8f9fc;border:1.5px solid #e4e7f5;border-radius:14px;padding:14px 16px;min-height:72px;font-size:13px;color:#2B3264;font-weight:500;line-height:1.5;font-family:'Inter','Open Sans',system-ui,sans-serif;overflow:hidden;position:relative}
.tqz-qb-typed{display:inline}
.tqz-qb-cursor{display:inline-block;width:1.5px;height:16px;background:#5E6DDE;vertical-align:text-bottom;margin-left:1px;opacity:0}
.tqz-qb.tqz-visible .tqz-qb-cursor{animation:tqzBlinkQ 1s step-end .5s infinite}
@keyframes tqzBlinkQ{0%,100%{opacity:1}50%{opacity:0}}
.tqz-qb-gen{display:flex;align-items:center;justify-content:center;gap:8px;margin:16px auto 0;padding:12px 28px;background:linear-gradient(135deg,#5E6DDE,#20BBE6);color:#fff;font-size:14px;font-weight:800;border:none;border-radius:30px;cursor:pointer;box-shadow:0 6px 20px rgba(94,109,222,.3);opacity:0;transform:scale(.9)}
.tqz-qb-gen svg{width:18px;height:18px;fill:#fff}
.tqz-qb.tqz-visible .tqz-qb-gen{animation:tqzGenIn .5s ease 3.2s forwards,tqzGenPulse 3s ease-in-out 4.5s infinite}
@keyframes tqzGenIn{to{opacity:1;transform:scale(1)}}
@keyframes tqzGenPulse{0%,100%{box-shadow:0 6px 20px rgba(94,109,222,.3)}50%{box-shadow:0 6px 28px rgba(94,109,222,.5)}}
.tqz-qb-list{padding:6px 20px 20px}
.tqz-qb-q{display:flex;align-items:center;gap:12px;padding:14px 16px;margin-top:10px;background:#f8f9fc;border:1.5px solid #e4e7f5;border-radius:12px;opacity:0;transform:translateY(12px)}
.tqz-qb-q:first-child{border-color:#5E6DDE;background:linear-gradient(135deg,rgba(94,109,222,.05),rgba(32,187,230,.03))}
.tqz-qb-qnum{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#5E6DDE,#20BBE6);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
.tqz-qb-q:not(:first-child) .tqz-qb-qnum{background:#e4e7f5;color:#8890B5}
.tqz-qb-qtxt{font-size:13px;font-weight:600;color:#2B3264;line-height:1.35;text-align:left}
.tqz-qb.tqz-visible .tqz-qb-q:nth-child(1){animation:tqzQIn .45s cubic-bezier(.22,1,.36,1) 3.8s forwards}
.tqz-qb.tqz-visible .tqz-qb-q:nth-child(2){animation:tqzQIn .45s cubic-bezier(.22,1,.36,1) 4.1s forwards}
.tqz-qb.tqz-visible .tqz-qb-q:nth-child(3){animation:tqzQIn .45s cubic-bezier(.22,1,.36,1) 4.4s forwards}
.tqz-qb.tqz-visible .tqz-qb-q:nth-child(4){animation:tqzQIn .45s cubic-bezier(.22,1,.36,1) 4.7s forwards}
.tqz-qb.tqz-visible .tqz-qb-q:nth-child(5){animation:tqzQIn .45s cubic-bezier(.22,1,.36,1) 5.0s forwards}
@keyframes tqzQIn{to{opacity:1;transform:translateY(0)}}
@media(max-width:500px){.tqz-qb{padding:20px 10px}.tqz-qb-textarea{font-size:12px;min-height:60px}.tqz-qb-qtxt{font-size:12px}.tqz-qb-htitle{font-size:14px}}
</style>
<div class="tqz-qb" id="tqz-qb-widget">
  <div class="tqz-qb-phone">
    <div class="tqz-qb-header"><div class="tqz-qb-back"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="tqz-qb-htitle">Mon questionnaire</div></div>
    <div class="tqz-qb-toggle"><div class="tqz-qb-tg-track"><div class="tqz-qb-tg-dot"></div></div><div class="tqz-qb-tg-labels"><span>TU</span><span>VOUS</span></div></div>
    <div class="tqz-qb-textarea"><span class="tqz-qb-typed" id="tqz-qb-typed"></span><span class="tqz-qb-cursor"></span></div>
    <div style="text-align:center"><button class="tqz-qb-gen"><svg viewBox="0 0 24 24"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z"/></svg>Generer</button></div>
    <div class="tqz-qb-list">
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">1</div><div class="tqz-qb-qtxt">Quel est le plus gros defi avec ton chien au quotidien ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">2</div><div class="tqz-qb-qtxt">Depuis combien de temps as-tu ton chien ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">3</div><div class="tqz-qb-qtxt">As-tu deja essaye une methode d'education canine ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">4</div><div class="tqz-qb-qtxt">Quel resultat attends-tu d'une formation ?</div></div>
      <div class="tqz-qb-q"><div class="tqz-qb-qnum">5</div><div class="tqz-qb-qtxt">Quel budget es-tu pret(e) a investir pour eduquer ton chien ?</div></div>
    </div>
  </div>
</div>
`;

export const SHARE_EMBED = `
<style>
.tqz-sh *{margin:0;padding:0;box-sizing:border-box}
.tqz-sh{width:100%;max-width:480px;margin:0 auto;padding:30px 16px;font-family:'Inter','Open Sans',system-ui,sans-serif}
.tqz-sh-phone{background:#fff;border-radius:32px;box-shadow:0 25px 70px rgba(43,50,100,.18),0 4px 12px rgba(43,50,100,.06);border:3px solid #eaecf5;overflow:hidden;padding:28px 24px 24px;opacity:0;transform:translateY(20px)}
.tqz-sh.tqz-visible .tqz-sh-phone{animation:tqzShIn .7s cubic-bezier(.22,1,.36,1) .15s forwards}
@keyframes tqzShIn{to{opacity:1;transform:translateY(0)}}
.tqz-sh-section{margin-bottom:28px;opacity:0;transform:translateY(12px)}
.tqz-sh.tqz-visible .tqz-sh-section:nth-child(1){animation:tqzSecIn .5s ease .6s forwards}
.tqz-sh.tqz-visible .tqz-sh-section:nth-child(2){animation:tqzSecIn .5s ease 1.4s forwards}
@keyframes tqzSecIn{to{opacity:1;transform:translateY(0)}}
.tqz-sh-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.tqz-sh-head-left{display:flex;align-items:center;gap:10px}
.tqz-sh-icon{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,rgba(94,109,222,.1),rgba(32,187,230,.08));display:flex;align-items:center;justify-content:center}
.tqz-sh-icon svg{width:18px;height:18px;fill:none;stroke:#5E6DDE;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tqz-sh-stitle{font-size:16px;font-weight:800;color:#2B3264}
.tqz-sh-copy{padding:8px 16px;border-radius:8px;border:1.5px solid #5E6DDE;background:transparent;color:#5E6DDE;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter','Open Sans',system-ui,sans-serif;opacity:0;transform:scale(.9)}
.tqz-sh.tqz-visible .tqz-sh-section:nth-child(1) .tqz-sh-copy{animation:tqzCopyIn .4s ease 1.0s forwards,tqzCopyPulse 4s ease-in-out 3s infinite}
.tqz-sh.tqz-visible .tqz-sh-section:nth-child(2) .tqz-sh-copy{animation:tqzCopyIn .4s ease 1.8s forwards,tqzCopyPulse 4s ease-in-out 4s infinite}
@keyframes tqzCopyIn{to{opacity:1;transform:scale(1)}}
@keyframes tqzCopyPulse{0%,100%{border-color:#5E6DDE;box-shadow:none}50%{border-color:#20BBE6;box-shadow:0 0 0 3px rgba(32,187,230,.1)}}
.tqz-sh-label{font-size:12px;font-weight:600;color:#8890B5;margin-bottom:8px}
.tqz-sh-input{width:100%;padding:13px 16px;background:#f8f9fc;border:1.5px solid #e4e7f5;border-radius:10px;font-size:13px;font-weight:500;color:#2B3264;font-family:'Inter','Open Sans',system-ui,sans-serif;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.tqz-sh-code{background:#2B3264;border-radius:14px;padding:18px 18px;font-family:'Courier New',monospace;font-size:12px;line-height:1.6;color:rgba(255,255,255,.75);overflow:hidden;position:relative}
.tqz-sh-code .tqz-hl-tag{color:#20BBE6}
.tqz-sh-code .tqz-hl-attr{color:#8B95E8}
.tqz-sh-code .tqz-hl-val{color:#05DFF3}
.tqz-sh-code .tqz-hl-cmt{color:rgba(255,255,255,.35)}
.tqz-sh-code-line{opacity:0;transform:translateX(-10px)}
.tqz-sh.tqz-visible .tqz-sh-code-line:nth-child(1){animation:tqzCodeIn .3s ease 2.2s forwards}
.tqz-sh.tqz-visible .tqz-sh-code-line:nth-child(2){animation:tqzCodeIn .3s ease 2.5s forwards}
.tqz-sh.tqz-visible .tqz-sh-code-line:nth-child(3){animation:tqzCodeIn .3s ease 2.8s forwards}
.tqz-sh.tqz-visible .tqz-sh-code-line:nth-child(4){animation:tqzCodeIn .3s ease 3.1s forwards}
.tqz-sh.tqz-visible .tqz-sh-code-line:nth-child(5){animation:tqzCodeIn .3s ease 3.4s forwards}
@keyframes tqzCodeIn{to{opacity:1;transform:translateX(0)}}
@media(max-width:500px){.tqz-sh{padding:20px 10px}.tqz-sh-phone{padding:22px 18px 20px;border-radius:24px}.tqz-sh-stitle{font-size:14px}.tqz-sh-code{font-size:11px;padding:14px 14px}.tqz-sh-input{font-size:12px}}
</style>
<div class="tqz-sh" id="tqz-sh-widget">
  <div class="tqz-sh-phone">
    <div class="tqz-sh-section">
      <div class="tqz-sh-head"><div class="tqz-sh-head-left"><div class="tqz-sh-icon"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div><div class="tqz-sh-stitle">Partager avec un lien</div></div><button class="tqz-sh-copy">Copier le lien</button></div>
      <div class="tqz-sh-label">Lien</div>
      <div class="tqz-sh-input"><span id="tqz-sh-url"></span></div>
    </div>
    <div class="tqz-sh-section">
      <div class="tqz-sh-head"><div class="tqz-sh-head-left"><div class="tqz-sh-icon"><svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><div class="tqz-sh-stitle">Ajouter a mon site</div></div><button class="tqz-sh-copy">Copier le code</button></div>
      <div class="tqz-sh-code">
        <div class="tqz-sh-code-line"><span class="tqz-hl-cmt">&lt;!-- Tiquiz begin --&gt;</span></div>
        <div class="tqz-sh-code-line"><span class="tqz-hl-tag">&lt;iframe</span> <span class="tqz-hl-attr">src</span>=<span class="tqz-hl-val">"https://app.tiquiz.com/sandra-costa/formation-canine"</span></div>
        <div class="tqz-sh-code-line">&nbsp;&nbsp;<span class="tqz-hl-attr">style</span>=<span class="tqz-hl-val">"border:0"</span> <span class="tqz-hl-attr">width</span>=<span class="tqz-hl-val">"100%"</span> <span class="tqz-hl-attr">height</span>=<span class="tqz-hl-val">"600"</span></div>
        <div class="tqz-sh-code-line">&nbsp;&nbsp;<span class="tqz-hl-attr">frameborder</span>=<span class="tqz-hl-val">"0"</span><span class="tqz-hl-tag">&gt;&lt;/iframe&gt;</span></div>
        <div class="tqz-sh-code-line"><span class="tqz-hl-cmt">&lt;!-- end Tiquiz --&gt;</span></div>
      </div>
    </div>
  </div>
</div>
`;

export const PHONE_MOCKUP = `
<style>
.tqz-mk *{margin:0;padding:0;box-sizing:border-box}
.tqz-mk{width:100%;max-width:1060px;margin:0 auto;padding:50px 20px 60px;position:relative;height:620px;font-family:'Inter','Open Sans',system-ui,sans-serif}
.tqz-phone{width:280px;height:560px;position:absolute;background:#fff;border-radius:40px;box-shadow:0 25px 70px rgba(43,50,100,.22),0 4px 12px rgba(43,50,100,.08);border:3px solid #eaecf5;overflow:hidden;opacity:0}
.tqz-phone.tqz-p1{left:0;top:20px;transform:rotate(-5deg) translateY(30px);z-index:1}
.tqz-phone.tqz-p2{left:50%;top:0;transform:translateX(-50%) rotate(-1deg) translateY(30px);z-index:2}
.tqz-phone.tqz-p3{right:0;top:20px;transform:rotate(3deg) translateY(30px);z-index:3}
.tqz-mk.tqz-visible .tqz-phone.tqz-p1{animation:tqzP1In .8s cubic-bezier(.22,1,.36,1) .2s forwards}
.tqz-mk.tqz-visible .tqz-phone.tqz-p2{animation:tqzP2In .8s cubic-bezier(.22,1,.36,1) .5s forwards}
.tqz-mk.tqz-visible .tqz-phone.tqz-p3{animation:tqzP3In .8s cubic-bezier(.22,1,.36,1) .8s forwards}
@keyframes tqzP1In{to{opacity:1;transform:rotate(-5deg) translateY(0)}}
@keyframes tqzP2In{to{opacity:1;transform:translateX(-50%) rotate(-1deg) translateY(0)}}
@keyframes tqzP3In{to{opacity:1;transform:rotate(3deg) translateY(0)}}
@media(max-width:1060px){.tqz-mk{max-width:920px}}
.tqz-status{display:flex;justify-content:space-between;align-items:center;padding:12px 22px 8px;font-size:12px;font-weight:600;color:#2B3264}
.tqz-status-r{display:flex;gap:3px;align-items:center}
.tqz-status-r svg{width:15px;height:15px;fill:#2B3264}
.tqz-scr{padding:0 18px 22px;text-align:left}
.tqz-img-ph{width:calc(100% + 36px);margin-left:-18px;height:150px;background:linear-gradient(135deg,#e4e7f5 0%,#d0d5eb 100%);display:flex;align-items:center;justify-content:center;margin-bottom:14px;overflow:hidden;position:relative;opacity:0}
.tqz-img-ph img{width:100%;height:100%;object-fit:cover}
.tqz-s1-title{font-size:19px;font-weight:900;color:#2B3264;line-height:1.25;margin-bottom:12px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-s1-text{font-size:12px;color:#5a5f7a;line-height:1.55;margin-bottom:6px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-s1-text b{color:#2B3264}
.tqz-cta{display:block;width:auto;margin:14px 0 0;padding:13px 32px;background:linear-gradient(135deg,#5E6DDE,#20BBE6);color:#fff;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;border:none;border-radius:30px;text-align:center;cursor:pointer;box-shadow:0 6px 24px rgba(94,109,222,.35);opacity:0;transform:translateY(8px);position:relative}
.tqz-cta-wrap{position:relative}
.tqz-arrow-left{display:block;width:70px;height:50px;margin:8px 0 0 0;opacity:0;transform:translateY(8px)}
.tqz-arrow-right{display:block;width:70px;height:50px;margin:8px 0 0 auto;opacity:0;transform:translateY(8px)}
.tqz-arrow-left path,.tqz-arrow-right path{fill:none;stroke:#5E6DDE;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.tqz-arrow-left polygon,.tqz-arrow-right polygon{fill:#5E6DDE}
@keyframes tqzArrBobL{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-3px)}}
@keyframes tqzArrBobR{0%,100%{transform:translate(0,0)}50%{transform:translate(-3px,-3px)}}
@keyframes tqzFadeUp{to{opacity:1;transform:translateY(0)}}
@keyframes tqzImgIn{to{opacity:1}}
.tqz-mk.tqz-visible .tqz-img-ph{animation:tqzImgIn .6s ease .3s forwards}
.tqz-mk.tqz-visible .tqz-s1-title{animation:tqzFadeUp .5s ease .6s forwards}
.tqz-mk.tqz-visible .tqz-s1-text:nth-of-type(1){animation:tqzFadeUp .4s ease .75s forwards}
.tqz-mk.tqz-visible .tqz-s1-text:nth-of-type(2){animation:tqzFadeUp .4s ease .85s forwards}
.tqz-mk.tqz-visible .tqz-s1-text:nth-of-type(3){animation:tqzFadeUp .4s ease .95s forwards}
.tqz-mk.tqz-visible .tqz-cta{animation:tqzFadeUp .5s ease 1.2s forwards}
.tqz-mk.tqz-visible .tqz-arrow-left{animation:tqzFadeUp .5s ease 1.8s forwards,tqzArrBobL 2.5s ease-in-out 2.5s infinite}
.tqz-mk.tqz-visible .tqz-arrow-right{animation:tqzFadeUp .5s ease 1.8s forwards,tqzArrBobR 2.5s ease-in-out 2.5s infinite}
.tqz-q-step{font-size:11px;font-weight:800;color:#20BBE6;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;text-align:left}
.tqz-q-title{font-size:17px;font-weight:800;color:#2B3264;line-height:1.3;margin-bottom:14px;text-align:left}
.tqz-ans{padding:11px 14px;border-radius:12px;margin-bottom:8px;border:2px solid #e4e7f5;font-size:12px;color:#2B3264;font-weight:600;line-height:1.4;text-align:left;display:flex;align-items:flex-start;gap:8px;opacity:0;transform:translateX(-15px)}
@keyframes tqzSlideR{to{opacity:1;transform:translateX(0)}}
.tqz-ans .tqz-em{font-size:15px;flex-shrink:0;line-height:1}
.tqz-ans.tqz-sel{border-color:#5E6DDE;background:linear-gradient(135deg,rgba(94,109,222,.07),rgba(32,187,230,.05))}
.tqz-mk.tqz-visible .tqz-ans:nth-child(1){animation:tqzSlideR .4s ease 1.1s forwards}
.tqz-mk.tqz-visible .tqz-ans:nth-child(2){animation:tqzSlideR .4s ease 1.3s forwards}
.tqz-mk.tqz-visible .tqz-ans:nth-child(3){animation:tqzSlideR .4s ease 1.5s forwards}
.tqz-mk.tqz-visible .tqz-ans:nth-child(4){animation:tqzSlideR .4s ease 1.7s forwards}
@keyframes tqzAnsHL{0%,20%{border-color:#e4e7f5;background:transparent;transform:scale(1)}10%{border-color:#20BBE6;background:rgba(32,187,230,.08);transform:scale(1.02)}}
.tqz-mk.tqz-visible .tqz-p2 .tqz-ans:nth-child(2){animation:tqzSlideR .4s ease 1.3s forwards,tqzAnsHL 5s ease-in-out 3.75s infinite}
.tqz-mk.tqz-visible .tqz-p2 .tqz-ans:nth-child(3){animation:tqzSlideR .4s ease 1.5s forwards,tqzAnsHL 5s ease-in-out 5s infinite}
.tqz-mk.tqz-visible .tqz-p2 .tqz-ans:nth-child(4){animation:tqzSlideR .4s ease 1.7s forwards,tqzAnsHL 5s ease-in-out 6.25s infinite}
@keyframes tqzSelPulse{0%,100%{border-color:#5E6DDE;box-shadow:0 0 0 0 rgba(32,187,230,0)}50%{border-color:#20BBE6;box-shadow:0 0 0 4px rgba(32,187,230,.12)}}
.tqz-mk.tqz-visible .tqz-p2 .tqz-ans.tqz-sel{animation:tqzSlideR .4s ease 1.1s forwards,tqzSelPulse 3s ease-in-out 2.5s infinite}
.tqz-o-badge{display:inline-block;font-size:11px;font-weight:800;color:#20BBE6;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-o-title{font-size:16px;font-weight:900;color:#2B3264;line-height:1.25;margin-bottom:10px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-o-title span{color:#5E6DDE}
.tqz-o-text{font-size:11.5px;color:#5a5f7a;line-height:1.5;margin-bottom:8px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-o-text b{color:#2B3264}
.tqz-o-urg{font-size:11px;font-weight:700;color:#e74c3c;font-style:italic;margin-bottom:14px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-cta-o{display:block;width:100%;padding:13px 16px;background:linear-gradient(135deg,#5E6DDE,#20BBE6);color:#fff;font-size:12.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;border:none;border-radius:30px;text-align:center;cursor:pointer;white-space:nowrap;box-shadow:0 6px 24px rgba(94,109,222,.35);opacity:0;transform:translateY(8px);position:relative}
.tqz-mk.tqz-visible .tqz-o-badge{animation:tqzFadeUp .4s ease 1.0s forwards}
.tqz-mk.tqz-visible .tqz-o-title{animation:tqzFadeUp .4s ease 1.1s forwards}
.tqz-mk.tqz-visible .tqz-o-text:nth-of-type(1){animation:tqzFadeUp .4s ease 1.2s forwards}
.tqz-mk.tqz-visible .tqz-o-urg{animation:tqzFadeUp .4s ease 1.4s forwards,tqzUrgBlink 2.5s ease-in-out 2.5s infinite}
.tqz-mk.tqz-visible .tqz-cta-o{animation:tqzFadeUp .5s ease 1.6s forwards}
@keyframes tqzUrgBlink{0%,100%{opacity:1}50%{opacity:.55}}
@media(max-width:780px){.tqz-mk{height:auto;display:flex;flex-direction:column;align-items:center;gap:28px;padding:30px 16px}.tqz-phone{position:relative !important;left:auto !important;right:auto !important;top:auto !important;transform:none !important;height:auto !important;width:100%;max-width:320px}.tqz-mk.tqz-visible .tqz-phone.tqz-p1{animation:tqzMobIn .6s ease .2s forwards}.tqz-mk.tqz-visible .tqz-phone.tqz-p2{animation:tqzMobIn .6s ease .4s forwards}.tqz-mk.tqz-visible .tqz-phone.tqz-p3{animation:tqzMobIn .6s ease .6s forwards}@keyframes tqzMobIn{to{opacity:1;transform:none}}}
@media(max-width:380px){.tqz-phone{max-width:280px}.tqz-s1-title{font-size:17px}.tqz-q-title{font-size:15px}.tqz-o-title{font-size:14px}}
</style>
<div class="tqz-mk" id="tqz-mk-widget">
  <div class="tqz-phone tqz-p1">
    <div class="tqz-status"><span>16:17</span><div class="tqz-status-r"><svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg><svg viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg></div></div>
    <div class="tqz-scr">
      <div class="tqz-img-ph"><img src="https://d1yei2z3i6k35z.cloudfront.net/473100/69da1673d0c831.93521721_Designsanstitre15.png" alt=""></div>
      <div class="tqz-s1-title">Pourquoi personne ne te trouve sur Google (et comment y remedier)</div>
      <p class="tqz-s1-text">Tu penses que ton business est visible sur Google ? Mauvaise nouvelle : dans 80% des cas, ce n'est pas le cas.</p>
      <p class="tqz-s1-text">Pire : tes clients cherchent tes services tous les jours mais tombent chez tes concurrents.</p>
      <p class="tqz-s1-text"><b>Fais ce quiz pour evaluer comment te rendre plus visible sans trop d'efforts</b></p>
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
        <div class="tqz-ans"><span class="tqz-em">&#129309;</span><span>Un peu Google + bouche-a-oreille</span></div>
        <div class="tqz-ans"><span class="tqz-em">&#128483;</span><span>Principalement bouche-a-oreille</span></div>
        <div class="tqz-ans"><span class="tqz-em">&#129668;</span><span>C'est un miracle s'ils me trouvent</span></div>
      </div>
    </div>
  </div>
  <div class="tqz-phone tqz-p3">
    <div class="tqz-status"><span>16:17</span><div class="tqz-status-r"><svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg><svg viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg></div></div>
    <div class="tqz-scr">
      <div class="tqz-img-ph"><img src="https://d1yei2z3i6k35z.cloudfront.net/473100/69da173e77e933.81017767_Designsanstitre17.png" alt=""></div>
      <div class="tqz-o-badge">Bonus debloque !</div>
      <div class="tqz-o-title">Felicitation Hugo, tu viens de debloquer une reduction de <span>-50%</span> sur l'optimisation de visibilite !</div>
      <p class="tqz-o-text"><b>Entre le code promo QUIZ</b> sur la page suivante et profite de mon expertise pour <b>49EUR au lieu de 99EUR</b></p>
      <p class="tqz-o-urg">Attention : il n'y a que 20 codes promos disponibles, profite du tien avant les autres !</p>
      <div class="tqz-cta-wrap"><button class="tqz-cta-o">J'en profite maintenant</button><svg class="tqz-arrow-right" viewBox="0 0 70 50"><path d="M65,45 Q50,20 20,5"/><polygon points="14,2 21,2 19,8"/></svg></div>
    </div>
  </div>
</div>
`;

export const FACEBOOK = `
<style>
.tqz-fb *{margin:0;padding:0;box-sizing:border-box}
.tqz-fb{width:100%;max-width:520px;margin:0 auto;padding:40px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;position:relative}
.tqz-fb-card{background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08),0 8px 30px rgba(43,50,100,.1);overflow:visible;opacity:0;transform:translateY(20px)}
.tqz-fb.tqz-visible .tqz-fb-card{animation:tqzFbIn .7s cubic-bezier(.22,1,.36,1) .15s forwards}
@keyframes tqzFbIn{to{opacity:1;transform:translateY(0)}}
.tqz-fb-hdr{display:flex;align-items:center;gap:10px;padding:12px 16px 0}
.tqz-fb-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover}
.tqz-fb-hdr-info{flex:1;text-align:left}
.tqz-fb-name{font-size:15px;font-weight:600;color:#050505;line-height:1.2}
.tqz-fb-time{font-size:13px;color:#65676b;line-height:1.3}
.tqz-fb-txt{padding:8px 16px 10px;font-size:15px;color:#050505;line-height:1.35;text-align:left}
.tqz-fb-hashtag{color:#385898;font-weight:400}
.tqz-fb-preview{position:relative;background:#dfe3f3;height:280px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.tqz-fb-rockets{position:absolute;inset:0;font-size:30px;line-height:1}
.tqz-fb-rk{position:absolute;opacity:.7}
.tqz-fb.tqz-visible .tqz-fb-rk{animation:tqzRkFloat 4s ease-in-out infinite}
@keyframes tqzRkFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-5px) rotate(2deg)}}
.tqz-fb-bubble{position:relative;z-index:2;background:#fff;border-radius:18px;padding:22px 32px;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center;opacity:0;transform:scale(.85)}
.tqz-fb.tqz-visible .tqz-fb-bubble{animation:tqzBubPop .6s cubic-bezier(.34,1.56,.64,1) .8s forwards}
@keyframes tqzBubPop{to{opacity:1;transform:scale(1)}}
.tqz-fb-bubble-txt{font-size:22px;font-weight:800;color:#1c1e21;line-height:1.3}
.tqz-fb-link{background:#f0f2f5;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.tqz-fb-link-info{flex:1;text-align:left}
.tqz-fb-link-domain{font-size:12px;color:#65676b;text-transform:uppercase;letter-spacing:.02em;line-height:1.3}
.tqz-fb-link-title{font-size:15px;font-weight:600;color:#050505;line-height:1.3;margin-top:1px}
.tqz-fb-link-btn{padding:8px 12px;border-radius:6px;background:#e4e6eb;font-size:13px;font-weight:600;color:#050505;border:none;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0}
.tqz-fb-reactions{padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-size:15px;color:#65676b}
.tqz-fb-react-left{display:flex;align-items:center;gap:2px}
.tqz-fb-react-emojis{display:flex}
.tqz-fb-react-emojis span{width:20px;height:20px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;margin-left:-3px}
.tqz-fb-react-emojis span:first-child{margin-left:0}
.tqz-fb-react-emojis .tqz-rlike{background:#1877f2}
.tqz-fb-react-emojis .tqz-rheart{background:#f0326b}
.tqz-fb-react-count{margin-left:6px;font-size:15px;color:#65676b}
.tqz-fb-stats{font-size:15px;color:#65676b}
.tqz-fb-actions{display:flex;border-top:1px solid #ced0d4;margin:0 16px}
.tqz-fb-act{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 0;font-size:15px;font-weight:600;color:#65676b;cursor:pointer}
.tqz-fb-act svg{width:20px;height:20px}
.tqz-fb-emo{position:absolute;opacity:0;transform:scale(0);z-index:10;pointer-events:none}
.tqz-fb-emo-heart{top:20px;right:0;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f0326b,#ff5c8d);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(240,50,107,.35)}
.tqz-fb-emo-heart svg{width:32px;height:32px;fill:#fff}
.tqz-fb.tqz-visible .tqz-fb-emo-heart{animation:tqzEmoPop .5s cubic-bezier(.34,1.56,.64,1) 1.2s forwards,tqzEmoFloat 3s ease-in-out 2.5s infinite}
.tqz-fb-emo-wow{top:42%;left:0;font-size:44px}
.tqz-fb.tqz-visible .tqz-fb-emo-wow{animation:tqzEmoPop .5s cubic-bezier(.34,1.56,.64,1) 1.6s forwards,tqzEmoFloat 3.5s ease-in-out 3s infinite}
.tqz-fb-emo-rofl{bottom:90px;right:0;font-size:44px}
.tqz-fb.tqz-visible .tqz-fb-emo-rofl{animation:tqzEmoPop .5s cubic-bezier(.34,1.56,.64,1) 2.0s forwards,tqzEmoFloat 4s ease-in-out 3.5s infinite}
@keyframes tqzEmoPop{to{opacity:1;transform:scale(1)}}
@keyframes tqzEmoFloat{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.06) translateY(-5px)}}
.tqz-fb-react-count,.tqz-fb-stats{opacity:0}
.tqz-fb.tqz-visible .tqz-fb-react-count{animation:tqzFInF .4s ease 1.4s forwards}
.tqz-fb.tqz-visible .tqz-fb-stats{animation:tqzFInF .4s ease 1.6s forwards}
@keyframes tqzFInF{to{opacity:1}}
@media(max-width:520px){.tqz-fb{padding:24px 10px}.tqz-fb-preview{height:220px}.tqz-fb-bubble-txt{font-size:18px}.tqz-fb-bubble{padding:16px 22px}.tqz-fb-emo-heart{width:50px;height:50px;top:14px;right:-4px}.tqz-fb-emo-heart svg{width:26px;height:26px}.tqz-fb-emo-wow{font-size:36px;left:-4px}.tqz-fb-emo-rofl{font-size:36px;right:-4px}}
</style>
<div class="tqz-fb" id="tqz-fb-widget">
  <div class="tqz-fb-emo tqz-fb-emo-heart"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
  <div class="tqz-fb-emo tqz-fb-emo-wow">&#x1F62E;</div>
  <div class="tqz-fb-emo tqz-fb-emo-rofl">&#x1F923;</div>
  <div class="tqz-fb-card">
    <div class="tqz-fb-hdr"><img class="tqz-fb-avatar" src="https://cdn8.futura-sciences.com/s480/images/mz.jpg" alt="Mark Zuckerberg"><div class="tqz-fb-hdr-info"><div class="tqz-fb-name">Mark Zuckerberg</div><div class="tqz-fb-time">23min</div></div></div>
    <div class="tqz-fb-txt">J'ai fait le test et c'est carrement moi &#x1F60E;<br><span class="tqz-fb-hashtag">#entrepreneurAcharne</span></div>
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
      <div class="tqz-fb-bubble"><div class="tqz-fb-bubble-txt">Quel type d'entrepreneur<br>etes-vous ? &#x1F525;</div></div>
    </div>
    <div class="tqz-fb-link"><div class="tqz-fb-link-info"><div class="tqz-fb-link-domain">TIQUIZ.COM</div><div class="tqz-fb-link-title">Quel type d'entrepreneur etes-vous ?</div></div><button class="tqz-fb-link-btn">En savoir plus</button></div>
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
<style>
.tqz-sc{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:0 auto;position:relative;overflow:hidden;min-height:440px}
.tqz-sc *{box-sizing:border-box}
.tqz-sc-s{text-align:center;opacity:0;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:30px 24px;pointer-events:none}
.tqz-sc.tqz-visible .tqz-sc-s1{animation:tqzSceneIn .5s ease 0s forwards,tqzSceneOut .4s ease 2.2s forwards}
.tqz-sc.tqz-visible .tqz-sc-s2{animation:tqzSceneIn .5s ease 2.6s forwards,tqzSceneOut .4s ease 5.2s forwards}
.tqz-sc.tqz-visible .tqz-sc-s3{animation:tqzSceneIn .4s ease 5.6s forwards,tqzSceneOut .4s ease 7.2s forwards}
.tqz-sc.tqz-visible .tqz-sc-s4{animation:tqzSceneIn .5s ease 7.6s forwards,tqzSceneOut .4s ease 10.2s forwards}
.tqz-sc.tqz-visible .tqz-sc-s5{animation:tqzSceneIn .5s ease 10.6s forwards,tqzSceneOut .4s ease 13s forwards}
@keyframes tqzSceneIn{to{opacity:1;pointer-events:auto}}
@keyframes tqzSceneOut{to{opacity:0;pointer-events:none}}
.tqz-sc-badge{display:inline-block;padding:6px 18px;border-radius:20px;background:linear-gradient(135deg,#5E6DDE,#20BBE6);color:#fff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:18px;opacity:0;transform:translateY(20px) scale(.85)}
.tqz-sc.tqz-visible .tqz-sc-badge{animation:tqzBadge .5s cubic-bezier(.34,1.56,.64,1) .15s forwards}
.tqz-sc-h1{font-size:48px;font-weight:900;color:#2B3264;line-height:1.1;letter-spacing:-1px;opacity:0;transform:scale(.3)}
.tqz-sc.tqz-visible .tqz-sc-h1{animation:tqzSmash .5s cubic-bezier(.34,1.56,.64,1) .4s forwards}
.tqz-sc-h1 em{font-style:normal;background:linear-gradient(135deg,#5E6DDE,#20BBE6,#05DFF3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tqz-sc-sub1{font-size:16px;color:#6b7194;margin-top:12px;opacity:0;transform:translateY(12px)}
.tqz-sc.tqz-visible .tqz-sc-sub1{animation:tqzUpS .4s ease .7s forwards}
.tqz-sc-s2{flex-direction:row;gap:24px}
.tqz-sc-s2-left{flex:1;text-align:left}
.tqz-sc-s2-txt{font-size:24px;font-weight:900;color:#2B3264;line-height:1.2;opacity:0;transform:translateX(-25px)}
.tqz-sc.tqz-visible .tqz-sc-s2-txt{animation:tqzRightS .5s ease 2.8s forwards}
.tqz-sc-s2-small{font-size:12px;color:#6b7194;margin-top:4px;opacity:0;transform:translateX(-15px)}
.tqz-sc.tqz-visible .tqz-sc-s2-small{animation:tqzRightS .4s ease 3s forwards}
.tqz-sc-mock{width:240px;flex-shrink:0;background:#fff;border-radius:14px;box-shadow:0 16px 50px rgba(43,50,100,.16);padding:16px;opacity:0;transform:perspective(600px) rotateY(-10deg) translateX(40px)}
.tqz-sc.tqz-visible .tqz-sc-mock{animation:tqzFly .6s cubic-bezier(.22,1,.36,1) 3.1s forwards}
.tqz-sc-mq{font-size:12px;font-weight:700;color:#2B3264;margin-bottom:8px}
.tqz-sc-mo{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:#f4f5ff;margin-bottom:4px;font-size:10px;color:#5E6DDE;font-weight:600}
.tqz-sc-md{width:10px;height:10px;border-radius:50%;border:2px solid #5E6DDE;flex-shrink:0}
.tqz-sc-mo.tqz-sel{background:#5E6DDE;color:#fff}
.tqz-sc-mo.tqz-sel .tqz-sc-md{border-color:#fff;background:#fff}
.tqz-sc-ml{display:flex;align-items:center;gap:6px;margin-top:10px;padding:6px 8px;border-radius:8px;background:linear-gradient(135deg,#eef0ff,#e8f8fc);opacity:0;transform:translateY(8px)}
.tqz-sc.tqz-visible .tqz-sc-ml{animation:tqzUpS .4s ease 4s forwards}
.tqz-sc-mlav{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#20BBE6,#05DFF3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tqz-sc-mlav svg{width:12px;height:12px}
.tqz-sc-mli{font-size:9px;color:#2B3264;font-weight:600;line-height:1.2;text-align:left}
.tqz-sc-mli span{color:#20BBE6;font-weight:500;display:block}
.tqz-sc-s3{background:linear-gradient(135deg,#5E6DDE,#20BBE6);border-radius:16px}
.tqz-sc-big{font-size:56px;font-weight:900;color:#fff;opacity:0;transform:scale(.2)}
.tqz-sc.tqz-visible .tqz-sc-big{animation:tqzSmash .45s cubic-bezier(.34,1.56,.64,1) 5.8s forwards}
.tqz-sc-sub3{font-size:14px;color:rgba(255,255,255,.8);margin-top:8px;opacity:0}
.tqz-sc.tqz-visible .tqz-sc-sub3{animation:tqzFadeInS .3s ease 6.2s forwards}
.tqz-sc-dots{display:flex;gap:5px;margin-top:16px}
.tqz-sc-dt{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);animation:tqzPulseS 1s ease infinite}
.tqz-sc-dt:nth-child(2){animation-delay:.2s}
.tqz-sc-dt:nth-child(3){animation-delay:.4s}
.tqz-sc-s4h{font-size:24px;font-weight:900;color:#2B3264;margin-bottom:14px;opacity:0;transform:translateY(20px)}
.tqz-sc.tqz-visible .tqz-sc-s4h{animation:tqzUpS .5s ease 7.8s forwards}
.tqz-sc-cards{display:flex;justify-content:center;gap:10px;margin-bottom:10px}
.tqz-sc-card{width:120px;padding:10px;background:#fff;border-radius:10px;box-shadow:0 4px 18px rgba(43,50,100,.1);text-align:center;opacity:0;transform:translateY(30px) rotate(-4deg)}
.tqz-sc.tqz-visible .tqz-sc-cd1{animation:tqzCardInS .5s cubic-bezier(.34,1.56,.64,1) 8.1s forwards}
.tqz-sc.tqz-visible .tqz-sc-cd2{animation:tqzCardInS .5s cubic-bezier(.34,1.56,.64,1) 8.3s forwards}
.tqz-sc.tqz-visible .tqz-sc-cd3{animation:tqzCardInS .5s cubic-bezier(.34,1.56,.64,1) 8.5s forwards}
.tqz-sc-cav{width:28px;height:28px;border-radius:50%;margin:0 auto 5px;display:flex;align-items:center;justify-content:center}
.tqz-sc-ca1{background:linear-gradient(135deg,#20BBE6,#05DFF3)}
.tqz-sc-ca2{background:linear-gradient(135deg,#5E6DDE,#2B3264)}
.tqz-sc-ca3{background:linear-gradient(135deg,#8B5CF6,#5E6DDE)}
.tqz-sc-cav svg{width:14px;height:14px}
.tqz-sc-cn{font-size:11px;font-weight:700;color:#2B3264}
.tqz-sc-ct{font-size:9px;font-weight:600;margin-top:3px;padding:2px 6px;border-radius:8px;display:inline-block}
.tqz-sc-ct1{background:#e8f8fc;color:#20BBE6}
.tqz-sc-ct2{background:#eef0ff;color:#5E6DDE}
.tqz-sc-ct3{background:#f0e8ff;color:#8B5CF6}
.tqz-sc-arw{font-size:20px;margin-bottom:8px;opacity:0}
.tqz-sc.tqz-visible .tqz-sc-arw{animation:tqzFadeInS .3s ease 8.8s forwards}
.tqz-sc-tgt{display:flex;align-items:center;gap:8px;justify-content:center;opacity:0;transform:scale(.7)}
.tqz-sc.tqz-visible .tqz-sc-tgt{animation:tqzPopS .4s cubic-bezier(.34,1.56,.64,1) 9.2s forwards}
.tqz-sc-sio{width:40px;height:40px;border-radius:10px;background:#fff;border:2px solid #e0e4f5;display:flex;align-items:center;justify-content:center;overflow:hidden}
.tqz-sc-sio img{width:28px;height:28px;object-fit:contain}
.tqz-sc-siot{font-size:18px;font-weight:900}
.tqz-sc-siot b{background:linear-gradient(135deg,#5E6DDE,#20BBE6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:900}
.tqz-sc-s5t{font-size:22px;font-weight:900;color:#2B3264;margin-bottom:18px;opacity:0;transform:translateY(12px)}
.tqz-sc.tqz-visible .tqz-sc-s5t{animation:tqzUpS .4s ease 10.8s forwards}
.tqz-sc-feat{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700;color:#2B3264;padding:9px 14px;background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(43,50,100,.06);margin-bottom:8px;max-width:380px;margin-left:auto;margin-right:auto;opacity:0;transform:translateX(-25px)}
.tqz-sc.tqz-visible .tqz-sc-f1{animation:tqzRightS .4s ease 11s forwards}
.tqz-sc.tqz-visible .tqz-sc-f2{animation:tqzRightS .4s ease 11.25s forwards}
.tqz-sc.tqz-visible .tqz-sc-f3{animation:tqzRightS .4s ease 11.5s forwards}
.tqz-sc-fi{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tqz-sc-fi svg{width:13px;height:13px}
.tqz-sc-fi1{background:#5E6DDE}
.tqz-sc-fi2{background:#20BBE6}
.tqz-sc-fi3{background:#05DFF3}
.tqz-sc-csv{text-align:center;font-size:12px;color:#6b7194;margin-top:14px;line-height:1.4;opacity:0;transform:translateY(8px)}
.tqz-sc.tqz-visible .tqz-sc-csv{animation:tqzUpS .4s ease 11.8s forwards}
.tqz-sc-csv b{color:#5E6DDE;font-weight:700}
@keyframes tqzBadge{0%{opacity:0;transform:translateY(20px) scale(.85)}60%{transform:translateY(-3px) scale(1.03)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes tqzSmash{0%{opacity:0;transform:scale(.3)}65%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
@keyframes tqzUpS{to{opacity:1;transform:translateY(0)}}
@keyframes tqzRightS{to{opacity:1;transform:translateX(0)}}
@keyframes tqzFly{to{opacity:1;transform:perspective(600px) rotateY(0) translateX(0)}}
@keyframes tqzFadeInS{to{opacity:1}}
@keyframes tqzPopS{to{opacity:1;transform:scale(1)}}
@keyframes tqzCardInS{to{opacity:1;transform:translateY(0) rotate(0)}}
@keyframes tqzPulseS{0%,100%{background:rgba(255,255,255,.3)}50%{background:rgba(255,255,255,.85)}}
@media(max-width:600px){.tqz-sc{min-height:380px}.tqz-sc-h1{font-size:32px}.tqz-sc-s2{flex-direction:column;gap:12px}.tqz-sc-s2-left{text-align:center}.tqz-sc-s2-txt{font-size:18px}.tqz-sc-mock{width:200px}.tqz-sc-big{font-size:40px}.tqz-sc-s4h{font-size:18px}.tqz-sc-card{width:90px;padding:8px}.tqz-sc-cav{width:22px;height:22px}.tqz-sc-cn{font-size:9px}.tqz-sc-feat{font-size:12px;padding:7px 10px}}
</style>
<div class="tqz-sc" id="tqz-scoop-widget">
  <div class="tqz-sc-s tqz-sc-s1">
    <div class="tqz-sc-badge">Exclusivite Tiquiz</div>
    <div class="tqz-sc-h1">Le 1er outil quiz<br>connecte a <em>Systeme.io</em></div>
    <div class="tqz-sc-sub1">Tes leads atterrissent directement dans ton business. Automatiquement.</div>
  </div>
  <div class="tqz-sc-s tqz-sc-s2">
    <div class="tqz-sc-s2-left"><div class="tqz-sc-s2-txt">Un lead remplit<br>ton quiz...</div><div class="tqz-sc-s2-small">Tiquiz capture tout automatiquement</div></div>
    <div class="tqz-sc-mock">
      <div class="tqz-sc-mq">Quel est ton plus grand defi ?</div>
      <div class="tqz-sc-mo"><div class="tqz-sc-md"></div>Trouver des clients</div>
      <div class="tqz-sc-mo tqz-sel"><div class="tqz-sc-md"></div>Automatiser mon business</div>
      <div class="tqz-sc-mo"><div class="tqz-sc-md"></div>Creer du contenu</div>
      <div class="tqz-sc-ml"><div class="tqz-sc-mlav"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="tqz-sc-mli">Marie D. - Score: 87/100<span>Tag: prospect-chaud</span></div></div>
    </div>
  </div>
  <div class="tqz-sc-s tqz-sc-s3"><div class="tqz-sc-big">Envoye !</div><div class="tqz-sc-sub3">Lead synchronise avec Systeme.io</div><div class="tqz-sc-dots"><div class="tqz-sc-dt"></div><div class="tqz-sc-dt"></div><div class="tqz-sc-dt"></div></div></div>
  <div class="tqz-sc-s tqz-sc-s4">
    <div class="tqz-sc-s4h">Tes leads debarquent dans...</div>
    <div class="tqz-sc-cards">
      <div class="tqz-sc-card tqz-sc-cd1"><div class="tqz-sc-cav tqz-sc-ca1"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="tqz-sc-cn">Marie D.</div><div class="tqz-sc-ct tqz-sc-ct1">prospect-chaud</div></div>
      <div class="tqz-sc-card tqz-sc-cd2"><div class="tqz-sc-cav tqz-sc-ca2"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="tqz-sc-cn">Lucas T.</div><div class="tqz-sc-ct tqz-sc-ct2">quiz-termine</div></div>
      <div class="tqz-sc-card tqz-sc-cd3"><div class="tqz-sc-cav tqz-sc-ca3"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="tqz-sc-cn">Sophie M.</div><div class="tqz-sc-ct tqz-sc-ct3">score-eleve</div></div>
    </div>
    <div class="tqz-sc-arw">&#8595;</div>
    <div class="tqz-sc-tgt"><div class="tqz-sc-sio"><img src="https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://systeme.io&size=128" alt="S"></div><div class="tqz-sc-siot"><b>Systeme.io</b></div></div>
  </div>
  <div class="tqz-sc-s tqz-sc-s5">
    <div class="tqz-sc-s5t">Tout est automatique</div>
    <div class="tqz-sc-feat tqz-sc-f1"><div class="tqz-sc-fi tqz-sc-fi1"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>Sync en temps reel, zero manip</div>
    <div class="tqz-sc-feat tqz-sc-f2"><div class="tqz-sc-fi tqz-sc-fi2"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>Tags automatiques sur chaque lead</div>
    <div class="tqz-sc-feat tqz-sc-f3"><div class="tqz-sc-fi tqz-sc-fi3"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>Automatisations depuis Tiquiz</div>
    <div class="tqz-sc-csv">Tu n'utilises pas Systeme.io ?<br>Exporte tes leads en <b>1 clic au format CSV</b> vers l'autorepondeur de ton choix.</div>
  </div>
</div>
`;

export const OPTIN = `
<style>
.tqz-opt{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:980px;margin:0 auto;padding:40px 16px;display:flex;align-items:center;justify-content:center;gap:18px}
.tqz-opt-ph{width:260px;min-width:240px;border-radius:36px;border:7px solid #1c1f3a;background:#fff;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative;z-index:2;opacity:0;transform:translateX(-30px)}
.tqz-opt-ph::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:100px;height:22px;background:#1c1f3a;border-radius:0 0 14px 14px;z-index:10}
.tqz-opt.tqz-visible .tqz-opt-ph{animation:tqzOS .7s ease forwards}
.tqz-opt-sb{background:#1c1f3a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:8px 18px 4px;font-size:12px;font-weight:600}
.tqz-opt-il{background:linear-gradient(135deg,#eef1ff,#dde3ff);height:130px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.tqz-opt-il svg{opacity:0;transform:scale(.8)}
.tqz-opt.tqz-visible .tqz-opt-il svg{animation:tqzOP .6s ease .6s forwards}
.tqz-opt-fm{padding:16px 16px 20px;text-align:center}
.tqz-opt-lb{color:#5E6DDE;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-bottom:6px;opacity:0}
.tqz-opt.tqz-visible .tqz-opt-lb{animation:tqzOFU .4s ease .8s forwards}
.tqz-opt-t{color:#2B3264;font-size:13px;font-weight:800;line-height:1.35;margin-bottom:14px;opacity:0}
.tqz-opt.tqz-visible .tqz-opt-t{animation:tqzOFU .4s ease 1s forwards}
.tqz-opt-inp{border:2px solid #bfc5e2;border-radius:8px;padding:11px 12px;font-size:13px;color:#8890b5;background:#f4f5fb;margin-bottom:8px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-opt.tqz-visible .tqz-opt-inp1{animation:tqzOFU .35s ease 1.15s forwards}
.tqz-opt.tqz-visible .tqz-opt-inp2{animation:tqzOFU .35s ease 1.3s forwards}
.tqz-opt-rg{display:flex;align-items:flex-start;gap:7px;margin:10px 0 14px;text-align:left;opacity:0;transform:translateY(8px)}
.tqz-opt.tqz-visible .tqz-opt-rg{animation:tqzOFU .35s ease 1.45s forwards}
.tqz-opt-ck{width:15px;height:15px;min-width:15px;border:2px solid #5E6DDE;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;margin-top:1px}
.tqz-opt-ck svg{opacity:0}
.tqz-opt.tqz-visible .tqz-opt-ck svg{animation:tqzOFI .3s ease 2.5s forwards}
.tqz-opt-rg span{font-size:8.5px;color:#7a80a8;line-height:1.35}
.tqz-opt-btn{background:linear-gradient(135deg,#5E6DDE,#4a58d0);color:#fff;border:none;border-radius:24px;padding:13px 20px;font-size:14px;font-weight:700;text-align:center;width:100%;cursor:pointer;opacity:0;transform:translateY(8px)}
.tqz-opt.tqz-visible .tqz-opt-btn{animation:tqzOFU .4s ease 1.6s forwards,tqzOPl 2.5s ease 2.2s infinite}
.tqz-opt-lg{display:flex;flex-direction:column;align-items:center;gap:8px;z-index:1}
.tqz-opt-lo{width:46px;height:46px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.08);opacity:0;transform:scale(0);background:linear-gradient(135deg,#eef1ff,#dde3ff);border-radius:10px;position:relative}
.tqz-opt-lo::after{content:'';position:absolute;inset:0;margin:auto;width:16px;height:16px;border-radius:50%;background:#5E6DDE;opacity:.45}
.tqz-opt-lo img{width:100%;height:100%;object-fit:contain;display:block}
.tqz-opt.tqz-visible .tqz-opt-lo{animation:tqzOP .3s ease forwards}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d1{animation:tqzOP .3s ease 1.2s forwards,tqzOFl 3s ease-in-out 3.2s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d2{animation:tqzOP .3s ease 1.32s forwards,tqzOFl 3s ease-in-out 3.7s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d3{animation:tqzOP .3s ease 1.44s forwards,tqzOFl 3s ease-in-out 3.4s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d4{animation:tqzOP .3s ease 1.56s forwards,tqzOFl 3s ease-in-out 3.9s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d5{animation:tqzOP .3s ease 1.68s forwards,tqzOFl 3s ease-in-out 3.3s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d6{animation:tqzOP .3s ease 1.8s forwards,tqzOFl 3s ease-in-out 4s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d7{animation:tqzOP .3s ease 1.92s forwards,tqzOFl 3s ease-in-out 3.5s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d8{animation:tqzOP .3s ease 2.04s forwards,tqzOFl 3s ease-in-out 3.8s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d9{animation:tqzOP .3s ease 2.16s forwards,tqzOFl 3s ease-in-out 3.6s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d10{animation:tqzOP .3s ease 2.28s forwards,tqzOFl 3s ease-in-out 4.1s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d11{animation:tqzOP .3s ease 2.4s forwards,tqzOFl 3s ease-in-out 3.3s infinite}
.tqz-opt.tqz-visible .tqz-opt-lo.tqz-d12{animation:tqzOP .3s ease 2.52s forwards,tqzOFl 3s ease-in-out 3.8s infinite}
.tqz-opt-ra{display:flex;align-items:center;gap:0;z-index:1}
.tqz-opt-br{opacity:0;flex-shrink:0}
.tqz-opt.tqz-visible .tqz-opt-br{animation:tqzOFI .6s ease 2.3s forwards}
.tqz-opt-ac{display:flex;flex-direction:column;align-items:flex-start;gap:0;padding-left:6px}
.tqz-opt-card{background:#fff;border-radius:14px;padding:14px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 18px rgba(43,50,100,.1);opacity:0;transform:translateX(25px);white-space:nowrap}
.tqz-opt.tqz-visible .tqz-opt-card1{animation:tqzOSL .45s ease 2.5s forwards}
.tqz-opt.tqz-visible .tqz-opt-card2{animation:tqzOSL .45s ease 2.85s forwards}
.tqz-opt.tqz-visible .tqz-opt-card3{animation:tqzOSL .45s ease 3.2s forwards}
.tqz-opt-ci{width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tqz-opt-ci svg{width:22px;height:22px}
.tqz-opt-ct{font-size:14px;font-weight:600;color:#2B3264}
.tqz-opt-plus{width:28px;height:28px;border-radius:50%;border:2px solid #5E6DDE;display:flex;align-items:center;justify-content:center;margin:8px 0;align-self:center;opacity:0;transform:scale(0)}
.tqz-opt.tqz-visible .tqz-opt-plus1{animation:tqzOP .3s ease 2.7s forwards}
.tqz-opt.tqz-visible .tqz-opt-plus2{animation:tqzOP .3s ease 3.05s forwards}
@keyframes tqzOS{to{opacity:1;transform:translateX(0)}}
@keyframes tqzOSL{to{opacity:1;transform:translateX(0)}}
@keyframes tqzOFU{to{opacity:1;transform:translateY(0)}}
@keyframes tqzOFI{to{opacity:1}}
@keyframes tqzOP{to{opacity:1;transform:scale(1)}}
@keyframes tqzOPl{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes tqzOFl{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@media(max-width:820px){.tqz-opt{flex-wrap:wrap}.tqz-opt-ra{order:3;width:100%;justify-content:center;margin-top:10px}}
</style>
<div class="tqz-opt" id="tqz-opt-widget">
  <div class="tqz-opt-ph">
    <div class="tqz-opt-sb"><span>12:22</span><span style="display:flex;gap:4px;align-items:center"><svg width="14" height="10" fill="none"><rect x="0" y="3.5" width="2.5" height="6.5" rx=".8" fill="#fff" opacity=".35"/><rect x="3.5" y="2.5" width="2.5" height="7.5" rx=".8" fill="#fff" opacity=".55"/><rect x="7" y="1.2" width="2.5" height="8.8" rx=".8" fill="#fff" opacity=".75"/><rect x="10.5" y="0" width="2.5" height="10" rx=".8" fill="#fff"/></svg><svg width="20" height="10" fill="none"><rect x="0" y="1" width="16" height="8" rx="1.8" stroke="#fff" stroke-width="1" fill="none"/><rect x="1.5" y="2.5" width="11" height="5" rx="1" fill="#fff"/><rect x="17" y="3" width="2.5" height="4" rx=".8" fill="#fff" opacity=".5"/></svg></span></div>
    <div class="tqz-opt-il"><svg width="200" height="110" viewBox="0 0 200 110" fill="none"><g transform="translate(100,48)"><rect x="-22" y="-16" width="44" height="34" rx="8" fill="#5E6DDE" opacity=".15"/><circle cx="-9" cy="-4" r="5.5" fill="#20BBE6" opacity=".35"/><circle cx="9" cy="-4" r="5.5" fill="#20BBE6" opacity=".35"/><rect x="-8" y="7" width="16" height="4" rx="2" fill="#5E6DDE" opacity=".2"/></g></svg></div>
    <div class="tqz-opt-fm">
      <div class="tqz-opt-lb">POUR ALLER PLUS LOIN</div>
      <div class="tqz-opt-t">Telecharge gratuitement mes scripts n8n a importer en 1 clic pour lancer 10 bots qui travailleront pour toi des ce soir :</div>
      <div class="tqz-opt-inp tqz-opt-inp1">Prenom</div>
      <div class="tqz-opt-inp tqz-opt-inp2">Adresse email</div>
      <div class="tqz-opt-rg"><div class="tqz-opt-ck"><svg width="9" height="7" fill="none" viewBox="0 0 9 7"><path d="M1 3.5L3 5.5L8 .5" stroke="#5E6DDE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span>J'accepte de recevoir des emails et confirme avoir lu la <u>politique de confidentialite</u>.</span></div>
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
      <div class="tqz-opt-card tqz-opt-card2"><div class="tqz-opt-ci"><svg viewBox="0 0 24 24" fill="none" stroke="#5E6DDE" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg></div><div class="tqz-opt-ct">S'abonner a la campagne</div></div>
      <div class="tqz-opt-plus tqz-opt-plus2"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#5E6DDE" stroke-width="2"><path d="M5.5 1v9M1 5.5h9"/></svg></div>
      <div class="tqz-opt-card tqz-opt-card3"><div class="tqz-opt-ci"><svg viewBox="0 0 24 24" fill="none" stroke="#5E6DDE" stroke-width="2"><path d="M12 2L2 7v6c0 5.25 3.75 10.74 10 12 6.25-1.26 10-6.75 10-12V7L12 2z"/><path d="M9 12l2 2 4-4"/></svg></div><div class="tqz-opt-ct">Acces a la formation</div></div>
    </div>
  </div>
</div>
`;
