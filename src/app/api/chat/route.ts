import { findModel, openAiCompatibleChat, openAiCompatibleRequest, providerFetch } from "@/features/chat/runtime";
import { localOnlyResponse } from "@/features/chat/local-access";
import { contextMessages, profileFor, snapshotFor } from "@/features/chat/context-engine";
import { getWorkspaceSettings, loadWorkspace } from "@/features/chat/workspace";
import type { TokenUsage } from "@/features/chat/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type InputMessage = { role: "user" | "assistant"; content: string };
type UpstreamResponse = Awaited<ReturnType<typeof providerFetch>>;
type ChatDiagnostics = { provider: string; model: string; endpoint: string; status: number; reason: string; apiVersion?: string; route: string };
type StreamItem = { text?: string; usage?: TokenUsage };
function error(message: string, status: number, diagnostics?: ChatDiagnostics) { return Response.json({ error: message, diagnostics }, { status }); }
function cleanReason(value: string) { return value.replace(/\s+/g, " ").replace(/(api[-_ ]?key|authorization)\s*[:=]\s*[^,}\s]+/gi, "$1: [redacted]").slice(0, 500) || "No detail was returned by the provider."; }
function numeric(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function usageFrom(value: unknown, inputName: string, outputName: string): TokenUsage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const object = value as Record<string, unknown>; const inputTokens = numeric(object[inputName]); const outputTokens = numeric(object[outputName]);
  if (inputTokens === undefined && outputTokens === undefined) return undefined;
  return { inputTokens, outputTokens, totalTokens: numeric(object.total_tokens) || (inputTokens || 0) + (outputTokens || 0), source: "provider" };
}
function sse(event: string, data: unknown) { return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; }
function eventStream(upstream: UpstreamResponse, extract: (payload: Record<string, unknown>) => StreamItem) {
  const decoder = new TextDecoder(); const encoder = new TextEncoder(); const reader = upstream.body!.getReader(); let remainder = ""; let usage: TokenUsage | undefined;
  return new ReadableStream({ async pull(controller) {
    const { done, value } = await reader.read();
    if (done) { if (usage) controller.enqueue(encoder.encode(sse("usage", usage))); controller.enqueue(encoder.encode(sse("complete", {}))); controller.close(); return; }
    remainder += decoder.decode(value, { stream: true }); const lines = remainder.split("\n"); remainder = lines.pop() ?? "";
    for (const rawLine of lines) { const line = rawLine.trim(); if (!line.startsWith("data:")) continue; const data = line.slice(5).trim(); if (data === "[DONE]") continue; try {
      const item = extract(JSON.parse(data)); if (item.text) controller.enqueue(encoder.encode(sse("delta", { text: item.text })));
      if (item.usage) usage = { ...usage, ...item.usage, totalTokens: item.usage.totalTokens || ((item.usage.inputTokens || usage?.inputTokens || 0) + (item.usage.outputTokens || usage?.outputTokens || 0)), source: "provider" };
    } catch { /* Provider keep-alives and malformed non-data events are not chat output. */ } }
  }, cancel() { reader.cancel(); } });
}
function openAiItem(payload: Record<string, unknown>): StreamItem {
  const text = (payload.choices as Array<{ delta?: { content?: string } }> | undefined)?.[0]?.delta?.content;
  return { text, usage: usageFrom(payload.usage, "prompt_tokens", "completion_tokens") };
}
function geminiItem(payload: Record<string, unknown>): StreamItem {
  const text = ((payload.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.[0]?.content?.parts ?? []).map((part) => part.text || "").join("");
  return { text, usage: usageFrom(payload.usageMetadata, "promptTokenCount", "candidatesTokenCount") };
}
function responsesItem(payload: Record<string, unknown>): StreamItem {
  const response = payload.response as { usage?: unknown } | undefined;
  return { text: payload.type === "response.output_text.delta" && typeof payload.delta === "string" ? payload.delta : undefined, usage: usageFrom(response?.usage, "input_tokens", "output_tokens") };
}
function anthropicItem(payload: Record<string, unknown>): StreamItem {
  const messageUsage = (payload.message as { usage?: unknown } | undefined)?.usage;
  return { text: payload.type === "content_block_delta" && typeof (payload.delta as { text?: unknown } | undefined)?.text === "string" ? (payload.delta as { text: string }).text : undefined, usage: usageFrom(messageUsage || payload.usage, "input_tokens", "output_tokens") };
}

export async function POST(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  const body = await request.json().catch(() => null) as { sessionId?: string } | null;
  if (!body?.sessionId) return error("A saved session is required.", 400);
  const workspace = await loadWorkspace(); const session = workspace?.sessions.find((item) => item.id === body.sessionId);
  if (!session) return error("The requested session is not available in the local workspace.", 404);
  const settings = await getWorkspaceSettings(); const snapshot = snapshotFor(session, profileFor(session.modelId, settings), settings, session.draft);
  if (snapshot.health === "blocked") return error("This message would exceed the selected model’s usable context budget. Compact the session or select a larger-context model.", 413);
  const messages = contextMessages(session) as InputMessage[];
  if (!messages.length) return error("Write a message before sending.", 400);
  if (messages.some((message) => message.content.length > 1_000_000) || messages.reduce((total, message) => total + message.content.length, 0) > 10_000_000) return error("This conversation exceeds Signal’s local transport safety limit.", 413);
  const connection = await findModel(session.modelId); if (!connection) return error("Select a configured provider model before sending a message.", 400);
  const { provider, model } = connection; const apiVersion = provider.kind === "azure-openai" ? provider.apiVersion || "2024-10-21" : undefined; let upstream: UpstreamResponse;
  try {
    if (provider.kind === "gemini") { const endpoint = `${provider.endpoint || "https://generativelanguage.googleapis.com/v1beta"}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`; upstream = await providerFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": provider.apiKey }, body: JSON.stringify({ contents: messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })) }), signal: request.signal }); }
    else if (provider.kind === "anthropic") upstream = await providerFetch(`${provider.endpoint}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": provider.apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: settings.reservedOutputTokens, stream: true, messages }), signal: request.signal });
    else if (provider.kind === "openai-responses") upstream = await providerFetch(`${provider.endpoint}/responses`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` }, body: JSON.stringify({ model, input: messages.map((message) => ({ role: message.role, content: message.content })), stream: true, max_output_tokens: settings.reservedOutputTokens }), signal: request.signal });
    else if (provider.kind === "azure-openai") { const endpoint = `${provider.endpoint}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=${encodeURIComponent(apiVersion || "2024-10-21")}`; upstream = await openAiCompatibleRequest(endpoint, { "Content-Type": "application/json", "api-key": provider.apiKey }, { messages, stream: true, max_completion_tokens: settings.reservedOutputTokens, stream_options: { include_usage: true } }, request.signal); }
    else upstream = await openAiCompatibleChat(provider.endpoint, provider.apiKey, { model, messages, stream: true, max_completion_tokens: settings.reservedOutputTokens, stream_options: { include_usage: true } }, request.signal);
  } catch (caught) { return error("The configured provider endpoint could not be reached.", 502, { provider: provider.kind, model, endpoint: provider.endpoint, status: 502, reason: cleanReason(caught instanceof Error ? caught.message : "Network request failed."), apiVersion, route: "chat" }); }
  if (!upstream.ok || !upstream.body) return error("The configured provider rejected this request.", upstream.status || 502, { provider: provider.kind, model, endpoint: provider.endpoint, status: upstream.status || 502, reason: cleanReason(await upstream.text()), apiVersion, route: "chat" });
  const stream = provider.kind === "gemini" ? eventStream(upstream, geminiItem) : provider.kind === "anthropic" ? eventStream(upstream, anthropicItem) : provider.kind === "openai-responses" ? eventStream(upstream, responsesItem) : eventStream(upstream, openAiItem);
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive" } });
}
