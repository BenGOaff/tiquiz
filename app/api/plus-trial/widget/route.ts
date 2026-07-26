// app/api/plus-trial/widget/route.ts
// Widget JS embarquable sur les pages Systeme.io (bon de commande).
// Béné colle un bloc HTML personnalisé sur sa page :
//
//   <div data-tiquiz-plus-trial data-funnel="bene"></div>
//   <script src="https://quizing.tipote.com/api/plus-trial/widget" async></script>
//
// (funnel="affiliate" sur les pages du tunnel affilié.)
//
// Le script trouve tous les conteneurs [data-tiquiz-plus-trial], lit le
// décompte réel via /api/plus-trial/status et affiche :
//   "Les 20 premiers reçoivent 2 mois gratuits au meilleur plan de Tiquiz !
//    Il reste XX/20 places"
//
// Style calqué sur les popups de Béné : neo-brutalist (Bricolage Grotesque
// + Inter, bordures épaisses #16182E, ombres dures, surligneur jaune,
// bleu #5A6EF6 / cyan #20BBE6). Le script injecte les polices + une
// feuille de style scopée (classes tqpt-*) une seule fois. Se rafraîchit
// toutes les 30s.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Base publique de l'app. On NE se sert PAS de req.nextUrl.origin : derrière
// le proxy Systeme.io il resout en localhost:3002 (drame connu). On prend
// APP_URL au runtime, fallback sur l'URL canonique prod.
const PUBLIC_BASE = (
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://quizing.tipote.com"
).trim().replace(/\/$/, "");

// Feuille de style du widget (style popups Béné). Classes scopées tqpt-*
// pour ne jamais entrer en collision avec les classes aq-* des popups.
const WIDGET_CSS = `
.tqpt-card{position:relative;box-sizing:border-box;width:100%;max-width:100%;
  background:#fff;border:2.5px solid #16182E;border-radius:16px;box-shadow:5px 5px 0 #16182E;
  padding:16px 18px;font-family:'Inter',system-ui,-apple-system,sans-serif;color:#16182E;}
.tqpt-card *{box-sizing:border-box;margin:0;padding:0;}
.tqpt-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.tqpt-badge{flex:0 0 auto;width:48px;height:48px;border:2.5px solid #16182E;border-radius:12px;
  background:#5A6EF6;box-shadow:3px 3px 0 #16182E;display:flex;align-items:center;justify-content:center;
  font-size:25px;line-height:1;}
.tqpt-badge.sold{background:#FFE24B;}
.tqpt-txt{flex:1 1 240px;min-width:0;}
.tqpt-h{font-family:'Bricolage Grotesque','Inter',sans-serif;font-weight:800;line-height:1.18;
  letter-spacing:-.01em;font-size:clamp(15px,2.5vw,18px);color:#16182E;}
.tqpt-mark{position:relative;white-space:nowrap;z-index:0;}
.tqpt-mark::before{content:"";position:absolute;z-index:-1;left:-.06em;right:-.06em;top:20%;bottom:10%;
  background:#FFE24B;transform:rotate(-1.4deg);border-radius:2px 6px 3px 5px;}
.tqpt-bar{margin-top:12px;height:13px;border:2.5px solid #16182E;border-radius:7px;background:#EEF2FE;overflow:hidden;}
.tqpt-fill{height:100%;background:#5A6EF6;transition:width .45s cubic-bezier(.16,.84,.44,1);}
.tqpt-fill.sold{background:#FF6B6B;}
.tqpt-count{margin-top:11px;display:inline-flex;align-items:center;font-family:'Bricolage Grotesque','Inter',sans-serif;
  font-weight:800;font-size:13px;padding:6px 12px;border:2.5px solid #16182E;border-radius:8px;background:#fff;
  box-shadow:2.5px 2.5px 0 #16182E;color:#16182E;white-space:nowrap;}
.tqpt-count b{color:#5A6EF6;font-size:16px;margin:0 5px;font-weight:800;}
.tqpt-count.sold{background:#FFE24B;}
.tqpt-count.sold b{color:#16182E;}
@media (max-width:560px){
  .tqpt-card{box-shadow:4px 4px 0 #16182E;}
  .tqpt-badge{box-shadow:2.5px 2.5px 0 #16182E;}
}
@media (prefers-reduced-motion:reduce){ .tqpt-fill{transition:none;} }
`;

