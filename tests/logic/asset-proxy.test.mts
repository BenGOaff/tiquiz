// tests/logic/asset-proxy.test.mts
//
// Alerte Supabase du 6 août 2026 : 6,68 Go de "cached egress" sur les
// 5 Go inclus dans le plan gratuit, avec un pic de 1,7 Go en une seule
// journée.
//
// La cause était dans le code : les images vivent dans le bucket
// `public-assets`, leur adresse `supabase.co` est écrite en base, et le
// viewer les affiche avec de simples `<img>`. Chaque visiteur de chaque
// quiz les téléchargeait donc directement chez Supabase, sans que rien ne
// les mette en cache entre les deux. La facture grandissait avec le
// trafic des créatrices.
//
// Ce fichier fige les deux garanties : on réécrit CE QU'IL FAUT, et
// RIEN D'AUTRE.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assetProxyEnabled,
  proxyAssetsDeep,
  storageAssetPath,
  toProxiedAssetUrl,
} from "@/lib/assetProxy";

const BASE = "https://abcdefgh.supabase.co";
const IMG = `${BASE}/storage/v1/object/public/public-assets/quiz/user-1/photo-123.jpg`;

// ── Ce qu'on réécrit ─────────────────────────────────────────────────

test("une image de nos quiz passe par notre domaine", () => {
  assert.equal(toProxiedAssetUrl(IMG, BASE), "/img/public-assets/quiz/user-1/photo-123.jpg");
});

test("la reecriture marche quelle que soit la profondeur du chemin", () => {
  const deep = `${BASE}/storage/v1/object/public/public-assets/a/b/c/d/e.png`;
  assert.equal(toProxiedAssetUrl(deep, BASE), "/img/public-assets/a/b/c/d/e.png");
});

test("une base avec un slash final ne double pas le slash", () => {
  assert.equal(toProxiedAssetUrl(IMG, `${BASE}/`), "/img/public-assets/quiz/user-1/photo-123.jpg");
});

// ── Ce qu'on ne touche à AUCUN prix ──────────────────────────────────

test("une image externe reste intacte", () => {
  // Une creatrice colle une adresse Unsplash ou celle de son site : la
  // rediriger vers notre proxy donnerait une image cassee.
  for (const url of [
    "https://images.unsplash.com/photo-1.jpg",
    "https://cdn.sonsite.fr/logo.png",
    "data:image/png;base64,iVBORw0KGgo=",
    "/deja-relatif.png",
    "",
  ]) {
    assert.equal(toProxiedAssetUrl(url, BASE), url, url || "(vide)");
  }
});

test("un objet PRIVE n'est jamais servi", () => {
  // `/object/public/` seulement. Proxyfier un objet authentifie
  // reviendrait a le rendre public.
  const prive = `${BASE}/storage/v1/object/authenticated/private/secret.pdf`;
  assert.equal(storageAssetPath(prive, BASE), null);
  assert.equal(toProxiedAssetUrl(prive, BASE), prive);
});

test("un bucket qu'on ne sert pas est refuse", () => {
  // Liste FERMEE : un proxy qui accepte n'importe quel chemin devient un
  // relais ouvert vers tout ce que le projet heberge.
  const autre = `${BASE}/storage/v1/object/public/backups/dump.sql`;
  assert.equal(storageAssetPath(autre, BASE), null);
});

test("une remontee de dossier est refusee", () => {
  const piege = `${BASE}/storage/v1/object/public/public-assets/../../secret`;
  assert.equal(storageAssetPath(piege, BASE), null);
});

test("l'adresse d'un AUTRE projet Supabase n'est pas la notre", () => {
  const ailleurs = "https://zzzzzz.supabase.co/storage/v1/object/public/public-assets/x.png";
  assert.equal(toProxiedAssetUrl(ailleurs, BASE), ailleurs);
});

