"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, ChevronDown, Command, Ellipsis, Menu, MessageSquarePlus, PanelLeftClose, Plus, SendHorizontal, Settings2, Sparkles, X } from "lucide-react";
import { createEmptySession, createWelcomeSession } from "@/features/chat/demo";
import { MarkdownMessage } from "@/features/chat/markdown-message";
import { ProviderSettings } from "@/features/chat/provider-settings";
import { loadChatStore, saveChatStore } from "@/features/chat/storage";
import type { ChatMessage, ChatSession, ChatStore, ModelOption, ProviderSummary } from "@/features/chat/types";

const fallbackModels: ModelOption[] = [{ id: "unconfigured:gpt-4.1-mini", label: "gpt-4.1-mini", provider: "No provider configured", providerId: "unconfigured", configured: false }];

function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function messagePreview(session: ChatSession) { return [...session.messages].reverse().find((message) => message.role === "user" || message.role === "assistant")?.content || "No messages yet"; }

export default function ChatPage() {
  const [models, setModels] = useState<ModelOption[]>(fallbackModels);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<{ message: string; diagnostics?: ChatDiagnostics }>();
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const active = useMemo(() => sessions.find((session) => session.id === activeId) ?? sessions[0], [sessions, activeId]);
  const activeModel = models.find((model) => model.id === active?.modelId) ?? models[0] ?? fallbackModels[0];
  const isStreaming = Boolean(active?.messages.some((message) => message.state === "streaming"));
  const lastMessageContent = active?.messages.at(-1)?.content;

  useEffect(() => {
    async function start() {
      const [stored, providerResponse] = await Promise.all([loadChatStore(), fetch("/api/providers").then((response) => response.ok ? response.json() : undefined).catch(() => undefined)]);
      const availableModels = providerResponse?.models?.length ? providerResponse.models as ModelOption[] : fallbackModels;
      setModels(availableModels);
      setProviders(providerResponse?.providers ?? []);
      if (stored?.version === 1 && stored.sessions.length) { setSessions(stored.sessions); setActiveId(stored.activeSessionId); setSidebarOpen(stored.sidebarOpen); }
      else { const welcome = createWelcomeSession(availableModels[0].id); setSessions([welcome]); setActiveId(welcome.id); }
      setHydrated(true);
    }
    start();
  }, []);
  useEffect(() => { if (!hydrated || !activeId) return; const timer = window.setTimeout(() => saveChatStore({ version: 1, sessions, activeSessionId: activeId, sidebarOpen }), 250); return () => window.clearTimeout(timer); }, [activeId, hydrated, sessions, sidebarOpen]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [active?.messages.length, lastMessageContent]);
  useEffect(() => { const element = composerRef.current; if (!element) return; element.style.height = "0px"; element.style.height = `${Math.min(element.scrollHeight, 160)}px`; }, [active?.draft]);
  function updateSession(id: string, updater: (session: ChatSession) => ChatSession) { setSessions((items) => items.map((session) => session.id === id ? updater(session) : session)); }
  function newChat() { const session = createEmptySession(activeModel.id); setSessions((items) => [session, ...items]); setActiveId(session.id); setError(undefined); }
  function setModel(model: ModelOption) { if (!active || isStreaming) return; updateSession(active.id, (session) => ({ ...session, modelId: model.id, updatedAt: new Date().toISOString() })); setModelMenuOpen(false); }
  function handleProvidersChanged(nextProviders: ProviderSummary[], nextModels: ModelOption[]) {
    setProviders(nextProviders); setModels(nextModels.length ? nextModels : fallbackModels);
    if (active && nextModels.length && !nextModels.some((model) => model.id === active.modelId)) updateSession(active.id, (session) => ({ ...session, modelId: nextModels[0].id, updatedAt: new Date().toISOString() }));
  }
  function updateDraft(value: string) { if (!active || isStreaming) return; updateSession(active.id, (session) => ({ ...session, draft: value })); }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault(); if (!active || isStreaming) return;
    const content = active.draft.trim(); if (!content) return; setError(undefined);
    const now = new Date().toISOString(); const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: now }; const assistantId = crypto.randomUUID(); const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", content: "", createdAt: now, state: "streaming" };
    const nextTitle = active.messages.filter((message) => message.role === "user").length === 0 ? content.slice(0, 52) : active.title;
    const requestMessages = [...active.messages, userMessage].filter((message) => !message.localOnly && !(message.role === "assistant" && message.content.startsWith("Welcome to Signal. This is your private, local chat space."))).map(({ role, content: body }) => ({ role, content: body }));
    updateSession(active.id, (session) => ({ ...session, title: nextTitle || "New conversation", draft: "", updatedAt: now, messages: [...session.messages, userMessage, assistantMessage] }));
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: active.modelId, messages: requestMessages }), signal: controller.signal });
      if (!response.ok) { const details = await response.json().catch(() => ({})) as { error?: string; diagnostics?: ChatDiagnostics }; throw new ChatRequestError(details.error || "The model could not respond.", details.diagnostics); }
      const reader = response.body?.getReader(); if (!reader) throw new Error("The model returned an empty response."); const decoder = new TextDecoder(); let fullResponse = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; fullResponse += decoder.decode(value, { stream: true }); updateSession(active.id, (session) => ({ ...session, updatedAt: new Date().toISOString(), messages: session.messages.map((message) => message.id === assistantId ? { ...message, content: fullResponse } : message) })); }
      updateSession(active.id, (session) => ({ ...session, updatedAt: new Date().toISOString(), messages: session.messages.map((message) => message.id === assistantId ? { ...message, state: undefined } : message) }));
    } catch (caught) {
      const message = caught instanceof Error && caught.name === "AbortError" ? "Response stopped." : caught instanceof Error ? caught.message : "The model could not respond."; setError({ message, diagnostics: caught instanceof ChatRequestError ? caught.diagnostics : undefined });
      updateSession(active.id, (session) => ({ ...session, messages: session.messages.map((item) => item.id === assistantId ? { ...item, content: item.content || "No response was saved.", state: "error" } : item) }));
    } finally { abortRef.current = null; }
  }
  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }
  if (!hydrated || !active) return <main className="chat-loading"><span className="signal-mark"><i /></span><p>Opening your chat space…</p></main>;

  return <main className={`chat-app ${sidebarOpen ? "sidebar-visible" : ""}`}>
    <aside className="chat-sidebar" aria-label="Chat sessions"><div className="sidebar-head"><div className="chat-brand"><span className="signal-mark"><i /></span><span>Signal</span></div><button className="plain-icon" onClick={() => setSidebarOpen(false)} aria-label="Close conversations"><PanelLeftClose size={18}/></button></div><button className="new-chat" onClick={newChat}><MessageSquarePlus size={17}/> New chat <kbd>⌘ N</kbd></button><div className="session-label">CONVERSATIONS</div><nav className="session-list">{sessions.map((session) => <button key={session.id} className={`session-item ${session.id === active.id ? "active" : ""}`} onClick={() => { setActiveId(session.id); setError(undefined); }}><span className="session-icon"><Bot size={14}/></span><span><b>{session.title}</b><small>{messagePreview(session)}</small></span><time>{formatDate(session.updatedAt)}</time></button>)}</nav><div className="sidebar-foot"><button onClick={() => setSettingsOpen(true)}><Settings2 size={16}/> Model connection</button><span><span className={activeModel.configured ? "live-dot" : "idle-dot"}/> {activeModel.configured ? "Ready" : "Setup needed"}</span></div></aside>
    <section className="chat-main"><header className="chat-topbar"><div className="topbar-leading">{!sidebarOpen && <button className="plain-icon" onClick={() => setSidebarOpen(true)} aria-label="Open conversations"><Menu size={19}/></button>}<div><span className="crumb">PRIVATE SPACE</span><h1>{active.title}</h1></div></div><div className="topbar-actions"><button className="session-action" onClick={newChat}><Plus size={15}/> New chat</button><button className="plain-icon" aria-label="Conversation options"><Ellipsis size={19}/></button></div></header>
      {!activeModel.configured && <section className="setup-banner"><div><Sparkles size={17}/></div><p><b>Connect a model to start chatting.</b> Signal keeps conversations in this browser and sends prompts only to your configured endpoint.</p><button onClick={() => setSettingsOpen(true)}>Set up model</button></section>}
      <div className="messages" aria-live="polite">{active.messages.length === 0 ? <Welcome onStart={() => document.getElementById("chat-composer")?.focus()} /> : active.messages.map((message) => <MessageBubble key={message.id} message={message} modelLabel={activeModel.label}/>) }<div ref={messagesEndRef}/></div>
      {error && <div className="chat-error" role="alert"><div><span>{error.message}</span>{error.diagnostics && <small>Provider: {error.diagnostics.provider} · Model/deployment: {error.diagnostics.model} · HTTP {error.diagnostics.status}<br/>Endpoint: {error.diagnostics.endpoint}<br/>Reason: {error.diagnostics.reason}</small>}</div><button onClick={() => setError(undefined)} aria-label="Dismiss error"><X size={15}/></button></div>}
      <form className="composer" onSubmit={sendMessage}><div className="model-row"><div className="model-picker"><button type="button" onClick={() => setModelMenuOpen((open) => !open)} disabled={isStreaming} aria-expanded={modelMenuOpen}><span className={activeModel.configured ? "live-dot" : "idle-dot"}/>{activeModel.label}<ChevronDown size={14}/></button>{modelMenuOpen && <div className="model-menu" role="menu"><b>Choose a model</b>{models.map((model) => <button type="button" role="menuitem" key={model.id} onClick={() => setModel(model)}><span><strong>{model.label}</strong><small>{model.provider}</small></span>{model.id === active.modelId && <Check size={15}/>}</button>)}<footer><button type="button" onClick={() => { setModelMenuOpen(false); setSettingsOpen(true); }}>Manage connection</button></footer></div>}</div><span>{active.messages.length ? `${active.messages.filter((message) => message.role === "user").length} messages` : "Fresh context"}</span></div><div className="composer-input"><textarea ref={composerRef} id="chat-composer" value={active.draft} onChange={(event) => updateDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder={activeModel.configured ? "Message the model…" : "Configure a model to send a message"} rows={1} disabled={isStreaming}/>{isStreaming ? <button type="button" className="stop-button" onClick={() => abortRef.current?.abort()}>Stop</button> : <button className="send-button" type="submit" disabled={!active.draft.trim()} aria-label="Send message"><SendHorizontal size={17}/></button>}</div><div className="composer-foot"><span><Command size={12}/> Enter to send · Shift Enter for a new line</span><span>Markdown · Local history</span></div></form></section>
    {settingsOpen && <ProviderSettings onClose={() => setSettingsOpen(false)} providers={providers} models={models} onChanged={handleProvidersChanged}/>}
  </main>;
}

