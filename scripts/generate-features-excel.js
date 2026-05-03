const XLSX = require("xlsx");
const path = require("path");

const data = [
  // ─── KİMLİK DOĞRULAMA & YETKİLENDİRME ───
  ["Kimlik Doğrulama & Yetkilendirme", "Kullanıcı Giriş Sistemi", "Email ve şifre tabanlı kimlik doğrulama sistemi geliştirildi. Şifreler bcryptjs ile hash'lenerek güvenli şekilde saklanır.", "Tamamlandı", "Yüksek"],
  ["Kimlik Doğrulama & Yetkilendirme", "JWT Oturum Yönetimi", "NextAuth v5 entegrasyonu ile stateless JWT tabanlı oturum yönetimi implement edildi.", "Tamamlandı", "Yüksek"],
  ["Kimlik Doğrulama & Yetkilendirme", "Rol Tabanlı Erişim Kontrolü", "Admin ve User rolleri tanımlandı. Yetkisiz erişim girişimleri API seviyesinde engellenir.", "Tamamlandı", "Yüksek"],
  ["Kimlik Doğrulama & Yetkilendirme", "Oturum Koruma", "Tüm API endpoint'leri ve sayfa rotaları oturum kontrolünden geçirilir. Yetkisiz erişimde login sayfasına yönlendirme yapılır.", "Tamamlandı", "Yüksek"],

  // ─── ADMİN PANELİ ───
  ["Admin Paneli", "Kullanıcı Listeleme", "Tüm kayıtlı kullanıcıları listeleme, rol ve durum bilgilerini görüntüleme endpoint'i geliştirildi.", "Tamamlandı", "Yüksek"],
  ["Admin Paneli", "Kullanıcı Oluşturma", "Admin panelinden yeni kullanıcı oluşturma fonksiyonu. Email, şifre ve rol ataması yapılır.", "Tamamlandı", "Yüksek"],
  ["Admin Paneli", "Kullanıcı Düzenleme", "Mevcut kullanıcıların bilgilerini güncelleme, rol değiştirme ve şifre sıfırlama işlevi.", "Tamamlandı", "Orta"],
  ["Admin Paneli", "Kullanıcı Silme", "Kullanıcı silme fonksiyonu. Son admin kullanıcısının silinmesi güvenlik kontrolü ile engellenir.", "Tamamlandı", "Orta"],

  // ─── SOHBET YÖNETİMİ ───
  ["Sohbet Yönetimi", "Yeni Sohbet Oluşturma", "Tek tıkla yeni sohbet başlatma. Otomatik conversation ID üretimi ve veritabanına kayıt.", "Tamamlandı", "Yüksek"],
  ["Sohbet Yönetimi", "Otomatik Başlık Üretimi", "AI ile ilk mesajdan Türkçe sohbet başlığı otomatik üretilir (maks 6 kelime).", "Tamamlandı", "Orta"],
  ["Sohbet Yönetimi", "Sohbet Yeniden Adlandırma", "Mevcut sohbetlerin başlıklarını kullanıcı tarafından değiştirme imkanı.", "Tamamlandı", "Düşük"],
  ["Sohbet Yönetimi", "Sohbet Silme", "Soft delete mekanizması ile sohbet silme. Veri bütünlüğü korunarak silindi olarak işaretlenir.", "Tamamlandı", "Orta"],
  ["Sohbet Yönetimi", "Sohbet Geçmişi", "Tüm geçmiş sohbetleri sidebar'da listeleme. Tarih sıralaması ve pagination desteği.", "Tamamlandı", "Yüksek"],
  ["Sohbet Yönetimi", "Sohbetler Arası Geçiş", "Sidebar'dan tıklama ile sohbetler arasında kesintisiz geçiş. URL tabanlı routing.", "Tamamlandı", "Yüksek"],
  ["Sohbet Yönetimi", "Mesaj Geçmişi Yükleme", "Scroll ile eski mesajları lazy loading ile yükleme. Cursor tabanlı pagination.", "Tamamlandı", "Orta"],

  // ─── KLASÖR YÖNETİMİ ───
  ["Klasör Yönetimi", "Klasör Oluşturma", "Sohbetleri organize etmek için klasör oluşturma API'si ve UI bileşeni geliştirildi.", "Tamamlandı", "Orta"],
  ["Klasör Yönetimi", "Sürükle-Bırak Organizasyon", "dnd-kit kütüphanesi ile sohbetleri klasörlere sürükle-bırak ile taşıma.", "Tamamlandı", "Orta"],
  ["Klasör Yönetimi", "Klasör Yeniden Adlandırma", "Mevcut klasör adlarını inline düzenleme ile değiştirme.", "Tamamlandı", "Düşük"],
  ["Klasör Yönetimi", "Klasör Silme", "Klasör silme işlevi. İçindeki sohbetler klasörsüz olarak korunur.", "Tamamlandı", "Düşük"],
  ["Klasör Yönetimi", "Klasör Açma/Kapatma", "Sidebar'da klasörleri genişletme/daraltma toggle mekanizması.", "Tamamlandı", "Düşük"],
  ["Klasör Yönetimi", "Sohbet Sayısı Gösterimi", "Her klasörün yanında içerdiği sohbet sayısı dinamik olarak gösterilir.", "Tamamlandı", "Düşük"],

  // ─── YAPAY ZEKA ENTEGRASYONLarI ───
  ["AI Entegrasyonu", "OpenAI Provider Entegrasyonu", "GPT-4.1, GPT-4o, GPT-4o-mini modelleri ile tam entegrasyon. Streaming yanıt desteği.", "Tamamlandı", "Yüksek"],
  ["AI Entegrasyonu", "Google Gemini Provider Entegrasyonu", "Gemini 2.5 Pro, 2.5 Flash, 1.5 Pro modelleri entegre edildi. Streaming ve function calling desteği.", "Tamamlandı", "Yüksek"],
  ["AI Entegrasyonu", "Dinamik Model Seçimi", "Kullanıcı arayüzünden anlık model değiştirme. Model listesi API'den dinamik olarak çekilir.", "Tamamlandı", "Yüksek"],
  ["AI Entegrasyonu", "Streaming Yanıt (SSE)", "Server-Sent Events ile gerçek zamanlı token akışı. Kullanıcı yanıtı oluşurken görür.", "Tamamlandı", "Yüksek"],
  ["AI Entegrasyonu", "Function Calling", "AI araçları için otomatik function calling döngüsü (maks 5 iterasyon). Araç sonuçları AI'a geri beslenir.", "Tamamlandı", "Yüksek"],
  ["AI Entegrasyonu", "Web Arama Entegrasyonu", "Gemini'nin googleSearch özelliği ile gerçek zamanlı web araması. Toggle butonu ile açılıp kapanır.", "Tamamlandı", "Orta"],
  ["AI Entegrasyonu", "URL İçerik Analizi", "Mesajdaki URL'lerin otomatik tespit edilip içeriklerinin AI'a bağlam olarak verilmesi.", "Tamamlandı", "Orta"],
  ["AI Entegrasyonu", "Sistem Talimatları", "Kullanıcı bazlı özel sistem promptları tanımlama. Her sohbette otomatik uygulanır.", "Tamamlandı", "Orta"],
  ["AI Entegrasyonu", "Zaman Aşımı Koruması", "30 saniyelik varsayılan timeout ile uzun süren AI yanıtlarında koruma mekanizması.", "Tamamlandı", "Orta"],

  // ─── YERLEŞİK AI ARAÇLARI ───
  ["Yerleşik AI Araçları", "Tarih/Saat Sorgulama", "get_current_datetime() fonksiyonu ile Türkiye saat diliminde güncel tarih ve saat bilgisi.", "Tamamlandı", "Düşük"],
  ["Yerleşik AI Araçları", "BMI Hesaplama", "calculate_bmi() aracı ile vücut kitle indeksi hesaplama, sağlık kategorisi ve Türkçe öneriler.", "Tamamlandı", "Orta"],
  ["Yerleşik AI Araçları", "İdeal Kilo Hesaplama", "calculate_ideal_weight() aracı ile Devine formülü ve WHO BMI aralığı bazlı hesaplama.", "Tamamlandı", "Orta"],

  // ─── DOSYA İŞLEMLERİ ───
  ["Dosya İşlemleri", "Dosya Yükleme", "JPEG, PNG, GIF, WebP ve PDF formatlarında dosya yükleme. FormData ile multipart upload.", "Tamamlandı", "Yüksek"],
  ["Dosya İşlemleri", "Dosya Boyutu Kontrolü", "Maksimum 10MB dosya boyutu sınırı. Yapılandırılabilir limit ile aşım durumunda hata mesajı.", "Tamamlandı", "Orta"],
  ["Dosya İşlemleri", "MIME Type Doğrulama", "Yalnızca izin verilen dosya türlerinin yüklenmesine izin verilir. Güvenlik için sunucu tarafı kontrolü.", "Tamamlandı", "Yüksek"],
  ["Dosya İşlemleri", "UUID Dosya Adlandırma", "Yüklenen dosyalar UUID ile yeniden adlandırılır. Path traversal saldırılarına karşı koruma.", "Tamamlandı", "Yüksek"],
  ["Dosya İşlemleri", "Dosya İndirme", "Yüklenen dosyaları güvenli şekilde indirme endpoint'i. Path traversal önleme kontrolü.", "Tamamlandı", "Orta"],
  ["Dosya İşlemleri", "Sürükle-Bırak Yükleme", "Mesaj alanına dosya sürükleyip bırakarak yükleme. Görsel geri bildirim ile.", "Tamamlandı", "Orta"],
  ["Dosya İşlemleri", "Ek Önizleme", "Yüklenen dosyaların küçük resim önizlemesi. PDF dosyaları için ikon gösterimi.", "Tamamlandı", "Düşük"],
  ["Dosya İşlemleri", "Ek Kaldırma", "Gönderilmeden önce eklenen dosyaları tek tıkla kaldırma.", "Tamamlandı", "Düşük"],

  // ─── GÖRSEL ÖZELLİKLERİ ───
  ["Görsel İşlemleri", "AI ile Görsel Üretme", "Gemini modeli ile metin açıklamasından görsel üretme. Özel image generation endpoint'i.", "Tamamlandı", "Yüksek"],
  ["Görsel İşlemleri", "Görsel Düzenleme Modu", "Mevcut görseli yükleyip üzerinde AI ile varyasyon oluşturma.", "Tamamlandı", "Orta"],
  ["Görsel İşlemleri", "Görsel Analizi", "AI vision ile yüklenen görsellerin içerik analizi ve açıklama.", "Tamamlandı", "Orta"],
  ["Görsel İşlemleri", "Görsel İndirme", "Üretilen veya paylaşılan görselleri tek tıkla indirme butonu.", "Tamamlandı", "Düşük"],
  ["Görsel İşlemleri", "Lightbox Görüntüleme", "Görsellere tıklayınca büyük boyutlu görüntüleme.", "Tamamlandı", "Düşük"],
  ["Görsel İşlemleri", "Base64 Inline Görsel Desteği", "Görsellerin base64 formatında AI'a iletilmesi için encode/decode mekanizması.", "Tamamlandı", "Orta"],

  // ─── PDF İŞLEMLERİ ───
  ["PDF İşlemleri", "PDF Yükleme ve Ekleme", "PDF dosyalarını sohbete ek olarak yükleme ve AI'a iletme.", "Tamamlandı", "Orta"],
  ["PDF İşlemleri", "PDF Görüntüleme", "Sohbet içinde PDF dosyalarını görüntüleme ve indirme linkleri.", "Tamamlandı", "Düşük"],
  ["PDF İşlemleri", "PDF'e Dışa Aktarma", "html2canvas-pro ve jsPDF ile sohbeti çok sayfalı PDF olarak dışa aktarma.", "Tamamlandı", "Orta"],

  // ─── PAYLAŞIM ÖZELLİKLERİ ───
  ["Paylaşım", "Paylaşım Linki Oluşturma", "UUID tabanlı benzersiz public paylaşım linki üretme. Tek tıkla aktifleştirme.", "Tamamlandı", "Orta"],
  ["Paylaşım", "Paylaşılan Sohbeti Görüntüleme", "Giriş yapmadan paylaşılan sohbetleri görüntüleme sayfası.", "Tamamlandı", "Orta"],
  ["Paylaşım", "Paylaşım Linkini Kopyalama", "Clipboard API ile paylaşım linkini panoya kopyalama.", "Tamamlandı", "Düşük"],
  ["Paylaşım", "Paylaşımı Açma/Kapatma", "Mevcut paylaşımı toggle ile aktif/pasif yapma.", "Tamamlandı", "Düşük"],
  ["Paylaşım", "Excel'e Dışa Aktarma", "XLSX kütüphanesi ile sohbet verilerini formatlı Excel dosyasına aktarma.", "Tamamlandı", "Orta"],

  // ─── KULLANICI ARAYÜZÜ ───
  ["Kullanıcı Arayüzü", "Responsive Tasarım", "Mobil, tablet ve masaüstü için tam uyumlu responsive layout. Breakpoint bazlı düzen.", "Tamamlandı", "Yüksek"],
  ["Kullanıcı Arayüzü", "Mobil Hamburger Menü", "Mobil cihazlarda sidebar'ı açıp kapatan hamburger menü butonu.", "Tamamlandı", "Orta"],
  ["Kullanıcı Arayüzü", "Masaüstü Sidebar", "Sol tarafta sabit sidebar ile sohbet listesi, klasörler ve navigasyon.", "Tamamlandı", "Yüksek"],
  ["Kullanıcı Arayüzü", "Logo ile Navigasyon", "Sol üst köşedeki logoya tıklayınca karşılama ekranına yönlendirme.", "Tamamlandı", "Düşük"],
  ["Kullanıcı Arayüzü", "Auto-Focus Mesaj Kutusu", "Sayfa yüklendiğinde ve AI yanıtı tamamlandığında mesaj kutusuna otomatik odaklanma.", "Tamamlandı", "Düşük"],
  ["Kullanıcı Arayüzü", "Otomatik Textarea Boyutlandırma", "Mesaj uzadıkça textarea yüksekliğinin otomatik artması (maks 200px).", "Tamamlandı", "Düşük"],
  ["Kullanıcı Arayüzü", "Markdown Render", "GFM desteği ile tablolar, listeler, kod blokları, üstü çizili metin render'ı.", "Tamamlandı", "Orta"],
  ["Kullanıcı Arayüzü", "Kod Sözdizimi Vurgulama", "Kod bloklarında dil bazlı syntax highlighting.", "Tamamlandı", "Orta"],
  ["Kullanıcı Arayüzü", "Typewriter Animasyonu", "AI yanıtlarında karakter karakter yazma efekti.", "Tamamlandı", "Düşük"],
  ["Kullanıcı Arayüzü", "Otomatik Scroll", "Yeni mesaj geldiğinde sohbet alanının otomatik aşağı kaydırılması.", "Tamamlandı", "Orta"],
  ["Kullanıcı Arayüzü", "Onay Diyalogları", "Silme gibi yıkıcı işlemler öncesi kullanıcı onayı alan modal diyaloglar.", "Tamamlandı", "Orta"],
  ["Kullanıcı Arayüzü", "Yükleniyor Göstergeleri", "API çağrıları sırasında spinner ve loading state gösterimleri.", "Tamamlandı", "Düşük"],
  ["Kullanıcı Arayüzü", "Klavye Kısayolları", "Shift+Enter ile yeni satır, Enter ile mesaj gönderme.", "Tamamlandı", "Düşük"],
  ["Kullanıcı Arayüzü", "Karşılama Ekranı", "İlk girişte 3 tıklanabilir kart ile özellik tanıtımı.", "Tamamlandı", "Orta"],

  // ─── GÖRSEL EFEKTLER ───
  ["Görsel Efektler & Animasyonlar", "MagicRings Animasyonu", "WebGL tabanlı animasyonlu halkalar. Renk, hız ve parallax yapılandırması.", "Tamamlandı", "Düşük"],
  ["Görsel Efektler & Animasyonlar", "ProfileCard Efekti", "Tilt ve parallax efektli kart animasyonu.", "Tamamlandı", "Düşük"],
  ["Görsel Efektler & Animasyonlar", "ShinyText Efekti", "Parlayan metin animasyonu.", "Tamamlandı", "Düşük"],
  ["Görsel Efektler & Animasyonlar", "GradualBlur Efekti", "Kademeli bulanıklık geçiş animasyonu.", "Tamamlandı", "Düşük"],
  ["Görsel Efektler & Animasyonlar", "ScrollFloat Efekti", "Scroll tetiklemeli yüzen animasyonlar.", "Tamamlandı", "Düşük"],

  // ─── KİŞİSELLEŞTİRME ───
  ["Kişiselleştirme", "Renk Teması Seçimi", "7 farklı renk teması: Mavi, Teal, Mor, Yeşil, Turuncu, Gül, Gri. Anlık uygulanır.", "Tamamlandı", "Orta"],
  ["Kişiselleştirme", "Asistan İkonu Seçimi", "5 farklı asistan ikonu: Pulse, Robot, Spark, Brain, MY Logo. localStorage'da saklanır.", "Tamamlandı", "Düşük"],
  ["Kişiselleştirme", "API Anahtarı Yönetimi", "Kullanıcı bazlı API key tanımlama. Şifre maskeli görüntüleme (••••son4).", "Tamamlandı", "Orta"],
  ["Kişiselleştirme", "Özel Sistem Talimatları", "Kullanıcı bazlı AI davranışını özelleştiren sistem promptları.", "Tamamlandı", "Orta"],
  ["Kişiselleştirme", "Ayarlar Modalı", "Tema, ikon, API anahtarları ve sistem talimatlarını yönetmek için modal pencere.", "Tamamlandı", "Orta"],

  // ─── VERİTABANI & ALTYAPI ───
  ["Veritabanı & Altyapı", "PostgreSQL Veritabanı", "Prisma ORM ile PostgreSQL entegrasyonu. 6 veri modeli ile ilişkisel yapı.", "Tamamlandı", "Yüksek"],
  ["Veritabanı & Altyapı", "Veritabanı Migration Sistemi", "Prisma migration ile veritabanı şema versiyonlama ve otomatik uygulama.", "Tamamlandı", "Yüksek"],
  ["Veritabanı & Altyapı", "Seed Data", "Başlangıç admin kullanıcısı ve örnek veri oluşturma seed scripti.", "Tamamlandı", "Düşük"],
  ["Veritabanı & Altyapı", "Soft Delete Mekanizması", "Sohbetler fiziksel olarak silinmez, deletedAt alanı ile işaretlenir.", "Tamamlandı", "Orta"],
  ["Veritabanı & Altyapı", "Cascade Delete", "İlişkili kayıtların otomatik temizlenmesi için cascade delete kuralları.", "Tamamlandı", "Orta"],
  ["Veritabanı & Altyapı", "Cursor Tabanlı Pagination", "Performanslı sayfalama için cursor-based pagination implementasyonu.", "Tamamlandı", "Orta"],

  // ─── GÜVENLİK ───
  ["Güvenlik", "Şifre Hash'leme", "bcryptjs ile kullanıcı şifrelerinin güvenli hash'lenmesi.", "Tamamlandı", "Yüksek"],
  ["Güvenlik", "Path Traversal Koruması", "Dosya indirme endpoint'inde path traversal saldırılarına karşı güvenlik kontrolü.", "Tamamlandı", "Yüksek"],
  ["Güvenlik", "MIME Type Kontrolü", "Sunucu tarafında dosya türü doğrulama. İzin verilmeyen türler reddedilir.", "Tamamlandı", "Yüksek"],
  ["Güvenlik", "API Key Maskeleme", "Kullanıcı ayarlarında API anahtarlarının maskeli gösterimi.", "Tamamlandı", "Orta"],
  ["Güvenlik", "Oturum Doğrulama", "Her API isteğinde oturum ve yetki doğrulaması.", "Tamamlandı", "Yüksek"],
  ["Güvenlik", "Son Admin Koruması", "Son admin kullanıcısının silinmesini engelleyen güvenlik kontrolü.", "Tamamlandı", "Orta"],
];

