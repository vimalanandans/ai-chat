"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, AtSign, Bell, BookOpen, Bot, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Command, FileText, FolderKanban, GripVertical, Hash, LayoutPanelLeft, Menu, MoreHorizontal, PanelRight, Plus, Search, Settings2, Sparkles, SquarePen, Undo2, X, Zap
} from "lucide-react";
import { agents, canvas, sessionData } from "@/features/workspace/demo-data";
import { loadWorkspace, saveWorkspace } from "@/features/workspace/storage";
import type { DrawerMode, DrawerTab, TaskSession } from "@/features/workspace/types";

const tabs: { id: DrawerTab; label: string; icon: typeof Bot }[] = [
  { id: "assistant", label: "Assistant", icon: Sparkles }, { id: "agents", label: "Agents", icon: Bot }, { id: "inspector", label: "Inspector", icon: Settings2 }, { id: "references", label: "References", icon: BookOpen }, { id: "activity", label: "Activity", icon: Clock3 }, { id: "artifacts", label: "Artifacts", icon: FileText }
];

function Avatar({ id, small = false }: { id: string; small?: boolean }) {
  const agent = agents.find((item) => item.id === id) ?? agents[0];
  return <span className={`avatar ${agent.color} ${small ? "avatar-small" : ""}`}>{agent.initials}</span>;
}

