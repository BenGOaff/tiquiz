import { Award } from "lucide-react";
import { CERT_BRAND, CERT_TITLE } from "@/lib/certification";

/**
 * Certificat officiel de fin de formation. Rendu cote serveur (pas de
 * hooks), reutilise tel quel sur la page publique partageable.
 * Aspect "diplome" : double cadre, sceau, signature.
 */
export function Certificate({
  fullName,
  issuedAt,
}: {
  fullName: string;
  issuedAt: string;
}) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(issuedAt));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl bg-gradient-to-br from-[#5D6CDB] to-[#34C3E0] p-[3px] shadow-card">
        <div className="rounded-[14px] bg-white p-6 sm:p-10">
          <div className="rounded-xl border-2 border-[#5D6CDB]/25 px-5 py-8 text-center sm:px-10 sm:py-12">
            {/* En-tete */}
            <div className="flex items-center justify-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/quizing.png" alt={CERT_BRAND} className="h-9 w-auto" />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b7191]">
              {CERT_TITLE}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#2E386E] sm:text-3xl">
              {CERT_BRAND}
            </h1>

            {/* Sceau */}
            <div className="my-7 flex justify-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#5D6CDB] to-[#34C3E0] text-white shadow-card">
                <Award className="size-10" />
              </div>
            </div>

            <p className="text-sm text-[#6b7191]">Décerné à</p>
            <p className="mt-1 font-display text-3xl font-bold text-[#2E386E] sm:text-4xl">
              {fullName}
            </p>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#4b5078]">
              Pour avoir suivi l'intégralité du parcours et réussi l'examen de
              validation des compétences : concevoir un quiz qui capte, segmente
              et vend, puis le brancher et le promouvoir.
            </p>

            {/* Pied : date + signature */}
            <div className="mt-9 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
              <div className="text-center sm:text-left">
                <p className="text-xs uppercase tracking-wide text-[#9aa0bf]">
                  Délivré le
                </p>
                <p className="text-sm font-medium text-[#2E386E]">{date}</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-display text-lg italic text-[#5D6CDB]">
                  Bénédicte
                </p>
                <p className="border-t border-[#5D6CDB]/30 pt-1 text-xs uppercase tracking-wide text-[#9aa0bf]">
                  {CERT_BRAND}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
