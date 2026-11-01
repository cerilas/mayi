import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendSms, toLocalMobile } from "@/lib/sms";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getUserSession(req);
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const { id } = await params;
    const { amount, action } = await req.json();

    if (typeof amount !== "number" || amount === 0) {
      return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        name: true,
        usageLimit: true,
        patientProfile: { select: { phone: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    let newLimit = user.usageLimit ?? 15;

    if (action === "set") {
      newLimit = amount;
    } else if (action === "add") {
      newLimit += amount;
    }

    // Limit to reasonable numbers, or 999999 for "Unlimited"
    if (newLimit > 999999) newLimit = 999999;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { usageLimit: newLimit },
      select: {
        id: true,
        usageLimit: true,
        usageUsed: true,
      },
    });

    // SMS Gönderme İşlemi
    let smsSent = false;
    let smsErrorMsg = "";

    // Sadece hak artırıldığında SMS gönder
    const isIncrease = newLimit > (user.usageLimit ?? 15);

    if (isIncrease && user.patientProfile?.phone) {
      const formattedPhone = toLocalMobile(user.patientProfile.phone);
      if (formattedPhone) {
        try {
          const smsMessage = `Sayin ${user.name}, MYFizyo AI platformunda hesabiniza ${amount === 999999 ? "sinirsiz" : amount} adet danisma hakki tanimlanmistir. Saglikli gunler dileriz. B021`;
          const result = await sendSms([formattedPhone], smsMessage);
          if (result.ok) {
            smsSent = true;
          } else {
            smsErrorMsg = "SMS iletilemedi (" + (result.code || "Bilinmiyor") + ")";
          }
        } catch (err) {
          console.error("NetGSM Error in Rights:", err);
          smsErrorMsg = "SMS sunucu hatası";
        }
      } else {
        smsErrorMsg = "Geçersiz telefon formatı";
      }
    } else if (isIncrease) {
      smsErrorMsg = "Kullanıcının telefonu yok";
    }

    let finalMessage = "Kullanım hakları başarıyla güncellendi.";
    if (smsSent) finalMessage += " SMS gönderildi.";
    else if (smsErrorMsg) finalMessage += ` (Uyarı: ${smsErrorMsg})`;

    return NextResponse.json({
      message: finalMessage,
      usageLimit: updatedUser.usageLimit,
      usageUsed: updatedUser.usageUsed,
    });
  } catch (error: any) {
    console.error("Rights Error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
