import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Politique de confidentialité",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `La présente politique décrit comment ${C.name} (édite Tiquiz®) collecte, utilise et protège les données personnelles des visiteurs et utilisateurs des sites tiquiz.com et de l'application Tiquiz. Les traitements respectent le RGPD et la loi Informatique et Libertés.`,
  sections: [
    {
      h: "1. Responsable du traitement",
      body: [
        `Le responsable du traitement est ${C.name}, ${C.form} au capital de ${C.capital}, RCS ${C.rcs}, siège social ${C.address}.`,
        `Pour toute question : ${C.email}.`,
      ],
    },
    {
      h: "2. Périmètre des services",
      body: [
        `La politique couvre le site de présentation tiquiz.com et l'application Tiquiz (quiz interactifs, capture de leads, intégrations marketing). Tiquiz® est une marque déposée de ${C.name}.`,
      ],
    },
    {
      h: "3. Données collectées",
      body: [
        "Nous collectons les catégories suivantes :",
        [
          "Identification : nom, prénom, email, numéro de téléphone (facultatif), adresse de facturation.",
          "Activité quiz : quiz créés, questions, résultats, statistiques d'usage.",
          "Leads captés par vos quiz : emails et informations des visiteurs que vos quiz collectent — vous en êtes le responsable de traitement, Tiquiz agit en sous-traitant.",
          "Techniques : adresse IP, navigateur, appareil, journaux de connexion.",
          "Paiement : les données bancaires sont traitées par Stripe et PayPal. Aucune donnée bancaire n'est stockée par Tiquiz.",
        ],
      ],
    },
    {
      h: "4. Finalités et bases légales",
      body: [
        [
          "Exécution du contrat : gestion du compte, accès au service, paiement, support.",
          "Consentement : communications marketing, cookies non essentiels, témoignages.",
          "Intérêt légitime : amélioration du service, sécurisation, prévention de la fraude.",
          "Obligation légale : comptabilité, fiscalité.",
        ],
      ],
    },
    {
      h: "5. Traitement par intelligence artificielle",
      body: [
        "Tiquiz utilise des modèles d'IA pour générer des quiz et analyser vos statistiques. Ces traitements n'emportent aucune décision automatisée produisant des effets juridiques. Les résultats sont des suggestions à valider par l'utilisateur.",
      ],
    },
    {
      h: "6. Rôle des parties (spécifique à Tiquiz)",
      body: [
        "Pour les leads captés par vos quiz, vous êtes responsable de traitement et Tiquiz agit en sous-traitant. Vous vous engagez à respecter la réglementation applicable et à informer les visiteurs de vos quiz.",
      ],
    },
    {
      h: "7. Destinataires et sous-traitants",
      body: [
        "Vos données peuvent être transmises à nos sous-traitants :",
        [
          "Supabase (hébergement base de données et authentification)",
          "Hostinger (hébergement applicatif)",
          "Stripe et PayPal (paiement)",
          "Anthropic (modèles d'IA)",
          "Systeme.io (quand vous activez l'intégration marketing)",
          "Google Analytics (mesure d'audience, avec consentement)",
        ],
        "Les données ne font l'objet d'aucune revente.",
      ],
    },
    {
      h: "8. Transferts hors Union européenne",
      body: [
        "Certains sous-traitants sont situés hors UE. Les transferts sont encadrés par les clauses contractuelles types ou les mécanismes adéquats reconnus par la Commission européenne.",
      ],
    },
    {
      h: "9. Durée de conservation",
      body: [
        [
          "Compte actif : pendant toute la durée d'utilisation.",
          "Compte inactif : 3 ans après le dernier accès.",
          "Données de prospection : 3 ans.",
          "Factures : 10 ans (obligation comptable).",
          "Cookies : 13 mois maximum.",
        ],
      ],
    },
    {
      h: "10. Vos droits",
      body: [
        "Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition, ainsi que du droit de retirer votre consentement à tout moment. Vous pouvez exercer ces droits en écrivant à " + C.email + ". Nous répondons sous un mois. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
      ],
    },
    {
      h: "11. Sécurité",
      body: [
        "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement en transit et au repos, contrôle d'accès strict, isolation logique des environnements, journalisation.",
      ],
    },
    {
      h: "12. Cookies",
      body: [
        "Voir la politique de cookies dédiée pour le détail par catégorie et la gestion du consentement.",
      ],
    },
    {
      h: "13. Mineurs",
      body: [
        "Tiquiz est réservé aux personnes majeures. Si vous constatez qu'un mineur nous a transmis des données, contactez-nous à " + C.email + " pour suppression.",
      ],
    },
    {
      h: "14. Modifications",
      body: [
        "La politique peut évoluer. En cas de modification substantielle, les utilisateurs en sont informés. Consultez régulièrement cette page.",
      ],
    },
    {
      h: "15. Contact",
      body: [
        `${C.name} — ${C.address} — ${C.email}.`,
        "Autorité de contrôle : CNIL (www.cnil.fr).",
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Privacy Policy",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `This policy explains how ${C.name} (the publisher of Tiquiz®) collects, uses and protects personal data of visitors and users of tiquiz.com and the Tiquiz application. Processing complies with the EU GDPR and the French Data Protection Act.`,
  sections: [
    {
      h: "1. Data controller",
      body: [
        `The data controller is ${C.name}, a ${C.form} with a share capital of ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, with its registered office at ${C.address}.`,
        `Any question: ${C.email}.`,
      ],
    },
    {
      h: "2. Scope",
      body: [
        `This policy covers the marketing site tiquiz.com and the Tiquiz application (interactive quizzes, lead capture, marketing integrations). Tiquiz® is a registered trademark of ${C.name}.`,
      ],
    },
    {
      h: "3. Data we collect",
      body: [
        "We collect the following categories:",
        [
          "Identification: first and last name, email, phone number (optional), billing address.",
          "Quiz activity: quizzes you create, questions, results, usage statistics.",
          "Leads captured by your quizzes: emails and answers collected by your quizzes — you are the data controller, Tiquiz acts as your processor.",
          "Technical: IP address, browser, device, connection logs.",
          "Payment: card data is processed by Stripe and PayPal. No card data is stored by Tiquiz.",
        ],
      ],
    },
    {
      h: "4. Purposes and legal bases",
      body: [
        [
          "Performance of the contract: account management, service access, billing, support.",
          "Consent: marketing communications, non-essential cookies, testimonials.",
          "Legitimate interest: product improvement, security, fraud prevention.",
          "Legal obligation: accounting and tax requirements.",
        ],
      ],
    },
    {
      h: "5. Use of Artificial Intelligence",
      body: [
        "Tiquiz uses AI models to generate quizzes and analyse your statistics. These operations do not trigger any automated decision producing legal effects. Outputs are suggestions that you validate.",
      ],
    },
    {
      h: "6. Roles (specific to Tiquiz)",
      body: [
        "For the leads your quizzes capture, you are the data controller and Tiquiz acts as a processor. You are responsible for compliance with the applicable regulation and for informing your quiz visitors.",
      ],
    },
    {
      h: "7. Recipients and sub-processors",
      body: [
        "Your data may be shared with our sub-processors:",
        [
          "Supabase (database hosting and authentication)",
          "Hostinger (application hosting)",
          "Stripe and PayPal (payments)",
          "Anthropic (AI models)",
          "Systeme.io (when you enable the marketing integration)",
          "Google Analytics (audience measurement, with consent)",
        ],
        "We never sell your data.",
      ],
    },
    {
      h: "8. International transfers",
      body: [
        "Some sub-processors are located outside the EU. Transfers are framed by Standard Contractual Clauses or other adequate mechanisms recognised by the European Commission.",
      ],
    },
    {
      h: "9. Retention",
      body: [
        [
          "Active account: for the whole duration of use.",
          "Inactive account: 3 years after last access.",
          "Prospecting data: 3 years.",
          "Invoices: 10 years (legal accounting requirement).",
          "Cookies: 13 months maximum.",
        ],
      ],
    },
    {
      h: "10. Your rights",
      body: [
        "You have the right to access, rectify, erase, restrict, port and object to the processing of your data, as well as the right to withdraw consent at any time. Write to " + C.email + " to exercise these rights. We reply within one month. You can also file a complaint with the French supervisory authority CNIL (www.cnil.fr) or your local EU authority.",
      ],
    },
    {
      h: "11. Security",
      body: [
        "We implement appropriate technical and organisational measures: encryption in transit and at rest, strict access control, environment isolation, logging.",
      ],
    },
    {
      h: "12. Cookies",
      body: [
        "See our dedicated Cookie Policy for the per-category detail and consent management.",
      ],
    },
    {
      h: "13. Minors",
      body: [
        "Tiquiz is reserved for adults. If a minor has sent us data, contact " + C.email + " for deletion.",
      ],
    },
    {
      h: "14. Changes",
      body: [
        "This policy may evolve. In case of material change, users are informed. Please check this page regularly.",
      ],
    },
    {
      h: "15. Contact",
      body: [
        `${C.name} — ${C.address} — ${C.email}.`,
        "Supervisory authority: CNIL (www.cnil.fr).",
      ],
    },
  ],
};

export const privacy: Record<string, LegalPage> = { fr, en, es: en, it: en, ar: en };
