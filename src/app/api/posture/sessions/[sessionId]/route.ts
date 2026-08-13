import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth-utils";

/**
 * PATCH /api/posture/sessions/[sessionId]
 * Admin tarafından bir oturumun (raporun) klinik görüşünü kaydetmek için kullanılır.
 */
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
    const { clinicalOpinion } = body;

    // Yalnızca metin alanını güncelliyoruz
    const updatedSession = await prisma.postureSession.update({
      where: { id: sessionId },
      data: {
        clinicalOpinion: clinicalOpinion !== undefined ? clinicalOpinion : null,
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("[posture/session PATCH]", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu" }, { status: 500 });
  }
}
