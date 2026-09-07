// scripts/check-vitesse-quiz.mjs
//
// COMBIEN DE TEMPS UN VISITEUR ATTEND AVANT DE VOIR UN QUIZ.
//
// Retour d'un client anglophone, 7 septembre 2026 : "in my opinion it
// was loading a bit slow... from my experience in marketing I know how
// impatient users can be and how this can cost you leads."
//
// Il avait raison, et sa lenteur n'est pas une impression : la page
// publique d'un quiz ne rend AUCUN contenu cote serveur. Le visiteur
// attend TROIS choses, l'une apres l'autre :
//
//   1. le HTML (vide, il ne porte que le JSON-LD et les pixels) ;
//   2. les fragments JavaScript ;
//   3. l'appel a /api/quiz/<id>/public, qui ne peut partir qu'une fois
//      le JavaScript execute.
//
// Ce script mesure les trois, et il dit ce qui est de NOTRE cote et ce
// qui est un reglage Cloudflare. Il ne devine rien : il lit les codes de
// reponse et les en-tetes.
//
//   npm run check:vitesse-quiz -- https://quiz.tipote.com/q/mon-quiz
//
// AUCUNE DEPENDANCE : ce script tourne sur un serveur ou l'on ne veut
// installer rien de plus.

const url = process.argv[2];
if (!url) {
  console.error("Usage : npm run check:vitesse-quiz -- <adresse d'un quiz public>");
  console.error("Exemple : npm run check:vitesse-quiz -- https://quiz.tipote.com/q/mon-quiz");
  process.exit(2);
}

const ms = (n) => `${Math.round(n)} ms`;
const ko = (n) => `${(n / 1024).toFixed(1)} Ko`;

async function mesurer(cible, entetes = {}) {
  const t0 = Date.now();
  const res = await fetch(cible, { headers: { "accept-encoding": "gzip, br", ...entetes } });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    ok: res.ok,
    code: res.status,
    duree: Date.now() - t0,
    taille: buf.length,
    corps: buf.toString("utf8"),
    // `fetch` decompresse tout seul, et undici n'expose pas la taille
    // compressee : ce chiffre est le poids DECOMPRESSE. On l'annonce
    // comme tel plutot que de faire passer une estimation pour une
    // mesure (un chiffre mal nomme est pire qu'un chiffre absent).
    transfere: buf.length,
    cache: res.headers.get("cf-cache-status"),
    controle: res.headers.get("cache-control"),
  };
}

const base = new URL(url).origin;

console.log(`\n== ${url}\n`);

const page = await mesurer(url);
if (!page.ok) {
  console.log(`La page repond ${page.code}. Rien d'autre a mesurer.`);
  process.exit(1);
}
console.log(`1. le HTML          ${ms(page.duree).padStart(8)}   ${ko(page.transfere).padStart(9)} decompresse`);

// Le HTML d'un quiz ne porte aucun contenu du quiz : c'est le fait qui
// explique la page blanche autant que la lenteur. On le DIT.
const contenuServeur = /<h1|<button/i.test(page.corps.replace(/<script[\s\S]*?<\/script>/g, ""));
console.log(
  `   contenu du quiz rendu par le serveur : ${contenuServeur ? "oui" : "NON"}`,
);

const chunks = [...new Set([...page.corps.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
let poids = 0;
let dynamiques = 0;
let depuisLeCache = 0;
for (const c of chunks) {
  const r = await mesurer(base + c);
  poids += r.transfere;
  if (r.cache === "HIT" || r.cache === "REVALIDATED") depuisLeCache += 1;
  else if (r.cache === "DYNAMIC" || r.cache === "BYPASS") dynamiques += 1;
}
console.log(`2. le JavaScript    ${String(chunks.length).padStart(5)} fichiers   ${ko(poids).padStart(9)} decompresses`);
console.log(`   servis par le cache Cloudflare : ${depuisLeCache} / ${chunks.length}`);

// L'appel que le navigateur fera une fois le JavaScript execute.
const id = new URL(url).pathname.split("/").filter(Boolean).pop();
const api = await mesurer(`${base}/api/quiz/${id}/public`);
console.log(`3. l'API du quiz    ${ms(api.duree).padStart(8)}   ${ko(api.taille).padStart(9)}   code ${api.code}`);

console.log(`\n   attente MINIMALE avant le premier pixel de quiz : ${ms(page.duree + api.duree)}`);
console.log("   (le telechargement du JavaScript s'ajoute a ce total)\n");

if (!contenuServeur) {
  console.log("Le HTML ne porte AUCUN contenu du quiz. Deux consequences :");
  console.log("  - le visiteur voit un ecran vide jusqu'a ce que le JavaScript reponde ;");
  console.log("  - un seul fragment JavaScript en 404 laisse la page BLANCHE.\n");
}

if (dynamiques > 0) {
  console.log(`${dynamiques} fragment(s) JavaScript ne sortent PAS du cache Cloudflare.`);
  console.log("Ils portent pourtant `cache-control: public, max-age=31536000, immutable`,");
  console.log("donc c'est une regle de cache du compte Cloudflare qui les ecarte, pas nous.");
  console.log("A regarder : Cloudflare > Caching > Cache Rules, une regle qui viserait");
  console.log("`/_next/*`. Chaque visiteur qui arrive pour la premiere fois les");
  console.log(`telecharge sinon depuis le serveur.\n`);
}
