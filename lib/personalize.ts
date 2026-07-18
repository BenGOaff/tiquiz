// lib/personalize.ts
// Remplace les placeholders du contenu user-visible (intro/resultat des
// jours) : {prenom} par le prenom de l'eleve, et {offre}/{client}/
// {audience}/{expertise} par le vocabulaire de son persona.
import { GLOSSARY_TERMS, type Vocab } from "@/lib/personas";

export function personalizeText(text: string | null, firstName: string | null): string | null {
  if (!text) return text;
  const name = (firstName ?? "").trim();
  const replacement = name || "";
  let out = text.replace(/\{\s*(prenom|prénom|name)\s*\}/gi, replacement);
  if (!name) out = out.replace(/ {2,}/g, " ");
  return out;
}

/** Remplace les termes du glossaire ({offre}, {client}, ...) par le
 *  vocabulaire du persona. Insensible a la casse du terme. */
export function applyVocab(text: string | null, vocab: Vocab): string | null {
  if (!text) return text;
  let out = text;
  for (const term of GLOSSARY_TERMS) {
    out = out.replace(new RegExp(`\\{\\s*${term}\\s*\\}`, "gi"), vocab[term]);
  }
  return out;
}

/** Personnalisation complete : prenom + vocabulaire persona. */
export function personalizeContent(
  text: string | null,
  opts: { firstName: string | null; vocab: Vocab },
): string | null {
  return applyVocab(personalizeText(text, opts.firstName), opts.vocab);
}
