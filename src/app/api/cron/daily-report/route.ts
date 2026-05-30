import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCerilasMail } from "@/lib/mail";

export async function GET(req: Request) {
  // CRON servisleri için güvenlik (Query param veya Header üzerinden kontrol)
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Yetkisiz erişim. Geçersiz cron şifresi." }, 
      { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
  
  try {
    // 1. E-posta listesini al (Virgülle ayrılmış olarak kaydedildiğini varsayıyoruz)
    const emailSetting = await prisma.setting.findFirst({
      where: { key: "daily_report_emails" }
    });

    if (!emailSetting || !emailSetting.value.trim()) {
      return NextResponse.json(
        { message: "Gönderilecek e-posta adresi bulunamadı. İşlem iptal edildi." },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const emailList = emailSetting.value.split(",").map(e => e.trim()).filter(e => e.length > 0);
    
    if (emailList.length === 0) {
      return NextResponse.json(
        { message: "Geçerli e-posta adresi bulunamadı." },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
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

    // 5. Şablonu Oluştur (HTML) - Modern Tasarım
    const formattedDate = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Günlük Sistem Raporu</title>
    </head>
    <body style="background-color: #f3f4f6; margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-w: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        
        <!-- Header / Logo -->
        <tr>
          <td align="center" style="padding: 40px 0 30px 0; background-color: #ffffff; border-bottom: 1px solid #f3f4f6;">
            <a href="https://my.cerilas.com" target="_blank" style="text-decoration: none;">
              <img src="https://my.cerilas.com/my-logo.png" alt="Mahmut Yücel FizyoAI" style="height: 50px; display: block;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=MY+FizyoAI&background=4F46E5&color=fff&size=100';">
            </a>
            <h1 style="color: #111827; font-size: 22px; font-weight: 700; margin: 20px 0 5px 0; letter-spacing: -0.5px;">Sistem İstatistikleri</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">${formattedDate}</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 40px 40px;">
            
            <!-- Son 24 Saat Section -->
            <div style="margin-bottom: 40px;">
              <h2 style="color: #111827; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 20px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Son 24 Saat (Günlük)</h2>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/user-plus.svg" width="20" height="20" style="opacity: 0.6;"></td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 15px;">Yeni Hasta Kaydı</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #059669; font-size: 16px;">+${dailyPatients}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/message-square-plus.svg" width="20" height="20" style="opacity: 0.6;"></td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 15px;">Yeni Açılan Sohbet</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #059669; font-size: 16px;">+${dailyConversations}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/trending-up.svg" width="20" height="20" style="opacity: 0.6;"></td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 15px;">Atılan Toplam Mesaj</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #4F46E5; font-size: 16px;">+${dailyMessages}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/alert-octagon.svg" width="20" height="20" style="opacity: ${dailyAiErrors > 0 ? '1' : '0.6'}; filter: ${dailyAiErrors > 0 ? 'brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(5)' : 'none'};"></td>
                  <td style="padding: 12px 0; color: #374151; font-size: 15px;">Yapay Zeka Hatası</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: 700; color: ${dailyAiErrors > 0 ? '#DC2626' : '#6b7280'}; font-size: 16px;">${dailyAiErrors}</td>
                </tr>
              </table>
            </div>

            <!-- Genel Toplam Section -->
            <div>
              <h2 style="color: #111827; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 20px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Tüm Zamanlar (Genel Durum)</h2>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/users.svg" width="20" height="20" style="opacity: 0.6;"></td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 15px;">Toplam Kayıtlı Hasta</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${totalPatients}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/folder-open.svg" width="20" height="20" style="opacity: 0.6;"></td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 15px;">Aktif Sohbet Sayısı</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${totalConversations}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/bar-chart-3.svg" width="20" height="20" style="opacity: 0.6;"></td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 15px;">Toplam Mesaj Hacmi</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${totalMessages}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;" width="30"><img src="https://unpkg.com/lucide-static@0.344.0/icons/shield-alert.svg" width="20" height="20" style="opacity: 0.6;"></td>
                  <td style="padding: 12px 0; color: #374151; font-size: 15px;">Toplam Hata Sayısı</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${totalAiErrors}</td>
                </tr>
              </table>
            </div>

            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center;">
              <a href="https://my.cerilas.com/admin/stats" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; margin-bottom: 20px;">
                Panele Git
              </a>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;">
                Bu e-posta Mahmut Yücel AI Platformu tarafından otomatik olarak oluşturulmuştur.<br>
                Rapor alıcılarını Admin Paneli &gt; İstatistikler sayfasından yönetebilirsiniz.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5; padding-top: 10px; border-top: 1px dashed #e5e7eb; display: inline-block;">
                Platform teknik destek ve iletişim için: <br>
                <a href="mailto:iletisim@cerilas.com" style="color: #4F46E5; text-decoration: none;">iletisim@cerilas.com</a> | <a href="https://www.cerilas.com" target="_blank" style="color: #4F46E5; text-decoration: none;">www.cerilas.com</a>
              </p>
            </div>

          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // 6. E-postayı Gönder
    const result = await sendCerilasMail(
      emailList, 
      `Mahmut Yücel AI Platformu Günlük Rapor - ${formattedDate}`, 
      htmlTemplate
    );

    if (result.success) {
      return NextResponse.json(
        { message: "Günlük rapor başarıyla gönderildi.", emails: emailList },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    } else {
      return NextResponse.json(
        { error: `E-posta API hatası: ${result.error}` }, 
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json(
      { error: err.message }, 
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