const wb = XLSX.utils.book_new();

const header = ["Modül / Kategori", "Özellik Adı", "Açıklama", "Durum", "Öncelik"];
const wsData = [header, ...data];
const ws = XLSX.utils.aoa_to_sheet(wsData);

// Column widths
ws["!cols"] = [
  { wch: 32 },
  { wch: 35 },
  { wch: 80 },
  { wch: 14 },
  { wch: 12 },
];

XLSX.utils.book_append_sheet(wb, ws, "Platform Özellikleri");

// ─── SUMMARY SHEET ───
const summaryData = [
  ["MY FizyoAI Platform - Özellik Özeti"],
  [],
  ["Toplam Özellik Sayısı", data.length],
  ["Tamamlanan", data.filter(r => r[3] === "Tamamlandı").length],
  [],
  ["Kategori", "Özellik Sayısı"],
];

const categories = {};
data.forEach(r => {
  categories[r[0]] = (categories[r[0]] || 0) + 1;
});
Object.entries(categories).forEach(([cat, count]) => {
  summaryData.push([cat, count]);
});

summaryData.push([]);
summaryData.push(["Öncelik Dağılımı", ""]);
summaryData.push(["Yüksek", data.filter(r => r[4] === "Yüksek").length]);
summaryData.push(["Orta", data.filter(r => r[4] === "Orta").length]);
summaryData.push(["Düşük", data.filter(r => r[4] === "Düşük").length]);

