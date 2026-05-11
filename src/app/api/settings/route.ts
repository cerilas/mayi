import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ALLOWED_KEYS = ["system_instruction", "base_instruction"];
const ADMIN_KEYS = ["gemini_api_key"];
// These are GLOBAL settings — shared across all admins, stored under primary admin
const GLOBAL_ADMIN_KEYS = ["netgsm_active_header", "patient_default_model", "patient_system_instruction"];
const ALL_KEYS = [...ALLOWED_KEYS, ...ADMIN_KEYS, ...GLOBAL_ADMIN_KEYS];

/**
 * Returns the primary admin's userId (oldest admin by createdAt).
 * All GLOBAL_ADMIN_KEYS are stored under this user so every admin
 * reads and writes the same single record.
 */
async function getPrimaryAdminId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return admin?.id ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const result: Record<string, string> = {};

  // Per-user settings (own keys)
  const userKeys = isAdmin ? [...ALLOWED_KEYS, ...ADMIN_KEYS] : ALLOWED_KEYS;
  const userSettings = await prisma.setting.findMany({
    where: { userId, key: { in: userKeys } },
  });
  for (const s of userSettings) {
    result[s.key] = ADMIN_KEYS.includes(s.key) && s.value
      ? "••••••••" + s.value.slice(-4)
      : s.value;
  }

  // Global admin settings — always read from primary admin's records
  if (isAdmin) {
    const primaryId = await getPrimaryAdminId();
    if (primaryId) {
      const globalSettings = await prisma.setting.findMany({
        where: { userId: primaryId, key: { in: GLOBAL_ADMIN_KEYS } },
      });
      for (const s of globalSettings) {
        result[s.key] = s.value;
      }
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

  if ((ADMIN_KEYS.includes(key) || GLOBAL_ADMIN_KEYS.includes(key)) && !isAdmin)
    return NextResponse.json({ error: "Bu ayarı değiştirme yetkiniz yok" }, { status: 403 });

  let targetUserId = userId;

  // For global settings, always write to the primary admin's record
  if (GLOBAL_ADMIN_KEYS.includes(key)) {
    const primaryId = await getPrimaryAdminId();
    if (primaryId) targetUserId = primaryId;
  }

  const setting = await prisma.setting.upsert({
    where: { userId_key: { userId: targetUserId, key } },
    update: { value },
    create: { userId: targetUserId, key, value },
  });

  // Return masked value for sensitive keys
  const returnValue = ADMIN_KEYS.includes(key) && setting.value
    ? "••••••••" + setting.value.slice(-4)
    : setting.value;

  return NextResponse.json({ key: setting.key, value: returnValue });
}

