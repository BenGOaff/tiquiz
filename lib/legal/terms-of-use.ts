import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Conditions générales d'utilisation",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `Les présentes CGU définissent les conditions d'accès et d'utilisation de Tiquiz® et du site tiquiz.com, édités par ${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, siège ${C.address}). L'accès au service implique l'acceptation sans réserve des CGU. Elles complètent les Conditions générales de vente.`,
  sections: [
    {
      h: "Article 1 – Définitions",
      body: [
        [
          "Plateforme : l'application Tiquiz® et le site tiquiz.com.",
          "Utilisateur : toute personne accédant à la Plateforme.",
          "Compte : espace personnel permettant d'accéder aux services.",
          "Contenus Utilisateur : les données, textes et médias saisis par l'Utilisateur.",
          "Contenus Générés : contenus produits via les fonctionnalités d'IA.",
          "Services : l'ensemble des fonctionnalités proposées.",
        ],
      ],
    },
    {
      h: "Article 2 – Accès aux services",
      body: [
        "L'accès est réservé aux personnes majeures disposant de la capacité juridique. L'Utilisateur doit fournir des informations exactes et à jour, maintenir la confidentialité de ses identifiants et signaler tout accès non autorisé.",
      ],
    },
    {
      h: "Article 3 – Description des services",
      body: [
        "Tiquiz® est une application SaaS permettant de créer des quiz interactifs, capturer des leads, segmenter les prospects et synchroniser avec des outils marketing tiers. Les fonctionnalités peuvent évoluer sans préavis.",
      ],
    },
    {
      h: "Article 4 – Données et sécurité",
      body: [
        "L'Éditeur met en œuvre des mesures techniques et organisationnelles appropriées (chiffrement, contrôle d'accès, isolation logique). L'accès aux données utilisateur est strictement limité à la fourniture du service, à la maintenance, à la sécurité ou aux obligations légales.",
        "Pour les leads captés, l'Utilisateur agit en tant que responsable de traitement au sens du RGPD ; l'Éditeur agit en sous-traitant et s'engage à respecter la réglementation.",
      ],
    },
    {
      h: "Article 5 – Règles d'utilisation",
      body: [
        "Sont notamment interdits :",
        [
          "L'utilisation à des fins illégales, frauduleuses ou contraires à l'ordre public.",
          "La diffusion de contenus contraires aux droits des tiers ou à la dignité humaine.",
          "Le spam, le phishing ou toute pratique trompeuse.",
          "Toute tentative de porter atteinte à la sécurité ou au fonctionnement de la plateforme.",
          "La revente ou mise à disposition non autorisée du service à des tiers.",
        ],
      ],
    },
    {
      h: "Article 6 – Contenus",
      body: [
        "L'Utilisateur conserve l'intégralité des droits sur ses Contenus Utilisateur et accorde à l'Éditeur une licence non exclusive strictement limitée à la fourniture du service.",
        "Les Contenus Générés par IA sont fournis à titre informatif et peuvent comporter des erreurs. L'Utilisateur est seul responsable de leur vérification et de leur utilisation.",
      ],
    },
    {
      h: "Article 7 – Disponibilité",
      body: [
        "L'Éditeur s'efforce d'assurer la continuité du service mais celui-ci peut être suspendu pour maintenance, sécurité ou défaillance de fournisseurs tiers. Aucune garantie de disponibilité permanente n'est fournie.",
      ],
    },
    {
      h: "Article 8 – Responsabilité",
      body: [
        "L'Utilisateur assume seul la responsabilité des informations fournies, des contenus publiés et de l'usage des services. L'Éditeur est tenu à une obligation de moyens, sans garantie de résultat ni de performance économique. Sa responsabilité n'est pas engagée pour les dommages indirects.",
      ],
    },
    {
      h: "Article 9 – Suspension",
      body: [
        "L'Éditeur peut suspendre l'accès sans préavis en cas de violation des CGU, de fraude, de non-paiement ou d'utilisation abusive.",
      ],
    },
    {
      h: "Article 10 – Résiliation et suppression du compte",
      body: [
        "L'Utilisateur peut supprimer son compte à tout moment. Après suppression, l'accès est immédiatement interrompu ; les données peuvent être conservées temporairement pour raisons légales puis supprimées ou anonymisées. Un export des données peut être demandé avant suppression.",
      ],
    },
    {
      h: "Article 11 – Modification des CGU",
      body: [
        "L'Éditeur peut modifier les CGU à tout moment. Les modifications sont portées à la connaissance des Utilisateurs ; la poursuite de l'utilisation vaut acceptation.",
      ],
    },
    {
      h: "Article 12 – Droit applicable",
      body: [
        "Les CGU sont régies par le droit français. Pour les professionnels, les tribunaux du ressort de la Cour d'appel de Montpellier sont compétents.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

const en: LegalPage = {
  title: "Terms of Use",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `These Terms of Use govern access to and use of Tiquiz® and tiquiz.com, published by ${C.name} (a ${C.form}, share capital ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}). Accessing the service implies full acceptance of these Terms. They complement the Terms of Sale.`,
  sections: [
    {
      h: "Article 1 – Definitions",
      body: [
        [
          "Platform: the Tiquiz® application and tiquiz.com.",
          "User: any person accessing the Platform.",
          "Account: the personal area used to access the services.",
          "User Content: data, text and media entered by the User.",
          "Generated Content: output produced through AI features.",
          "Services: the full feature set offered.",
        ],
      ],
    },
    {
      h: "Article 2 – Access",
      body: [
        "Access is reserved to adults with legal capacity. Users must supply accurate, up-to-date information, keep their credentials confidential and report any unauthorised access.",
      ],
    },
    {
      h: "Article 3 – Service description",
      body: [
        "Tiquiz® is a SaaS application to build interactive quizzes, capture leads, segment prospects and sync with third-party marketing tools. Features may evolve without notice.",
      ],
    },
    {
      h: "Article 4 – Data and security",
      body: [
        "The Publisher implements appropriate technical and organisational measures (encryption, access control, logical isolation). Access to user data is strictly limited to service delivery, maintenance, security and legal obligations.",
        "For captured leads, the User acts as data controller under GDPR; the Publisher acts as processor and undertakes to comply with the applicable regulation.",
      ],
    },
    {
      h: "Article 5 – Usage rules",
      body: [
        "The following are prohibited:",
        [
          "Use for illegal, fraudulent or public-order-violating purposes.",
          "Publishing content that infringes third-party rights or human dignity.",
          "Spam, phishing or deceptive practices.",
          "Any attempt to compromise the platform's security or functioning.",
          "Reselling or making the service available to third parties without authorisation.",
        ],
      ],
    },
    {
      h: "Article 6 – Content",
      body: [
        "Users retain full rights over their User Content and grant the Publisher a non-exclusive licence strictly limited to delivering the service.",
        "AI-Generated Content is informational and may contain errors. Users are solely responsible for review and use.",
      ],
    },
    {
      h: "Article 7 – Availability",
      body: [
        "The Publisher makes reasonable efforts to keep the service available but it may be suspended for maintenance, security or third-party outages. No guarantee of permanent availability is offered.",
      ],
    },
    {
      h: "Article 8 – Liability",
      body: [
        "Users are solely responsible for the information they provide, the content they publish and their use of the service. The Publisher has an obligation of means, without guarantee of outcome or economic performance, and is not liable for indirect damages.",
      ],
    },
    {
      h: "Article 9 – Suspension",
      body: [
        "The Publisher may suspend access without notice in case of breach, fraud, non-payment or abusive use.",
      ],
    },
    {
      h: "Article 10 – Account termination",
      body: [
        "Users may delete their account at any time. After deletion, access is immediately cut; data may be kept temporarily for legal reasons and then deleted or anonymised. A data export can be requested before deletion.",
      ],
    },
    {
      h: "Article 11 – Changes",
      body: [
        "The Publisher may update these Terms at any time. Users are informed of changes; continued use implies acceptance.",
      ],
    },
    {
      h: "Article 12 – Governing law",
      body: [
        "These Terms are governed by French law. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have jurisdiction.",
      ],
    },
    {
      h: "Contact",
      body: [`${C.name} — ${C.address} — ${C.email}.`],
    },
  ],
};

export const termsOfUse: Record<string, LegalPage> = { fr, en, es: en, it: en, ar: en };
