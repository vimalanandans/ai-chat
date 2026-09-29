import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadWorkspace, saveWorkspace, saveWorkspaceSettings } from "./workspace";
import type { ChatStore } from "./types";

let root = "";
afterEach(async () => { delete process.env.SIGNAL_WORKSPACE_SETTINGS; if (root) await rm(root, { recursive: true, force: true }); root = ""; });

describe("file-backed workspace", () => {
  it("writes each session separately and reloads a canonical workspace", async () => {
    root = await mkdtemp(join(tmpdir(), "signal-workspace-")); process.env.SIGNAL_WORKSPACE_SETTINGS = join(root, "settings.json");
    const directory = join(root, "sessions"); await saveWorkspaceSettings({ sessionDirectory: directory });
    const workspace: ChatStore = { version: 2, activeSessionId: "a", sidebarOpen: true, sidebarWidth: 320, contextPanelOpen: true, contextPanelWidth: 360, sessions: [
      { id: "a", title: "A", modelId: "p:m", createdAt: "2026-01-01", updatedAt: "2026-01-01", draft: "", messages: [] },
      { id: "b", title: "B", modelId: "p:m", createdAt: "2026-01-01", updatedAt: "2026-01-01", draft: "", messages: [] }
    ] };
    await saveWorkspace(workspace); const loaded = await loadWorkspace();
    expect(loaded?.sessions.map((session) => session.id).sort()).toEqual(["a", "b"]);
    expect(loaded?.sidebarWidth).toBe(320);
    expect((await stat(join(directory, "sessions", "a.json"))).mode & 0o777).toBe(0o600);
  });
});
