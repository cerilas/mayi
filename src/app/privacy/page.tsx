import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-sm">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
            &larr; Ana Sayfaya Dön
          </Link>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Gizlilik ve Kişisel Verilerin Korunması Politikası</h1>
        <p className="text-gray-500 text-sm mb-12">Son güncellenme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Veri Sorumlusunun Kimliği</h2>
            <p>FizioAI ("Biz", "Şirket", "Uygulama" veya "Servis"), kullanıcılarının ("Kullanıcı", "Fizyoterapist", "Sağlık Profesyoneli") ve onların platforma eklediği hastaların temel hak ve özgürlüklerini korumak amacıyla kişisel verilerin yasal mevzuata (KVKK ve uygun olduğu ölçüde GDPR) uygun şekilde işlenmesine son derece önem vermektedir. Bu politika, FizioAI web platformunu ve mobil uygulamasını kullanırken toplanan verilerin nasıl işlendiğini, saklandığını ve korunduğunu açıklar.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Hangi Kişisel Verileri Topluyoruz?</h2>
            <p className="mb-3">Sizlere daha iyi ve güvenli bir hizmet sunabilmek için aşağıda belirtilen kategorilerdeki kişisel ve özel nitelikli verileri toplayabiliriz:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, unvan.</li>
              <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası, klinik veya kurum adresi.</li>
              <li><strong>Mesleki Bilgiler:</strong> Çalıştığınız kurum, mesleki deneyiminiz ve uzmanlık alanınız.</li>
              <li><strong>Hasta Verileri (Sağlık Verileri):</strong> Kullanıcıların (fizyoterapistlerin) sisteme kendi iradeleriyle ekledikleri hasta kayıtları, fiziksel değerlendirme sonuçları, ağrı skorları, tedavi geçmişi, seans notları ve postür analiz verileri.</li>
              <li><strong>Teknik Cihaz ve Kullanım Verileri:</strong> IP adresi, cihaz modeli, işletim sistemi, tarayıcı türü, uygulamada geçirilen süre, oturum açma zamanları ve hata logları.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi</h2>
            <p>Kişisel verileriniz; web sitemiz veya uygulamamız üzerinden hesap oluşturduğunuzda, platforma hasta verisi girdiğinizde, formları doldurduğunuzda, destek talebinde bulunduğunuzda veya yapay zeka asistanımızla etkileşime girdiğinizde tamamen otomatik ya da kısmen otomatik yollarla toplanmaktadır.</p>
            <p className="mt-2">Bu veriler; bir sözleşmenin kurulması veya ifası, hukuki yükümlülüklerimizin yerine getirilmesi, temel hak ve özgürlüklerinize zarar vermemek kaydıyla meşru menfaatlerimiz kapsamında işlenmektedir. Özel nitelikli kişisel veriler (sağlık verileri) ise ilgili kişinin veya fizyoterapistin yasal onamı/açık rızası dahilinde, sır saklama yükümlülüğü altında işlenir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Kişisel Verilerin İşlenme Amacı</h2>
            <p className="mb-3">Topladığımız veriler yalnızca aşağıdaki amaçlar doğrultusunda işlenmektedir:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Klinik yönetim, hasta kayıt, takip ve tedavi raporlama süreçlerinin güvenli şekilde sağlanması.</li>
              <li>Yapay zeka (AI) destekli asistanımızın size doğru klinik analizler, egzersiz planları ve vaka değerlendirmeleri sunabilmesi.</li>
              <li>Platformun performansının artırılması, teknik hataların ve altyapı sorunlarının giderilmesi.</li>
              <li>Kullanıcı hesaplarının oluşturulması ve güvenliğinin sağlanması (örneğin iki faktörlü doğrulama, şüpheli işlem tespiti).</li>
              <li>Gerektiğinde yasal mercilerle bilgi paylaşımı ve hukuki uyuşmazlıkların giderilmesi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Kişisel Verilerin Aktarımı (Üçüncü Kişiler)</h2>
            <p>FizioAI, kullanıcılarının ve hastaların kişisel verilerini yasal zorunluluklar dışında kati suretle üçüncü şahıslara veya şirketlere pazarlama, reklam ya da ticari gelir elde etme amacıyla <strong>satmaz veya aktarmaz</strong>.</p>
            <p className="mt-2">Verileriniz yalnızca sistemin düzgün çalışması için zorunlu olan hizmet sağlayıcılarıyla (güvenli bulut sunucu altyapıları, veri tabanı yönetim firmaları ve yetkili yasal merciler) gerekli güvenlik önlemleri alınarak paylaşılabilir. Yapay zeka sorgularına gönderilen veriler, analiz öncesinde anonimleştirme algoritmalarından geçirilerek işlenir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Veri Güvenliği ve Saklama Süresi</h2>
            <p>Sistemimizde yer alan tüm veriler, 256-bit SSL şifreleme teknolojileri ile korunmakta ve güncel endüstri standartlarında güvenliğe sahip bulut sunucularında barındırılmaktadır. Ayrıca, veri tabanımızdaki şifreler "bcrypt" veya benzeri modern kriptografik yöntemlerle şifrelenir.</p>
            <p className="mt-2">Kişisel verileriniz, işlenme amacının gerektirdiği süre boyunca veya ilgili yasal mevzuatta öngörülen saklama süreleri (genellikle sağlık verileri için belirlenen kanuni süreler) dolana kadar güvenli bir şekilde saklanır. Saklama süresi bitiminde veya hesabınızı silme talebinizin ardından veriler kalıcı olarak imha edilir veya tamamen anonim hale getirilir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Çerezler (Cookies) ve Benzeri Teknolojiler</h2>
            <p>Platformumuz deneyiminizi iyileştirmek, oturum yönetimini sağlamak ve güvenlik kontrolleri gerçekleştirmek için çerez (cookie) kullanmaktadır. Tercihlerinizi tarayıcı ayarlarınız üzerinden değiştirebilir, zorunlu olmayan çerezlerin kullanımını reddedebilirsiniz. Ancak zorunlu çerezlerin kapatılması uygulamanın işlevlerini bozabilir.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Kullanıcı Hakları (KVKK 11. Madde ve GDPR Kapsamında)</h2>
            <p className="mb-3">Kişisel verilerinize ilişkin olarak aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme.</li>
              <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.</li>
              <li>Yurt içinde veya yurt dışında aktarıldığı 3. kişileri bilme.</li>
              <li>Eksik veya yanlış işlenen verilerin düzeltilmesini talep etme.</li>
              <li>Kanunda öngörülen şartlar çerçevesinde kişisel verilerin silinmesini (unutulma hakkı) veya yok edilmesini talep etme.</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonuç doğmasına itiraz etme.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. İletişim Bilgileri</h2>
            <p>Gizlilik ve veri güvenliği ile ilgili tüm sorularınız, KVKK veya GDPR kapsamındaki talepleriniz, veri silme işlemleriniz için aşağıdaki iletişim kanallarını kullanarak bizimle her zaman irtibata geçebilirsiniz.</p>
            <div className="mt-4 p-4 bg-gray-100 rounded-lg inline-block">
              <p><strong>E-posta:</strong> destek@fizioai.com</p>
              <p><strong>Firma:</strong> My FizyoPilates ve Sağlık Teknolojileri</p>
              <p><strong>Adres:</strong> [Şirket Adresi veya Merkez Şehir]</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
