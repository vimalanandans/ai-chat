"use client";

import { FormEvent, useState } from "react";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import type { ModelOption, ProviderKind, ProviderSummary } from "./types";

type FormState = { name: string; kind: ProviderKind; endpoint: string; apiKey: string; models: string; apiVersion: string };
const defaults: Record<ProviderKind, Pick<FormState, "name" | "endpoint" | "apiVersion">> = {
  openai: { name: "OpenAI", endpoint: "https://api.openai.com/v1", apiVersion: "" },
  "openai-responses": { name: "OpenAI", endpoint: "https://api.openai.com/v1", apiVersion: "" },
  "azure-openai": { name: "Azure OpenAI", endpoint: "https://YOUR-RESOURCE.openai.azure.com", apiVersion: "2024-10-21" },
  gemini: { name: "Google Gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta", apiVersion: "" },
  anthropic: { name: "Anthropic", endpoint: "https://api.anthropic.com/v1", apiVersion: "" }
};

export function ProviderSettings({ onClose, providers, models, onChanged }: { onClose: () => void; providers: ProviderSummary[]; models: ModelOption[]; onChanged: (providers: ProviderSummary[], models: ModelOption[]) => void }) {
  const [form, setForm] = useState<FormState>({ ...defaults.openai, kind: "openai", apiKey: "", models: "gpt-4.1-mini" });
  const [error, setError] = useState(""); const [testMessage, setTestMessage] = useState(""); const [saving, setSaving] = useState(false); const [testing, setTesting] = useState(false);
  function chooseKind(kind: ProviderKind) { setForm((current) => ({ ...current, kind, ...defaults[kind], models: kind === "gemini" ? "gemini-2.5-flash" : kind === "anthropic" ? "claude-sonnet-4-5" : current.models })); setError(""); setTestMessage(""); }
  function payload(extra: Record<string, unknown> = {}) { const models = Array.isArray(extra.models) ? extra.models : form.models.split(",").map((model) => model.trim()).filter(Boolean); return { ...form, ...extra, models }; }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save provider.");
      onChanged(result.providers, result.models); setForm({ ...defaults.openai, kind: "openai", apiKey: "", models: "gpt-4.1-mini" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save provider."); } finally { setSaving(false); }
  }
  async function test(input: Record<string, unknown> = {}) {
    setTesting(true); setError(""); setTestMessage("");
    try { const response = await fetch("/api/providers/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(input)) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Connection test failed."); setTestMessage(result.message); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Connection test failed."); } finally { setTesting(false); }
  }
  async function remove(id: string) {
    const response = await fetch(`/api/providers?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const result = await response.json();
    if (!response.ok) { setError(result.error || "Could not remove provider."); return; } onChanged(result.providers, result.models);
  }
  return <div className="settings-scrim" role="presentation"><section className="provider-card" role="dialog" aria-modal="true" aria-labelledby="provider-title"><header><div><span className="crumb">MODEL CONNECTIONS</span><h2 id="provider-title">Add your providers</h2></div><button className="plain-icon" onClick={onClose} aria-label="Close model connections"><X size={18}/></button></header><p className="provider-intro">Connections are saved only on this machine in a Git-ignored local file. Your API key never appears in chat history or source control.</p>
    <div className="provider-list">{providers.length ? providers.map((provider) => <div className="provider-row" key={provider.id}><span className={`provider-kind ${provider.kind}`}>{provider.kind === "azure-openai" ? "AZ" : provider.kind === "gemini" ? "G" : provider.kind === "anthropic" ? "AN" : "AI"}</span><div><b>{provider.name}</b><small>{provider.models.join(", ")}</small></div><span className="configured"><Check size={12}/> Connected</span><button className="test-provider" onClick={() => test({ id: provider.id, apiKey: "", models: provider.models, kind: provider.kind, endpoint: provider.endpoint, apiVersion: provider.apiVersion })}>Test</button>{provider.id !== "environment" && <button className="delete-provider" onClick={() => remove(provider.id)} aria-label={`Remove ${provider.name}`}><Trash2 size={15}/></button>}</div>) : <div className="no-providers">No providers yet. Add your first model connection below.</div>}</div>
    <form className="provider-form" onSubmit={save}><div className="type-picker">{(["openai", "openai-responses", "azure-openai", "gemini", "anthropic"] as ProviderKind[]).map((kind) => <button type="button" className={form.kind === kind ? "selected" : ""} onClick={() => chooseKind(kind)} key={kind}>{kind === "openai" ? "Compatible" : kind === "openai-responses" ? "OpenAI" : kind === "azure-openai" ? "Azure" : kind === "gemini" ? "Gemini" : "Anthropic"}</button>)}</div><label>Connection name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="My provider" required/></label><label>{form.kind === "azure-openai" ? "Azure resource endpoint" : "API base endpoint"}<input value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })} required/></label><label>API key<input type="password" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder="Stored locally on this machine" required/></label><label>{form.kind === "azure-openai" ? "Deployment names" : "Model IDs"}<input value={form.models} onChange={(event) => setForm({ ...form, models: event.target.value })} placeholder="comma-separated-models" required/><small>Separate multiple {form.kind === "azure-openai" ? "deployment names" : "model IDs"} with commas.</small></label>{form.kind === "azure-openai" && <label>API version<input value={form.apiVersion} onChange={(event) => setForm({ ...form, apiVersion: event.target.value })}/></label>}{error && <p className="provider-error" role="alert">{error}</p>}{testMessage && <p className="provider-success" role="status">{testMessage}</p>}<footer><span>Save one connection per endpoint/key; add another for a different key.</span><div><button type="button" className="test-button" onClick={() => test()} disabled={testing}>{testing ? "Testing…" : "Test connection"}</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : <><Plus size={14}/> Add provider</>}</button></div></footer></form>
  </section></div>;
}
