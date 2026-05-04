# INVARIANTS — anti-régression (Tiquiz)

Ces invariants documentent des décisions structurelles qui ont déjà été
cassées au moins une fois en production. Avant de toucher l'un de ces
endroits, lis l'invariant et vérifie que ta modif le respecte. Chaque
invariant pointe vers le code via `path:line` et garde l'historique du
bug d'origine pour qu'on n'ait pas à le redécouvrir.

> Convention : si tu changes un invariant volontairement, mets à jour
> ce fichier et le commentaire inline. Si tu casses un invariant par
> accident, on rouvre le ticket post-mortem correspondant.

---

## I-1 — Les leads ne doivent JAMAIS disparaître

**Source** :
- `supabase/migrations/030_quiz_leads_result_set_null.sql` (FK ON DELETE SET NULL)
- `app/api/quiz/[quizId]/route.ts` PATCH (snapshot du `result_title` avant DELETE des résultats orphelins)

**Règle** : trois couches indépendantes garantissent qu'un lead ne soit
jamais perdu lors d'un re-shuffle des résultats :

1. FK `quiz_leads.result_id` ON DELETE SET NULL (couche DB).
2. Backfill du `result_title` dans la ligne lead avant DELETE des
   résultats (couche application).
3. Explicit NULL-out de `lead.result_id` avant DELETE (couche défense).

Si tu modifies le PATCH du quiz, vérifie que les trois couches sont
toujours en place. Si tu changes le schéma de `quiz_leads`, vérifie la
FK avant de pousser la migration.

---

## I-2 — La typographie française est appliquée à la fois côté save et côté render

**Source** :
- `lib/frenchTypography.ts` (transformation pure, idempotente)
- `app/api/quiz/[quizId]/route.ts` PATCH — pass on save (FR_TYPO_PLAIN_FIELDS)
- `app/api/quiz/[quizId]/public/route.ts` GET — pass on render

**Règle** : le NBSP avant `: ; ! ? »` est appliqué deux fois pour
couvrir données nouvelles ET legacy. La fonction est idempotente, donc
double-application = pas de problème.

Si tu ajoutes un nouveau champ texte qui doit recevoir la typo FR :
- inscris-le dans `FR_TYPO_PLAIN_FIELDS` (route PATCH)
- inscris-le dans le mapping `FR_KEYS` (route public GET)

---

## I-3 — Un popquiz publié rend ses quiz référencés jouables

**Source** : `app/api/popquiz/[popquizId]/route.ts` PATCH (bloc auto-active).

**Règle** : à la PATCH d'un popquiz avec `is_published=true`, on
auto-active toutes les quiz référencées par ses cues qui sont encore
en draft. Le créateur n'a pas à publier chaque quiz manuellement.

**Pourquoi cet invariant** : Gwenn a remonté « le quiz ne s'ouvre pas »
en lançant un popquiz publié. Cause : la page `/q/[id]` filtre
`status=active`, donc l'iframe overlay affichait 404 sur les quiz
restés en brouillon. La correction garantit qu'un popquiz publié est
toujours pleinement jouable de bout en bout.

**Garde-fou inline** : commentaire explicite dans le bloc
`if (update.is_published === true)`. Si tu modifies le flow
publication, vérifie que cet auto-active est préservé.

---

## I-4 — Le lockfile reflète toujours package.json

**Source** : `package.json` ↔ `package-lock.json`.

**Règle** : si tu ajoutes une dépendance dans `package.json`, tu
**dois** committer un `package-lock.json` régénéré (`npm install`)
qui contient cette dep et toutes ses transitives. Les commits qui
ajoutent une dep sans mettre à jour le lock font crasher `npm ci` en
prod.

**Pourquoi cet invariant** : `tus-js-client` a été ajouté dans
`package.json` sans entrée dans `package-lock.json` à plusieurs
reprises (commits c1dd1c4, e5c99b6, et c251e09 qui a même retiré
les entrées d'un précédent `npm install`). Trois rounds de
debugging avant de stabiliser.

**Vérification rapide avant push** :
```sh
diff <(jq -r '.dependencies | keys[]' package.json | sort) \
     <(jq -r '.packages[""].dependencies | keys[]' package-lock.json | sort)
```
Doit ne rien retourner.

---

## I-5 — Un cue de popquiz pointe toujours sur un quiz que possède le créateur

**Source** : `app/api/popquiz/[popquizId]/route.ts` PATCH (vérif `ownedQuizzes`).

**Règle** : avant d'insérer des cues, l'API vérifie que tous les
`quiz_id` référencés appartiennent au user authentifié. Les ID
absents font 400 « Quiz introuvable ou non possédé ».

**Pourquoi cet invariant** : sans cette garde, un user pourrait
embarquer le quiz d'un autre user dans son popquiz, exposant les
résultats / leads de cet autre user via la viewing page.

---

## Comment ajouter un nouvel invariant ici

1. Identifie une zone dont la régression couterait à un user (UX cassée,
   data perdue, contrat produit non tenu, faille sécu).
2. Écris la règle en une phrase impérative.
3. Pointe vers le code : `path:line`.
4. Donne un mini post-mortem du bug original (commit, date, user impacté).
5. Décris le garde-fou inline et le test si applicable.

L'idée n'est pas d'avoir une exhaustivité mais de protéger les zones les
plus fragiles avec une mémoire d'équipe documentée.
