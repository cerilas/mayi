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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const {
    name,
    email,
    password,
    photo,
    age,
    phone,
    gender,
    shortDescription,
    longDetails,
    clinicalOpinion,
    videoLinks,
  } = body;

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    include: { patientProfile: true },
  });

  if (!existing || existing.role !== "patient") {
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır" }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  // Handle profile update
  const profileUpdateData: any = {};
  if (photo !== undefined) profileUpdateData.photo = photo;
  if (age !== undefined) profileUpdateData.age = age ? parseInt(age) : null;
  if (phone !== undefined) profileUpdateData.phone = phone;
  if (gender !== undefined) profileUpdateData.gender = gender;
  if (shortDescription !== undefined) profileUpdateData.shortDescription = shortDescription;
  if (longDetails !== undefined) profileUpdateData.longDetails = longDetails;
  if (clinicalOpinion !== undefined) profileUpdateData.clinicalOpinion = clinicalOpinion;
  if (videoLinks !== undefined) profileUpdateData.videoLinks = videoLinks;

  if (Object.keys(profileUpdateData).length > 0) {
    updateData.patientProfile = {
      upsert: {
        create: profileUpdateData,
        update: profileUpdateData,
      },
    };
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    include: { patientProfile: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing || existing.role !== "patient") {
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
