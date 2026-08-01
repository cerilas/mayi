import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-sm">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            &larr; Ana Sayfaya Dön
          </Link>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Kullanıcı Sözleşmesi ve Kullanım Koşulları</h1>
        <p className="text-gray-500 text-sm mb-12">Son güncellenme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Taraflar ve Hizmetin Tanımı</h2>
            <p>İşbu Kullanıcı Sözleşmesi ("Sözleşme"), FizioAI platformunu (web sitesi ve mobil uygulamalar) ("Hizmet") sunan şirketimiz ile platforma erişim sağlayan, üye olan veya platformu herhangi bir şekilde kullanan kişi veya kurum ("Kullanıcı") arasında akdedilmiştir. Uygulamayı kullanmaya başlayarak veya üye olarak bu sözleşmenin tamamını okuduğunuzu, içeriğini anladığınızı ve belirtilen tüm şartları gayrikabili rücu kabul ettiğinizi beyan edersiniz.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Kayıt, Hesap Güvenliği ve Kullanıcı Sorumlulukları</h2>
            <p className="mb-3">Platforma üye olurken güncel, doğru ve eksiksiz bilgi vermekle yükümlüsünüz. Hesabınızın güvenliği tamamen sizin sorumluluğunuzdadır.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Hesap şifrenizin veya giriş bilgilerinizin üçüncü şahıslarla paylaşılmasından doğacak her türlü hukuki, cezai ve idari sorumluluk tarafınıza aittir.</li>
              <li>Platformda kullanıcı adı veya klinik profiliniz altında gerçekleşen tüm faaliyetler sizin tarafınızdan yapılmış kabul edilir.</li>
              <li>Yetkisiz bir erişim fark ettiğinizde bunu derhal FizioAI destek ekibine bildirmekle yükümlüsünüz.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Hizmetin Kullanım Amacı ve Tıbbi Tavsiye Olmama Durumu (Feragatname)</h2>
            <p>FizioAI, fizyoterapistler, doktorlar ve diğer sağlık profesyonelleri için bir klinik süreç yönetimi, asistanlık ve veri takip aracıdır. <strong>Uygulama hiçbir şekilde profesyonel bir tıbbi tavsiye, kesin teşhis veya tıbbi tedavi planlaması niteliği taşımaz.</strong></p>
            <p className="mt-2">Platform içerisindeki Yapay Zeka (AI) asistanının verdiği yanıtlar, literatür verileri baz alınarak oluşturulan yönlendirme amaçlı asistan görüşleridir. Nihai klinik karar ve sorumluluk her zaman işlemi gerçekleştiren sağlık profesyoneline (Kullanıcıya) aittir. FizioAI, sistem tarafından önerilen bir tedavinin, analizin veya egzersizin doğrudan hastaya uygulanmasından doğabilecek tıbbi hata veya malpraktis durumlarından hiçbir koşulda sorumlu tutulamaz.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Uygulama İçi İçerikler ve Fikri Mülkiyet Hakları</h2>
            <p>FizioAI platformunda yer alan tüm tasarımlar, metinler, grafikler, yapay zeka entegrasyon kodları, algoritmalar, logolar ve diğer görsel/işitsel bileşenlerin her türlü fikri ve sınai mülkiyet hakkı tarafımıza aittir.</p>
            <p className="mt-2">Kullanıcılar, sistemi sadece belirlenen kullanım amacı dahilinde kullanabilir. Sistemdeki kaynak kodlarını tersine mühendisliğe (reverse engineering) tabi tutmak, uygulamayı kopyalamak, çoğaltmak veya şirketin yazılı izni olmadan üçüncü şahıslara satmak/kiralamak kesinlikle yasaktır.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Yapay Zeka (AI) Kullanımı ve Limitasyonları</h2>
            <p>Uygulamamız, büyük dil modelleri ve makine öğrenimi mimarileri kullanarak asistanlık hizmeti sağlamaktadır. Yapay zekanın "halüsinasyon" (gerçek dışı ancak doğruymuş gibi görünen bilgi) üretme ihtimali her zaman mevcuttur. Kullanıcılar, yapay zekadan aldıkları sonuçları kendi mesleki filtrelerinden geçirmek ve literatür doğrulamasını yapmak zorundadır. FizioAI yönetimi, yapay zeka tarafından oluşturulan içeriklerin mutlak doğruluğunu ve eksiksizliğini garanti etmez.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Veri Girişi ve KVKK Uyumluluğu</h2>
            <p>Kullanıcı (Sağlık Profesyoneli), sisteme girdiği tüm hastalarına ait kişisel ve sağlık verilerinden hukuken sorumludur. Kullanıcı, hastalarından KVKK/GDPR kapsamında gerekli açık rıza ve aydınlatma onamlarını aldığını peşinen kabul ve taahhüt eder. FizioAI sadece bir veri işleyen (Data Processor) veya yer sağlayıcı konumunda olup, eksik onam kaynaklı ihlallerde sorumluluk doğrudan Kullanıcı'ya rücu edilir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Hizmetin Askıya Alınması veya Feshi</h2>
            <p>FizioAI, platformun güvenliğini tehdit eden, yasa dışı işlem yapan, sisteme zarar veren, bu Kullanım Koşulları'nı ihlal eden veya uygulamanın marka değerine zarar veren kullanıcıların hesaplarını önceden bildirim yapmaksızın dondurma, sınırlandırma veya tamamen silme hakkını saklı tutar.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Sorumlulukların Sınırlandırılması</h2>
            <p>Uygulama "olduğu gibi" (as is) prensibiyle sunulmaktadır. FizioAI, uygulamanın kesintisiz veya hatasız çalışacağını, sunucularımızda hiçbir zaman veri kaybı yaşanmayacağını veya kötü amaçlı yazılım saldırılarına karşı %100 koruma sağlanacağını garanti etmez. Dolaylı veya doğrudan veri kayıplarından, kar kayıplarından, iş kesintilerinden doğacak hiçbir maddi veya manevi zarardan Şirket sorumlu tutulamaz.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Sözleşme Değişiklikleri</h2>
            <p>FizioAI, piyasa koşulları, yasal düzenlemeler veya uygulamanın yeni özelliklerine göre işbu Kullanım Koşullarını dilediği zaman tek taraflı olarak güncelleme hakkına sahiptir. Değişiklikler, platformda yayınlandığı tarihte yürürlüğe girer. Değişiklik sonrasında hizmeti kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. İletişim ve Destek</h2>
            <p>Bu kullanım koşulları hakkında sorularınız, önerileriniz veya şikayetleriniz olması durumunda destek@fizioai.com adresi üzerinden bizimle dilediğiniz zaman iletişime geçebilirsiniz. Destek ekibimiz en kısa sürede size dönüş yapacaktır.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
