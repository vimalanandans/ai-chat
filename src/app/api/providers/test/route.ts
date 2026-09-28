import { NextResponse } from "next/server";
import { ProviderTestError, testProvider } from "@/features/chat/runtime";
import { localOnlyResponse } from "@/features/chat/local-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try { return NextResponse.json(await testProvider(await request.json())); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Connection test failed.", diagnostics: caught instanceof ProviderTestError ? caught.diagnostics : undefined }, { status: 400 }); }
}
