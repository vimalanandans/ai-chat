import { NextResponse } from "next/server";
import { getProxySettings, saveProxySettings, testProxy } from "@/features/chat/runtime";
import { getSystemProxyServices } from "@/features/chat/system-proxy";
import { localOnlyResponse } from "@/features/chat/local-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) { const blocked = localOnlyResponse(request); if (blocked) return blocked; return NextResponse.json({ proxy: await getProxySettings(), system: await getSystemProxyServices() }); }
export async function POST(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try { return NextResponse.json({ proxy: await saveProxySettings(await request.json()) }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not save proxy settings." }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try { return NextResponse.json({ proxy: await saveProxySettings({ enabled: false, endpoint: "" }) }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not disable the application proxy." }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try { return NextResponse.json({ message: await testProxy(await request.json()) }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Proxy test failed." }, { status: 400 }); }
}
