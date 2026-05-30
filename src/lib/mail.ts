export async function sendCerilasMail(to: string[], subject: string, html: string): Promise<{success: boolean, error?: string}> {
  const apiEmail = process.env.CERILAS_API_EMAIL?.trim();
  const apiPassword = process.env.CERILAS_API_PASSWORD?.trim();
  
  if (!apiEmail || !apiPassword) {
    return { success: false, error: "CERILAS_API_EMAIL veya CERILAS_API_PASSWORD çevresel değişkenleri eksik." };
  }
  
  if (!to || to.length === 0) {
    return { success: false, error: "Mail gönderilecek adres bulunamadı." };
  }

  // Define primary recipient and Bcc for others
  const primaryTo = to[0];
  const bcc = to.slice(1);

  try {
    // 1. Önce Cerilas API'den Token Alalım
    const authRes = await fetch('https://www.cerilas.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: apiEmail,
        password: apiPassword
      })
    });

    if (!authRes.ok) {
      const authErr = await authRes.text();
      return { success: false, error: `Login API Hatası [${authRes.status}]: ${authErr}` };
    }

    const authData = await authRes.json();
    const token = authData.token;

    if (!token) {
      return { success: false, error: "Login başarılı oldu ancak JWT token dönmedi." };
    }

    // 2. Alınan token ile mail gönderim isteği yapalım
    const res = await fetch('https://www.cerilas.com/api/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        senderId: 1, // Sistem genel id'si
        to: primaryTo,
        ...(bcc.length > 0 && { bcc }), // if there are more emails, add to BCC
        subject,
        html
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: `[${res.status}] ${errorText}` };
    }

    const data = await res.json();
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message || "Bilinmeyen bir ağ hatası oluştu." };
  }
}