summaryData.push([]);
summaryData.push(["Teknoloji Stack", ""]);
summaryData.push(["Framework", "Next.js 16.2.2 + React 19.2.4"]);
summaryData.push(["Veritabanı", "PostgreSQL + Prisma ORM"]);
summaryData.push(["Kimlik Doğrulama", "NextAuth v5 (JWT)"]);
summaryData.push(["AI Sağlayıcılar", "OpenAI SDK + Google GenAI SDK"]);
summaryData.push(["Animasyonlar", "Motion, Three.js, GSAP"]);
summaryData.push(["UI Framework", "Tailwind CSS"]);
summaryData.push(["Dışa Aktarma", "html2canvas-pro, jsPDF, XLSX"]);
summaryData.push(["Sürükle-Bırak", "dnd-kit"]);
summaryData.push(["Dil", "Türkçe (UI & Yorumlar)"]);

const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
ws2["!cols"] = [{ wch: 35 }, { wch: 45 }];

XLSX.utils.book_append_sheet(wb, ws2, "Özet");

// ─── API ENDPOINTS SHEET ───
const apiData = [
  ["Kategori", "HTTP Metodu", "Endpoint", "Açıklama"],
  ["Sohbetler", "GET", "/api/conversations", "Tüm sohbetleri listele"],
  ["Sohbetler", "POST", "/api/conversations", "Yeni sohbet oluştur"],
  ["Sohbetler", "GET", "/api/conversations/[id]", "Sohbet detayını getir"],
  ["Sohbetler", "PATCH", "/api/conversations/[id]", "Sohbet bilgilerini güncelle"],
  ["Sohbetler", "DELETE", "/api/conversations/[id]", "Sohbeti sil (soft delete)"],
  ["Mesajlar", "GET", "/api/conversations/[id]/messages", "Sohbet mesajlarını getir (cursor pagination)"],
  ["AI Chat", "POST", "/api/chat/[id]", "AI'a mesaj gönder (SSE streaming)"],
  ["Paylaşım", "POST", "/api/conversations/[id]/share", "Paylaşım linkini oluştur/toggle"],
  ["Paylaşım", "GET", "/api/conversations/[id]/share", "Paylaşım durumunu kontrol et"],
  ["Paylaşım", "GET", "/api/share/[shareId]", "Paylaşılan sohbeti görüntüle"],
  ["Dosyalar", "POST", "/api/upload", "Dosya yükle (multipart)"],
  ["Dosyalar", "GET", "/api/files/[...path]", "Dosya indir"],
  ["Görsel", "POST", "/api/generate-image", "AI ile görsel üret"],
  ["Modeller", "GET", "/api/models", "Mevcut AI modellerini listele"],
  ["Klasörler", "GET", "/api/folders", "Klasörleri listele"],
  ["Klasörler", "POST", "/api/folders", "Yeni klasör oluştur"],
  ["Klasörler", "PATCH", "/api/folders/[id]", "Klasörü yeniden adlandır"],
  ["Klasörler", "DELETE", "/api/folders/[id]", "Klasörü sil"],
  ["Ayarlar", "GET", "/api/settings", "Kullanıcı ayarlarını getir"],
  ["Ayarlar", "PATCH", "/api/settings", "Kullanıcı ayarlarını güncelle"],
  ["Admin", "GET", "/api/admin/users", "Tüm kullanıcıları listele"],
  ["Admin", "POST", "/api/admin/users", "Yeni kullanıcı oluştur"],
  ["Admin", "PATCH", "/api/admin/users/[id]", "Kullanıcı bilgilerini güncelle"],
  ["Admin", "DELETE", "/api/admin/users/[id]", "Kullanıcıyı sil"],
  ["Auth", "POST", "/api/auth/[...nextauth]", "NextAuth kimlik doğrulama endpoint'leri"],
];

const ws3 = XLSX.utils.aoa_to_sheet(apiData);
ws3["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 50 }];

XLSX.utils.book_append_sheet(wb, ws3, "API Endpoints");

const outPath = path.join(__dirname, "..", "MY_FizyoAI_Platform_Ozellikleri.xlsx");
XLSX.writeFile(wb, outPath);
console.log("Excel dosyası oluşturuldu:", outPath);
console.log(`Toplam ${data.length} özellik, 3 sayfa.`);
