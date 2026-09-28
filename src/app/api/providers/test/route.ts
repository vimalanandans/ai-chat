import { NextResponse } from "next/server";
import { ProviderTestError, testProvider } from "@/features/chat/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try { return NextResponse.json(await testProvider(await request.json())); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Connection test failed.", diagnostics: caught instanceof ProviderTestError ? caught.diagnostics : undefined }, { status: 400 }); }
}
