import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/folders — list user's folders with conversation counts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { conversations: { where: { deletedAt: null } } } },
    },
  });

  return NextResponse.json(folders);
}

// POST /api/folders — create folder
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { name } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Klasör adı gerekli" }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: { userId: session.user.id, name: name.trim() },
  });

  return NextResponse.json(folder, { status: 201 });
}
