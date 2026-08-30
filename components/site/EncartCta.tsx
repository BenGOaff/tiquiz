// components/site/EncartCta.tsx
//
// L'INVITATION DE FIN D'ARTICLE, ET CELLE DU RAIL.
//
// Béné, 30 août 2026 : "les encarts bleu sont moches j'en veux pas en
// plus ils rendent le texte illisible c'est ni moderne ni les couleurs
// de tiquiz, ni UX UI friendly. Un bouton texte bleu sur couleur bleu
// c'est carrément de la merde."
//
// -- ELLE A RAISON, ET C'ÉTAIT MESURABLE ------------------------------
//
// L'encart de fin d'article était un aplat `--tq-marine` avec un bouton
// `--tq-bleu` dedans. Et le bouton portait le bleu foncé du texte des
// articles, parce que `.tq-site .tiquiz-blog a` (spécificité 0,3,0) bat
// `.tq-bouton` (0,1,0) : le libellé sortait donc en **#0B3FA8 sur fond
// #1D6BF0**, soit un contraste de **1,93:1** quand le minimum lisible
// est 4,5:1. Ce n'était pas une question de goût.
//
// -- LA RÉPONSE : DU BLANC, ET UN SEUL ACCENT -------------------------
//
// Le fond de l'encart est le crème du site, sa bordure est celle des
// cartes, et la couleur de marque ne sert plus qu'à DEUX choses : le
// filet horizontal du haut et le bouton. Le texte reste à l'encre du
// site, donc lisible par construction. C'est le même geste que les
// quatre temps de la page de résultat (3 août) : le rythme se voit, un
// seul élément appelle l'oeil, et rien ne prend de place à gauche.
//
// Le bouton porte `tq-bouton-plein`, qui force `color: #fff` avec la
// même spécificité que la règle des liens d'article. Une classe utile
// vaut mieux qu'un `!important` : le prochain encart posé ailleurs
// l'utilisera sans avoir à connaître l'histoire.

import Link from "next/link";

export default function EncartCta({
  compact = false,
}: {
  /** La version du rail : plus courte, sans le second lien. */
  compact?: boolean;
}) {
  return (
    <aside
      className={
        compact
          ? "rounded-2xl border border-[var(--tq-bord)] bg-white p-5"
          : "mt-16 rounded-3xl border border-[var(--tq-bord)] bg-white p-7 sm:p-9"
      }
    >
      {/* Le filet HORIZONTAL, jamais vertical : une décoration à gauche
          déplace ce qu'elle décore, et les bords ne s'alignent plus
          (règle du 3 août). */}
      <span
        aria-hidden="true"
        className="block h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]"
      />
      <h2 className={compact ? "mt-4 text-[1.05rem] leading-snug" : "mt-5 max-w-[24ch] text-[1.5rem]"}>
        Un quiz qui tague tes leads dans Systeme.io
      </h2>
      <p
        className={
          compact
            ? "tq-doux mt-2 text-[0.9rem] leading-relaxed"
            : "tq-doux mt-3 max-w-[54ch] leading-relaxed"
        }
      >
        Tiquiz écrit le quiz, pose un tag par profil et te rend des leads déjà triés. Plan gratuit
        pour tester, sans carte bancaire.
      </p>
      <div className={compact ? "mt-4" : "mt-6 flex flex-wrap gap-3"}>
        <Link href="/signup" className="tq-bouton tq-bouton-plein no-underline">
          Créer mon quiz gratuitement
        </Link>
        {compact ? null : (
          <Link href="/" className="tq-bouton tq-bouton-fantome no-underline">
            Voir ce que fait Tiquiz
          </Link>
        )}
      </div>
    </aside>
  );
}
