// components/landing/cssQuizHero.ts
//
// LA FEUILLE DU QUIZ DU HAUT DE PAGE.
//
// Elle vit à part, comme `cssIles.ts`, et pour la même raison : deux
// feuilles du site l'interpolent aujourd'hui (la landing), et une règle
// écrite dans une seule laisserait l'autre servir un bloc coupé. C'est
// exactement ce qui est arrivé aux îles animées le 7 septembre.
//
// -- LES TROIS CONTRAINTES QU'ELLE A ÉCRITES, ET ELLES SONT DANS LE CSS
//
// Béné, 9 septembre 2026 :
//   "Le quiz du hero doit tenir AU-DESSUS DE LA LIGNE DE FLOTTAISON sur
//    un écran de 1440x800 : pas de scroll pour voir la première
//    question et ses options."
//   "Le hero est CENTRÉ, une seule colonne."
//   "Les options du quiz sont sur DEUX COLONNES au-dessus de 660 px,
//    une seule en dessous."
//
// La hauteur se gagne sur les marges internes, jamais sur la taille du
// texte d'une option : un quiz qu'on lit à la loupe ne se passe pas.
//
// -- ET LE MOUVEMENT SE COUPE, PARTOUT ---------------------------------
//
// `prefers-reduced-motion` retire les transitions et l'apparition. Le
// contenu reste ENTIER : c'est la règle du 6 septembre, un bloc qui ne
// s'anime pas doit rester lisible, jamais rester blanc.

export const CSS_QUIZ_HERO = `
/* La carte du quiz. Une seule colonne, centrée, comme sa maquette. */
.tqh{max-width:760px;margin:0 auto;width:100%;background:#fff;
  border:1px solid var(--tq-bord);border-radius:18px;
  box-shadow:0 18px 44px rgba(43,50,100,.10);overflow:hidden;text-align:left}

/* La barre du haut : les trois points, le titre, la mention. */
.tqh-bar{display:flex;align-items:center;gap:10px;padding:11px 16px;
  border-bottom:1px solid var(--tq-bord);background:var(--tq-panneau)}
.tqh-pt{width:9px;height:9px;border-radius:50%;background:#CBD3E6;flex:0 0 auto}
.tqh-bar b{font-size:.86rem;font-weight:700;color:var(--tq-encre);
  margin-inline-start:6px;line-height:1.2}
.tqh-live{margin-inline-start:auto;font-size:.72rem;font-weight:700;
  color:var(--tq-bleu);white-space:nowrap}

.tqh-corps{padding:14px 20px 18px}

/* La jauge et le compteur. */
.tqh-tete{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.tqh-jauge{flex:1;height:6px;border-radius:999px;background:var(--tq-panneau);overflow:hidden}
.tqh-jauge i{display:block;height:100%;border-radius:999px;background:var(--tq-bleu);
  transition:width .35s ease}
.tqh-cpt{font-size:.76rem;font-weight:700;color:var(--tq-encre-douce);
  white-space:nowrap;font-variant-numeric:tabular-nums}

.tqh-num{font-size:.74rem;font-weight:700;letter-spacing:.02em;text-transform:uppercase;
  color:var(--tq-bleu);margin:0 0 6px}
.tqh-q{font-size:1.18rem;font-weight:800;line-height:1.3;color:var(--tq-encre);margin:0 0 10px}

/* LES OPTIONS : deux colonnes au dessus de 660 px, une seule en dessous. */
.tqh-opts{display:grid;grid-template-columns:1fr;gap:9px;align-items:start}
@media (min-width:660px){.tqh-opts{grid-template-columns:1fr 1fr}}

.tqh-opt{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;
  padding:12px 14px;border:1px solid var(--tq-bord);border-radius:12px;
  background:#fff;color:var(--tq-encre-douce);
  font:inherit;font-size:.92rem;line-height:1.35;cursor:pointer;
  transition:border-color .16s ease,background .16s ease,transform .16s ease}
.tqh-opt i{flex:0 0 auto;width:16px;height:16px;margin-top:2px;border-radius:50%;
  border:2px solid #CBD3E6;transition:border-color .16s ease,box-shadow .16s ease}
.tqh-opt:hover{border-color:var(--tq-bleu);background:var(--tq-creme);transform:translateY(-1px)}
.tqh-opt:hover i{border-color:var(--tq-bleu);box-shadow:inset 0 0 0 3px #fff}
.tqh-opt:focus-visible{outline:2px solid var(--tq-bleu);outline-offset:2px}

/* L'écran de résultat. */
.tqh-res{display:grid;gap:16px}
@media (min-width:760px){.tqh-res{grid-template-columns:1fr 1fr;align-items:start}}
.tqh-eti{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.04em;
  text-transform:uppercase;color:var(--tq-bleu);margin-bottom:4px}
.tqh-res h3{font-size:1.32rem;font-weight:800;color:var(--tq-encre);margin:0 0 8px;line-height:1.2}
.tqh-res p{font-size:.92rem;line-height:1.55;color:var(--tq-encre-douce);margin:0}
.tqh-cta{display:grid;gap:10px;justify-items:stretch}
.tqh-idee{border:1px solid var(--tq-bord);border-radius:12px;padding:11px 13px;
  background:var(--tq-creme)}
.tqh-idee span{display:block;font-size:.7rem;font-weight:800;letter-spacing:.03em;
  text-transform:uppercase;color:var(--tq-bleu);margin-bottom:3px}
.tqh-idee b{display:block;font-size:.95rem;font-weight:700;color:var(--tq-encre);line-height:1.35}
.tqh-rassure{font-size:.78rem;line-height:1.45;color:var(--tq-encre-douce);margin:0;text-align:center}
.tqh-rejouer{background:none;border:0;font:inherit;font-size:.82rem;font-weight:700;
  color:var(--tq-encre-douce);text-decoration:underline;cursor:pointer;padding:2px}
.tqh-rejouer:hover{color:var(--tq-bleu)}

/* L'APPARITION EST UNE FINITION, JAMAIS UNE CONDITION D'AFFICHAGE.

   Bene, 9 septembre : "le contenu est visible par defaut dans le HTML
   rendu, l'etat masque n'est applique qu'apres le montage cote client.
   Sinon une section reste blanche quand le JS echoue."

   AUCUN fill-mode, et ce n'est pas un oubli : avec both, l'element
   prend l'etat de depart (opacite 0) AVANT que l'animation ne demarre. Une
   animation qui ne part jamais laisserait donc la question invisible,
   pour toujours, sans qu'aucune erreur ne s'ecrive. Sans fill-mode,
   l'etat au repos est l'etat NORMAL : le pire cas est une apparition
   sans fondu. */
.tqh-vue{animation:tqhEntre .28s ease}
@keyframes tqhEntre{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

@media (prefers-reduced-motion:reduce){
  .tqh-vue{animation:none}
  .tqh-jauge i,.tqh-opt,.tqh-opt i{transition:none}
  .tqh-opt:hover{transform:none}
}
`;
