import { NextResponse } from "next/server";
import { readLinkStore, writeLinkStore } from "@/lib/link-store";
import type { Link, ApiResponse } from "@/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Link>>> {
  try {
    const { id } = await params;
    const body: { read?: boolean } = await request.json();

    if (typeof body.read !== "boolean") {
      return NextResponse.json(
        { error: "read는 boolean이어야 합니다." },
        { status: 400 }
      );
    }

    const store = await readLinkStore();
    const index = store.links.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    store.links[index].read = body.read;
    if (body.read) {
      store.links[index].readAt = new Date().toISOString();
    } else {
      delete store.links[index].readAt;
    }

    await writeLinkStore(store);
    return NextResponse.json({ data: store.links[index] });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const store = await readLinkStore();
    const index = store.links.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    store.links.splice(index, 1);
    await writeLinkStore(store);
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
