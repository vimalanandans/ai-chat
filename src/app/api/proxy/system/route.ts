import { NextResponse } from "next/server";
import { getSystemProxyServices, setSystemProxy } from "@/features/chat/system-proxy";
import { localOnlyResponse } from "@/features/chat/local-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) { const blocked = localOnlyResponse(request); if (blocked) return blocked; return NextResponse.json(await getSystemProxyServices()); }
export async function POST(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try {
    const body = await request.json() as { service?: string; enabled?: boolean; endpoint?: string };
    if (!body.service || typeof body.enabled !== "boolean") throw new Error("A network service and requested proxy state are required.");
    const service = await setSystemProxy(body.service, body.enabled, body.endpoint);
    return NextResponse.json({ service, system: await getSystemProxyServices() });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not update the system proxy." }, { status: 400 }); }
}
