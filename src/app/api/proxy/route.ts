import { NextResponse } from "next/server";
import { getProxySettings, saveProxySettings, testProxy } from "@/features/chat/runtime";
import { getSystemProxyServices } from "@/features/chat/system-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() { return NextResponse.json({ proxy: await getProxySettings(), system: await getSystemProxyServices() }); }
export async function POST(request: Request) {
  try { return NextResponse.json({ proxy: await saveProxySettings(await request.json()) }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not save proxy settings." }, { status: 400 }); }
}
export async function DELETE() {
  try { return NextResponse.json({ proxy: await saveProxySettings({ enabled: false, endpoint: "" }) }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not disable the application proxy." }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  try { return NextResponse.json({ message: await testProxy(await request.json()) }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Proxy test failed." }, { status: 400 }); }
}
