"use client";

import { useEffect, useState } from "react";
import { Check, Globe2, LoaderCircle, Power, ShieldCheck } from "lucide-react";
import type { ProxySettings as ProxySettingsValue } from "./types";

type SystemService = { name: string; webEnabled: boolean; secureEnabled: boolean; endpoint?: string };
type SystemStatus = { supported: boolean; services: SystemService[]; error?: string };
const defaultProxy: ProxySettingsValue = { enabled: false, endpoint: "http://localhost:3128" };

export function ProxySettings() {
  const [proxy, setProxy] = useState<ProxySettingsValue>(defaultProxy);
  const [system, setSystem] = useState<SystemStatus>({ supported: false, services: [] });
  const [service, setService] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [testing, setTesting] = useState(false); const [switching, setSwitching] = useState(false);
  async function refresh() {
    const response = await fetch("/api/proxy"); if (!response.ok) return;
    const result = await response.json() as { proxy: ProxySettingsValue; system: SystemStatus };
    setProxy(result.proxy.endpoint ? result.proxy : defaultProxy); setSystem(result.system); setService((current) => current || result.system.services[0]?.name || "");
  }
  useEffect(() => { void Promise.resolve().then(refresh); }, []);
  async function save() {
    setSaving(true); setMessage(""); setError("");
    try { const response = await fetch("/api/proxy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proxy) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save proxy settings."); setProxy(result.proxy); setMessage(result.proxy.enabled ? "Application proxy enabled for provider traffic." : "Application proxy disabled."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save proxy settings."); } finally { setSaving(false); }
  }
  async function test() {
    setTesting(true); setMessage(""); setError("");
    try { const response = await fetch("/api/proxy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...proxy, enabled: true }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Proxy test failed."); setMessage(result.message); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Proxy test failed."); } finally { setTesting(false); }
  }
  async function setSystemProxy(enabled: boolean) {
    if (!service) return;
    if (!window.confirm(`${enabled ? "Enable" : "Disable"} the system HTTP and HTTPS proxy for ${service}? This changes network behavior for all applications using this macOS service.`)) return;
    setSwitching(true); setMessage(""); setError("");
    try { const response = await fetch("/api/proxy/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service, enabled, endpoint: proxy.endpoint }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not update the system proxy."); setSystem(result.system); setMessage(enabled ? `System proxy enabled for ${service}.` : `System proxy disabled for ${service}.`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update the system proxy."); } finally { setSwitching(false); }
  }
  const activeService = system.services.find((item) => item.name === service);
  return <section className="proxy-settings" aria-labelledby="proxy-title"><header><div><span className="crumb">NETWORK ROUTING</span><h3 id="proxy-title"><Globe2 size={15}/> Outbound proxy</h3></div><span className={proxy.enabled ? "configured" : "proxy-off"}>{proxy.enabled ? <><Check size={12}/> App enabled</> : "App direct"}</span></header><p>Route model tests and chat requests through an explicit proxy. This is saved locally and applies to provider traffic only.</p><label className="proxy-toggle"><input type="checkbox" checked={proxy.enabled} onChange={(event) => setProxy({ ...proxy, enabled: event.target.checked })}/><span>Use proxy for Signal provider traffic</span></label><label>Proxy URL<input value={proxy.endpoint} onChange={(event) => setProxy({ ...proxy, endpoint: event.target.value })} placeholder="http://localhost:3128"/><small>Use your proxy host and port. HTTPS destinations normally travel through an HTTP proxy using CONNECT.</small></label><div className="proxy-actions"><button type="button" className="test-button" onClick={test} disabled={testing}>{testing ? <><LoaderCircle size={12}/> Testing…</> : "Test proxy"}</button><button type="button" className="primary-button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save routing"}</button></div>
    <div className="system-proxy"><div><span className="crumb">MACOS NETWORK</span><h4><ShieldCheck size={14}/> System-wide proxy</h4></div>{system.supported ? <><p>Changes both HTTP and HTTPS proxy state for one macOS network service. It is separate from the app-only setting above.</p><label>Network service<select value={service} onChange={(event) => setService(event.target.value)}>{system.services.map((item) => <option key={item.name} value={item.name}>{item.name}{item.webEnabled || item.secureEnabled ? " — proxy enabled" : ""}</option>)}</select></label>{activeService?.endpoint && <small>Current system endpoint: {activeService.endpoint}</small>}<div className="proxy-actions"><button type="button" className="test-button" onClick={() => setSystemProxy(false)} disabled={switching}><Power size={12}/> Disable system proxy</button><button type="button" className="primary-button" onClick={() => setSystemProxy(true)} disabled={switching}>{switching ? "Updating…" : "Enable system proxy"}</button></div></> : <p className="system-unavailable">{system.error || "System proxy controls are unavailable."}</p>}</div>
    {error && <p className="provider-error" role="alert">{error}</p>}{message && <p className="provider-success" role="status">{message}</p>}
  </section>;
}
