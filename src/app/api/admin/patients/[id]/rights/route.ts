import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const NETGSM_USERCODE = process.env.NETGSM_USERCODE || "3423411000";
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD || "Dnz.24232423";

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("905")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("05")) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const { id } = await params;
    const { amount, action } = await req.json();
    
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { 
        name: true,
        usageLimit: true,
        patientProfile: { select: { phone: true } }
      }
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
      }
    });

    // SMS Gönderme İşlemi
    let smsSent = false;
    let smsErrorMsg = "";
    if (user.patientProfile?.phone) {
      const formattedPhone = formatPhone(user.patientProfile.phone);
      if (formattedPhone.length === 10 && formattedPhone.startsWith("5")) {
        try {
          const headerSetting = await prisma.setting.findFirst({
            where: { key: "netgsm_active_header" },
            orderBy: { updatedAt: "desc" },
          });
          const activeHeader = headerSetting?.value || process.env.NETGSM_HEADER || "3423411000";
          const basicAuth = Buffer.from(`${NETGSM_USERCODE}:${NETGSM_PASSWORD}`).toString("base64");
          
          let smsMessage = `Sayin ${user.name}, MYFizyo AI platformunda hesabiniza ${amount === 999999 ? "sinirsiz" : amount} adet danisma hakki tanimlanmistir. Saglikli gunler dileriz. B021`;

          const payload = {
            msgheader: activeHeader,
            messages: [{ msg: smsMessage, no: formattedPhone }],
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
            smsSent = true;
          } else {
            smsErrorMsg = "SMS iletilemedi (" + (data?.code || "Bilinmiyor") + ")";
          }
        } catch (err) {
          console.error("NetGSM Error in Rights:", err);
          smsErrorMsg = "SMS sunucu hatası";
        }
      } else {
         smsErrorMsg = "Geçersiz telefon formatı";
      }
    } else {
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
