# L'Atelier du Quiz - Vision V2 "banger" et roadmap (source de vérité)

> Ce fichier est LA référence des intentions Béné pour faire de L'Atelier du Quiz
> un produit qui révolutionne l'apprentissage et garantit des résultats
> concrets. À relire au début de toute session qui touche au produit.
> (Validé par Béné, conversation de juin 2026.)

## Étoile polaire (la vraie ligne d'arrivée)

Pas "j'ai publié mon quiz". Pas même "j'ai mes premiers leads".
La ligne d'arrivée, c'est :

> **Mon quiz est devenu viral, je rentre des dizaines de leads qualifiés
> qui achètent mes offres / mes services / mes formations / mes offres
> d'affiliation.**

Tout le produit doit pousser vers : viralité du quiz -> leads qualifiés ->
ventes. On ne s'arrête jamais à la publication.

## Principes non négociables

- **Résultats concrets avant tout.** Zéro feature "jolie mais inutile".
  Pas de points/XP vides, pas de classements, pas de badges décoratifs,
  pas de streaks culpabilisants, pas d'avatars gadgets.
- **Effort minimal pour l'étudiant.** Plus il tape, moins il finit. On
  fait à sa place le maximum (à partir de SES données : carnet + persona
  + chiffres Tiquiz).
- **On agit sur le réel.** Tout se passe sur SON vrai quiz, ses vrais
  chiffres, son vrai funnel. Pas d'exercices jouets.
- **Simple à mettre en oeuvre pour lui, puissant dans l'effet.** (ADN Béné.)
- **Français impeccable** : accents partout dans le user-visible, JAMAIS
  de tiret long (em-dash / en-dash). Cf. AGENTS.md.

## Les 5 chantiers validés (V2)

### A. Coach proactif piloté par les vraies données Tiquiz
Le coach surveille le funnel réel (connexion Tiquiz déjà en place) et
alerte de lui-même avec UNE action concrète. Ex : "60 vues, 3 leads ->
ta capture est sûrement après le résultat, déplace-la avant."
- EXIGENCE BÉNÉ : **super fiable**. Ne PAS assommer de chiffres inutiles.
  On ne montre qu'un insight quand il est sûr ET actionnable. Chaque
  insight = une action claire. Si pas sûr, on se tait.

