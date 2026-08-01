import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            &larr; Ana Sayfaya Dön
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Kullanım Koşulları</h1>
        <p className="text-gray-500 text-sm mb-8">Son güncellenme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Hizmetin Kabulü</h2>
            <p>FizioAI uygulamasını ve web sitesini kullanarak, bu Kullanım Koşullarını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz. Eğer bu koşullarla aynı fikirde değilseniz, lütfen hizmetimizi kullanmayı derhal bırakın.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Hizmetin Amacı ve Sınırları</h2>
            <p>FizioAI, fizyoterapistler ve sağlık profesyonelleri için bir asistan ve klinik yönetim aracıdır. Yapay Zeka (AI) tarafından sunulan hiçbir bilgi, kesin bir tıbbi teşhis veya tedavi tavsiyesi yerine geçmez. Sağlık profesyonelleri, uygulama tarafından üretilen içerikleri kendi mesleki bilgi, deneyim ve inisiyatifleri doğrultusunda değerlendirmekle yükümlüdür.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Kullanıcı Sorumlulukları</h2>
            <p>Uygulamayı yasalara aykırı veya yetkisiz bir amaçla kullanamazsınız. Hesabınızın ve parolanızın güvenliğinden siz sorumlusunuz. Sisteme girdiğiniz hasta verilerinin gizliliği ve geçerli veri koruma yasalarına (örn. KVKK) uyumu tamamen kullanıcının sorumluluğundadır.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Fikri Mülkiyet Hakları</h2>
            <p>Hizmetin kendisi, orijinal içeriği, özellikleri, işlevselliği, kodları, yapay zeka modelleri ve tasarımları FizioAI'ye aittir ve uluslararası telif hakkı, ticari marka, patent, ticari sır ve diğer fikri mülkiyet veya mülkiyet hakları yasaları tarafından korunmaktadır.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Hizmetin Feshi</h2>
            <p>Bu Kullanım Koşullarını ihlal ettiğinize kanaat getirmemiz durumunda, önceden haber vermeksizin hesabınızı askıya alabilir veya tamamen sonlandırabiliriz.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Sorumluluğun Sınırlandırılması</h2>
            <p>FizioAI, uygulamanın kullanımından kaynaklanabilecek doğrudan veya dolaylı maddi/manevi zararlardan, veri kayıplarından veya tıbbi hatalardan hiçbir koşulda sorumlu tutulamaz.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">İletişim</h2>
            <p>Koşullarla ilgili sorularınız için bizimle destek@fizioai.com adresinden iletişime geçebilirsiniz.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
