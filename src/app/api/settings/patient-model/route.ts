import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Returns the patient default model set by admin
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  // Find the admin user's setting for patient_default_model
  // We look across all admin users for this setting
  const setting = await prisma.setting.findFirst({
    where: { key: "patient_default_model" },
  });

  return NextResponse.json({ model: setting?.value || null });
}
