// lib/claudeRequest.ts
// Construit le body d'un appel /v1/messages Anthropic en retirant
// temperature/top_p/top_k pour les modèles qui les rejettent (Opus
// 4.7+). Porté de Tiquiz.

const OPUS_47_PLUS_RE = /^claude-opus-4-(?:[7-9]|\d{2,})\b/i;

export function modelDeprecatesSamplingParams(modelId: string | null | undefined): boolean {
  if (!modelId) return false;
  return OPUS_47_PLUS_RE.test(modelId.trim());
}

export interface BuildClaudeBodyInput {
  model: string;
  max_tokens: number;
  messages: Array<{ role: string; content: unknown }>;
  system?: string | unknown;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
}

export function buildClaudeMessageBody(input: BuildClaudeBodyInput): Record<string, unknown> {
  const skipSampling = modelDeprecatesSamplingParams(input.model);
  const body: Record<string, unknown> = {
    model: input.model,
    max_tokens: input.max_tokens,
    messages: input.messages,
  };
  if (input.system !== undefined) body.system = input.system;
  if (input.stream !== undefined) body.stream = input.stream;

  if (!skipSampling) {
    if (typeof input.temperature === "number") body.temperature = input.temperature;
    if (typeof input.top_p === "number") body.top_p = input.top_p;
    if (typeof input.top_k === "number") body.top_k = input.top_k;
  }

  return body;
}
