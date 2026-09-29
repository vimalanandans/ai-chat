"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Archive, ChevronRight, Database, PanelRightClose, RefreshCw, Save, Sparkles } from "lucide-react";
import type { ChatSession, ContextSnapshot, WorkspaceSettings } from "./types";

type Props = { session: ChatSession; settings: WorkspaceSettings; width: number; onClose: () => void; onWidthChange: (width: number) => void; onSessionChange: (session: ChatSession) => void; onSettingsChange: (settings: WorkspaceSettings) => void; canImportBrowserBackup: boolean; onImportBrowserBackup: () => void };
function count(value?: number) { return value === undefined ? "—" : new Intl.NumberFormat().format(Math.max(0, Math.round(value))); }
function status(snapshot?: ContextSnapshot) { return snapshot?.health || "unknown"; }
const minDrawerWidth = 280;
const maxDrawerWidth = 520;
function clampDrawerWidth(value: number) { return Math.max(minDrawerWidth, Math.min(maxDrawerWidth, value)); }

export function ContextPanel({ session, settings, width, onClose, onWidthChange, onSessionChange, onSettingsChange, canImportBrowserBackup, onImportBrowserBackup }: Props) {
  const [snapshot, setSnapshot] = useState<ContextSnapshot>();
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string>();
  const [metadataStatus, setMetadataStatus] = useState<string>();
  const resize = useRef<{ pointerId: number; startX: number; startWidth: number } | undefined>(undefined);
  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const [draftSummary, setDraftSummary] = useState(""); const [candidateIds, setCandidateIds] = useState<string[]>([]); const [settingsOpen, setSettingsOpen] = useState(false);
  const refresh = async () => { const response = await fetch(`/api/context?sessionId=${encodeURIComponent(session.id)}`); const data = await response.json() as { snapshot?: ContextSnapshot; error?: string }; if (response.ok && data.snapshot) setSnapshot(data.snapshot); else setError(data.error || "Could not calculate context."); };
  useEffect(() => { let cancelled = false; void (async () => { const response = await fetch(`/api/context?sessionId=${encodeURIComponent(session.id)}`); const data = await response.json() as { snapshot?: ContextSnapshot; error?: string }; if (cancelled) return; if (response.ok && data.snapshot) setSnapshot(data.snapshot); else setError(data.error || "Could not calculate context."); })(); return () => { cancelled = true; }; }, [session.id, session.updatedAt, session.draft, session.modelId]);
  async function prepareCompaction() {
    setLoading(true); setError(undefined);
    try { const response = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", sessionId: session.id }) }); const data = await response.json() as { messageIds?: string[]; summary?: string; error?: string }; if (!response.ok) throw new Error(data.error || "Could not plan compaction."); setCandidateIds(data.messageIds || []); setDraftSummary(data.summary || ""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not plan compaction."); } finally { setLoading(false); }
  }
  async function applyCompaction(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(undefined);
    try { const response = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply", sessionId: session.id, summary: draftSummary, messageIds: candidateIds }) }); const data = await response.json() as { session?: ChatSession; error?: string }; if (!response.ok || !data.session) throw new Error(data.error || "Could not archive context."); onSessionChange(data.session); setCandidateIds([]); setDraftSummary(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not archive context."); } finally { setLoading(false); }
  }
  async function refreshMetadata() {
    setLoading(true); setError(undefined); setMetadataStatus(undefined);
    try { const response = await fetch("/api/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) }); const data = await response.json() as { refreshedModelIds?: string[]; warnings?: string[]; error?: string }; if (!response.ok) throw new Error(data.error || "Model metadata could not be refreshed."); const refreshed = data.refreshedModelIds?.length ? `Updated ${data.refreshedModelIds.length} model profile${data.refreshedModelIds.length === 1 ? "" : "s"}.` : "No provider model limits were updated."; setMetadataStatus([refreshed, ...(data.warnings || [])].join(" ")); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Model metadata could not be refreshed."); } finally { setLoading(false); }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setLoading(true); setError(undefined);
    try { const numberOrUndefined = (name: string) => { const value = String(form.get(name) || "").trim(); return value ? Number(value) : undefined; }; const override = { contextWindow: numberOrUndefined("contextWindow"), maxInputTokens: numberOrUndefined("maxInputTokens"), maxOutputTokens: numberOrUndefined("maxOutputTokens") }; const modelOverrides = { ...settings.modelOverrides }; if (Object.values(override).some((value) => value !== undefined)) modelOverrides[session.modelId] = override; else delete modelOverrides[session.modelId]; const response = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionDirectory: form.get("sessionDirectory"), reservedOutputTokens: Number(form.get("reserve")), warningPercent: Number(form.get("warning")), criticalPercent: Number(form.get("critical")), catalogUrl: form.get("catalogUrl"), catalogPublicKey: form.get("catalogPublicKey"), modelOverrides }) }); const data = await response.json() as { settings?: WorkspaceSettings; error?: string }; if (!response.ok || !data.settings) throw new Error(data.error || "Could not save context settings."); onSettingsChange(data.settings); setSettingsOpen(false); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save context settings."); } finally { setLoading(false); }
  }
  function beginResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    resize.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveResize(event: ReactPointerEvent<HTMLDivElement>) {
    const current = resize.current;
    if (!current || current.pointerId !== event.pointerId) return;
    onWidthChange(clampDrawerWidth(current.startWidth + current.startX - event.clientX));
  }
  function endResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (resize.current?.pointerId !== event.pointerId) return;
    resize.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    const next = event.key === "ArrowLeft" ? width + 16 : event.key === "ArrowRight" ? width - 16 : event.key === "Home" ? minDrawerWidth : event.key === "End" ? maxDrawerWidth : undefined;
    if (next === undefined) return;
    event.preventDefault();
    onWidthChange(clampDrawerWidth(next));
  }
  const percent = snapshot?.usablePromptTokens ? Math.min(100, Math.round(snapshot.activeTokens / snapshot.usablePromptTokens * 100)) : 0;
  return <aside id="context-drawer" className="context-panel" style={{ width }} aria-label="Context status">
    <div className="context-drawer-resizer" role="separator" aria-label="Resize context drawer" aria-orientation="vertical" aria-valuemin={minDrawerWidth} aria-valuemax={maxDrawerWidth} aria-valuenow={width} tabIndex={0} onPointerDown={beginResize} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} onKeyDown={resizeWithKeyboard}/>
    <header><div><span className="crumb">CONTEXT ENGINE</span><h2>Session context</h2></div><button className="plain-icon" onClick={onClose} aria-label="Close context panel"><PanelRightClose size={18}/></button></header>
    <section className={`context-meter ${status(snapshot)}`}><div><b>{snapshot?.usablePromptTokens === undefined ? "Limit unknown" : `${percent}% of active budget`}</b><span>{count(snapshot?.activeTokens)} tokens · {count(snapshot?.activeWords)} words</span></div><div className="context-track"><i style={{ width: `${percent}%` }}/></div><small>{snapshot?.usablePromptTokens === undefined ? "Gemini refreshes from its API; other providers need a verified catalog or a model override to validate sends." : `${count(snapshot.remainingTokens)} tokens remain after a ${count(snapshot.reservedOutputTokens)}-token output reserve.`}</small></section>
    <section className="context-grid"><Metric label="Active prompt" value={count(snapshot?.activeTokens)} detail="estimated next send"/><Metric label="Stored history" value={count(snapshot?.storedTokens)} detail={`${count(snapshot?.storedWords)} words`}/><Metric label="Archived" value={count(snapshot?.archivedTokens)} detail="kept locally"/><Metric label="Last measured" value={count(snapshot?.measuredUsage?.inputTokens)} detail={snapshot?.measuredUsage ? `+ ${count(snapshot.measuredUsage.outputTokens)} output` : "provider usage unavailable"}/></section>
    <section className="context-model"><div><span>Selected model</span><b>{snapshot?.model.modelId || session.modelId}</b></div><div><span>Context / output</span><b>{count(snapshot?.model.contextWindow)} / {count(snapshot?.model.maxOutputTokens)}</b></div><div><span>Metadata</span><b>{snapshot?.model.source || "unknown"}{snapshot?.model.stale ? " · stale" : ""}</b></div><button className="small-action" onClick={refreshMetadata} disabled={loading}><RefreshCw size={13}/> Refresh model data</button>{metadataStatus && <p className="context-notice" role="status">{metadataStatus}</p>}</section>
    <section className="context-timeline"><div className="section-title"><span>Context history</span><small>{session.context?.timeline.length || 0} saved checkpoints</small></div>{session.context?.timeline.length ? <ol>{session.context.timeline.slice(-6).reverse().map((point, index) => <li key={`${point.createdAt}:${index}`}><i/><span>{point.reason === "compaction" ? "Compacted active context" : point.reason === "model-change" ? "Changed model" : "Saved message"}</span><b>{count(point.activeTokens)} tokens</b></li>)}</ol> : <p>Usage checkpoints appear as you message or compact this session.</p>}</section>
    <section className="context-actions"><div className="section-title"><span>Compact deliberately</span><small>Raw turns stay archived in this workspace.</small></div>{!candidateIds.length ? <button className="primary-button" onClick={prepareCompaction} disabled={loading || session.messages.length < 3}><Archive size={14}/> {loading ? "Summarizing…" : "Generate summary"}</button> : <form onSubmit={applyCompaction}><p>Review the summary before applying it. It is generated with the selected model and will send the marked history to that provider. Signal retains the newest turns and archives {candidateIds.length} earlier messages.</p><textarea value={draftSummary} onChange={(event) => setDraftSummary(event.target.value)} aria-label="Compaction summary"/><button className="primary-button" disabled={loading || !draftSummary.trim()}><Sparkles size={14}/> Apply reviewed summary</button></form>}</section>
    <section className="context-settings"><button className="settings-toggle" onClick={() => setSettingsOpen((open) => !open)}><Database size={14}/> Data & context settings <ChevronRight size={14}/></button>{settingsOpen && <form onSubmit={saveSettings}><label>Session directory<input name="sessionDirectory" defaultValue={settings.sessionDirectory}/></label><label>Reserved output tokens<input name="reserve" type="number" min="1" defaultValue={settings.reservedOutputTokens}/></label><div className="thresholds"><label>Warn %<input name="warning" type="number" min="1" max="98" defaultValue={settings.warningPercent}/></label><label>Critical %<input name="critical" type="number" min="2" max="99" defaultValue={settings.criticalPercent}/></label></div><div className="model-overrides"><span>Selected-model override</span><label>Context window<input name="contextWindow" type="number" min="1" defaultValue={snapshot?.model.contextWindow}/></label><label>Max input<input name="maxInputTokens" type="number" min="1" defaultValue={snapshot?.model.maxInputTokens}/></label><label>Max output<input name="maxOutputTokens" type="number" min="1" defaultValue={snapshot?.model.maxOutputTokens}/></label></div><label>Signed catalog URL<input name="catalogUrl" type="url" defaultValue={settings.catalogUrl}/></label><label>Catalog public key (base64 SPKI)<input name="catalogPublicKey" defaultValue={settings.catalogPublicKey}/></label><button className="small-action" disabled={loading}><Save size={13}/> Save settings</button></form>}{canImportBrowserBackup && <button className="small-action import-backup" onClick={onImportBrowserBackup}>Import browser backup</button>}</section>
    {error && <p className="context-error" role="alert">{error}</p>}
    <div className="context-resize"><input type="range" min="280" max="520" value={width} onChange={(event) => onWidthChange(Number(event.target.value))} aria-label="Context panel width"/></div>
  </aside>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div><span>{label}</span><b>{value}</b><small>{detail}</small></div>; }
