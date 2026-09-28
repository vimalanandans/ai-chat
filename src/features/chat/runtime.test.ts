import { describe, expect, it } from "vitest";
import { createEmptySession, createWelcomeSession } from "./demo";

describe("chat session setup", () => {
  it("keeps the selected provider model with a fresh session", () => {
    const session = createEmptySession("azure:writer-deployment");
    expect(session.modelId).toBe("azure:writer-deployment");
    expect(session.messages).toEqual([]);
  });

  it("creates a visible local first-run guide", () => {
    const session = createWelcomeSession("gemini:gemini-2.5-flash");
    expect(session.messages[0].role).toBe("assistant");
    expect(session.messages[0].content).toContain("New chat");
  });
});
