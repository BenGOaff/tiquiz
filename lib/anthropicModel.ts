// lib/anthropicModel.ts
// Résolution centralisée du model ID Anthropic pour le coach IA.
// Porté de Tiquiz : alias rolling courants, pas d'ID daté en fallback,
// rattrapage des IDs legacy connus, override par env var possible.

export const CURRENT_MODELS = {
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
  opus: "claude-opus-4-8",
} as const;

export type AnthropicTier = keyof typeof CURRENT_MODELS;

const LEGACY_REDIRECTS: Record<string, AnthropicTier> = {
  "claude-3-5-sonnet-20240620": "sonnet",
  "claude-3-5-sonnet-latest": "sonnet",
  "claude-3-7-sonnet-20250219": "sonnet",
  "claude-3-7-sonnet-latest": "sonnet",
  "claude-sonnet-4-20250514": "sonnet",
  "claude-sonnet-4-5": "sonnet",
  "claude-sonnet-4-5-20250929": "sonnet",
  "claude-sonnet-4-5-latest": "sonnet",
  "sonnet": "sonnet",
  "claude-3-haiku-20240307": "haiku",
  "claude-3-5-haiku-20241022": "haiku",
  "claude-3-5-haiku-latest": "haiku",
  "haiku": "haiku",
};

export function resolveAnthropicModel(
  envValue: string | undefined | null,
  tier: AnthropicTier,
): string {
  const raw = (envValue ?? "").trim();
  const fallback = CURRENT_MODELS[tier];
  if (!raw) return fallback;

  const mapped = LEGACY_REDIRECTS[raw.toLowerCase()];
  if (mapped) return CURRENT_MODELS[mapped];

  return raw;
}
