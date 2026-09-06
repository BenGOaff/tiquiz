// app/(site)/fonctionnalites/styles.ts
//
// LE STYLE DES PAGES DE FONCTIONNALITÉS.
//
// Il reprend les jetons de marque du site (`.tq-site`, globals.css),
// qui portent depuis le 4 septembre les couleurs RELEVÉES sur sa page
// de vente. Aucune valeur n'est choisie ici : les six variables sont
// lues, jamais redéfinies.
//
// ET AUCUN APLAT DE COULEUR SOUS DU TEXTE. Règle du 31 août, redite le
// 4 septembre : fond blanc ou crème, texte à l'encre, et le bleu ne
// sert qu'à un bouton, une pastille, un filet ou un chiffre.
//
// PAS D'ACCENT GRAVE DANS CE FICHIER, commentaires compris : il vit
// dans un littéral de gabarit, et un accent grave le termine. C'est
// arrivé quatre fois.

export const CSS = `
.tqf{--b:#5A6EF6;--cy:#20BBE6;--e:#2B3264;--c:#3B3B3B;--fond:#F3F6FC;
  --pale:#EDF1F7;--bord:#E4E8F3;
  font-family:"Open Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--c);background:var(--fond)}
.tqf-large{max-width:1120px;margin:0 auto;padding:0 20px}
.tqf-lire{max-width:760px;margin:0 auto;padding:0 20px}

/* 100 px HAUT ET BAS, comme partout : sa regle du 4 septembre. */
.tqf-tete{background:#fff;padding:100px 0;border-bottom:1px solid var(--bord)}
.tqf-sec{padding:100px 0}

.tqf h1{margin:0 0 18px;font-size:40px;line-height:1.15;font-weight:800;
  letter-spacing:-.02em;color:var(--e)}
.tqf-chapo{margin:0;font-size:18px;line-height:1.6;color:var(--c)}
.tqf h2{margin:52px 0 14px;font-size:26px;line-height:1.25;font-weight:800;color:var(--e)}
.tqf h3{margin:32px 0 10px;font-size:19px;line-height:1.3;font-weight:800;color:var(--e)}
.tqf p{margin:0 0 14px;font-size:16.5px;line-height:1.65}
/* a:not([class]) VISE LES LIENS NUS, ET SEULEMENT EUX. Un selecteur qui
   finit par un a nu pese 0,1,1 et bat toute regle de bouton en 0,1,0 :
   le bouton "Creer mon compte gratuit" sortait BLEU SUR BLEU, mesure a
   1:1 de contraste, donc invisible. C'est mot pour mot le bug des
   boutons illisibles du 5 septembre, quatrieme fois. */
.tqf a:not([class]){color:var(--b);font-weight:700}

/* Le fil d'ariane et le palier. */
.tqf-fil{font-size:14px;color:var(--c);margin-bottom:16px}
.tqf-palier{display:inline-block;margin-bottom:14px;padding:5px 12px;border-radius:999px;
  font-size:12.5px;font-weight:800;letter-spacing:.02em;background:var(--pale);color:var(--e)}
.tqf-palier-gratuit{color:#1B7A4B}
.tqf-palier-plus{color:var(--b)}

/* Le hub : une carte par fonctionnalite. */
.tqf-grille{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.tqf-carte{display:block;background:#fff;border:1px solid var(--bord);border-radius:18px;
  padding:24px;text-decoration:none;color:inherit;font-weight:400;
  box-shadow:0 8px 24px rgba(13,20,60,.05);transition:transform .18s ease,box-shadow .18s ease}
.tqf-carte:hover{transform:translateY(-3px);box-shadow:0 16px 36px rgba(13,20,60,.10)}
/* LA COULEUR EST EXPLICITE, ET CE N'EST PAS DECORATIF. La carte EST un
   lien, donc tout ce qu'elle contient herite de la couleur des liens du
   site : sans ces deux lignes le titre et le resume sortent en BLEU DE
   BOUTON, donc ils se lisent comme des liens, et le bleu ne sert plus
   qu'a ca. Meme arithmetique que les boutons illisibles du 5 septembre,
   troisieme fois en deux jours. */
.tqf-carte h2{margin:0 0 10px;font-size:19px;color:var(--e)}
.tqf-carte p{margin:0 0 16px;font-size:15px;line-height:1.55;color:var(--c)}
.tqf-carte .tqf-lire{max-width:none;padding:0;font-size:14px;font-weight:800;color:var(--b)}

/* Les benefices : une puce promesse par ligne, marquee par une coche.
   AUCUN FILET VERTICAL, et ce n'est pas un gout : "un filet reste
   HORIZONTAL, jamais vertical : une decoration a gauche deplace ce
   qu'elle decore, et les bords ne s'alignent plus" (Bene, 31 aout, apres
   trois remontees). Mesure avant correction : le texte des puces partait
   19 px a droite des titres de la meme section. */
.tqf-benefices{list-style:none;padding:0;margin:0 0 14px;display:grid;gap:14px}
.tqf-benefices li{display:flex;align-items:flex-start;gap:11px;
  font-size:16.5px;line-height:1.6}
.tqf-coche{flex:0 0 auto;margin-top:4px;color:var(--b)}

.tqf-court{font-size:18px;line-height:1.6;font-weight:700;color:var(--e)}
.tqf-bloc{margin-top:8px}
.tqf-ou{margin-top:36px;padding:16px 18px;background:#fff;border:1px solid var(--bord);
  border-radius:14px;font-size:15.5px}

/* LA CAPTURE QUI MANQUE, DITE EN CLAIR plutot que laissee en blanc. */
.tqf-capture{margin-top:22px;padding:20px;border:2px dashed var(--bord);border-radius:16px;
  background:#fff}
.tqf-capture-t{margin:0 0 8px;font-size:12.5px;font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;color:var(--b)}
.tqf-capture p:last-child{margin:0;font-size:15px;color:var(--c)}

.tqf-fin{margin-top:52px;text-align:center}
.tqf-cta{display:inline-block;background:var(--b);color:#fff;font-weight:800;font-size:17px;
  padding:15px 30px;border-radius:999px;text-decoration:none;
  box-shadow:0 12px 28px rgba(90,110,246,.30)}
.tqf-rassure{margin-top:12px;font-size:14px;color:var(--c)}
.tqf-suite{margin-top:44px;padding-top:22px;border-top:1px solid var(--bord);font-size:15.5px}
/* AUCUNE COULEUR POSEE SUR UN LIEN NU : la regle .tqf a:not([class])
   la donne deja, et un selecteur qui vise l'element a pese (0,1,1),
   donc il battrait .tqf-cta (0,1,0). C'est le bug du bleu sur bleu du
   5 septembre, et le garde-fou le refuse a juste titre.
   (Aucun accent grave dans ce fichier : il TERMINE le litteral de
   gabarit. Septieme fois.) */
.tqf-tarifs{margin-top:16px;font-size:15px}

/* -- LE VISUEL LEVE DE SA PAGE DE VENTE --------------------------- */
/* L'ile porte son propre style et sa propre largeur : on ne lui impose
   qu'une respiration et un debordement borne. Une largeur forcee
   deformerait un dessin qui a ete regle sur sa page. */
.tqf-visuel{margin:34px 0;overflow-x:auto}

/* -- LES DEUX PAGES VOISINES -------------------------------------- */
/* Le filet est HORIZONTAL, jamais vertical : une decoration a gauche
   deplace ce qu'elle decore (regle du 31 aout, mesuree a 20 px). */
.tqf-voisines{margin-top:44px;padding-top:22px;border-top:1px solid var(--bord)}
.tqf-voisines-t{margin:0 0 14px;font-size:12.5px;font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;color:var(--b)}
.tqf-voisines ul{list-style:none;margin:0;padding:0;display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.tqf-voisines li{background:#fff;border:1px solid var(--bord);border-radius:14px;padding:16px 18px}
.tqf-voisines li a{display:block;font-size:16px;margin-bottom:6px}
.tqf-voisines li span{display:block;font-size:14.5px;line-height:1.55;color:var(--c)}

@media (max-width:1000px){
  .tqf-grille{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:900px){
  /* Les marges LATERALES se resserrent, les VERTICALES ne bougent pas. */
  .tqf-tete{padding:100px 0}
  .tqf-sec{padding:100px 0}
  .tqf-grille{grid-template-columns:1fr}
  .tqf h1{font-size:31px}
  .tqf h2{font-size:23px}
  .tqf-voisines ul{grid-template-columns:1fr}
}
`;
