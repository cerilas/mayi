import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/posture/appointments
 * Body: { userId: string, expiresInDays?: number }
 * 
 * Belirli bir kullanıcı için randevu kodu üretir.
 * Admin/fizyoterapist tarafından çağrılır.
 */
export async function POST(req: Request) {
  try {
    const { userId, expiresInDays = 7 } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId zorunludur" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // 6 haneli alfanumerik büyük harf kod
    const code = generateCode();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const appointment = await prisma.postureAppointment.create({
      data: {
        userId,
        appointmentCode: code,
        isUsed: false,
        expiresAt,
      },
    });

    return NextResponse.json({
      appointmentCode: appointment.appointmentCode,
      expiresAt: appointment.expiresAt,
      userId,
      userName: user.name,
    }, { status: 201 });
  } catch (error) {
    console.error("[posture/appointments POST]", error);
    return NextResponse.json({ error: "Kod oluşturulamadı" }, { status: 500 });
  }
}

/**
 * GET /api/posture/appointments?userId=xxx
 * Kullanıcının tüm randevu kodlarını listeler.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
    }

    const appointments = await prisma.postureAppointment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[posture/appointments GET]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ambiguous chars removed (0,O,I,1)
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
