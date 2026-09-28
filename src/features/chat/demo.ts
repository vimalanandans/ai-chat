import type { ChatSession } from "./types";

export function createWelcomeSession(modelId: string): ChatSession {
  const createdAt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "Getting started",
    modelId,
    createdAt,
    updatedAt: createdAt,
    draft: "",
    messages: [{
      id: crypto.randomUUID(), role: "assistant", createdAt,
      content: "Welcome to Signal. This is your private, local chat space. Choose a configured model, ask anything, and use **New chat** whenever you want a clean context.",
      localOnly: true
    }]
  };
}

export function createEmptySession(modelId: string): ChatSession {
  const createdAt = new Date().toISOString();
  return { id: crypto.randomUUID(), title: "New conversation", modelId, createdAt, updatedAt: createdAt, draft: "", messages: [] };
}
