"use client";

import { FormEvent, useState } from "react";
import { Bot, Database, FileUp, Globe2, Maximize2, Minimize2, Settings2, Wrench, X } from "lucide-react";
import { ProviderSettings } from "./provider-settings";
import { ProxySettings } from "./proxy-settings";
import type { ModelOption, ProviderSummary, WorkspaceSettings } from "./types";

export type SettingsSection = "models" | "proxy" | "context" | "attachments" | "tools";
type Props = {
  initialSection?: SettingsSection;
  onClose: () => void;
  providers: ProviderSummary[];
  models: ModelOption[];
  activeModelId?: string;
  settings: WorkspaceSettings;
  onProvidersChanged: (providers: ProviderSummary[], models: ModelOption[]) => void;
  onSettingsChanged: (settings: WorkspaceSettings) => void;
};

const navigation: Array<{ id: SettingsSection; label: string; icon: typeof Bot; description: string }> = [
  { id: "models", label: "Models & connections", icon: Bot, description: "Providers, endpoints, and model availability" },
  { id: "proxy", label: "Network & Proxy", icon: Globe2, description: "Application and system routing" },
  { id: "context", label: "Data & Context", icon: Database, description: "Workspace, limits, and catalog trust" },
  { id: "attachments", label: "Attachments", icon: FileUp, description: "Local file storage and upload limits" },
  { id: "tools", label: "Tools & Agents", icon: Wrench, description: "Local access policy and safeguards" }
];

export function SettingsHub({ initialSection = "models", onClose, providers, models, activeModelId, settings, onProvidersChanged, onSettingsChanged }: Props) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [expanded, setExpanded] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("signal-settings-view") === "expanded");
  function toggleExpanded() { setExpanded((value) => { const next = !value; window.localStorage.setItem("signal-settings-view", next ? "expanded" : "dialog"); return next; }); }
  const selected = navigation.find((item) => item.id === section)!;
  const Icon = selected.icon;
  return <div className="settings-scrim" role="presentation"><section className={`settings-hub ${expanded ? "expanded" : ""}`} role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <header className="settings-hub-header"><div className="settings-hub-heading"><span className="crumb">WORKSPACE SETTINGS</span><h2 id="settings-title"><Icon size={19}/>{selected.label}</h2></div><div className="settings-hub-actions"><button className="plain-icon" onClick={toggleExpanded} aria-label={expanded ? "Use compact settings view" : "Expand settings to full screen"}>{expanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button><button className="plain-icon" onClick={onClose} aria-label="Close settings"><X size={18}/></button></div></header>
    <div className="settings-hub-body"><nav className="settings-nav" aria-label="Settings sections">{navigation.map((item) => { const ItemIcon = item.icon; return <button key={item.id} className={section === item.id ? "selected" : ""} onClick={() => setSection(item.id)} aria-current={section === item.id ? "page" : undefined}><ItemIcon size={16}/><span><b>{item.label}</b><small>{item.description}</small></span></button>; })}</nav><div className="settings-content">
      {section === "models" && <ProviderSettings providers={providers} models={models} onChanged={onProvidersChanged}/>}
      {section === "proxy" && <section className="settings-section-content"><header><div><span className="crumb">NETWORK ROUTING</span><h3>Proxy configuration</h3></div></header><ProxySettings/></section>}
      {section === "context" && <DataContextSettings settings={settings} activeModel={models.find((model) => model.id === activeModelId)} onSaved={onSettingsChanged}/>}
      {section === "attachments" && <AttachmentSettings settings={settings} onSaved={onSettingsChanged}/>}
      {section === "tools" && <ToolSettings settings={settings} onSaved={onSettingsChanged}/>}
    </div></div>
  </section></div>;
}

function useSaveSettings(settings: WorkspaceSettings, onSaved: (settings: WorkspaceSettings) => void) {
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function save(update: Partial<WorkspaceSettings>) { setSaving(true); setError(""); setMessage(""); try { const response = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) }); const payload = await response.json() as { settings?: WorkspaceSettings; error?: string }; if (!response.ok || !payload.settings) throw new Error(payload.error || "Could not save workspace settings."); onSaved(payload.settings); setMessage("Saved locally."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save workspace settings."); } finally { setSaving(false); } }
  return { save, saving, message, error };
}

