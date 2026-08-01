import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            &larr; Ana Sayfaya Dön
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Gizlilik Politikası</h1>
        <p className="text-gray-500 text-sm mb-8">Son güncellenme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Toplanan Veriler</h2>
            <p>FizioAI ("Biz", "Uygulama", veya "Servis") olarak gizliliğinize önem veriyoruz. Hizmetimizi kullanırken sağlamış olduğunuz kişisel ve sağlık verileriniz, tamamen size daha iyi hizmet sunabilmek ve uygulamanın işlevselliğini sağlayabilmek amacıyla toplanmaktadır. Toplanan veriler arasında isim, e-posta, mesleki bilgiler ve sisteme girdiğiniz hasta detayları (anonimleştirilmiş veya doğrudan) bulunabilir.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Verilerin Kullanımı</h2>
            <p>Topladığımız veriler, yapay zeka asistanının size doğru klinik analiz ve geri dönüşler sağlayabilmesi, kullanıcı deneyiminin iyileştirilmesi, teknik sorunların giderilmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılır. Verileriniz, yasal zorunluluklar dışında üçüncü şahıslarla reklam veya pazarlama amacıyla paylaşılmaz.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Veri Güvenliği</h2>
            <p>Verilerinizi korumak için endüstri standartlarında şifreleme ve güvenlik önlemleri almaktayız. Ancak, internet üzerinden yapılan hiçbir veri iletiminin %100 güvenli olamayacağını ve sistemlerimizin ihlal edilemez olduğunu garanti edemeyeceğimizi lütfen unutmayın.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Haklarınız</h2>
            <p>Sistemimizde bulunan kişisel verilerinize erişim sağlama, bunları düzeltme, silme veya işlenmesini kısıtlama hakkına sahipsiniz. Hesabınızı tamamen silmek istediğinizde, verileriniz yasal saklama süreleri göz önünde bulundurularak sunucularımızdan kalıcı olarak silinir.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Değişiklikler</h2>
            <p>Bu Gizlilik Politikası, zaman zaman güncellenebilir. Herhangi bir önemli değişiklik durumunda, uygulama içi bildirimler veya e-posta yoluyla sizi bilgilendireceğiz.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">İletişim</h2>
            <p>Bu politika hakkında herhangi bir sorunuz varsa, bizimle destek@fizioai.com adresi üzerinden iletişime geçebilirsiniz.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
