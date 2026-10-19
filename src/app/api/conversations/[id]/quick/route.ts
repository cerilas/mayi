import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { isQuickActionKey } from "@/lib/clinic";
import { buildQuickAnswer } from "@/lib/quick-answers";

// POST /api/conversations/[id]/quick — { action } → stores a fixed or per-user question/answer pair; never uses a credit
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const [{ id: conversationId }, body] = await Promise.all([params, req.json().catch(() => ({}))]);
  const actionKey: unknown = body?.action;
  if (!isQuickActionKey(actionKey)) return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!conversation) return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 });

  const { question, answer } = await buildQuickAnswer(actionKey, session.user.id);
  const [userMsg, assistantMsg] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, role: "user", content: question },
      include: { attachments: true },
    }),
    prisma.message.create({
      data: { conversationId, role: "assistant", content: answer, status: "done" },
      include: { attachments: true },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(conversation.title === "Yeni Sohbet" ? { title: question.slice(0, 60) } : {}),
      },
    }),
  ]);

  return NextResponse.json({ messages: [userMsg, assistantMsg] }, { status: 201 });
}
