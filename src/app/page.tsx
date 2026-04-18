import Link from "next/link";

const faqItems = [
  {
    q: "Gaziantep fizyoterapi ve yapay zeka birlikte nasil calisir?",
    a: "Yapay zeka destekli sistem, fizyoterapi surecinde bilgilendirme, egzersiz hatirlatma ve surec takibi gibi alanlarda destek sunar.",
  },
  {
    q: "Sistem tani veya tedavi koyar mi?",
    a: "Hayir. Sistem bilgilendirme amaclidir. Tani ve tedavi kararlari sadece uzman fizyoterapist ve hekim degerlendirmesi ile verilir.",
  },
  {
    q: "Online fizyoterapi bilgilendirmesi kimler icin uygundur?",
    a: "Tedavi surecini daha duzenli takip etmek, egzersiz adimlarini net gormek ve surekli bilgi destegi almak isteyen kisiler icin uygundur.",
  },
];

export default function RootPage() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "Physiotherapy",
    name: "MY FizyoAI - Gaziantep Fizyoterapi ve Yapay Zeka",
    areaServed: "Gaziantep",
    description:
      "Gaziantep fizyoterapi ve yapay zeka odakli dijital bilgilendirme ve rehabilitasyon deneyimi.",
    url: "https://myfizyopilates.com",
    image: "https://myfizyopilates.com/myfizioteamimage.jpg",
    sameAs: ["https://myfizyopilates.com"],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-800">
          Gaziantep Fizyoterapi ve Yapay Zeka
        </p>
        <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">
          Gaziantep&apos;te fizyoterapiyi yapay zeka destekli yaklasimla birlestiren yeni nesil deneyim
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
          MY FizyoAI, hastalarin fizyoterapi surecini daha anlasilir ve takip edilebilir hale getirmek icin
          gelistirilen dijital bir platformdur. Yapay zeka destekli sohbet, egzersiz odakli bilgilendirme ve
          surec takibi ile rehabilitasyon deneyimini destekler.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            Platforma Giris
          </Link>
          <a
            href="https://myfizyopilates.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Klinik Bilgileri
          </a>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Yapay Zeka Destekli Bilgilendirme</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Hastalar, sureclerine dair sorularina daha hizli ve acik yanitlar alabilir.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Fizyoterapi Surec Takibi</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Konusma gecmisi ve duzenli icerik akisiyla rehabilitasyon adimlari takip edilebilir.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Gaziantep Odakli Yerel Yaklasim</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Gaziantep fizyoterapi ihtiyaclari icin gelistirilmis yerel ve ulasilabilir dijital deneyim.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <h2 className="text-2xl font-bold md:text-3xl">Sik Sorulan Sorular</h2>
        <div className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <article key={item.q} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold md:text-lg">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700 md:text-base">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-slate-700">
          <p>
            Bu platform bilgilendirme amaclidir. Tani ve tedavi kararlari uzman hekim ve fizyoterapist
            degerlendirmesi ile verilmelidir.
          </p>
        </div>
      </footer>
    </main>
  );
}
