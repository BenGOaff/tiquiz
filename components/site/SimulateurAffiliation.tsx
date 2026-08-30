"use client";

// components/site/SimulateurAffiliation.tsx
//
// LE SIMULATEUR DE COMMISSIONS.
//
// Il existait sur sa page Systeme.io et il a disparu quand j'ai
// remplacé la page sans l'avoir lue. Béné, 30 août : "pourquoi t'as pas
// remis le calculateur c'était vachement bien ?"
//
// -- LE CALCUL N'EST PAS ICI -------------------------------------------
//
// Il vit dans `lib/site/recompenseAffiliation.ts`, pur et testé. Un
// barème enfermé dans un composant React n'est pas testable, donc il
// n'est pas testé, donc c'est exactement là que les bugs s'installent.
// Ce fichier ne fait que montrer ce que la fonction rend.

import { useMemo, useState } from "react";

import { OWNER_CATALOG, OWNER_PRODUCT_ORDER, formatCents, type OwnerProductId } from "@/lib/checkout/catalog";
import { simuler } from "@/lib/site/recompenseAffiliation";

function euros(cents: number): string {
  return formatCents(cents, "eur", "fr-FR");
}

function libelle(id: OwnerProductId): string {
  return OWNER_CATALOG[id].label.replace(/\bPlus\b/g, "PLUS").replace(/^Tiquiz /, "");
}

function Paliers({
  nom,
  valeur,
  onChange,
}: {
  nom: string;
  valeur: OwnerProductId;
  onChange: (v: OwnerProductId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {OWNER_PRODUCT_ORDER.map((id) => {
        const actif = id === valeur;
        return (
          <label
            key={id}
            className={`cursor-pointer rounded-xl border px-3 py-3 text-center transition-colors ${
              actif
                ? "border-[var(--tq-bleu)] bg-[var(--tq-bleu)] text-white"
                : "border-white/15 bg-white/[0.06] text-white/85 hover:border-white/35"
            }`}
          >
            <input
              type="radio"
              name={nom}
              className="sr-only"
              checked={actif}
              onChange={() => onChange(id)}
            />
            <span className="block text-[0.95rem] font-bold leading-tight">{libelle(id)}</span>
            <span className={`mt-1 block text-sm ${actif ? "text-white/80" : "text-white/50"}`}>
              {euros(OWNER_CATALOG[id].amountCents)}
              {OWNER_CATALOG[id].interval === "year" ? " / an" : " / mois"}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function SimulateurAffiliation() {
  const [nb, setNb] = useState(12);
  const [planFilleul, setPlanFilleul] = useState<OwnerProductId>("mensuel");
  const [planPerso, setPlanPerso] = useState<OwnerProductId>("mensuel");

  const s = useMemo(
    () => simuler({ filleuls: nb, planFilleul, planPerso }),
    [nb, planFilleul, planPerso],
  );

  const carte = (gagne: boolean) =>
    `rounded-2xl border p-6 ${
      gagne ? "border-[var(--tq-cyan)] bg-white/[0.08]" : "border-white/15 bg-white/[0.04]"
    }`;

  return (
    <div className="rounded-3xl bg-[var(--tq-marine)] p-7 sm:p-10">
      <h3 className="text-[1.35rem] text-white">Le plan de tes filleuls</h3>
      <div className="mt-4">
        <Paliers nom="filleul" valeur={planFilleul} onChange={setPlanFilleul} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <label htmlFor="nbfilleuls" className="font-semibold text-white/85">
          Filleuls abonnés
        </label>
        <input
          id="nbfilleuls"
          type="range"
          min={0}
          max={120}
          step={1}
          value={nb}
          onChange={(e) => setNb(Number(e.target.value))}
          className="h-7 min-w-[200px] flex-1 accent-[var(--tq-cyan)]"
        />
        <span className="min-w-[2.5em] text-right text-2xl font-extrabold text-white">{nb}</span>
      </div>

      <div className="my-8 h-px bg-white/12" />

      <h3 className="text-[1.35rem] text-white">Ton propre abonnement</h3>
      <p className="mt-2 max-w-[75ch] text-[0.95rem] leading-relaxed text-white/55">
        Il sert seulement à chiffrer la remise. Si tu n&apos;es pas abonné, la remise ne vaut rien
        pour toi : c&apos;est le taux majoré qu&apos;il te faut.
      </p>
      <div className="mt-4">
        <Paliers nom="perso" valeur={planPerso} onChange={setPlanPerso} />
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <div className={carte(s.gagnante === "taux")}>
          <p className="tq-etiquette !text-[var(--tq-cyan)]">Option 1 : le taux majoré</p>
          <p className="mt-2 text-[2rem] font-extrabold leading-none text-white">
            {euros(s.option1Cents)}
          </p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/60">
            {s.tauxPct > 40
              ? `Ton taux passe à ${s.tauxPct} %, sur 12 mois.`
              : `Taux de base, ${s.tauxPct} %. La première marche s'ouvre au premier filleul.`}
          </p>
        </div>

        <div className={carte(s.gagnante === "remise")}>
          <p className="tq-etiquette !text-[var(--tq-cyan)]">Option 2 : la remise sur ton abo</p>
          <p className="mt-2 text-[2rem] font-extrabold leading-none text-white">
            {euros(s.option2Cents)}
          </p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/60">
            {s.remisePct > 0
              ? `${s.remisePct} % de remise, soit ${euros(s.economieCents)} économisés, plus ${euros(s.baseCents)} de commissions à 40 %.`
              : `La remise s'ouvre au 10e filleul. En dessous, elle ne donne rien.`}
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--tq-bleu)] p-6 sm:col-span-2">
          <p className="tq-etiquette !text-white/70">Ce que tu as intérêt à choisir</p>
          <p className="mt-2 text-[1.4rem] font-extrabold leading-tight text-white">
            {s.gagnante === "aucune"
              ? "Commence par un premier filleul"
              : s.gagnante === "taux"
                ? `Le taux majoré, ${s.tauxPct} %`
                : s.gagnante === "remise"
                  ? `La remise, ${s.remisePct} % sur ton abonnement`
                  : "Les deux se valent"}
          </p>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-white/80">
            {s.gagnante === "aucune"
              ? "Les deux récompenses se débloquent avec tes filleuls abonnés."
              : s.gagnante === "egalite"
                ? "À toi de voir si tu préfères encaisser ou payer moins."
                : `Ça te rapporte ${euros(s.ecartCents)} de plus sur 12 mois.`}
          </p>
        </div>
      </div>

      {/* CE QUE CE CHIFFRE N'EST PAS. Obligatoire : promettre un revenu
          est exactement ce que Béné interdit. */}
      <p className="mt-7 max-w-[85ch] text-[0.9rem] leading-relaxed text-white/50">
        Calcul fait sur 12 mois, avec des filleuls qui restent abonnés toute l&apos;année :
        c&apos;est une fenêtre de calcul, pas une prévision. La commission s&apos;arrête si la
        personne arrête son abonnement ou se fait rembourser, et les mois déjà versés te restent
        acquis. Personne ne peut te promettre un nombre de filleuls : ça, c&apos;est ton travail.
      </p>
    </div>
  );
}
