import type { ChatMessage, ChatSession, ContextSnapshot, ModelProfile, TokenUsage, WorkspaceSettings } from "./types";

function words(value: string) { return value.trim() ? value.trim().split(/\s+/u).length : 0; }
// A deliberately conservative, provider-neutral forecast. Provider usage replaces it after a response.
function estimatedTokens(value: string) { return Math.ceil(words(value) * 1.35 + value.length / 18); }
function sum(messages: ChatMessage[]) { return messages.reduce((total, message) => total + estimatedTokens(message.content), 0); }
function promptMessages(session: ChatSession): ChatMessage[] {
  const archived = new Set(session.context?.archivedMessageIds || []);
  const visible = session.messages.filter((message) => !message.localOnly && !archived.has(message.id) && !(message.role === "assistant" && !message.content));
  const summary = session.context?.summary;
  return summary ? [{ id: summary.id, role: "user", content: `[Conversation continuity summary]\n${summary.content}`, createdAt: summary.createdAt }, ...visible] : visible;
}

export function contextMessages(session: ChatSession) { return promptMessages(session).map(({ role, content }) => ({ role: role === "system" ? "user" as const : role, content })); }
export function profileFor(modelId: string, settings: WorkspaceSettings): ModelProfile {
  const cached = settings.metadataCache[modelId];
  const override = settings.modelOverrides[modelId];
  const stale = Boolean(cached?.refreshedAt && Date.now() - Date.parse(cached.refreshedAt) > 24 * 60 * 60 * 1000);
  if (override) return { ...(cached || { modelId, tokenizer: "approximate-words" as const, capabilities: [] }), ...override, modelId, source: "override", stale: false };
  return cached ? { ...cached, stale } : { modelId, tokenizer: "approximate-words", capabilities: [], source: "unknown" };
}

export function snapshotFor(session: ChatSession, profile: ModelProfile, settings: WorkspaceSettings, draft = ""): ContextSnapshot {
  const active = promptMessages(session);
  const all = session.messages.filter((message) => !message.localOnly);
  const activeTokens = sum(active) + estimatedTokens(draft);
  const storedTokens = sum(all);
  const activeWords = active.reduce((total, message) => total + words(message.content), 0) + words(draft);
  const storedWords = all.reduce((total, message) => total + words(message.content), 0);
  const archivedTokens = Math.max(0, storedTokens - sum(active.filter((message) => !message.content.startsWith("[Conversation continuity summary]"))));
  const archivedWords = Math.max(0, storedWords - active.filter((message) => !message.content.startsWith("[Conversation continuity summary]")).reduce((total, message) => total + words(message.content), 0));
  const reserve = profile.maxOutputTokens ? Math.min(settings.reservedOutputTokens, profile.maxOutputTokens) : settings.reservedOutputTokens;
  const windowBudget = profile.contextWindow ? profile.contextWindow - reserve : undefined;
  const usablePromptTokens = profile.maxInputTokens && windowBudget ? Math.min(profile.maxInputTokens, windowBudget) : profile.maxInputTokens || windowBudget;
  const remainingTokens = usablePromptTokens === undefined ? undefined : usablePromptTokens - activeTokens;
  const ratio = usablePromptTokens ? activeTokens / usablePromptTokens * 100 : 0;
  const health = usablePromptTokens === undefined ? "unknown" : ratio >= 100 ? "blocked" : ratio >= settings.criticalPercent ? "critical" : ratio >= settings.warningPercent ? "warning" : "healthy";
  const measuredUsage = [...session.messages].reverse().find((message) => message.usage?.source === "provider")?.usage;
  return { model: profile, activeTokens, activeWords, storedTokens, storedWords, archivedTokens, archivedWords, reservedOutputTokens: reserve, usablePromptTokens, remainingTokens, health, measuredUsage };
}

export function applyUsage(message: ChatMessage, usage: TokenUsage) { return { ...message, usage }; }
export function proposedArchive(session: ChatSession, snapshot: ContextSnapshot) {
  const archived = new Set(session.context?.archivedMessageIds || []);
  const candidates = session.messages.filter((message) => !message.localOnly && !archived.has(message.id) && message.role !== "system");
  const target = snapshot.usablePromptTokens ? Math.floor(snapshot.usablePromptTokens * 0.65) : Math.floor(snapshot.activeTokens * 0.55);
  const ids: string[] = [];
  let remaining = snapshot.activeTokens;
  for (const message of candidates) { if (remaining <= target || candidates.length - ids.length < 2) break; ids.push(message.id); remaining -= estimatedTokens(message.content); }
  return ids;
}
