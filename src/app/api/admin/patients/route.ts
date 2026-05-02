import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  const skip = (page - 1) * limit;

  const whereClause = {
    role: "patient",
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      include: {
        patientProfile: true,
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
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

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
  } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Ad, e-posta ve şifre zorunludur" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta adresi zaten kayıtlı" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
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
        },
      },
    },
    include: {
      patientProfile: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