export default function WorkspacePage() {
  const [sessions, setSessions] = useState<TaskSession[]>(sessionData);
  const [activeId, setActiveId] = useState("launch");
  const [navMode, setNavMode] = useState<"full" | "compact" | "hidden">("full");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("docked");
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("assistant");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [saved, setSaved] = useState("Saved locally");
  const [lastAccepted, setLastAccepted] = useState<{ artifactId: string; original: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const active = useMemo(() => sessions.find((item) => item.id === activeId) ?? sessions[0], [sessions, activeId]);
  useEffect(() => { loadWorkspace().then((data) => { if (data) { setSessions(data.sessions); setActiveId(data.activeSessionId); setDrawerMode(data.drawerMode); setDrawerTab(data.drawerTab); setNavMode(data.navMode); } setHydrated(true); }); }, []);
  useEffect(() => { if (!hydrated) return; setSaved("Saving…"); const timer = window.setTimeout(() => { saveWorkspace({ sessions, activeSessionId: activeId, drawerMode, drawerTab, navMode }); setSaved("Saved locally"); }, 350); return () => window.clearTimeout(timer); }, [sessions, activeId, drawerMode, drawerTab, navMode, hydrated]);

  const updateActive = (updater: (task: TaskSession) => TaskSession) => setSessions((items) => items.map((task) => task.id === active.id ? updater(task) : task));
  const approve = () => updateActive((task) => ({ ...task, run: { ...task.run, status: "completed", approval: { ...task.run.approval!, approved: true }, events: [...task.run.events, { id: crypto.randomUUID(), time: "now", agent: "Mira", label: "Plan created", detail: "The proposal is ready in Artifacts.", tone: "action" }] } }));
  const reject = () => updateActive((task) => ({ ...task, run: { ...task.run, status: "completed", approval: { ...task.run.approval!, approved: false }, events: [...task.run.events, { id: crypto.randomUUID(), time: "now", agent: "Mira", label: "Approval declined", detail: "No project files were changed.", tone: "quiet" }] } }));
  const updateChange = (status: "accepted" | "rejected" | "cancelled") => {
    const proposed = active.artifacts.find((artifact) => artifact.changeSet?.status === "proposed");
    if (status === "accepted" && proposed) setLastAccepted({ artifactId: proposed.id, original: proposed.content });
    updateActive((task) => ({ ...task, artifacts: task.artifacts.map((artifact) => artifact.changeSet ? { ...artifact, content: status === "accepted" ? artifact.content.replace(artifact.changeSet.original, artifact.changeSet.proposed) : artifact.content, changeSet: { ...artifact.changeSet, status } } : artifact) }));
  };
  const undoLastAcceptance = () => {
    if (!lastAccepted) return;
    updateActive((task) => ({ ...task, artifacts: task.artifacts.map((artifact) => artifact.id === lastAccepted.artifactId && artifact.changeSet ? { ...artifact, content: lastAccepted.original, changeSet: { ...artifact.changeSet, status: "proposed" } } : artifact) }));
    setLastAccepted(null);
  };
  const removeScope = (id: string) => updateActive((task) => ({ ...task, scopes: task.scopes.filter((scope) => scope.id !== id) }));
  const submit = () => {
    if (!composer.trim()) return;
    const id = `task-${Date.now()}`;
    const task: TaskSession = { id, projectId: "website", title: composer.slice(0, 44), preview: "New scoped conversation", status: "active", draft: "", scopes: active.scopes, artifacts: [], run: { id: `run-${id}`, taskId: id, agentId: "coordinator", title: composer, status: "planning", tokenCount: 0, cost: "$0.00", events: [{ id: "start", time: "now", agent: "Mira", label: "Understanding your request", detail: "Preparing a focused task plan.", tone: "quiet" }] } };
    setSessions((items) => [task, ...items]); setActiveId(id); setComposer(""); setDrawerTab("assistant");
    window.setTimeout(() => setSessions((items) => items.map((item) => item.id === id ? { ...item, run: { ...item.run, status: "running", tokenCount: 840, cost: "$0.02", events: [...item.run.events, { id: "stream", time: "now", agent: "Mira", label: "Working with your selected scope", detail: "A specialist team is preparing a response.", tone: "action" }] } } : item)), 900);
  };

  return <main className={`workspace nav-${navMode} drawer-${drawerMode}`}>
    {navMode !== "hidden" && <aside className="sidebar" aria-label="Workspace navigation">
      <div className="brand-row"><button className="brand" aria-label="Signal home"><span className="brand-mark"><span /></span>{navMode === "full" && <span>Signal</span>}</button><button className="icon-button subtle" onClick={() => setNavMode(navMode === "full" ? "compact" : "full")} aria-label="Toggle navigation">{navMode === "full" ? <ChevronLeft /> : <ChevronRight />}</button></div>
      {navMode === "full" && <button className="workspace-switch"><span className="workspace-icon">N</span><span><b>Northstar</b><small>Product workspace</small></span><ChevronDown size={16} /></button>}
      <nav className="nav-primary">
        <NavItem icon={Search} label="Search" shortcut="⌘ K" compact={navMode === "compact"} />
        <NavItem icon={SquarePen} label="Create" compact={navMode === "compact"} emphasize />
      </nav>
      {navMode === "full" && <div className="nav-section"><p>Workspace</p><NavItem icon={FolderKanban} label="Projects" active /><NavItem icon={Hash} label="All tasks" badge="4" /><NavItem icon={Zap} label="Automations" /></div>}
      {navMode === "full" && <div className="nav-section grow"><p>Recent</p>{sessions.map((session) => <button key={session.id} className={`recent ${activeId === session.id ? "selected" : ""}`} onClick={() => setActiveId(session.id)}><span className="recent-dot"/><span><b>{session.title}</b><small>{session.status === "active" ? "In progress" : "Completed"}</small></span></button>)}</div>}
      <div className="nav-bottom">{navMode === "full" && <><NavItem icon={Bell} label="Activity" /><NavItem icon={CircleHelp} label="Help" /></>}<button className="person"><span>JL</span>{navMode === "full" && <b>Jordan Lee</b>}<MoreHorizontal size={17}/></button></div>
    </aside>}

    <section className="center-shell">
      <header className="topbar"><div className="topbar-left">{navMode === "hidden" && <button className="icon-button" onClick={() => setNavMode("full")} aria-label="Show navigation"><Menu/></button>}<div className="crumbs"><span>Northstar</span><ChevronRight size={13}/><span>Website refresh</span><ChevronRight size={13}/><b>{active.title}</b></div></div><div className="topbar-actions"><button className="icon-button" onClick={undoLastAcceptance} disabled={!lastAccepted} aria-label="Undo last accepted change"><Undo2 size={17}/></button><button className="share-button"><span className="presence">2</span> Share</button><button className="icon-button" onClick={() => setDrawerMode(drawerMode === "docked" ? "peek" : "docked")} aria-label="Toggle contextual drawer"><PanelRight size={18}/></button></div></header>
      <div className="canvas-scroll"><div className="canvas">
        <div className="canvas-heading"><div><span className="eyebrow"><span className="pulse"/> ACTIVE TASK</span><h1>{active.title}</h1><p>{active.preview}</p></div><button className="more-button" aria-label="More task options"><MoreHorizontal/></button></div>
        <section className="run-card"><div className="run-header"><div className="agent-stack"><Avatar id="coordinator"/><Avatar id="research" small/><Avatar id="planning" small/><Avatar id="review" small/></div><div><b>{active.run.status === "completed" ? "Run completed" : active.run.status === "running" ? "Team is working" : active.run.status === "planning" ? "Planning a route" : "Team is ready"}</b><p>{active.run.title}</p></div><span className={`status ${active.run.status}`}>{active.run.status.replaceAll("_", " ")}</span></div>
          <div className="run-track"><div className="run-node complete"><span>1</span><b>Frame</b><small>Mira</small></div><div className="track-line complete"/><div className="run-node complete"><span>2</span><b>Research</b><small>Niko</small></div><div className="track-line complete"/><div className={`run-node ${active.run.status === "waiting_for_approval" ? "current" : active.run.status === "completed" ? "complete" : ""}`}><span>3</span><b>Plan</b><small>Sana</small></div><div className="track-line"/><div className="run-node"><span>4</span><b>Review</b><small>Eli</small></div></div>
          <div className="run-footer"><span><Bot size={15}/> {active.run.tokenCount.toLocaleString()} tokens</span><span>Estimated {active.run.cost}</span><button onClick={() => setDrawerTab("agents")}>View trace <ArrowUpRight size={14}/></button></div>
        </section>
        {active.run.approval && active.run.approval.approved === undefined && <section className="approval-card"><div className="approval-icon"><Sparkles size={19}/></div><div className="approval-copy"><span className="eyebrow">APPROVAL NEEDED</span><h3>{active.run.approval.label}</h3><p>{active.run.approval.detail}</p><div className="approval-scope"><span>Scope</span>{active.scopes.map((scope) => <em key={scope.id}>{scope.label}</em>)}</div></div><div className="approval-actions"><button className="button ghost" onClick={reject}>Not now</button><button className="button primary" onClick={approve}>Approve</button></div></section>}
        <section className="section-title"><div><span className="eyebrow">WORKING SURFACE</span><h2>Proposed outcome</h2></div><div className="section-actions"><button onClick={() => setDrawerTab("artifacts")}>All artifacts</button><button className="icon-button" aria-label="More artifact options"><MoreHorizontal/></button></div></section>
        {active.artifacts.length ? active.artifacts.map((artifact) => { const visibleContent = artifact.changeSet?.status === "proposed" ? artifact.content.replace(artifact.changeSet.original, artifact.changeSet.proposed) : artifact.content; return <article className="artifact-card" key={artifact.id}><div className="artifact-meta"><span className="file-icon"><FileText size={17}/></span><div><b>{artifact.title}</b><small>{artifact.kind} · updated {artifact.updatedAt}</small></div><span className={`proposal-label ${artifact.changeSet?.status ?? ""}`}>{artifact.changeSet?.status === "proposed" ? "Proposal" : artifact.changeSet?.status ?? "Saved"}</span></div><div className="artifact-content">{visibleContent.split("\n").map((line, index) => line.startsWith("#") ? <h3 key={index}>{line.replace(/^#+\s/, "")}</h3> : line.startsWith("1.") ? <ol key={index}>{line.slice(3).split("\n").map((item) => <li key={item}>{item}</li>)}</ol> : line && <p key={index}>{line}</p>)}</div>{artifact.changeSet?.status === "proposed" && <div className="proposal-footer"><span><Sparkles size={15}/> {artifact.changeSet.summary}</span><div><button className="text-button" onClick={() => setDrawerTab("artifacts")}>Inspect diff</button><button className="button ghost small" onClick={() => updateChange("rejected")}>Reject</button><button className="button primary small" onClick={() => updateChange("accepted")}>Accept change</button></div></div>}</article>; }) : <div className="empty-artifact"><Sparkles/><h3>Team is preparing an outcome</h3><p>As agents make progress, reviewable artifacts will appear here.</p></div>}
      </div></div>
      <footer className="composer-wrap"><div className="composer"><div className="scope-row"><button className="scope-label" onClick={() => setScopeOpen(!scopeOpen)}><AtSign size={14}/> Using {active.scopes.length ? "selected context" : "no project references"}<ChevronDown size={13}/></button>{active.scopes.map((scope) => <button className="scope-chip" key={scope.id} title={scope.detail}>{scope.label}<X size={12} onClick={(event) => { event.stopPropagation(); removeScope(scope.id); }}/></button>)}</div>{scopeOpen && <div className="scope-popover"><b>What will be sent</b><p>Only the context listed here is available to the agent team.</p>{active.scopes.map((scope) => <div key={scope.id}><span>{scope.label}</span><small>{scope.detail}</small></div>)}</div>}<div className="composer-input"><button className="icon-button" aria-label="Attach file"><Plus/></button><textarea value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit(); }} placeholder="Ask the team to move this forward…" rows={1}/><button className="model-button">Astra 3.2 <ChevronDown size={13}/></button><button className="send-button" onClick={submit} aria-label="Send request"><ArrowUpRight size={18}/></button></div><div className="composer-foot"><span><Command size={12}/> Enter to send</span><span><span className="online-dot"/> {saved}</span></div></div></footer>
    </section>
    {drawerMode !== "peek" && <Drawer active={active} tab={drawerTab} setTab={setDrawerTab} mode={drawerMode} setMode={setDrawerMode} />}
    {drawerMode === "peek" && <button className="peek-tab" onClick={() => setDrawerMode("docked")} aria-label="Open contextual drawer"><PanelRight size={17}/></button>}
  </main>;
}

function NavItem({ icon: Icon, label, active, badge, shortcut, compact, emphasize }: { icon: typeof Search; label: string; active?: boolean; badge?: string; shortcut?: string; compact?: boolean; emphasize?: boolean }) { return <button className={`nav-item ${active ? "active" : ""} ${emphasize ? "emphasize" : ""}`} title={compact ? label : undefined}><Icon size={17}/>{!compact && <><span>{label}</span>{badge && <small className="badge">{badge}</small>}{shortcut && <kbd>{shortcut}</kbd>}</>}</button>; }

function Drawer({ active, tab, setTab, mode, setMode }: { active: TaskSession; tab: DrawerTab; setTab: (tab: DrawerTab) => void; mode: DrawerMode; setMode: (mode: DrawerMode) => void }) {
  return <aside className="drawer" aria-label="Contextual workspace tools"><header className="drawer-header"><div><span className="eyebrow">CONTEXT</span><h2>{tabs.find((item) => item.id === tab)?.label}</h2></div><div><button className="icon-button" onClick={() => setMode(mode === "fullscreen" ? "docked" : "fullscreen")} aria-label="Toggle drawer fullscreen"><LayoutPanelLeft size={17}/></button><button className="icon-button" onClick={() => setMode("peek")} aria-label="Close drawer"><X size={17}/></button></div></header><nav className="drawer-tabs">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={id === tab ? "active" : ""} onClick={() => setTab(id)}><Icon size={16}/><span>{label}</span></button>)}</nav><div className="drawer-body">{tab === "assistant" && <Assistant task={active}/>} {tab === "agents" && <Agents task={active}/>} {tab === "inspector" && <Inspector/>} {tab === "references" && <References/>} {tab === "activity" && <Activity task={active}/>} {tab === "artifacts" && <Artifacts task={active}/>}</div></aside>;
}

function Assistant({ task }: { task: TaskSession }) { return <><div className="assistant-hello"><Avatar id="coordinator"/><div><b>Mira</b><span>Coordinator · {agents[0].model}</span></div><button className="more-button"><MoreHorizontal/></button></div><div className="assistant-message"><p>I’ve separated the evidence gathering from the narrative work so the recommendation stays grounded.</p><p>The proposed plan is ready for review. I’m holding the next change until you decide.</p></div><div className="info-card"><span><Sparkles size={15}/> Visible context</span>{task.scopes.map((scope) => <div key={scope.id}><b>{scope.label}</b><small>{scope.detail}</small></div>)}</div><button className="subtle-action"><Plus size={15}/> Add context</button></>; }
function Agents({ task }: { task: TaskSession }) { return <><div className="team-summary"><span className="status running">{task.run.status.replaceAll("_", " ")}</span><p>4 agents coordinated by Mira. Costs and tool use are estimates in this local demo.</p></div>{agents.map((agent, index) => <div className="agent-row" key={agent.id}><Avatar id={agent.id}/><div><b>{agent.name}</b><span>{agent.role} · {agent.model}</span></div><span className={index < 3 ? "agent-state done" : "agent-state"}>{index < 3 ? "Done" : "Queued"}</span></div>)}<div className="trace-title"><span>Run trace</span><button>Export</button></div>{task.run.events.map((event) => <div className={`event ${event.tone ?? ""}`} key={event.id}><span>{event.time}</span><div><b>{event.agent} · {event.label}</b><p>{event.detail}</p></div></div>)}</>; }
function Inspector() { return <>{canvas.getInspector().map((field) => <div className="inspector-row" key={field.label}><span>{field.label}</span><b>{field.value}</b></div>)}<div className="divider"/><span className="eyebrow">RUNTIME</span><div className="runtime-card"><span><Bot/> {agents[0].model}</span><small>Provider-ready local simulation</small><span><Zap/> Balanced reasoning</span></div></>; }
function References() { return <><p className="helper">Approved references can be used in this task. Agents cannot see other workspace material.</p>{["Pilot interview synthesis", "Homepage messaging audit", "Launch brief — approved"].map((item) => <div className="reference-row" key={item}><span className="file-icon"><FileText size={16}/></span><div><b>{item}</b><small>Approved project reference</small></div></div>)}<button className="subtle-action"><Plus size={15}/> Attach a reference</button></>; }
function Activity({ task }: { task: TaskSession }) { return <>{task.run.events.map((event) => <div className="activity-row" key={event.id}><span className="activity-marker"/><div><b>{event.agent}</b> {event.label.toLowerCase()}<small>{event.time} · {event.detail}</small></div></div>)}</>; }
function Artifacts({ task }: { task: TaskSession }) { return <>{task.artifacts.map((artifact) => <div className="artifact-list" key={artifact.id}><span className="file-icon"><FileText size={16}/></span><div><b>{artifact.title}</b><small>{artifact.changeSet?.status === "proposed" ? "Awaiting your review" : "Saved artifact"}</small></div><ChevronRight size={15}/></div>)}<button className="subtle-action"><Plus size={15}/> Create artifact</button></>; }
