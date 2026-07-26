import { jwtVerify } from "jose";
import { auth } from "@/auth";

export async function getUserSession(req: Request) {
  // 1. Try Mobile Bearer JWT Token first (faster, no DB call)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const secret = new TextEncoder().encode(
        process.env.AUTH_SECRET || "fallback_secret_key_change_in_production"
      );
      const { payload } = await jwtVerify(token, secret);
      if (payload?.id) {
        return {
          user: {
            id: payload.id as string,
            role: (payload.role as string) || "patient",
            email: (payload.email as string) || "",
            name: (payload.name as string) || "",
          }
        };
      }
    } catch (e) {
      console.error("Invalid Bearer token:", e);
    }
  }

  // 2. Try Web NextAuth Session (cookie-based)
  try {
    const session = await auth();
    if (session?.user?.id) {
      return session;
    }
  } catch (e) {
    // auth() may fail outside request context — safe to ignore
  }

  return null;
}
