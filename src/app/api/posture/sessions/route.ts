import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/posture/sessions
 * Body: PostureSessionPayload (defined below)
 * 
 * Tüm oturumu (session + testResults + measurements) tek seferde kaydeder.
 * iOS uygulaması değerlendirme tamamlandığında bunu çağırır.
 */

interface MeasurementPayload {
  metricKey: string;
  value: number;
  unit: string;
  confidence: number;
  quality: string;
}

interface TestResultPayload {
  testType: string;
  overallQuality: string;
  avgConfidence: number;
  measurements: MeasurementPayload[];
}

interface PostureSessionPayload {
  userId: string;
  appointmentCode?: string;
  deviceInfo?: string;
  testResults: TestResultPayload[];
}

export async function POST(req: Request) {
  try {
    const body: PostureSessionPayload = await req.json();
    const { userId, appointmentCode, deviceInfo, testResults } = body;

    if (!userId || !testResults?.length) {
      return NextResponse.json({ error: "userId ve testResults zorunludur" }, { status: 400 });
    }

    // Kullanıcının var olduğunu doğrula
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Session + tüm alt kayıtları transaction içinde oluştur
    const session = await prisma.postureSession.create({
      data: {
        userId,
        appointmentCode: appointmentCode ?? null,
        deviceInfo: deviceInfo ?? null,
        completedAt: new Date(),
        testResults: {
          create: testResults.map((tr) => ({
            userId,
            testType: tr.testType,
            overallQuality: tr.overallQuality,
            avgConfidence: tr.avgConfidence,
            measurements: {
              create: tr.measurements.map((m) => ({
                metricKey: m.metricKey,
                value: m.value,
                unit: m.unit,
                confidence: m.confidence,
                quality: m.quality,
              })),
            },
          })),
        },
      },
      include: {
        testResults: { include: { measurements: true } },
      },
    });

    // Randevu kodunu kullanıldı olarak işaretle
    if (appointmentCode) {
      await prisma.postureAppointment.updateMany({
        where: { appointmentCode, userId },
        data: { isUsed: true, updatedAt: new Date() },
      });
    }

    return NextResponse.json({ sessionId: session.id, createdAt: session.createdAt }, { status: 201 });
  } catch (error) {
    console.error("[posture/sessions POST]", error);
    return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
  }
}

/**
 * GET /api/posture/sessions?userId=xxx
 * Kullanıcının tüm posture session geçmişini döner.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
    }

    const sessions = await prisma.postureSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        testResults: {
          include: { measurements: true },
        },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("[posture/sessions GET]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
