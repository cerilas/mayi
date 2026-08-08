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
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    
    const skip = (page - 1) * limit;

    const whereClause: any = { role: "patient" };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
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
        orderBy: { name: "asc" },
        skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ]);

    const formatted = patients.map(p => ({
      id: p.id,
      name: p.name || "İsimsiz",
      birthYear: p.patientProfile?.age ? new Date().getFullYear() - p.patientProfile.age : 1990,
      lastSessionDate: p.postureSessions[0]?.createdAt || null
    }));

    return NextResponse.json({
      items: formatted,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("[posture/patients]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
