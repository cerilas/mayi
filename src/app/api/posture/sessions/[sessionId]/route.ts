import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth-utils";

/**
 * PATCH /api/posture/sessions/[sessionId]
 * Admin tarafından bir oturumun (raporun) klinik görüşünü kaydetmek için kullanılır.
 */
function clampScore(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getUserSession(req);
    // Yalnızca adminlerin klinik görüş ekleyebilmesini sağlamak için basit bir kontrol:
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId gerekli" }, { status: 400 });
    }

    const body = await req.json();
    const { clinicalOpinion, insightOverrides } = body as {
      clinicalOpinion?: string;
      insightOverrides?: Array<{
        insightKey: string;
        aiScore: number;
        clinicianScore: number;
      }>;
    };

    const existing = await prisma.postureSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 404 });
    }

    const clinicianId = session.user.id;

    const updatedSession = await prisma.$transaction(async (tx) => {
      if (clinicalOpinion !== undefined) {
        await tx.postureSession.update({
          where: { id: sessionId },
          data: { clinicalOpinion: clinicalOpinion || null },
        });
      }

      if (Array.isArray(insightOverrides)) {
        const previous = await tx.postureInsightOverride.findMany({
          where: { sessionId },
        });
        const prevByKey = new Map(previous.map((p) => [p.insightKey, p]));

        for (const item of insightOverrides) {
          if (!item?.insightKey) continue;
          const aiScore = clampScore(item.aiScore);
          const clinicianScore = clampScore(item.clinicianScore);
          const prev = prevByKey.get(item.insightKey);

          await tx.postureInsightOverride.upsert({
            where: {
              sessionId_insightKey: { sessionId, insightKey: item.insightKey },
            },
            create: {
              sessionId,
              insightKey: item.insightKey,
              aiScore,
              clinicianScore,
              clinicianId,
            },
            update: {
              aiScore,
              clinicianScore,
              clinicianId,
            },
          });

          const changed =
            !prev ||
            prev.clinicianScore !== clinicianScore ||
            prev.aiScore !== aiScore;
          if (changed) {
            await tx.postureInsightOverrideHistory.create({
              data: {
                sessionId,
                insightKey: item.insightKey,
                aiScore,
                previousScore: prev?.clinicianScore ?? null,
                clinicianScore,
                clinicianId,
              },
            });
          }
        }
      }

      return tx.postureSession.findUnique({
        where: { id: sessionId },
        include: { insightOverrides: true },
      });
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("[posture/session PATCH]", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu" }, { status: 500 });
  }
}
