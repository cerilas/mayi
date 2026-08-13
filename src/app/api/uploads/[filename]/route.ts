import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { appConfig } from "@/lib/config";

export async function GET(req: Request, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(process.cwd(), "public", "uploads");
    
    const filePath = path.join(uploadDir, filename);
    const fileBuffer = await readFile(filePath);
    
    const ext = path.extname(filename).toLowerCase();
    let mimeType = "image/jpeg";
    if (ext === ".png") mimeType = "image/png";
    if (ext === ".webp") mimeType = "image/webp";
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    return new NextResponse("Not Found", { status: 404 });
  }
}
