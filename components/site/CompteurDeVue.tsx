"use client";

// components/site/CompteurDeVue.tsx
//
// LA VUE EST SIGNALÉE PAR LE NAVIGATEUR, PARCE QUE LE SERVEUR NE LA VOIT
// PLUS.
//
// Mesuré le 18 septembre : `cf-cache-status: HIT` sur `tiquiz.fr/`. La
// page vient du cache de Cloudflare, notre serveur n'est pas appelé, le
// middleware ne tourne pas. Onze jours de compteur à zéro. Le détail
// est dans `lib/trafic/vueNavigateur.ts`.
//
// -- POURQUOI ICI, DANS LE CADRE COMMUN --------------------------------
//
// Posé dans `SiteShell`, donc sur TOUTES les pages publiques d'un coup.
// Une balise à recopier page par page est une balise qu'on oubliera sur
// la prochaine, et le trou ne se verrait que dans six mois, sur un
// chiffre qu'on croit complet.
//
// -- CE QU'IL NE FAIT PAS ----------------------------------------------
//
// Il ne lit aucun cookie, n'en pose aucun, ne fabrique aucun
// identifiant. Il envoie trois choses : le chemin, le referrer que LA
// PAGE a vu, et le canal de l'URL. Rien ne désigne une personne, donc
// il n'attend aucun consentement : c'est ce qui lui fait voir aussi les
// visiteurs qui refusent le bandeau, et c'est le choix du 7 septembre.
//
// -- UNE FOIS PAR PAGE, ET UNE SEULE -----------------------------------
//
// `useRef` sur le chemin déjà signalé : en développement, React monte
// deux fois un effet, et sans ce garde chaque vue compterait double.
// Une navigation interne change `pathname`, donc elle compte, parce que
// c'est bien une page vue de plus.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { canalDeLUrl } from "@/lib/affiliate/signalerClic";
import { SALES_HOSTS } from "@/lib/sales/salesHosts";

export default function CompteurDeVue() {
  const pathname = usePathname();
  const dejaSignale = useRef<string | null>(null);

  useEffect(() => {
    // Le chemin qui compte est celui de la BARRE D'ADRESSE, jamais
    // `usePathname()` seul : sur un domaine de vente, le middleware
    // réécrit `/` vers un chemin interne, et c'est l'adresse publique
    // qu'on veut voir dans le tableau. Même piège que le sous domaine
    // affilié (drame Gwenn, 8 juin) : on gate sur ce que le visiteur a
    // vraiment devant lui.
    // LE GARDE EST SUR L'HÔTE, JAMAIS SUR LE CHEMIN.
    //
    // Ce composant est posé dans le cadre RACINE, donc il existe aussi
    // sur `quiz.tipote.com` et `pilotage.tipote.com`, qui ne sont pas
    // du trafic public. La route refuserait de toute façon (elle
    // vérifie le même registre), mais lui envoyer une requête par page
    // vue dans l'app serait du bruit pur.
    //
    // Posé RACINE et pas dans `SiteShell` parce que le bon de commande
    // n'est pas sous `SiteShell` : c'est exactement la page dont le
    // chiffre manquait ("vues d'un bon de commande : 0" à côté de 8
    // ventes). Une balise page par page est une balise qu'on oublie.
    const hote = window.location.host.toLowerCase().split(":")[0];
    if (!Object.prototype.hasOwnProperty.call(SALES_HOSTS, hote)) return;

    const chemin = window.location.pathname || "/";
    const cle = hote + chemin;
    if (dejaSignale.current === cle) return;
    dejaSignale.current = cle;

    const params = new URLSearchParams(window.location.search);
    const corps = JSON.stringify({
      chemin,
      referrer: document.referrer || "",
      canal: canalDeLUrl(params) ?? "",
      utmSource: params.get("utm_source") ?? "",
    });

    // `keepalive` : la requête survit à un visiteur qui repart aussitôt,
    // et c'est justement celui dont la vue manquerait.
    void fetch("/api/public/vue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: corps,
      keepalive: true,
      // Pas de cookie envoyé : la route n'en lit aucun, et ne rien
      // envoyer est la seule façon d'en être sûr.
      credentials: "omit",
    }).catch(() => {
      // Volontairement muet. Un bloqueur qui mange cette requête ne doit
      // pas écrire une erreur rouge dans la console d'un visiteur.
    });
  }, [pathname]);

  return null;
}
