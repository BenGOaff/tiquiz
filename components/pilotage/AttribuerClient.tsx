"use client";

// components/pilotage/AttribuerClient.tsx
//
// ATTRIBUER UN CLIENT À CET AFFILIÉ, À LA MAIN (Béné, 18 septembre 2026).
//
// "Je ne veux pas créditer automatiquement un affilié, en revanche s'il
// me prouve que le lien n'a pas fonctionné, je veux pouvoir lui
// attribuer un client manuellement et qu'il devienne son affilié, et
// qu'il touche les commissions. Mais ça doit rester manuel depuis
// pilotage affiliation."
//
// -- TROIS TEMPS, ET LE PREMIER EST LE PLUS IMPORTANT ------------------
//
// 1. ON REGARDE D'ABORD. L'adresse saisie, on demande au registre ce
//    qu'il sait déjà d'elle : rattachée à qui, depuis quand, et par
//    quel chemin. Un bouton qui agirait sans montrer ça ferait prendre
//    un filleul à un autre affilié sans que personne le voie.
// 2. ON MONTRE CE QUI SERA REJOUÉ. Ses encaissements, avec leurs
//    montants : le rattachement seul ne paie rien sur le passé, et
//    cliquer sans savoir combien ça crée n'est pas une décision.
// 3. ON AGIT, et seulement alors.
//
// -- LE CONFLIT NE SE RÉSOUT JAMAIS TOUT SEUL -------------------------
//
// Si la personne appartient déjà à quelqu'un d'autre, le serveur
// REFUSE, et cet écran affiche à qui. Le remplacement existe, il est
// derrière une deuxième confirmation nommée, et il porte le nom de
// l'affilié à qui on retire le filleul. Le PREMIER rattachement gagne
// (règle du 26 août) : l'écraser est un geste, pas un réglage.
//
// Aucune décision ici : tout vient du serveur.

import { useCallback, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CARTE } from "@/components/pilotage/carte";

interface Encaissement {
  reference: string;
  quand: string;
  montantCents: number;
  produit: string | null;
}

interface Etat {
  rattache?: boolean;
  sa?: string;
  nom?: string | null;
  ref?: string | null;
  origine?: string | null;
  preuve?: "mesuree" | "declaree" | "inconnue";
  decidePar?: string | null;
  note?: string | null;
  depuis?: string | null;
  encaissements?: Encaissement[];
}

/**
 * LE MOT DE CHAQUE ORIGINE, ET CE QU'IL VAUT COMME PREUVE.
 *
 * La décision (`forceDeLaPreuve`) vit chez Tipote, pure et testée. Ici
 * il n'y a que la phrase : c'est la règle du 1er août.
 */
const ORIGINE: Record<string, string> = {
  clic: "il a cliqué sur son lien",
  inscription: "il s'est inscrit par son lien",
  vente: "sa vente portait le code",
  import_sio: "repris d'un tunnel Systeme.io",
  manuel: "attribué à la main",
};

const PREUVE: Record<string, { mot: string; ton: string }> = {
  mesuree: { mot: "mesuré", ton: "text-emerald-700 dark:text-emerald-300" },
  declaree: { mot: "déclaré", ton: "text-amber-700 dark:text-amber-300" },
  inconnue: { mot: "origine inconnue", ton: "text-muted-foreground" },
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function quand(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(t));
}

