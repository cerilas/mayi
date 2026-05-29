import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCerilasMail } from "@/lib/mail";

export async function GET(req: Request) {
  // CRON servisleri için ufak bir güvenlik (opsiyonel header kontrolü eklenebilir)
  // if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) ...
  
  try {
    // 1. E-posta listesini al (Virgülle ayrılmış olarak kaydedildiğini varsayıyoruz)
    const emailSetting = await prisma.setting.findFirst({
      where: { key: "daily_report_emails" }
    });

    if (!emailSetting || !emailSetting.value.trim()) {
      return NextResponse.json({ message: "Gönderilecek e-posta adresi bulunamadı. İşlem iptal edildi." });
    }

    const emailList = emailSetting.value.split(",").map(e => e.trim()).filter(e => e.length > 0);
    
    if (emailList.length === 0) {
      return NextResponse.json({ message: "Geçerli e-posta adresi bulunamadı." });
    }

    // 2. Zaman aralıklarını belirle (Son 24 saat)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 3. Tüm Zamanların İstatistikleri
    const [
      totalPatients,
      totalConversations,
      totalMessages,
      totalAiErrors,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "patient" } }),
      prisma.conversation.count({ where: { deletedAt: null } }),
      prisma.message.count(),
      prisma.message.count({ 
        where: { OR: [ { status: "error" }, { errorMessage: { not: null } } ] }
      })
    ]);

    // 4. Günlük (Son 24 Saat) İstatistikleri
    const [
      dailyPatients,
      dailyConversations,
      dailyMessages,
      dailyAiErrors,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "patient", createdAt: { gte: yesterday } } }),
      prisma.conversation.count({ where: { deletedAt: null, createdAt: { gte: yesterday } } }),
      prisma.message.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.message.count({ 
        where: { 
          createdAt: { gte: yesterday },
          OR: [ { status: "error" }, { errorMessage: { not: null } } ] 
        }
      })
    ]);

    // 5. Şablonu Oluştur (HTML)
    const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <div style="background-color: #4F46E5; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Günlük Sistem Raporu</h1>
        <p style="color: #E0E7FF; margin: 5px 0 0 0; font-size: 14px;">${yesterday.toLocaleDateString('tr-TR')} - ${now.toLocaleDateString('tr-TR')}</p>
      </div>
      
      <div style="border: 1px solid #E5E7EB; border-top: none; padding: 30px; border-radius: 0 0 10px 10px; background-color: #FAFAFA;">
        
        <h2 style="color: #111827; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; margin-top: 0;">Son 24 Saat</h2>
        <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
          <li style="margin-bottom: 10px;">👤 <strong>Yeni Hasta Kaydı:</strong> <span style="color: #059669; font-weight: bold;">+${dailyPatients}</span></li>
          <li style="margin-bottom: 10px;">💬 <strong>Yeni Açılan Sohbet:</strong> <span style="color: #059669; font-weight: bold;">+${dailyConversations}</span></li>
          <li style="margin-bottom: 10px;">📩 <strong>Atılan Toplam Mesaj:</strong> <span style="color: #4F46E5; font-weight: bold;">+${dailyMessages}</span></li>
          <li style="margin-bottom: 10px;">⚠️ <strong>Yapay Zeka Hatası:</strong> <span style="color: ${dailyAiErrors > 0 ? '#DC2626' : '#059669'}; font-weight: bold;">${dailyAiErrors}</span></li>
        </ul>

        <h2 style="color: #111827; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">Tüm Zamanlar (Genel Durum)</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;">👥 <strong>Toplam Kayıtlı Hasta:</strong> ${totalPatients}</li>
          <li style="margin-bottom: 10px;">📂 <strong>Aktif Sohbet Sayısı:</strong> ${totalConversations}</li>
          <li style="margin-bottom: 10px;">📈 <strong>Toplam Mesaj Hacmi:</strong> ${totalMessages}</li>
          <li style="margin-bottom: 10px;">🛑 <strong>Toplam Hata:</strong> ${totalAiErrors}</li>
        </ul>

      </div>
      
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9CA3AF;">
        Bu e-posta sistem tarafından otomatik olarak her gün saat 21:00'da gönderilir. <br>
        Rapor ayarlarını Admin Paneli > İstatistikler sayfasından değiştirebilirsiniz.
      </div>
    </div>
    `;

    // 6. E-postayı Gönder
    const success = await sendCerilasMail(
      emailList, 
      `Günlük Sistem Raporu - ${now.toLocaleDateString('tr-TR')}`, 
      htmlTemplate
    );

    if (success) {
      return NextResponse.json({ message: "Günlük rapor başarıyla gönderildi.", emails: emailList });
    } else {
      return NextResponse.json({ error: "E-posta gönderilirken API'de hata oluştu." }, { status: 500 });
    }

  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
