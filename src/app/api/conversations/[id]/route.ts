import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/conversations/[id]
// Query params: ?limit=N&before=<messageId>
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
  const before = url.searchParams.get("before") ?? undefined; // message id cursor

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!conversation) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const totalCount = await prisma.message.count({ where: { conversationId: id } });

  // Find the cursor createdAt if `before` is provided
  let cursorDate: Date | undefined;
  if (before) {
    const cursorMsg = await prisma.message.findUnique({ where: { id: before } });
    if (cursorMsg) cursorDate = cursorMsg.createdAt;
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { attachments: true },
  });

  // Return in ascending order
  messages.reverse();

  // Count how many messages are older than what we returned
  const oldestReturnedDate = messages[0]?.createdAt;
  const hasMore = !!oldestReturnedDate && (await prisma.message.count({
    where: {
      conversationId: id,
      createdAt: { lt: oldestReturnedDate },
    },
  })) > 0;

  return NextResponse.json({
    ...conversation,
    messages,
    totalCount,
    hasMore,
  });
}

// PATCH /api/conversations/[id] — rename
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = String(body.title).slice(0, 100);
  if (body.aiProvider !== undefined) update.aiProvider = body.aiProvider;
  if (body.aiModel !== undefined) update.aiModel = body.aiModel;
  // folderId: null = unfolder, string = move to folder
  if ("folderId" in body) {
    update.folderId = body.folderId === null ? null : String(body.folderId);
  }

  const conversation = await prisma.conversation.updateMany({
    where: { id, userId: session.user.id, deletedAt: null },
    data: update,
  });

  if (conversation.count === 0) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  return NextResponse.json({ success: true });
}

// DELETE /api/conversations/[id] — soft delete
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;

  const result = await prisma.conversation.updateMany({
    where: { id, userId: session.user.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  return NextResponse.json({ success: true });
}
