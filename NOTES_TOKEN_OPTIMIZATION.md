# Notes — Optimisation tokens Claude (Tiquiz)

> Notes prises le 1er juin 2026. Document canonique complet :
> `tipote-app/NOTES_TOKEN_OPTIMIZATION.md`. Cette copie locale reprend
> les points qui touchent Tiquiz pour qu'un agent qui code sur Tiquiz
> ait le contexte sans dépendre du repo Tipote.
>
> ⚠️ **À ARBITRER ENSEMBLE** avant tout changement — recommandations
> + audit, pas instructions.

---

## Audit modèles Tiquiz

| Endpoint                                  | Modèle    | Volume | Status            |
|-------------------------------------------|-----------|--------|-------------------|
| `quiz/generate` (génération quiz IA)      | Opus 4.8  | élevé  | ⚠️ **À discuter** |
| `survey/analysis` (analyse IA sondage)    | Opus 4.8  | rare   | ✅ usage premium   |
| `rewrite`, `chat`, `embed`                | Haiku 4.5 | élevé  | ✅ optimal         |
| `rebalance`                               | Sonnet 4.6 | moyen | ✅ optimal         |

**Le point d'interrogation** : `quiz/generate` Tiquiz est sur Opus 4.8
alors que la même feature côté Tipote tourne en Sonnet 4.6 et donne
visiblement satisfaction. Volume Tiquiz potentiellement plus élevé
(plan free permet déjà un quiz IA).

**Test possible** : A/B Sonnet 4.6 vs Opus 4.8 sur `quiz/generate`
Tiquiz pendant 1 mois → si qualité jugée identique par Béné, switch
Sonnet → ~40 % d'économie sur cet endpoint.

---

## Top 3 actions Tiquiz (par impact)

### 1. Prompt caching sur `quiz/generate` (gisement n°1)

System prompt de génération de quiz = ~3-4K tokens identiques entre
tous les users → ajouter `cache_control: {type: "ephemeral"}` sur le
dernier bloc system → **~85 % de réduction** sur les tokens system.

Impact estimé : -25 % à -35 % sur la facture Claude Tiquiz totale,
zéro impact qualité.

⚠️ Vérifier qu'aucun timestamp / userId / date n'est interpolé dans
le system prompt — sinon le cache ne se déclenche jamais.

### 2. Tester Sonnet 4.6 sur `quiz/generate` (le gros pari)

Si Béné juge la qualité identique :
- Sonnet 4.6 : $3 input / $15 output par 1M tokens
- Opus 4.8 : $5 input / $25 output par 1M tokens
- Économie : **~40 %** sur cet endpoint à fort volume

Implémentation : variable d'env `TIQUIZ_QUIZ_MODEL=claude-sonnet-4-6`
puis A/B test pendant 1 mois en mesurant le taux de "le user lance
une regen IA" (= proxy de satisfaction).

### 3. Activer adaptive thinking sur `survey/analysis`

Aujourd'hui : pas de thinking → l'analyse est faite "à la volée" sans
réflexion préalable. Pour une analyse de stats, c'est sous-optimal.

Activer `thinking: {type: "adaptive"}` → Claude décide quand réfléchir
en fonction de la complexité des résultats. Coût additionnel modéré
(feature rare, ~1 / user / mois). Gain qualité significatif.

---

## Pièges à éviter

- ❌ Hardcoder `temperature` sur un appel Opus 4.7+ → 400 (cf. fix du
  1er juin 2026, utiliser `buildClaudeMessageBody`)
- ❌ Interpoler timestamp/userId dans system prompt (casse le caching)
- ❌ Changer l'ordre des tools entre 2 requêtes (casse le caching)

---

## Document canonique

Pour le détail complet (incluant Tipote et les stratégies générales
Anthropic), voir `tipote-app/NOTES_TOKEN_OPTIMIZATION.md`.
