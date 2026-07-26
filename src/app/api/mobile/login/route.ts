import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta/Telefon ve şifre zorunludur" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email as string },
          { patientProfile: { phone: email as string } }
        ]
      },
      include: { patientProfile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya şifre hatalı" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password as string, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Sadece hastaların giriş yapmasına izin vermek istiyorsak buraya bir rol kontrolü ekleyebiliriz:
    // if (user.role !== "user") return NextResponse.json({error: "Yetkisiz"}, {status: 403});
    // Şimdilik herkese açık bırakıyoruz (Admin/Fizyoterapist de girebilir)

    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "fallback_secret_key_change_in_production"
    );

    const token = await new SignJWT({ 
      id: user.id, 
      role: user.role, 
      email: user.email 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientProfile: user.patientProfile,
      },
    });
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { error: "Giriş işlemi başarısız oldu" },
      { status: 500 }
    );
  }
}
