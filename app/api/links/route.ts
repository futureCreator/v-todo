import { NextResponse } from "next/server";
import { readLinkStore } from "@/lib/link-store";
import type { Link, ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<Link[]>>> {
  try {
    const store = await readLinkStore();
    const sorted = [...store.links].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
    );
    return NextResponse.json({ data: sorted });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
