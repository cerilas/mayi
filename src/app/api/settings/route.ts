import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ALLOWED_KEYS = ["system_instruction", "base_instruction"];
const ADMIN_KEYS = ["gemini_api_key"];
const PUBLIC_ADMIN_KEYS = ["netgsm_active_header", "patient_default_model", "patient_system_instruction"];
const ALL_KEYS = [...ALLOWED_KEYS, ...ADMIN_KEYS, ...PUBLIC_ADMIN_KEYS];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";

  const keysToFetch = isAdmin ? ALL_KEYS : ALLOWED_KEYS;
  const settings = await prisma.setting.findMany({
    where: { userId, key: { in: keysToFetch } },
  });

  const result: Record<string, string> = {};
  for (const s of settings) {
    if (ADMIN_KEYS.includes(s.key)) {
      // Mask the key for reading — admin sees masked version, edits via PUT
      result[s.key] = s.value ? "••••••••" + s.value.slice(-4) : "";
    } else {
      // Both ALLOWED_KEYS and PUBLIC_ADMIN_KEYS are returned as is
      result[s.key] = s.value;
    }
  }
  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const value = typeof body.value === "string" ? body.value : "";

  if (!ALL_KEYS.includes(key))
    return NextResponse.json({ error: "Geçersiz ayar anahtarı" }, { status: 400 });

  if ((ADMIN_KEYS.includes(key) || PUBLIC_ADMIN_KEYS.includes(key)) && !isAdmin)
    return NextResponse.json({ error: "Bu ayarı değiştirme yetkiniz yok" }, { status: 403 });

  const setting = await prisma.setting.upsert({
    where: { userId_key: { userId, key } },
    update: { value },
    create: { userId, key, value },
  });

  // Return masked value for sensitive keys
  const returnValue = ADMIN_KEYS.includes(key) && setting.value
    ? "••••••••" + setting.value.slice(-4)
    : setting.value;

  return NextResponse.json({ key: setting.key, value: returnValue });
}
