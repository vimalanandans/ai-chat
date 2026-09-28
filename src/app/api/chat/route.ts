import { findModel } from "@/features/chat/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type InputMessage = { role: "user" | "assistant"; content: string };
function error(message: string, status: number) { return Response.json({ error: message }, { status }); }
function textStream(upstream: Response, extract: (payload: Record<string, unknown>) => string | undefined) {
  const decoder = new TextDecoder(); const encoder = new TextEncoder(); const reader = upstream.body!.getReader(); let remainder = "";
  return new ReadableStream({ async pull(controller) { const { done, value } = await reader.read(); if (done) { controller.close(); return; } remainder += decoder.decode(value, { stream: true }); const lines = remainder.split("\n"); remainder = lines.pop() ?? ""; for (const rawLine of lines) { const line = rawLine.trim(); if (!line.startsWith("data:")) continue; const data = line.slice(5).trim(); if (data === "[DONE]") { controller.close(); return; } try { const content = extract(JSON.parse(data)); if (content) controller.enqueue(encoder.encode(content)); } catch { /* Ignore provider keep-alives. */ } } }, cancel() { reader.cancel(); } });
}
function openAiStream(upstream: Response) { return textStream(upstream, (payload) => (payload.choices as Array<{ delta?: { content?: string } }> | undefined)?.[0]?.delta?.content); }
function geminiStream(upstream: Response) { return textStream(upstream, (payload) => ((payload.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)?.[0]?.content?.parts ?? []).map((part) => part.text || "").join("")); }
function responsesStream(upstream: Response) { return textStream(upstream, (payload) => payload.type === "response.output_text.delta" && typeof payload.delta === "string" ? payload.delta : undefined); }
function anthropicStream(upstream: Response) { return textStream(upstream, (payload) => payload.type === "content_block_delta" && typeof (payload.delta as { text?: unknown } | undefined)?.text === "string" ? (payload.delta as { text: string }).text : undefined); }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { model?: string; messages?: InputMessage[] } | null;
  if (!body?.model || !Array.isArray(body.messages) || !body.messages.length) return error("A model and at least one message are required.", 400);
  if (body.messages.length > 100 || body.messages.some((message) => typeof message.content !== "string" || message.content.length > 24_000)) return error("This conversation is too large for the local chat runtime.", 413);
  const connection = await findModel(body.model); if (!connection) return error("Select a configured provider model before sending a message.", 400);
  const { provider, model } = connection; let upstream: Response;
  try {
    if (provider.kind === "gemini") { const endpoint = `${provider.endpoint || "https://generativelanguage.googleapis.com/v1beta"}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`; upstream = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": provider.apiKey }, body: JSON.stringify({ contents: body.messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })) }), signal: request.signal }); }
    else if (provider.kind === "anthropic") { upstream = await fetch(`${provider.endpoint}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": provider.apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 2048, stream: true, messages: body.messages }), signal: request.signal }); }
    else if (provider.kind === "openai-responses") { upstream = await fetch(`${provider.endpoint}/responses`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` }, body: JSON.stringify({ model, input: body.messages.map((message) => ({ role: message.role, content: message.content })), stream: true }), signal: request.signal }); }
    else if (provider.kind === "azure-openai") { const endpoint = `${provider.endpoint}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=${encodeURIComponent(provider.apiVersion || "2024-10-21")}`; upstream = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "api-key": provider.apiKey }, body: JSON.stringify({ messages: body.messages, stream: true, temperature: 0.7 }), signal: request.signal }); }
    else { upstream = await fetch(`${provider.endpoint}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` }, body: JSON.stringify({ model, messages: body.messages, stream: true, temperature: 0.7 }), signal: request.signal }); }
  } catch { return error("The configured provider endpoint could not be reached.", 502); }
  if (!upstream.ok || !upstream.body) return error("The configured provider rejected this request.", upstream.status || 502);
  const stream = provider.kind === "gemini" ? geminiStream(upstream) : provider.kind === "anthropic" ? anthropicStream(upstream) : provider.kind === "openai-responses" ? responsesStream(upstream) : openAiStream(upstream);
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
