import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// POST /api/conversations/[id]/share — toggle share on/off
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!conversation)
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  // Toggle: if already shared, remove share; otherwise create one
  if (conversation.shareId) {
    await prisma.conversation.update({
      where: { id },
      data: { shareId: null },
    });
    return NextResponse.json({ shared: false, shareId: null });
  }

  const shareId = randomUUID();
  await prisma.conversation.update({
    where: { id },
    data: { shareId },
  });

  return NextResponse.json({ shared: true, shareId });
}

// GET /api/conversations/[id]/share — get current share status
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { shareId: true },
  });

  if (!conversation)
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  return NextResponse.json({
    shared: !!conversation.shareId,
    shareId: conversation.shareId,
  });
}
