// lib/integrations/envoyer.ts
//
// ENVOYER UN LEAD VERS SA DESTINATION, ET RÉAGIR À CE QUI REVIENT.
//
// C'est le seul endroit qui appelle un adaptateur pour un lead. La route
// de capture, la route de partage et le renvoi depuis Mes leads passent
// tous par ici : trois chemins qui décideraient chacun de leur côté
// finiraient par ne plus réagir pareil à un 401 (règle des six
// jumeaux qui divergent).
//
// -- CE QUI SE PASSE SUR UN 401 / 403 ----------------------------------
//
// `classerEchecEnvoi` (pur) le lit comme "déconnecté". On marque la
// connexion, et on prévient la créatrice UNE fois
// (`doitAlerterDeconnexion`). Un 5xx ou une panne réseau ne touche à
// rien : c'est temporaire, et un email "déconnecté" sur une panne de
// dix minutes ferait ressaisir un jeton valide.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { alerterConnexionCoupee } from "@/lib/email/connexionAlerte";
import type { ChargeLead, ResultatEnvoi } from "@/lib/integrations/charge";
import { classerEchecEnvoi, doitAlerterDeconnexion } from "@/lib/integrations/decision";
import { ficheFournisseur } from "@/lib/integrations/fournisseurs";
import { envoyerVersGhl } from "@/lib/integrations/adaptateurs/gohighlevel";
import { envoyerVersSystemeio } from "@/lib/integrations/adaptateurs/systemeio";
import { marquerEtatCleSio, marquerEtatConnexion, type Destination } from "@/lib/integrations/store";

export type ResultatEnvoiLead =
  | (ResultatEnvoi & { fournisseur: "systemeio" | "gohighlevel" })
  | { ok: false; status: 0; tagsPoses: readonly []; erreur: string; fournisseur: string; pause: true }
  | { ok: false; status: 401; tagsPoses: readonly []; erreur: string; fournisseur: string; deconnecte: true };

/**
 * `userId` est celui de la PROPRIÉTAIRE du quiz : c'est elle qu'on
 * prévient si sa connexion est coupée.
 */
export async function envoyerLead(dest: Destination, charge: ChargeLead, userId: string): Promise<ResultatEnvoiLead | null> {
  if (!dest) return null;

  if (dest.type === "pause") {
    return { ok: false, status: 0, tagsPoses: [], erreur: `connexion ${dest.fournisseur} en pause`, fournisseur: dest.fournisseur, pause: true };
  }

  if (dest.type === "deconnecte") {
    await surDeconnexion({ type: "connexion", id: dest.connexionId, fournisseur: dest.fournisseur, alerteDeja: dest.alerteDeja, userId, erreur: "jeton refuse" });
    return { ok: false, status: 401, tagsPoses: [], erreur: `connexion ${dest.fournisseur} deconnectee`, fournisseur: dest.fournisseur, deconnecte: true };
  }

  if (dest.type === "gohighlevel") {
    const r = await envoyerVersGhl({ token: dest.token, locationId: dest.locationId }, charge);
    if (!r.ok && classerEchecEnvoi(r.status) === "deconnecte") {
      await surDeconnexion({ type: "connexion", id: dest.connexionId, fournisseur: "gohighlevel", alerteDeja: dest.alerteDeja, userId, erreur: r.erreur ?? null, nom: dest.nom });
    } else if (r.ok) {
      await marquerEtatConnexion(dest.connexionId, "ok").catch(() => {});
    }
    return { ...r, fournisseur: "gohighlevel" };
  }

  const r = await envoyerVersSystemeio(dest.apiKey, charge);
  if (!r.ok && classerEchecEnvoi(r.status) === "deconnecte" && dest.keyId) {
    const { data } = await supabaseAdmin
      .from("sio_api_keys")
      .select("name, alerte_deconnexion_le")
      .eq("id", dest.keyId)
      .maybeSingle();
    const row = data as { name?: string; alerte_deconnexion_le?: string | null } | null;
    await surDeconnexion({
      type: "cle-sio",
      id: dest.keyId,
      fournisseur: "systemeio",
      alerteDeja: (row?.alerte_deconnexion_le ?? null) !== null,
      userId,
      erreur: r.erreur ?? null,
      nom: row?.name ?? "Systeme.io",
    });
  }
  return { ...r, fournisseur: "systemeio" };
}

async function surDeconnexion(a: {
  type: "connexion" | "cle-sio";
  id: string;
  fournisseur: string;
  alerteDeja: boolean;
  userId: string;
  erreur: string | null;
  nom?: string;
}): Promise<void> {
  const outil = ficheFournisseur(a.fournisseur)?.nom ?? a.fournisseur;
  let envoyee = false;
  if (doitAlerterDeconnexion({ alerte_deconnexion_le: a.alerteDeja ? "deja" : null })) {
    envoyee = await alerterConnexionCoupee({ userId: a.userId, outil, nomConnexion: a.nom ?? outil });
  }
  console.error(`[connexions] ${outil} a refuse le jeton de ${a.id} : ${a.erreur ?? "401"}${envoyee ? " (alerte envoyee)" : ""}`);
  try {
    if (a.type === "connexion") await marquerEtatConnexion(a.id, "deconnecte", { erreur: a.erreur, alerteEnvoyee: envoyee });
    else await marquerEtatCleSio(a.id, "deconnecte", { alerteEnvoyee: envoyee });
  } catch (e) {
    console.error("[connexions] marquage impossible", e instanceof Error ? e.message : e);
  }
}
