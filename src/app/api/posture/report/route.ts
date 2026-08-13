import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth-utils";

/**
 * GET /api/posture/report?userId=xxx&sessionId=xxx
 * Admin için hasta postür raporunu getiren kapsamlı API.
 */
export async function GET(req: Request) {
  try {
    const session = await getUserSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");

    if (!userId) {
      return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
    }

    // Hasta bilgilerini al
    const patient = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: { responsibleAdmin: { select: { id: true, name: true } } },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
    }

    // Postür oturumlarını al
    const whereClause: any = { userId };
    if (sessionId) whereClause.id = sessionId;

    const postureSessions = await prisma.postureSession.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: sessionId ? 1 : 5, // tek session veya son 5
      include: {
        testResults: {
          include: { measurements: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        createdAt: patient.createdAt,
        profile: patient.patientProfile,
      },
      sessions: postureSessions,
    });
  } catch (error) {
    console.error("[posture/report GET]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
