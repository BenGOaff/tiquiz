import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Conditions générales du programme d'affiliation",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, siège ${C.address}) — ci-après « l'Éditeur » — propose un programme d'affiliation permettant aux participants de promouvoir Tiquiz® en échange de commissions.`,
  sections: [
    {
      h: "Article 1 – Objet",
      body: [
        "Le programme permet aux affiliés de percevoir des commissions sur les ventes Tiquiz® générées via leur lien d'affiliation.",
      ],
    },
    {
      h: "Article 2 – Inscription",
      body: [
        "L'inscription est gratuite. L'Éditeur se réserve le droit d'accepter ou de refuser toute candidature sans justification. L'affilié doit fournir des informations exactes et les maintenir à jour.",
      ],
    },
    {
      h: "Article 3 – Fonctionnement",
      body: [
        "Chaque affilié reçoit un lien unique via la plateforme Systeme.io. Un cookie identifie l'affilié lors du clic. Les commissions sont attribuées conformément aux conditions en cas de vente.",
      ],
    },
    {
      h: "Article 4 – Cookies et attribution",
      body: [
        "Le suivi repose sur les cookies, valides indéfiniment sous réserve de conservation sur l'appareil de l'utilisateur et absence de suppression. L'Éditeur ne garantit pas une attribution parfaite des ventes. En cas de conflit, l'Éditeur détermine souverainement l'attribution.",
      ],
    },
    {
      h: "Article 5 – Commissions",
      body: [
        "Les montants figurent sur les pages du programme. Les commissions ne sont dues qu'après encaissement effectif du paiement. Elles peuvent être annulées en cas de remboursement, impayé, fraude ou non-respect des présentes conditions. La validation de l'Éditeur est requise avant paiement.",
      ],
    },
    {
      h: "Article 6 – Paiement",
      body: [
        "Les commissions validées sont versées entre le 10 et le 13 de chaque mois pour les ventes du mois précédent, via Systeme.io ou autre moyen décidé par l'Éditeur. Un seuil minimum de paiement peut s'appliquer. L'affilié assume seul ses obligations fiscales et sociales.",
      ],
    },
    {
      h: "Article 7 – Auto-affiliation et pratiques interdites",
      body: [
        "L'affilié ne peut percevoir de commission sur ses propres achats, directs ou indirects. Sont notamment interdits : tout achat effectué via son propre lien d'affiliation, par des proches ou par des comptes/emails/moyens de paiement qu'il contrôle, ainsi que toute tentative de contournement du tracking.",
        "L'Éditeur peut demander des justificatifs en cas de doute. Les commissions frauduleuses peuvent être annulées, retenues ou récupérées. Le compte peut être suspendu ou supprimé sans préavis en cas de violation.",
      ],
    },
    {
      h: "Article 8 – Obligations de l'affilié",
      body: [
        "L'affilié s'engage à promouvoir Tiquiz® loyalement, avec transparence et dans le respect de la réglementation. Sont interdits : informations trompeuses, promesses de gains, spam, usurpation d'identité, moyens frauduleux.",
      ],
    },
    {
      h: "Article 9 – Propriété intellectuelle",
      body: [
        "Les marques, logos et contenus restent la propriété exclusive de l'Éditeur. L'affilié dispose d'un droit d'utilisation limité au cadre du programme.",
      ],
    },
    {
      h: "Article 10 – Responsabilité",
      body: [
        "L'affilié agit en totale indépendance. Aucun lien de subordination, mandat ou représentation n'existe. L'affilié assume seul la responsabilité de ses contenus, actions de promotion et respect de la loi. L'Éditeur n'est pas responsable des agissements de l'affilié.",
      ],
    },
    {
      h: "Article 11 – Suspension et résiliation",
      body: [
        "L'Éditeur peut suspendre ou résilier le compte à tout moment en cas de non-respect, fraude ou comportement nuisible. Les commissions en cours peuvent être annulées.",
      ],
    },
    {
      h: "Article 12 – Modification du programme",
      body: [
        "L'Éditeur se réserve le droit de modifier à tout moment les conditions, commissions ou modalités de paiement.",
      ],
    },
    {
      h: "Article 13 – Données personnelles",
      body: [
        "Des données personnelles peuvent être traitées dans le cadre du programme. Les parties respectent la réglementation applicable.",
      ],
    },
    {
      h: "Article 14 – Droit applicable et juridiction",
      body: [
        "Les conditions sont soumises au droit français. Pour les professionnels, les tribunaux du ressort de la Cour d'appel de Montpellier ont compétence exclusive.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

const en: LegalPage = {
  title: "Affiliate Program Terms",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `${C.name} (a ${C.form}, share capital ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}) — the "Publisher" — offers an affiliate program that lets participants promote Tiquiz® in exchange for commissions.`,
  sections: [
    {
      h: "Article 1 – Purpose",
      body: [
        "The program lets affiliates earn commissions on Tiquiz® sales generated through their affiliate link.",
      ],
    },
    {
      h: "Article 2 – Enrolment",
      body: [
        "Enrolment is free. The Publisher may accept or reject any application without justification. Affiliates must supply accurate, up-to-date information.",
      ],
    },
    {
      h: "Article 3 – How it works",
      body: [
        "Each affiliate receives a unique link via Systeme.io. A cookie identifies the affiliate upon click. Commissions are attributed in case of a sale, per these terms.",
      ],
    },
    {
      h: "Article 4 – Cookies and attribution",
      body: [
        "Tracking relies on cookies, valid indefinitely provided they remain on the user's device and are not deleted. The Publisher does not guarantee perfect attribution. In case of conflict, the Publisher is the sole judge of attribution.",
      ],
    },
    {
      h: "Article 5 – Commissions",
      body: [
        "Rates are listed on the program pages. Commissions become due only after actual collection of the payment. They may be cancelled in case of refund, chargeback, fraud or breach. Publisher validation is required before payout.",
      ],
    },
    {
      h: "Article 6 – Payout",
      body: [
        "Validated commissions are paid between the 10th and 13th of each month for the previous month's sales, via Systeme.io or any other means chosen by the Publisher. A minimum payout threshold may apply. The affiliate is solely responsible for tax and social obligations.",
      ],
    },
    {
      h: "Article 7 – Self-affiliation and prohibited practices",
      body: [
        "Affiliates cannot earn commissions on their own purchases, direct or indirect. In particular, the following are forbidden: purchases made via one's own affiliate link, by relatives, or by accounts/emails/payment methods under the affiliate's control, as well as any attempt to circumvent tracking.",
        "The Publisher may request supporting documents in case of doubt. Fraudulent commissions may be cancelled, withheld or clawed back. The account may be suspended or terminated without notice in case of breach.",
      ],
    },
    {
      h: "Article 8 – Affiliate obligations",
      body: [
        "Affiliates must promote Tiquiz® fairly, transparently and in compliance with applicable regulation. Misleading information, unrealistic earnings promises, spam, identity theft and fraudulent means are forbidden.",
      ],
    },
    {
      h: "Article 9 – Intellectual property",
      body: [
        "Trademarks, logos and content remain the exclusive property of the Publisher. Affiliates have a right of use strictly limited to the program.",
      ],
    },
    {
      h: "Article 10 – Liability",
      body: [
        "Affiliates act in full independence. There is no subordination, mandate or representation relationship. Affiliates are solely responsible for their content, promotional actions and legal compliance. The Publisher is not liable for the affiliate's actions.",
      ],
    },
    {
      h: "Article 11 – Suspension and termination",
      body: [
        "The Publisher may suspend or terminate the account at any time in case of breach, fraud or harmful behaviour. Pending commissions may be cancelled.",
      ],
    },
    {
      h: "Article 12 – Program changes",
      body: [
        "The Publisher may change terms, commission rates or payout conditions at any time.",
      ],
    },
    {
      h: "Article 13 – Personal data",
      body: [
        "Personal data may be processed in the context of the program. Both parties comply with the applicable regulation.",
      ],
    },
    {
      h: "Article 14 – Governing law and jurisdiction",
      body: [
        "These terms are governed by French law. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have exclusive jurisdiction.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

export const affiliate: Record<string, LegalPage> = { fr, en, es: en, it: en, ar: en };
