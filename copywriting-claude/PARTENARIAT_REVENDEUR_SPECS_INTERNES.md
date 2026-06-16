# Partenariat revendeur Tiquiz — Specs internes (NE PAS partager)

> Document interne Béné. Le client ne voit QUE le `.docx` commercial.
> Ici on garde la structure de coût, les marges et les specs techniques.
> Concerne **uniquement Tiquiz**.

---

## 1. Modèle retenu

Revente en gros récurrente, **pas affiliation**. Le revendeur facture ses
clients au prix Tiquiz, gère tout (vente, support N1, relation client), et
me reverse une part dégressive selon son volume de comptes actifs.

### Grille (whole-volume, automatique, sans engagement)

| Comptes actifs | Part reversée à Tiquiz | Part revendeur |
|----------------|------------------------|----------------|
| 1 à 200        | 40 %                   | 60 %           |
| 201 à 1 000    | 35 %                   | 65 %           |
| 1 001 et plus  | 30 %                   | 70 %           |

- **Whole-volume** : le taux dépend du nombre **total** de comptes actifs et
  s'applique à **TOUS** les comptes (pas par tranche marginale). Dès qu'il
  franchit 200, l'intégralité passe à 35 %, etc. C'est ce qui rend le palier
  « visible dans son interface, sans démarche » réalisable.
- **% appliqué au prix RÉEL de chaque compte** (9 / 19 / 90 / 190), jamais à
  une moyenne. On a la donnée par compte → exactitude gratuite, zéro litige.
- **Pas de plancher d'engagement** (choix Béné) : contrepartie = pas de revenu
  mensuel garanti s'il stagne sous un seuil. Risque accepté vu le volume annoncé.

### Reversé à Tiquiz, par compte / mois

| Plan | 40 % | 35 % | 30 % |
|------|------|------|------|
| Light 9 €    | 3,60 € | 3,15 € | 2,70 € |
| Complet 19 € | 7,60 € | 6,65 € | 5,70 € |
| Light 90 €/an    | 36 € | 31,50 € | 27 € |
| Complet 190 €/an | 76 € | 66,50 € | 57 € |

---

## 2. Rentabilité — la vérité chiffrée

Coût variable = **uniquement les crédits IA** (infra déjà payée). Audit du code :

| Endpoint | Modèle | Coût/appel estimé | Volume |
|----------|--------|-------------------|--------|
| `quiz/generate` | Opus 4.8 ($5/$25) | ~0,11 € | élevé (gros poste) |
| `survey/analysis` | Opus 4.8 | ~0,05 € | rare (~1/mois) |
| `rewrite` / `idea-chat` / `embed` | Haiku 4.5 | ~0,003 € | négligeable |
| `rebalance` | Sonnet 4.6 | ~0,03 € | moyen |
| `generate-background` | gpt-image-1 (medium) | ~0,04 €/image | variable |

> ⚠️ Estimations à partir de la taille des prompts, **pas mesurées**. À fiabiliser (cf. §4).

**Logique de mutualisation** : la majorité des comptes touchent à peine à l'IA
→ coût IA **moyen poolé ≈ 0,50–1 €/compte**. Les gros générateurs sont une
minorité, absorbée par la masse.

**Marge nette estimée par compte (cut − coût moyen poolé) :**

| Plan / palier | Cut | Coût moyen | Marge nette |
|---------------|-----|-----------|-------------|
| Complet 40 % | 7,60 € | ~0,75 € | ~6,85 € |
| Complet 30 % | 5,70 € | ~0,75 € | ~4,95 € |
| Light 40 % | 3,60 € | ~0,75 € | ~2,85 € |
| Light 30 % | 2,70 € | ~0,75 € | ~1,95 € |

