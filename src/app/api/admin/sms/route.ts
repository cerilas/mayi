import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/encryption";
import { sendSms, toLocalMobile } from "@/lib/sms";

async function requireAdmin(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

export async function POST(req: Request) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, phone, newPassword, password } = body;

    const finalPassword = newPassword || password;

    if (!userId || !phone || !finalPassword) {
      return NextResponse.json({ error: "Eksik bilgi (userId, phone, newPassword/password zorunlu)" }, { status: 400 });
    }

    if (finalPassword.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const formattedPhone = toLocalMobile(String(phone));
    if (!formattedPhone) {
      return NextResponse.json(
        { error: "Geçersiz telefon numarası formatı. Lütfen 5xx ile başlayan 10 haneli bir numara girin." },
        { status: 400 }
      );
    }

    // 1. Update user's password in DB
    const passwordHash = await bcrypt.hash(finalPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordEncrypted: encryptPassword(finalPassword) },
    });

    // 2. Send SMS directly via NetGSM using the active header selected in Settings
    const smsMessage = `MYFizyo AI platformuna giris bilgileriniz:\nURL: http://www.myfizyoterapi.com/\nE-posta: ${targetUser.email}\nSifre: ${finalPassword}\nB021`;

    const result = await sendSms([formattedPhone], smsMessage);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: "SMS başarıyla kuyruğa eklendi",
        jobId: result.jobId,
        header: result.header,
      });
    } else {
      console.error("NetGSM Error:", result);
      return NextResponse.json(
        { error: `SMS gönderilemedi. NetGSM Hata Kodu: ${result.code || "Bilinmiyor"} - ${result.description || ""}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("SMS Error:", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu: " + error.message }, { status: 500 });
  }
}
