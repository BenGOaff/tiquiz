/*!
 * Tiquiz embed — sales-page demo widget
 * --------------------------------------
 * One self-contained Web Component, vanilla JS, Shadow DOM scoped.
 * Designed to run on third-party landing pages (systeme.io, Carrd…)
 * without a build step or framework.
 *
 * Funnel (4 steps):
 *   1. Hook form: sujet, audience, objectif, email   → lead capture
 *   2. Generation: SSE stream + "live writing" feel
 *   3. Edit: rename, edit / add / delete questions    → sunk cost
 *   4. Paywall: blurred preview of the public quiz    → conversion
 *
 * Mounting:
 *   <div id="tiquiz-embed"></div>
 *   <script src="https://APP_URL/embed/tiquiz.js"
 *           data-api="https://APP_URL"
 *           data-checkout="https://www.tipote.fr/tiquiz#section-pricing"
 *           data-source="systemeio-tiquiz-sales"
 *           data-locale="fr"
 *           async></script>
 *
 * Attributes (all optional except data-api):
 *   data-api       — base URL where /api/embed/quiz/* lives (required)
 *   data-checkout  — where the "Unlock Tiquiz" button sends visitors
 *                    (your sales-page pricing anchor)
 *   data-source    — free-text label stored on the embed_quiz_session
 *                    row; use it to attribute conversions per page
 *                    (e.g. "tiquiz-fr", "tiquiz-affiliate", "tiquiz-en")
 *   data-locale    — "fr" | "en" — drives BOTH the UI strings AND the
 *                    language Claude generates the quiz in
 *   data-mount     — CSS selector of the host element (default
 *                    "#tiquiz-embed"). Multiple embeds per page OK.
 */
