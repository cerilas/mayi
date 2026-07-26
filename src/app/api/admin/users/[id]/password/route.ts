import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { decryptPassword } from "@/lib/encryption";

async function requireAdmin(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

// GET /api/admin/users/[id]/password — returns decrypted password (admin only)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { passwordEncrypted: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  if (!user.passwordEncrypted) {
    return NextResponse.json({ password: null, message: "Şifre kaydedilmemiş (eski kullanıcı)" });
  }

  const decrypted = decryptPassword(user.passwordEncrypted);
  if (!decrypted) {
    return NextResponse.json({ password: null, message: "Şifre çözülemedi" });
  }

  return NextResponse.json({ password: decrypted });
}
