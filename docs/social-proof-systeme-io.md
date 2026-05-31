# Compteur de preuve sociale — snippet Systeme.io

Snippet HTML + JS prêt à coller dans un bloc **"Code HTML personnalisé"**
d'une page Systeme.io (ou n'importe quel autre builder qui accepte du HTML
brut).

Les chiffres se rafraîchissent à chaque chargement de page. L'endpoint
`https://quiz.tipote.com/api/public/stats` est mis en cache 5 minutes côté
CDN → fetch ultra-rapide même sous trafic publicitaire intense.

## Snippet final (recommandé) — 2 cartes, police Inter, couleurs Tiquiz, animation count-up, skeleton de chargement

```html
<!-- Tiquiz social proof counter — Systeme.io custom HTML block -->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap');
  .tq-sp { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; text-align: center; color: #2E386E; }
  .tq-sp__lead { font-size: 1.0625rem; font-weight: 600; margin: 0 0 1.25rem 0; line-height: 1.45; color: #2E386E; }
  .tq-sp__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; max-width: 38rem; margin: 0 auto; }
  .tq-sp__card { background: #ffffff; border-radius: 1rem; padding: 1.5rem 1rem; box-shadow: 0 2px 12px rgba(46, 56, 110, 0.08); border: 1px solid rgba(93, 108, 219, 0.08); }
  .tq-sp__verb { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.5rem; }
  .tq-sp__num { font-size: clamp(2.5rem, 6vw, 3.5rem); font-weight: 800; line-height: 1; color: #5D6CDB; font-variant-numeric: tabular-nums; min-height: 1em; }
  .tq-sp__num.is-loading { background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%); background-size: 200% 100%; animation: tq-shimmer 1.4s infinite; color: transparent; border-radius: 0.5rem; }
  .tq-sp__noun { margin-top: 0.5rem; font-size: 0.9375rem; font-weight: 500; color: #2E386E; }
  @keyframes tq-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @media (max-width: 480px) { .tq-sp__grid { grid-template-columns: 1fr; gap: 0.75rem; } }
</style>
<div class="tq-sp">
  <p class="tq-sp__lead">À ce jour les utilisateurs de Tiquiz ont :</p>
  <div class="tq-sp__grid">
    <div class="tq-sp__card">
      <div class="tq-sp__verb">publié</div>
      <div class="tq-sp__num is-loading" data-tq-stat="quizzes">0000</div>
      <div class="tq-sp__noun">quiz</div>
    </div>
    <div class="tq-sp__card">
      <div class="tq-sp__verb">capturé</div>
      <div class="tq-sp__num is-loading" data-tq-stat="leads">0000</div>
      <div class="tq-sp__noun">leads qualifiés</div>
    </div>
  </div>
</div>
<script>
(function () {
  var fmt = new Intl.NumberFormat('fr-FR');
  var stopLoading = function (selector) {
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) { nodes[i].classList.remove('is-loading'); }
  };
  var animateTo = function (selector, target) {
    stopLoading(selector);
    var nodes = document.querySelectorAll(selector);
    var start = Date.now();
    var duration = 1500;
    var tick = function () {
      var t = Math.min(1, (Date.now() - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      var current = Math.round(target * eased);
      for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = fmt.format(current); }
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  };
  var showFallback = function () {
    var setText = function (sel, txt) {
      var nodes = document.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.remove('is-loading');
        nodes[i].textContent = txt;
      }
    };
    setText('[data-tq-stat="quizzes"]', '—');
    setText('[data-tq-stat="leads"]', '—');
  };
  // Timeout de sécurité : si la requête bloque plus de 5 s, fallback discret.
  var fallbackTimer = setTimeout(showFallback, 5000);
  fetch('https://quiz.tipote.com/api/public/stats')
    .then(function (r) { return r.json(); })
    .then(function (j) {
      clearTimeout(fallbackTimer);
      if (!j || !j.ok) { showFallback(); return; }
      animateTo('[data-tq-stat="quizzes"]', j.quizzes);
      animateTo('[data-tq-stat="leads"]', j.leads);
    })
    .catch(function () { clearTimeout(fallbackTimer); showFallback(); });
})();
</script>
```

Caractéristiques :
- **Police Inter** (chargée via Google Fonts)
- **Couleurs Tiquiz** : primary `#5D6CDB` pour les chiffres, texte `#2E386E`
- **Pas de bg global**, seules les cards ont un fond blanc + ombre légère
- **Animation count-up** easeOutCubic 1.5 s (0 → valeur finale, fluide)
- **Responsive** : 1 colonne sur mobile <480 px, 2 colonnes au-dessus
- `font-variant-numeric: tabular-nums` pour que les chiffres ne sautent
  pas pendant l'anim

## Variante "phrase intégrée"

Si tu préfères une phrase en ligne plutôt que 2 cartes :

```html
<p class="tq-sp-inline" style="font-family:'Inter',system-ui,sans-serif;font-size:1.05rem;line-height:1.6;color:#2E386E;">
  À ce jour,
  <strong style="color:#5D6CDB;"><span data-tq-stat="quizzes">…</span></strong>
  quiz ont été créés sur Tiquiz et ils ont capturé
  <strong style="color:#5D6CDB;"><span data-tq-stat="leads">…</span></strong>
  emails qualifiés.
</p>
<script>
(function () {
  fetch('https://quiz.tipote.com/api/public/stats')
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j || !j.ok) return;
      var fmt = new Intl.NumberFormat('fr-FR');
      var setText = function (selector, value) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = fmt.format(value); }
      };
      setText('[data-tq-stat="quizzes"]', j.quizzes);
      setText('[data-tq-stat="leads"]', j.leads);
    })
    .catch(function () {});
})();
</script>
```

## API directe

Si tu veux fetch toi-même depuis ailleurs (n8n, Make, autre site…) :

```
GET https://quiz.tipote.com/api/public/stats
```

Réponse :

```json
{
  "ok": true,
  "quizzes": 1234,
  "leads": 56789,
  "updated_at": "2026-05-30T14:23:01.000Z"
}
```

- CORS ouvert (`Access-Control-Allow-Origin: *`)
- Cache 5 minutes (CDN + `s-maxage=300`)
- `updated_at` = heure à laquelle le cache a été refresh (utile pour debug)
- `quizzes` = quiz avec `status = 'active'` uniquement (= publié dans Tiquiz)
- `leads` = toutes les lignes de la table `quiz_leads`

## Test rapide

Avant de coller dans Systeme.io, teste l'endpoint en ouvrant
[https://quiz.tipote.com/api/public/stats](https://quiz.tipote.com/api/public/stats)
dans ton navigateur. Tu dois voir le JSON ci-dessus.

