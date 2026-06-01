# Roadmap rétention Tiquiz — audit 1er juin 2026

> Roadmap partagée Tipote ↔ Tiquiz issue de l'audit du 1er juin 2026.
> Document canonique complet : `tipote-app/ROADMAP_RETENTION.md`. Cette
> copie locale liste les phases qui touchent Tiquiz pour qu'un agent qui
> code sur Tiquiz ait le contexte sans dépendre du repo Tipote.

---

## Contraintes business validées Béné (1er juin 2026)

- **Lifetime 57€ TERMINÉ** depuis longtemps. Plans actifs : Free /
  Monthly 9€ / Yearly 90€. Lifetime existants grandfathérés à vie.
- **Nouveau pricing à venir** : 19€/mois et 190€/an pour les futurs
  users uniquement. Abonnés actuels grandfathérés (9€/90€).
- **Pas de CTA "upgrade Tipote" dans Tiquiz** : Systeme.io a bloqué le
  whitelabel Tipote, donc impossible de vendre Tipote depuis Tiquiz pour
  l'instant. Garder archi compatible mais ne rien exposer côté UI.
- **Affiliate géré côté Systeme.io** : aucune mécanique financière
  côté Tiquiz.

---

## Phases Tiquiz (numérotation alignée avec Tipote)

### Phase 0 — Fondations `business_events`

Table générique de log + helper unique `logBusinessEvent()` + service
notifications. Cf. roadmap Tipote section 0 pour détails.

Kinds applicables Tiquiz : `lead_captured`, `quiz_view`, `quiz_start`,
`quiz_complete`, `quiz_share`, `quiz_published`, `popquiz_published`,
`account_connected`, `account_disconnected`.

### Phase 1 — Milestones Tiquiz

Catalogue spécifique :
- Premier quiz publié
- 10e, 50e, 100e, 500e, 1000e lead
- 100e, 1000e vue
- Premier partage capturé
- Premier popquiz publié
- 1 mois ancienneté, 3 mois, 6 mois, 1 an

Engine identique Tipote (table `user_milestones`, trigger
`evaluate_milestones`). Toasts + emails partageables.

### Phase 2 — Wall of Wins Tiquiz

Carte dashboard "Ce mois avec Tiquiz" : vues, complétions, partages,
leads, top quiz, milestones, vs période précédente. Email récap mensuel
1er du mois 9h locale.

**RÈGLE CARDINALE Béné (1er juin 2026)** : si la période ne contient
AUCUN résultat (0 lead, 0 partage, 0 vue, etc.), on **N'AFFICHE PAS**
la carte. Un dashboard "0 partout" démotive. À la place, état neutre
"Pas encore de chiffres, voici comment démarrer →" avec 1 CTA action.

### Phase 3 — Réengagement Tiquiz

Inactivité > 7j / > 14j / > 30j + détection "quiz à 0 vue depuis 14j".
Templates adaptés (proposer un quiz template métier, ouvrir le brainstorm
IA, etc.).

### Phase 5 — Templates par métier — V1 FAIT (juin 2026)

8 templates de quiz métier soignés (écrits à la main, ton humain, pas
"trop IA" — exigence Béné) :
- profil-entrepreneur (coach business)
- moteur-interieur (coach de vie)
- style-yoga (prof de yoga)
- terrain-naturo (naturopathe)
- pret-a-lancer-formation (formateur en ligne)
- levier-croissance-marketing (consultant marketing)
- style-photo (photographe)
- pret-premier-achat-immo (immobilier)

Archi : **données statiques TS** (`lib/templates/catalog.ts` + `types.ts`),
PAS de table DB (versionné, facile à éditer, zéro migration). Chaque
template a un `payload` qui calque EXACTEMENT la shape POST /api/quiz.

Instanciation : le bouton "Utiliser ce modèle" POST le payload vers
`/api/quiz` EXISTANT → zéro code d'INSERT custom, zéro divergence,
aucun risque pour les quiz existants. Au succès → redirection éditeur.

Galerie publique SEO :
- `/templates` : grille + filtre par métier (indexable, OG tags)
- `/templates/[slug]` : aperçu complet (intro + questions + résultats)
  + CTA. generateStaticParams pour le pré-rendu SEO. metadata par
  template.
- Non connecté → CTA renvoie vers /signup (acquisition).
- Connecté → instancie + édite.
- Entrée discrète depuis `/quiz/new` (bandeau, ne touche pas au form).

**Reste à faire (V2)** :
- A/B testing natif des titres/questions (5.C) — non commencé.
- Flux post-signup : auto-instancier le template choisi après
  inscription (V1 = le visiteur revient choisir manuellement).
- Plus de templates (objectif 15+) si V1 convertit bien.
- i18n : templates FR uniquement V1.

### Phase 6 — Nouveau pricing 19€/190€ futurs users

Colonne `profiles.pricing_grandfathered_at`, backfill `now()` au moment
du switch, nouveaux Price IDs Stripe, `/pricing` conditionnel.

### Phase 8 — Port complet (après stabilisation Tipote) — FAIT (juin 2026)

Port réalisé. Périmètre adapté à Tiquiz (mono-user, pas de mailer,
pas de ventes créateur) :

- ✅ **Phase 0** : `business_events` + `user_milestones` (migration
  `20260604_business_events_foundation.sql`, sans project_id). Helper
  `lib/businessEvents.ts` + `lib/businessOutcomes.ts` (lit quiz_leads /
  quiz_events / quizzes historiques, pas business_events seul).
- ✅ **Phase 1** : milestones Tiquiz (`lib/milestones/`) — quiz publiés,
  leads (1/10/100/1000), complétions (1/100/1000), partages (1/100),
  popquiz. Toast in-app via `<MilestoneToastListener />` (PAS d'email
  — Tiquiz n'a pas de mailer). API `/api/milestones/unseen` + `/seen`.
  Cron `/api/cron/backfill-milestones` (one-shot, auth Bearer).
- ✅ **Phase 2** : Wall of Wins (`components/dashboard/WallOfWins.tsx` +
  `/api/dashboard/wall-of-wins`) — leads / vues / complétions / partages
  + top quiz + milestones. Conditionnel "motivant ou rien". Accent
  primary (turquoise Tiquiz).
- ❌ **Phase 3 réengagement** : SKIP. Pas de mailer Tiquiz, et un nudge
  in-app ne ramène pas un user absent. Réactivable si Tiquiz ajoute un
  mailer Resend un jour.
- ❌ **Phase 4 coach proactif** : hors scope Tiquiz (pas de coach IA).

Branchements events (fire-and-forget, non bloquants) :
- `lead_captured` → `app/api/quiz/[quizId]/public/route.ts` (après
  upsert quiz_leads, y compris sondages anonymes pour les stats)
- `quiz_complete` + `quiz_share` → `app/api/quiz/[quizId]/track/route.ts`
- `quiz_share` server-side → `public/route.ts` PATCH (post-capture)

⚠️ À run en prod : migration `20260604_business_events_foundation.sql`
puis cron backfill `/api/cron/backfill-milestones`.

---

## Ordre d'exécution

Tipote en lead. On porte sur Tiquiz une fois chaque phase Tipote validée
en prod. Phase 5 (templates) et Phase 6 (pricing) peuvent être attaquées
directement sur Tiquiz, sans attendre Tipote — elles n'ont pas
d'équivalent côté Tipote.

Cf. `tipote-app/ROADMAP_RETENTION.md` pour le contexte complet.
