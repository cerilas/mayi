"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type GuideRole = "physiotherapist" | "admin";

type GuideSection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  audience: "all" | GuideRole;
  duration: string;
  steps?: { title: string; detail: string }[];
  items?: { title: string; detail: string; badge?: string }[];
  note?: { tone: "info" | "warning" | "success"; title: string; text: string };
  prompt?: string;
  actions?: { label: string; href: string; primary?: boolean }[];
  keywords: string[];
};

const ROLE_META: Record<GuideRole, { label: string; description: string }> = {
  physiotherapist: {
    label: "Fizyoterapist",
    description: "Klinik çalışma, atanmış hastalar ve yapay zekâ destekli günlük iş akışları",
  },
  admin: {
    label: "Admin",
    description: "Klinik yönetimi, kullanıcılar, sistem ayarları, SMS ve raporlama",
  },
};

const SECTIONS: GuideSection[] = [
  {
    id: "baslangic",
    eyebrow: "Hızlı başlangıç",
    title: "İlk 10 dakikada sistemi hazırlayın",
    description:
      "Hesabınızı kişiselleştirin, ilk sohbetinizi açın ve çalışma alanınızı düzenleyin.",
    icon: "01",
    audience: "all",
    duration: "4 adım",
    steps: [
      {
        title: "Ayarlarınızı kontrol edin",
        detail:
          "Sol menünün altındaki Ayarlar simgesini açın. Açık/koyu görünüm, vurgu rengi ve kişisel yapay zekâ talimatlarınızı belirleyin.",
      },
      {
        title: "Yeni bir sohbet başlatın",
        detail:
          "Yeni sohbet oluşturun ve talebinizi amaç, bağlam, beklenen çıktı ve varsa kısıtlarla birlikte açıkça yazın.",
      },
      {
        title: "Doğru aracı seçin",
        detail:
          "Güncel kaynak gerektiğinde Web Araması’nı, görsel gerektiğinde Görsel Üret’i, belge incelemek için Dosya Yükle’yi seçin.",
      },
      {
        title: "Sohbetleri düzenleyin",
        detail:
          "Sık kullandığınız konuşmaları yeniden adlandırın; vaka, araştırma veya idari işler için klasörlere sürükleyin.",
      },
    ],
    actions: [
      { label: "Sohbete git", href: "/chat", primary: true },
      { label: "Hastalarımı aç", href: "/patients" },
    ],
    keywords: ["başlangıç", "ayarlar", "tema", "ilk sohbet", "klasör", "yeni sohbet"],
  },
  {
    id: "sohbet",
    eyebrow: "Ortak kullanım",
    title: "Yapay zekâ sohbetini etkili kullanın",
    description:
      "Daha güvenilir yanıtlar almak için sohbet araçlarını doğru amaçla ve doğru sırada kullanın.",
    icon: "02",
    audience: "all",
    duration: "6 özellik",
    items: [
      {
        title: "Net bir istek yazın",
        detail:
          "Hastanın kişisel verilerini gereksiz yere paylaşmadan hedefi, klinik bağlamı, istediğiniz formatı ve yanıt uzunluğunu belirtin.",
        badge: "Önerilen",
      },
      {
        title: "Dosya ve görsel ekleyin",
        detail:
          "PDF, JPG, PNG, GIF veya WebP dosyalarını yükleyebilirsiniz. Dosyanın hangi bölümüyle ilgili değerlendirme istediğinizi mesajınızda belirtin.",
      },
      {
        title: "Web Araması’nı gerektiğinde açın",
        detail:
          "Güncel kılavuz, çalışma veya duyuru ararken kullanın. Kaynak tarihlerini, örneklemi ve kanıt düzeyini ayrıca kontrol edin.",
      },
      {
        title: "Görsel üretin veya düzenleyin",
        detail:
          "Egzersiz anlatımı gibi görseller için hedef kitleyi, vücut pozisyonunu, açı ve sade arka plan beklentinizi tarif edin.",
      },
      {
        title: "Yanıt işlemlerini kullanın",
        detail:
          "Asistan yanıtını sesli dinleyebilir, uzun metni genişletebilir ve görsel çıktıları yeniden düzenleme akışına alabilirsiniz.",
      },
      {
        title: "Sohbeti güvenli biçimde paylaşın",
        detail:
          "Paylaş özelliği açıkken oluşan bağlantıyı yalnızca yetkili kişilerle paylaşın. İhtiyaç bittiğinde paylaşımı kapatın.",
        badge: "Dikkat",
      },
    ],
    note: {
      tone: "info",
      title: "İyi komut formülü",
      text: "Amaç + gerekli bağlam + istediğiniz çıktı biçimi + sınırlar. Örnek: “Aşağıdaki notları hastaya uygun, sade Türkçe ile 5 maddelik ev egzersizi hatırlatmasına dönüştür; tanı veya yeni tedavi önerisi ekleme.”",
    },
    keywords: [
      "chat",
      "sohbet",
      "dosya",
      "pdf",
      "görsel",
      "web arama",
      "paylaş",
      "sesli oku",
    ],
  },
  {
    id: "gunluk-akis",
    eyebrow: "Fizyoterapist",
    title: "Günlük klinik çalışma akışı",
    description:
      "Atanmış hastalarınızı gözden geçirin, klinik bağlamı güncelleyin ve takip iletişimini hazırlayın.",
    icon: "03",
    audience: "physiotherapist",
    duration: "5 adım",
    steps: [
      {
        title: "Atanmış hasta listenizi açın",
        detail:
          "Hastalarım ekranında yalnızca sorumluluğunuzdaki kayıtlar gösterilir. Arama alanıyla ad veya e-posta üzerinden hastayı bulun.",
      },
      {
        title: "Klinik bilgileri doğrulayın",
        detail:
          "Kısa tanıtım, ayrıntılı öykü, klinik görüş ve egzersiz video bağlantılarının güncelliğini kontrol edin.",
      },
      {
        title: "Bağlamı anlaşılır yazın",
        detail:
          "Kesin olmayan ifadeleri gerçek gibi yazmayın. Tarih, taraf, bölge, kısıt ve takip hedefini ayırt edilebilir biçimde kaydedin.",
      },
      {
        title: "Kişisel sohbetinizde taslak hazırlayın",
        detail:
          "Seans özeti, hasta bilgilendirme metni veya araştırma özeti hazırlatın; çıktıyı klinik kararınızın yerine değil, taslak olarak kullanın.",
      },
      {
        title: "Göndermeden önce son kontrol yapın",
        detail:
          "İsim, tarih, egzersiz dozu, taraf ve uyarı işaretlerini doğrulayın. Hastaya yalnızca onayladığınız metni iletin.",
      },
    ],
    actions: [{ label: "Atanmış hastaları aç", href: "/patients", primary: true }],
    note: {
      tone: "success",
      title: "Yetki sınırı",
      text: "Fizyoterapist rolü kendi atanmış hastalarını görüntüleyip klinik bilgilerini güncelleyebilir. Yeni hasta oluşturma, toplu içe aktarma, silme ve sorumlu değiştirme işlemleri admin tarafından yürütülür.",
    },
    keywords: ["fizyoterapist", "atanmış hasta", "günlük", "klinik", "takip", "sorumlu"],
  },
  {
    id: "hasta-kaydi",
    eyebrow: "Fizyoterapist",
    title: "Hasta bağlamını doğru ve faydalı tutun",
    description:
      "Hasta profilindeki alanlar, hastaya verilen yapay zekâ yanıtlarının kişiselleştirilmesinde kullanılır.",
    icon: "04",
    audience: "physiotherapist",
    duration: "4 alan",
    items: [
      {
        title: "Kısa tanıtım",
        detail:
          "Asistanın hızlıca bilmesi gereken ana tabloyu yazın: başvuru nedeni, etkilenen bölge ve bakım hedefi.",
      },
      {
        title: "Uzun detaylar",
        detail:
          "Öykü, önceki değerlendirmeler, günlük yaşam etkisi ve takipte önemli olan bağlamı açık ve tarihli biçimde ekleyin.",
      },
      {
        title: "Klinik görüş",
        detail:
          "Sizin değerlendirmenizi, dikkat edilmesi gereken durumları ve hastaya daha önce iletilmiş kısıtları kaydedin.",
        badge: "Kritik alan",
      },
      {
        title: "Egzersiz videoları",
        detail:
          "Yalnızca doğruladığınız YouTube bağlantılarını ekleyin. Video başlığının, hareketin ve hedef bölgenin doğru olduğundan emin olun.",
      },
    ],
    note: {
      tone: "warning",
      title: "Kayıt standardı",
      text: "“İyi”, “kötü” gibi belirsiz ifadeler yerine gözlenebilir bilgi kullanın. Hasta profilini bir tıbbi kayıt sistemi yerine geçecek şekilde değil, güvenli yapay zekâ bağlamı sağlayacak kadar öz ve güncel tutun.",
    },
    keywords: ["hasta profili", "klinik görüş", "uzun detay", "video", "youtube", "bağlam"],
  },
  {
    id: "klinik-komutlar",
    eyebrow: "Fizyoterapist",
    title: "Klinik işler için örnek komut şablonu",
    description:
      "Şablonu kopyalayın, köşeli parantezleri kendi ihtiyacınıza göre düzenleyin ve yanıtı mutlaka gözden geçirin.",
    icon: "05",
    audience: "physiotherapist",
    duration: "Kopyalanabilir",
    prompt:
      "Rolün: Fizyoterapist için çalışan klinik yazım asistanı.\n\nAmaç: [seans özeti / hasta bilgilendirme / literatür özeti] hazırla.\nBağlam: [kişisel verileri çıkartılmış gerekli klinik bilgiler]\nHedef kitle: [hasta / fizyoterapist / klinik ekip]\nÇıktı: [madde sayısı, ton, uzunluk ve format]\nSınırlar: Yeni tanı koyma, kesinlik içeren kanıtsız ifade kullanma, verilen bilgilerin dışına çıkma. Eksik veya çelişkili bilgi varsa belirt.",
    note: {
      tone: "info",
      title: "Web aramasıyla kullanırken",
      text: "Kaynakların yayın tarihini, çalışma türünü ve hasta grubuna uygunluğunu isteyin. Asistan özetini orijinal kaynağın yerine kullanmayın.",
    },
    keywords: ["prompt", "komut", "şablon", "seans özeti", "literatür", "hasta bilgilendirme"],
  },
  {
    id: "admin-hasta",
    eyebrow: "Admin",
    title: "Hasta hesaplarını yönetin",
    description:
      "Tekil veya toplu hasta oluşturun, sorumlu atayın, erişim bilgilerini yönetin ve kayıt yaşam döngüsünü kontrol edin.",
    icon: "03",
    audience: "admin",
    duration: "6 işlem",
    items: [
      {
        title: "Yeni hasta oluşturma",
        detail:
          "Ad, e-posta ve gerekli profil bilgilerini girin. Hastanın hesabına erişebilmesi için güçlü bir başlangıç parolası belirleyin.",
      },
      {
        title: "Sorumlu atama",
        detail:
          "Hastayı ilgili admin veya fizyoterapiste atayın. Fizyoterapistler yalnızca kendi sorumluluklarındaki hastaları görür.",
        badge: "Yetki",
      },
      {
        title: "Excel ile toplu içe aktarma",
        detail:
          "Beklenen sütun adlarını koruyun, e-posta tekrarlarını kontrol edin ve işlem sonrası başarı/başarısızlık özetini inceleyin.",
      },
      {
        title: "Dışa aktarma",
        detail:
          "Görüntülenen hasta verilerini Excel olarak alın. Dosyayı yalnızca yetkili ve güvenli bir konumda saklayın.",
      },
      {
        title: "Parola ve SMS",
        detail:
          "Gerekirse yeni parola üretip onaylı SMS başlığıyla hastaya iletin. Parolayı açık kanallarda tekrar paylaşmayın.",
      },
      {
        title: "Kayıt silme",
        detail:
          "Silme işlemini yalnızca kimlik ve kapsam doğrulamasından sonra kullanın; bu işlem hasta verilerini etkileyebilir.",
        badge: "Geri alınamaz",
      },
    ],
    actions: [{ label: "Hasta yönetimine git", href: "/patients", primary: true }],
    keywords: ["admin", "hasta ekle", "excel", "içe aktar", "dışa aktar", "sil", "sms", "parola"],
  },
  {
    id: "admin-sistem",
    eyebrow: "Admin",
    title: "Sistem ve kullanıcı ayarlarını yönetin",
    description:
      "Rolleri, yapay zekâ davranışını ve klinik genelindeki varsayılanları kontrollü biçimde değiştirin.",
    icon: "04",
    audience: "admin",
    duration: "5 kontrol",
    steps: [
      {
        title: "Kullanıcı ve rol yönetimi",
        detail:
          "Ayarlar içinden kullanıcı oluşturun; kişiye yalnızca işi için gereken admin, fizyoterapist veya kullanıcı rolünü verin.",
      },
      {
        title: "Kişisel talimatları ayırın",
        detail:
          "Temel ve ek talimatlar admin/fizyoterapistin kişisel sohbetini etkiler. Bunları klinik geneli hasta talimatıyla karıştırmayın.",
      },
      {
        title: "Genel hasta talimatını test edin",
        detail:
          "Bu alan tüm hastaları etkiler. Kısa, açık ve çelişkisiz kurallar yazın; kaydetmeden önce örnek bir hasta hesabında beklenen davranışı düşünün.",
      },
      {
        title: "Hasta modelini seçin",
        detail:
          "Tüm hastaların kullanacağı varsayılan modeli performans, yeterlilik ve maliyet dengesine göre seçin.",
      },
      {
        title: "Entegrasyon ayarlarını koruyun",
        detail:
          "API anahtarı ve SMS başlığı gibi ayarları yalnızca yetkili adminler değiştirmeli; anahtarları mesaj veya ekran görüntüsüyle paylaşmayın.",
      },
    ],
    note: {
      tone: "warning",
      title: "Değişiklik yönetimi",
      text: "Genel hasta talimatı veya model değişikliğini önce dar bir test senaryosuyla doğrulayın. Ne değiştiğini ve ne zaman uygulandığını klinik içinde kayıt altına alın.",
    },
    keywords: ["kullanıcı", "rol", "model", "api", "anahtar", "talimat", "genel hasta", "ayar"],
  },
  {
    id: "admin-rapor",
    eyebrow: "Admin",
    title: "İstatistikleri izleyin ve aksiyon alın",
    description:
      "Kullanıcı, mesaj, model ve tüketim verilerini dönem bazında takip ederek olağan dışı değişimleri inceleyin.",
    icon: "05",
    audience: "admin",
    duration: "3 kontrol",
    items: [
      {
        title: "Dönemi doğru seçin",
        detail:
          "Günlük değişimlerle toplam değerleri karıştırmayın. Karşılaştırma yaparken aynı tarih aralığını kullanın.",
      },
      {
        title: "Kullanımı yorumlayın",
        detail:
          "Mesaj hacmi veya maliyet artışında yeni kullanıcıları, model değişikliğini ve web/görsel araç kullanımını birlikte değerlendirin.",
      },
      {
        title: "Rapor alıcılarını yönetin",
        detail:
          "Günlük raporların yalnızca görev gereği erişmesi gereken kişilere gittiğini düzenli olarak doğrulayın.",
        badge: "Gizlilik",
      },
    ],
    actions: [{ label: "İstatistikleri aç", href: "/admin/stats", primary: true }],
    keywords: ["istatistik", "rapor", "kullanım", "maliyet", "mesaj", "model", "günlük rapor"],
  },
  {
    id: "guvenlik",
    eyebrow: "Her iki rol",
    title: "Güvenli ve sorumlu kullanım kontrol listesi",
    description:
      "Yapay zekâ çıktısını klinik muhakemenin yerine koymadan, kişisel veriyi ve hasta güvenliğini koruyun.",
    icon: "06",
    audience: "all",
    duration: "6 kural",
    items: [
      {
        title: "Asgari veri kullanın",
        detail:
          "Görev için gerekmeyen kimlik, iletişim veya sağlık bilgisini sohbete eklemeyin.",
      },
      {
        title: "Çıktıyı doğrulayın",
        detail:
          "Tanı, doz, taraf, tarih, kontrendikasyon ve kaynak iddialarını uzman gözüyle kontrol edin.",
      },
      {
        title: "Acil durumları yönlendirin",
        detail:
          "Acil belirti veya hızla kötüleşen durumda sohbeti bakımın yerine kullanmayın; kurumunuzun acil yönlendirme prosedürünü uygulayın.",
        badge: "Kritik",
      },
      {
        title: "Paylaşım bağlantılarını sınırlayın",
        detail:
          "Bağlantıyı yalnızca hedef kişiyle paylaşın ve erişim gereksinimi bittiğinde kapatın.",
      },
      {
        title: "Kaynakları aslıyla karşılaştırın",
        detail:
          "Web özetlerinde yayın tarihi, yazar, kurum, yöntem ve sonuçların gerçekten kaynakta bulunduğunu kontrol edin.",
      },
      {
        title: "Yetki ayrımını koruyun",
        detail:
          "Admin işlemlerini günlük fizyoterapist hesabıyla, klinik işi de gereksiz yüksek yetkili hesapla yürütmeyin.",
      },
    ],
    note: {
      tone: "warning",
      title: "Önemli",
      text: "MY FizyoAI karar destek ve üretkenlik aracıdır. Yapay zekâ yanıtları tek başına tanı, tedavi kararı, acil değerlendirme veya profesyonel klinik görüş değildir.",
    },
    keywords: ["güvenlik", "kişisel veri", "acil", "doğrulama", "kaynak", "yetki", "kvkk"],
  },
  {
    id: "sorun-giderme",
    eyebrow: "Yardım",
    title: "Sık karşılaşılan durumlar",
    description:
      "En yaygın kullanım sorunlarını hızlıca tanılayın ve güvenli bir sonraki adımı seçin.",
    icon: "07",
    audience: "all",
    duration: "5 çözüm",
    items: [
      {
        title: "Yanıt çok genel",
        detail:
          "Amacı, hedef kitleyi ve çıktı biçimini netleştirin; gerekli bağlamı kişisel verileri azaltarak ekleyin.",
      },
      {
        title: "Dosya okunmadı",
        detail:
          "Desteklenen formatı kullandığınızı, yüklemenin tamamlandığını ve mesajı dosya ekli durumdayken gönderdiğinizi kontrol edin.",
      },
      {
        title: "Web sonucu güncel görünmüyor",
        detail:
          "Web Araması modunun açık olduğunu doğrulayın; tarih aralığını ve istediğiniz kaynak türünü doğrudan yazın.",
      },
      {
        title: "Hasta listede görünmüyor",
        detail:
          "Arama filtresini temizleyin. Fizyoterapistseniz hastanın size atanmış olduğunu admin ile doğrulayın.",
      },
      {
        title: "Bir ayar beklediğiniz gibi çalışmadı",
        detail:
          "Kaydetme işlemini ve doğru ayar alanını kullandığınızı kontrol edin. Kişisel talimatlarla genel hasta talimatının kapsamı farklıdır.",
      },
    ],
    keywords: ["sorun", "çalışmıyor", "genel yanıt", "dosya", "hasta görünmüyor", "ayar"],
  },
];

