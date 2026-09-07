// components/landing/cssIles.ts
//
// COMMENT SES ILES ANIMEES SONT HEBERGEES SUR UN PETIT ECRAN.
//
// Bene, 7 septembre 2026 : "pense evidemment au responsive pour tout."
//
// -- CE QUE LA MESURE A DONNE, AVANT D ECRIRE UNE LIGNE ---------------
//
// Les onze pages du site, servies dans un navigateur a 1440, 900, 390
// et 320 px : aucune page ne debordait, et pourtant DEUX de ses blocs
// avaient leur contenu coupe a l interieur de leur boite, sans que rien
// ne dise qu il existait.
//
//   viralite-trafic   +46 px   (sa deuxieme carte de chiffres)
//   ton-branding      +26 px   (son panneau de reglages)
//   autres-outils    +762 px   (le telephone et les trois cartes)
//
// Ses blocs sont dessines pour un grand ecran, et c est normal : ils
// sont leves de sa page de vente. Ce qui ne l est pas, c est qu on les
// serve en les rognant.
//
// -- POURQUOI CETTE CONSTANTE EXISTE, ET C EST LE VRAI SUJET ----------
//
// La regle a d abord ete ecrite dans la feuille de la landing. Mesure
// ensuite : les deux blocs restaient coupes, parce que les pages de
// fonctionnalites ont LEUR feuille. Deux feuilles, une regle ecrite
// dans une seule : c est le defaut que ce depot paie en boucle depuis
// juin, transpose au CSS.
//
// Elle vit donc ici, en un seul exemplaire, et les DEUX feuilles
// l interpolent. Le test exige que les deux la portent.
//
// -- ON NE ROGNE PAS, ET ON NE REDESSINE PAS SON TRAVAIL --------------
//
// La boite defile, c est la regle deja ecrite pour les tableaux du hub
// integrations : "c est le tableau qui defile, jamais la page". Pour
// son bloc des autres outils, on fait mieux que defiler : ses trois
// colonnes passent l une sous l autre, donc plus rien a faire glisser
// (mesure : hauteur 1378 px, zero rognage).
//
// LA SPECIFICITE EST CALCULEE, PAS ESPEREE : le selecteur a attribut
// pese (0,2,0) contre (0,1,0) pour la classe de son ile, donc il gagne
// sans important (lecon de ses boutons illisibles, 5 septembre).
//
// AUCUN ACCENT GRAVE DANS CE FICHIER hors du gabarit lui meme : un seul
// accent grave dans un commentaire ecrit a l interieur TERMINE le
// litteral. Sixieme fois que ce depot le paie.

// -- ET UNE ILE POSEE EN COLONNE : ON DIMENSIONNE LA COLONNE ---------
//
// Depuis le 7 septembre, son bloc des autres outils vit dans une
// colonne (animation a gauche, texte a droite). Une media query ne
// pourrait rien y faire : elle mesure la FENETRE, pas la colonne.
//
// La correction n est donc PAS ici : c est la colonne qui a ete taillee
// sur ce que l ile mesure (672 px, releve dans le navigateur), dans
// components/landing/styles.ts. Une requete de conteneur qui la ferait
// passer a la ligne a ete essayee puis RETIREE : mesuree, elle rendait
// l animation sur 1346 px de haut contre 605 px pour son texte, ce qui
// est exactement le desequilibre qu on corrigeait.
//
// MESURE SUR SA PROPRE PAGE, ou ce bloc vit deja dans une colonne de 6
// sur 12 : il y rend 530 px de large pour 600 px de contenu, deborde
// de 30 px sur la gauche de sa colonne et rogne 25 px de ses cartes.
// Servir la meme chose serait recopier un defaut.

export const CSS_ILES_ANIMEES = `
@media (max-width:900px){
  [data-anim-vente]{overflow-x:auto}
  [data-anim-vente="autres-outils"] .tqz-opt{flex-wrap:wrap}
}
`;
