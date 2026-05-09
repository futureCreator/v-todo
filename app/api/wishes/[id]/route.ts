import { NextResponse } from "next/server";
import { readWishes, writeWishes } from "@/lib/wish-store";
import type { UpdateWishRequest, WishItem, ApiResponse } from "@/types";

const VALID_CATEGORIES = ["healing", "item", "experience"];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<WishItem>>> {
  try {
    const [{ id }, body, wishes] = await Promise.all([
      params,
      request.json() as Promise<UpdateWishRequest>,
      readWishes(),
    ]);
    const index = wishes.findIndex((w) => w.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "위시 아이템을 찾을 수 없습니다." }, { status: 404 });
    }

    if (body.title !== undefined) {
      if (
        typeof body.title !== "string" ||
        body.title.trim().length === 0 ||
        body.title.length > 200
      ) {
        return NextResponse.json({ error: "제목은 1~200자여야 합니다." }, { status: 400 });
      }
      wishes[index].title = body.title.trim();
    }

    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: "유효하지 않은 카테고리입니다." }, { status: 400 });
      }
      wishes[index].category = body.category;
    }

    if (body.price !== undefined) {
      wishes[index].price = body.price;
    }

    if (body.url !== undefined) {
      wishes[index].url = body.url;
    }

    if (body.imageUrl !== undefined) {
      wishes[index].imageUrl = body.imageUrl;
    }

    if (body.memo !== undefined) {
      wishes[index].memo = body.memo;
    }

    if (body.actualPrice !== undefined) {
      wishes[index].actualPrice = body.actualPrice;
    }

    if (body.satisfaction !== undefined) {
      if (body.satisfaction !== null && (body.satisfaction < 1 || body.satisfaction > 5)) {
        return NextResponse.json({ error: "만족도는 1~5 사이여야 합니다." }, { status: 400 });
      }
      wishes[index].satisfaction = body.satisfaction;
    }

    if (body.review !== undefined) {
      wishes[index].review = body.review;
    }

    if (body.completedAt !== undefined) {
      wishes[index].completedAt = body.completedAt;
    }

    if (body.completed !== undefined) {
      wishes[index].completed = body.completed;
      if (body.completed) {
        wishes[index].completedAt = body.completedAt ?? new Date().toISOString();
      } else {
        wishes[index].completedAt = null;
        wishes[index].actualPrice = null;
        wishes[index].satisfaction = null;
        wishes[index].review = null;
      }
    }

    await writeWishes(wishes);
    return NextResponse.json({ data: wishes[index] });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const [{ id }, wishes] = await Promise.all([params, readWishes()]);
    const index = wishes.findIndex((w) => w.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "위시 아이템을 찾을 수 없습니다." }, { status: 404 });
    }

    wishes.splice(index, 1);
    await writeWishes(wishes);
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