function searchableText(section: GuideSection) {
  return [
    section.eyebrow,
    section.title,
    section.description,
    ...section.keywords,
    ...(section.steps?.flatMap((step) => [step.title, step.detail]) ?? []),
    ...(section.items?.flatMap((item) => [item.title, item.detail]) ?? []),
    section.note?.title ?? "",
    section.note?.text ?? "",
    section.prompt ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}

export default function AdminDocsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sessionRole = session?.user?.role;
  const [roleOverride, setRoleOverride] = useState<GuideRole | null>(null);
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["baslangic", "sohbet"])
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (
      status === "unauthenticated" ||
      (sessionRole !== "admin" && sessionRole !== "physiotherapist")
    ) {
      router.replace("/chat");
      return;
    }
  }, [status, sessionRole, router]);

  const selectedRole: GuideRole =
    roleOverride ?? (sessionRole === "admin" ? "admin" : "physiotherapist");

  const visibleSections = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return SECTIONS.filter(
      (section) =>
        (section.audience === "all" || section.audience === selectedRole) &&
        (!normalizedQuery || searchableText(section).includes(normalizedQuery))
    );
  }, [query, selectedRole]);

  function selectRole(role: GuideRole) {
    setRoleOverride(role);
    setQuery("");
    setOpenSections(new Set(["baslangic", "sohbet"]));
    document.getElementById("rehber-icerik")?.scrollIntoView({ behavior: "smooth" });
  }

  function toggleSection(id: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyPrompt(prompt: string) {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-secondary)]">
        <div
          className="h-7 w-7 animate-spin rounded-full border-2 border-transparent border-t-[var(--brand)]"
          aria-label="Kılavuz yükleniyor"
        />
      </div>
    );
  }

  if (sessionRole !== "admin" && sessionRole !== "physiotherapist") return null;

  return (
    <main className="h-full flex-1 overflow-y-auto bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
        <header className="relative overflow-hidden rounded-[28px] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 shadow-sm sm:p-9 lg:p-11">
          <div
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full opacity-10 blur-3xl"
            style={{ background: "var(--brand)" }}
          />
          <div className="relative max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
                MY FizyoAI Yardım Merkezi
              </span>
              <span className="rounded-full border border-[var(--border-primary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                Rol bazlı kullanım rehberi
              </span>
            </div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              İşinizi daha güvenli, hızlı ve düzenli yürütün.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Bu rehber; sohbet araçlarından hasta yönetimine, klinik iş akışlarından
              sistem ayarlarına kadar platformu adım adım açıklar. Rolünüzü seçin veya
              aradığınız işlemi doğrudan yazın.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2" aria-label="Rehber rolü seçimi">
              {(Object.keys(ROLE_META) as GuideRole[]).map((role) => {
                const active = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => selectRole(role)}
                    aria-pressed={active}
                    className="rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5"
                    style={{
                      borderColor: active ? "var(--brand)" : "var(--border-primary)",
                      background: active ? "var(--brand-light)" : "var(--bg-secondary)",
                      boxShadow: active ? "0 10px 24px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-base font-bold">{ROLE_META[role].label}</span>
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: active ? "var(--brand)" : "var(--bg-tertiary)",
                          color: active ? "white" : "var(--text-tertiary)",
                        }}
                      >
                        {active ? "✓" : "→"}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-[var(--text-secondary)]">
                      {ROLE_META[role].description}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-input)] px-4 py-3.5 shadow-sm focus-within:border-[var(--brand)]">
              <span className="text-[var(--text-tertiary)]" aria-hidden="true">
                ⌕
              </span>
              <span className="sr-only">Kılavuzda ara</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Örn. hasta ekleme, web araması, genel talimat..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  Temizle
                </button>
              )}
            </label>
          </div>
        </header>

        <div
          id="rehber-icerik"
          className="mt-6 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"
        >
          <aside className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 lg:sticky lg:top-5">
            <div className="px-3 pb-2 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Bu rehberde
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {visibleSections.length} konu · {ROLE_META[selectedRole].label}
              </p>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1" aria-label="Kılavuz içeriği">
              {visibleSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] lg:min-w-0"
                >
                  <span className="font-mono text-[10px] text-[var(--brand)]">
                    {section.icon}
                  </span>
                  <span className="lg:truncate">{section.title}</span>
                </a>
              ))}
            </nav>
            <div className="mt-3 hidden rounded-xl bg-[var(--bg-secondary)] p-3 lg:block">
              <p className="text-xs font-semibold">Hızlı hatırlatma</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                Yapay zekâ çıktısını kullanmadan önce klinik doğruluk, kişisel veri ve
                hedef kişi açısından kontrol edin.
              </p>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <p className="text-2xl font-bold text-[var(--brand)]">{visibleSections.length}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Göreve özel konu</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <p className="text-2xl font-bold text-[var(--brand)]">7</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Ortak güvenlik kuralı</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
                <p className="text-2xl font-bold text-[var(--brand)]">≈ 15 dk</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Temel rehber süresi</p>
              </div>
            </div>

            {visibleSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-primary)] px-6 py-14 text-center">
                <div className="text-3xl" aria-hidden="true">
                  ⌕
                </div>
                <h2 className="mt-3 text-lg font-bold">Bu aramayla eşleşen konu bulunamadı</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Daha kısa bir ifade deneyin veya rol filtresini değiştirin.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-5 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Aramayı temizle
                </button>
              </div>
            ) : (
              visibleSections.map((section) => {
                const isOpen = openSections.has(section.id) || Boolean(query);
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-5 overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${section.id}-content`}
                      className="flex w-full items-start gap-4 p-5 text-left sm:p-6"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-light)] font-mono text-xs font-bold text-[var(--brand)]">
                        {section.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
                            {section.eyebrow}
                          </span>
                          <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                            {section.duration}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-lg font-bold tracking-tight sm:text-xl">
                          {section.title}
                        </span>
                        <span className="mt-1.5 block text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
                          {section.description}
                        </span>
                      </span>
                      <span
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] transition-transform"
                        style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        id={`${section.id}-content`}
                        className="border-t border-[var(--border-secondary)] px-5 pb-6 pt-5 sm:px-6"
                      >
                        {section.steps && (
                          <ol className="space-y-5">
                            {section.steps.map((step, index) => (
                              <li key={step.title} className="flex gap-4">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[11px] font-bold text-white">
                                  {index + 1}
                                </span>
                                <div>
                                  <h3 className="text-sm font-bold">{step.title}</h3>
                                  <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)] sm:text-sm">
                                    {step.detail}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}

                        {section.items && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {section.items.map((item) => (
                              <article
                                key={item.title}
                                className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-sm font-bold">{item.title}</h3>
                                  {item.badge && (
                                    <span className="shrink-0 rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[9px] font-bold text-[var(--brand)]">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                                  {item.detail}
                                </p>
                              </article>
                            ))}
                          </div>
                        )}

                        {section.prompt && (
                          <div className="overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--code-block-bg)]">
                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Komut şablonu
                              </span>
                              <button
                                type="button"
                                onClick={() => copyPrompt(section.prompt!)}
                                className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20"
                              >
                                {copied ? "Kopyalandı ✓" : "Şablonu kopyala"}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap p-4 text-xs leading-6 text-[var(--code-block-text)]">
                              {section.prompt}
                            </pre>
                          </div>
                        )}

                        {section.note && (
                          <div
                            className="mt-5 rounded-xl border p-4"
                            style={{
                              background:
                                section.note.tone === "warning"
                                  ? "var(--warning-bg)"
                                  : section.note.tone === "success"
                                    ? "var(--success-bg)"
                                    : "var(--brand-light)",
                              borderColor:
                                section.note.tone === "warning"
                                  ? "var(--warning-text)"
                                  : section.note.tone === "success"
                                    ? "var(--success-text)"
                                    : "var(--brand)",
                            }}
                          >
                            <p
                              className="text-xs font-bold"
                              style={{
                                color:
                                  section.note.tone === "warning"
                                    ? "var(--warning-text)"
                                    : section.note.tone === "success"
                                      ? "var(--success-text)"
                                      : "var(--brand)",
                              }}
                            >
                              {section.note.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                              {section.note.text}
                            </p>
                          </div>
                        )}

                        {section.actions && (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {section.actions.map((action) => (
                              <Link
                                key={action.href}
                                href={action.href}
                                className="rounded-xl border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
                                style={{
                                  background: action.primary ? "var(--brand)" : "var(--bg-secondary)",
                                  borderColor: action.primary ? "var(--brand)" : "var(--border-primary)",
                                  color: action.primary ? "white" : "var(--text-primary)",
                                }}
                              >
                                {action.label} →
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })
            )}

            <footer className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold">Aradığınız yanıtı bulamadınız mı?</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Sorunu, bulunduğunuz ekranı ve yapmak istediğiniz işlemi not ederek
                    kurum yöneticinizle paylaşın. Parola veya API anahtarı eklemeyin.
                  </p>
                </div>
                <a
                  href="#baslangic"
                  className="shrink-0 rounded-xl border border-[var(--border-primary)] px-4 py-2 text-center text-xs font-semibold hover:bg-[var(--bg-tertiary)]"
                >
                  Başa dön ↑
                </a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
