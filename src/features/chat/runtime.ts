import type { ModelOption } from "./types";

export function parseModels(rawModels: string | undefined, fallbackModel: string | undefined): ModelOption[] {
  const configured = Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
  const modelIds = (rawModels || fallbackModel || "gpt-4.1-mini").split(",").map((item) => item.trim()).filter(Boolean);
  return modelIds.map((id) => ({ id, label: id, provider: process.env.LLM_PROVIDER_NAME || "OpenAI-compatible", configured }));
}

export function getModels(): ModelOption[] {
  return parseModels(process.env.LLM_MODELS, process.env.LLM_MODEL);
}

export function isConfigured(): boolean {
  return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
}
