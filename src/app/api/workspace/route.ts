import { NextResponse } from "next/server";
import { localOnlyResponse } from "@/features/chat/local-access";
import { getWorkspaceSettings, loadWorkspace, saveWorkspace, saveWorkspaceSettings } from "@/features/chat/workspace";
import type { ChatStore, WorkspaceSettings } from "@/features/chat/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  return NextResponse.json({ workspace: await loadWorkspace(), settings: await getWorkspaceSettings() });
}
export async function PUT(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try {
    const workspace = await saveWorkspace(await request.json() as ChatStore);
    return NextResponse.json({ workspace });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not save the workspace." }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try { return NextResponse.json({ settings: await saveWorkspaceSettings(await request.json() as Partial<WorkspaceSettings>) }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not save context settings." }, { status: 400 }); }
}
