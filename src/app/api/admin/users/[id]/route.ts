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

// PATCH /api/admin/users/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, email, password, role } = body;

  const data: Record<string, string> = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role && ["admin", "user"].includes(role)) data.role = role;
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  // Prevent removing the last admin
  if (role === "user") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "admin" && adminCount <= 1) {
      return NextResponse.json({ error: "Son admin kullanıcısının rolü değiştirilemez" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  // Prevent deleting self
  if (session.user.id === id) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz" }, { status: 400 });
  }

  // Prevent deleting last admin
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Son admin kullanıcısı silinemez" }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
