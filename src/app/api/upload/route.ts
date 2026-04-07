import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/config";

function getUploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "public", "uploads");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  const maxBytes = appConfig.upload.maxFileSizeMb * 1024 * 1024;
  const allowedTypes = appConfig.upload.allowedMimeTypes;

  const saved: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    filePath: string;
    fileSize: number;
  }> = [];

  for (const file of files) {
    // Validate mime type
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Desteklenmeyen dosya türü: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Dosya çok büyük. Maksimum: ${appConfig.upload.maxFileSizeMb}MB` },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"].includes(ext)
      ? ext
      : ".bin";
    const uniqueName = `${uuidv4()}${safeExt}`;
    const uploadDir = getUploadDir();

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fullPath = path.join(uploadDir, uniqueName);
    await writeFile(fullPath, buffer);

    // Store just the filename — resolved via UPLOAD_DIR at read time
    const relPath = `uploads/${uniqueName}`;

    // Save to DB with empty messageId (linked later)
    const attachment = await prisma.attachment.create({
      data: {
        fileName: file.name,
        mimeType: file.type,
        filePath: relPath,
        fileSize: file.size,
      },
    });

    saved.push({
      id: attachment.id,
      fileName: file.name,
      mimeType: file.type,
      filePath: relPath,
      fileSize: file.size,
    });
  }

  return NextResponse.json({ attachments: saved }, { status: 201 });
}