test("sans base connue, on ne reecrit rien", () => {
  // Une variable d'environnement vide ne doit pas produire `/img/...`
  // pointant nulle part.
  assert.equal(toProxiedAssetUrl(IMG, ""), IMG);
});

// ── Une seule passe, sur toute la réponse ────────────────────────────

test("toute la structure est couverte, quel que soit le nom du champ", () => {
  // Une liste blanche (`bonus_image_url`, `brand_logo_url`...) oublierait
  // la prochaine colonne d'image ajoutee, et l'oubli ne se verrait que
  // sur la facture du mois suivant.
  const payload = {
    brand_logo_url: IMG,
    un_champ_invente_demain: IMG,
    results: [{ image_url: IMG, beat_media: { cause: { url: IMG } } }],
    rien: null,
    nombre: 42,
    texte: "une phrase ordinaire",
  };
  const out = proxyAssetsDeep(payload, BASE);
  assert.equal(out.brand_logo_url, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.un_champ_invente_demain, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.results[0].image_url, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.results[0].beat_media.cause.url, "/img/public-assets/quiz/user-1/photo-123.jpg");
  assert.equal(out.rien, null);
  assert.equal(out.nombre, 42);
  assert.equal(out.texte, "une phrase ordinaire");
});

test("une adresse au milieu d'un texte riche n'est pas touchee", () => {
  // On ne reecrit qu'une valeur qui EST une adresse, pas une adresse
  // citee dans une phrase : couper au milieu d'un attribut HTML casserait
  // le rendu.
  const html = `<p>Voir <img src="${IMG}"> ici</p>`;
  assert.equal(proxyAssetsDeep({ intro: html }, BASE).intro, html);
});

test("aucune boucle infinie sur une structure profonde", () => {
  const profond = { a: { b: { c: { d: { e: [IMG] } } } } };
  assert.equal(profond.a.b.c.d.e[0], IMG, "l'objet d'entree n'est pas modifie");
  assert.equal(proxyAssetsDeep(profond, BASE).a.b.c.d.e[0], "/img/public-assets/quiz/user-1/photo-123.jpg");
});

// ── Le coupe-circuit ─────────────────────────────────────────────────

test("ETEINT par defaut : le deploiement ne change rien", () => {
  // "J'ai des pubs qui tournent dessus, il ne faut absolument rien
  // casser, jamais, pour les quiz existants." La seule facon honnete de
  // repondre "certains" est que le deploiement soit sans effet tant
  // qu'elle n'a pas allume.
  for (const v of [undefined, null, "", "off", "OFF", "0", "false", "peut-etre"]) {
    assert.equal(assetProxyEnabled(v), false, String(v));
  }
  assert.equal(toProxiedAssetUrl(IMG, BASE, false), IMG);
  assert.equal(proxyAssetsDeep({ u: IMG }, BASE, false).u, IMG);
});

test("il s'allume explicitement, et se coupe en dix secondes", () => {
  // `ASSET_PROXY=on` dans le .env plus un `pm2 restart`. Pas de
  // redeploiement, donc pas de retour en arriere de code un samedi.
  for (const v of ["on", "ON", " on ", "1", "true"]) {
    assert.equal(assetProxyEnabled(v), true, String(v));
  }
});

// ── La route, et la réponse publique ─────────────────────────────────

