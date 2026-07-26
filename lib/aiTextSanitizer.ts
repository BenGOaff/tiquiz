// lib/aiTextSanitizer.ts
// Nettoie les sorties de l'IA pour respecter la règle de Béné : zéro
// tiret long dans tout contenu user-visible. On remplace em-dash et
// en-dash par des équivalents propres, sans toucher au reste.

export function sanitizeAiText(text: string): string {
  return text
    // em-dash / en-dash entourés d'espaces -> virgule (incise)
    .replace(/\s+[—–]\s+/g, ", ")
    // em-dash / en-dash collés (plages, etc.) -> simple trait d'union
    .replace(/[—–]/g, "-");
}
