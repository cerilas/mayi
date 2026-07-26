import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No Bearer token", authHeader });
  }
  
  const token = authHeader.split(" ")[1];
  const rawSecret = process.env.AUTH_SECRET || "fallback_secret_key_change_in_production";
  const secret = new TextEncoder().encode(rawSecret);
  
  try {
    const { payload } = await jwtVerify(token, secret);
    return NextResponse.json({ success: true, payload });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, rawSecret: rawSecret.slice(0, 10) + "..." });
  }
}
