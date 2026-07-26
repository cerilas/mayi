import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  /*
  const session = await getUserSession(req);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  */

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "all";

  let dateFilter: any = undefined;
  if (period !== "all") {
    const now = new Date();
    let startDate = new Date();
    if (period === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(now.getDate() - 30);
    } else if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    dateFilter = { gte: startDate };
  }

  const userWhere = dateFilter ? { role: "patient", createdAt: dateFilter } : { role: "patient" };
  const convWhere = dateFilter ? { deletedAt: null, createdAt: dateFilter } : { deletedAt: null };
  const msgWhere = dateFilter ? { createdAt: dateFilter } : {};

  try {
    const [
      totalPatients,
      activeConversations,
      totalMessages,
      aiMessages,
      aiErrors,
      activeAdmins,
      patientProfiles
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.conversation.count({ where: convWhere }),
      prisma.message.count({ where: msgWhere }),
      prisma.message.count({ where: { role: "assistant", ...msgWhere } }),
      prisma.message.count({ 
        where: { 
          ...msgWhere,
          OR: [
            { status: "error" },
            { errorMessage: { not: null } }
          ]
        }
      }),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.patientProfile.findMany({
        where: dateFilter ? { createdAt: dateFilter } : undefined,
        select: { age: true, gender: true }
      })
    ]);

    // Average Age
    const validAges = patientProfiles.map(p => p.age).filter(a => a !== null) as number[];
    const avgAge = validAges.length > 0 ? Math.round(validAges.reduce((a, b) => a + b, 0) / validAges.length) : 0;

    // Gender Stats
    const genderCounts: Record<string, number> = { "Erkek": 0, "Kadın": 0, "Belirtilmemiş": 0 };
    patientProfiles.forEach(p => {
      if (!p.gender || p.gender === "") {
        genderCounts["Belirtilmemiş"]++;
      } else if (p.gender.toLowerCase() === "erkek" || p.gender.toLowerCase() === "male") {
        genderCounts["Erkek"]++;
      } else if (p.gender.toLowerCase() === "kadın" || p.gender.toLowerCase() === "female" || p.gender.toLowerCase() === "kadin") {
        genderCounts["Kadın"]++;
      } else {
        // Fallback for custom genders if any
        if (!genderCounts[p.gender]) genderCounts[p.gender] = 0;
        genderCounts[p.gender]++;
      }
    });

    // Top 5 Users by Message Count
    const usersWithConversations = await prisma.user.findMany({
      where: { role: "patient" },
      select: {
        name: true,
        conversations: {
          where: dateFilter ? { createdAt: dateFilter } : undefined,
          select: {
            _count: { select: { messages: true } }
          }
        }
      }
    });

    const userMessageCounts = usersWithConversations
      .map(u => ({
        name: u.name,
        messageCount: u.conversations.reduce((acc, c) => acc + c._count.messages, 0)
      }))
      .filter(u => u.messageCount > 0)
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 5);

    // Admins by Patient Count
    const adminsWithPatientCounts = await prisma.user.findMany({
      where: { role: "admin" },
      select: {
        name: true,
        _count: { select: { supervisedPatients: true } }
      }
    });

    const adminsStats = adminsWithPatientCounts
      .map(a => ({
        name: a.name,
        patientCount: a._count.supervisedPatients
      }))
      .sort((a, b) => b.patientCount - a.patientCount);

    return NextResponse.json({
      totalPatients,
      activeConversations,
      totalMessages,
      aiMessages,
      aiErrors,
      activeAdmins,
      avgAge,
      genderCounts,
      topUsers: userMessageCounts,
      adminsStats
    });

  } catch (error: any) {
    console.error("Stats Error:", error);
    return NextResponse.json({ error: "İstatistikler getirilemedi." }, { status: 500 });
  }
}
