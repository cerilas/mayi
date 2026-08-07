import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/posture/lookup-code
 * Body: { code: string }
 * 
 * Randevu kodunu arar, eşleşen kullanıcıyı döner.
 * iOS uygulaması başlangıç ekranında bu endpoint'i çağırır.
 */
export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Kod zorunludur" }, { status: 400 });
    }

    const appointment = await prisma.postureAppointment.findUnique({
      where: { appointmentCode: code.trim().toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            patientProfile: {
              select: { age: true, gender: true, phone: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Geçersiz randevu kodu" }, { status: 404 });
    }

    if (appointment.expiresAt && appointment.expiresAt < new Date()) {
      return NextResponse.json({ error: "Randevu kodunun süresi dolmuş" }, { status: 410 });
    }

    return NextResponse.json({
      userId: appointment.user.id,
      userName: appointment.user.name,
      appointmentCode: appointment.appointmentCode,
      patientProfile: appointment.user.patientProfile,
    });
  } catch (error) {
    console.error("[posture/lookup-code]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
