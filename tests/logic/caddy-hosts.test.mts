// tests/logic/caddy-hosts.test.mts
//
// LA PANNE DU 29 AOÛT 2026, ET CE QUI L'EMPÊCHE DE REVENIR.
//
// Une commande de déploiement copiait `infra/caddy/Caddyfile` par dessus
// `/etc/caddy/Caddyfile`. Or `tiquiz.fr` et `atelierduquiz.fr` n'avaient
// de bloc que sur le serveur : la copie les a effacés, et les DEUX pages
// de vente sont tombées en ERR_SSL_PROTOCOL_ERROR.
//
// Le symptôme n'apparaissait dans aucun journal d'application, et c'est
// ce qui rend cette panne chère : sans bloc nommé, Caddy ne peut pas
// produire de certificat pour ce nom, donc il coupe la poignée de main.
// Aucune requête n'arrive jusqu'à l'app, donc l'app n'a rien à dire.
//
// Ce fichier fige les deux moitiés : le contrôle voit une disparition,
// et le dépôt déclare bien tout ce qu'il doit servir.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOTES_ATTENDUS, hotesAbsents, hotesPerdus, hotesServis } from "../../scripts/check-caddy-hosts.mjs";
import { ATELIER_BASE_URL } from "../../lib/partner/atelierUrl.ts";
import { AFFILIATE_DASHBOARD_URL, ATELIER_SALES_URL } from "../../lib/affiliateUrls.ts";
import { HOTE_VENTE } from "../../lib/publicHost.ts";

const CADDYFILE = fs.readFileSync(
  path.join(process.cwd(), "infra/caddy/Caddyfile"),
  "utf8",
);

// ── CE QUE LE DÉPÔT DOIT SERVIR ──

test("les deux domaines de vente ont leur bloc dans le depot", () => {
  // C'est LA regression du 29 aout. Ils portent l'argent : la page de
  // vente, le bon de commande et le blog.
  const hotes = hotesServis(CADDYFILE);
  for (const h of ["tiquiz.fr", "www.tiquiz.fr", "atelierduquiz.fr", "www.atelierduquiz.fr"]) {
    assert.ok(hotes.has(h), `${h} n'a pas de bloc : il tomberait dans le catchall`);
  }
});

test("les apps et le pilotage aussi", () => {
  const hotes = hotesServis(CADDYFILE);
  for (const h of ["app.tipote.com", "quiz.tipote.com", "affiliate.tipote.com", "pilotage.tipote.com"]) {
    assert.ok(hotes.has(h), h);
  }
});

// ── LE CONTRÔLE VOIT LA DISPARITION ──

test("un hote servi et absent du depot FAIT ECHOUER le deploiement", () => {
  // C'est exactement l'accident : le fichier en service connait un hote
  // que le depot ignore.
  const enService = `${CADDYFILE}\ndomaine-oublie.fr {\n\treverse_proxy 127.0.0.1:3009\n}\n`;
  assert.deepEqual(hotesPerdus(CADDYFILE, enService), ["domaine-oublie.fr"]);
});

test("deux fichiers qui servent les memes hotes passent, quelle que soit la mise en forme", () => {
  // Un test qui rougit sur un commentaire ou une indentation finit
  // desactive, et on se retrouve sans garde-fou du tout.
  const reecrit = CADDYFILE
    .split("\n")
    .map((l) => l.replace(/^\t+/, "    "))
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");
  assert.deepEqual(hotesPerdus(reecrit, CADDYFILE), []);
});

test("le depot peut AJOUTER des hotes sans rien casser", () => {
  // Poser un nouveau domaine avant qu'il ne soit en service est le cas
  // normal : c'est meme l'ordre exige (le bloc AVANT le DNS).
  const avecNouveau = `${CADDYFILE}\nnouveau.tipote.com {\n\treverse_proxy 127.0.0.1:3010\n}\n`;
  assert.deepEqual(hotesPerdus(avecNouveau, CADDYFILE), []);
});

// ── CE QUE LE LECTEUR NE DOIT PAS PRENDRE POUR UN HÔTE ──

test("le catchall, les extraits et les options globales ne sont pas des hotes", () => {
  const hotes = hotesServis(CADDYFILE);
  // `:443` est justement le trou dans lequel tombent les hotes oublies :
  // le compter comme un hote servi masquerait la disparition.
  for (const faux of [":443", "", "(proxy_headers)", "(block_bad_paths)", "proxy_headers"]) {
    assert.ok(!hotes.has(faux), `${faux} ne devrait pas etre lu comme un hote`);
  }
  for (const h of hotes) {
    assert.ok(h.includes("."), `${h} ne ressemble pas a un nom de domaine`);
    assert.ok(!h.includes("{") && !h.includes(" "), h);
  }
});

