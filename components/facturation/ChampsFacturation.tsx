"use client";

// components/facturation/ChampsFacturation.tsx
//
// LES MÊMES CHAMPS AUX TROIS ENDROITS.
//
// Béné, 24 août : "l'entreprise (si concerné), l'adresse, le pays, la
// tva (si concerné), prénom, nom, adresse email, bref tout ce qu'il faut
// pour une facture légale et que je puisse mettre à jour si demande du
// client : lui aussi doit avoir ces infos et pouvoir les mettre à jour."
//
// Trois écrans les affichent : le bon de commande PayPal, l'espace
// client, et la fiche admin. Trois formulaires écrits séparément
// finiraient par ne pas demander les mêmes choses, et c'est le champ
// absent du troisième qui manquerait sur la facture. (Sixième fois que
// ce défaut sort dans ce dépôt : les réseaux de partage, le score,
// l'alignement, la disposition des réponses, l'aperçu de l'éditeur.)
//
// "SI CONCERNÉ" EST DANS LA DEMANDE, DONC DANS L'ÉCRAN : la société et
// le numéro de TVA sont dans un volet qui ne s'ouvre que si on le
// demande. Un particulier n'a pas à regarder deux cases qu'il ne
// remplira jamais, et une case vide qu'on a vue donne l'impression
// d'avoir oublié quelque chose.

import { useMemo, useState } from "react";

import { optionsPays } from "@/lib/facture/pays";
import type { Acheteur } from "@/lib/facture/identite";

export type ChampsAcheteur = Acheteur;

export const ACHETEUR_FORM_VIDE: ChampsAcheteur = {
  email: null, prenom: null, nom: null, societe: null, tvaNumero: null,
  adresse1: null, adresse2: null, codePostal: null, ville: null, pays: null,
};

const cadre =
  "mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function Champ({
  label, valeur, onChange, placeholder, requis, type = "text", autoComplete,
}: {
  label: string;
  valeur: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  requis?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {requis && <span className="text-red-600"> *</span>}
      <input
        type={type}
        value={valeur ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cadre}
      />
    </label>
  );
}

