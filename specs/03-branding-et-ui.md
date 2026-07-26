# L'Atelier du Quiz : branding et UI (répliquer les codes de Tiquiz)

> L'interface L'Atelier du Quiz doit reprendre les codes visuels de Tiquiz (couleurs, typographie, composants, mise en page) en version L'Atelier du Quiz. Même famille visuelle, identité propre.
>
> Source de vérité : le repo Tiquiz (`tailwind.config.ts`, `app/globals.css`, `components/`, `components.json`). Les valeurs ci-dessous en sont extraites, à confirmer dans le repo avant de coder.

---

## Principe

L'Atelier du Quiz est le petit frère de Tiquiz. Un élève qui connaît Tiquiz doit se sentir chez lui. On reprend le même système de design (shadcn/ui + Tailwind + variables CSS HSL + police Inter), on l'habille aux couleurs L'Atelier du Quiz, et on garde la même qualité de finition SaaS.

Concrètement : copier la structure du design system de Tiquiz dans le nouveau projet (le même `tailwind.config.ts`, le même fichier de variables CSS, les mêmes composants de base shadcn/ui), puis ajuster le nom, le logo et, si Béné le souhaite, une couleur d'accent L'Atelier du Quiz.

---

## Système de design Tiquiz (à répliquer)

- **Framework UI** : shadcn/ui (Radix) + Tailwind + `tailwindcss-animate`. Voir `components.json` du repo Tiquiz.
- **Police** : Inter (sans et display). `system-ui` en repli.
- **Mode sombre** : supporté via la classe `.dark` (jeu de variables dédié, déjà présent dans Tiquiz).
- **Rayon de bordure** : `--radius: 0.75rem` (cartes en `lg`, pilules et CTA en `full`, héros en `2xl`).
- **Ombres** : `shadow-soft`, `shadow-card`, `shadow-card-hover` (qualité SaaS, voir variables).
- **Animations** : `quiz-step-in` (les questions montent et apparaissent en douceur), `shimmer` pour les skeletons. À réutiliser pour le flux de quiz L'Atelier du Quiz, ça donne le même feeling guidé.

## Palette (mode clair, valeurs HSL extraites de Tiquiz)

- background : `0 0% 100%` (blanc, fond de page)
- foreground (texte) : `231 41% 31%` (bleu encre, #2E386E)
- primary : `233 64% 61%` (indigo, #5D6CDB) sur texte blanc
- card / surface : `225 33% 97%` (gris-bleu très clair, #F4F5FA)
- secondary / muted : `220 33% 96%`
- accent : `236 79% 96%`
- border : `220 13% 92%`
- ring (focus) : `233 64% 61%`
- surface-soft : `233 64% 96%`

Mode sombre : reprendre le jeu de variables `.dark` de Tiquiz (fond `230 50% 12%`, primary `233 64% 65%`, etc.).

## Composants de base à réutiliser

Les mêmes que Tiquiz (Card, Button, Input, Badge, Skeleton, EmptyState, SectionCard, StatCard, etc.). Réutiliser les conventions : cartes en `rounded-lg` avec `shadow-card`, CTA en pilule, surfaces gris-bleu pour les blocs.

## Identité propre L'Atelier du Quiz

- **Nom** : L'Atelier du Quiz. Logo à fournir par Béné (même esprit que le logo Tiquiz).
- **Couleur d'accent** : par défaut on garde l'indigo Tiquiz pour la cohérence de marque. Si Béné veut différencier L'Atelier du Quiz, prévoir une seule variable de couleur d'accent à changer (ne pas disperser les couleurs en dur dans le code).
- **Images quiz / visiteur** : si on affiche des images, suivre la règle Tiquiz (`w-full h-auto`, jamais `max-h-* object-cover`).

## Mise en page

- Layout SaaS épuré : sidebar ou header de navigation, contenu centré, conteneur `max` à 1400px comme Tiquiz.
- Mobile d'abord : la majorité des élèves consulteront sur mobile. Tout doit être impeccable sur téléphone (vidéo, quiz, bulle coach).
- Le flux de quiz L'Atelier du Quiz reprend l'animation `quiz-step-in` de Tiquiz pour l'effet guidé question par question.

## Typographie française

Reprendre la règle Tiquiz : espace insécable avant `: ; ! ? »`. Et la règle absolue de Béné : zéro tiret long dans tout contenu user-visible.

---

## À faire côté agent

1. Copier le `tailwind.config.ts` et le fichier de variables CSS de Tiquiz dans le projet L'Atelier du Quiz.
2. Installer le même socle shadcn/ui (voir `components.json` de Tiquiz).
3. Brancher la police Inter.
4. Centraliser la couleur d'accent dans une seule variable, pour pouvoir différencier L'Atelier du Quiz facilement si besoin.
5. Vérifier le rendu mobile et le mode sombre.

Confirmer chaque valeur dans le repo Tiquiz avant de coder, ces tokens peuvent évoluer.
