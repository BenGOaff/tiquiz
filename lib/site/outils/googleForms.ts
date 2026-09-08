// lib/site/outils/googleForms.ts
//
// GOOGLE FORMS ET SYSTEME.IO : DEUX QUESTIONS, DEUX RÉPONSES.
//
// "Connecter Google Forms à Systeme.io" cache deux demandes qui n'ont
// rien à voir : AFFICHER le formulaire dans une page, et ENVOYER les
// réponses dans les contacts. Les confondre est la raison pour laquelle
// personne ne trouve de réponse utile : on lit un tutoriel d'intégration
// HTML alors qu'on cherchait un tag sur un contact. Le texte des deux
// langues garde donc cette séparation, section par section.
//
// AUCUN PRIX N'EST ÉCRIT À LA MAIN. Le nombre de tâches gratuites de
// Zapier est un NOMBRE (il s'écrit pareil dans les deux langues) ; son
// tarif, lui, a DEUX écritures qui dérivent du même montant, parce qu'un
// montant est de la ponctuation (règle du 8 septembre). Recopier l'un
// des deux ici les ferait diverger le jour où Zapier change son tarif.
//
// 🚨 LA CAPTURE MOBILE PORTAIT L'ADRESSE EMAIL DE BÉNÉ (le compte Google
// connecté s'affiche au dessus du formulaire). Elle est floutée dans le
// WebP publié, et vérifiée illisible. Une page publique est indexée pour
// toujours : une capture fournie se REGARDE champ par champ.

import { ZAPIER, type QuestionFaq } from "@/lib/site/integrations";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";
import type { CaptureTexte, Segment } from "@/lib/site/outils/segments";

const CHEMIN_ZAPIER = "/integrations/zapier-systeme-io";

export interface TexteGoogleForms {
  langue: LanguePublique;
  titre: string;
  description: string;
  etiquette: string;
  h1Avant: string;
  h1Surb: string;
  h1Apres: string;
  filAccueil: string;
  filIntegrations: string;
  enBref: readonly [string, string];
  intro: string;
  afficherTitre: string;
  afficherCorps: readonly string[];
  captureMobile: CaptureTexte;
  envoyerTitre: string;
  envoyerZapier: readonly Segment[];
  captureZap: CaptureTexte;
  envoyerScript: readonly Segment[];
  lienZapier: readonly Segment[];
  comparTitre: string;
  comparLegende: string;
  comparEntetes: readonly [string, string, string];
  comparLignes: readonly (readonly [string, string, string])[];
  pasTitre: string;
  pasCorps: readonly string[];
  captureProfils: CaptureTexte;
  ctaEssayer: string;
  ctaTousLesOutils: string;
  faq: readonly QuestionFaq[];
}

