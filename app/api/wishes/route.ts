import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readWishes, writeWishes } from "@/lib/wish-store";
import type { CreateWishRequest, WishItem, ApiResponse } from "@/types";
import { fetchPageTitle } from "@/lib/fetch-title";

const VALID_CATEGORIES = ["healing", "item", "experience"];

export async function GET(): Promise<NextResponse<ApiResponse<WishItem[]>>> {
  try {
    const wishes = await readWishes();
    return NextResponse.json({ data: wishes });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<WishItem>>> {
  try {
    const body: CreateWishRequest = await request.json();

    const isHealing = body.category === "healing";
    if (!isHealing && (!body.title || typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > 200)) {
      return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "카테고리는 item 또는 experience여야 합니다." }, { status: 400 });
    }

    // For healing link type, fetch page title
    let linkTitle: string | null = null;
    if (isHealing && body.healingType === "link" && body.url) {
      linkTitle = await fetchPageTitle(body.url);
    }

    const wish: WishItem = {
      id: uuidv4(),
      title: isHealing ? (body.title?.trim() || "") : body.title.trim(),
      category: body.category,
      price: body.price ?? null,
      url: body.url ?? null,
      imageUrl: body.imageUrl ?? null,
      memo: body.memo ?? null,
      completed: false,
      completedAt: null,
      actualPrice: null,
      satisfaction: null,
      review: null,
      createdAt: new Date().toISOString(),
      ...(isHealing && {
        healingType: body.healingType,
        linkTitle: linkTitle ?? body.linkTitle ?? undefined,
      }),
    };

    const wishes = await readWishes();
    wishes.push(wish);
    await writeWishes(wishes);

    return NextResponse.json({ data: wish }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
