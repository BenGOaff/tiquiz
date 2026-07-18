// lib/businessProfile.ts
// Profil business de l'eleve, capte a l'onboarding et reutilise partout
// (plan personnalise, coach, edition profil). Module partage (data pure).
import { PERSONAS, type Persona } from "@/lib/personas";

// L'activite EST le persona (pilote la personnalisation vocab + exemples).
export type ActivityType = Persona;
export type Maturity = "demarrage" | "audience" | "liste" | "ventes";
export type Monetization = "offres" | "affiliation" | "les_deux" | "pas_encore";
export type AdsBudget = "oui" | "non";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const ACTIVITY_OPTIONS: Option<ActivityType>[] = PERSONAS;

export const MATURITY_OPTIONS: Option<Maturity>[] = [
  { value: "demarrage", label: "Je débute, je n'ai pas encore d'audience" },
  { value: "audience", label: "J'ai une audience, mais pas de liste email" },
  { value: "liste", label: "J'ai déjà une liste email" },
  { value: "ventes", label: "Je vends déjà mes offres" },
];

export const MONETIZATION_OPTIONS: Option<Monetization>[] = [
  { value: "offres", label: "Je vends mes propres offres" },
  { value: "affiliation", label: "Je fais de l'affiliation (produits des autres)" },
  { value: "les_deux", label: "Les deux" },
  { value: "pas_encore", label: "Pas encore monétisé" },
];

export const ADS_OPTIONS: Option<AdsBudget>[] = [
  { value: "oui", label: "Oui, j'ai un budget pub" },
  { value: "non", label: "Non, gratuit pour l'instant" },
];

export const ACTIVITY_VALUES = ACTIVITY_OPTIONS.map((o) => o.value) as [ActivityType, ...ActivityType[]];
export const MATURITY_VALUES = MATURITY_OPTIONS.map((o) => o.value) as [Maturity, ...Maturity[]];
export const MONETIZATION_VALUES = MONETIZATION_OPTIONS.map((o) => o.value) as [
  Monetization,
  ...Monetization[],
];
export const ADS_VALUES = ADS_OPTIONS.map((o) => o.value) as [AdsBudget, ...AdsBudget[]];

export function labelOf<T extends string>(options: Option<T>[], value: string | null): string {
  return options.find((o) => o.value === value)?.label ?? "";
}
