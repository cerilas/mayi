import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/conversations — list user's conversations
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);
  const cursor = searchParams.get("cursor"); // last conversation id from previous page

  // If cursor given, find its updatedAt to paginate by date
  let cursorDate: Date | undefined;
  if (cursor) {
    const ref = await prisma.conversation.findUnique({
      where: { id: cursor },
      select: { updatedAt: true },
    });
    cursorDate = ref?.updatedAt;
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      ...(cursorDate ? { updatedAt: { lt: cursorDate } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit + 1, // fetch one extra to check hasMore
    select: {
      id: true,
      title: true,
      aiProvider: true,
      aiModel: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const hasMore = conversations.length > limit;
  const items = hasMore ? conversations.slice(0, limit) : conversations;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, hasMore, nextCursor });
}

// POST /api/conversations — create new conversation
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const provider = body.aiProvider ?? "gemini";
  const model = body.aiModel ?? "gemini-2.5-flash";

  const conversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      title: "Yeni Sohbet",
      aiProvider: provider,
      aiModel: model,
    },
  });

  return NextResponse.json(conversation, { status: 201 });
}
