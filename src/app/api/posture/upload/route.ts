import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { appConfig } from "@/lib/config";

// Notice: We do NOT enforce session authentication here because 
// the iOS app may be using an API key or standard Bearer JWT 
// which could be verified here if necessary. For now we will allow it 
// or one could add `getUserSession(req)` like the normal upload.

function getUploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "public", "uploads");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    
    // Fallback if client sends 'file' instead of 'files'
    const singleFile = formData.get("file") as File | null;
    const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    // Sadece ilk dosyayı alacağız (her istekte 1 dosya yüklendiği varsayımıyla)
    const file = allFiles[0];

    const isVideo = file.type.startsWith("video/") || [".mp4", ".mov"].includes(path.extname(file.name).toLowerCase());
    const maxBytes = isVideo ? 50 * 1024 * 1024 : appConfig.upload.maxFileSizeMb * 1024 * 1024;
    const allowedTypes = isVideo
      ? ["video/mp4", "video/quicktime", "video/x-m4v"]
      : appConfig.upload.allowedMimeTypes;

    // Validate mime type
    if (!allowedTypes.includes(file.type) && !isVideo) {
      return NextResponse.json(
        { error: `Desteklenmeyen dosya türü: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > maxBytes) {
      const limitMb = isVideo ? 50 : appConfig.upload.maxFileSizeMb;
      return NextResponse.json(
        { error: `Dosya çok büyük. Maksimum: ${limitMb}MB` },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    let safeExt = ".jpg";
    if (isVideo) {
      safeExt = [".mp4", ".mov"].includes(ext) ? ext : ".mp4";
    } else if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"].includes(ext)) {
      safeExt = ext;
    }
    
    const prefix = isVideo ? "posture_video_" : "posture_";
    const uniqueName = `${prefix}${uuidv4()}${safeExt}`;
    const uploadDir = getUploadDir();

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fullPath = path.join(uploadDir, uniqueName);
    await writeFile(fullPath, buffer);

    // Return the relative path to be accessed via standard web server
    const relPath = `uploads/${uniqueName}`;

    return NextResponse.json({ filePath: relPath }, { status: 201 });
  } catch (error) {
    console.error("[posture/upload POST]", error);
    return NextResponse.json({ error: "Dosya yüklenemedi" }, { status: 500 });
  }
}
