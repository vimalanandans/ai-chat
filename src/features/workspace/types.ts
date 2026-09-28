export type RunStatus = "queued" | "planning" | "running" | "waiting_for_approval" | "needs_input" | "completed" | "failed" | "cancelled";
export type DrawerMode = "docked" | "peek" | "overlay" | "fullscreen";
export type DrawerTab = "assistant" | "agents" | "inspector" | "references" | "activity" | "artifacts";
export type ArtifactKind = "plan" | "note" | "task";

export interface Scope { id: string; label: string; detail: string; removable?: boolean; }
export interface AgentProfile { id: string; name: string; role: string; color: string; initials: string; model: string; }
export interface RunEvent { id: string; time: string; agent: string; label: string; detail: string; tone?: "quiet" | "action" | "approval"; }
export interface ToolApproval { id: string; label: string; detail: string; approved?: boolean; }
export interface AgentRun { id: string; taskId: string; status: RunStatus; agentId: string; title: string; tokenCount: number; cost: string; events: RunEvent[]; approval?: ToolApproval; }
export interface ChangeSet { id: string; artifactId: string; original: string; proposed: string; summary: string; status: "proposed" | "accepted" | "rejected" | "cancelled"; scope: Scope[]; }
export interface Artifact { id: string; title: string; kind: ArtifactKind; content: string; updatedAt: string; changeSet?: ChangeSet; }
export interface TaskSession { id: string; projectId: string; title: string; preview: string; status: "active" | "done"; draft: string; scopes: Scope[]; artifacts: Artifact[]; run: AgentRun; }
export interface CanvasAdapter { id: string; title: string; breadcrumbs: string[]; getAiContext(): Scope[]; getInspector(): { label: string; value: string }[]; canUndo: boolean; canRedo: boolean; }
