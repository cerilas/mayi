import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function getUploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "public", "uploads");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const segments = (await params).path;
  const fileName = segments[segments.length - 1];

  // Security: only allow safe filenames (uuid + known extension)
  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(fileName)) {
    return NextResponse.json({ error: "Geçersiz dosya" }, { status: 400 });
  }

  const filePath = path.join(getUploadDir(), fileName);

  // Prevent path traversal
  if (!filePath.startsWith(getUploadDir())) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }
}