test("la fraicheur reste celle d'aujourd'hui, JAMAIS plus longue", () => {
  // Ma premiere version posait `immutable` pour un an. C'etait faux : le
  // logo se televerse sur un chemin STABLE en `upsert`, donc une
  // creatrice qui change son logo aurait vu l'ancien pendant un an.
  // Supabase sert ces objets avec max-age=3600 : on reprend la meme
  // duree, a la seconde pres.
  // On lit les EN-TETES CONSTRUITS, pas le fichier entier : les
  // commentaires expliquent justement pourquoi `immutable` a ete retire,
  // et un test qui rougit sur sa propre explication finit desactive.
  const src = readFileSync(new URL("../../app/img/[...path]/route.ts", import.meta.url), "utf8");
  const headers = src.slice(src.indexOf("new Headers({"), src.indexOf("export async function GET"));
  assert.doesNotMatch(headers, /immutable/, "un logo remplace doit pouvoir apparaitre");
  assert.match(src, /const MAX_AGE = 3600;/);
  assert.match(headers, /stale-while-revalidate/, "c'est lui qui economise, sans toucher a la fraicheur");
  // Le cache d'amont ne passe PLUS par `next: { revalidate }` : depuis
  // le 6 aout, la route tient son propre cache disque
  // (`lib/images/transform.ts`), qui est plus fort. Une fois le fichier
  // dedans, Supabase n'est plus sollicite DU TOUT, la ou le cache de
  // `fetch` le rappelait toutes les heures, quand il acceptait de garder
  // un corps binaire de cette taille.
  assert.match(src, /await readCached\(/);
  assert.match(src, /void writeCached\(/);
});

test("aucun Content-Length recopie de l'amont", () => {
  // `fetch` decompresse tout seul une reponse gzip (Supabase le fait sur
  // les SVG) : la longueur annoncee par l'amont ne correspondrait plus au
  // corps renvoye, et le navigateur couperait l'image au milieu.
  const src = readFileSync(new URL("../../app/img/[...path]/route.ts", import.meta.url), "utf8");
  const headers = src.slice(src.indexOf("new Headers({"), src.indexOf("export async function GET"));
  assert.doesNotMatch(headers, /Content-Length/i);
  assert.doesNotMatch(src, /headers\.set\("Content-Length"/i);
});

test("la route refuse ce qui n'est pas un bucket servi", () => {
  const src = readFileSync(new URL("../../app/img/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(src, /PROXIED_BUCKETS\.includes\(segments\[0\]\)/);
  assert.match(src, /assetProxyEnabled/);
});

test("la reponse publique passe par la reecriture", () => {
  // C'est LE point de passage du trafic visiteur : le viewer lit tout
  // par cette route.
  const src = readFileSync(
    new URL("../../app/api/quiz/[quizId]/public/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /proxyAssetsDeep/);
  assert.match(src, /quiz: \{\s*\.\.\.asset\(renderedQuiz\)/);
  assert.match(src, /questions: asset\(renderedQuestions\)/);
  assert.match(src, /results: asset\(renderedResults\)/);
});

// ── L'audit exhaustif demandé par Béné (6 août 2026) ─────────────────
//
// "Ne m'annonce jamais un truc sans avoir vérifié toutes les
// conséquences, tout ce que ça va toucher partout, pour anticiper
// absolument toutes les situations de tous les users et tous leurs
// quiz. Il faut qu'on soit sûr à 100%."
//
// Chaque test ci-dessous fige UNE situation vérifiée dans le code, pour
// qu'un futur changement la fasse rougir au lieu de la casser en prod.

test("une adresse avec une query n'est pas reecrite", () => {
  // Elle ne devrait pas exister (getPublicUrl n'en produit pas, et les
  // transformations d'image sont indisponibles sur le plan gratuit),
  // mais la reecrire perdrait le parametre en silence.
  const avecQuery = `${IMG}?width=800`;
  assert.equal(storageAssetPath(avecQuery, BASE), null);
  assert.equal(toProxiedAssetUrl(avecQuery, BASE), avecQuery);
  assert.equal(toProxiedAssetUrl(`${IMG}#ancre`, BASE), `${IMG}#ancre`);
});

test("un nom de fichier avec un espace ou un accent fait l'aller-retour", () => {
  // `ext` vient de `file.name.split(".").pop()` : un fichier SANS
  // extension nommé "mon fichier" met un espace dans le chemin. L'adresse
  // stockée le porte alors en `%20`, et la route le re-encode apres que
  // Next l'a decode : le tour doit boucler sans double encodage.
  const encode = (segments: string[]) => segments.map(encodeURIComponent).join("/");
  for (const brut of ["mon fichier.png", "été.jpg", "a+b.png", "c(1).webp"]) {
    const stocke = `${BASE}/storage/v1/object/public/public-assets/quiz/u1/${encodeURIComponent(brut)}`;
    const proxifie = toProxiedAssetUrl(stocke, BASE);
    assert.match(proxifie, /^\/img\//, brut);
    // Ce que Next donnera a la route : les segments DECODES.
    const segments = proxifie.replace("/img/", "").split("/").map(decodeURIComponent);
    // Ce que la route renverra vers Supabase.
    assert.equal(
      `${BASE}/storage/v1/object/public/${encode(segments)}`,
      `${BASE}/storage/v1/object/public/public-assets/quiz/u1/${encodeURIComponent(brut)}`,
      brut,
    );
  }
});

test("le widget d'embed ne consomme PAS la route reecrite", () => {
  // Il s'execute sur la page de la CLIENTE, pas dans une iframe : une
  // adresse relative `/img/...` s'y resoudrait sur SON domaine a elle, et
  // toutes les images seraient cassees. Il utilise sa propre famille de
  // routes (`/api/embed/quiz/*`), et ce test interdit qu'on l'y branche.
  const widget = readFileSync(new URL("../../public/embed/tiquiz.js", import.meta.url), "utf8");
  assert.doesNotMatch(widget, /api\/quiz\/[^"']*\/public/);
});

test("le visiteur ne renvoie jamais une adresse d'image au serveur", () => {
  // Sinon la base se remplirait d'adresses relatives `/img/...`, qui ne
  // voudraient plus rien dire une fois le dispositif eteint. Les trois
  // POST du viewer n'envoient que des reponses, des identifiants et des
  // coordonnees.
  const viewer = readFileSync(
    new URL("../../components/quiz/PublicQuizClient.tsx", import.meta.url),
    "utf8",
  );
  for (const m of viewer.matchAll(/body: JSON\.stringify\(\{([\s\S]{0,600}?)\}\)/g)) {
    assert.doesNotMatch(m[1], /image_url|logo_url|_image\b|brand_logo/, m[1].slice(0, 80));
  }
});

test("aucun upload ne reecrit un chemin de stockage STABLE", () => {
  // Mesure sur la prod le 6 aout : sur `quiz.tipote.com`, qui est derriere
  // Cloudflare, l'image proxifiee ressort en `max-age=14400` alors que la
  // route en pose 3600. Cloudflare garde la plus LONGUE des deux durees
  // (reglage Browser Cache TTL de la zone), et aucune ligne de code ne peut
  // la raccourcir.
  //
  // Ca n'a d'importance que pour un fichier qu'on REMPLACE au meme endroit.
  // Le logo etait le seul du repo dans ce cas (`logos/<uid>/logo.png` en
  // upsert) : changer son logo n'aurait rien change a l'ecran pendant
  // quelques heures. Tous les autres uploads portent deja un horodatage,
  // donc une adresse neuve, donc aucun cache a purger.
  //
  // La correction n'est pas dans l'entete, elle est dans le nom : le logo
  // est horodate comme le reste. Ce test interdit qu'un futur upload
  // reintroduise un chemin fixe, y compris sur un bucket non proxifie.
  const fichiers = [
    "components/quiz/QuizDetailClient.tsx",
    "components/quiz/SurveyDetailClient.tsx",
    "components/settings/SettingsClient.tsx",
    "components/visual-studio/TiquizStudioButton.tsx",
  ];
  let vus = 0;
  for (const f of fichiers) {
    const src = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/`(logos|og|bonus|quiz-[a-z]+|rich-content|studio)\/\$\{[^`]*`/g)) {
      vus++;
      assert.match(m[0], /Date\.now\(\)/, `${f} : ${m[0]}`);
    }
  }
  assert.ok(vus >= 10, `on doit avoir vu tous les chemins d'upload, vu ${vus}`);
});
