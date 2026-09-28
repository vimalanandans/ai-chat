import { getModels, isConfigured } from "@/features/chat/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InputMessage = { role: "user" | "assistant"; content: string };

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { model?: string; messages?: InputMessage[] } | null;
  if (!body?.model || !Array.isArray(body.messages) || !body.messages.length) return error("A model and at least one message are required.", 400);
  if (!isConfigured()) return error("No LLM is configured. Add LLM_BASE_URL and LLM_API_KEY to .env.local, then restart the server.", 503);
  if (!getModels().some((model) => model.id === body.model)) return error("That model is not enabled for this workspace.", 400);
  if (body.messages.length > 100 || body.messages.some((message) => message.content.length > 24_000)) return error("This conversation is too large for the local chat runtime.", 413);

  const endpoint = `${process.env.LLM_BASE_URL!.replace(/\/$/, "")}/chat/completions`;
  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify({ model: body.model, messages: body.messages, stream: true, temperature: 0.7 }),
      signal: request.signal
    });
  } catch {
    return error("The configured LLM endpoint could not be reached.", 502);
  }
  if (!upstream.ok || !upstream.body) return error("The configured LLM rejected this request.", upstream.status || 502);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  let remainder = "";
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      remainder += decoder.decode(value, { stream: true });
      const lines = remainder.split("\n");
      remainder = lines.pop() ?? "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") { controller.close(); return; }
        try {
          const content = JSON.parse(data).choices?.[0]?.delta?.content;
          if (typeof content === "string") controller.enqueue(encoder.encode(content));
        } catch { /* Ignore provider keep-alives and non-content events. */ }
      }
    },
    cancel() { reader.cancel(); }
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