(function () {
  "use strict";

  // ── Config from <script> attributes ────────────────────────────
  // We read the script tag once at load. data-api is REQUIRED — it's
  // where /api/embed/quiz/* lives. Default falls back to same-origin
  // so dogfooding from inside Tiquiz works without config.
  var SCRIPT = document.currentScript || (function () {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].src || "").indexOf("/embed/tiquiz.js") !== -1) return all[i];
    }
    return null;
  })();

  var API_BASE = (SCRIPT && SCRIPT.getAttribute("data-api")) || "";
  var CHECKOUT_URL = (SCRIPT && SCRIPT.getAttribute("data-checkout")) || "https://www.tipote.fr/tiquiz";
  var DEFAULT_SOURCE = (SCRIPT && SCRIPT.getAttribute("data-source")) || "embed";
  var MOUNT_SELECTOR = (SCRIPT && SCRIPT.getAttribute("data-mount")) || "#tiquiz-embed";
  // The locale drives BOTH the embed UI strings AND the language Claude
  // writes the quiz in. We accept "fr" / "en" only — anything else
  // falls back to "fr" so an empty/typo'd attribute still renders.
  var LOCALE = (function () {
    var raw = (SCRIPT && SCRIPT.getAttribute("data-locale")) || "fr";
    return raw === "en" ? "en" : "fr";
  })();

  function apiUrl(path) {
    if (!API_BASE) return path;
    return API_BASE.replace(/\/$/, "") + path;
  }

  // ── Brand tokens (kept in sync with app/globals.css) ───────────
  var BRAND = {
    primary: "#5D6CDB",
    primaryDark: "#4A56C0",
    accent: "#22C9E5",
    text: "#1A1F36",
    muted: "#5A6478",
    border: "#E4E7EE",
    bg: "#FFFFFF",
    soft: "#F4F6FB",
    danger: "#E0366B",
    success: "#1FAE7B",
  };

  // Strategic objectives — `value` is the canonical key the backend
  // expects (matches QUIZ_OBJECTIVES in lib/prompts/quiz/system.ts);
  // labels are looked up per-locale at render time.
  var OBJECTIVES_FR = {
    engagement: "Créer de l'engagement",
    eduquer: "Éduquer mon audience",
    qualifier: "Qualifier mes prospects",
    decouvrir: "Faire découvrir un sujet",
    tester: "Tester des connaissances",
    diagnostiquer: "Diagnostiquer un besoin",
    orienter: "Orienter vers une offre",
    sensibiliser: "Sensibiliser à un sujet",
  };
  var OBJECTIVES_EN = {
    engagement: "Create engagement",
    eduquer: "Educate my audience",
    qualifier: "Qualify leads",
    decouvrir: "Spark discovery",
    tester: "Test knowledge",
    diagnostiquer: "Diagnose a need",
    orienter: "Guide to an offer",
    sensibiliser: "Raise awareness",
  };
  var OBJECTIVE_KEYS = Object.keys(OBJECTIVES_FR);

  // ── i18n dictionary ────────────────────────────────────────────
  // Two locales for now (FR + EN). Adding a new one means duplicating
  // the block below — every key is required, no silent fallback.
  var I18N = {
    fr: {
      title: "Crée ton premier quiz en 30 secondes ✨",
      lead: "Dis-nous l'essentiel, l'IA fait le reste. Tu pourras tout modifier ensuite.",
      lblTopic: "Sujet de ton quiz",
      phTopic: "Ex : la productivité pour entrepreneurs débordés",
      lblAudience: "À qui s'adresse-t-il ?",
      phAudience: "Ex : freelances de 30 à 45 ans",
      lblObjective: "Ton objectif",
      lblEmail: "Ton email (pour recevoir ton quiz)",
      phEmail: "toi@exemple.com",
      submit: "Générer mon quiz avec l'IA →",
      legal: "En cliquant, tu acceptes que ton email soit utilisé pour t'envoyer ton quiz et des conseils Tiquiz. Désabonnement en 1 clic. ",
      legalLink: "Confidentialité",
      legalUrl: "https://www.tipote.fr/legal",
      errTopic: "Précise le sujet de ton quiz (au moins 3 caractères).",
      errAudience: "Précise à qui s'adresse ton quiz.",
      errEmail: "Email invalide.",
      errNoResponse: "L'IA n'a pas répondu. Réessaie.",
      errNetwork: "Erreur réseau.",
      genConnect: "Connexion à l'IA…",
      genStep: "Génération en cours…",
      genSub: "L'IA écrit tes questions, tes options et tes profils. Quelques secondes.",
      defaultTitle: "Mon quiz",
      defaultIntro: "Découvre ton profil en quelques questions.",
      editLead: "Modifie librement. Quand tu es prêt à le partager, débloque Tiquiz.",
      addQ: "+ Ajouter une question",
      addOpt: "+ Ajouter une option",
      newQ: "Nouvelle question",
      newOpt: "Nouvelle option",
      optA: "Option A",
      optB: "Option B",
      optC: "Option C",
      shareCta: "Partager mon quiz 🚀",
      delQ: "Supprimer cette question",
      delOpt: "Supprimer l'option",
      paywallBadge: "✨ Ton quiz est prêt",
      paywallTitle: "Débloque Tiquiz pour le partager",
      paywallText: "Lien public, capture des leads, intégration systeme.io et 100 langues. Importe ce quiz dans ton compte en 1 clic.",
      paywallCta: "Débloquer Tiquiz →",
      paywallSavedOk: "✓ Ton quiz est sauvegardé. On t'a envoyé un lien par email.",
      paywallSaveLater: "Pas maintenant — sauvegarder pour plus tard",
      poweredBy: "Propulsé par ",
    },
    en: {
      title: "Build your first quiz in 30 seconds ✨",
      lead: "Tell us the basics, the AI does the rest. You can edit everything afterwards.",
      lblTopic: "Quiz topic",
      phTopic: "E.g. productivity for overwhelmed entrepreneurs",
      lblAudience: "Who is it for?",
      phAudience: "E.g. freelancers aged 30 to 45",
      lblObjective: "Your goal",
      lblEmail: "Your email (so we can send you your quiz)",
      phEmail: "you@example.com",
      submit: "Generate my quiz with AI →",
      legal: "By clicking, you agree that your email may be used to send you your quiz and Tiquiz tips. One-click unsubscribe. ",
      legalLink: "Privacy",
      legalUrl: "https://www.tipote.fr/legal",
      errTopic: "Tell us the quiz topic (at least 3 characters).",
      errAudience: "Tell us who this quiz is for.",
      errEmail: "Invalid email.",
      errNoResponse: "The AI didn't reply. Try again.",
      errNetwork: "Network error.",
      genConnect: "Connecting to the AI…",
      genStep: "Generating…",
      genSub: "The AI is writing your questions, options and profiles. Just a few seconds.",
      defaultTitle: "My quiz",
      defaultIntro: "Discover your profile in just a few questions.",
      editLead: "Edit freely. When you're ready to share it, unlock Tiquiz.",
      addQ: "+ Add a question",
      addOpt: "+ Add an option",
      newQ: "New question",
      newOpt: "New option",
      optA: "Option A",
      optB: "Option B",
      optC: "Option C",
      shareCta: "Share my quiz 🚀",
      delQ: "Delete this question",
      delOpt: "Delete option",
      paywallBadge: "✨ Your quiz is ready",
      paywallTitle: "Unlock Tiquiz to share it",
      paywallText: "Public link, lead capture, systeme.io integration and 100 languages. Import this quiz into your account in 1 click.",
      paywallCta: "Unlock Tiquiz →",
      paywallSavedOk: "✓ Your quiz is saved. We've sent you a link by email.",
      paywallSaveLater: "Not now — save for later",
      poweredBy: "Powered by ",
    },
  };
  function t(key) { return I18N[LOCALE][key]; }
  function objLabel(key) {
    return (LOCALE === "en" ? OBJECTIVES_EN : OBJECTIVES_FR)[key];
  }

  // ── Styles (scoped via Shadow DOM) ─────────────────────────────
  // Mobile-first; the only breakpoint widens the form to two columns
  // above 640px. Everything else uses fluid sizing so it lives well
  // inside narrow systeme.io blocks.
  var CSS = (
    ":host{all:initial;display:block;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Inter,sans-serif;color:" + BRAND.text + ";line-height:1.5;}" +
    "*{box-sizing:border-box;}" +
    ".card{background:" + BRAND.bg + ";border:1px solid " + BRAND.border + ";border-radius:18px;padding:24px;box-shadow:0 8px 32px rgba(35,40,80,.06);max-width:680px;margin:0 auto;position:relative;overflow:hidden;}" +
    ".card::before{content:\"\";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg," + BRAND.primary + " 0%," + BRAND.accent + " 100%);}" +
    "h2{margin:0 0 6px;font-size:22px;font-weight:700;letter-spacing:-.01em;}" +
    "p.lead{margin:0 0 20px;color:" + BRAND.muted + ";font-size:15px;}" +
    "label{display:block;font-size:13px;font-weight:600;margin:0 0 6px;color:" + BRAND.text + ";}" +
    "input,select,textarea{width:100%;font:inherit;color:" + BRAND.text + ";background:" + BRAND.bg + ";border:1px solid " + BRAND.border + ";border-radius:12px;padding:12px 14px;outline:none;transition:border-color .15s,box-shadow .15s;}" +
    "input:focus,select:focus,textarea:focus{border-color:" + BRAND.primary + ";box-shadow:0 0 0 3px rgba(93,108,219,.18);}" +
    ".row{display:grid;gap:14px;grid-template-columns:1fr;}" +
    "@media(min-width:640px){.row.two{grid-template-columns:1fr 1fr;}}" +
    ".btn{appearance:none;border:0;cursor:pointer;font:inherit;font-weight:600;border-radius:12px;padding:14px 20px;transition:transform .08s,filter .15s,box-shadow .15s;width:100%;}" +
    ".btn-primary{background:linear-gradient(135deg," + BRAND.primary + " 0%," + BRAND.accent + " 100%);color:#fff;font-size:16px;box-shadow:0 6px 18px rgba(93,108,219,.32);}" +
    ".btn-primary:hover{filter:brightness(1.05);}" +
    ".btn-primary:active{transform:translateY(1px);}" +
    ".btn-primary[disabled]{opacity:.55;cursor:not-allowed;filter:grayscale(.3);}" +
    ".btn-ghost{background:transparent;color:" + BRAND.muted + ";border:1px solid " + BRAND.border + ";font-size:14px;padding:10px 14px;width:auto;}" +
    ".btn-ghost:hover{color:" + BRAND.text + ";border-color:" + BRAND.primary + ";}" +
    ".error{color:" + BRAND.danger + ";font-size:13px;margin:8px 0 0;}" +
    ".legal{color:" + BRAND.muted + ";font-size:11px;margin-top:14px;line-height:1.4;}" +
    ".legal a{color:" + BRAND.muted + ";text-decoration:underline;}" +
    /* generation step */
    ".gen{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 8px;}" +
    ".spinner{width:48px;height:48px;border-radius:50%;border:3px solid " + BRAND.soft + ";border-top-color:" + BRAND.primary + ";animation:tq-spin .9s linear infinite;margin-bottom:18px;}" +
    "@keyframes tq-spin{to{transform:rotate(360deg);}}" +
    ".gen-step{font-weight:600;font-size:15px;}" +
    ".gen-sub{color:" + BRAND.muted + ";font-size:13px;margin-top:6px;}" +
    /* editor step */
    ".q{border:1px solid " + BRAND.border + ";border-radius:14px;padding:14px;margin:0 0 12px;background:" + BRAND.soft + ";}" +
    ".q-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}" +
    ".q-num{flex:0 0 auto;width:24px;height:24px;border-radius:50%;background:" + BRAND.primary + ";color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;}" +
    ".q-text{flex:1;font-weight:600;border:0;background:transparent;padding:6px 8px;border-radius:8px;}" +
    ".q-text:focus{background:#fff;}" +
    ".q-del{background:transparent;border:0;color:" + BRAND.muted + ";cursor:pointer;font-size:18px;line-height:1;padding:4px 8px;border-radius:6px;}" +
    ".q-del:hover{color:" + BRAND.danger + ";background:rgba(224,54,107,.08);}" +
    ".opt{display:flex;align-items:center;gap:8px;margin:6px 0;}" +
    ".opt input[type=text]{flex:1;background:#fff;}" +
    ".add-q{display:block;width:100%;border:1px dashed " + BRAND.border + ";background:transparent;color:" + BRAND.muted + ";padding:12px;border-radius:12px;cursor:pointer;font:inherit;font-weight:500;}" +
    ".add-q:hover{border-color:" + BRAND.primary + ";color:" + BRAND.primary + ";}" +
    ".cta-row{position:sticky;bottom:0;background:linear-gradient(to top,#fff 70%,rgba(255,255,255,0));padding:18px 0 4px;margin-top:18px;}" +
    /* paywall */
    ".paywall{position:relative;}" +
    ".paywall-preview{filter:blur(6px) saturate(.85);pointer-events:none;user-select:none;}" +
    ".paywall-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;background:linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.92) 35%);}" +
    ".paywall-badge{display:inline-block;padding:6px 12px;border-radius:999px;background:" + BRAND.primary + ";color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px;}" +
    ".paywall h3{margin:0 0 8px;font-size:22px;font-weight:700;}" +
    ".paywall p{margin:0 0 18px;color:" + BRAND.muted + ";font-size:14px;max-width:380px;}" +
    ".save-link{display:inline-block;margin-top:10px;color:" + BRAND.muted + ";font-size:13px;text-decoration:underline;cursor:pointer;background:transparent;border:0;}" +
    ".save-link:hover{color:" + BRAND.text + ";}" +
    ".saved-confirm{margin-top:12px;color:" + BRAND.success + ";font-size:13px;font-weight:600;}" +
    ".footer-mark{margin-top:14px;text-align:center;font-size:11px;color:" + BRAND.muted + ";}" +
    ".footer-mark a{color:" + BRAND.muted + ";text-decoration:none;font-weight:600;}"
  );

  // ── Tiny DOM helpers (no framework) ────────────────────────────
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // ── SSE consumer ───────────────────────────────────────────────
  // EventSource doesn't support POST so we read the body manually.
  // Returns an async iterator of {event, data} parsed JSON objects.
  async function* sseFromFetch(url, body) {
    var res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tiquiz-source": DEFAULT_SOURCE },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      var text = await res.text().catch(function () { return ""; });
      throw new Error(text || ("HTTP " + res.status));
    }
    var reader = res.body.getReader();
    var decoder = new TextDecoder("utf-8");
    var buffer = "";
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      var parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (var i = 0; i < parts.length; i++) {
        var lines = parts[i].split("\n");
        var ev = "message", data = "";
        for (var j = 0; j < lines.length; j++) {
          if (lines[j].indexOf("event:") === 0) ev = lines[j].slice(6).trim();
          else if (lines[j].indexOf("data:") === 0) data += lines[j].slice(5).trim();
        }
        if (!data) continue;
        try { yield { event: ev, data: JSON.parse(data) }; }
        catch (e) { /* swallow malformed events */ }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Web Component
  // ═══════════════════════════════════════════════════════════════
  class TiquizEmbed extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._state = {
        step: "form", // form | generating | edit | paywall
        error: "",
        progress: "",
        sessionToken: "",
        quiz: null,
        savedForLater: false,
        inputs: { topic: "", audience: "", objective: "qualifier", email: "" },
      };
    }

    connectedCallback() {
      var styleEl = document.createElement("style");
      styleEl.textContent = CSS;
      this.shadowRoot.appendChild(styleEl);
      this._root = document.createElement("div");
      this.shadowRoot.appendChild(this._root);
      this._render();
    }

    _setState(patch) {
      Object.assign(this._state, patch);
      this._render();
    }

    _render() {
      this._root.innerHTML = "";
      var step = this._state.step;
      var node;
      if (step === "form") node = this._renderForm();
      else if (step === "generating") node = this._renderGenerating();
      else if (step === "edit") node = this._renderEditor();
      else if (step === "paywall") node = this._renderPaywall();
      this._root.appendChild(node);

      var mark = el("div", { class: "footer-mark" }, [
        t("poweredBy"),
        el("a", { href: CHECKOUT_URL, target: "_blank", rel: "noopener" }, ["Tiquiz"]),
      ]);
      this._root.appendChild(mark);
    }

    // ── Step 1: Hook form ────────────────────────────────────────
    _renderForm() {
      var s = this._state;
      var self = this;
      var card = el("div", { class: "card" }, [
        el("h2", null, [t("title")]),
        el("p", { class: "lead" }, [t("lead")]),
        el("div", { class: "row" }, [
          (function () {
            var w = el("div");
            w.appendChild(el("label", null, [t("lblTopic")]));
            var inp = el("input", {
              type: "text",
              placeholder: t("phTopic"),
              maxlength: "200",
              value: s.inputs.topic,
            });
            inp.addEventListener("input", function (e) { s.inputs.topic = e.target.value; });
            w.appendChild(inp);
            return w;
          })(),
        ]),
        el("div", { class: "row two", style: "margin-top:14px" }, [
          (function () {
            var w = el("div");
            w.appendChild(el("label", null, [t("lblAudience")]));
            var inp = el("input", {
              type: "text",
              placeholder: t("phAudience"),
              maxlength: "200",
              value: s.inputs.audience,
            });
            inp.addEventListener("input", function (e) { s.inputs.audience = e.target.value; });
            w.appendChild(inp);
            return w;
          })(),
          (function () {
            var w = el("div");
            w.appendChild(el("label", null, [t("lblObjective")]));
            var sel = el("select");
            OBJECTIVE_KEYS.forEach(function (k) {
              var opt = el("option", { value: k }, [objLabel(k)]);
              if (k === s.inputs.objective) opt.selected = true;
              sel.appendChild(opt);
            });
            sel.addEventListener("change", function (e) { s.inputs.objective = e.target.value; });
            w.appendChild(sel);
            return w;
          })(),
        ]),
        el("div", { class: "row", style: "margin-top:14px" }, [
          (function () {
            var w = el("div");
            w.appendChild(el("label", null, [t("lblEmail")]));
            var inp = el("input", {
              type: "email",
              placeholder: t("phEmail"),
              maxlength: "200",
              value: s.inputs.email,
            });
            inp.addEventListener("input", function (e) { s.inputs.email = e.target.value; });
            w.appendChild(inp);
            return w;
          })(),
        ]),
        s.error ? el("p", { class: "error" }, [s.error]) : null,
        el("div", { style: "margin-top:18px" }, [
          el("button", {
            class: "btn btn-primary",
            type: "button",
            onclick: function () { self._submitForm(); },
          }, [t("submit")]),
        ]),
        el("p", { class: "legal" }, [
          t("legal"),
          el("a", { href: t("legalUrl"), target: "_blank", rel: "noopener" }, [t("legalLink")]),
        ]),
      ]);
      return card;
    }

    async _submitForm() {
      var s = this._state;
      var i = s.inputs;
      if (!i.topic || i.topic.trim().length < 3) {
        return this._setState({ error: t("errTopic") });
      }
      if (!i.audience || i.audience.trim().length < 2) {
        return this._setState({ error: t("errAudience") });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.email)) {
        return this._setState({ error: t("errEmail") });
      }

      this._setState({ step: "generating", error: "", progress: t("genConnect") });

      try {
        var iter = sseFromFetch(apiUrl("/api/embed/quiz/generate"), {
          email: i.email.trim().toLowerCase(),
          topic: i.topic.trim(),
          audience: i.audience.trim(),
          objective: i.objective,
          // The backend forwards `locale` straight to Claude's prompt
          // builder, so this is what makes the EN sales page generate
          // an English quiz.
          locale: LOCALE,
          source: DEFAULT_SOURCE + (location.host ? " :: " + location.host : ""),
        });
        for await (var msg of iter) {
          if (msg.event === "session" && msg.data && msg.data.session_token) {
            this._setState({ sessionToken: msg.data.session_token });
          } else if (msg.event === "progress" && msg.data && msg.data.step) {
            // Backend "Ton quiz se construit…" message wins over the
            // generic local one — it's already localized server-side.
            this._setState({ progress: msg.data.step });
          } else if (msg.event === "result" && msg.data && msg.data.quiz) {
            this._setState({
              step: "edit",
              quiz: this._normalizeQuiz(msg.data.quiz),
              sessionToken: msg.data.session_token || this._state.sessionToken,
              error: "",
            });
            return;
          } else if (msg.event === "error") {
            this._setState({ step: "form", error: (msg.data && msg.data.error) || t("errNoResponse") });
            return;
          }
        }
        // stream ended without a result
        this._setState({ step: "form", error: t("errNoResponse") });
      } catch (e) {
        this._setState({ step: "form", error: e && e.message ? e.message : t("errNetwork") });
      }
    }

    // The embed editor only needs questions[].text + questions[].options[].text.
    // We ignore (but preserve) anything else so /save round-trips faithfully
    // and the post-claim import keeps the full payload.
    _normalizeQuiz(quiz) {
      var q = JSON.parse(JSON.stringify(quiz || {}));
      if (!Array.isArray(q.questions)) q.questions = [];
      q.questions = q.questions.map(function (qu) {
        return Object.assign({}, qu, {
          text: String(qu.text || qu.question || ""),
          options: Array.isArray(qu.options) ? qu.options.map(function (o) {
            return Object.assign({}, o, { text: String(o.text || o.label || "") });
          }) : [],
        });
      });
      return q;
    }

    // ── Step 2: Generating ───────────────────────────────────────
    _renderGenerating() {
      return el("div", { class: "card" }, [
        el("div", { class: "gen" }, [
          el("div", { class: "spinner" }),
          el("div", { class: "gen-step" }, [this._state.progress || t("genStep")]),
          el("div", { class: "gen-sub" }, [t("genSub")]),
        ]),
      ]);
    }

    // ── Step 3: Editor ───────────────────────────────────────────
    _renderEditor() {
      var self = this;
      var q = this._state.quiz || { questions: [] };
      var card = el("div", { class: "card" }, [
        el("h2", null, [
          (function () {
            var inp = el("input", {
              type: "text",
              value: q.title || t("defaultTitle"),
              style: "font-size:22px;font-weight:700;border:0;padding:4px 8px;border-radius:8px;background:transparent;width:100%;",
            });
            inp.addEventListener("input", function (e) {
              q.title = e.target.value;
              self._scheduleSave();
            });
            return inp;
          })(),
        ]),
        el("p", { class: "lead" }, [t("editLead")]),
      ]);

      q.questions.forEach(function (qu, idx) { card.appendChild(self._renderQuestion(qu, idx)); });

      var addBtn = el("button", {
        class: "add-q",
        type: "button",
        onclick: function () {
          q.questions.push({ text: t("newQ"), options: [
            { text: t("optA") }, { text: t("optB") }, { text: t("optC") },
          ] });
          self._scheduleSave();
          self._render();
        },
      }, [t("addQ")]);
      card.appendChild(addBtn);

      var ctaRow = el("div", { class: "cta-row" }, [
        el("button", {
          class: "btn btn-primary",
          type: "button",
          onclick: function () { self._setState({ step: "paywall" }); },
        }, [t("shareCta")]),
      ]);
      card.appendChild(ctaRow);

      return card;
    }

    _renderQuestion(qu, idx) {
      var self = this;
      var box = el("div", { class: "q" });
      var head = el("div", { class: "q-head" }, [
        el("span", { class: "q-num" }, [String(idx + 1)]),
        (function () {
          var inp = el("input", { class: "q-text", type: "text", value: qu.text });
          inp.addEventListener("input", function (e) { qu.text = e.target.value; self._scheduleSave(); });
          return inp;
        })(),
        el("button", {
          class: "q-del",
          type: "button",
          title: t("delQ"),
          "aria-label": t("delQ"),
          onclick: function () {
            self._state.quiz.questions.splice(idx, 1);
            self._scheduleSave();
            self._render();
          },
        }, ["×"]),
      ]);
      box.appendChild(head);

      (qu.options || []).forEach(function (opt, oIdx) {
        var row = el("div", { class: "opt" }, [
          (function () {
            var inp = el("input", { type: "text", value: opt.text });
            inp.addEventListener("input", function (e) { opt.text = e.target.value; self._scheduleSave(); });
            return inp;
          })(),
          el("button", {
            class: "q-del",
            type: "button",
            title: t("delOpt"),
            "aria-label": t("delOpt"),
            onclick: function () {
              qu.options.splice(oIdx, 1);
              self._scheduleSave();
              self._render();
            },
          }, ["×"]),
        ]);
        box.appendChild(row);
      });

      var addOpt = el("button", {
        class: "btn-ghost",
        type: "button",
        style: "margin-top:6px;font-size:13px;",
        onclick: function () {
          qu.options = qu.options || [];
          qu.options.push({ text: t("newOpt") });
          self._scheduleSave();
          self._render();
        },
      }, [t("addOpt")]);
      box.appendChild(addOpt);
      return box;
    }

    // Debounced save: every edit keystroke would otherwise hammer
    // /api/embed/quiz/save. We coalesce to one PATCH per 1.2 s.
    _scheduleSave() {
      var self = this;
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(function () { self._saveQuiz(false); }, 1200);
    }

    async _saveQuiz(savedForLater) {
      if (!this._state.sessionToken || !this._state.quiz) return;
      try {
        await fetch(apiUrl("/api/embed/quiz/save"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            session_token: this._state.sessionToken,
            quiz: this._state.quiz,
            saved_for_later: !!savedForLater,
          }),
        });
        if (savedForLater) this._setState({ savedForLater: true });
      } catch (e) { /* silent — the next debounced save will retry */ }
    }

    // ── Step 4: Paywall ──────────────────────────────────────────
    _renderPaywall() {
      var self = this;
      var q = this._state.quiz || {};
      var preview = el("div", { class: "paywall-preview" }, [
        el("h3", { style: "margin:0 0 6px;font-size:20px;" }, [q.title || t("defaultTitle")]),
        el("p", { class: "lead" }, [q.description || q.introduction || t("defaultIntro")]),
      ]);
      (q.questions || []).slice(0, 2).forEach(function (qu, idx) {
        var qBox = el("div", { class: "q" }, [
          el("div", { class: "q-head" }, [
            el("span", { class: "q-num" }, [String(idx + 1)]),
            el("strong", null, [qu.text || ""]),
          ]),
        ]);
        (qu.options || []).forEach(function (o) {
          qBox.appendChild(el("div", { class: "opt" }, [
            el("input", { type: "text", value: o.text, disabled: "true" }),
          ]));
        });
        preview.appendChild(qBox);
      });

      var overlay = el("div", { class: "paywall-overlay" }, [
        el("span", { class: "paywall-badge" }, [t("paywallBadge")]),
        el("h3", null, [t("paywallTitle")]),
        el("p", null, [t("paywallText")]),
        el("button", {
          class: "btn btn-primary",
          type: "button",
          style: "max-width:320px;",
          onclick: function () {
            // Save one last time before redirecting; non-blocking.
            self._saveQuiz(false);
            window.open(CHECKOUT_URL, "_blank", "noopener");
          },
        }, [t("paywallCta")]),
        self._state.savedForLater
          ? el("div", { class: "saved-confirm" }, [t("paywallSavedOk")])
          : el("button", {
              class: "save-link",
              type: "button",
              onclick: function () { self._saveQuiz(true); },
            }, [t("paywallSaveLater")]),
      ]);

      return el("div", { class: "card paywall" }, [preview, overlay]);
    }
  }

  // ── Auto-mount ─────────────────────────────────────────────────
  function mount() {
    if (!customElements.get("tiquiz-embed")) {
      customElements.define("tiquiz-embed", TiquizEmbed);
    }
    var hosts = document.querySelectorAll(MOUNT_SELECTOR);
    hosts.forEach(function (host) {
      if (host.dataset.tiquizMounted === "1") return;
      host.dataset.tiquizMounted = "1";
      host.innerHTML = "";
      host.appendChild(document.createElement("tiquiz-embed"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
