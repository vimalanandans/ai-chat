export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  state?: "streaming" | "error";
  localOnly?: boolean;
  usage?: TokenUsage;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  kind: "image" | "document";
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  source: "provider" | "estimate";
}

export type ContextHealth = "unknown" | "healthy" | "warning" | "critical" | "blocked";

export interface ContextSummary {
  id: string;
  content: string;
  createdAt: string;
  sourceMessageIds: string[];
  modelId: string;
}

export interface ContextPlan {
  archivedMessageIds: string[];
  summary?: ContextSummary;
  timeline: Array<{ createdAt: string; activeTokens: number; storedTokens: number; reason: "message" | "compaction" | "model-change" }>;
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  draft: string;
  draftAttachments?: ChatAttachment[];
  messages: ChatMessage[];
  context?: ContextPlan;
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
  version: 1 | 2;
  sessions: ChatSession[];
  activeSessionId: string;
  sidebarOpen: boolean;
  sidebarWidth?: number;
  contextPanelOpen?: boolean;
  contextPanelWidth?: number;
}

export interface ModelProfile {
  modelId: string;
  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  tokenizer: "approximate-words" | "provider";
  capabilities: string[];
  source: "override" | "provider" | "catalog" | "unknown";
  refreshedAt?: string;
  stale?: boolean;
}

export interface ContextSnapshot {
  model: ModelProfile;
  activeTokens: number;
  activeWords: number;
  storedTokens: number;
  storedWords: number;
  archivedTokens: number;
  archivedWords: number;
  reservedOutputTokens: number;
  usablePromptTokens?: number;
  remainingTokens?: number;
  health: ContextHealth;
  measuredUsage?: TokenUsage;
}

export interface WorkspaceSettings {
  sessionDirectory: string;
  attachmentDirectory: string;
  maxAttachmentBytes: number;
  toolPolicy: {
    access: "read-only" | "read-write";
    allowCommands: boolean;
    allowNetwork: boolean;
  };
  reservedOutputTokens: number;
  warningPercent: number;
  criticalPercent: number;
  catalogUrl: string;
  catalogPublicKey: string;
  modelOverrides: Record<string, Pick<ModelProfile, "contextWindow" | "maxInputTokens" | "maxOutputTokens">>;
  metadataCache: Record<string, ModelProfile>;
  migratedIndexedDb?: boolean;
}