export default function ChampsFacturation({
  valeur,
  onChange,
  locale = "fr",
  montrerEmail = false,
}: {
  valeur: ChampsAcheteur;
  onChange: (v: ChampsAcheteur) => void;
  locale?: string;
  /** L'espace client peut recevoir ses factures à une autre adresse. */
  montrerEmail?: boolean;
}) {
  const pays = useMemo(() => optionsPays(locale), [locale]);
  // Ouvert d'office si la personne a DÉJÀ rempli une de ces cases :
  // sinon elle ne verrait pas ce qu'elle a écrit et croirait l'avoir
  // perdu.
  const [pro, setPro] = useState(!!(valeur.societe || valeur.tvaNumero));

  // LE NUMÉRO DE TVA REMPLIT LE FORMULAIRE (Béné, 27 août 2026).
  //
  // "On peut faire que l'user rentre son numéro de tva et hop les
  // données sont récupérées et tout ce qui doit être rempli l'est pour
  // la facturation ?"
  //
  // VIES renvoie la raison sociale et l'adresse déclarées auprès de
  // l'administration du pays : c'est plus juste qu'une saisie à la main,
  // parce que c'est exactement ce que le fisc a dans ses fichiers. Et le
  // numéro est vérifié TOUT DE SUITE, donc la personne apprend ici qu'il
  // est faux, au lieu de le découvrir sur une facture avec de la TVA
  // qu'elle n'attendait pas.
  const [verif, setVerif] = useState<
    { etat: "encours" } | { etat: "fait"; verdict: string; rempli: string[] } | null
  >(null);

  async function verifierTva() {
    const numero = String(valeur.tvaNumero ?? "").trim();
    if (!numero) return;
    setVerif({ etat: "encours" });
    try {
      const r = await fetch("/api/facturation/verifier-tva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        verdict?: string;
        identite?: { nom?: string | null; adresse?: string | null };
      };
      if (!j.ok || !j.verdict) {
        setVerif({ etat: "fait", verdict: "injoignable", rempli: [] });
        return;
      }
      // ON NE REMPLACE JAMAIS CE QU'ELLE A ÉCRIT. On ne remplit que le
      // vide : quelqu'un qui a corrigé son adresse la semaine dernière
      // ne doit pas la voir écrasée par le fichier d'un État.
      const suivant = { ...valeur };
      const rempli: string[] = [];
      if (j.verdict === "valide" && j.identite?.nom && !suivant.societe) {
        suivant.societe = j.identite.nom;
        rempli.push("Entreprise");
      }
      if (j.verdict === "valide" && j.identite?.adresse && !suivant.adresse1) {
        suivant.adresse1 = j.identite.adresse;
        rempli.push("Adresse");
      }
      if (rempli.length) onChange(suivant);
      setVerif({ etat: "fait", verdict: j.verdict, rempli });
    } catch {
      setVerif({ etat: "fait", verdict: "injoignable", rempli: [] });
    }
  }

  const set = (champ: keyof ChampsAcheteur) => (v: string) =>
    onChange({ ...valeur, [champ]: v.trim() ? v : null });

  const dansLUnion = pays.filter((p) => p.union);
  const horsUnion = pays.filter((p) => !p.union);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="Prénom" valeur={valeur.prenom} onChange={set("prenom")} requis autoComplete="given-name" />
        <Champ label="Nom" valeur={valeur.nom} onChange={set("nom")} requis autoComplete="family-name" />
      </div>

      {montrerEmail && (
        <Champ
          label="Email de facturation"
          type="email"
          valeur={valeur.email}
          onChange={set("email")}
          placeholder="si tes factures doivent partir ailleurs"
          autoComplete="email"
        />
      )}

      <Champ label="Adresse" valeur={valeur.adresse1} onChange={set("adresse1")} requis autoComplete="address-line1" />
      <Champ
        label="Complément d'adresse"
        valeur={valeur.adresse2}
        onChange={set("adresse2")}
        placeholder="bâtiment, étage, boîte postale"
        autoComplete="address-line2"
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Champ label="Code postal" valeur={valeur.codePostal} onChange={set("codePostal")} requis autoComplete="postal-code" />
        <Champ label="Ville" valeur={valeur.ville} onChange={set("ville")} requis autoComplete="address-level2" />
      </div>

      <label className="block text-sm font-medium">
        Pays<span className="text-red-600"> *</span>
        <select
          value={valeur.pays ?? ""}
          onChange={(e) => onChange({ ...valeur, pays: e.target.value || null })}
          autoComplete="country"
          className={cadre}
        >
          <option value="">Choisir un pays</option>
          <optgroup label="Union européenne">
            {dansLUnion.map((p) => (
              <option key={p.code} value={p.code}>{p.nom}</option>
            ))}
          </optgroup>
          <optgroup label="Reste du monde">
            {horsUnion.map((p) => (
              <option key={p.code} value={p.code}>{p.nom}</option>
            ))}
          </optgroup>
        </select>
      </label>

      {/* "si concerné" : le volet entreprise. */}
      {!pro ? (
        <button
          type="button"
          onClick={() => setPro(true)}
          className="text-sm font-medium text-primary underline underline-offset-2"
        >
          J&apos;achète pour une entreprise
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <Champ label="Entreprise" valeur={valeur.societe} onChange={set("societe")} autoComplete="organization" />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Champ
                label="Numéro de TVA intracommunautaire"
                valeur={valeur.tvaNumero}
                onChange={(v) => {
                  setVerif(null);
                  set("tvaNumero")(v);
                }}
                placeholder="BE0123456789"
              />
            </div>
            <button
              type="button"
              onClick={() => void verifierTva()}
              disabled={!valeur.tvaNumero || verif?.etat === "encours"}
              className="h-10 shrink-0 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {verif?.etat === "encours" ? "Vérification..." : "Vérifier"}
            </button>
          </div>

          {/* TROIS RÉPONSES, TROIS PHRASES. "Injoignable" est le cas le
              plus fréquent : VIES interroge les administrations en
              direct, il est lent et il tombe souvent. Le présenter comme
              un refus ferait croire à un numéro faux, et la personne
              corrigerait quelque chose de juste. */}
          {verif?.etat === "fait" && (
            <p
              className={`text-xs ${
                verif.verdict === "valide"
                  ? "text-emerald-700"
                  : verif.verdict === "invalide"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {verif.verdict === "valide"
                ? verif.rempli.length
                  ? `Numéro valide. Rempli pour toi : ${verif.rempli.join(", ").toLowerCase()}.`
                  : "Numéro valide. Ce pays ne publie pas le nom ni l'adresse de l'entreprise, à toi de les compléter."
                : verif.verdict === "invalide"
                  ? "Ce numéro n'existe pas dans le registre européen. Vérifie la saisie : sans numéro valide, la TVA de ton pays s'applique."
                  : "Le registre européen ne répond pas en ce moment. Ce n'est pas ton numéro qui est en cause, tu peux continuer."}
            </p>
          )}
          {/* On dit ce que ça fait, sinon personne ne le remplit, et on
              dit aussi ce que ça ne fait PAS : en France la TVA reste
              due, quel que soit le numéro. C'est la question qui revient. */}
          <p className="text-xs text-muted-foreground">
            Un numéro valide dans un pays de l&apos;Union autre que la France fait basculer la
            facture en autoliquidation. En France, la TVA reste due dans tous les cas.
          </p>
        </div>
      )}
    </div>
  );
}
