export const minimumChatWidth = 560;

export type PanelLayoutInput = {
  sidebarOpen: boolean;
  contextPanelOpen: boolean;
  sidebarWidth: number;
  contextPanelWidth: number;
};

export function workspaceColumns({ sidebarOpen, contextPanelOpen }: PanelLayoutInput) {
  if (sidebarOpen && contextPanelOpen) return "var(--sidebar-width) minmax(0, 1fr) var(--context-panel-width)";
  if (sidebarOpen) return "var(--sidebar-width) minmax(0, 1fr)";
  if (contextPanelOpen) return "minmax(0, 1fr) var(--context-panel-width)";
  return "minmax(0, 1fr)";
}

export function shouldOverlayPanels({ viewportWidth, sidebarOpen, contextPanelOpen, sidebarWidth, contextPanelWidth }: PanelLayoutInput & { viewportWidth: number }) {
  const occupiedWidth = (sidebarOpen ? sidebarWidth : 0) + (contextPanelOpen ? contextPanelWidth : 0);
  return viewportWidth < minimumChatWidth + occupiedWidth;
}
