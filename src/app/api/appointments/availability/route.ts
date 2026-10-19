import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth-utils";
import { getAvailability } from "@/lib/appointments";

// GET /api/appointments/availability — open days and hourly slots for the booking window
export async function GET(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    return NextResponse.json({ days: await getAvailability() });
  } catch (err) {
    console.error("[appointments/availability]", err);
    return NextResponse.json({ error: "Uygun saatler alınamadı." }, { status: 500 });
  }
}
