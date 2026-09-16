// lib/integrations/charge.ts
//
// CE QU'ON ENVOIE À L'OUTIL, QUEL QU'IL SOIT.
//
// PUR. La route de capture construit cette charge UNE fois, et chaque
// adaptateur (Systeme.io, GoHighLevel...) la traduit dans son API. Ce
// qui a de la valeur ici, ce sont les NOMS de tags que la créatrice a
// écrits : ils sont les mêmes quel que soit l'outil, et c'est ce qui
// fait qu'un quiz peut changer de destination sans être refait.

import type { ChampContactPerso } from "@/lib/integrations/champsContact";

export interface ChargeLead {
  email: string;
  prenom?: string | null;
  nom?: string | null;
  telephone?: string | null;
  pays?: string | null;
  /** Les tags à poser, déjà fusionnés (voir `fusionnerTags`). */
  tags: readonly string[];
  /** Le titre du profil obtenu, en texte. Vide sur un sondage. */
  profilTitre?: string | null;
  /** Systeme.io seulement : la formation à ouvrir. */
  courseId?: string | null;
  /** Systeme.io seulement : la communauté à ouvrir. */
  communityId?: string | null;
  /** D'où vient le contact, pour les outils qui ont un champ "source". */
  source?: string | null;
  /**
   * Les champs personnalisés du formulaire, avec leur valeur (Béné,
   * 16 septembre 2026). Décidés par `champsContactPersonnalises`, jamais
   * recomposés dans un adaptateur.
   */
  champs?: readonly ChampContactPerso[];
}

/**
 * Fusionne les familles de tags dans l'ORDRE DU PARCOURS, sans
 * doublon (insensible à la casse : un tag écrit "Coach" sur le profil
 * et "coach" sur une réponse est le même tag chez tous ces outils).
 *
 * L'ordre compte pour la lecture : le profil d'abord, puis la capture
 * du sondage, puis les réponses, puis les scores. C'est celui de
 * `planSysteme.ts`, et l'onglet Automatiser annonce les mêmes.
 */
export function fusionnerTags(...familles: readonly (readonly (string | null | undefined)[])[]): string[] {
  const vus = new Set<string>();
  const sortie: string[] = [];
  for (const famille of familles) {
    for (const brut of famille) {
      const t = String(brut ?? "").trim();
      if (!t) continue;
      const cle = t.toLowerCase();
      if (vus.has(cle)) continue;
      vus.add(cle);
      sortie.push(t);
    }
  }
  return sortie;
}

/** Ce que l'envoi rend, quel que soit l'outil. */
export interface ResultatEnvoi {
  ok: boolean;
  /** Le statut HTTP qui a tranché (0 = réseau). */
  status: number;
  /** L'identifiant du contact chez l'outil, quand on l'a. */
  contactId?: string | null;
  /** Les tags effectivement posés. */
  tagsPoses: readonly string[];
  /** La raison d'un échec, pour le journal et `derniere_erreur`. */
  erreur?: string | null;
}