export function AttribuerClient({ ref: codeAffilie, nom }: { ref: string | null; nom: string }) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [etat, setEtat] = useState<Etat | null>(null);
  const [conflit, setConflit] = useState<{ nom: string | null; ref: string | null } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const regarder = useCallback(async () => {
    const adresse = email.trim().toLowerCase();
    if (!adresse.includes("@")) return;
    setEnCours(true);
    setErreur(null);
    setConflit(null);
    try {
      const res = await fetch(
        `/api/admin/pilotage/rattachement?email=${encodeURIComponent(adresse)}`,
        { cache: "no-store" },
      );
      const j = (await res.json()) as Etat & { ok?: boolean; reason?: string };
      if (!j.ok) {
        // ON NE DIT PAS "personne" QUAND ON N'A PAS PU REGARDER.
        setErreur(
          j.reason === "registre_illisible"
            ? "L'espace affilié n'a pas répondu. Ce n'est pas la preuve que personne ne l'a amené : on ne sait simplement pas."
            : "Cette adresse n'a pas pu être lue.",
        );
        setEtat(null);
        return;
      }
      setEtat(j);
    } catch {
      setErreur("L'espace affilié n'a pas répondu.");
      setEtat(null);
    } finally {
      setEnCours(false);
    }
  }, [email]);

  const attribuer = useCallback(
    async (remplacer: boolean) => {
      if (!codeAffilie) return;
      setEnCours(true);
      setErreur(null);
      try {
        const res = await fetch("/api/admin/pilotage/rattachement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), ref: codeAffilie, note, remplacer }),
        });
        const j = (await res.json()) as {
          ok?: boolean;
          reason?: string;
          nom?: string | null;
          ref?: string | null;
          rejoues?: { statut: string }[];
        };
        if (!j.ok) {
          if (j.reason === "rattache_a_un_autre") {
            setConflit({ nom: j.nom ?? null, ref: j.ref ?? null });
            return;
          }
          setErreur(RAISONS[String(j.reason)] ?? "Le rattachement a été refusé.");
          return;
        }
        const creees = (j.rejoues ?? []).filter((r) => r.statut === "attributed").length;
        toast.success(
          creees > 0
            ? `Rattaché. ${creees} commission${creees > 1 ? "s" : ""} créée${creees > 1 ? "s" : ""}.`
            : "Rattaché. Aucune commission à créer sur ses encaissements passés.",
        );
        setEmail("");
        setNote("");
        setEtat(null);
        setConflit(null);
      } catch {
        setErreur("Le rattachement n'a pas abouti.");
      } finally {
        setEnCours(false);
      }
    },
    [codeAffilie, email, note],
  );

  if (!codeAffilie) {
    // SANS CODE PUBLIC, AUCUN LIEN NE LE DÉSIGNE, donc aucun
    // rattachement ne peut le viser. Le dire vaut mieux qu'un formulaire
    // qui refuserait à chaque fois.
    return (
      <section className={`${CARTE} p-4`}>
        <h2 className="text-sm font-medium">Lui attribuer un client</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Impossible tant qu&apos;il n&apos;a pas choisi son code public : c&apos;est lui qui
          le désigne.
        </p>
      </section>
    );
  }

  return (
    <section className={`${CARTE} p-4`}>
      <h2 className="text-sm font-medium">Lui attribuer un client</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Pour le cas où son lien n&apos;a pas fonctionné et qu&apos;il te l&apos;a prouvé. Le
        rattachement vaut à vie, et ses encaissements déjà faits sont recommissionnés.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs font-medium" htmlFor="attribuer-email">
            L&apos;adresse du client
          </label>
          <input
            id="attribuer-email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEtat(null);
              setConflit(null);
            }}
            placeholder="client@exemple.fr"
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
          />
        </div>
        <Button variant="outline" onClick={() => void regarder()} disabled={enCours}>
          {enCours ? <Loader2 className="size-4 animate-spin" /> : "Regarder d'abord"}
        </Button>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {erreur}
        </p>
      )}

      {etat && (
        <div className="mt-3 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
          {etat.rattache ? (
            <p>
              <strong>Déjà rattaché à {etat.nom ?? etat.ref ?? etat.sa}</strong>
              {etat.depuis ? ` depuis le ${quand(etat.depuis)}` : ""}
              {etat.origine ? ` (${ORIGINE[etat.origine] ?? etat.origine})` : ""}
              {" · "}
              <span className={PREUVE[etat.preuve ?? "inconnue"]?.ton}>
                {PREUVE[etat.preuve ?? "inconnue"]?.mot}
              </span>
              {etat.decidePar ? ` · décidé par ${etat.decidePar}` : ""}
              {etat.note ? ` · ${etat.note}` : ""}
            </p>
          ) : (
            <p>
              <strong>Personne ne l&apos;a amené</strong> d&apos;après le registre. Le rattacher
              à {nom} ne retire donc rien à personne.
            </p>
          )}

          {(etat.encaissements?.length ?? 0) > 0 ? (
            <div>
              <p className="font-medium">
                Ce qui sera recommissionné ({etat.encaissements!.length}) :
              </p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {etat.encaissements!.map((e) => (
                  <li key={e.reference}>
                    {quand(e.quand)} · {euros(e.montantCents)} · {e.produit ?? "produit inconnu"}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucun encaissement à son nom : le rattachement ne vaudra que pour la suite.
            </p>
          )}

          <div className="space-y-1 pt-1">
            <label className="font-medium" htmlFor="attribuer-note">
              Pourquoi (ça reste dans le registre)
            </label>
            <input
              id="attribuer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Il m'a envoyé la capture de son lien du 12 septembre"
              className="w-full rounded-lg border bg-card px-3 py-1.5"
            />
          </div>

          <Button onClick={() => void attribuer(false)} disabled={enCours} className="mt-1">
            {enCours ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="mr-1 size-4" />
                Attribuer à {nom}
              </>
            )}
          </Button>
        </div>
      )}

      {conflit && (
        // LE REMPLACEMENT EST UN GESTE, PAS UN RÉGLAGE. On nomme celui à
        // qui on retire le filleul : sans son nom, on ne sait pas ce
        // qu'on est en train de faire.
        <div className="mt-3 space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
          <p className="font-semibold text-destructive">
            Cette personne appartient déjà à {conflit.nom ?? conflit.ref ?? "un autre affilié"}.
          </p>
          <p>
            Le premier rattachement gagne. Continuer le RETIRE à{" "}
            {conflit.nom ?? conflit.ref ?? "l'autre affilié"} pour le donner à {nom}, et ses
            commissions futures suivront.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="destructive"
              onClick={() => void attribuer(true)}
              disabled={enCours}
            >
              {enCours ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                `Le retirer à ${conflit.nom ?? conflit.ref ?? "l'autre"} quand même`
              )}
            </Button>
            <Button variant="outline" onClick={() => setConflit(null)} disabled={enCours}>
              Ne rien faire
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

const RAISONS: Record<string, string> = {
  affilie_inconnu: "Ce code ne désigne aucun affilié actif au registre.",
  soi_meme: "On ne rattache pas quelqu'un à lui même.",
  non_signe: "Le geste n'a pas pu être signé : reconnecte toi.",
  adresse_invalide: "Cette adresse n'est pas une adresse.",
  not_configured: "Le pont vers l'espace affilié n'est pas configuré sur ce serveur.",
  unreachable: "L'espace affilié n'a pas répondu.",
  write_failed: "Le registre a refusé l'écriture.",
};
