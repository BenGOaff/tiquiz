// Rendu markdown minimal pour les reponses du coach : gras (**),
// listes a puces (- / *) et numerotees (1.), paragraphes. Volontairement
// simple et sans dependance, suffisant pour ce que le modele produit.
import React from "react";

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Gras **texte**
  const nodes: React.ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) nodes.push(<strong key={`${keyBase}-b${i}`}>{m[1]}</strong>);
    else if (part) nodes.push(<React.Fragment key={`${keyBase}-t${i}`}>{part}</React.Fragment>);
  });
  return nodes;
}

export function CoachMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Liste a puces
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul${key++}`} className="my-1 list-disc space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `ul${key}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Liste numerotee
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`ol${key++}`} className="my-1 list-decimal space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `ol${key}-${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Ligne vide -> separateur (ignoree, gere par le gap)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraphe (regroupe les lignes consecutives non-liste)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p${key++}`}>
        {para.flatMap((l, j) => [
          ...renderInline(l, `p${key}-${j}`),
          j < para.length - 1 ? <br key={`br${key}-${j}`} /> : null,
        ])}
      </p>,
    );
  }

  return <div className="space-y-2">{blocks}</div>;
}
