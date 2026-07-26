import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/encryption";

async function requireStaff(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin" && session.user.role !== "physiotherapist") return null;
  return session;
}

export async function GET(req: Request) {
  const session = await requireStaff(req);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  const skip = (page - 1) * limit;

  const whereClause: any = {
    role: "patient",
  };

  if (session.user.role === "physiotherapist") {
    whereClause.patientProfile = {
      responsibleAdminId: session.user.id
    };
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      include: {
        patientProfile: {
          include: { responsibleAdmin: { select: { id: true, name: true } } }
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    items: users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const session = await requireStaff(req);
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Sadece adminler yeni hasta ekleyebilir" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const {
    name,
    email,
    password,
    photo,
    age,
    phone,
    gender,
    shortDescription,
    longDetails,
    clinicalOpinion,
    videoLinks,
    responsibleAdminId,
  } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "Ad ve telefon zorunludur" }, { status: 400 });
  }

  let finalPassword = password;
  if (!finalPassword) {
    // Generate a random 6-character alphanumeric password
    finalPassword = Math.random().toString(36).slice(-6).padEnd(6, '0');
  }

  if (finalPassword.length < 6) {
    return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır" }, { status: 400 });
  }

  let finalEmail = email;
  if (!finalEmail) {
    // Generate a dummy email based on phone to satisfy db uniqueness
    let cleanPhone = phone.replace(/\D/g, "");
    finalEmail = `${cleanPhone}@hasta.myfizyo.com`;
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: finalEmail },
        { patientProfile: { phone } }
      ]
    }
  });
  if (existing) {
    return NextResponse.json({ error: "Bu telefon veya e-posta adresi zaten kayıtlı" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(finalPassword, 12);
  const passwordEncrypted = encryptPassword(finalPassword);

  const user = await prisma.user.create({
    data: {
      name,
      email: finalEmail,
      passwordHash,
      passwordEncrypted,
      role: "patient",
      patientProfile: {
        create: {
          photo: photo || null,
          age: age ? parseInt(age) : null,
          phone: phone || null,
          gender: gender || null,
          shortDescription: shortDescription || null,
          longDetails: longDetails || null,
          clinicalOpinion: clinicalOpinion || null,
          videoLinks: videoLinks || [],
          responsibleAdminId: responsibleAdminId || null,
        },
      },
    },
    include: {
      patientProfile: {
        include: { responsibleAdmin: { select: { id: true, name: true } } }
      },
    },
  });

  return NextResponse.json(user, { status: 201 });
}
