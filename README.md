# MY FizyoAI

Mahmut Yücel Fizyoterapi Kliniği için ChatGPT benzeri yapay zeka sohbet web uygulaması.

## Özellikler

- ChatGPT benzeri arayüz
- Sohbet geçmişi, silme, yeniden adlandırma
- Otomatik sohbet başlığı üretme
- OpenAI ve Google Gemini desteği (streaming dahil)
- Görsel yükleme ve vision soru-cevap
- PostgreSQL üzerinde tüm veri saklanması
- Tek kullanıcı güvenli kimlik doğrulama (NextAuth v5)

## Kurulum

### 1. Bağımlılıkları yükleyin

```bash
npm install
```

### 2. Ortam değişkenleri

```bash
cp .env.example .env
```

| Değişken | Açıklama |
|---|---|
| DATABASE_URL | PostgreSQL bağlantı URL'si |
| AUTH_SECRET | NextAuth secret (openssl rand -base64 32) |
| ADMIN_EMAIL | Admin e-posta |
| ADMIN_PASSWORD | Admin şifre |
| OPENAI_API_KEY | OpenAI anahtarı |
| GEMINI_API_KEY | Gemini anahtarı |

### 3. Veritabanı

```bash
npx prisma migrate deploy
```

Admin kullanıcısı halihazırda oluşturulmuşsa tekrar çalıştırmaya gerek yoktur.

### 4. Başlatın

```bash
npm run dev
```

Uygulama: http://localhost:3000
Giriş: mahmut@fizyoai.com / FizyoAI2024!

## Prisma komutları

```bash
npx prisma migrate dev --name aciklama   # Yeni migration
npx prisma migrate deploy               # Production uygula
npx prisma studio                       # Veritabanı editörü
```

## Proje Yapısı

```
src/
  app/(chat)/         Chat layout ve sayfaları
  app/api/            API route'ları
  app/login/          Giriş sayfası
  ai/index.ts         AI abstraction katmanı
  ai/providers/       OpenAI + Gemini entegrasyonları
  components/chat/    Mesajlaşma UI
  components/layout/  Sidebar
  lib/config.ts       Uygulama konfigürasyonu
prisma/schema.prisma  Veritabanı şeması
```

## Production Deployment

```bash
npm run build
npm start
```

- public/uploads/ için kalıcı disk gereklidir
- NEXTAUTH_URL gerçek domain'i göstermeli
- İlerleyen süreçte S3/R2 entegrasyonu için src/app/api/upload/route.ts güncelleyin

## AI Model Ekleme

src/lib/config.ts dosyasında providers.openai.models veya providers.gemini.models dizisine yeni giriş ekleyin.

## Uyarı

Bu içerik yalnızca bilgilendirme amaçlıdır. ENABLE_DISCLAIMER=false ile devre dışı bırakılabilir.
