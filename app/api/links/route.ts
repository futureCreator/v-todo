import { NextResponse } from "next/server";
import { readLinkStore, addLink } from "@/lib/link-store";
import { extractUrls } from "@/lib/url-extract";
import type { Link, ApiResponse } from "@/types";

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<Link>>> {
  try {
    const body = await request.json();
    const { url, memo } = body as { url?: string; memo?: string };

    if (!url) {
      return NextResponse.json(
        { error: "url은 필수입니다." },
        { status: 400 }
      );
    }

    const fullMemo = memo ? `${url} ${memo}` : url;
    const urls = extractUrls(fullMemo, undefined);
    const primaryDomain = urls.length > 0 ? new URL(urls[0]).hostname : new URL(url).hostname;

    const link = await addLink({
      memo: fullMemo,
      urls,
      primaryDomain,
      source: "manual",
    });

    return NextResponse.json({ data: link }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

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
