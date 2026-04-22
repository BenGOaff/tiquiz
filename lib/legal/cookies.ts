import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Politique de cookies",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `Cette politique informe les utilisateurs sur les cookies et traceurs utilisés lors de la navigation sur tiquiz.com et l'application Tiquiz. Les services sont édités par ${C.name} (${C.form}, RCS ${C.rcs}, siège ${C.address}).`,
  sections: [
    {
      h: "1. Définition",
      body: [
        "Un cookie est un fichier déposé sur le terminal de l'utilisateur lors de la consultation d'un site. Il stocke des informations de navigation ou de comportement. Certains cookies sont déposés par Tiquiz, d'autres par des partenaires tiers.",
      ],
    },
    {
      h: "2. Finalités",
      body: [
        "Les cookies servent à :",
        [
          "Assurer le fonctionnement technique du service.",
          "Sécuriser l'accès et les transactions.",
          "Mesurer l'audience et les performances.",
          "Proposer des fonctionnalités de partage.",
        ],
      ],
    },
    {
      h: "3. Catégories de cookies",
      body: [
        "**Strictement nécessaires.** Indispensables au fonctionnement (authentification, session, panier, paiement). Pas de consentement requis.",
        "**Analytiques.** Mesurent l'audience et améliorent les performances. Déposés après consentement.",
        "**Partage et services tiers.** Intègrent des services tiers (Systeme.io, réseaux sociaux). Consentement requis.",
        "**Paiement.** Déposés par Stripe ou PayPal pour sécuriser les transactions. Strictement nécessaires.",
      ],
    },
    {
      h: "4. Gestion du consentement",
      body: [
        "À la première visite, un bandeau permet d'accepter, refuser ou personnaliser les cookies non essentiels. Le consentement est recueilli de manière libre, spécifique, éclairée et univoque. Il peut être retiré à tout moment via le lien disponible en pied de page.",
      ],
    },
    {
      h: "5. Paramétrage du navigateur",
      body: [
        "L'utilisateur peut configurer son navigateur pour refuser tout ou partie des cookies ou les supprimer. La désactivation peut altérer le fonctionnement de certaines fonctionnalités.",
      ],
    },
    {
      h: "6. Transferts hors UE",
      body: [
        "Les transferts éventuels hors Union européenne sont encadrés par les clauses contractuelles types ou des mécanismes équivalents reconnus par la Commission européenne.",
      ],
    },
    {
      h: "7. Durée de conservation",
      body: [
        "Les cookies sont conservés 13 mois maximum à compter de leur dépôt. Les préférences de consentement sont également conservées 13 mois maximum.",
      ],
    },
    {
      h: "8. Vos droits",
      body: [
        "Vous pouvez à tout moment vous opposer au dépôt de cookies non essentiels, retirer votre consentement, demander l'accès ou la suppression des données collectées. Contact : " + C.email + ". Réclamation possible auprès de la CNIL (www.cnil.fr).",
      ],
    },
    {
      h: "9. Modification",
      body: [
        "La politique peut évoluer pour tenir compte d'évolutions légales ou techniques.",
      ],
    },
    {
      h: "10. Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

const en: LegalPage = {
  title: "Cookie Policy",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `This policy explains the cookies and trackers used when you browse tiquiz.com and the Tiquiz application. The services are published by ${C.name} (a ${C.form}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}).`,
  sections: [
    {
      h: "1. Definition",
      body: [
        "A cookie is a file stored on your device when you visit a website. It stores browsing or behavioural information. Some cookies are set by Tiquiz, others by third-party partners.",
      ],
    },
    {
      h: "2. Purposes",
      body: [
        "Cookies are used to:",
        [
          "Ensure technical service operation.",
          "Secure access and transactions.",
          "Measure audience and performance.",
          "Enable sharing features.",
        ],
      ],
    },
    {
      h: "3. Categories",
      body: [
        "**Strictly necessary.** Required for service operation (authentication, session, cart, payment). No consent required.",
        "**Analytics.** Measure audience and improve performance. Dropped after consent.",
        "**Sharing and third-party services.** Embed third-party services (Systeme.io, social networks). Consent required.",
        "**Payment.** Dropped by Stripe or PayPal to secure transactions. Strictly necessary.",
      ],
    },
    {
      h: "4. Consent management",
      body: [
        "On the first visit, a banner lets you accept, reject or customise non-essential cookies. Consent is given freely, specifically, informed and unambiguously. You can withdraw it at any time via the link in the footer.",
      ],
    },
    {
      h: "5. Browser settings",
      body: [
        "You can configure your browser to refuse all or part of cookies, or delete them. Disabling may break some features.",
      ],
    },
    {
      h: "6. International transfers",
      body: [
        "Any transfer outside the EU is framed by Standard Contractual Clauses or equivalent mechanisms recognised by the European Commission.",
      ],
    },
    {
      h: "7. Retention",
      body: [
        "Cookies are kept for 13 months maximum from the time they are set. Consent preferences are also kept 13 months maximum.",
      ],
    },
    {
      h: "8. Your rights",
      body: [
        "You can object to non-essential cookies, withdraw consent, or ask for access/deletion at any time. Contact: " + C.email + ". You can also file a complaint with the French CNIL (www.cnil.fr) or your local EU authority.",
      ],
    },
    {
      h: "9. Changes",
      body: [
        "This policy may evolve to reflect legal or technical updates.",
      ],
    },
    {
      h: "10. Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

export const cookies: Record<string, LegalPage> = { fr, en, es: en, it: en, ar: en };
