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

import { hotesPerdus, hotesServis } from "../../scripts/check-caddy-hosts.mjs";

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
