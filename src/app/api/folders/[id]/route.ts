import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH /api/folders/[id] — rename folder
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;
  const { name } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Klasör adı gerekli" }, { status: 400 });
  }

  const folder = await prisma.folder.findFirst({ where: { id, userId: session.user.id } });
  if (!folder) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const updated = await prisma.folder.update({ where: { id }, data: { name: name.trim() } });
  return NextResponse.json(updated);
}

// DELETE /api/folders/[id] — delete folder (conversations become unfoldered)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;
  const folder = await prisma.folder.findFirst({ where: { id, userId: session.user.id } });
  if (!folder) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
