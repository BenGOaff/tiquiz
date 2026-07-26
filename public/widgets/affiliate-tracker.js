/**
 * Atelier du Quiz - Affiliate Tracking Snippet
 *
 * Installation (Systeme.io) :
 *   Paramètres compte -> Code de tracking GLOBAL (header), coller :
 *     <script src="https://quizing.tipote.com/widgets/affiliate-tracker.js" async></script>
 *
 *   Via <script src=...> (pas inline) : une seule version centralisée, et on
 *   peut vérifier le chargement dans l'onglet Network.
 *
 * Ce que fait le snippet :
 *   1. Si l'URL contient ?sa=XXX -> stocke le sa en cookie quizing_sa (90j) et
 *      POST un "click" pour les stats.
 *   2. Réécrit les liens sortants vers tipote.* pour propager le sa.
 *   3. À la saisie / submit d'un email, POST une "conversion" pour lier
 *      l'email à l'affilié (multi-signaux, robuste aux forms Systeme.io AJAX).
 *
 * Aucun PII stocké côté client autrement qu'en sessionStorage volatile.
 */
(function () {
  "use strict";
  if (window.__quizingAffiliateTrackerLoaded__) return;
  window.__quizingAffiliateTrackerLoaded__ = true;

  var ENDPOINT = "https://quizing.tipote.com/api/affiliate/track";
  var COOKIE_NAME = "quizing_sa";
  var COOKIE_MAX_AGE = 90 * 24 * 3600;
  var TIPOTE_DOMAINS = ["tipote.com", "tipote.fr", "tipote.blog"];

  function setCookie(name, value) {
    document.cookie =
      name + "=" + encodeURIComponent(value) + "; max-age=" + COOKIE_MAX_AGE + "; path=/; SameSite=Lax";
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function isValidSa(sa) {
    return typeof sa === "string" && /^sa[a-f0-9]{20,80}$/i.test(sa);
  }
  function post(payload) {
    try {
      var json = JSON.stringify(payload);
      // text/plain = requête CORS "simple" (aucun preflight OPTIONS).
      var blob = new Blob([json], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
      fetch(ENDPOINT, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: json,
      }).catch(function () {});
    } catch (_) {}
  }

  // 1. Capture ?sa= depuis l'URL.
  var saFromUrl = null;
  try {
    saFromUrl = new URLSearchParams(window.location.search).get("sa");
  } catch (_) {}
  if (saFromUrl && isValidSa(saFromUrl)) {
    setCookie(COOKIE_NAME, saFromUrl);
    post({ type: "click", sa: saFromUrl, page_url: window.location.href, referrer: document.referrer || null });
  }

  // 2. Réécriture des liens sortants vers tipote.* pour garder le sa.
  function rewriteLinks() {
    var sa = getCookie(COOKIE_NAME);
    if (!sa || !isValidSa(sa)) return;
    var anchors = document.querySelectorAll("a[href]");
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var href = a.getAttribute("href");
      if (!href || href.indexOf("://") === -1) continue;
      var matches = false;
      for (var j = 0; j < TIPOTE_DOMAINS.length; j++) {
        if (href.indexOf("://" + TIPOTE_DOMAINS[j]) > -1 || href.indexOf("." + TIPOTE_DOMAINS[j]) > -1) {
          matches = true;
          break;
        }
      }
      if (!matches || /[?&]sa=/.test(href)) continue;
      var sep = href.indexOf("?") > -1 ? "&" : "?";
      a.setAttribute("href", href + sep + "sa=" + encodeURIComponent(sa));
    }
  }
  rewriteLinks();
  setTimeout(rewriteLinks, 1000);
  setTimeout(rewriteLinks, 3000);

  // 3. Capture conversion - multi-signaux (forms Systeme.io souvent AJAX).
  var SENT_KEY = "quizing_aff_conv_sent";
  var PENDING_EMAIL_KEY = "quizing_aff_pending_email";

  function isCompleteEmail(v) {
    return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }
  function getSentSet() {
    try {
      var raw = window.sessionStorage.getItem(SENT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }
  function markSent(email, sa) {
    try {
      var set = getSentSet();
      set[sa + "|" + email] = 1;
      window.sessionStorage.setItem(SENT_KEY, JSON.stringify(set));
    } catch (_) {}
  }
  function alreadySent(email, sa) {
    return !!getSentSet()[sa + "|" + email];
  }
  function rememberEmail(email) {
    try {
      window.sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } catch (_) {}
  }
  function getRememberedEmail() {
    try {
      return window.sessionStorage.getItem(PENDING_EMAIL_KEY);
    } catch (_) {
      return null;
    }
  }
  function fireConversion(email) {
    var sa = getCookie(COOKIE_NAME);
    if (!sa || !isValidSa(sa) || !isCompleteEmail(email)) return;
    var clean = email.trim().toLowerCase();
    if (alreadySent(clean, sa)) return;
    markSent(clean, sa);
    post({ type: "conversion", sa: sa, email: clean, page_url: window.location.href });
  }
  function scanEmailInputs() {
    var inputs = document.querySelectorAll(
      'input[type="email"], input[name*="email" i], input[id*="email" i], input[placeholder*="mail" i]',
    );
    for (var i = 0; i < inputs.length; i++) {
      if (isCompleteEmail(inputs[i].value)) rememberEmail(inputs[i].value.trim().toLowerCase());
    }
  }
  document.addEventListener("input", scanEmailInputs, true);
  document.addEventListener("change", scanEmailInputs, true);
  document.addEventListener("blur", scanEmailInputs, true);
  document.addEventListener(
    "submit",
    function (e) {
      try {
        var form = e.target;
        var email = null;
        if (form && form.querySelector) {
          var emailInput = form.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
          if (emailInput && isCompleteEmail(emailInput.value)) email = emailInput.value.trim().toLowerCase();
        }
        if (!email) {
          scanEmailInputs();
          email = getRememberedEmail();
        }
        if (email) {
          rememberEmail(email);
          fireConversion(email);
        }
      } catch (_) {}
    },
    true,
  );
  function flushPending() {
    var email = getRememberedEmail();
    if (email) fireConversion(email);
  }
  window.addEventListener("pagehide", flushPending);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flushPending();
  });
  (function checkThankYouPage() {
    var path = (window.location.pathname || "").toLowerCase();
    if (!/merci|thank|confirm|success|felicit/.test(path)) return;
    var email = getRememberedEmail();
    if (email) fireConversion(email);
  })();
})();
