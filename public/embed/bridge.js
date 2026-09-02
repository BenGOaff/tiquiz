/*!
 * Tiquiz embed bridge — iframe-based version
 * ------------------------------------------
 * Tiny script (≈1 kB) installed alongside the <iframe> on third-party
 * landing pages. It listens for the postMessage emitted by the embed
 * preview when the visitor clicks "Débloquer Tiquiz", then either:
 *   - opens the checkout URL configured on the iframe (data-checkout
 *     attribute, or attached via the script's data-checkout fallback)
 *   - or, if no override is given, falls back to whatever URL the
 *     iframe sent (it carries its own checkout_url query param).
 *
 * Usage on the host page:
 *   <iframe id="tiquiz-iframe"
 *           src="https://quiz.tipote.com/embed/preview?locale=fr&source=tiquiz-fr&checkout=https://tiquiz.fr/signup"
 *           data-checkout="https://tiquiz.fr/signup"
 *           style="width:100%;height:680px;border:0;border-radius:18px;"
 *           loading="lazy"></iframe>
 *   <script src="https://quiz.tipote.com/embed/bridge.js" async></script>
 *
 * Multiple iframes per page are supported. Each iframe can override
 * its own data-checkout independently.
 */
(function () {
  "use strict";

  function findIframe(sourceWindow) {
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === sourceWindow) return frames[i];
    }
    return null;
  }

  function resolveCheckout(iframe, payload) {
    // Priority order:
    //   1) data-checkout on the iframe (explicit override per page)
    //   2) checkout_url forwarded by the iframe (the URL it was loaded
    //      with, so a single bridge install on a generic template can
    //      still differentiate between sales pages)
    //   3) hard fallback to the public Tiquiz product page
    var explicit = iframe && iframe.getAttribute("data-checkout");
    var fromIframe = payload && typeof payload.checkout_url === "string" ? payload.checkout_url : "";
    // LE REPLI EST NOTRE INSCRIPTION, plus un tunnel Systeme.io.
    // Leur page ne transmet pas la query : le `tq_session` que la
    // ligne suivante colle sur l'adresse y mourait, donc le quiz que
    // le visiteur vient de fabriquer restait orphelin en base.
    return (explicit || fromIframe || "https://tiquiz.fr/signup").trim();
  }

  function appendSession(url, token) {
    if (!token) return url;
    var hashIdx = url.indexOf("#");
    var base = hashIdx === -1 ? url : url.slice(0, hashIdx);
    var hash = hashIdx === -1 ? "" : url.slice(hashIdx);
    var sep = base.indexOf("?") === -1 ? "?" : "&";
    return base + sep + "tq_session=" + encodeURIComponent(token) + hash;
  }

  window.addEventListener("message", function (e) {
    var data = e.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "tiquiz-embed-checkout") return;

    var iframe = findIframe(e.source);
    var checkout = resolveCheckout(iframe, data);
    var token = typeof data.session_token === "string" ? data.session_token : "";
    var finalUrl = appendSession(checkout, token);

    // Top-level nav so the visitor lands on the sales page's pricing
    // anchor with the session token preserved through to checkout.
    // _self because we're already on the sales page — the iframe just
    // needs to scroll us to the right section + pass the token.
    window.location.href = finalUrl;
  });
})();