type ChatDiagnostics = { provider: string; model: string; endpoint: string; status: number; reason: string; apiVersion?: string; route: string };
class ChatRequestError extends Error { constructor(message: string, readonly diagnostics?: ChatDiagnostics) { super(message); } }
function Welcome({ onStart }: { onStart: () => void }) { return <section className="welcome"><span className="welcome-icon"><Sparkles size={21}/></span><span className="crumb">YOUR FIRST CONVERSATION</span><h2>Make a little room to think.</h2><p>Choose a model below, ask a question, and start a new chat whenever you want a fresh context. Your sessions and drafts stay in this browser.</p><div className="welcome-steps"><span><b>1</b> Connect a model</span><span><b>2</b> Ask anything</span><span><b>3</b> Start fresh when needed</span></div><button className="welcome-button" onClick={onStart}>Write a first message <SendHorizontal size={15}/></button></section>; }
function MessageBubble({ message, modelLabel }: { message: ChatMessage; modelLabel: string }) { return <article className={`message ${message.role} ${message.state ?? ""}`}><div className="message-avatar">{message.role === "user" ? "Y" : <Sparkles size={15}/>}</div><div className="message-body"><header><b>{message.role === "user" ? "You" : modelLabel}</b><time>{message.state === "streaming" ? "Writing…" : new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></header><MarkdownMessage content={message.content}/>{message.state === "streaming" && <span className="typing-cursor"/>}{message.state === "error" && <small>Response was not completed.</small>}</div></article>; }
