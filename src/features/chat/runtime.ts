import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ModelOption, ProviderKind, ProviderSummary } from "./types";

type ProviderRecord = ProviderSummary & { apiKey: string };
type ProviderInput = Partial<ProviderRecord> & { models?: string[] };
const providerFile = join(process.cwd(), "data", "providers.json");
const supportedKinds = new Set<ProviderKind>(["openai", "azure-openai", "gemini"]);

function cleanModels(models: unknown): string[] { return Array.isArray(models) ? [...new Set(models.filter((model): model is string => typeof model === "string").map((model) => model.trim()).filter(Boolean))] : []; }
function environmentProvider(): ProviderRecord | undefined {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY) return undefined;
  return { id: "environment", name: process.env.LLM_PROVIDER_NAME || "Environment connection", kind: "openai", endpoint: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY, models: cleanModels((process.env.LLM_MODELS || process.env.LLM_MODEL || "gpt-4.1-mini").split(",")), configured: true };
}
async function localProviders(): Promise<ProviderRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(providerFile, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ProviderRecord => typeof item === "object" && item !== null && typeof (item as ProviderRecord).id === "string" && typeof (item as ProviderRecord).apiKey === "string").map((item) => ({ ...item, models: cleanModels(item.models), configured: Boolean(item.apiKey && item.endpoint) }));
  } catch { return []; }
}
export async function getProviders(): Promise<ProviderRecord[]> { const environment = environmentProvider(); return [...(environment ? [environment] : []), ...await localProviders()]; }
export async function getProviderSummaries(): Promise<ProviderSummary[]> { return (await getProviders()).map(({ apiKey: _, ...provider }) => provider); }
export async function getModels(): Promise<ModelOption[]> { return (await getProviders()).flatMap((provider) => provider.models.map((model) => ({ id: `${provider.id}:${model}`, label: model, provider: provider.name, providerId: provider.id, configured: provider.configured }))); }
export async function findModel(modelId: string): Promise<{ provider: ProviderRecord; model: string } | undefined> {
  const separator = modelId.indexOf(":"); if (separator < 1) return undefined;
  const providerId = modelId.slice(0, separator); const model = modelId.slice(separator + 1);
  const provider = (await getProviders()).find((item) => item.id === providerId && item.models.includes(model));
  return provider ? { provider, model } : undefined;
}
export async function saveProvider(input: ProviderInput): Promise<ProviderSummary> {
  const kind = input.kind; const name = typeof input.name === "string" ? input.name.trim() : ""; const endpoint = typeof input.endpoint === "string" ? input.endpoint.trim().replace(/\/$/, "") : ""; const models = cleanModels(input.models);
  if (!kind || !supportedKinds.has(kind) || !name || !endpoint || !models.length) throw new Error("Name, provider type, endpoint, and at least one model are required.");
  if (!URL.canParse(endpoint)) throw new Error("Enter a valid provider endpoint.");
  const current = await localProviders(); const existing = input.id ? current.find((provider) => provider.id === input.id) : undefined; const apiKey = typeof input.apiKey === "string" && input.apiKey.trim() ? input.apiKey.trim() : existing?.apiKey;
  if (!apiKey) throw new Error("An API key is required for a new provider.");
  const record: ProviderRecord = { id: existing?.id || randomUUID(), name, kind, endpoint, models, apiVersion: typeof input.apiVersion === "string" ? input.apiVersion.trim() || undefined : undefined, apiKey, configured: true };
  const next = existing ? current.map((provider) => provider.id === existing.id ? record : provider) : [...current, record]; await mkdir(join(process.cwd(), "data"), { recursive: true }); const temporaryFile = `${providerFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(next, null, 2), { mode: 0o600 }); await rename(temporaryFile, providerFile); const { apiKey: _, ...summary } = record; return summary;
}
export async function deleteProvider(id: string): Promise<void> {
  if (id === "environment") throw new Error("Environment-managed providers are configured through .env.local.");
  const current = await localProviders(); const next = current.filter((provider) => provider.id !== id); if (next.length === current.length) throw new Error("Provider not found.");
  if (!next.length) { await unlink(providerFile).catch(() => undefined); return; }
  const temporaryFile = `${providerFile}.${randomUUID()}.tmp`; await writeFile(temporaryFile, JSON.stringify(next, null, 2), { mode: 0o600 }); await rename(temporaryFile, providerFile);
}
