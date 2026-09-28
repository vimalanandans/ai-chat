import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createEmptySession, createWelcomeSession } from "./demo";
import { createProviderDrafts, parseProviderDrafts, updateProviderDraft } from "./provider-drafts";
import { deleteProvider, getModels, getProviderSummaries, getProxySettings, saveProvider, saveProxySettings } from "./runtime";

let testDirectory = "";
afterEach(async () => { delete process.env.SIGNAL_PROVIDER_STORE; delete process.env.SIGNAL_PROXY_STORE; if (testDirectory) await rm(testDirectory, { recursive: true, force: true }); testDirectory = ""; });

describe("chat session setup", () => {
  it("keeps the selected provider model with a fresh session", () => {
    expect(createEmptySession("azure:writer-deployment").modelId).toBe("azure:writer-deployment");
  });
  it("creates a visible local first-run guide", () => {
    const welcome = createWelcomeSession("gemini:gemini-2.5-flash").messages[0];
    expect(welcome.content).toContain("New chat");
    expect(welcome.localOnly).toBe(true);
  });
});

describe("local provider registry", () => {
  it("persists multiple independently keyed connections and exposes no API key", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "signal-providers-"));
    process.env.SIGNAL_PROVIDER_STORE = join(testDirectory, "providers.json");
    const first = await saveProvider({ kind: "openai", name: "Team OpenAI", endpoint: "https://example.test/v1", apiKey: "secret-one", models: ["model-a"] });
    const second = await saveProvider({ kind: "gemini", name: "Personal Gemini", endpoint: "https://example.test/v1beta", apiKey: "secret-two", models: ["model-b"] });
    expect((await getProviderSummaries()).filter((provider) => provider.id === first.id || provider.id === second.id)).toHaveLength(2);
    expect((await getModels()).map((model) => model.id)).toContain(`${second.id}:model-b`);
    await deleteProvider(first.id);
    expect((await getProviderSummaries()).some((provider) => provider.id === first.id)).toBe(false);
  });
});

describe("outbound proxy settings", () => {
  it("persists a local application proxy independently of provider keys", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "signal-proxy-"));
    process.env.SIGNAL_PROXY_STORE = join(testDirectory, "proxy.json");
    await saveProxySettings({ enabled: true, endpoint: "http://localhost:3128/" });
    await expect(getProxySettings()).resolves.toEqual({ enabled: true, endpoint: "http://localhost:3128" });
  });
});

describe("provider configuration drafts", () => {
  it("keeps provider-specific endpoints and models isolated when switching types", () => {
    const azure = updateProviderDraft(createProviderDrafts(), "azure-openai", { endpoint: "https://contoso.openai.azure.com", models: "luna-deployment" });
    const gemini = updateProviderDraft(azure, "gemini", { models: "gemini-2.5-pro" });
    expect(gemini["azure-openai"]).toMatchObject({ endpoint: "https://contoso.openai.azure.com", models: "luna-deployment" });
    expect(gemini.gemini).toMatchObject({ endpoint: "https://generativelanguage.googleapis.com/v1beta", models: "gemini-2.5-pro" });
  });
  it("migrates the previous single-provider draft without copying it to other providers", () => {
    const drafts = parseProviderDrafts(JSON.stringify({ kind: "azure-openai", name: "Luna", endpoint: "https://contoso.openai.azure.com", models: "luna", apiVersion: "2024-10-21" }));
    expect(drafts["azure-openai"].endpoint).toBe("https://contoso.openai.azure.com");
    expect(drafts.gemini.endpoint).toBe("https://generativelanguage.googleapis.com/v1beta");
  });
});
