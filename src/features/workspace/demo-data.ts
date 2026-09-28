import type { AgentProfile, CanvasAdapter, TaskSession } from "./types";

export const agents: AgentProfile[] = [
  { id: "coordinator", name: "Mira", role: "Coordinator", color: "violet", initials: "MI", model: "Astra 3.2" },
  { id: "research", name: "Niko", role: "Research", color: "blue", initials: "NK", model: "Astra 3.2 mini" },
  { id: "planning", name: "Sana", role: "Planning", color: "orange", initials: "SA", model: "Astra 3.2" },
  { id: "review", name: "Eli", role: "Review", color: "green", initials: "EL", model: "Astra 3.2" }
];

export const canvas: CanvasAdapter = {
  id: "launch-workbench", title: "Launch workbench", breadcrumbs: ["Northstar", "Website refresh", "Launch workbench"], canUndo: true, canRedo: false,
  getAiContext: () => [{ id: "project", label: "Website refresh", detail: "Use this project’s approved references" }, { id: "brief", label: "Launch brief", detail: "Use the current task brief" }],
  getInspector: () => [{ label: "Owner", value: "Jordan Lee" }, { label: "Updated", value: "2 minutes ago" }, { label: "Version", value: "v14" }]
};

export const sessionData: TaskSession[] = [
  {
    id: "launch", projectId: "website", title: "Launch narrative", preview: "Shape the launch story around faster setup.", status: "active", draft: "", scopes: canvas.getAiContext(),
    artifacts: [{ id: "narrative", title: "Narrative approach", kind: "plan", updatedAt: "just now", content: "# Launch narrative\n\nLead with the relief of a simpler first day.\n\n## Recommended structure\n1. A familiar pain point\n2. The calmer new workflow\n3. Evidence from the pilot\n4. A single, confident invitation", changeSet: { id: "cs-1", artifactId: "narrative", original: "Lead with the relief of a simpler first day.", proposed: "Lead with the relief of a simpler first day, then make the proof concrete.", summary: "Strengthens the opening with a clearer promise and evidence cue.", status: "proposed", scope: canvas.getAiContext() } }],
    run: { id: "run-1", taskId: "launch", agentId: "coordinator", title: "Prepare launch narrative", status: "waiting_for_approval", tokenCount: 18420, cost: "$0.34", approval: { id: "ap-1", label: "Create narrative plan", detail: "Sana proposes saving a new plan artifact to this project." }, events: [
      { id: "1", time: "09:41", agent: "Mira", label: "Framed the task", detail: "Delegated research and narrative planning.", tone: "quiet" },
      { id: "2", time: "09:42", agent: "Niko", label: "Reviewed approved references", detail: "Found three recurring pilot themes.", tone: "quiet" },
      { id: "3", time: "09:43", agent: "Sana", label: "Drafted a narrative approach", detail: "Ready for your review.", tone: "action" },
      { id: "4", time: "09:43", agent: "Mira", label: "Needs approval", detail: "Creating a project artifact changes saved work.", tone: "approval" }
    ] }
  },
  {
    id: "onboarding", projectId: "website", title: "Onboarding friction", preview: "Find the sharpest points of friction in setup.", status: "done", draft: "", scopes: [{ id: "project", label: "Website refresh", detail: "Use this project’s approved references" }], artifacts: [],
    run: { id: "run-2", taskId: "onboarding", agentId: "research", title: "Map setup friction", status: "completed", tokenCount: 9240, cost: "$0.16", events: [] }
  }
];
