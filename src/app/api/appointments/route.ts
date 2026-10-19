import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { appointmentConfirmationText, createAppointment, formatAppointmentLabel } from "@/lib/appointments";
import { withDisclaimer } from "@/lib/clinic";

// GET /api/appointments — patients see their own upcoming requests; staff see all upcoming requests
export async function GET(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const isStaff = session.user.role === "admin" || session.user.role === "physiotherapist";
  const appointments = await prisma.clinicAppointment.findMany({
    where: {
      startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ...(isStaff ? {} : { userId: session.user.id }),
    },
    orderBy: { startsAt: "asc" },
    take: 200,
    include: isStaff
      ? { user: { select: { id: true, name: true, email: true, patientProfile: { select: { phone: true } } } } }
      : undefined,
  });

  return NextResponse.json({
    items: appointments.map((a) => ({ ...a, label: formatAppointmentLabel(a.startsAt) })),
  });
}

// POST /api/appointments — { date: "YYYY-MM-DD", time: "HH:mm", note?, conversationId? }
export async function POST(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const note = typeof body.note === "string" ? body.note : null;
  const requestedConversationId = typeof body.conversationId === "string" ? body.conversationId : null;

  const conversation = requestedConversationId
    ? await prisma.conversation.findFirst({
        where: { id: requestedConversationId, userId: session.user.id, deletedAt: null },
        select: { id: true },
      })
    : null;

  const result = await createAppointment({
    userId: session.user.id,
    date,
    time,
    note,
    source: "picker",
    conversationId: conversation?.id ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  let messages: unknown[] = [];
  if (conversation) {
    const [userMsg, assistantMsg] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId: conversation.id, role: "user", content: `Randevu talebi: ${result.label}${note?.trim() ? `\nNot: ${note.trim()}` : ""}` },
        include: { attachments: true },
      }),
      prisma.message.create({
        data: { conversationId: conversation.id, role: "assistant", content: withDisclaimer(appointmentConfirmationText(result.label)), status: "done" },
        include: { attachments: true },
      }),
      prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
    ]);
    messages = [userMsg, assistantMsg];
  }

  return NextResponse.json({ appointment: result.appointment, label: result.label, messages }, { status: 201 });
}
