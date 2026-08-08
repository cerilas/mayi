import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/posture/patients
 * Headers: { "x-admin-pin": "0000" }
 * 
 * iOS Admin Paneli (Clinician Dashboard) için hasta listesini döner.
 */
export async function GET(req: Request) {
  try {
    const pin = req.headers.get("x-admin-pin");
    if (pin !== "0000") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const patients = await prisma.user.findMany({
      where: { role: "patient" },
      select: {
        id: true,
        name: true,
        patientProfile: {
          select: { age: true }
        },
        postureSessions: {
          orderBy: { createdAt: "desc" },
          take: 1, // Sadece son seans tarihi için
          select: { createdAt: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const formatted = patients.map(p => ({
      id: p.id,
      name: p.name || "İsimsiz",
      birthYear: p.patientProfile?.age ? new Date().getFullYear() - p.patientProfile.age : 1990,
      lastSessionDate: p.postureSessions[0]?.createdAt || null
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[posture/patients]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
