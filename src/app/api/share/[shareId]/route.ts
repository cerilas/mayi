import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/share/[shareId] — public endpoint, no auth required
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { shareId, deletedAt: null },
    select: {
      id: true,
      title: true,
      aiProvider: true,
      aiModel: true,
      createdAt: true,
      user: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: true },
      },
    },
  });

  if (!conversation)
    return NextResponse.json({ error: "Paylaşılan sohbet bulunamadı" }, { status: 404 });

  return NextResponse.json({
    id: conversation.id,
    title: conversation.title,
    aiProvider: conversation.aiProvider,
    aiModel: conversation.aiModel,
    createdAt: conversation.createdAt,
    userName: conversation.user.name,
    messages: conversation.messages,
  });
}
