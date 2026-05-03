import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const NETGSM_USERCODE = process.env.NETGSM_USERCODE || "3423411000";
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD || "Dnz.24232423";

async function requireAdmin() {
  const session = await auth();
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
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, phone, newPassword } = body;

    if (!userId || !phone || !newPassword) {
      return NextResponse.json({ error: "Eksik bilgi (userId, phone, newPassword zorunlu)" }, { status: 400 });
    }

    if (newPassword.length < 6) {
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
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 2. Prepare and send SMS via NETGSM
    const smsMessage = `MYFizyo AI platformuna giris bilgileriniz:\nURL: my.cerilas.com\nE-posta: ${targetUser.email}\nSifre: ${newPassword}\nB021`;

    // Fetch active header from DB
    const headerSetting = await prisma.setting.findFirst({
      where: { key: "netgsm_active_header" },
      orderBy: { updatedAt: "desc" },
    });
    const activeHeader = headerSetting?.value || process.env.NETGSM_HEADER || "3423411000";

    // NetGSM REST v2 uses HTTP Basic Authentication
    const basicAuth = Buffer.from(`${NETGSM_USERCODE}:${NETGSM_PASSWORD}`).toString("base64");

    const payload = {
      msgheader: activeHeader,
      messages: [
        {
          msg: smsMessage,
          no: formattedPhone,
        },
      ],
      encoding: "TR",
      iysfilter: "0",
      appname: "Cerilas AI",
    };

    const response = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (data && data.code === "00") {
      return NextResponse.json({ success: true, message: "SMS başarıyla kuyruğa eklendi", jobId: data.jobid });
    } else {
      console.error("NetGSM Error:", data);
      return NextResponse.json(
        { error: `SMS gönderilemedi. NetGSM Hata Kodu: ${data?.code || "Bilinmiyor"} - ${data?.description || ""}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("SMS Error:", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu: " + error.message }, { status: 500 });
  }
}
