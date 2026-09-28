export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  state?: "streaming" | "error";
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  draft: string;
  messages: ChatMessage[];
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  providerId: string;
  configured: boolean;
}

export type ProviderKind = "openai" | "openai-responses" | "azure-openai" | "gemini" | "anthropic";

export interface ProviderSummary {
  id: string;
  name: string;
  kind: ProviderKind;
  endpoint: string;
  models: string[];
  apiVersion?: string;
  configured: boolean;
}

export interface ProxySettings {
  enabled: boolean;
  endpoint: string;
}

export interface ChatStore {
  version: 1;
  sessions: ChatSession[];
  activeSessionId: string;
  sidebarOpen: boolean;
}
