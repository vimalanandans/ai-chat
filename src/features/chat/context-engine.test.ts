import { describe, expect, it } from "vitest";
import { profileFor, proposedArchive, snapshotFor } from "./context-engine";
import type { ChatSession, ModelProfile, WorkspaceSettings } from "./types";

const settings: WorkspaceSettings = { sessionDirectory: "/tmp/signal-test", reservedOutputTokens: 100, warningPercent: 75, criticalPercent: 90, catalogUrl: "", catalogPublicKey: "", modelOverrides: {}, metadataCache: {} };
const profile: ModelProfile = { modelId: "provider:model", contextWindow: 1_000, maxInputTokens: 950, maxOutputTokens: 300, tokenizer: "approximate-words", capabilities: [], source: "catalog" };
function session(messages: string[]): ChatSession { return { id: "session", title: "Context", modelId: "provider:model", createdAt: "2026-01-01", updatedAt: "2026-01-01", draft: "", messages: messages.map((content, index) => ({ id: String(index), role: index % 2 ? "assistant" : "user", content, createdAt: "2026-01-01" })) }; }

describe("context engine", () => {
  it("reserves output capacity and reports a usable prompt budget", () => {
    const snapshot = snapshotFor(session(["one two three"]), profile, settings, "four five");
    expect(snapshot.usablePromptTokens).toBe(900);
    expect(snapshot.remainingTokens).toBeLessThan(900);
    expect(snapshot.activeWords).toBe(5);
  });
  it("marks an oversized context as blocked and proposes an archive", () => {
    const current = session(Array.from({ length: 12 }, () => "word ".repeat(100)));
    const snapshot = snapshotFor(current, { ...profile, contextWindow: 300, maxInputTokens: 300 }, settings);
    expect(snapshot.health).toBe("blocked");
    expect(proposedArchive(current, snapshot).length).toBeGreaterThan(0);
  });
  it("keeps unknown capacity visible without blocking a session", () => {
    const snapshot = snapshotFor(session(["hello"]), { modelId: "custom", tokenizer: "approximate-words", capabilities: [], source: "unknown" }, settings);
    expect(snapshot.health).toBe("unknown");
    expect(snapshot.usablePromptTokens).toBeUndefined();
  });
  it("uses a per-model override over stale cached metadata", () => {
    const configured = { ...settings, metadataCache: { "provider:model": { ...profile, refreshedAt: "2020-01-01T00:00:00.000Z" } }, modelOverrides: { "provider:model": { contextWindow: 2_000, maxInputTokens: 1_800, maxOutputTokens: 400 } } };
    const resolved = profileFor("provider:model", configured);
    expect(resolved.source).toBe("override");
    expect(resolved.stale).toBe(false);
    expect(resolved.contextWindow).toBe(2_000);
  });
});
