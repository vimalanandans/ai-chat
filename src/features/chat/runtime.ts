import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { ModelOption, ProviderKind, ProviderSummary, ProxySettings } from "./types";

type ProviderRecord = ProviderSummary & { apiKey: string };
type ProviderInput = Partial<ProviderRecord> & { models?: string[] };
type ProxyInput = Partial<ProxySettings>;
export type ProviderTestDiagnostics = { provider: ProviderKind; endpoint: string; model: string; apiVersion?: string; tokenLimit: string; proxy: "direct" | string };
export class ProviderTestError extends Error { constructor(message: string, readonly diagnostics: ProviderTestDiagnostics) { super(message); } }
const supportedKinds = new Set<ProviderKind>(["openai", "openai-responses", "azure-openai", "gemini", "anthropic"]);
function providerFile() { return process.env.SIGNAL_PROVIDER_STORE || join(process.cwd(), "data", "providers.json"); }
function proxyFile() { return process.env.SIGNAL_PROXY_STORE || join(process.cwd(), "data", "proxy.json"); }
let proxyAgent: { endpoint: string; agent: ProxyAgent } | undefined;

function cleanModels(models: unknown): string[] { return Array.isArray(models) ? [...new Set(models.filter((model): model is string => typeof model === "string").map((model) => model.trim()).filter(Boolean))] : []; }
function cleanProxyEndpoint(endpoint: unknown): string {
  const value = typeof endpoint === "string" ? endpoint.trim().replace(/\/$/, "") : "";
  if (!value) return "";
  if (!URL.canParse(value)) throw new Error("Enter a valid proxy URL, for example http://localhost:3128.");
  const protocol = new URL(value).protocol;
  if (protocol !== "http:" && protocol !== "https:") throw new Error("The proxy URL must use http:// or https://.");
  return value;
}
function environmentProvider(): ProviderRecord | undefined {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY) return undefined;
  return { id: "environment", name: process.env.LLM_PROVIDER_NAME || "Environment connection", kind: "openai", endpoint: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY, models: cleanModels((process.env.LLM_MODELS || process.env.LLM_MODEL || "gpt-4.1-mini").split(",")), configured: true };
}
async function localProviders(): Promise<ProviderRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(providerFile(), "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ProviderRecord => typeof item === "object" && item !== null && typeof (item as ProviderRecord).id === "string" && typeof (item as ProviderRecord).apiKey === "string").map((item) => ({ ...item, models: cleanModels(item.models), configured: Boolean(item.apiKey && item.endpoint) }));
  } catch { return []; }
}
export async function getProviders(): Promise<ProviderRecord[]> { const environment = environmentProvider(); return [...(environment ? [environment] : []), ...await localProviders()]; }
export async function getProxySettings(): Promise<ProxySettings> {
  try {
    const parsed = JSON.parse(await readFile(proxyFile(), "utf8")) as Partial<ProxySettings>;
    return { enabled: Boolean(parsed.enabled), endpoint: cleanProxyEndpoint(parsed.endpoint) };
  } catch { return { enabled: false, endpoint: "" }; }
}
export async function saveProxySettings(input: ProxyInput): Promise<ProxySettings> {
  const endpoint = cleanProxyEndpoint(input.endpoint);
  const settings = { enabled: Boolean(input.enabled), endpoint };
  if (settings.enabled && !endpoint) throw new Error("A proxy URL is required when the application proxy is enabled.");
  const path = proxyFile(); await mkdir(dirname(path), { recursive: true }); const temporaryFile = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(settings, null, 2), { mode: 0o600 }); await rename(temporaryFile, path);
  return settings;
}
export async function providerFetch(input: string, init: Parameters<typeof undiciFetch>[1]) {
  const settings = await getProxySettings();
  if (!settings.enabled) return undiciFetch(input, init);
  if (!proxyAgent || proxyAgent.endpoint !== settings.endpoint) proxyAgent = { endpoint: settings.endpoint, agent: new ProxyAgent(settings.endpoint) };
  return undiciFetch(input, { ...init, dispatcher: proxyAgent.agent });
}
function rejectsModernTokenLimit(response: Awaited<ReturnType<typeof providerFetch>>) {
  return response.clone().text().then((body) => /max_completion_tokens/i.test(body) && /(unsupported|unknown|unrecognized) parameter/i.test(body)).catch(() => false);
}
export async function openAiCompatibleRequest(url: string, headers: Record<string, string>, payload: Record<string, unknown>, signal?: AbortSignal) {
  const modern = await providerFetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal });
  if (modern.ok || !await rejectsModernTokenLimit(modern)) return modern;
  const { max_completion_tokens: tokenLimit, ...legacyPayload } = payload;
  return providerFetch(url, { method: "POST", headers, body: JSON.stringify({ ...legacyPayload, max_tokens: tokenLimit }), signal });
}
export async function openAiCompatibleChat(endpoint: string, apiKey: string, payload: Record<string, unknown>, signal?: AbortSignal) {
  return openAiCompatibleRequest(`${endpoint}/chat/completions`, { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, payload, signal);
}
export async function testProxy(input?: ProxyInput): Promise<string> {
  const settings = input ? { enabled: Boolean(input.enabled), endpoint: cleanProxyEndpoint(input.endpoint) } : await getProxySettings();
  if (!settings.enabled || !settings.endpoint) throw new Error("Enable the application proxy and enter its URL before testing.");
  const agent = proxyAgent?.endpoint === settings.endpoint ? proxyAgent.agent : new ProxyAgent(settings.endpoint);
  const response = await undiciFetch("https://www.gstatic.com/generate_204", { dispatcher: agent, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Proxy test failed (${response.status}): ${response.statusText || "The proxy rejected the request."}`);
  return `Proxy connected through ${settings.endpoint}.`;
}
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
  const next = existing ? current.map((provider) => provider.id === existing.id ? record : provider) : [...current, record]; const path = providerFile(); await mkdir(dirname(path), { recursive: true }); const temporaryFile = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(next, null, 2), { mode: 0o600 }); await rename(temporaryFile, path); const { apiKey: _, ...summary } = record; return summary;
}
export async function deleteProvider(id: string): Promise<void> {
  if (id === "environment") throw new Error("Environment-managed providers are configured through .env.local.");
  const current = await localProviders(); const next = current.filter((provider) => provider.id !== id); if (next.length === current.length) throw new Error("Provider not found.");
  const path = providerFile(); if (!next.length) { await unlink(path).catch(() => undefined); return; }
  const temporaryFile = `${path}.${randomUUID()}.tmp`; await writeFile(temporaryFile, JSON.stringify(next, null, 2), { mode: 0o600 }); await rename(temporaryFile, path);
}

export async function testProvider(input: ProviderInput): Promise<{ message: string; diagnostics: ProviderTestDiagnostics }> {
  const saved = input.id ? (await getProviders()).find((provider) => provider.id === input.id) : undefined;
  const kind = input.kind || saved?.kind; const endpoint = (typeof input.endpoint === "string" ? input.endpoint : saved?.endpoint || "").trim().replace(/\/$/, "");
  const apiKey = (typeof input.apiKey === "string" && input.apiKey.trim() ? input.apiKey : saved?.apiKey || "").trim(); const models = cleanModels(input.models?.length ? input.models : saved?.models); const model = models[0];
  if (!kind || !supportedKinds.has(kind) || !endpoint || !apiKey || !model) throw new Error("Enter a provider type, endpoint, API key, and at least one model before testing.");
  const proxy = await getProxySettings(); const diagnostics: ProviderTestDiagnostics = { provider: kind, endpoint, model, apiVersion: kind === "azure-openai" ? input.apiVersion || saved?.apiVersion || "2024-10-21" : undefined, tokenLimit: kind === "azure-openai" || kind === "openai" ? "max_completion_tokens" : kind === "openai-responses" ? "max_output_tokens" : "provider default", proxy: proxy.enabled ? proxy.endpoint : "direct" };
  let response: Awaited<ReturnType<typeof providerFetch>>;
  if (kind === "gemini") response = await providerFetch(`${endpoint}/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with OK." }] }] }) });
  else if (kind === "anthropic") response = await providerFetch(`${endpoint}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 4, messages: [{ role: "user", content: "Reply with OK." }] }) });
  else if (kind === "openai-responses") response = await providerFetch(`${endpoint}/responses`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, input: "Reply with OK.", max_output_tokens: 4 }) });
  else if (kind === "azure-openai") response = await openAiCompatibleRequest(`${endpoint}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=${encodeURIComponent(input.apiVersion || saved?.apiVersion || "2024-10-21")}`, { "Content-Type": "application/json", "api-key": apiKey }, { messages: [{ role: "user", content: "Reply with OK." }], max_completion_tokens: 4 });
  else response = await openAiCompatibleChat(endpoint, apiKey, { model, messages: [{ role: "user", content: "Reply with OK." }], max_completion_tokens: 4 });
  if (!response.ok) { const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 240); throw new ProviderTestError(`Connection test failed (${response.status}): ${detail || response.statusText}`, diagnostics); }
  return { message: `Connected to ${model} through ${saved?.name || input.name || "this provider"}.`, diagnostics };
}
