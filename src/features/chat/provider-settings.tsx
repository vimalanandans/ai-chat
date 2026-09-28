"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { createProviderDrafts, parseProviderDrafts, providerDefaults, providerDraftKey, updateProviderDraft } from "./provider-drafts";
import { ProxySettings } from "./proxy-settings";
import type { ModelOption, ProviderKind, ProviderSummary } from "./types";

type ProviderDiagnostics = { provider: string; endpoint: string; model: string; apiVersion?: string; tokenLimit: string; proxy: string };
type StoredConnectionDraft = { id?: string; name: string; kind: ProviderKind; endpoint: string; models: string; apiVersion: string; apiKey: string };
const kinds = Object.keys(providerDefaults) as ProviderKind[];
const labels: Record<ProviderKind, string> = { openai: "Compatible", "openai-responses": "OpenAI", "azure-openai": "Azure", gemini: "Gemini", anthropic: "Anthropic" };
const icons: Record<ProviderKind, string> = { openai: "AI", "openai-responses": "AI", "azure-openai": "AZ", gemini: "G", anthropic: "AN" };
function splitModels(models: string) { return models.split(",").map((model) => model.trim()).filter(Boolean); }

export function ProviderSettings({ onClose, providers, models: _models, onChanged }: { onClose: () => void; providers: ProviderSummary[]; models: ModelOption[]; onChanged: (providers: ProviderSummary[], models: ModelOption[]) => void }) {
  const [kind, setKind] = useState<ProviderKind>("openai");
  const [drafts, setDrafts] = useState(createProviderDrafts);
  const [keys, setKeys] = useState<Record<ProviderKind, string>>(() => Object.fromEntries(kinds.map((item) => [item, ""])) as Record<ProviderKind, string>);
  const [editingId, setEditingId] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(""); const [testMessage, setTestMessage] = useState(""); const [diagnostics, setDiagnostics] = useState<ProviderDiagnostics>(); const [saving, setSaving] = useState(false); const [testing, setTesting] = useState(false);
  const draft = drafts[kind];
  const connection = useMemo<StoredConnectionDraft>(() => ({ ...draft, kind, apiKey: keys[kind] }), [draft, kind, keys]);

  useEffect(() => { void Promise.resolve().then(() => { const legacyDraft = window.localStorage.getItem("signal-provider-draft-v1"); setDrafts(parseProviderDrafts(window.localStorage.getItem(providerDraftKey) || legacyDraft)); if (legacyDraft) window.localStorage.removeItem("signal-provider-draft-v1"); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) window.localStorage.setItem(providerDraftKey, JSON.stringify(drafts)); }, [drafts, loaded]);

  function resetFeedback() { setError(""); setTestMessage(""); setDiagnostics(undefined); }
  function selectProvider(next: ProviderKind) { setKind(next); setEditingId(undefined); resetFeedback(); }
  function updateDraft(patch: Partial<typeof draft>) { setDrafts((current) => updateProviderDraft(current, kind, patch)); resetFeedback(); }
  function updateKey(value: string) { setKeys((current) => ({ ...current, [kind]: value })); resetFeedback(); }
  function formPayload(extra: Partial<StoredConnectionDraft> = {}) { const values = { ...connection, id: editingId, ...extra }; return { ...values, models: Array.isArray(extra.models) ? extra.models : splitModels(values.models) }; }
  function clearCurrentDraft() { setDrafts((current) => updateProviderDraft(current, kind, providerDefaults[kind])); setKeys((current) => ({ ...current, [kind]: "" })); setEditingId(undefined); }
  function edit(provider: ProviderSummary) { setKind(provider.kind); setDrafts((current) => updateProviderDraft(current, provider.kind, { name: provider.name, endpoint: provider.endpoint, models: provider.models.join(", "), apiVersion: provider.apiVersion || providerDefaults[provider.kind].apiVersion })); setKeys((current) => ({ ...current, [provider.kind]: "" })); setEditingId(provider.id); resetFeedback(); }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); resetFeedback();
    try {
      const response = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formPayload()) });
      const result = await response.json() as { error?: string; providers: ProviderSummary[]; models: ModelOption[] };
      if (!response.ok) throw new Error(result.error || "Could not save provider.");
      onChanged(result.providers, result.models); const wasEditing = Boolean(editingId); clearCurrentDraft(); setTestMessage(wasEditing ? "Connection updated." : "Connection saved. You can add another independent connection.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save provider."); } finally { setSaving(false); }
  }
  async function test(input?: Partial<StoredConnectionDraft>) {
    setTesting(true); resetFeedback();
    try {
      const response = await fetch("/api/providers/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formPayload(input)) });
      const result = await response.json() as { error?: string; message?: string; diagnostics?: ProviderDiagnostics };
      setDiagnostics(result.diagnostics); if (!response.ok) throw new Error(result.error || "Connection test failed."); setTestMessage(result.message || "Connection test completed.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection test failed."); } finally { setTesting(false); }
  }
  async function remove(id: string) {
    resetFeedback(); const response = await fetch(`/api/providers?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const result = await response.json() as { error?: string; providers: ProviderSummary[]; models: ModelOption[] };
    if (!response.ok) { setError(result.error || "Could not remove provider."); return; } onChanged(result.providers, result.models);
  }

  return <div className="settings-scrim" role="presentation"><section className="provider-card" role="dialog" aria-modal="true" aria-labelledby="provider-title"><header><div><span className="crumb">MODEL CONNECTIONS</span><h2 id="provider-title">Connect a model provider</h2></div><button className="plain-icon" onClick={onClose} aria-label="Close model connections"><X size={18}/></button></header><p className="provider-intro">Each provider has a separate draft. Switching tabs never transfers an endpoint, model, deployment, or key to a different provider.</p>
    <div className="provider-list" aria-label="Saved connections">{providers.length ? providers.map((provider) => <div className="provider-row" key={provider.id}><span className={`provider-kind ${provider.kind}`}>{icons[provider.kind]}</span><div><b>{provider.name}</b><small>{provider.models.join(", ")} · {provider.endpoint}</small></div><span className="configured"><Check size={12}/> Saved</span><button className="test-provider" type="button" onClick={() => test({ id: provider.id, name: provider.name, kind: provider.kind, endpoint: provider.endpoint, models: provider.models.join(", "), apiVersion: provider.apiVersion, apiKey: "" })}>Test</button>{provider.id !== "environment" && <><button className="test-provider" type="button" onClick={() => edit(provider)} aria-label={`Edit ${provider.name}`}><Pencil size={12}/> Edit</button><button className="delete-provider" type="button" onClick={() => remove(provider.id)} aria-label={`Remove ${provider.name}`}><Trash2 size={15}/></button></>}</div>) : <div className="no-providers">No saved connections yet. Configure one below.</div>}</div>
    <form className="provider-form" onSubmit={save}><fieldset className="provider-picker"><legend>Provider type</legend><div role="tablist" aria-label="Provider type">{kinds.map((item) => <button type="button" role="tab" aria-selected={kind === item} className={kind === item ? "selected" : ""} onClick={() => selectProvider(item)} key={item}>{labels[item]}</button>)}</div></fieldset><div className="provider-draft-label"><span>{editingId ? `Editing ${labels[kind]} connection` : `${labels[kind]} connection draft`}</span><small>{editingId ? "Leave the API key blank to keep the saved key, or enter a replacement." : "Values save locally as you type. This key is retained only while this dialog stays open."}</small></div><label>Connection name<input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} placeholder="My provider" required/></label><label>{kind === "azure-openai" ? "Azure resource endpoint" : "API base endpoint"}<input value={draft.endpoint} onChange={(event) => updateDraft({ endpoint: event.target.value })} placeholder={providerDefaults[kind].endpoint} required/>{kind === "azure-openai" && <small>Example: https://your-resource.openai.azure.com</small>}</label><label>API key<input type="password" value={keys[kind]} onChange={(event) => updateKey(event.target.value)} placeholder={editingId ? "Leave blank to keep the saved key" : "Held in memory until saved"} autoComplete="off" required={!editingId}/></label><label>{kind === "azure-openai" ? "Deployment name" : "Model ID"}<input value={draft.models} onChange={(event) => updateDraft({ models: event.target.value })} placeholder={providerDefaults[kind].models} required/><small>{kind === "azure-openai" ? "Use the Azure deployment name, not the underlying model name. Add comma-separated values for multiple deployments." : "Add comma-separated values to expose more than one model from this connection."}</small></label>{kind === "azure-openai" && <label>API version<input value={draft.apiVersion} onChange={(event) => updateDraft({ apiVersion: event.target.value })} required/></label>}{error && <p className="provider-error" role="alert">{error}</p>}{testMessage && <p className="provider-success" role="status">{testMessage}</p>}{diagnostics && <p className="provider-diagnostics">Provider: {diagnostics.provider} · Model/deployment: {diagnostics.model} · API version: {diagnostics.apiVersion || "—"} · Output limit: {diagnostics.tokenLimit} · Route: {diagnostics.proxy}<br/>Endpoint: {diagnostics.endpoint}</p>}<footer><span>Test first, then save. Saved connections persist securely on this machine.</span><div>{editingId && <button type="button" className="test-button" onClick={clearCurrentDraft}>Cancel edit</button>}<button type="button" className="test-button" onClick={() => test()} disabled={testing}>{testing ? "Testing…" : "Test connection"}</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : <><Plus size={14}/>{editingId ? "Save changes" : "Save connection"}</>}</button></div></footer></form><ProxySettings />
  </section></div>;
}
