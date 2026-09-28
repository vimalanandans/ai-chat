import { NextResponse } from "next/server";
import { getModels } from "@/features/chat/runtime";
import { localOnlyResponse } from "@/features/chat/local-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = localOnlyResponse(request); if (blocked) return blocked;
  return NextResponse.json({ models: await getModels() });
}
