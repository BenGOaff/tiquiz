// tests/logic/sales-hosts.test.mts
//
// LE DOMAINE PUBLIC OUVRE LA PAGE, LA CLE OUVRE LE CHANTIER.
//
// Chantier du 20 aout : tiquiz.fr sert la page de vente et le bon de
// commande a la place de Systeme.io.
//
// Deux erreurs sont possibles, et elles sont symetriques :
//   - le domaine reste ferme -> la page de vente repond 404 le jour du
//     lancement, et personne ne comprend pourquoi ;
//   - tout devient ouvert -> une page en chantier est publiee par
//     accident sur l'app.
//
// Ce fichier interdit les deux.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  checkoutReturnBase,
  isPublicSalesHost,
  salesSlugForHost,
} from "../../lib/sales/salesHosts.ts";
import { isSalesOpen, isSalesPreviewOpen } from "../../lib/sales/previewGate.ts";

const CLE = "une-cle-de-chantier-assez-longue";
const ENV = { SALES_PREVIEW_TOKEN: CLE };

test("le domaine de vente ouvre la page, avec ou sans cle", () => {
  assert.equal(isSalesOpen(null, "tiquiz.fr", ENV), true);
  assert.equal(isSalesOpen(null, "www.tiquiz.fr", ENV), true);
  // Le port ne change rien : un reverse proxy peut le laisser passer.
  assert.equal(isSalesOpen(null, "tiquiz.fr:443", ENV), true);
  // La casse non plus.
  assert.equal(isSalesOpen(null, "TIQUIZ.FR", ENV), true);
});

test("l'app reste FERMEE sans la cle", () => {
  // C'est la moitie qu'on oublie : ouvrir le domaine ne doit pas ouvrir
  // le chantier partout ailleurs.
  assert.equal(isSalesOpen(null, "quiz.tipote.com", ENV), false);
  assert.equal(isSalesOpen("mauvaise-cle", "quiz.tipote.com", ENV), false);
  assert.equal(isSalesOpen(CLE, "quiz.tipote.com", ENV), true);
  // Hote inconnu, hote absent : fermes.
  assert.equal(isSalesOpen(null, null, ENV), false);
  assert.equal(isSalesOpen(null, "exemple.fr", ENV), false);
});

test("sans SALES_PREVIEW_TOKEN, seule la porte du domaine reste", () => {
  // L'absence de configuration FERME, sauf la ou la page est publique
  // par decision : le domaine ne depend pas d'une variable oubliee.
  assert.equal(isSalesOpen(CLE, "quiz.tipote.com", {}), false);
  assert.equal(isSalesOpen(null, "tiquiz.fr", {}), true);
});

test("le domaine dit QUELLE page il sert", () => {
  assert.equal(salesSlugForHost("tiquiz.fr"), "tiquiz");
  assert.equal(salesSlugForHost("quiz.tipote.com"), null);
  assert.equal(isPublicSalesHost("tiquiz.fr"), true);
  assert.equal(isPublicSalesHost("quiz.tipote.com"), false);
});

test("isSalesPreviewOpen ne connait toujours QUE la cle", () => {
  // Elle sert la ou l'hote n'a pas de sens. Si elle se mettait a
  // regarder l'hote toute seule, on aurait deux portes qui decident
  // differemment de la meme chose.
  assert.equal(isSalesPreviewOpen(CLE, ENV), true);
  assert.equal(isSalesPreviewOpen(null, ENV), false);
});

test("le middleware sert la page de vente a la racine du domaine", () => {
  // Deux moities d'une meme decision : la fonction dit quel slug, le
  // middleware le sert. Abonner l'un sans l'autre donne soit une page de
  // vente injoignable, soit la racine de l'app sur le domaine de vente.
  const src = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(src.includes("salesSlugForHost("), "le middleware ne reconnait plus le domaine de vente");
  assert.ok(
    src.includes("NextResponse.rewrite"),
    "la racine n'est plus reecrite : le visiteur verrait un chemin technique",
  );
});

test("on ramene l'acheteur LA OU IL A ACHETE (20 aout 2026)", () => {
  // Trouve avant que ca ne coute une vente. L'URL de retour venait de
  // APP_URL, donc du domaine canonique. Un acheteur venu du domaine
  // public n'a AUCUNE cle dans son URL : il aurait ete renvoye sur un
  // domaine ou la porte est fermee, et aurait vu une 404 juste apres
  // avoir paye.
  assert.equal(
    checkoutReturnBase("https://tiquiz.fr", "https://quiz.tipote.com"),
    "https://tiquiz.fr",
  );
  assert.equal(
    checkoutReturnBase("https://www.tiquiz.fr", "https://quiz.tipote.com"),
    "https://www.tiquiz.fr",
  );
});

test("un Host falsifie ne detourne PAS le retour de paiement", () => {
  // Sans ce garde-fou, n'importe qui pourrait faire revenir un acheteur
  // sur SON site apres un paiement chez nous. Seuls NOS domaines de
  // vente sont acceptes ; tout le reste retombe sur le canonique.
  for (const origine of [
    "https://mechant.example",
    "https://tiquiz.fr.mechant.example",
    "http://localhost:3000",
    "pas-une-url",
    "",
    null,
    undefined,
  ]) {
    assert.equal(
      checkoutReturnBase(origine, "https://quiz.tipote.com"),
      "https://quiz.tipote.com",
      String(origine),
    );
  }
});

test("depuis l'app, on garde le domaine canonique", () => {
  // Sur l'app, l'acheteur est passe par la cle : le canonique est le bon
  // choix et rien ne change par rapport a avant.
  assert.equal(
    checkoutReturnBase("https://quiz.tipote.com", "https://quiz.tipote.com"),
    "https://quiz.tipote.com",
  );
});
