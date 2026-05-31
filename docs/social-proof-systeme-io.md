# Compteur de preuve sociale — snippet Systeme.io

Snippet HTML + JS prêt à coller dans un bloc **"Custom HTML"** d'une page
Systeme.io (ou n'importe quel autre builder qui accepte du HTML brut).

Les chiffres se rafraîchissent à chaque chargement de page. L'endpoint
`https://app.tiquiz.com/api/public/stats` est mis en cache 5 minutes côté
CDN → fetch ultra-rapide même sous trafic publicitaire intense.

## Snippet "phrase intégrée" (recommandé)

```html
<!-- Tiquiz live counter — paste in a Systeme.io HTML block -->
<p class="tiquiz-counter" style="font-size: 1.05rem; line-height: 1.6;">
  À ce jour,
  <strong><span data-tiquiz-stat="quizzes">…</span></strong>
  quiz ont été créés sur Tiquiz et ils ont capturé
  <strong><span data-tiquiz-stat="leads">…</span></strong>
  emails qualifiés.
</p>
<script>
(function () {
  fetch('https://app.tiquiz.com/api/public/stats')
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j || !j.ok) return;
      var fmt = new Intl.NumberFormat('fr-FR');
      var setText = function (selector, value) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].textContent = fmt.format(value);
        }
      };
      setText('[data-tiquiz-stat="quizzes"]', j.quizzes);
      setText('[data-tiquiz-stat="leads"]', j.leads);
    })
    .catch(function () { /* silencieux : on garde les "…" si l'endpoint ne répond pas */ });
})();
</script>
```

## Snippet "2 grosses stats" (carte visuelle)

```html
<!-- Tiquiz big stats card — paste in a Systeme.io HTML block -->
<div class="tiquiz-big-stats"
     style="display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;padding:1.5rem;border-radius:1rem;background:#f8f8fa;text-align:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <div>
    <div style="font-size:2.5rem;font-weight:800;color:#5D6CDB;line-height:1;">
      <span data-tiquiz-stat="quizzes">…</span>
    </div>
    <div style="margin-top:0.5rem;font-size:0.875rem;color:#6b7280;">quiz publiés</div>
  </div>
  <div>
    <div style="font-size:2.5rem;font-weight:800;color:#5D6CDB;line-height:1;">
      <span data-tiquiz-stat="leads">…</span>
    </div>
    <div style="margin-top:0.5rem;font-size:0.875rem;color:#6b7280;">emails qualifiés capturés</div>
  </div>
</div>
<script>
(function () {
  fetch('https://app.tiquiz.com/api/public/stats')
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j || !j.ok) return;
      var fmt = new Intl.NumberFormat('fr-FR');
      var setText = function (selector, value) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].textContent = fmt.format(value);
        }
      };
      setText('[data-tiquiz-stat="quizzes"]', j.quizzes);
      setText('[data-tiquiz-stat="leads"]', j.leads);
    })
    .catch(function () {});
})();
</script>
```

## Bonus : animation "count-up"

Si tu veux que les chiffres montent de 0 jusqu'à la valeur finale en 1s
(effet "wahou"), remplace le `setText(...)` du snippet par cette version :

```javascript
var animateTo = function (selector, target) {
  var nodes = document.querySelectorAll(selector);
  var start = Date.now();
  var duration = 1200; // ms
  var tick = function () {
    var t = Math.min(1, (Date.now() - start) / duration);
    // easeOutCubic
    var eased = 1 - Math.pow(1 - t, 3);
    var current = Math.round(target * eased);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = fmt.format(current);
    }
    if (t < 1) requestAnimationFrame(tick);
  };
  tick();
};
animateTo('[data-tiquiz-stat="quizzes"]', j.quizzes);
animateTo('[data-tiquiz-stat="leads"]', j.leads);
```

## API directe

Si tu veux fetch toi-même depuis ailleurs (n8n, Make, autre site…) :

```
GET https://app.tiquiz.com/api/public/stats
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
- `quizzes` = quiz avec `status = 'published'` uniquement
- `leads` = toutes les lignes de la table `quiz_leads`

## Test rapide

Avant de coller dans Systeme.io, teste l'endpoint en ouvrant
[https://app.tiquiz.com/api/public/stats](https://app.tiquiz.com/api/public/stats)
dans ton navigateur. Tu dois voir le JSON ci-dessus.
