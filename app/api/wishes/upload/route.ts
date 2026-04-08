import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { ApiResponse } from "@/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const HEALING_DIR = path.join(DATA_DIR, "healing");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ imageUrl: string }>>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "JPEG, PNG, WebP, GIF만 허용됩니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    await fs.mkdir(HEALING_DIR, { recursive: true });

    const id = uuidv4();
    const filename = `${id}${ext}`;
    const filePath = path.join(HEALING_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const imageUrl = `${BASE}/api/wishes/image/${filename}`;
    return NextResponse.json({ data: { imageUrl } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
