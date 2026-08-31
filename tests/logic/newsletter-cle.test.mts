// tests/logic/newsletter-cle.test.mts
//
// L'INSCRIPTION NEWSLETTER : 502 MUET, ET UNE CLÉ QUE PERSONNE NE LISAIT.
//
// Béné, 31 août 2026 : "pourtant tu as tout ce qu'il faut pour faire
// communiquer tiquiz et systeme io bordel ! J'ai ma clé api dans
// tiquiz, dans .env, partout."
//
// Elle avait raison sur les deux points.
//
// 1. LE CHEMIN QUI MÈNE À LA CLÉ CASSAIT AVANT ELLE. Béné, le même
//    jour : "ma clé systeme io elle n'est pas dans le .env, elle est
//    dans mon compte Tiquiz." Donc la clé est bien en base, et le
//    `.env` n'était pas la réponse : il reste un filet, rien de plus.
//    Le vrai défaut est que l'identifiant du compte administrateur se
//    cherchait dans `profiles.email`, une colonne NULLABLE que **aucun
//    déclencheur ne remplit** (`001_initial_schema.sql`). Un compte
//    ouvert avant que `grantPlan` ne l'écrive n'y a rien. On interroge
//    donc aussi `auth.users`, la seule table où une adresse existe
//    toujours.
//
// 2. LE 502 ÉTAIT MUET, ET C'ÉTAIT MA FAUTE DE CONCEPTION. Mesuré sur
//    la production : Cloudflare REMPLACE le corps d'un 502 par sa page
//    (`error code: 502`, text/plain), quand un 400 de validation
//    revient avec notre JSON intact. La cause qu'on venait d'ajouter
//    n'atteignait donc jamais le navigateur.
//
// 3. Et `idProprietaire` ne testait que le PREMIER des deux admins.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN_EMAILS } from "@/lib/adminEmails";

const TAG = readFileSync("lib/sio/appliquerTag.ts", "utf8");
const ROUTE = readFileSync("app/api/newsletter/route.ts", "utf8");
const RESOLVE = readFileSync("lib/sio/resolveApiKey.ts", "utf8");

test("la cle du compte proprietaire retombe sur le .env", () => {
  assert.match(
    TAG,
    /process\.env\.SYSTEME_IO_API_KEY/,
    "une cle posee dans le .env doit etre lue par le chemin qui pose les etiquettes",
  );
  assert.match(TAG, /async function clesDuProprietaire\(/);
});

test("le repli .env n'est PAS dans resolveApiKey, et c'est capital", () => {
  // `resolveApiKey` sert AUSSI les revendeurs, qui ont chacun LEUR
  // compte Systeme.io. Un repli sur la cle de Bene ferait ecrire les
  // contacts d'une revendeuse dans le compte de Bene le jour ou sa cle
  // manque : une fuite d'une cliente vers une autre, en silence.
  assert.doesNotMatch(
    RESOLVE,
    /SYSTEME_IO_API_KEY/,
    "le repli sur la cle du proprietaire n'a rien a faire dans la cascade des revendeurs",
  );
});

test("on essaie TOUS les admins, pas seulement le premier", () => {
  assert.ok(ADMIN_EMAILS.length >= 2, "le test n'a de sens qu'avec plusieurs admins");
  assert.match(
    TAG,
    /for \(const admin of ADMIN_EMAILS\)/,
    "si le profil qui porte la cle est sous l'autre adresse, la chaine s'arretait la",
  );
  // On regarde le CODE, pas les commentaires : la mention historique
  // de `ADMIN_EMAILS[0]` explique POURQUOI la correction existe, et la
  // retirer ferait perdre le seul endroit qui le raconte. Meme
  // precedent que le test de `poserTagAchat` dans ce depot.
  const codeSeul = TAG.split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
    .join("\n");
  assert.doesNotMatch(
    codeSeul,
    /ADMIN_EMAILS\[0\]/,
    "ne regarder que le premier admin est exactement le bug corrige",
  );
});

test("un doublon de profil ne se lit pas comme une absence", () => {
  // `.maybeSingle()` ECHOUE quand deux lignes matchent, et l'erreur
  // etait ignoree : deux profils avec la meme adresse rendaient
  // "aucun admin", ce qui est faux et indiagnosticable.
  const bloc = TAG.slice(TAG.indexOf("async function idProprietaire"), TAG.indexOf("async function clesDuProprietaire"));
  assert.doesNotMatch(bloc, /maybeSingle/, "on lit une liste bornee, pas un maybeSingle");
  assert.match(bloc, /\.limit\(1\)/);
  assert.match(bloc, /if \(error\)/, "l'erreur de lecture doit etre vue, jamais avalee");
});

test("l'echec d'inscription ne repond JAMAIS 5xx : le corps doit arriver", () => {
  // MESURE du 31 aout sur la production : Cloudflare remplace le corps
  // d'un 502 par sa propre page. Un statut choisi pour bien dire "c'est
  // nous qui sommes en panne" est celui qu'un intermediaire se permet
  // de reecrire, donc la cause n'arrive nulle part.
  const bloc = ROUTE.slice(ROUTE.indexOf("if (!pose.ok)"));
  assert.doesNotMatch(
    bloc,
    /status:\s*5\d\d/,
    "un 5xx sur cet echec fait effacer le corps par le proxy, donc la cause",
  );
  assert.match(bloc, /ok: false, raison: "indisponible", cause: pose\.raison/);
});

test("les refus de VALIDATION gardent leur 4xx", () => {
  // Ceux-la passent intacts (verifie en production), et un 400 dit la
  // bonne chose a un client qui a mal rempli.
  assert.match(ROUTE, /raison: "email_manquant" \}, \{ status: 400 \}/);
  assert.match(ROUTE, /raison: "trop_de_demandes" \}, \{ status: 429 \}/);
});

