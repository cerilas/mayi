"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import MagicRings from "@/components/ui/MagicRings";
import ProfileCard from "@/components/ui/ProfileCard";
import CardNav from "@/components/ui/CardNav";
import ShinyText from "@/components/ui/ShinyText";

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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-posta veya şifre hatalı.");
    } else {
      router.push("/chat");
    }
  }

  const scrollToLogin = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const secondSection = container.children[1] as HTMLElement;
      if (secondSection) {
        secondSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const navItems = [
    {
      label: "Hakkımızda",
      bgColor: "rgba(27, 23, 34, 0.85)",
      textColor: "#fff",
      links: [
        { label: "Klinik", href: "https://myfizyopilates.com", ariaLabel: "Klinik Hakkında" },
        { label: "Ekibimiz", href: "https://myfizyopilates.com", ariaLabel: "Ekibimiz" },
      ],
    },
    {
      label: "Hizmetler",
      bgColor: "rgba(47, 41, 58, 0.85)",
      textColor: "#fff",
      links: [
        { label: "Fizyoterapi", href: "https://myfizyopilates.com", ariaLabel: "Fizyoterapi Hizmetleri" },
        { label: "Rehabilitasyon", href: "https://myfizyopilates.com", ariaLabel: "Rehabilitasyon" },
      ],
    },
    {
      label: "İletişim",
      bgColor: "rgba(47, 41, 58, 0.85)",
      textColor: "#fff",
      links: [
        { label: "Telefon", href: "https://myfizyopilates.com", ariaLabel: "Telefon" },
        { label: "Instagram", href: "https://myfizyopilates.com", ariaLabel: "Instagram" },
        { label: "Konum", href: "https://myfizyopilates.com", ariaLabel: "Konum" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative h-screen overflow-hidden bg-[#0a1128]">
        {/* CardNav menü — fixed, her zaman üstte */}
        <CardNav
          logo="/my-logo.png"
          logoAlt="MY FizyoAI"
          items={navItems}
          baseColor="rgba(10, 17, 40, 0.45)"
          menuColor="#fff"
          buttonBgColor="rgba(210, 34, 103, 0.6)"
          buttonTextColor="#fff"
          buttonLabel="Giriş Yap"
          onButtonClick={scrollToLogin}
        />

        <div ref={scrollContainerRef} className="h-full overflow-y-auto" style={{ scrollBehavior: 'auto', overscrollBehavior: 'contain', isolation: 'isolate' }}>
          <div className="relative h-screen flex flex-col px-6 text-center overflow-hidden will-change-transform" style={{ contain: 'layout style' }}>
            {/* Arka plan görseli — %30 görünürlük */}
            <div className="absolute inset-0">
              <img src="/myfizioteamimage.jpg" alt="" className="w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-[#0a1128]/70" />
            </div>
            {/* MagicRings arka plan — tam ekran */}
            <div className="absolute inset-0 pointer-events-none">
              <MagicRings
                  color="#d22267"
                  colorTwo="#3caade"
                  ringCount={6}
                  speed={1}
                  attenuation={10}
                  lineThickness={2}
                  baseRadius={0.2}
                  radiusStep={0.07}
                  scaleRate={0.1}
                  opacity={0.9}
                  blur={0}
                  noiseAmount={0.06}
                  rotation={0}
                  ringGap={1.5}
                  fadeIn={0.7}
                  fadeOut={0.5}
                  followMouse={false}
                  mouseInfluence={0.2}
                  hoverScale={1.2}
                  parallax={0.05}
                  clickBurst={false}
              />
            </div>

            {/* Başlık — tam ekran ortası */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
              <h1 className="text-2xl md:text-3xl tracking-wide drop-shadow-lg text-center leading-relaxed">
                <span className="font-thin"><ShinyText text="MY Fizio AI" speed={2} color="#b5b5b5" shineColor="#ffffff" spread={120} direction="left" /></span>
                <br />
                <span className="font-black text-3xl md:text-5xl"><ShinyText text="Yapay Zeka" speed={3} delay={0.5} color="#b5b5b5" shineColor="#ffffff" spread={120} direction="left" /></span>
                <br />
                <span className="font-thin"><ShinyText text="Platformu" speed={3} delay={1} color="#b5b5b5" shineColor="#ffffff" spread={120} direction="left" /></span>
              </h1>
            </div>

            {/* Alt kısım — kaydırma ikonu */}
            <div className="relative z-10 mt-auto pb-10 flex flex-col items-center">
              <svg className="w-6 h-6 animate-bounce text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="min-h-screen flex flex-col justify-between px-4 py-8 will-change-transform" style={{ contain: 'layout style' }}>
            <div className="flex-1 flex items-center justify-center pb-8 md:pb-10">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                {/* Profil Kartı */}
                <div>
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
                </div>

                {/* Giriş Formu — Apple glow */}
                <div className="flex items-center justify-center">
                  <div className="relative w-[345px] h-[480px] group">
                    {/* Animated glow border */}
                    <div className="absolute -inset-[1px] rounded-[30px] overflow-hidden">
                      <div className="absolute inset-0 animate-[spin_4s_linear_infinite] origin-center"
                        style={{
                          background: 'conic-gradient(from 0deg, #d22267, #3caade, #7b2ff7, #d22267)',
                          width: '150%',
                          height: '150%',
                          left: '-25%',
                          top: '-25%',
                          willChange: 'transform',
                        }}
                      />
                    </div>
                    {/* Inner card */}
                    <div className="relative w-full h-full bg-[#0f1629]/95 backdrop-blur-xl rounded-[30px] p-8 flex flex-col justify-center border border-white/[0.08] z-10">
                      <div className="text-center mb-6">
                        <h2 className="text-lg font-semibold text-white">Hesabınıza giriş yapın</h2>
                        <p className="text-xs text-white/40 mt-1">Devam etmek için bilgilerinizi girin</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white/60 mb-1">
                            E-posta
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#3caade]/50 focus:ring-1 focus:ring-[#3caade]/30 transition-colors"
                            placeholder="ornek@email.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/60 mb-1">
                            Şifre
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#3caade]/50 focus:ring-1 focus:ring-[#3caade]/30 transition-colors"
                            placeholder="••••••••"
                          />
                        </div>

                        {error && (
                          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                            {error}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2.5 px-4 bg-gradient-to-r from-[#d22267] to-[#3caade] hover:from-[#e02a73] hover:to-[#4db8e8] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#d22267]/20"
                        >
                          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                        </button>

                        <p className="text-center text-xs text-white/30 pt-1">
                          Giriş bilgilerinizi kurumunuzdan veya sistem yöneticinizden alınız.
                        </p>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="relative z-10 mt-6 md:mt-8 mb-8 max-w-5xl mx-auto w-full rounded-2xl border border-white/10 bg-[#0f1629]/70 backdrop-blur-md px-5 py-4 text-white/80 text-xs md:text-sm leading-relaxed">
              <p className="text-white font-semibold mb-2">Bilgilendirme</p>
              <p>
                Bu site sağlık hizmeti vermemektedir, kişileri bilgilendirmek ve site sahibi hakkında bilgi vermek amacı ile hazırlanmıştır. Sitedeki bilgiler hastalıkların tanı veya tedavisinde kullanılmak üzere verilmemiştir.
              </p>
              <p className="mt-2">
                Tanı ve tedaviler mutlaka bir hekim tarafından yapılması gereken işlemlerdir. Site içeriğinin bir şekilde tanı ve tedavi amacıyla kullanımından doğacak sorumluluk ziyaretçiye aittir.
              </p>
              <p className="mt-3 text-white/60">
                Copyright 2026 My FizyoPilates - Tüm Hakları Saklıdır
              </p>
            </footer>
          </div>
        </div>

      </section>
    </div>
  );
}