→ **Rentable sur tous les paliers et tous les plans.** Le seul point de
vigilance est le **gros générateur isolé sur le plan 9 €** : sans plafond il
peut coûter > 2,70 €. La mutualisation couvre la variance normale ; le plafond
fair-use (§3) couvre la queue (l'abuseur).

**Ordres de grandeur volume :**
- 200 comptes complets @ 40 % → ~1 520 €/mois bruts, marge ~1 370 €.
- 1 000 comptes @ 35 % → ~6 650 €/mois (complet), marge ~5 900 €.
- 2 000 comptes @ 30 % → ~11 400 €/mois (complet), marge ~9 900 €.

---

## 3. Plafond fair-use IA (à fixer, valeurs de départ)

Objectif : invisible en usage normal, ne mord que sur l'abus. À border AVANT
de scaler. Compteur mensuel par compte, **throttle** au-delà (pas blocage sec).

| Action IA | Quota/mois suggéré (light) | Quota/mois suggéré (complet) |
|-----------|---------------------------|------------------------------|
| Génération de quiz IA | 25 | 60 |
| Images (visual studio) | 20 | 40 |
| Analyse IA sondage | — (hors plan) | 15 |

> Chiffres à ajuster une fois la télémétrie réelle en place (§4). Un user normal
> est très en-dessous ; le quota n'existe que pour le 1 % qui tape 10×.

---

## 4. À shipper AVANT de passer à plusieurs milliers (non négociable)

Issu de ton `NOTES_TOKEN_OPTIMIZATION.md` :

1. **Logging coût/requête** (priorité n°1) : input/output tokens × prix par
   appel, par compte, par org. ~1–2 h de dev. Sans ça tu pilotes à l'aveugle.
2. **Prompt caching sur `quiz/generate`** : système ~3-4K tokens identiques →
   `cache_control: ephemeral` sur le dernier bloc system. -25 à -35 % de facture
   totale, zéro impact qualité. Vérifier qu'aucun timestamp/userId n'est
   interpolé dans le system (sinon cache jamais déclenché).
3. **Tester Sonnet 4.6 sur `quiz/generate`** (aujourd'hui Opus 4.8, alors que
   Tipote tourne en Sonnet sans perte). Var d'env `TIQUIZ_QUIZ_MODEL=claude-sonnet-4-6`,
   A/B 1 mois, proxy qualité = taux de regen IA. -40 % sur l'endpoint.

→ Ces 3 actions sécurisent le plan 9 € et divisent ~par 2 ton plus gros coût.

---

## 5. Interface admin revendeur — périmètre

Modèle multi-tenant : une **org revendeur** qui chapeaute des sous-comptes
(= comptes Tiquiz normaux, chacun connecte SON Systeme.io).

**Fonctions :**
- Créer un accès client (choix du plan : light / complet, mensuel / annuel).
- Suspendre / réactiver un accès (impacte la facturation du mois suivant).
- Lister les comptes : statut, plan, date de création, dernière activité.
- **Compteur live de comptes actifs** → affiche le palier courant + le taux
  appliqué (la transparence « il voit son taux baisser tout seul »).
- **Estimation de facture du mois en cours** : Σ (taux courant × prix réel) sur
  les comptes actifs.
- Compteur d'usage IA par compte (pour le fair-use).

**Backend :**
- `active_account` = provisionné ET non suspendu. Une requête `COUNT` sur l'org.
- **Logique palier** : `taux = f(nb_actifs_total)` whole-volume, recalculé à la
  facturation (pas figé à la création du compte).
- **Cron mensuel** : compte les actifs → applique le taux courant au prix réel
  de chaque compte → génère la facture B2B. Rien à déclarer côté revendeur.
- **Kill-switch** : suspension de l'org en cas d'impayé prolongé.
- **Metering IA** : incrément par génération, throttle au-delà du quota mensuel.

---

## 6. Garde-fous contractuels (contrat de partenariat)

- **Définition « compte actif »** noir sur blanc = provisionné & non suspendu.
- **Risque de concentration** : un client = potentiellement plusieurs milliers
  de comptes = dépendance forte. Prévoir préavis de résiliation, et clause pour
  ne pas être pris en otage s'il part.
- **Propriété & réversibilité des données** : comptes hébergés par Tiquiz ;
  définir transfert / fermeture à la fin du partenariat.
- **Paiement** : à réception, suspension possible des accès en cas d'impayé.
- **Non-exclusivité** sauf accord payé séparément.
- **Confidentialité du prix de gros** : offre interne, non publique.

---

## 7. Reste à décider avec Béné

- [ ] Valider les seuils 200 / 1000 et les taux 40 / 35 / 30.
- [ ] Fixer les quotas fair-use de départ (§3).
- [ ] Shipper le logging coût/requête + caching + test Sonnet (§4).
- [ ] Cadrer le contrat (§6) avant le lancement des 200 premiers comptes.