const FR: TexteGoogleForms = {
  langue: "fr",
  titre: "Google Forms et Systeme.io : intégrer et connecter",
  description:
    "Comment afficher un Google Forms dans une page Systeme.io, et surtout comment envoyer les réponses dans tes contacts avec le bon tag.",
  etiquette: "Intégrations",
  h1Avant: "Connecter ",
  h1Surb: "Google Forms",
  h1Apres: " à Systeme.io",
  filAccueil: "Accueil",
  filIntegrations: "Intégrations",
  enBref: [
    "Afficher un Google Forms dans une page Systeme.io est possible avec le code d'intégration fourni par Google, mais le formulaire garde son apparence Google et n'envoie rien dans les contacts.",
    "Pour que les réponses deviennent des contacts avec leur tag, il faut Zapier, Make, ou un script Google Apps.",
  ],
  intro:
    "Deux questions différentes se cachent derrière « connecter Google Forms à Systeme.io », et elles n'ont pas la même réponse.",
  afficherTitre: "Afficher le formulaire dans une page Systeme.io",
  afficherCorps: [
    "Google Forms fournit un code d'intégration, et Systeme.io accepte un bloc de code HTML dans ses pages. Techniquement, cela fonctionne.",
    "Ce qui ne fonctionne pas, c'est le reste. Le formulaire garde l'apparence de Google, pas celle de la page. Sa hauteur est fixe, ce qui produit souvent une barre de défilement sur téléphone. Et il ne communique pas avec Systeme.io : une personne peut remplir le formulaire sans jamais devenir un contact. Elle devient une ligne dans un tableur.",
  ],
  captureMobile: {
    alt: "Un Google Forms intégré dans une page Systeme.io sur mobile, avec sa barre de défilement",
    legende:
      "Le même formulaire, dans une page Systeme.io, sur un téléphone : sa hauteur est fixe, donc il défile dans sa propre boîte.",
  },
  envoyerTitre: "Envoyer les réponses dans les contacts",
  envoyerZapier: [
    { gras: "Avec Zapier ou Make." },
    " Déclencheur sur une nouvelle réponse, action « Create or Update a Contact, Including Adding Tags ». Un piège propre à Google Forms : le déclencheur lit la ",
    { gras: "feuille de calcul liée" },
    ", pas le formulaire. La feuille de réponses doit donc exister avant. Et l'ajout d'une question plus tard décale les colonnes, ce qui casse l'association en silence.",
  ],
  captureZap: {
    alt: "Le déclencheur Zapier lit la feuille de calcul liée au Google Forms, pas le formulaire",
    legende:
      "Le déclencheur du Zap s'appelle « New or Updated Spreadsheet Row » : c'est la feuille de calcul qu'il surveille, pas le formulaire.",
  },
  envoyerScript: [
    { gras: "Avec un script Google Apps." },
    " Gratuit et directement dans Google : Extensions, Apps Script, un déclencheur sur l'envoi du formulaire, et un appel à l'API Systeme.io. Là encore, l'API attend l'identifiant du tag et pas son nom : il faut chercher le tag, le créer s'il manque, puis le poser sur le contact.",
  ],
  lienZapier: [
    "Le détail des limites de Zapier, chiffré : ",
    { lien: "Zapier et Systeme.io", chemin: CHEMIN_ZAPIER },
    ".",
  ],
  comparTitre: "Les deux questions, côte à côte",
  comparLegende:
    "Afficher le formulaire dans la page et envoyer les réponses dans les contacts sont deux choses différentes",
  comparEntetes: [
    "",
    "Afficher le formulaire dans la page",
    "Envoyer les réponses dans les contacts",
  ],
  comparLignes: [
    [
      "Possible ?",
      "Oui, avec le code d'intégration Google",
      "Oui, avec Zapier, Make ou un script Apps",
    ],
    [
      "Coût",
      "0 €",
      `0 € jusqu'à ${ZAPIER.gratuitTachesParMois} réponses par mois, puis ${ZAPIER.professionnelParMois}`,
    ],
    ["Apparence", "celle de Google, hauteur fixe", "sans objet"],
    ["Le visiteur devient un contact", "Non", "Oui"],
    ["Tag différent selon la réponse", "Non", "plan Zapier payant, ou du code"],
  ],
  pasTitre: "Ce que Google Forms ne fait pas",
  pasCorps: [
    "Un quiz qui calcule un profil et pose un tag différent selon les réponses. Le mode questionnaire noté de Google Forms donne un score, pas un profil, et il n'envoie rien nulle part.",
    "Tiquiz couvre ce cas sans code et sans abonnement intermédiaire : la clé API Systeme.io collée une fois, les profils écrits, et chaque personne repart avec son tag. Le tag est créé dans Systeme.io s'il n'existe pas. C'est compris dans le plan gratuit, à 0 €, sans carte bancaire.",
  ],
  captureProfils: {
    alt: "Les profils d'un quiz Tiquiz et le tag Systeme.io posé sur chacun",
    legende: "Un tag par profil, réglé dans l'éditeur : c'est tout ce qu'il y a à faire.",
  },
  ctaEssayer: "Je teste gratuitement →",
  ctaTousLesOutils: "Voir tous les outils",
  faq: [
    {
      q: "Peut-on intégrer un Google Forms dans une page Systeme.io ?",
      r: "Oui, en collant le code d'intégration fourni par Google dans un bloc de code HTML de la page Systeme.io. Le formulaire s'affiche, mais il garde l'apparence de Google, sa hauteur est fixe, et il n'envoie aucune donnée dans les contacts Systeme.io.",
    },
    {
      q: "Comment envoyer les réponses d'un Google Forms dans Systeme.io ?",
      r: "Par Zapier ou Make, avec le déclencheur qui lit la feuille de calcul liée au formulaire. Ou par un script Google Apps qui appelle directement l'API Systeme.io, ce qui est gratuit mais demande de programmer.",
    },
    {
      q: "Google Forms peut-il créer un quiz avec des profils ?",
      r: "Non. Son mode questionnaire attribue un score, pas un profil, et il ne transmet rien à un outil externe. Un quiz par profil avec tag automatique demande un outil dédié.",
    },
  ],
};