export async function GET(_req: NextRequest) {
  const js = `(function(){
  "use strict";
  // Origine réelle = celle du <script> qui nous a chargés (robuste quel que
  // soit le proxy). Fallback sur la base injectée côté serveur.
  var FALLBACK_BASE = ${JSON.stringify(PUBLIC_BASE)};
  function widgetBase(){
    try {
      if (document.currentScript && document.currentScript.src) {
        return new URL(document.currentScript.src).origin;
      }
    } catch(e){}
    try {
      var ss = document.querySelectorAll('script[src*="/api/plus-trial/widget"]');
      if (ss.length) return new URL(ss[ss.length-1].src).origin;
    } catch(e){}
    return FALLBACK_BASE;
  }
  var STATUS_URL = widgetBase() + "/api/plus-trial/status";
  var REFRESH_MS = 30000;

  // Polices (Bricolage Grotesque + Inter), injectées une seule fois.
  function ensureFonts(){
    if (document.getElementById("tqpt-fonts")) return;
    var l = document.createElement("link");
    l.id = "tqpt-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
  }
  function ensureStyle(){
    if (document.getElementById("tqpt-style")) return;
    var s = document.createElement("style");
    s.id = "tqpt-style";
    s.textContent = ${JSON.stringify(WIDGET_CSS)};
    document.head.appendChild(s);
  }

  // Construit le HTML de la carte (ou null si rien à afficher).
  function build(data){
    var remaining = (data && typeof data.remaining === "number") ? data.remaining : null;
    var cap = (data && typeof data.cap === "number") ? data.cap : 20;
    if(remaining === null){ return null; }
    var soldOut = remaining <= 0;
    var pct = Math.max(0, Math.min(100, Math.round((remaining / (cap || 1)) * 100)));
    var emoji = soldOut ? "\\u23F3" : "\\uD83C\\uDF81"; // sablier / cadeau
    var headline = soldOut
      ? ('Les ' + cap + ' places offertes sont <span class="tqpt-mark">toutes prises</span>.')
      : ('Les ' + cap + ' premiers re\\u00E7oivent <span class="tqpt-mark">2 mois gratuits</span> au meilleur plan de Tiquiz\\u00A0!');
    var count = soldOut
      ? ('Merci\\u00A0! Complet')
      : ('Il reste <b>' + remaining + '/' + cap + '</b> places');

    return ''
      + '<div class="tqpt-card">'
      + '<div class="tqpt-row">'
      +   '<div class="tqpt-badge'+(soldOut?' sold':'')+'" aria-hidden="true">'+emoji+'</div>'
      +   '<div class="tqpt-txt">'
      +     '<div class="tqpt-h">'+headline+'</div>'
      +     '<div class="tqpt-bar"><div class="tqpt-fill'+(soldOut?' sold':'')+'" style="width:'+pct+'%;"></div></div>'
      +     '<div class="tqpt-count'+(soldOut?' sold':'')+'">'+count+'</div>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }

  // Peint le HTML dans le conteneur et le met en cache (pour auto-guérison).
  function paint(el, html){
    el.__tqptHtml = html;
    el.__tqptPainting = true;      // évite que l'observer se déclenche sur notre propre écriture
    el.innerHTML = html;
    el.style.display = "block";
    el.__tqptPainting = false;
  }

  function fetchAndRender(el){
    var funnel = el.getAttribute("data-funnel") || "bene";
    var url = STATUS_URL + "?funnel=" + encodeURIComponent(funnel) + "&t=" + Date.now();
    fetch(url, {mode:"cors",cache:"no-store"})
      .then(function(r){return r.json();})
      .then(function(d){
        var html = build(d);
        if(html){ paint(el, html); }
        else if(!el.__tqptHtml){ el.style.display = "none"; }
      })
      .catch(function(){
        // Ne casse pas ce qui est déjà affiché ; masque seulement si vide.
        if(!el.__tqptHtml){ el.style.display = "none"; }
      });
  }

  // Prend en charge un conteneur : rendu initial, rafraîchissement, et
  // auto-guérison si React (SPA Systeme.io) vide le noeud après coup.
  function manage(el){
    if(el.__tqptInit) return;
    el.__tqptInit = true;
    fetchAndRender(el);
    setInterval(function(){ fetchAndRender(el); }, REFRESH_MS);
    try {
      var mo = new MutationObserver(function(){
        // Si le contenu a été effacé (re-render React) et qu'on a un cache,
        // on le réinjecte immédiatement, sans refetch.
        if(!el.__tqptPainting && el.__tqptHtml && el.childElementCount === 0){
          paint(el, el.__tqptHtml);
        }
      });
      mo.observe(el, { childList: true });
    } catch(e){}
  }

  function scan(){
    var els = document.querySelectorAll("[data-tiquiz-plus-trial]");
    for(var i=0;i<els.length;i++){ manage(els[i]); }
  }

  // Scan débounçé (le SPA peut muter le DOM très souvent).
  var scanQueued = false;
  function queueScan(){
    if(scanQueued) return;
    scanQueued = true;
    setTimeout(function(){ scanQueued = false; scan(); }, 60);
  }

  function boot(){
    ensureFonts();
    ensureStyle();
    scan();
    // Observe l'arbre pour capter les conteneurs injectés APRÈS coup par le
    // SPA (cause n°1 des "ça ne s'affiche pas toujours").
    try {
      var body = document.body || document.documentElement;
      var bmo = new MutationObserver(function(){ queueScan(); });
      bmo.observe(body, { childList: true, subtree: true });
    } catch(e){}
    // Filet de sécurité : quelques scans différés selon le timing du SPA.
    var delays = [200, 600, 1500, 3000, 6000];
    for(var i=0;i<delays.length;i++){ setTimeout(scan, delays[i]); }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
  window.addEventListener("load", scan);
})();`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
