import { NextResponse } from "next/server";
import { deleteProvider, getModels, getProviderSummaries, saveProvider } from "@/features/chat/runtime";
import { localOnlyResponse } from "@/features/chat/local-access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { const blocked = localOnlyResponse(request); if (blocked) return blocked; return NextResponse.json({ providers: await getProviderSummaries(), models: await getModels() }); }
export async function POST(request: Request) { const blocked = localOnlyResponse(request); if (blocked) return blocked; try { const provider = await saveProvider(await request.json()); return NextResponse.json({ provider, providers: await getProviderSummaries(), models: await getModels() }, { status: 201 }); } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not save provider." }, { status: 400 }); } }
export async function DELETE(request: Request) { const blocked = localOnlyResponse(request); if (blocked) return blocked; try { const id = new URL(request.url).searchParams.get("id"); if (!id) throw new Error("Provider id is required."); await deleteProvider(id); return NextResponse.json({ providers: await getProviderSummaries(), models: await getModels() }); } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not delete provider." }, { status: 400 }); } }
