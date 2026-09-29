import { verify } from "node:crypto";
import { providerFetch } from "./runtime";
import type { ModelProfile, WorkspaceSettings } from "./types";

type Catalog = { version: number; expiresAt: string; profiles: Array<Omit<ModelProfile, "modelId" | "source" | "refreshedAt" | "stale"> & { model: string }> };

export async function fetchVerifiedCatalog(settings: WorkspaceSettings): Promise<Catalog | undefined> {
  if (!settings.catalogUrl || !settings.catalogPublicKey) return undefined;
  const url = new URL(settings.catalogUrl); if (url.protocol !== "https:") throw new Error("The model catalog must use HTTPS.");
  const [catalogResponse, signatureResponse] = await Promise.all([providerFetch(url.toString(), {}), providerFetch(`${url.toString()}.sig`, {})]);
  if (!catalogResponse.ok || !signatureResponse.ok) throw new Error("The signed model catalog could not be downloaded.");
  const payload = Buffer.from(await catalogResponse.arrayBuffer()); const signature = Buffer.from((await signatureResponse.text()).trim(), "base64"); const key = Buffer.from(settings.catalogPublicKey, "base64");
  if (!verify(null, payload, { key, format: "der", type: "spki" }, signature)) throw new Error("The model catalog signature is invalid; cached metadata was kept.");
  const catalog = JSON.parse(payload.toString("utf8")) as Catalog;
  if (!catalog.version || !Array.isArray(catalog.profiles) || Number.isNaN(Date.parse(catalog.expiresAt)) || Date.parse(catalog.expiresAt) < Date.now()) throw new Error("The verified model catalog is malformed or expired.");
  return catalog;
}
