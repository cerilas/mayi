import { appConfig } from "@/lib/config";

export const CLINIC_MAP_URL = "https://share.google/UNp8yFP502cNh6NNA";
export const APPOINTMENT_PICKER_TOKEN = "[[RANDEVU_SECICI]]";
/** Clinic staff who receive an SMS for every new appointment request. */
export const APPOINTMENT_NOTIFY_PHONES = ["+905456150207", "+905304492922", "+905406502727"];

/** Europe/Istanbul is fixed at UTC+3 (no DST). Key: JS weekday, 0 = Sunday. */
export const CLINIC_HOURS: Record<number, { open: number; close: number } | null> = {
  0: null,
  1: { open: 9, close: 19 },
  2: { open: 9, close: 19 },
  3: { open: 9, close: 19 },
  4: { open: 9, close: 19 },
  5: { open: 9, close: 19 },
  6: { open: 9, close: 15 },
};

export const APPOINTMENT_RULES = {
  slotMinutes: 60,
  bookingDays: 14,
  slotCapacity: 1,
  minLeadMinutes: 60,
  maxActivePerUser: 3,
};

export function withDisclaimer(text: string): string {
  return appConfig.disclaimer.enabled ? `${text}\n\n---\n*${appConfig.disclaimer.text}*` : text;
}

const HOURS_TEXT = `**Çalışma saatlerimiz**

- **Pazartesi – Cuma:** 09:00 – 19:00
- **Cumartesi:** 09:00 – 15:00
- **Pazar:** Kapalı

Randevu almak isterseniz sohbetin başındaki **Randevu al** seçeneğini kullanabilir ya da gün ve saati yazabilirsiniz.`;

const LOCATION_TEXT = `Kliniğimizin konumu Google Haritalar'da hazır. Aşağıdaki butona dokunarak yol tarifi alabilirsiniz.

[Haritada Aç](${CLINIC_MAP_URL})`;

const ABOUT_TEXT = `## KALİTELİ EKİP KALİTELİ HİZMETİ GETİRİR
**Fizyoterapist Mahmut Yücel**

Orta öğrenimimi 30 Ağustos İlköğretim Okulu'nda tamamladıktan sonra lise eğitimimi Tekereloğlu Anadolu Lisesi'nde aldım. Lisans eğitimimi ise 2016 yılında Ankara Yıldırım Beyazıt Üniversitesi'nde Fizik Tedavi ve Rehabilitasyon bölümünden mezun oldum. Mezuniyetimin ardından pediatrik rehabilitasyon alanına yönelerek meslek hayatıma başladım. Daha sonra ilerleyen süreçte yönümü ortopedik rehabilitasyon ve skolyoz alanına çevirdim. Bu süreç içerisinde cerrahlarla ortak çalışarak hastaların ameliyat öncesi, ameliyat sonrası ve ameliyatsız tedavi konularında deneyim kazandım.

Daha sonra yurt dışında çalışma kararı aldım ve İngiltere, Almanya, Güney ve Kuzey Amerika'da mesleğimi icra etme fırsatı buldum. 2019 yılında Türkiye'ye tam dönüş yaparak, yıllar içinde edindiğim bilgileri hastalarıma aktarmak amacıyla Nisan 2019'da Myfizyoterapi/Myfizyopilatesi'yi kurma kararı aldım. Multidisipliner bir yaklaşım konsepti ile hizmet verdiğimiz Myfizyopilates'e ek olarak, 2021 yılında ikinci şubemiz olan Myfizyoterapi'yi açtık. Üçüncü şubemizin Adana'da kuruluşu devam etmektedir ve yılbaşına kadar açmayı planlıyoruz. MyfizyoPilates konsepti ile Türkiye'ye en iyi tedaviyi sunmayı hedefleyen Mahmut Yücel, bekar ve iki kedi babasıdır.

MyFizyoPilates, Gaziantep fizyoterapist ekibiyle, her bireye özel tedavi yaklaşımları sunarak, sağlıklı ve konforlu bir yaşam sürmelerine yardımcı olmayı amaçlıyor. Ekibimiz, her hastanın durumu için özel bir değerlendirme yaparak, cerrahi olmayan (ameliyatsız) yöntemlerle en iyi tedavi planını oluşturur. Her tedavi sürecinde, vücudu bir bütün olarak değerlendirip, sadece lokal probleme odaklanmadan bütünsel iyileşmeyi hedefleriz.

### Ekibimizin Uzmanlık Alanları
MyFizyoPilates ekibi, farklı tedavi alanlarında uzmanlaşmış fizyoterapistlerden oluşmaktadır. Gaziantep en iyi fizyoterapist kadrosu ile sizlere en etkili ve verimli tedavi hizmetini sunuyoruz. Uzman fizyoterapistlerimiz, alanlarında yüksek eğitim almış ve tecrübeli profesyonellerdir. Ekibimizin uzmanlık alanları şunlardır:

**Fizyoterapi ve Rehabilitasyon**
Her bireyin farklı bir vücut yapısı ve sağlık geçmişi olduğunu göz önünde bulunduruyoruz. Bu sebeple, uzman fizyoterapistler Gaziantep ekibimiz, her hastaya özel olarak hazırlanan tedavi planları ile başlar. Boyun düzleşmesi, bel fıtığı, kas-iskelet sistemi rahatsızlıkları gibi geniş bir yelpazede fizyoterapi hizmetleri sunuyoruz.`;

