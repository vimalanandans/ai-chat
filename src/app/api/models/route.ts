import { NextResponse } from "next/server";
import { getModels } from "@/features/chat/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ models: await getModels() });
}
