import { getUserSession } from "@/lib/auth-utils";
import { checkAndUpdateUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const usage = await checkAndUpdateUsage(session.user.id);
    return NextResponse.json(usage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Bir hata oluştu" }, { status: 500 });
  }
}
