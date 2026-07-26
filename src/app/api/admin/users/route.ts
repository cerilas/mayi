import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/encryption";

async function requireAdmin(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

// GET /api/admin/users
export async function GET(req: Request) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: {
      role: {
        not: "patient",
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(users);
}

// POST /api/admin/users — create user
export async function POST(req: Request) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, email, password, role = "user" } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Ad, e-posta ve şifre zorunludur" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır" }, { status: 400 });
  }
  if (!["admin", "user", "physiotherapist"].includes(role)) {
    return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
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
      passwordEncrypted: encryptPassword(password), 
      role,
      usageLimit: (role === "admin" || role === "physiotherapist") ? 999999 : 15
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
