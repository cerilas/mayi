"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import MagicRings from "@/components/ui/MagicRings";
import ProfileCard from "@/components/ui/ProfileCard";
import CardNav from "@/components/ui/CardNav";
import ShinyText from "@/components/ui/ShinyText";

// Minimal SVG icon renderer
const Icon = ({ path, size = 22, color = "currentColor" }: { path: string | string[]; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(path) ? path.map((d, i) => <path key={i} d={d} />) : <path d={path} />}
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("E-posta veya şifre hatalı.");
    } else {
      router.push("/chat");
    }
  }

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToLogin = () => scrollToSection("login-section");

  const navItems = [
    {
      label: "Neden Myfizyoterapi?",
      bgColor: "rgba(27, 23, 34, 0.85)",
      textColor: "#fff",
      links: [
        { label: "1-3-5 Kuralı", href: "#kural-135", ariaLabel: "1-3-5 Kuralı" },
        { label: "Standart Dışı Takip", href: "#hasta-takip", ariaLabel: "Hasta Takibi" },
        { label: "WhatsApp Destek", href: "#whatsapp", ariaLabel: "WhatsApp Destek Hattı" },
      ],
    },
    {
      label: "Özellikler",
      bgColor: "rgba(47, 41, 58, 0.85)",
      textColor: "#fff",
      links: [
        { label: "Yapay Zeka", href: "#yapay-zeka", ariaLabel: "Yapay Zeka" },
        { label: "Tedavi Cihazı", href: "#tedavi-cihazi", ariaLabel: "Tedavi Cihazı" },
        { label: "7/24 Asistan", href: "#asistan", ariaLabel: "7/24 Asistan" },
        { label: "Egzersiz Planı", href: "#egzersiz", ariaLabel: "Egzersiz Planlaması" },
      ],
    },
    {
      label: "Giriş Yap",
      bgColor: "rgba(210, 34, 103, 0.2)",
      textColor: "#fff",
      links: [
        { label: "Hesabıma Giriş", href: "#login-section", ariaLabel: "Giriş Yap" },
      ],
    },
  ];

  const features = [
    {
      id: "kural-135",
      iconPath: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
      title: "1-3-5 Kuralı",
      subtitle: "Tedavide Yeni Standart",
      desc: "İlk seansta temel değerlendirme, 3. seansta ara kontrol, 5. seansta hedef revizyonu. Bilimsel temelli bu yapı sayesinde her hastanın ilerlemesi ölçülür ve tedavi planı dinamik olarak güncellenir.",
      color: "#d22267",
      gradient: "linear-gradient(135deg, rgba(210,34,103,0.12), rgba(210,34,103,0.02))",
      border: "rgba(210,34,103,0.2)",
    },
    {
      id: "hasta-takip",
      iconPath: ["M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"],
      title: "Standart Dışı Hasta Takibi",
      subtitle: "Her Hasta Biriciktir",
      desc: "Geleneksel klinik takibinin ötesinde; semptom günlüğü, aktivite skoru ve iyileşme eğrisi ile her hastanın süreci bireysel olarak izlenir. Veri odaklı karar alma ile daha hızlı ve kalıcı sonuçlar.",
      color: "#3caade",
      gradient: "linear-gradient(135deg, rgba(60,170,222,0.12), rgba(60,170,222,0.02))",
      border: "rgba(60,170,222,0.2)",
    },
    {
      id: "whatsapp",
      iconPath: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      title: "WhatsApp Destek Hattı",
      subtitle: "Her An Yanınızda",
      desc: "Seans aralarında sorunuz mu var? Anlık semptom değişimi mi yaşıyorsunuz? WhatsApp destek hattı ile fizyoterapistinize doğrudan ulaşın. Sorularınız 24 saat içinde yanıtlanır.",
      color: "#25d366",
      gradient: "linear-gradient(135deg, rgba(37,211,102,0.12), rgba(37,211,102,0.02))",
      border: "rgba(37,211,102,0.2)",
    },
    {
      id: "yapay-zeka",
      iconPath: ["M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"],
      title: "Yapay Zeka",
      subtitle: "Klinik Zeka, Dijital Güç",
      desc: "Google Gemini altyapılı yapay zeka motoru; hasta geçmişini, semptomları ve tedavi yanıtını analiz ederek fizyoterapistlere akıllı öneriler sunar. Daha iyi kararlar, daha hızlı iyileşme.",
      color: "#7b2ff7",
      gradient: "linear-gradient(135deg, rgba(123,47,247,0.12), rgba(123,47,247,0.02))",
      border: "rgba(123,47,247,0.2)",
    },
    {
      id: "tedavi-cihazi",
      iconPath: ["M13 10V3L4 14h7v7l9-11h-7z"],
      title: "Myfizyoterapi Tedavi Cihazı",
      subtitle: "Teknoloji ile Sağlık Buluşuyor",
      desc: "Kliniğimize özel geliştirilen tedavi cihazı; TENS, ultrason ve manuel terapi protokollerini dijital sistemle entegre eder. Her seans otomatik olarak kayıt altına alınır ve analiz edilir.",
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))",
      border: "rgba(245,158,11,0.2)",
    },
    {
      id: "asistan",
      iconPath: ["M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"],
      title: "Yapay Zekalı Hasta Asistanı 7/24",
      subtitle: "Uyumayan Asistanınız",
      desc: "Gece yarısı ağrı mı başladı? Egzersizi doğru mu yapıyorsunuz? Kişisel yapay zeka asistanınız günün her saati soruları yanıtlar, egzersiz hatırlatmaları yapar ve ilerlemenizi takip eder.",
      color: "#3caade",
      gradient: "linear-gradient(135deg, rgba(60,170,222,0.12), rgba(60,170,222,0.02))",
      border: "rgba(60,170,222,0.2)",
    },
    {
      id: "egzersiz",
      iconPath: ["M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"],
      title: "Kişiye Özel Videolu Egzersiz Planlaması",
      subtitle: "Evde Doğru Egzersiz",
      desc: "Her hasta için özel hazırlanan video egzersiz kütüphanesi. Hangi hareketi, kaç tekrar, ne zaman yapacağınızı adım adım gösteren kişisel video rehberiniz her an cebinizde.",
      color: "#d22267",
      gradient: "linear-gradient(135deg, rgba(210,34,103,0.12), rgba(210,34,103,0.02))",
      border: "rgba(210,34,103,0.2)",
    },
    {
      id: "kisisel-tedavi",
      iconPath: ["M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"],
      title: "Kişiye Özel Tedavi",
      subtitle: "Şablona Değil, Size Uygun",
      desc: "Standart protokoller yerine; yaşınız, yaşam biçiminiz, hedefleriniz ve vücut yanıtınıza göre özelleştirilmiş tedavi planı. Myfizyoterapi'de her tedavi tek ve biriciktir.",
      color: "#7b2ff7",
      gradient: "linear-gradient(135deg, rgba(123,47,247,0.12), rgba(123,47,247,0.02))",
      border: "rgba(123,47,247,0.2)",
    },
  ];

  return (
    <div style={{ background: "#07090f", minHeight: "100vh" }}>
      {/* FIXED NAV */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100 }}>
        <CardNav
          logo="/my-logo.png"
          logoAlt="MY FizyoAI"
          items={navItems}
          baseColor="rgba(7, 9, 15, 0.75)"
          menuColor="#fff"
          buttonBgColor="rgba(210, 34, 103, 0.85)"
          buttonTextColor="#fff"
          buttonLabel="Giriş Yap"
          onButtonClick={scrollToLogin}
        />
      </div>

      {/* HERO */}
      <section style={{ position: "relative", height: "100vh", overflow: "hidden", background: "#07090f" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img src="/myfizioteamimage.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #07090f 0%, rgba(7,9,15,0.5) 50%, #07090f 100%)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <MagicRings color="#d22267" colorTwo="#3caade" ringCount={6} speed={1} attenuation={10} lineThickness={2} baseRadius={0.2} radiusStep={0.07} scaleRate={0.1} opacity={0.9} blur={0} noiseAmount={0.06} rotation={0} ringGap={1.5} fadeIn={0.7} fadeOut={0.5} followMouse={false} mouseInfluence={0.2} hoverScale={1.2} parallax={0.05} clickBurst={false} />
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, textAlign: "center", padding: "0 1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(210,34,103,0.15)", border: "1px solid rgba(210,34,103,0.3)", borderRadius: "999px", padding: "0.35rem 1rem", marginBottom: "1.5rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d22267", display: "inline-block", boxShadow: "0 0 8px #d22267", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>Fizyoterapide Yeni Devrim</span>
          </div>
          <h1 style={{ margin: 0, lineHeight: 1.1 }}>
            <span style={{ display: "block", fontSize: "clamp(2.5rem, 8vw, 5rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
              <ShinyText text="MY Fizyo AI" speed={2} color="#ffffff" shineColor="#ffffff" spread={120} direction="left" />
            </span>
            <span style={{ display: "block", fontSize: "clamp(1.5rem, 5vw, 2.5rem)", fontWeight: 300, color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>
              <ShinyText text="Yapay Zeka Platformu" speed={3} delay={0.5} color="#b5b5b5" shineColor="#ffffff" spread={120} direction="left" />
            </span>
          </h1>
          <p style={{ marginTop: "1.5rem", maxWidth: "520px", color: "rgba(255,255,255,0.45)", fontSize: "clamp(0.9rem, 2vw, 1.05rem)", lineHeight: 1.7 }}>
            Fizyoterapide yapay zekanın gücüyle kişiye özel, veri odaklı, akıllı sağlık deneyimi.
          </p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={scrollToLogin}
              style={{ padding: "0.75rem 2rem", background: "linear-gradient(135deg, #d22267, #3caade)", border: "none", borderRadius: "999px", color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 0 30px rgba(210,34,103,0.4)" }}
            >
              Hemen Başla
            </button>
            <button
              onClick={() => scrollToSection("neden-my")}
              style={{ padding: "0.75rem 2rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "999px", color: "#fff", fontWeight: 500, fontSize: "0.95rem", cursor: "pointer" }}
            >
              Keşfet
            </button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          <svg style={{ width: 24, height: 24, color: "rgba(255,255,255,0.3)", animation: "bounce 2s infinite" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* NEDEN MYFIZYOTERAPI */}
      <section id="neden-my" style={{ padding: "8rem 1.5rem", position: "relative", background: "#07090f", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(210,34,103,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1.2rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "2rem", marginBottom: "2rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d22267", boxShadow: "0 0 12px #d22267", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "0.75rem", color: "#fff", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>Neden Myfizyoterapi?</span>
          </div>

          <h2 style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 800, color: "#fff", margin: "0 0 1.5rem", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Fizyoterapinin <br className="hidden md:block" />
            <span style={{ background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.3) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Yeni Devrimi</span>
          </h2>

          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem", lineHeight: 1.8, maxWidth: "680px", margin: "0 auto 4rem" }}>
            Myfizyoterapi, geleneksel kliniği yapay zeka gücüyle birleştirerek her hastaya standart dışı, kişisel ve ölçülebilir bir tedavi deneyimi sunar. Artık veriler konuşur, sonuçlar görünür.
          </p>

          <div className="bento-grid-container" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem", textAlign: "left" }}>

            {/* Card 1: Bilimsel Protokol (Span 8) */}
            <div className="bento-card" data-col="8">
              <div className="bento-content" style={{ background: "linear-gradient(145deg, rgba(210,34,103,0.1) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(210,34,103,0.2)" }}>
                <div className="bento-bg-icon">
                  <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={160} color="rgba(210,34,103,0.05)" />
                </div>
                <div className="bento-header">
                  <div className="bento-icon-wrapper" style={{ background: "rgba(210,34,103,0.15)", color: "#d22267" }}>
                    <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={24} />
                  </div>
                  <div className="bento-badge" style={{ color: "#d22267", border: "1px solid rgba(210,34,103,0.3)" }}>Kanıta Dayalı</div>
                </div>
                <h3 className="bento-title">Bilimsel Protokol</h3>
                <p className="bento-desc">İlk seansta temel değerlendirme, 3. seansta ara kontrol, 5. seansta hedef revizyonu. Bilimsel temelli bu yapı sayesinde her hastanın ilerlemesi ölçülür ve tedavi planı dinamik olarak güncellenir.</p>
              </div>
            </div>

            {/* Card 2: Veri Odaklı (Span 4) */}
            <div className="bento-card" data-col="4">
              <div className="bento-content" style={{ background: "linear-gradient(145deg, rgba(60,170,222,0.1) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(60,170,222,0.2)" }}>
                <div className="bento-bg-icon">
                  <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={160} color="rgba(60,170,222,0.05)" />
                </div>
                <div className="bento-header">
                  <div className="bento-icon-wrapper" style={{ background: "rgba(60,170,222,0.15)", color: "#3caade" }}>
                    <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={24} />
                  </div>
                </div>
                <h3 className="bento-title">Veri Odaklı</h3>
                <p className="bento-desc">Her seans kayıt altına alınır, analiz edilir ve ölçülebilir sonuçlar üretilir.</p>
              </div>
            </div>

            {/* Card 3: Akıllı Sistem (Span 4) */}
            <div className="bento-card" data-col="4">
              <div className="bento-content" style={{ background: "linear-gradient(145deg, rgba(123,47,247,0.1) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(123,47,247,0.2)" }}>
                <div className="bento-bg-icon">
                  <Icon path={["M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"]} size={160} color="rgba(123,47,247,0.05)" />
                </div>
                <div className="bento-header">
                  <div className="bento-icon-wrapper" style={{ background: "rgba(123,47,247,0.15)", color: "#7b2ff7" }}>
                    <Icon path={["M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"]} size={24} />
                  </div>
                </div>
                <h3 className="bento-title">Akıllı Sistem</h3>
                <p className="bento-desc">Yapay zeka destekli klinik karar desteği ve hasta asistanı.</p>
              </div>
            </div>

            {/* Card 4: Kişiye Özel (Span 8) */}
            <div className="bento-card" data-col="8">
              <div className="bento-content" style={{ background: "linear-gradient(145deg, rgba(37,211,102,0.1) 0%, rgba(255,255,255,0.02) 100%)", borderColor: "rgba(37,211,102,0.2)" }}>
                <div className="bento-bg-icon">
                  <Icon path="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" size={160} color="rgba(37,211,102,0.05)" />
                </div>
                <div className="bento-header">
                  <div className="bento-icon-wrapper" style={{ background: "rgba(37,211,102,0.15)", color: "#25d366" }}>
                    <Icon path="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" size={24} />
                  </div>
                  <div className="bento-badge" style={{ color: "#25d366", border: "1px solid rgba(37,211,102,0.3)" }}>Size Özel</div>
                </div>
                <h3 className="bento-title">Kişiye Özel</h3>
                <p className="bento-desc">Standart şablonlar yerine; yaşınız, yaşam biçiminiz, hedefleriniz ve vücut yanıtınıza göre tamamen size özelleştirilmiş tedavi planı. Her tedavi eşsizdir.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section style={{ padding: "4rem 1.5rem 6rem", background: "#07090f" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
              <span style={{ display: "block", textDecoration: "line-through", color: "rgba(255,255,255,0.25)", fontSize: "0.55em", fontWeight: 400, letterSpacing: "0.05em", marginBottom: "0.3rem" }}>Fizyoterapi</span>
              <span>MY<span style={{ background: "linear-gradient(90deg, #d22267, #3caade)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Fizyoterapi</span></span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {features.map((f) => (
              <div
                key={f.id}
                id={f.id}
                style={{ background: f.gradient, border: `1px solid ${f.border}`, borderRadius: "1.25rem", padding: "1.75rem", transition: "transform 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ width: 44, height: 44, borderRadius: "0.75rem", background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                  <Icon path={f.iconPath} size={22} color={f.color} />
                </div>
                <div style={{ fontSize: "0.7rem", color: f.color, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "0.4rem" }}>{f.subtitle}</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "0 0 0.75rem" }}>{f.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOGIN SECTION */}
      <section id="login-section" style={{ padding: "6rem 1.5rem", background: "linear-gradient(to bottom, #07090f, #0a1128)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 800, color: "#fff", margin: "0 0 0.75rem" }}>Platforma Giriş Yapın</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", margin: 0 }}>Klinik hesabınızla devam edin</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "center", justifyContent: "center" }}>
            <ProfileCard
              name="Mahmut Yücel"
              title="Fizyoterapist"
              handle="mahmut_yucel"
              status="Online"
              contactText="İletişim"
              avatarUrl="/mahmutyucel.jpg"
              showUserInfo={true}
              enableTilt={true}
              enableMobileTilt={false}
              behindGlowColor="rgba(210, 34, 103, 0.5)"
              behindGlowEnabled
              innerGradient="linear-gradient(145deg, #0a112888 0%, #d2226633 50%, #3caade33 100%)"
              onContactClick={() => window.open("https://myfizyopilates.com", "_blank", "noopener,noreferrer")}
            />
            <div style={{ position: "relative", width: "345px" }}>
              <div style={{ position: "absolute", inset: -1, borderRadius: "30px", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, animation: "spin 4s linear infinite", transformOrigin: "center", background: "conic-gradient(from 0deg, #d22267, #3caade, #7b2ff7, #d22267)", width: "150%", height: "150%", left: "-25%", top: "-25%" }} />
              </div>
              <div style={{ position: "relative", background: "rgba(15, 22, 41, 0.95)", backdropFilter: "blur(20px)", borderRadius: "30px", padding: "2rem", border: "1px solid rgba(255,255,255,0.08)", zIndex: 1 }}>
                <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", margin: "0 0 0.25rem" }}>Hesabınıza giriş yapın</h3>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>Devam etmek için bilgilerinizi girin</p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>E-posta</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="ornek@email.com"
                      style={{ width: "100%", padding: "0.625rem 0.75rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#fff", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Şifre</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••"
                      style={{ width: "100%", padding: "0.625rem 0.75rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#fff", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  {error && <p style={{ fontSize: "0.875rem", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.75rem", padding: "0.5rem 0.75rem", margin: 0 }}>{error}</p>}
                  <button type="submit" disabled={loading}
                    style={{ padding: "0.625rem 1rem", background: "linear-gradient(135deg, #d22267, #3caade)", border: "none", borderRadius: "0.75rem", color: "#fff", fontWeight: 700, fontSize: "0.875rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </button>
                  <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>Giriş bilgilerinizi kurumunuzdan veya sistem yöneticinizden alınız.</p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "2rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#07090f" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", lineHeight: 1.8 }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, marginBottom: "0.5rem" }}>Bilgilendirme</p>
          <p style={{ margin: "0 0 0.5rem" }}>Bu site sağlık hizmeti vermemektedir, kişileri bilgilendirmek ve site sahibi hakkında bilgi vermek amacı ile hazırlanmıştır.</p>
          <p style={{ margin: "0 0 0.5rem" }}>Tanı ve tedaviler mutlaka bir hekim tarafından yapılması gereken işlemlerdir.</p>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.2)" }}>Copyright 2026 My FizyoPilates - Tüm Hakları Saklıdır</p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(6px)} }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        
        .bento-card {
          grid-column: span 12;
          perspective: 1000px;
        }
        @media (min-width: 768px) {
          .bento-card[data-col="8"] { grid-column: span 8; }
          .bento-card[data-col="4"] { grid-column: span 4; }
        }
        .bento-content {
          position: relative;
          height: 100%;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1.5rem;
          padding: 2.5rem;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          background-color: rgba(255,255,255,0.02);
        }
        .bento-card:hover .bento-content {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.2) !important;
        }
        .bento-bg-icon {
          position: absolute;
          right: -20px;
          bottom: -20px;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 0;
          pointer-events: none;
        }
        .bento-card:hover .bento-bg-icon {
          transform: scale(1.2) rotate(-10deg);
        }
        .bento-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }
        .bento-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }
        .bento-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.4rem 1rem;
          border-radius: 2rem;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .bento-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 1rem 0;
          position: relative;
          z-index: 1;
          letter-spacing: -0.02em;
        }
        .bento-desc {
          color: rgba(255,255,255,0.5);
          font-size: 1.05rem;
          line-height: 1.7;
          margin: 0;
          position: relative;
          z-index: 1;
          transition: color 0.3s;
        }
        .bento-card:hover .bento-desc {
          color: rgba(255,255,255,0.7);
        }
      `}</style>
    </div>
  );
}
