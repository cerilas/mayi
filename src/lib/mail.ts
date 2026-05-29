export async function sendCerilasMail(to: string[], subject: string, html: string): Promise<{success: boolean, error?: string}> {
  const token = process.env.CERILAS_ADMIN_JWT_SECRET;
  
  if (!token) {
    return { success: false, error: "CERILAS_ADMIN_JWT_SECRET çevresel değişkeni bulunamadı." };
  }
  
  if (!to || to.length === 0) {
    return { success: false, error: "Mail gönderilecek adres bulunamadı." };
  }

  // Define primary recipient and Bcc for others
  const primaryTo = to[0];
  const bcc = to.slice(1);

  try {
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
