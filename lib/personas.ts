// lib/personas.ts
// Personas eleve : meme parcours pour tous, mais vocabulaire et exemples
// declines par famille de metier. Module partage (data pure).

export type Persona =
  | "freelance"
  | "infopreneur"
  | "coach"
  | "auteur"
  | "createur"
  | "affilie"
  | "mlm"
  | "autre";

export const PERSONAS: { value: Persona; label: string }[] = [
  { value: "freelance", label: "Freelance / prestataire de services" },
  { value: "infopreneur", label: "Infopreneur (je vends des formations)" },
  { value: "coach", label: "Coach ou consultant" },
  { value: "auteur", label: "Auteur" },
  { value: "createur", label: "Créateur de contenu" },
  { value: "affilie", label: "Affilié (marketing d'affiliation)" },
  { value: "mlm", label: "Marketing de réseau" },
  { value: "autre", label: "Autre" },
];

// Termes du glossaire : mots remplacables dans le contenu commun via
// {offre}, {client}, {audience}, {expertise}.
export const GLOSSARY_TERMS = ["offre", "client", "audience", "expertise"] as const;
export type GlossaryTerm = (typeof GLOSSARY_TERMS)[number];

export type Vocab = Record<GlossaryTerm, string>;

// Repli neutre (persona "autre" ou terme manquant).
export const DEFAULT_VOCAB: Vocab = {
  offre: "ton offre",
  client: "ton client",
  audience: "ton audience",
  expertise: "ton expertise",
};

// Vocabulaire seede par persona (modifiable ensuite dans l'admin).
export const PERSONA_VOCAB: Record<Persona, Vocab> = {
  freelance: {
    offre: "ta prestation",
    client: "ton client",
    audience: "tes prospects",
    expertise: "ton savoir-faire",
  },
  infopreneur: {
    offre: "ta formation",
    client: "ton élève",
    audience: "ton audience",
    expertise: "ta méthode",
  },
  coach: {
    offre: "ton accompagnement",
    client: "ton client",
    audience: "ton audience",
    expertise: "ta méthode",
  },
  auteur: {
    offre: "ton livre",
    client: "ton lecteur",
    audience: "ta communauté de lecteurs",
    expertise: "ton univers",
  },
  createur: {
    offre: "ton offre",
    client: "ton abonné",
    audience: "ta communauté",
    expertise: "ta ligne éditoriale",
  },
  affilie: {
    offre: "le produit que tu recommandes",
    client: "ton filleul",
    audience: "ton audience",
    expertise: "ta sélection",
  },
  mlm: {
    offre: "tes produits",
    client: "ton client",
    audience: "ton réseau",
    expertise: "ton opportunité",
  },
  autre: { ...DEFAULT_VOCAB },
};

// Mappe une valeur stockee (activity_type, incluant d'anciens libelles)
// vers un persona connu.
export function resolvePersona(value: string | null | undefined): Persona {
  const v = (value ?? "").toLowerCase().trim();
  const aliases: Record<string, Persona> = {
    freelance: "freelance",
    infopreneur: "infopreneur",
    formateur: "infopreneur",
    coach: "coach",
    consultant: "coach",
    auteur: "auteur",
    createur: "createur",
    affilie: "affilie",
    affiliation: "affilie",
    mlm: "mlm",
    ecommerce: "autre",
    autre: "autre",
  };
  return aliases[v] ?? "autre";
}

export function personaLabel(p: Persona): string {
  return PERSONAS.find((x) => x.value === p)?.label ?? "Autre";
}

// Libelle court pour l'entete de l'encart "Pour toi, X". null = pas de
// metier nomme (persona "autre"), on affiche juste "Pour toi".
const PERSONA_SHORT: Record<Persona, string | null> = {
  freelance: "freelance",
  infopreneur: "infopreneur",
  coach: "coach",
  auteur: "auteur",
  createur: "créateur de contenu",
  affilie: "affilié",
  mlm: "marketing de réseau",
  autre: null,
};

/** Entete personnalisee de l'encart : "Pour toi, coach" ou juste "Pour toi". */
export function personaTailoredHeading(p: Persona): string {
  const short = PERSONA_SHORT[p];
  return short ? `Pour toi, ${short}` : "Pour toi";
}

/** Vocab effectif : defauts neutres + surcharge eventuelle (DB ou seed). */
export function mergeVocab(override?: Partial<Vocab> | null): Vocab {
  return { ...DEFAULT_VOCAB, ...(override ?? {}) };
}
