import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/encryption";

async function requireStaff(req: Request) {
  const session = await getUserSession(req);
  if (!session?.user?.id) return null;
  if (session.user.role !== "admin" && session.user.role !== "physiotherapist") return null;
  return session;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff(req);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;

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
    responsibleAdminId,
  } = body;

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { patientProfile: true },
  });

  if (!existing || existing.role !== "patient") {
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  }

  if (session.user.role === "physiotherapist" && existing.patientProfile?.responsibleAdminId !== session.user.id) {
    return NextResponse.json({ error: "Bu hastayı düzenleme yetkiniz yok" }, { status: 403 });
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır" }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(password, 12);
    updateData.passwordEncrypted = encryptPassword(password);
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
  if (responsibleAdminId !== undefined && session.user.role === "admin") {
    profileUpdateData.responsibleAdminId = responsibleAdminId || null;
  }

  if (Object.keys(profileUpdateData).length > 0) {
    updateData.patientProfile = {
      upsert: {
        create: profileUpdateData,
        update: profileUpdateData,
      },
    };
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      patientProfile: {
        include: { responsibleAdmin: { select: { id: true, name: true } } }
      }
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff(req);
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Sadece adminler hasta silebilir" }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== "patient") {
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
