// tests/logic/inscription-parrainee.test.mts
//
// « JOCELYNE TE PROPOSE DE TESTER TIQUIZ » (Béné, 27 août 2026).
//
// "Par exemple si lien affilié : Jocelyne te propose de tester Tiquiz
// gratuitement alors n'hésite pas ! En plus grâce à son lien tu
// profiteras d'un mois gratuit à l'abonnement de ton choix."
//
// Ce bandeau annonce un CADEAU, et c'est ce qui rend ses silences plus
// importants que son texte. Le mois offert est REFUSÉ par
// `essaiPourCeCheckout` quand l'affiliée est inconnue, en pause ou
// exclue : un bandeau qui le promettrait quand même enverrait quelqu'un
// payer plein tarif après lui avoir dit l'inverse, la carte à la main.
//
// Le prénom, lui, finit sur une page PUBLIQUE. Ce test tient les deux
// bouts : ce qu'on montre, et ce qu'on ne montre jamais.

import { test } from "node:test";
import assert from "node:assert/strict";

import { prenomPublic } from "@/lib/affiliate/nomPublic";
import { readParrainage } from "@/lib/affiliate/accueilParrain";
import { JOURS_MOIS_OFFERT_ANNONCE } from "@/lib/trial/moisOffert";

// ── LE PRÉNOM PUBLIC ─────────────────────────────────────────────────

test("on ne montre que le prénom, jamais le nom de famille", () => {
  assert.equal(prenomPublic("Jocelyne Dupont"), "Jocelyne");
  assert.equal(prenomPublic("  Jocelyne   Dupont  "), "Jocelyne");
});

test("une adresse email n'est jamais affichée comme un prénom", () => {
  // Beaucoup de gens remplissent un champ "nom" avec leur adresse :
  // l'afficher publierait leur email sur une page ouverte.
  assert.equal(prenomPublic("jocelyne@exemple.fr"), null);
  // Les chevrons sont retirés AVANT le contrôle, donc il ne reste que
  // le prénom : c'est le bon résultat. Ce qui compte est qu'aucune
  // adresse ne sorte, et elle ne sort pas.
  assert.equal(prenomPublic("Jocelyne <jocelyne@exemple.fr>"), "Jocelyne");
});

test("une saisie qui n'est pas un prénom rend null, jamais une approximation", () => {
  assert.equal(prenomPublic(null), null);
  assert.equal(prenomPublic(""), null);
  assert.equal(prenomPublic("   "), null);
  assert.equal(prenomPublic("J. Dupont"), null);          // une initiale ne dit rien
  assert.equal(prenomPublic("2024"), null);               // aucune lettre
  assert.equal(prenomPublic("x".repeat(40)), null);       // une phrase, pas un prénom
  assert.equal(prenomPublic("Jd2024"), null);             // un pseudo, pas un prénom
});

test("le champ est saisi par une affiliée, donc les balises sautent", () => {
  assert.equal(prenomPublic("<b>Jocelyne</b> Dupont"), "Jocelyne");
  assert.equal(prenomPublic("<script>alert(1)</script>"), null);
});

test("la casse est adoucie sans abîmer les prénoms composés", () => {
  assert.equal(prenomPublic("JOCELYNE"), "Jocelyne");
  assert.equal(prenomPublic("jocelyne"), "Jocelyne");
  // Ceux là sont déjà écrits correctement : on ne les retouche PAS.
  assert.equal(prenomPublic("Jean-Luc"), "Jean-Luc");
  assert.equal(prenomPublic("d'Arcy"), "d'Arcy");
  assert.equal(prenomPublic("McGregor"), "McGregor");
});

// ── CE QUE LA PAGE AFFICHE, ET CE QU'ELLE TAIT ───────────────────────

const CONNUE = { ref: "jocelyne", connu: true, existe: true, actif: true, nomPublic: "Jocelyne Dupont" };

test("une affiliée active est nommée, avec le nombre de jours du checkout", () => {
  const v = readParrainage(CONNUE);
  assert.equal(v.affiche, true);
  if (!v.affiche) return;
  assert.equal(v.prenom, "Jocelyne");
  // Le nombre vient de la MÊME constante que la décision serveur : deux
  // nombres écrits séparément finiraient par diverger, et celui là est
  // lu par le visiteur avant de payer.
  assert.equal(v.joursOfferts, JOURS_MOIS_OFFERT_ANNONCE);
});

test("sans prénom exploitable le bandeau reste, sans nommer personne", () => {
  const v = readParrainage({ ...CONNUE, nomPublic: null });
  assert.equal(v.affiche, true);
  if (!v.affiche) return;
  assert.equal(v.prenom, null);
});

test("Tipote n'a pas répondu : on ne promet rien", () => {
  // `connu: false` veut dire "je n'ai pas pu regarder", et le mois
  // offert est refusé dans ce cas depuis le 23 août. Le bandeau doit
  // dire la même chose que le checkout.
  const v = readParrainage({ ...CONNUE, connu: false, existe: false, actif: false });
  assert.equal(v.affiche, false);
});

test("un code inventé n'affiche rien", () => {
  assert.equal(readParrainage({ ...CONNUE, existe: false }).affiche, false);
});

test("une affiliée en pause ou exclue n'est jamais mise en avant", () => {
  // Elle ne commissionne plus : la citer serait faire sa promotion sur
  // une vente qui ne la paiera pas.
  assert.equal(readParrainage({ ...CONNUE, actif: false }).affiche, false);
});

test("sans code dans l'URL ni dans le cookie, la page reste normale", () => {
  assert.equal(readParrainage({ ...CONNUE, ref: null }).affiche, false);
  assert.equal(readParrainage({ ...CONNUE, ref: "   " }).affiche, false);
});