const APPOINTMENT_TEXT = `Randevu talebi oluşturmak için aşağıdan uygun bir gün ve saat seçin. Dilerseniz "Perşembe 14:00" gibi yazarak da isteyebilirsiniz. Talebiniz kliniğimize iletilir ve sizinle iletişime geçilerek kesinleştirilir.

${APPOINTMENT_PICKER_TOKEN}`;

export function usageLimitMessage(resetAt: Date): string {
  const resetLabel = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", weekday: "long" }).format(resetAt);
  return `Bu haftaki ücretsiz soru hakkınız doldu. Hakkınız ${resetLabel} günü otomatik ve ücretsiz olarak yenilenir. Bu sürede geçmiş sohbetleriniz, randevu alma, konum ve çalışma saatleri kullanılmaya devam eder. Daha önce ihtiyacınız olursa kliniğimizle iletişime geçebilirsiniz. Uygulamada hiçbir ücretli işlem yoktur.`;
}

export type QuickActionKey = "appointment" | "location" | "hours" | "about";

export const QUICK_ACTIONS: Record<QuickActionKey, { question: string; answer: string }> = {
  appointment: { question: "Klinikten randevu almak istiyorum", answer: APPOINTMENT_TEXT },
  location: { question: "Kliniğin konumunu alabilir miyim?", answer: LOCATION_TEXT },
  hours: { question: "Kliniğin çalışma saatleri nedir?", answer: HOURS_TEXT },
  about: { question: "Mahmut Yücel kimdir?", answer: ABOUT_TEXT },
};

export function isQuickActionKey(value: unknown): value is QuickActionKey {
  return typeof value === "string" && value in QUICK_ACTIONS;
}

/** Fixed-answer intents matched on short typed messages so these questions never depend on the model. */
const TYPED_INTENTS: Array<{ key: Exclude<QuickActionKey, "appointment">; pattern: RegExp }> = [
  { key: "about", pattern: /mahmut\s*y[üu]cel.*(kim|hakk[ıi]nda|tan[ıi]t)|(kim|nedir).*mahmut\s*y[üu]cel/i },
  { key: "hours", pattern: /(çal[ıi]şma|a[çc][ıi]l[ıi]ş|kapan[ıi]ş|mesai)\s*saat|ka[çc]a?\s*kadar\s*a[çc][ıi]k|saat\s*ka[çc]ta\s*(a[çc]|kapan)|hangi\s*g[üu]nler\s*a[çc][ıi]k/i },
  { key: "location", pattern: /(konum|adres|yol\s*tarif|harita|nerede(siniz)?|nas[ıi]l\s*gelir)/i },
];

export function matchTypedIntent(text: string): Exclude<QuickActionKey, "appointment"> | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return TYPED_INTENTS.find((intent) => intent.pattern.test(trimmed))?.key ?? null;
}

export function clinicFactsForAI(appointmentToolsEnabled: boolean): string {
  const booking = appointmentToolsEnabled
    ? `Kullanıcı gün ve saat verdiğinde önce check_appointment_slots ile uygunluğu kontrol et, ardından create_appointment ile talebi oluştur. Aracın sonucunu aynen bildir; araç success: true dönmedikçe randevunun alındığını asla söyleme. Saat doluysa aynı gün için uygun saatleri öner.`
    : `Bu sohbette randevuyu sen oluşturamazsın; kullanıcıyı aşağıdaki seçiciye yönlendir.`;
  return `Klinik bilgileri (bunlar kesindir, değiştirme):
- Çalışma saatleri: Pazartesi–Cuma 09:00–19:00, Cumartesi 09:00–15:00, Pazar kapalı. Randevular tam saatlerde, 1 saatliktir.
- Konum: [Haritada Aç](${CLINIC_MAP_URL})
- Randevu: ${booking} Kullanıcı randevu isteyip gün veya saat belirtmediyse kısa bir cümle yaz ve yanıtının en sonuna ayrı bir satır olarak ${APPOINTMENT_PICKER_TOKEN} ekle; uygulama bunu gün/saat seçiciye çevirir. Bu işareti başka hiçbir durumda yazma.`;
}
