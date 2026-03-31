import { NextRequest, NextResponse } from "next/server";
import {
  listFiles,
  readFile,
  writeFile,
  createItem,
  deleteItem,
  renameItem,
} from "@/lib/file-store";
import type { ApiResponse, FileItem } from "@/types";

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<FileItem[] | string>>> {
  try {
    const p = request.nextUrl.searchParams.get("path") ?? "/";

    if (p.endsWith(".md")) {
      const content = await readFile(p);
      return NextResponse.json({ data: content });
    }

    const items = await listFiles(p);
    return NextResponse.json({ data: items });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<string>>> {
  try {
    const p = request.nextUrl.searchParams.get("path");
    if (!p) {
      return NextResponse.json(
        { error: "경로를 입력해주세요." },
        { status: 400 }
      );
    }
    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content : "";
    await writeFile(p, content);
    return NextResponse.json({ data: content });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ name: string; type: string }>>> {
  try {
    const body = await request.json();
    const { name, type, path: dirPath } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "이름과 타입을 입력해주세요." },
        { status: 400 }
      );
    }

    await createItem(dirPath ?? "/", name, type);
    return NextResponse.json({ data: { name, type } }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ newName: string }>>> {
  try {
    const p = request.nextUrl.searchParams.get("path");
    if (!p) {
      return NextResponse.json(
        { error: "경로를 입력해주세요." },
        { status: 400 }
      );
    }
    const body = await request.json();
    if (!body.newName) {
      return NextResponse.json(
        { error: "새 이름을 입력해주세요." },
        { status: 400 }
      );
    }
    await renameItem(p, body.newName);
    return NextResponse.json({ data: { newName: body.newName } });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const p = request.nextUrl.searchParams.get("path");
    if (!p) {
      return NextResponse.json(
        { error: "경로를 입력해주세요." },
        { status: 400 }
      );
    }
    await deleteItem(p);
    return NextResponse.json({ data: null });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
