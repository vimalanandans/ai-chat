import type { ProviderKind } from "./types";

export type ProviderDraft = { name: string; endpoint: string; models: string; apiVersion: string };
export type ProviderDrafts = Record<ProviderKind, ProviderDraft>;
export const providerDraftKey = "signal-provider-drafts-v2";

export const providerDefaults: ProviderDrafts = {
  openai: { name: "OpenAI-compatible", endpoint: "https://api.openai.com/v1", models: "gpt-4.1-mini", apiVersion: "" },
  "openai-responses": { name: "OpenAI", endpoint: "https://api.openai.com/v1", models: "gpt-4.1-mini", apiVersion: "" },
  "azure-openai": { name: "Azure OpenAI", endpoint: "https://YOUR-RESOURCE.openai.azure.com", models: "your-deployment-name", apiVersion: "2024-10-21" },
  gemini: { name: "Google Gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta", models: "gemini-2.5-flash", apiVersion: "" },
  anthropic: { name: "Anthropic", endpoint: "https://api.anthropic.com/v1", models: "claude-sonnet-4-5", apiVersion: "" }
};

const kinds = Object.keys(providerDefaults) as ProviderKind[];
export function createProviderDrafts(): ProviderDrafts { return Object.fromEntries(kinds.map((kind) => [kind, { ...providerDefaults[kind] }])) as ProviderDrafts; }
function draft(value: unknown, fallback: ProviderDraft): ProviderDraft {
  if (!value || typeof value !== "object") return { ...fallback };
  const candidate = value as Partial<ProviderDraft>;
  return { name: typeof candidate.name === "string" ? candidate.name : fallback.name, endpoint: typeof candidate.endpoint === "string" ? candidate.endpoint : fallback.endpoint, models: typeof candidate.models === "string" ? candidate.models : fallback.models, apiVersion: typeof candidate.apiVersion === "string" ? candidate.apiVersion : fallback.apiVersion };
}
export function parseProviderDrafts(value: string | null): ProviderDrafts {
  const defaults = createProviderDrafts();
  if (!value) return defaults;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return defaults;
    const record = parsed as Record<string, unknown>;
    if (typeof record.kind === "string" && kinds.includes(record.kind as ProviderKind)) {
      const kind = record.kind as ProviderKind;
      return { ...defaults, [kind]: draft(record, defaults[kind]) };
    }
    return Object.fromEntries(kinds.map((kind) => [kind, draft(record[kind], defaults[kind])])) as ProviderDrafts;
  } catch { return defaults; }
}
export function updateProviderDraft(drafts: ProviderDrafts, kind: ProviderKind, patch: Partial<ProviderDraft>): ProviderDrafts {
  return { ...drafts, [kind]: { ...drafts[kind], ...patch } };
}