### B. Le funnel "done-for-you" (la partie où tout le monde se plante)
Tiquiz écrit le quiz. L'Atelier du Quiz écrit TOUT l'autour, à partir du carnet +
persona : séquence de bienvenue, un email par profil de résultat (bucket),
séquence de vente douce, + kit de lancement (posts, script DM, email
d'échange partenaire).
- EXIGENCE BÉNÉ : produire des **campagnes emails prêtes à importer dans
  Systeme.io**, à personnaliser (branding, etc.). (Vérifier le format
  d'import SIO ; à défaut, copier-coller propre + export téléchargeable.)
- Effort élève : copier-coller / importer puis personnaliser.

### C. Quiz Doctor (audit + simulation avant publication)
Avant publication, on simule un visiteur et on flague les fuites, + une
checklist : images, nombre de questions, cohérence des bonus proposés,
placement de la capture, qualité/nombre des résultats, image de partage.
Préventif (avant) et possible aussi après publication.

### D. La formation qui s'auto-améliore (moteur de feedback)
- Relancer par email les étudiants qui ne se connectent pas / n'avancent
  pas.
- **Collecter leurs retours** : pourquoi ils sont bloqués.
- Faire remonter ces blocages (dashboard admin) pour **auto-corriger le
  process ou le contenu** et améliorer le programme en continu, cohorte
  après cohorte.

### E. Le moteur de mise en avant (case studies automatiques)
Validé à fond (réf. réussite Jocelyne : https://www.tipote.fr/tiquiz/cas-client-jocelyne-tdah).
Quand un élève atteint un cap réel (quiz publié, X leads, 1re vente
détectée via métriques), le système **rédige le brouillon de son étude de
cas** ET notifie Béné ("candidat parfait pour une mise en avant"). Béné
valide, ça se publie. Preuve sociale en chaîne pour L'Atelier du Quiz ET Tiquiz.
Flywheel : résultats -> preuve -> nouveaux élèves/users Tiquiz -> résultats.

## Ce qu'on NE fait PAS
Points/XP, classements compétitifs, streaks, avatars gadgets, badges
décoratifs sans accomplissement réel, chiffres pour faire joli.

## Infra déjà en place (ne pas réinventer)
- Carnet : réponses de l'élève par jour (lib/carnet, table answers).
- Persona + profil business (onboarding) : lib/businessProfile, lib/personas.
- Coach IA : Anthropic via /api/coach, lib/claudeRequest, lib/anthropicModel,
  base de connaissance coach_knowledge (frameworks persuasion / Ask /
  objectifs / growth déjà seedés).
- Connexion Tiquiz (OAuth-léger) : métriques réelles (leads, vues,
  complétions, partages) via /api/integrations/tiquiz + API partenaire
  côté Tiquiz (/api/partner/*). Auto-connexion par email.
- Emails : Resend (lib/email) déjà câblé (accès, reset).
- Gamification honnête : badges sur jalons réels (lib/gamification).
- Personnalisation contenu : glossaire {offre}/{client}/{audience}/
  {expertise} + encarts "Pour toi" par persona + "pépite" par jour.

## Ordre de mise en oeuvre (proposé, ajustable)
Pas d'étudiants encore : on peut tout construire sans déranger personne.
1. **B - funnel done-for-you** (flagship valeur, infra dispo : carnet +
   persona + Anthropic). Inclut export Systeme.io.
2. **A - coach proactif data** (capitalise sur la connexion Tiquiz).
3. **D - feedback + relances + auto-amélioration** (moteur de complétion).
4. **E - moteur de mise en avant** (flywheel preuve sociale).
5. **C - Quiz Doctor** (nécessite un endpoint Tiquiz exposant la structure
   du quiz ; à faire en dernier car dépend d'un ajout côté Tiquiz).

## Statut (à tenir à jour)
- [x] B funnel done-for-you (page "Campagne" : génère séquences email +
      kit de lancement depuis le carnet/persona, copier-coller + export .md ;
      table funnel_assets, /api/me/funnel, lib/generate/funnel).
- [x] B+ Import Systeme.io en 1 clic via URL de partage : l'admin gère des
      modèles SIO (table sio_templates, /admin/modeles), l'élève les importe
      depuis la page Campagne (boutons "Importer"). Béné crée le modèle dans
      SIO, colle l'URL de partage.
- [x] A coach proactif data : moteur d'insights fiable
      (lib/insights/tiquizInsights, seuils de confiance, 1 constat = 1
      action, max 2). Affiché sur Avancées (TiquizInsights) + injecté dans
      le prompt du coach (il conseille à partir des vrais chiffres). On se
      tait si volume insuffisant ou pas de fuite claire.
- [x] D feedback + relances + auto-amélioration :
      - Récap hebdo DOUX le lundi (cron /api/cron/weekly-recap, auth
        CRON_SECRET, idempotent via digest_log). Uniquement aux élèves
        dont le parcours n'est pas fini. Pas de spam.
      - Collecte des blocages : bouton "Un blocage ?" sur chaque jour
        (BlockerButton -> /api/me/feedback, table feedback).
      - Dashboard admin /admin/feedback : décrochage par jour + ce que
        les élèves disent, pour corriger le contenu en continu.
      - CRON à brancher côté serveur : lundi matin, cf. notes de déploiement.
- [x] E moteur de mise en avant : détection des caps (paliers de leads
      via Tiquiz), génération auto du brouillon d'étude de cas (à valider,
      citations à confirmer), alerte email admin, dashboard /admin/spotlights
      (relire, copier, marquer publié/écarté). Cron /api/cron/spotlights
      (resync metrics + détection + digest admin). Tables : spotlights.
- [x] C Quiz Doctor : audit de la structure du quiz (capture activée,
      nombre de questions, nombre de résultats, images OG + résultats,
      personnalisation, cohérence du bonus de partage). Endpoint Tiquiz
      /api/partner/quiz-audit (lecture seule via token) + lib/quizDoctor
      (règles) + /api/me/quiz-audit + composant QuizDoctor sur Avancées.
      TOUS LES 5 CHANTIERS V2 SONT LIVRÉS.
- [ ] (ancien) C Quiz Doctor (dépend d'un endpoint Tiquiz exposant la structure du
      quiz : audit pré-publication images / nombre de questions / cohérence
      bonus / placement capture)