test("une directive imbriquee n'est jamais lue comme une adresse", () => {
  // `reverse_proxy ... {` ouvre un bloc lui aussi : le lire au premier
  // niveau ferait apparaitre des hotes qui n'existent pas, donc un
  // controle qui passe alors qu'il ne devrait pas.
  const bidon = `exemple.fr {\n\treverse_proxy 127.0.0.1:3001 {\n\t\ttransport http {\n\t\t\tread_timeout 5m\n\t\t}\n\t}\n}\n`;
  assert.deepEqual([...hotesServis(bidon)], ["exemple.fr"]);
});

// ── UN LIEN AFFILIÉ NE SE MET JAMAIS EN CACHE ──
//
// Béné, 29 août : "on peut genre mettre en cache tiquiz.fr et
// atelierduquiz.fr pour éviter que les pages de vente sautent ?"
//
// Oui, et il y a UN piège qui coûterait cher. Le clic affilié est
// compté dans le middleware, et le cookie d'un an y est posé. Une
// réponse à `?ref=jocelyne` servie depuis un cache n'arrive jamais
// jusqu'à nous : pas de clic, pas de cookie, pas d'attribution, pas de
// mois offert. Et rien ne casse à l'écran.

test("une reponse qui porte un lien affilie interdit toute mise en cache", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(
    /if \(ref \|\| sa\) res\.headers\.set\("Cache-Control", "private, no-store/.test(src),
    "sans cet en-tete, un cache partage peut avaler un clic affilie et rejouer le Set-Cookie d'un affilie a tout le monde",
  );
});

// ── LA PANNE DU 30 AOÛT : LE TROISIÈME HÔTE ──

test("l'application de l'Atelier a son bloc, et elle ne l'a jamais eu", () => {
  // Bene, 30 aout : "l'atelier est down et je ne comprends pas
  // pourquoi. Je viens de relancer mais c'est toujours down."
  //
  // `quizing.tipote.com` etait dans EXACTEMENT le cas de `tiquiz.fr` et
  // `atelierduquiz.fr` la veille : configure a la main sur le serveur,
  // jamais recopie ici. Le `cp` du deploiement l'a efface, et l'Atelier
  // a repondu 525 a tous ses eleves. PM2 restait vert : aucune requete
  // n'arrivait jusqu'a l'app, donc l'app n'avait rien a dire.
  assert.ok(
    hotesServis(CADDYFILE).has("quizing.tipote.com"),
    "sans bloc, Caddy n'a aucun certificat pour ce nom et coupe la poignee de main",
  );
});

test("tout hote nomme par le CODE a son bloc dans le depot", () => {
  // LA MOITIE QUI MANQUAIT. Le controle d'origine compare le depot au
  // fichier VIVANT : quand les deux ont perdu le meme nom, ils sont
  // d'accord, et personne ne crie. Un controle qui compare deux copies
  // ne rattrape jamais une erreur commune aux deux.
  //
  // Cette liste, elle, ne depend d'aucun fichier de configuration.
  const absents = hotesAbsents(CADDYFILE);
  assert.deepEqual(absents, [], `hotes designes par le code et sans bloc : ${absents.map((a) => a.hote).join(", ")}`);
});

test("la liste des hotes attendus suit les constantes, elle ne se perime pas", () => {
  // Une liste de noms recopies a la main se perime en silence : c'est la
  // mecanique meme du probleme qu'on ferme. Chaque entree est donc
  // rattachee a la constante qui la nomme, et ce test rougit le jour ou
  // l'une des deux bouge sans l'autre.
  const attendus = new Set(HOTES_ATTENDUS.map((h) => h.hote));
  for (const [url, quoi] of [
    [ATELIER_BASE_URL, "ATELIER_BASE_URL"],
    [ATELIER_SALES_URL, "ATELIER_SALES_URL"],
    [AFFILIATE_DASHBOARD_URL, "AFFILIATE_DASHBOARD_URL"],
    [HOTE_VENTE, "HOTE_VENTE"],
  ] as const) {
    const hote = new URL(url).hostname;
    assert.ok(attendus.has(hote), `${quoi} designe ${hote}, absent de HOTES_ATTENDUS`);
  }
});
