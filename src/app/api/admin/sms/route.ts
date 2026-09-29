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

function formatPhone(phone: string): string {
  // Sadece rakamları al
  let cleaned = phone.replace(/\D/g, "");
  // Başındaki 0'ı veya 90'ı temizle, 5xx ile başlayacak şekilde ayarla
  if (cleaned.startsWith("905")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("05")) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
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

    const formattedPhone = formatPhone(phone);
    if (formattedPhone.length !== 10 || !formattedPhone.startsWith("5")) {
      return NextResponse.json({ error: "Geçersiz telefon numarası formatı. Lütfen 5xx ile başlayan 10 haneli bir numara girin." }, { status: 400 });
    }

    // 1. Update user's password in DB
    const passwordHash = await bcrypt.hash(finalPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordEncrypted: encryptPassword(finalPassword) },
    });

    // 2. Prepare and send SMS via Cerilas API
    const smsMessage = `MYFizyo AI platformuna giris bilgileriniz:\nURL: my.cerilas.com\nE-posta: ${targetUser.email}\nSifre: ${finalPassword}\nB021`;

    const apiEmail = process.env.CERILAS_API_EMAIL?.trim();
    const apiPassword = process.env.CERILAS_API_PASSWORD?.trim();

    if (!apiEmail || !apiPassword) {
      return NextResponse.json({ error: "CERILAS_API_EMAIL veya CERILAS_API_PASSWORD eksik." }, { status: 500 });
    }

    // Login to Cerilas API
    const authRes = await fetch('https://cerilas.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: apiEmail, password: apiPassword })
    });

    if (!authRes.ok) {
      const authErr = await authRes.text();
      return NextResponse.json({ error: `Cerilas Login Hatası: ${authErr}` }, { status: 500 });
    }

    const authData = await authRes.json();
    const token = authData.token;

    if (!token) {
      return NextResponse.json({ error: "Cerilas login başarılı ancak token alınamadı." }, { status: 500 });
    }

    // Send SMS using Cerilas API
    const response = await fetch("https://cerilas.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        msg: smsMessage,
        no: formattedPhone,
      }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok) {
      return NextResponse.json({ success: true, message: "SMS başarıyla gönderildi", data });
    } else {
      console.error("Cerilas SMS Error:", data);
      return NextResponse.json(
        { error: `SMS gönderilemedi. Hata: ${data?.error || data?.message || "Bilinmiyor"}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("SMS Error:", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu: " + error.message }, { status: 500 });
  }
}
