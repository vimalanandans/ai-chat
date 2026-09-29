import { describe, expect, it } from "vitest";
import { shouldOverlayPanels, workspaceColumns } from "./panel-layout";

describe("workspace panel layout", () => {
  it("does not reserve a phantom sidebar column when Conversations is closed", () => {
    expect(workspaceColumns({ sidebarOpen: false, contextPanelOpen: true, sidebarWidth: 268, contextPanelWidth: 320 }))
      .toBe("minmax(0, 1fr) var(--context-panel-width)");
  });

  it("keeps a readable chat column by changing both panels to drawers when needed", () => {
    expect(shouldOverlayPanels({ viewportWidth: 900, sidebarOpen: true, contextPanelOpen: true, sidebarWidth: 320, contextPanelWidth: 360 })).toBe(true);
    expect(shouldOverlayPanels({ viewportWidth: 1440, sidebarOpen: true, contextPanelOpen: true, sidebarWidth: 320, contextPanelWidth: 360 })).toBe(false);
  });
});
