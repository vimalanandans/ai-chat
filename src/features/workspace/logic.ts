import type { ChangeSet, RunStatus, Scope } from "./types";

const transitions: Record<RunStatus, RunStatus[]> = {
  queued: ["planning", "cancelled"],
  planning: ["running", "needs_input", "failed", "cancelled"],
  running: ["waiting_for_approval", "needs_input", "completed", "failed", "cancelled"],
  waiting_for_approval: ["running", "completed", "cancelled"],
  needs_input: ["planning", "cancelled"],
  completed: [],
  failed: ["planning", "cancelled"],
  cancelled: []
};

export function canTransitionRun(from: RunStatus, to: RunStatus): boolean {
  return transitions[from].includes(to);
}

export function resolveChangeSet(changeSet: ChangeSet, resolution: "accepted" | "rejected" | "cancelled") {
  return { ...changeSet, status: resolution, resolvedContent: resolution === "accepted" ? changeSet.proposed : changeSet.original };
}

export function hasScope(scope: Scope[], label: string): boolean {
  return scope.some((item) => item.label === label);
}
