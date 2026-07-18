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
//   "Les 20 premiers reçoivent un mois gratuit au meilleur plan de Tiquiz !
//    Il reste XX/20 places"
//
// Auto-contenu (styles inline), aucune dépendance externe. Se rafraîchit
// toutes les 30s. Cache court côté CDN car le script est identique pour
// tout le monde (le décompte, lui, vient de /status en temps réel).
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

  function esc(s){var d=document.createElement("div");d.textContent=String(s);return d.innerHTML;}

  function render(el, data){
    var remaining = (data && typeof data.remaining === "number") ? data.remaining : null;
    var cap = (data && typeof data.cap === "number") ? data.cap : 20;
    if(remaining === null){ el.style.display = "none"; return; }
    var soldOut = remaining <= 0;
    var count = soldOut
      ? ("Les " + cap + " places offertes sont toutes prises")
      : ("Il reste " + remaining + "/" + cap + " places");
    var intro = "Les " + cap + " premiers re\\u00E7oivent un mois gratuit au meilleur plan de Tiquiz !";
    el.style.display = "block";
    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;'
      + 'background:linear-gradient(135deg,#eef2ff,#ecfeff);border:1px solid #c7d2fe;'
      + 'border-radius:14px;padding:14px 18px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
      + 'color:#1e1b4b;box-shadow:0 2px 10px rgba(79,70,229,0.08);">'
      + '<span aria-hidden="true" style="font-size:22px;line-height:1;">'+(soldOut?"\\u23F3":"\\uD83C\\uDF81")+'</span>'
      + '<span style="flex:1;min-width:200px;font-size:14px;line-height:1.45;">'
      +   '<strong style="display:block;font-weight:700;">'+esc(intro)+'</strong>'
      +   '<span style="display:inline-block;margin-top:4px;font-weight:600;color:'+(soldOut?"#9f1239":"#4338ca")+';">'+esc(count)+'</span>'
      + '</span>'
      + '</div>';
  }

  function load(el){
    var funnel = el.getAttribute("data-funnel") || "bene";
    var url = STATUS_URL + "?funnel=" + encodeURIComponent(funnel) + "&t=" + Date.now();
    fetch(url, {mode:"cors",cache:"no-store"})
      .then(function(r){return r.json();})
      .then(function(d){ render(el, d); })
      .catch(function(){ el.style.display = "none"; });
  }

  function boot(){
    var els = document.querySelectorAll("[data-tiquiz-plus-trial]");
    for(var i=0;i<els.length;i++){ (function(el){ load(el); setInterval(function(){load(el);}, REFRESH_MS); })(els[i]); }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
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
