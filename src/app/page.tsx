"use client";

import { CSSProperties, FormEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, ChevronDown, Command, Ellipsis, Menu, MessageSquarePlus, PanelLeftClose, PanelRightOpen, Pencil, Pin, Plus, SendHorizontal, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { ContextPanel } from "@/features/chat/context-panel";
import { createEmptySession, createWelcomeSession } from "@/features/chat/demo";
import { MarkdownMessage } from "@/features/chat/markdown-message";
import { shouldOverlayPanels, workspaceColumns } from "@/features/chat/panel-layout";
import { ProviderSettings } from "@/features/chat/provider-settings";
import { loadChatStore, saveChatStore } from "@/features/chat/storage";
import { StreamRegistry } from "@/features/chat/stream-registry";
import type { ChatMessage, ChatSession, ChatStore, ModelOption, ProviderSummary, TokenUsage, WorkspaceSettings } from "@/features/chat/types";

const fallbackModels: ModelOption[] = [{ id: "unconfigured:gpt-4.1-mini", label: "gpt-4.1-mini", provider: "No provider configured", providerId: "unconfigured", configured: false }];
const minSidebarWidth = 220;
const maxSidebarWidth = 420;

function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function messagePreview(session: ChatSession) { return [...session.messages].reverse().find((message) => message.role === "user" || message.role === "assistant")?.content || "No messages yet"; }

export default function ChatPage() {
  const [models, setModels] = useState<ModelOption[]>(fallbackModels);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(268);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [contextPanelWidth, setContextPanelWidth] = useState(340);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>();
  const [browserBackup, setBrowserBackup] = useState<ChatStore>();
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [sessionMenu, setSessionMenu] = useState<{ id: string; x: number; y: number }>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === "undefined" ? 0 : window.innerWidth);
  const [error, setError] = useState<{ message: string; diagnostics?: ChatDiagnostics }>();
  const [streams] = useState(() => new StreamRegistry());
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const active = useMemo(() => sessions.find((session) => session.id === activeId) ?? sessions[0], [sessions, activeId]);
  const activeModel = models.find((model) => model.id === active?.modelId) ?? models[0] ?? fallbackModels[0];
  const isStreaming = Boolean(active?.messages.some((message) => message.state === "streaming"));
  const lastMessageContent = active?.messages.at(-1)?.content;

  useEffect(() => {
    async function start() {
      const [stored, providerResponse, workspaceResponse] = await Promise.all([loadChatStore(), fetch("/api/providers").then((response) => response.ok ? response.json() : undefined).catch(() => undefined), fetch("/api/workspace").then((response) => response.ok ? response.json() : undefined).catch(() => undefined)]);
      const availableModels = providerResponse?.models?.length ? providerResponse.models as ModelOption[] : fallbackModels;
      setModels(availableModels);
      setProviders(providerResponse?.providers ?? []);
      setWorkspaceSettings(workspaceResponse?.settings);
      const cachedProfiles = Object.values((workspaceResponse?.settings as WorkspaceSettings | undefined)?.metadataCache || {});
      const refreshDue = cachedProfiles.length === 0 || cachedProfiles.some((profile) => !profile.refreshedAt || Date.now() - Date.parse(profile.refreshedAt) > 24 * 60 * 60 * 1000);
      if (refreshDue && providerResponse?.providers?.some((provider: ProviderSummary) => provider.kind === "gemini")) void fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) });
      const serverWorkspace = workspaceResponse?.workspace as ChatStore | undefined;
      const restored = serverWorkspace?.sessions.length ? serverWorkspace : undefined;
      if (restored) { setSessions(restored.sessions); setActiveId(restored.activeSessionId); setSidebarOpen(restored.sidebarOpen); setSidebarWidth(restored.sidebarWidth || 268); setContextPanelOpen(Boolean(restored.contextPanelOpen)); setContextPanelWidth(restored.contextPanelWidth || 340); }
      else { const welcome = createWelcomeSession(availableModels[0].id); setSessions([welcome]); setActiveId(welcome.id); }
      if (!serverWorkspace?.sessions.length && stored?.sessions.length) setBrowserBackup(stored);
      setHydrated(true);
    }
    start();
  }, []);
  useEffect(() => { const updateViewport = () => setViewportWidth(window.innerWidth); updateViewport(); window.addEventListener("resize", updateViewport); return () => window.removeEventListener("resize", updateViewport); }, []);
  useEffect(() => { if (!hydrated || !activeId) return; const timer = window.setTimeout(() => { const workspace: ChatStore = { version: 2, sessions, activeSessionId: activeId, sidebarOpen, sidebarWidth, contextPanelOpen, contextPanelWidth }; void saveChatStore(workspace); void fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspace) }); }, 350); return () => window.clearTimeout(timer); }, [activeId, contextPanelOpen, contextPanelWidth, hydrated, sessions, sidebarOpen, sidebarWidth]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [active?.messages.length, lastMessageContent]);
  useEffect(() => { const element = composerRef.current; if (!element) return; element.style.height = "0px"; element.style.height = `${Math.min(element.scrollHeight, 160)}px`; }, [active?.draft]);
  useEffect(() => () => streams.clear(), [streams]);
  useEffect(() => {
    if (!sessionMenu) return;
    const dismiss = (event: globalThis.PointerEvent | globalThis.KeyboardEvent) => {
      if (event instanceof globalThis.KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof globalThis.PointerEvent && event.target instanceof Element && event.target.closest("[data-session-menu]")) return;
      setSessionMenu(undefined);
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismiss);
    return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", dismiss); };
  }, [sessionMenu]);
  function updateSession(id: string, updater: (session: ChatSession) => ChatSession) { setSessions((items) => items.map((session) => session.id === id ? updater(session) : session)); }
  function newChat() { const session = createEmptySession(activeModel.id); setSessions((items) => [session, ...items]); setActiveId(session.id); setError(undefined); }
  function setModel(model: ModelOption) { if (!active || isStreaming) return; updateSession(active.id, (session) => ({ ...session, modelId: model.id, updatedAt: new Date().toISOString(), context: { archivedMessageIds: session.context?.archivedMessageIds || [], summary: session.context?.summary, timeline: [...(session.context?.timeline || []), { createdAt: new Date().toISOString(), activeTokens: session.context?.timeline.at(-1)?.activeTokens || 0, storedTokens: session.context?.timeline.at(-1)?.storedTokens || 0, reason: "model-change" }] } })); setModelMenuOpen(false); }
  function handleProvidersChanged(nextProviders: ProviderSummary[], nextModels: ModelOption[]) {
    setProviders(nextProviders); setModels(nextModels.length ? nextModels : fallbackModels);
    if (active && nextModels.length && !nextModels.some((model) => model.id === active.modelId)) updateSession(active.id, (session) => ({ ...session, modelId: nextModels[0].id, updatedAt: new Date().toISOString() }));
  }
  function updateDraft(value: string) { if (!active || isStreaming) return; updateSession(active.id, (session) => ({ ...session, draft: value })); }
  function showSessionMenu(event: ReactMouseEvent<HTMLButtonElement>, id: string) { event.preventDefault(); setSessionMenu({ id, x: Math.min(event.clientX, window.innerWidth - 214), y: Math.min(event.clientY, window.innerHeight - 146) }); }
  function renameSession(id: string) {
    const current = sessions.find((session) => session.id === id); const title = current ? window.prompt("Rename session", current.title)?.trim() : "";
    if (title) setSessions((items) => items.map((session) => session.id === id ? { ...session, title, updatedAt: new Date().toISOString() } : session));
    setSessionMenu(undefined);
  }
  function moveSessionToTop(id: string) { setSessions((items) => { const selected = items.find((session) => session.id === id); return selected ? [selected, ...items.filter((session) => session.id !== id)] : items; }); setSessionMenu(undefined); }
  function deleteSession(id: string) {
    const current = sessions.find((session) => session.id === id);
    if (!current || !window.confirm(`Delete “${current.title}”? This only removes the local session.`)) return;
    const next = sessions.filter((session) => session.id !== id) || [];
    if (next.length) { setSessions(next); if (activeId === id) setActiveId(next[0].id); }
    else { const replacement = createEmptySession(activeModel.id); setSessions([replacement]); setActiveId(replacement.id); }
    setSessionMenu(undefined);
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault(); if (!active || isStreaming) return;
    const content = active.draft.trim(); if (!content) return; setError(undefined);
    const now = new Date().toISOString(); const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: now }; const assistantId = crypto.randomUUID(); const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", content: "", createdAt: now, state: "streaming" };
    const nextTitle = active.messages.filter((message) => message.role === "user").length === 0 ? content.slice(0, 52) : active.title;
    const forecast = (value: string) => Math.ceil((value.trim() ? value.trim().split(/\s+/u).length : 0) * 1.35 + value.length / 18);
    const nextMessages = [...active.messages, userMessage, assistantMessage]; const archivedIds = new Set(active.context?.archivedMessageIds || []); const storedTokens = nextMessages.filter((message) => !message.localOnly).reduce((total, message) => total + forecast(message.content), 0); const activeTokens = nextMessages.filter((message) => !message.localOnly && !archivedIds.has(message.id)).reduce((total, message) => total + forecast(message.content), 0) + (active.context?.summary ? forecast(active.context.summary.content) : 0);
    const sentSession: ChatSession = { ...active, title: nextTitle || "New conversation", draft: "", updatedAt: now, messages: nextMessages, context: { archivedMessageIds: active.context?.archivedMessageIds || [], summary: active.context?.summary, timeline: [...(active.context?.timeline || []), { createdAt: now, activeTokens, storedTokens, reason: "message" }] } };
    const sentSessions = sessions.map((session) => session.id === active.id ? sentSession : session);
    setSessions(sentSessions);
    const workspace: ChatStore = { version: 2, sessions: sentSessions, activeSessionId: activeId, sidebarOpen, sidebarWidth, contextPanelOpen, contextPanelWidth };
    const controller = streams.start(active.id);
    try {
      const saved = await fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspace), signal: controller.signal });
      if (!saved.ok) throw new Error("The local workspace could not be saved before sending.");
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: active.id }), signal: controller.signal });
      if (!response.ok) { const details = await response.json().catch(() => ({})) as { error?: string; diagnostics?: ChatDiagnostics }; throw new ChatRequestError(details.error || "The model could not respond.", details.diagnostics); }
      const reader = response.body?.getReader(); if (!reader) throw new Error("The model returned an empty response."); const decoder = new TextDecoder(); let fullResponse = ""; let remainder = ""; let usage: TokenUsage | undefined;
      while (true) { const { done, value } = await reader.read(); if (done) break; remainder += decoder.decode(value, { stream: true }); const frames = remainder.split("\n\n"); remainder = frames.pop() || ""; for (const frame of frames) { const event = /^event:\s*(.+)$/m.exec(frame)?.[1]; const data = /^data:\s*(.+)$/m.exec(frame)?.[1]; if (!event || !data) continue; try { const payload = JSON.parse(data) as { text?: string; inputTokens?: number; outputTokens?: number; totalTokens?: number; source?: "provider" }; if (event === "delta" && payload.text) { fullResponse += payload.text; updateSession(active.id, (session) => ({ ...session, updatedAt: new Date().toISOString(), messages: session.messages.map((message) => message.id === assistantId ? { ...message, content: fullResponse } : message) })); } if (event === "usage") usage = { inputTokens: payload.inputTokens, outputTokens: payload.outputTokens, totalTokens: payload.totalTokens, source: "provider" }; } catch { /* Ignore malformed stream telemetry. */ } } }
      updateSession(active.id, (session) => ({ ...session, updatedAt: new Date().toISOString(), messages: session.messages.map((message) => message.id === assistantId ? { ...message, state: undefined, usage } : message) }));
    } catch (caught) {
      const message = caught instanceof Error && caught.name === "AbortError" ? "Response stopped." : caught instanceof Error ? caught.message : "The model could not respond."; setError({ message, diagnostics: caught instanceof ChatRequestError ? caught.diagnostics : undefined });
      updateSession(active.id, (session) => ({ ...session, messages: session.messages.map((item) => item.id === assistantId ? { ...item, content: item.content || "No response was saved.", state: "error" } : item) }));
    } finally { streams.release(active.id, controller); }
  }
  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }
  if (!hydrated || !active) return <main className="chat-loading"><span className="signal-mark"><i /></span><p>Opening your chat space…</p></main>;

  const overlayPanels = shouldOverlayPanels({ viewportWidth, sidebarOpen, contextPanelOpen, sidebarWidth, contextPanelWidth });
  const columns = workspaceColumns({ sidebarOpen, contextPanelOpen, sidebarWidth, contextPanelWidth });

  return <main className={`chat-app ${sidebarOpen ? "sidebar-visible" : ""} ${contextPanelOpen ? "context-panel-visible" : ""} ${overlayPanels ? "compact-panels" : ""}`} style={{ "--sidebar-width": `${sidebarWidth}px`, "--context-panel-width": `${contextPanelWidth}px`, "--workspace-columns": columns } as CSSProperties}>
    <aside className="chat-sidebar" aria-label="Chat sessions">
      <SidebarResizer width={sidebarWidth} onWidthChange={setSidebarWidth}/>
      <div className="sidebar-head"><div className="chat-brand"><span className="signal-mark"><i /></span><span>Signal</span></div><button className="plain-icon" onClick={() => setSidebarOpen(false)} aria-label="Close conversations"><PanelLeftClose size={18}/></button></div>
      <button className="new-chat" onClick={newChat}><MessageSquarePlus size={17}/> New chat <kbd>⌘ N</kbd></button>
      <div className="session-label">CONVERSATIONS <span>{sessions.length}</span></div>
      <nav className="session-list" aria-label="Session list">{sessions.map((session) => <button key={session.id} className={`session-item ${session.id === active.id ? "active" : ""}`} onClick={() => { setActiveId(session.id); setError(undefined); }} onContextMenu={(event) => showSessionMenu(event, session.id)}><span className="session-icon"><Bot size={14}/></span><span><b>{session.title}</b><small>{messagePreview(session)}</small></span><time>{formatDate(session.updatedAt)}</time></button>)}</nav>
      <div className="sidebar-foot"><button onClick={() => setSettingsOpen(true)}><Settings2 size={16}/> Model connection</button><span><span className={activeModel.configured ? "live-dot" : "idle-dot"}/> {activeModel.configured ? "Ready" : "Setup needed"}</span></div>
    </aside>
    {sessionMenu && <div className="session-menu" data-session-menu role="menu" aria-label="Manage session" style={{ left: sessionMenu.x, top: sessionMenu.y }}><button role="menuitem" onClick={() => renameSession(sessionMenu.id)}><Pencil size={14}/> Rename</button><button role="menuitem" onClick={() => moveSessionToTop(sessionMenu.id)}><Pin size={14}/> Move to top</button><button className="danger" role="menuitem" onClick={() => deleteSession(sessionMenu.id)}><Trash2 size={14}/> Delete</button></div>}
    <section className="chat-main"><header className="chat-topbar"><div className="topbar-leading">{!sidebarOpen && <button className="plain-icon" onClick={() => setSidebarOpen(true)} aria-label="Open conversations"><Menu size={19}/></button>}<div><span className="crumb">PRIVATE SPACE</span><h1>{active.title}</h1></div></div><div className="topbar-actions"><button className="session-action" onClick={newChat}><Plus size={15}/> New chat</button><button className="plain-icon" onClick={() => setContextPanelOpen((open) => !open)} aria-label="Toggle context panel" aria-pressed={contextPanelOpen}><PanelRightOpen size={19}/></button><button className="plain-icon" aria-label="Conversation options"><Ellipsis size={19}/></button></div></header>
      {!activeModel.configured && <section className="setup-banner"><div><Sparkles size={17}/></div><p><b>Connect a model to start chatting.</b> Signal stores sessions locally and sends active prompt context only to your configured endpoint.</p><button onClick={() => setSettingsOpen(true)}>Set up model</button></section>}
      <div className="messages" aria-live="polite">{active.messages.length === 0 ? <Welcome onStart={() => document.getElementById("chat-composer")?.focus()} /> : active.messages.map((message) => <MessageBubble key={message.id} message={message} modelLabel={activeModel.label}/>) }<div ref={messagesEndRef}/></div>
      {error && <div className="chat-error" role="alert"><div><span>{error.message}</span>{error.diagnostics && <small>Provider: {error.diagnostics.provider} · Model/deployment: {error.diagnostics.model} · HTTP {error.diagnostics.status}<br/>Endpoint: {error.diagnostics.endpoint}<br/>Reason: {error.diagnostics.reason}</small>}</div><button onClick={() => setError(undefined)} aria-label="Dismiss error"><X size={15}/></button></div>}
      <form className="composer" onSubmit={sendMessage}><div className="model-row"><div className="model-picker"><button type="button" onClick={() => setModelMenuOpen((open) => !open)} disabled={isStreaming} aria-expanded={modelMenuOpen}><span className={activeModel.configured ? "live-dot" : "idle-dot"}/>{activeModel.label}<ChevronDown size={14}/></button>{modelMenuOpen && <div className="model-menu" role="menu"><b>Choose a model</b>{models.map((model) => <button type="button" role="menuitem" key={model.id} onClick={() => setModel(model)}><span><strong>{model.label}</strong><small>{model.provider}</small></span>{model.id === active.modelId && <Check size={15}/>}</button>)}<footer><button type="button" onClick={() => { setModelMenuOpen(false); setSettingsOpen(true); }}>Manage connection</button></footer></div>}</div><span>{active.messages.length ? `${active.messages.filter((message) => message.role === "user").length} messages` : "Fresh context"}</span></div><div className="composer-input"><textarea ref={composerRef} id="chat-composer" value={active.draft} onChange={(event) => updateDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder={activeModel.configured ? "Message the model…" : "Configure a model to send a message"} rows={1} disabled={isStreaming}/>{isStreaming ? <button type="button" className="stop-button" onClick={() => streams.stop(active.id)}>Stop</button> : <button className="send-button" type="submit" disabled={!active.draft.trim()} aria-label="Send message"><SendHorizontal size={17}/></button>}</div><div className="composer-foot"><span><Command size={12}/> Enter to send · Shift Enter for a new line</span><span>Markdown · Local workspace</span></div></form></section>
    {contextPanelOpen && workspaceSettings && (
      <ContextPanel key={active.id} session={active} settings={workspaceSettings} width={contextPanelWidth} onClose={() => setContextPanelOpen(false)} onWidthChange={setContextPanelWidth} onSessionChange={(next) => updateSession(next.id, () => next)} onSettingsChange={setWorkspaceSettings} canImportBrowserBackup={Boolean(browserBackup)} onImportBrowserBackup={() => { if (!browserBackup) return; setSessions(browserBackup.sessions); setActiveId(browserBackup.activeSessionId); setSidebarOpen(browserBackup.sidebarOpen); setSidebarWidth(browserBackup.sidebarWidth || 268); setContextPanelOpen(Boolean(browserBackup.contextPanelOpen)); setContextPanelWidth(browserBackup.contextPanelWidth || 340); setBrowserBackup(undefined); void fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ migratedIndexedDb: true }) }); }}/>
    )}
    {settingsOpen && <ProviderSettings onClose={() => setSettingsOpen(false)} providers={providers} models={models} onChanged={handleProvidersChanged}/>}
  </main>;
}

