import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ALLOWED_KEYS = ["system_instruction", "base_instruction"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const userId = session.user.id;
  const settings = await prisma.setting.findMany({
    where: { userId, key: { in: ALLOWED_KEYS } },
  });

  const result: Record<string, string> = {};
  for (const s of settings) result[s.key] = s.value;
  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const value = typeof body.value === "string" ? body.value : "";

  if (!ALLOWED_KEYS.includes(key))
    return NextResponse.json({ error: "Geçersiz ayar anahtarı" }, { status: 400 });

  const setting = await prisma.setting.upsert({
    where: { userId_key: { userId, key } },
    update: { value },
    create: { userId, key, value },
  });

  return NextResponse.json({ key: setting.key, value: setting.value });
}
