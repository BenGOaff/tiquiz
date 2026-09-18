// app/admin/ventes/page.tsx
//
// LES VENTES DIRECTES ONT DÉMÉNAGÉ DANS LA CONSOLE (17 septembre 2026).
//
// Béné : "l'admin de tiquiz ne devrait plus suivre les ventes etc qui ne
// doivent être suivis que sur pilotage pour simplifier les choses."
//
// Cet écran listait les encaissements Stripe et PayPal avec leur bouton
// Rembourser. `/pilotage/ventes` fait la même chose et DAVANTAGE : il
// nomme le produit (y compris les échéances à l'ancien prix), il dit
// d'où vient l'abonnement, et il dit ce que la commission de l'affilié
// est devenue. Deux listes de la même vente, c'est deux réponses le
// jour où l'une prend du retard.
//
// -- POURQUOI UNE REDIRECTION, ET PAS UNE SUPPRESSION ------------------
//
// Cette adresse est dans ses favoris, et elle est citée par
// `SantePilotage`. Un 404 se lit comme une panne, alors que la
// fonctionnalité existe : elle a juste changé d'adresse. La
// redirection est PERMANENTE côté Next, donc le navigateur finit par
// ne plus passer par ici.
//
// Le bouton Rembourser, lui, n'a pas bougé : il vit sur la ligne de
// chaque personne dans la liste des clients, et sur sa fiche.

import { permanentRedirect } from "next/navigation";

export default function AdminVentesPage(): never {
  permanentRedirect("/pilotage/ventes");
}