type ChatDiagnostics = { provider: string; model: string; endpoint: string; status: number; reason: string; apiVersion?: string; route: string };
class ChatRequestError extends Error { constructor(message: string, readonly diagnostics?: ChatDiagnostics) { super(message); } }
function SidebarResizer({ width, onWidthChange }: { width: number; onWidthChange: (width: number) => void }) {
  const resize = useRef<{ pointerId: number; startX: number; startWidth: number } | undefined>(undefined);
  const clamp = (value: number) => Math.max(minSidebarWidth, Math.min(maxSidebarWidth, value));
  const begin = (event: ReactPointerEvent<HTMLDivElement>) => { event.preventDefault(); resize.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width }; event.currentTarget.setPointerCapture(event.pointerId); };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => { const current = resize.current; if (!current || current.pointerId !== event.pointerId) return; onWidthChange(clamp(current.startWidth + event.clientX - current.startX)); };
  const end = (event: ReactPointerEvent<HTMLDivElement>) => { if (resize.current?.pointerId !== event.pointerId) return; resize.current = undefined; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };
  const key = (event: KeyboardEvent<HTMLDivElement>) => { const next = event.key === "ArrowLeft" ? width - 16 : event.key === "ArrowRight" ? width + 16 : event.key === "Home" ? minSidebarWidth : event.key === "End" ? maxSidebarWidth : undefined; if (next === undefined) return; event.preventDefault(); onWidthChange(clamp(next)); };
  return <div className="sidebar-drawer-resizer" role="separator" aria-label="Resize conversations panel" aria-orientation="vertical" aria-valuemin={minSidebarWidth} aria-valuemax={maxSidebarWidth} aria-valuenow={width} tabIndex={0} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={key}/>;
}
function Welcome({ onStart }: { onStart: () => void }) { return <section className="welcome"><span className="welcome-icon"><Sparkles size={21}/></span><span className="crumb">YOUR FIRST CONVERSATION</span><h2>Make a little room to think.</h2><p>Choose a model below, ask a question, and start a new chat whenever you want a fresh context. Your sessions and drafts stay in this browser.</p><div className="welcome-steps"><span><b>1</b> Connect a model</span><span><b>2</b> Ask anything</span><span><b>3</b> Start fresh when needed</span></div><button className="welcome-button" onClick={onStart}>Write a first message <SendHorizontal size={15}/></button></section>; }
function MessageBubble({ message, modelLabel }: { message: ChatMessage; modelLabel: string }) { return <article className={`message ${message.role} ${message.state ?? ""}`}><div className="message-avatar">{message.role === "user" ? "Y" : <Sparkles size={15}/>}</div><div className="message-body"><header><b>{message.role === "user" ? "You" : modelLabel}</b><time>{message.state === "streaming" ? "Writing…" : new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></header><MarkdownMessage content={message.content}/>{message.state === "streaming" && <span className="typing-cursor"/>}{message.state === "error" && <small>Response was not completed.</small>}</div></article>; }