test("l'admin se retrouve AUSSI dans auth.users, pas seulement dans profiles", () => {
  // `profiles.email` est nullable et rien ne la remplit : la chercher
  // seule, c'est chercher dans un annuaire a moitie rempli. Un profil
  // sans adresse rendait "aucun profil admin" pour quelqu'un dont le
  // compte existe et porte la cle.
  const bloc = TAG.slice(
    TAG.indexOf("async function idProprietaire"),
    TAG.indexOf("async function clesDuProprietaire"),
  );
  assert.match(bloc, /auth\.admin\.listUsers/, "auth.users est la seule source sure d'une adresse");
  assert.match(bloc, /return idProprietaireViaAuth\(\)/, "le repli doit etre BRANCHE, pas seulement ecrit");
  assert.match(bloc, /page <= 20/, "listUsers ne filtre pas par email : la pagination doit etre bornee");
});

test("la lecture de auth.users compare les DEUX adresses admin", () => {
  const bloc = TAG.slice(
    TAG.indexOf("async function idProprietaireViaAuth"),
    TAG.indexOf("async function clesDuProprietaire"),
  );
  assert.match(bloc, /ADMIN_EMAILS\.map/, "une seule adresse cherchee rejouerait le bug d'origine");
  assert.match(bloc, /toLowerCase\(\)/, "les adresses de auth.users ne sont pas normalisees");
});

test("les deux cles sont ESSAYEES, on n'arbitre pas entre elles", () => {
  // Bene a une cle dans son compte Tiquiz ET une dans le .env, et elle
  // a dit de la seconde qu'elle est "fonctionnelle (pas celle de mon
  // compte tiquiz utilisateur)". Choisir un ordre definitif serait un
  // pari dans les deux sens : le .env fait gagner une valeur perimee
  // le jour ou elle change sa cle dans l'ecran Parametres, la base est
  // ce qui bloquait. On essaie, et un REFUS (401/403) passe a la
  // suivante.
  assert.match(TAG, /for \(const candidate of cle\.cles\)/);
  assert.match(TAG, /function cleRejetee\(status: number\)/);
  assert.match(TAG, /status === 401 \|\| status === 403/);
});

test("une cle refusee ne se lit pas comme un contact impossible", () => {
  // C'est le defaut que ce fichier existe pour corriger, une couche
  // plus bas : un 401 rendait `null` sur la recherche comme sur la
  // creation, et les deux se lisaient "creation refusee". Bene partait
  // alors chercher du cote du contact alors que la cle etait rejetee.
  assert.match(TAG, /\| "cle_refusee"/);
  assert.match(TAG, /toutesRefusees \? "cle_refusee" : "contact_impossible"/);
  // Et la raison doit etre NOMMEE dans le journal de la route, sinon
  // elle n'aide personne.
  assert.match(ROUTE, /cle_refusee = /);
});

test("la meme cle n'est jamais essayee deux fois", () => {
  // Sinon le journal dirait "deux cles refusees" pour une seule.
  assert.match(TAG, /!cles\.some\(\(c\) => c\.apiKey === duFichier\)/);
});

test("la recherche d'etiquette PAGINE : la newsletter etait hors de portee", () => {
  // MESURE du 31 aout dans son compte : les 100 etiquettes les plus
  // recentes s'arretent au 24 mars 2025, `hasMore` vaut true, et
  // l'etiquette `newsletter` date du 30 juillet 2022. Avec une seule
  // page, elle etait INTROUVABLE, donc l'inscription ne pouvait pas
  // aboutir meme avec une cle valide.
  const bloc = TAG.slice(TAG.indexOf("async function trouverTag"), TAG.indexOf("export async function poserTagPlan"));
  assert.match(bloc, /startingAfter/, "sans curseur, on relit la meme page pour toujours");
  assert.match(bloc, /hasMore/, "une liste tronquee le DIT : encore faut-il le lire");
  assert.doesNotMatch(bloc, /limit=200/, "le maximum accepte par Systeme.io est 100");
  assert.match(bloc, /limit=100/);
  // Borne : un webhook de paiement ne reste pas ouvert indefiniment.
  assert.match(bloc, /page < 30/);
});