const EN: TexteGoogleForms = {
  langue: "en",
  titre: "Google Forms and Systeme.io: embed and connect",
  description:
    "How to embed a Google Form in a Systeme.io page, and more importantly how to get the answers into your contacts with the right tag.",
  etiquette: "Integrations",
  h1Avant: "Connecting ",
  h1Surb: "Google Forms",
  h1Apres: " to Systeme.io",
  filAccueil: "Home",
  filIntegrations: "Integrations",
  enBref: [
    "You can embed a Google Form in a Systeme.io page using the embed code Google gives you, but the form keeps its Google look and sends nothing to your contacts.",
    "To turn answers into contacts with their tag, you need Zapier, Make, or a Google Apps script.",
  ],
  intro:
    "Two very different questions hide behind “connecting Google Forms to Systeme.io”, and they do not have the same answer.",
  afficherTitre: "Embedding the form in a Systeme.io page",
  afficherCorps: [
    "Google Forms gives you an embed code, and Systeme.io accepts an HTML code block in its pages. Technically, that works.",
    "What does not work is everything else. The form keeps Google's look, not your page's. Its height is fixed, which often produces a scrollbar on a phone. And it does not talk to Systeme.io: someone can fill in the form without ever becoming a contact. They become a row in a spreadsheet.",
  ],
  captureMobile: {
    alt: "A Google Form embedded in a Systeme.io page on mobile, with its own scrollbar",
    legende:
      "The same form, inside a Systeme.io page, on a phone: its height is fixed, so it scrolls inside its own box.",
  },
  envoyerTitre: "Getting the answers into your contacts",
  envoyerZapier: [
    { gras: "With Zapier or Make." },
    " Trigger on a new response, action “Create or Update a Contact, Including Adding Tags”. One trap is specific to Google Forms: the trigger reads the ",
    { gras: "linked spreadsheet" },
    ", not the form. So the response sheet has to exist first. And adding a question later shifts the columns, which breaks the mapping silently.",
  ],
  captureZap: {
    alt: "The Zapier trigger reads the spreadsheet linked to the Google Form, not the form itself",
    legende:
      "The Zap trigger is called “New or Updated Spreadsheet Row”: it watches the spreadsheet, not the form.",
  },
  envoyerScript: [
    { gras: "With a Google Apps script." },
    " Free and right inside Google: Extensions, Apps Script, a trigger on form submit, and a call to the Systeme.io API. Here too, the API expects the tag's ID and not its name: you have to look the tag up, create it if it is missing, then attach it to the contact.",
  ],
  lienZapier: [
    "Zapier's limits, with the numbers: ",
    { lien: "Zapier and Systeme.io", chemin: CHEMIN_ZAPIER },
    ".",
  ],
  comparTitre: "The two questions, side by side",
  comparLegende:
    "Embedding the form in your page and getting the answers into your contacts are two different things",
  comparEntetes: ["", "Embedding the form in your page", "Getting answers into your contacts"],
  comparLignes: [
    ["Possible?", "Yes, with Google's embed code", "Yes, with Zapier, Make or an Apps script"],
    [
      "Cost",
      "€0",
      `€0 up to ${ZAPIER.gratuitTachesParMois} responses a month, then ${ZAPIER.professionnelParMoisEn}`,
    ],
    ["Look and feel", "Google's, with a fixed height", "not applicable"],
    ["The visitor becomes a contact", "No", "Yes"],
    ["A different tag per answer", "No", "paid Zapier plan, or code"],
  ],
  pasTitre: "What Google Forms does not do",
  pasCorps: [
    "A quiz that works out a profile and attaches a different tag depending on the answers. Google Forms' graded quiz mode gives a score, not a profile, and it sends that score nowhere.",
    "Tiquiz covers this case with no code and no middleman subscription: paste your Systeme.io API key once, write your profiles, and everyone leaves with their tag. The tag is created in Systeme.io if it does not exist yet. It is included in the free plan, at €0, with no card.",
  ],
  captureProfils: {
    alt: "The profiles of a Tiquiz quiz and the Systeme.io tag attached to each one",
    legende: "One tag per profile, set in the editor: that is all there is to do.",
  },
  ctaEssayer: "Try it for free →",
  ctaTousLesOutils: "See every tool",
  faq: [
    {
      q: "Can you embed a Google Form in a Systeme.io page?",
      r: "Yes, by pasting the embed code Google gives you into an HTML code block on the Systeme.io page. The form shows up, but it keeps Google's look, its height is fixed, and it sends no data to your Systeme.io contacts.",
    },
    {
      q: "How do you get Google Forms answers into Systeme.io?",
      r: "Through Zapier or Make, with the trigger that reads the spreadsheet linked to the form. Or through a Google Apps script that calls the Systeme.io API directly, which is free but means writing code.",
    },
    {
      q: "Can Google Forms build a quiz with profiles?",
      r: "No. Its quiz mode gives a score, not a profile, and it passes nothing to an outside tool. A profile quiz with an automatic tag needs a dedicated tool.",
    },
  ],
};

const TRADUCTIONS: Readonly<
  Record<Exclude<LanguePublique, typeof LANGUE_SANS_PREFIXE>, TexteGoogleForms>
> = { en: EN };

export const CHEMIN_GOOGLE_FORMS = "/integrations/google-forms-systeme-io";

export function contenuGoogleForms(langue: LanguePublique): TexteGoogleForms {
  return langue === LANGUE_SANS_PREFIXE ? FR : TRADUCTIONS[langue];
}
