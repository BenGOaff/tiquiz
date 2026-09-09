// components/site/LiensArticle.tsx
//
// LES LIENS D'UNE PERSONNE CITEE DANS UN ARTICLE (Bene, 8 septembre).
//
// "Les liens qui te manquaient", envoyes dans un bloc HTML a elle : une
// grille de quatre cartes, un degrade pale, un emoji, un libelle et une
// precision dessous.
//
// -- POURQUOI CE N'EST PAS SON HTML, POSE TEL QUEL --------------------
//
// `nettoyerBloc` (lib/blog/rendu.ts) retire TOUS les attributs sauf le
// `href` d'un lien. Son `style=` ne survit donc pas, et c'est la regle
// depuis l'import du 29 aout : une classe ou un style importes
// imposeraient l'apparence de Systeme.io au milieu d'une page qui a la
// notre. Colle tel quel, son bloc rendrait quatre liens nus les uns
// derriere les autres.
//
// Le bloc porte donc la DONNEE, et c'est ce fichier qui la dessine.
//
// -- CE QUI EST REPRIS D'ELLE, ET CE QUI EST TRADUIT ------------------
//
// Repris : la grille de cartes, le rayon genereux, le fond pale et la
// hierarchie emoji / libelle / precision.
//
// -- POURQUOI UNE GRILLE 2x2, ET PAS SON `flex: 1 1 200px` -----------
//
// MESURE dans un navigateur avant de trancher. Son reglage donne, dans
// la colonne de 720 px d'un article, des boites de 229 / 229 / 229 /
// **720** : trois cartes tiennent sur la premiere ligne, la quatrieme
// passe seule a la ligne et s'ETIRE sur toute la largeur. Ce n'est pas
// la grille qu'elle a dessinee, c'est un 3 + 1 desequilibre.
//
// La cause n'est pas son CSS : 4 x 200 px plus trois gouttieres font
// 848 px, et notre colonne de lecture en fait 720 (bornee le 30 aout
// pour que la ligne reste lisible). Son bloc vivait dans un conteneur
// plus large.
//
// Une grille 2 x 2 tient dans 720 px avec des cartes de 352 px, donc
// sans etirement et sans troncature du libelle. Sur un telephone elle
// passe a UNE colonne (mesure a 390 px : 350 px de large, aucun
// debordement).
//
// Traduit en jetons : ses trois hexadecimaux. `#5A6EF6` EST deja
// `--tq-bleu` (la palette du site a ete calee sur sa page de vente le
// 4 septembre) ; son fond pale devient `--tq-panneau` et son encre
// `--tq-encre`. Un hexadecimal pale ecrit en dur resterait pale le jour
// ou la palette bouge, avec du texte fonce devenu illisible dessus.
//
// -- L'EMOJI EST DECORATIF ---------------------------------------------
//
// Il DOUBLE le libelle juste a cote ("Le livre", "Le blog") : un
// lecteur d'ecran qui l'annonce fait perdre du temps sans rien
// apprendre. `aria-hidden` le retire de la lecture, pas de l'ecran.
//
// -- ET LA CARTE PORTE UNE CLASSE, PAS UN `no-underline` --------------
//
// Mesure avant d'ecrire le composant : `.tiquiz-blog a` pose
// `text-decoration: underline` avec une specificite de 0,1,1, et un
// `no-underline` de Tailwind pese 0,1,0. Il PERD : les quatre cartes
// sortaient soulignees. `tq-carte-lien` (globals.css) monte la
// specificite, exactement comme `tq-bouton-plein` l'a fait pour le
// bouton bleu sur bleu du 30 aout.
//
// -- LE LIEN EST SORTANT, DONC IL S'OUVRE AILLEURS --------------------
//
// Regle du 24 aout : un visiteur au milieu d'un article qui clique une
// source part et ne revient pas. `noopener` est obligatoire, sinon la
// page ouverte garde une poignee sur la notre.

import type { BlocLiens } from "@/lib/blog/articles";

export default function LiensArticle({ liens }: { liens: BlocLiens["liens"] }) {
  if (liens.length === 0) return null;
  return (
    <div className="my-10 grid gap-4 sm:grid-cols-2">
      {liens.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="tq-carte-lien flex min-w-0 flex-col gap-1 rounded-[22px] border border-[var(--tq-bord)] bg-[var(--tq-panneau)] px-5 py-4 transition hover:border-[var(--tq-bleu)]"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            {l.emoji}
          </span>
          <span className="font-bold text-[var(--tq-encre)]">{l.libelle}</span>
          <span className="truncate text-sm text-[var(--tq-bleu)]">{l.sous}</span>
        </a>
      ))}
    </div>
  );
}
