import { auth } from "@/auth";
import { NextResponse } from "next/server";

const NETGSM_USERCODE = process.env.NETGSM_USERCODE || "3423411000";
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD || "Dnz.24232423";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  try {
    // NetGSM REST v2 uses HTTP Basic Authentication
    const basicAuth = Buffer.from(`${NETGSM_USERCODE}:${NETGSM_PASSWORD}`).toString("base64");

    const response = await fetch("https://api.netgsm.com.tr/sms/rest/v2/msgheader", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (data && data.code === "00") {
      return NextResponse.json({ success: true, headers: data.msgheaders || [] });
    } else {
      console.error("NetGSM Header Fetch Error:", data);
      return NextResponse.json(
        { error: `Başlıklar alınamadı. NetGSM Hata Kodu: ${data?.code || "Bilinmiyor"} - ${data?.description || ""}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("SMS Headers Error:", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu: " + error.message }, { status: 500 });
  }
}
