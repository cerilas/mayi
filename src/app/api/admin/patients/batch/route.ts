import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin") return null;
  return session;
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { patients } = body;

  if (!patients || !Array.isArray(patients)) {
    return NextResponse.json({ error: "Geçersiz veri formatı" }, { status: 400 });
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  const defaultPasswordHash = await bcrypt.hash("123456", 12);

  for (const patient of patients) {
    try {
      const {
        name,
        email,
        phone,
        age,
        gender,
        shortDescription,
        longDetails,
        clinicalOpinion,
      } = patient;

      if (!name || !email) {
        results.failed++;
        results.errors.push(`İsimsiz veya e-postasız kayıt atlandı.`);
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.failed++;
        results.errors.push(`${email} adresi zaten mevcut.`);
        continue;
      }

      await prisma.user.create({
        data: {
          name: String(name),
          email: String(email).toLowerCase(),
          passwordHash: defaultPasswordHash,
          role: "patient",
          patientProfile: {
            create: {
              phone: phone ? String(phone) : null,
              age: age ? parseInt(age) : null,
              gender: gender ? String(gender) : null,
              shortDescription: shortDescription ? String(shortDescription) : null,
              longDetails: longDetails ? String(longDetails) : null,
              clinicalOpinion: clinicalOpinion ? String(clinicalOpinion) : null,
            },
          },
        },
      });

      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${patient.email || 'Bilinmeyen'} için hata: ${err.message}`);
    }
  }

  return NextResponse.json(results);
}
