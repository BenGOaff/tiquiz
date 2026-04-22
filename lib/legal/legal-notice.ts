import type { LegalPage } from "./types";
import { COMPANY as C } from "./company";

const fr: LegalPage = {
  title: "Mentions légales",
  lastUpdated: "Dernière mise à jour : 22/04/2026",
  sections: [
    {
      h: "Éditeur",
      body: [
        `${C.name}, ${C.form} au capital de ${C.capital}, immatriculée au RCS sous le numéro ${C.rcs}. Siège social : ${C.address}.`,
        `TVA : ${C.vat} — Contact : ${C.email}.`,
      ],
    },
    {
      h: "Périmètre",
      body: [
        "Les présentes mentions couvrent le site de présentation tiquiz.com et l'application Tiquiz (quiz.tiquiz.com ou équivalent).",
      ],
    },
    {
      h: "Directeur de la publication",
      body: [`${C.director}, dirigeante de ${C.name}.`],
    },
    {
      h: "Hébergement",
      body: [
        [
          "Application : Hostinger",
          "Base de données et authentification : Supabase",
          "Pages marketing : ITACWT Limited (Systeme.io), Dublin, Irlande",
        ],
      ],
    },
    {
      h: "Nature de l'activité",
      body: [
        "Édition d'un logiciel en mode SaaS permettant de créer des quiz interactifs, capturer des leads qualifiés et synchroniser avec les outils marketing du créateur.",
      ],
    },
    {
      h: "Propriété intellectuelle",
      body: [
        "Le nom, la marque Tiquiz®, le logo, les interfaces, le code et l'ensemble des contenus sont protégés. Toute reproduction, représentation, modification ou exploitation, totale ou partielle, est interdite sans autorisation écrite.",
      ],
    },
    {
      h: "Contenus générés par IA",
      body: [
        "Les quiz, titres, questions et résultats générés par l'IA peuvent comporter des erreurs, approximations ou inexactitudes. L'utilisateur reste responsable de leur relecture et de leur utilisation.",
      ],
    },
    {
      h: "Responsabilité",
      body: [
        `${C.name} décline toute responsabilité en cas de dommages indirects, notamment perte de chiffre d'affaires, perte de données ou atteinte à l'image.`,
      ],
    },
    {
      h: "Juridiction",
      body: [
        "Droit français applicable. Pour les professionnels, compétence exclusive des tribunaux du ressort de la Cour d'appel de Montpellier.",
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Legal Notice",
  lastUpdated: "Last updated: 04/22/2026",
  sections: [
    {
      h: "Publisher",
      body: [
        `${C.name}, a ${C.form} with a share capital of ${C.capital}, registered with the Montpellier Trade Registry under no. 909 349 045. Registered office: ${C.address}.`,
        `VAT: ${C.vat} — Contact: ${C.email}.`,
      ],
    },
    {
      h: "Scope",
      body: [
        "This notice covers the marketing site tiquiz.com and the Tiquiz application.",
      ],
    },
    {
      h: "Director of publication",
      body: [`${C.director}, director of ${C.name}.`],
    },
    {
      h: "Hosting",
      body: [
        [
          "Application: Hostinger",
          "Database and authentication: Supabase",
          "Marketing pages: ITACWT Limited (Systeme.io), Dublin, Ireland",
        ],
      ],
    },
    {
      h: "Business activity",
      body: [
        "SaaS software publisher, providing an application to create interactive quizzes, capture qualified leads and sync with the creator's marketing stack.",
      ],
    },
    {
      h: "Intellectual property",
      body: [
        "The Tiquiz® name and logo, the interfaces, the code and every piece of content are protected. Any reproduction, modification or exploitation — full or partial — is forbidden without prior written consent.",
      ],
    },
    {
      h: "AI-generated content",
      body: [
        "Quizzes, titles, questions and results produced by the AI may contain errors, approximations or inaccuracies. It is the user's responsibility to review them before use.",
      ],
    },
    {
      h: "Liability",
      body: [
        `${C.name} disclaims any liability for indirect damages, including loss of revenue, loss of data or reputational damage.`,
      ],
    },
    {
      h: "Jurisdiction",
      body: [
        "French law applies. For professional users, the courts under the jurisdiction of the Montpellier Court of Appeal have exclusive jurisdiction.",
      ],
    },
  ],
};

export const legal: Record<string, LegalPage> = { fr, en, es: en, it: en, ar: en };