function DataContextSettings({ settings, activeModel, onSaved }: { settings: WorkspaceSettings; activeModel?: ModelOption; onSaved: (settings: WorkspaceSettings) => void }) {
  const { save, saving, message, error } = useSaveSettings(settings, onSaved);
  const override = activeModel ? settings.modelOverrides[activeModel.id] : undefined;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const modelOverrides = { ...settings.modelOverrides };
    if (activeModel) {
      const contextWindow = optionalNumber(form.get("contextWindow"));
      const maxInputTokens = optionalNumber(form.get("maxInputTokens"));
      const maxOutputTokens = optionalNumber(form.get("maxOutputTokens"));
      if (contextWindow || maxInputTokens || maxOutputTokens) modelOverrides[activeModel.id] = { contextWindow, maxInputTokens, maxOutputTokens };
      else delete modelOverrides[activeModel.id];
    }
    void save({ sessionDirectory: String(form.get("sessionDirectory")), reservedOutputTokens: Number(form.get("reserve")), warningPercent: Number(form.get("warning")), criticalPercent: Number(form.get("critical")), catalogUrl: String(form.get("catalogUrl")), catalogPublicKey: String(form.get("catalogPublicKey")), modelOverrides });
  }
  return <section className="settings-section-content" aria-labelledby="context-settings-title"><header><div><span className="crumb">SESSION WORKSPACE</span><h3 id="context-settings-title">Data & Context</h3></div></header><p>These values control the canonical local session workspace and context-budget checks. Context Engine links here for the full configuration.</p><form className="settings-form" onSubmit={submit}><label>Session directory<input name="sessionDirectory" defaultValue={settings.sessionDirectory}/></label><div className="settings-form-grid"><label>Reserved output tokens<input name="reserve" type="number" min="1" defaultValue={settings.reservedOutputTokens}/></label><label>Warn at %<input name="warning" type="number" min="1" max="98" defaultValue={settings.warningPercent}/></label><label>Critical at %<input name="critical" type="number" min="2" max="99" defaultValue={settings.criticalPercent}/></label></div><details><summary>Catalog trust</summary><label>Signed catalog URL<input name="catalogUrl" type="url" defaultValue={settings.catalogUrl}/></label><label>Catalog public key<input name="catalogPublicKey" defaultValue={settings.catalogPublicKey}/></label></details>{activeModel && <details><summary>Override limits for {activeModel.label}</summary><p className="settings-detail-copy">Leave all three fields blank to use verified provider or catalog data.</p><div className="settings-form-grid"><label>Context window<input name="contextWindow" type="number" min="1" defaultValue={override?.contextWindow}/></label><label>Max input<input name="maxInputTokens" type="number" min="1" defaultValue={override?.maxInputTokens}/></label><label>Max output<input name="maxOutputTokens" type="number" min="1" defaultValue={override?.maxOutputTokens}/></label></div></details>}<SettingsFeedback saving={saving} message={message} error={error}/></form></section>;
}

function optionalNumber(value: FormDataEntryValue | null) { const parsed = Number(value); return value === null || value === "" ? undefined : parsed; }

function AttachmentSettings({ settings, onSaved }: { settings: WorkspaceSettings; onSaved: (settings: WorkspaceSettings) => void }) {
  const { save, saving, message, error } = useSaveSettings(settings, onSaved);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ attachmentDirectory: String(form.get("attachmentDirectory")), maxAttachmentBytes: Math.round(Number(form.get("maxAttachmentMb")) * 1024 * 1024) }); }
  return <section className="settings-section-content" aria-labelledby="attachment-settings-title"><header><div><span className="crumb">LOCAL FILES</span><h3 id="attachment-settings-title">Attachments</h3></div></header><p>Attachments are stored locally in the configured Unix directory. Image paste and file uploads will use this location when attachment sending is enabled.</p><form className="settings-form" onSubmit={submit}><label>Attachment directory<input name="attachmentDirectory" defaultValue={settings.attachmentDirectory}/></label><label>Maximum attachment size (MB)<input name="maxAttachmentMb" type="number" min="1" max="100" defaultValue={settings.maxAttachmentBytes / 1024 / 1024}/></label><SettingsFeedback saving={saving} message={message} error={error}/></form></section>;
}

function ToolSettings({ settings, onSaved }: { settings: WorkspaceSettings; onSaved: (settings: WorkspaceSettings) => void }) {
  const { save, saving, message, error } = useSaveSettings(settings, onSaved);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ toolPolicy: { access: String(form.get("access")) === "read-write" ? "read-write" : "read-only", allowCommands: form.get("allowCommands") === "on", allowNetwork: form.get("allowNetwork") === "on" } }); }
  return <section className="settings-section-content" aria-labelledby="tool-settings-title"><header><div><span className="crumb">LOCAL AUTOMATION</span><h3 id="tool-settings-title">Tools & Agents</h3></div></header><p>Tools default to read-only local access. Command execution and network access are disabled until you intentionally enable them in this workspace configuration file.</p><form className="settings-form" onSubmit={submit}><label>File access<select name="access" defaultValue={settings.toolPolicy.access}><option value="read-only">Read-only</option><option value="read-write">Read and write</option></select></label><label className="settings-check"><input name="allowCommands" type="checkbox" defaultChecked={settings.toolPolicy.allowCommands}/><span>Allow local command tools</span></label><label className="settings-check"><input name="allowNetwork" type="checkbox" defaultChecked={settings.toolPolicy.allowNetwork}/><span>Allow network tools</span></label><SettingsFeedback saving={saving} message={message} error={error}/></form></section>;
}

function SettingsFeedback({ saving, message, error }: { saving: boolean; message: string; error: string }) { return <><div className="settings-form-actions"><span>Changes are saved in your local workspace configuration.</span><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>{error && <p className="provider-error" role="alert">{error}</p>}{message && <p className="provider-success" role="status">{message}</p>}</>; }
