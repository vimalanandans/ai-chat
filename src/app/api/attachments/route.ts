import { NextResponse } from "next/server";
import { localOnlyResponse } from "@/features/chat/local-access";
import { loadWorkspace, saveAttachment } from "@/features/chat/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  try {
    const form = await request.formData(); const sessionId = form.get("sessionId"); const file = form.get("file");
    if (typeof sessionId !== "string" || !sessionId) return NextResponse.json({ error: "A session is required for an attachment." }, { status: 400 });
    if (!(await loadWorkspace())?.sessions.some((session) => session.id === sessionId)) return NextResponse.json({ error: "The attachment session is not available in the local workspace." }, { status: 404 });
    if (!file || typeof file === "string") return NextResponse.json({ error: "Select a file to attach." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    return NextResponse.json({ attachment: await saveAttachment(sessionId, { name: file.name, type: file.type, size: file.size, bytes }) });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not store the attachment." }, { status: 400 }); }
}
