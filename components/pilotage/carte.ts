// components/pilotage/carte.ts
//
// L'ALLURE D'UNE CARTE, ÉCRITE UNE SEULE FOIS.
//
// Béné, 29 août : "soigne un peu les contrastes comme les autres app
// (reprends leurs codes), là c'est un peu plat et pas facile de trouver,
// on dirait que tout est blanc."
//
// Elle a raison, et la cause est exacte : j'avais mis la PAGE en gris
// et les CARTES en blanc, l'inverse du reste de l'app. Deux surfaces
// presque identiques ne se distinguent pas, donc rien ne se détache.
//
// Le reste de Tiquiz fait l'inverse : page `bg-background` (blanc),
// carte `bg-card` (le gris bleuté #F4F5FA) avec une bordure et une
// ombre. C'est ce que fait `components/ui/stat-card.tsx`, et c'est ce
// qu'on reprend au caractère près.
//
// UNE SEULE CHAÎNE, importée partout : recopier ces classes dans chaque
// composant, c'est se garantir qu'un écran finira par ne pas ressembler
// aux autres.

export const CARTE = "rounded-xl bg-card border border-border/60 shadow-card";
