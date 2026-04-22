import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Conditions générales de vente",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  intro: `Les présentes CGV régissent les relations entre ${C.name} (${C.form}, capital ${C.capital}, RCS ${C.rcs}, siège ${C.address}) — ci-après « le Vendeur » — et tout Client souscrivant aux services Tiquiz® sur tiquiz.com.`,
  sections: [
    {
      h: "Article 1 – Objet",
      body: [
        "Les CGV définissent les conditions d'accès et d'utilisation de Tiquiz®, application SaaS de création de quiz interactifs et de capture de leads.",
      ],
    },
    {
      h: "Article 2 – Description des services",
      body: [
        "Tiquiz est fourni à distance via une plateforme en ligne. Il permet notamment la création de quiz, la qualification de prospects, la synchronisation avec des outils tiers (Systeme.io, etc.) et la mesure de performances. Le Vendeur se réserve le droit de faire évoluer, modifier ou supprimer tout ou partie des fonctionnalités à tout moment.",
      ],
    },
    {
      h: "Article 3 – Offres et tarifs",
      body: [
        "Tiquiz propose une formule gratuite limitée et des abonnements payants (mensuels ou annuels), ainsi que, le cas échéant, des offres à durée limitée ou accès à vie bêta. Les prix sont en euros TTC. Le Vendeur se réserve le droit de modifier ses prix à tout moment avec information préalable.",
      ],
    },
    {
      h: "Article 4 – Commande et paiement",
      body: [
        "La souscription se fait exclusivement en ligne. Le contrat est formé dès la validation du paiement et l'acceptation des CGV. Les paiements sont réalisés via Stripe ou PayPal. Pour les abonnements, le Client autorise le prélèvement automatique à chaque échéance. En cas de défaut de paiement, le Vendeur se réserve le droit de suspendre ou résilier l'accès.",
      ],
    },
    {
      h: "Article 5 – Accès au service",
      body: [
        "L'accès est ouvert dès validation du paiement. Le Client est responsable de son compte et de la confidentialité de ses identifiants. Il s'engage à signaler toute utilisation frauduleuse.",
      ],
    },
    {
      h: "Article 6 – Droit de rétractation",
      body: [
        "Pour les prestations de fourniture d'un contenu numérique, le Client consommateur accepte expressément l'exécution immédiate du service dès validation. Il renonce expressément à son droit de rétractation. Cette renonciation est recueillie avant paiement.",
      ],
    },
    {
      h: "Article 7 – Remboursement",
      body: [
        "Aucun remboursement ne peut être accordé après validation de la commande. Une version gratuite est disponible pour un test préalable.",
      ],
    },
    {
      h: "Article 8 – Durée et résiliation",
      body: [
        "Les abonnements sont à durée indéterminée avec reconduction automatique. Le Client peut résilier à tout moment depuis son espace personnel. La résiliation prend effet à la fin de la période en cours, sans remboursement des sommes déjà versées.",
      ],
    },
    {
      h: "Article 9 – Données et sécurité",
      body: [
        "Le Vendeur met en œuvre des mesures techniques et organisationnelles appropriées (chiffrement, contrôle d'accès strict). Pour les leads captés par les quiz du Client, le Client est responsable de traitement, le Vendeur sous-traitant. Le Vendeur s'interdit toute utilisation des données du Client à des fins commerciales propres.",
      ],
    },
    {
      h: "Article 10 – Responsabilité",
      body: [
        "Le Vendeur est tenu à une obligation de moyens pour la fourniture du service, sans garantie de résultat commercial. Les contenus générés par IA peuvent comporter des erreurs ou inexactitudes ; le Client est seul responsable de leur vérification. La responsabilité du Vendeur est limitée aux sommes versées par le Client au cours des 12 derniers mois. Les dommages indirects sont exclus.",
      ],
    },
    {
      h: "Article 11 – Propriété intellectuelle",
      body: [
        "Le Vendeur reste titulaire des droits sur la plateforme, son architecture et son code. Le Client dispose d'un droit d'utilisation personnel, non exclusif et non transférable. Les contenus du Client (quiz, textes, images) restent sa propriété.",
      ],
    },
    {
      h: "Article 12 – Suspension et résiliation pour faute",
      body: [
        "Le Vendeur se réserve le droit de suspendre ou résilier l'accès sans préavis en cas de violation des CGV, de fraude, de non-paiement ou d'utilisation abusive.",
      ],
    },
    {
      h: "Article 13 – Données personnelles",
      body: [
        "Le traitement des données est détaillé dans la Politique de confidentialité.",
      ],
    },
    {
      h: "Article 14 – Modification des CGV",
      body: [
        "Le Vendeur peut modifier les CGV à tout moment. Les modifications sont notifiées préalablement à leur entrée en vigueur.",
      ],
    },
    {
      h: "Article 15 – Médiation",
      body: [
        "Le Client consommateur peut recourir gratuitement à un médiateur : CM2C, 14 rue Saint-Jean, 75017 Paris, www.cm2c.net.",
      ],
    },
    {
      h: "Article 16 – Droit applicable et juridiction",
      body: [
        "Les CGV sont soumises au droit français. Les consommateurs conservent la compétence des juridictions légales applicables. Pour les professionnels, les tribunaux du ressort de la Cour d'appel de Montpellier ont compétence exclusive.",
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Terms of Sale",
  lastUpdated: "Last updated: 04/22/2026",
  intro: `These Terms of Sale ("Terms") govern the relationship between ${C.name} (a ${C.form}, share capital ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045, registered office ${C.address}) — the "Vendor" — and any Customer subscribing to Tiquiz® on tiquiz.com.`,
  sections: [
    {
      h: "Article 1 – Purpose",
      body: [
        "These Terms set out the conditions of access to and use of Tiquiz®, a SaaS application to build interactive quizzes and capture leads.",
      ],
    },
    {
      h: "Article 2 – Service description",
      body: [
        "Tiquiz is delivered remotely through an online platform. It enables quiz creation, prospect qualification, syncing with third-party tools (Systeme.io, etc.) and performance analytics. The Vendor may change, evolve or remove part or all of the features at any time.",
      ],
    },
    {
      h: "Article 3 – Pricing",
      body: [
        "Tiquiz offers a limited free tier and paid subscriptions (monthly or yearly), plus occasional time-limited or lifetime-beta offers. Prices are displayed in euros, taxes included. The Vendor may change prices at any time with prior notice.",
      ],
    },
    {
      h: "Article 4 – Order and payment",
      body: [
        "Subscription happens exclusively online. The contract is formed upon payment validation and acceptance of these Terms. Payments are processed by Stripe or PayPal. Recurring subscriptions authorise automatic billing. In case of payment default, the Vendor may suspend or terminate access.",
      ],
    },
    {
      h: "Article 5 – Access",
      body: [
        "Access is granted upon payment validation. The Customer is responsible for their account and the confidentiality of their credentials, and must report any fraudulent use.",
      ],
    },
    {
      h: "Article 6 – Withdrawal",
      body: [
        "For digital service provision, the consumer Customer expressly accepts immediate execution of the service upon validation and expressly waives their statutory withdrawal right. This waiver is collected before payment.",
      ],
    },
    {
      h: "Article 7 – Refunds",
      body: [
        "No refund can be granted once the order is validated. A free tier is available to try the product beforehand.",
      ],
    },
    {
      h: "Article 8 – Term and termination",
      body: [
        "Subscriptions run for an indefinite term with automatic renewal. The Customer may cancel at any time from their account. Cancellation takes effect at the end of the current billing period; no pro-rata refund is issued.",
      ],
    },
    {
      h: "Article 9 – Data and security",
      body: [
        "The Vendor implements appropriate technical and organisational measures (encryption, strict access control). For leads captured through the Customer's quizzes, the Customer is the data controller and the Vendor is the processor. The Vendor will never use Customer data for its own commercial purposes.",
      ],
    },
    {
      h: "Article 10 – Liability",
      body: [
        "The Vendor has an obligation of means for service delivery, without guarantee of commercial outcome. AI-generated content may contain errors or inaccuracies; the Customer is solely responsible for review. The Vendor's liability is capped at the amounts paid by the Customer over the past 12 months. Indirect damages are excluded.",
      ],
    },
    {
      h: "Article 11 – Intellectual property",
      body: [
        "The Vendor retains the rights over the platform, its architecture and its code. The Customer has a personal, non-exclusive, non-transferable right of use. Customer-generated content (quizzes, text, images) remains the Customer's property.",
      ],
    },
    {
      h: "Article 12 – Suspension for cause",
      body: [
        "The Vendor may suspend or terminate access without notice in case of breach, fraud, non-payment or abusive use.",
      ],
    },
    {
      h: "Article 13 – Personal data",
      body: [
        "Data processing is detailed in the Privacy Policy.",
      ],
    },
    {
      h: "Article 14 – Changes",
      body: [
        "The Vendor may update these Terms at any time. Changes are notified before they take effect.",
      ],
    },
    {
      h: "Article 15 – Mediation",
      body: [
        "Consumer Customers may access free of charge the CM2C mediator: 14 rue Saint-Jean, 75017 Paris, France — www.cm2c.net.",
      ],
    },
    {
      h: "Article 16 – Governing law and jurisdiction",
      body: [
        "These Terms are governed by French law. Consumers retain the benefit of the mandatory rules of their country of residence. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have exclusive jurisdiction.",
      ],
    },
  ],
};

export const terms: Record<string, LegalPage> = { fr, en, es: en, it: en, ar: en };
