import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Mevcut şifre ve yeni şifre zorunludur." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Yeni şifre en az 6 karakter olmalıdır." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Mevcut şifreniz yanlış." }, { status: 403 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true, message: "Şifreniz başarıyla güncellendi." });
  } catch (error: any) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
