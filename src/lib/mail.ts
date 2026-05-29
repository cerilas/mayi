export async function sendCerilasMail(to: string[], subject: string, html: string) {
  const token = process.env.CERILAS_ADMIN_JWT_SECRET;
  
  if (!token) {
    console.error("Cerilas Mail API hatası: CERILAS_ADMIN_JWT_SECRET bulunamadı.");
    return false;
  }
  
  if (!to || to.length === 0) {
    console.log("Mail gönderilecek adres bulunamadı.");
    return false;
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
      console.error(`Cerilas Mail API isteği başarısız: [${res.status}] ${errorText}`);
      return false;
    }

    const data = await res.json();
    console.log("E-posta başarıyla gönderildi:", data);
    return true;

  } catch (error) {
    console.error("Cerilas Mail API bağlanırken hata:", error);
    return false;
  }
}
